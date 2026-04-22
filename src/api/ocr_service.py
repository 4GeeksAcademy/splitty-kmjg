import os
import re
from decimal import Decimal
from typing import List, Dict, Any

try:
    from azure.core.credentials import AzureKeyCredential
    from azure.ai.documentintelligence import DocumentIntelligenceClient
    from azure.ai.documentintelligence.models import AnalyzeResult
    AZURE_SDK_AVAILABLE = True
except ImportError:
    AZURE_SDK_AVAILABLE = False

try:
    import google.generativeai as genai
    GEMINI_SDK_AVAILABLE = True
except ImportError:
    GEMINI_SDK_AVAILABLE = False

import requests
import json
import time

# The API utils for distributing costs is already defined
from api.utils import distribute_proportional_costs

def process_receipt_with_azure(receipt_url_or_stream) -> Dict[str, Any]:
    """
    Calls Azure Document Intelligence to analyze a receipt.
    """
    endpoint = os.getenv("AZURE_FORM_RECOGNIZER_ENDPOINT")
    key = os.getenv("AZURE_FORM_RECOGNIZER_KEY")

    if not endpoint or not key or not AZURE_SDK_AVAILABLE:
        # Fallback to Mock if no credentials
        return None

    try:
        document_intelligence_client = DocumentIntelligenceClient(
            endpoint=endpoint, credential=AzureKeyCredential(key)
        )
        
        if isinstance(receipt_url_or_stream, str) and (receipt_url_or_stream.startswith('http://') or receipt_url_or_stream.startswith('https://')):
            poller = document_intelligence_client.begin_analyze_document(
                "prebuilt-receipt", analyze_request={"urlSource": receipt_url_or_stream}
            )
        else:
            poller = document_intelligence_client.begin_analyze_document(
                "prebuilt-receipt", analyze_request={"base64Source": receipt_url_or_stream}
            )
            
        result: AnalyzeResult = poller.result()
        return _parse_azure_result(result)

    except Exception as e:
        print(f"Azure OCR Error: {e}")
        return None

def process_receipt_with_gemini(receipt_url) -> Dict[str, Any]:
    """
    Uses Gemini 1.5 Flash to intelligently extract receipt data.
    Excellent for non-standard receipts.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("CRITICAL: GEMINI_API_KEY is missing from environment. Gemini OCR will be skipped.")
        return None
    
    if not GEMINI_SDK_AVAILABLE:
        print("CRITICAL: google-generativeai SDK is NOT installed. Gemini OCR will be skipped.")
        return None

    try:
        print(f"DEBUG: Initializing Gemini with key: {api_key[:6]}...")
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-flash-latest')

        prompt = """
        Extract financial data from this receipt IMAGE or DOCUMENT (like a PDF). Return ONLY a pure JSON object (no markdown code blocks, no text).
        Required Fields:
        - merchant_name: string
        - subtotal: float
        - tax: float (0 if missing)
        - tip: float (0 if missing)
        - total: float
        - items: list of objects with {"name": string, "price": float} 
        
        Note: The price in items should be the total price for that line item.
        """

        print(f"DEBUG: Fetching image from URL: {receipt_url}")
        # Fetch image bytes from Cloudinary URL
        img_response = requests.get(receipt_url, timeout=30)
        img_response.raise_for_status()
        
        # Robust Mime-Type detection
        content_type = img_response.headers.get('Content-Type', 'image/jpeg')
        # If URL contains .pdf or header indicates it, force application/pdf
        if '.pdf' in receipt_url.lower() or 'application/pdf' in content_type:
            content_type = 'application/pdf'
        elif 'octet-stream' in content_type:
            # Fallback for binary streams
            content_type = 'application/pdf' if '.pdf' in receipt_url.lower() else 'image/jpeg'
            
        img_data = img_response.content
        print(f"DEBUG: Data fetched successfully. Size: {len(img_data)} bytes, Content-Type: {content_type}")

        print("DEBUG: Sending request to Gemini...")
        response = model.generate_content([
            prompt,
            {'mime_type': content_type, 'data': img_data}
        ])

        # Handle text cleaning if Gemini includes MD tags
        raw_text = response.text.strip()
        print(f"DEBUG: Raw response from Gemini: {raw_text}")

        # Robust JSON extraction: Find content between first { and last }
        match = re.search(r'({.*})', raw_text, re.DOTALL)
        if match:
            text = match.group(0)
            print("DEBUG: JSON block extracted via regex")
        else:
            text = raw_text.replace('```json', '').replace('```', '').strip()
            print("DEBUG: No regex match, using fallback cleaning")
        
        data = json.loads(text)
        print(f"DEBUG: JSON parsed successfully: {data.get('merchant_name')}")

        # Map to structured internal format with proportionality
        raw_items = []
        for i, itm in enumerate(data.get("items", [])):
            raw_items.append({
                "id": f"item_{i}",
                "name": itm.get("name", f"Item {i+1}"),
                "price": Decimal(str(itm.get("price", 0)))
            })

        tax = Decimal(str(data.get("tax", 0)))
        tip = Decimal(str(data.get("tip", 0)))
        
        processed_items = distribute_proportional_costs(raw_items, tax, tip)

        return {
            "merchant_name": data.get("merchant_name", "Unknown Merchant"),
            "subtotal": float(data.get("subtotal", 0)),
            "tax": float(tax),
            "tip": float(tip),
            "total": float(data.get("total", 0)),
            "items": [
                {
                    "id": item["id"],
                    "name": item["name"],
                    "price": float(item["price"]),
                    "tax_share": float(item["tax_share"]),
                    "tip_share": float(item["tip_share"]),
                    "final_price": float(item["final_price"])
                } 
                for item in processed_items
            ]
        }
    except Exception as e:
        import traceback
        print(f"CRITICAL: Gemini OCR Error: {str(e)}")
        print(traceback.format_exc())
        return None

def analyze_receipt_with_ai(receipt_url) -> Dict[str, Any]:
    """
    Main entry point for AI analysis.
    Tries Gemini first, then Azure, and raises an Exception if both fail.
    """
    # 1. Try Gemini
    result = process_receipt_with_gemini(receipt_url)
    if result: return result

    # 2. Try Azure
    result = process_receipt_with_azure(receipt_url)
    if result: return result

    # 3. Fail if both didn't work instead of using Mock
    raise Exception("AI Scanner failed: Both Gemini and Azure could not process the receipt.")


def _parse_azure_result(result: AnalyzeResult) -> Dict[str, Any]:
    """
    Extracts structured data from the AnalyzeResult of Azure Cognitive Services
    prebuilt-receipt model.
    """
    if not result.documents:
        return {"items": [], "subtotal": 0, "tax": 0, "tip": 0, "total": 0, "merchant_name": "Unknown"}

    receipt = result.documents[0]
    fields = receipt.fields or {}

    merchant_name = fields.get("MerchantName", {}).get("valueString", "Unknown Merchant")
    subtotal = fields.get("Subtotal", {}).get("valueCurrency", {}).get("amount", 0.0)
    tax = fields.get("TotalTax", {}).get("valueCurrency", {}).get("amount", 0.0)
    tip = fields.get("Tip", {}).get("valueCurrency", {}).get("amount", 0.0)
    total = fields.get("Total", {}).get("valueCurrency", {}).get("amount", 0.0)

    # Extract items
    extracted_items = []
    items_field = fields.get("Items", {})
    if items_field and items_field.get("valueArray"):
        for idx, item in enumerate(items_field.get("valueArray")):
            item_fields = item.get("valueObject", {})
            name = item_fields.get("Description", {}).get("valueString", f"Item {idx+1}")
            price = item_fields.get("TotalPrice", {}).get("valueCurrency", {}).get("amount", 0.0)
            
            extracted_items.append({
                "id": f"item_{idx}",
                "name": name,
                "price": Decimal(str(price))
            })

    # Apply mathematical proportionality
    processed_items = distribute_proportional_costs(
        extracted_items, 
        tax=Decimal(str(tax)), 
        tip=Decimal(str(tip))
    )

    return {
        "merchant_name": merchant_name,
        "subtotal": float(subtotal),
        "tax": float(tax),
        "tip": float(tip),
        "total": float(total),
        "items": [
            {
                "id": item["id"],
                "name": item["name"],
                "price": float(item["price"]),
                "tax_share": float(item["tax_share"]),
                "tip_share": float(item["tip_share"]),
                "final_price": float(item["final_price"])
            } 
            for item in processed_items
        ]
    }


def _mock_azure_receipt_response() -> Dict[str, Any]:
    """
    Generates a mock response simulating the behavior of Azure's OCR,
    crucial for the frontend integration phase without incurring API costs.
    """
    import time
    time.sleep(1.5) # Simulate API latency
    
    # Simulate an American diner receipt
    raw_items = [
        {"id": "item_1", "name": "[MOCK] Classic Cheeseburger", "price": Decimal("14.50")},
        {"id": "item_2", "name": "[MOCK] Truffle Fries", "price": Decimal("8.00")},
        {"id": "item_3", "name": "[MOCK] Craft Beer", "price": Decimal("7.50")},
        {"id": "item_4", "name": "[MOCK] Craft Beer", "price": Decimal("7.50")},
        {"id": "item_5", "name": "[MOCK] Caesar Salad", "price": Decimal("12.00")}
    ]
    
    subtotal = Decimal("49.50")
    tax = Decimal("4.45") # ~9% tax
    tip = Decimal("10.00") # ~20% tip
    total = Decimal("63.95")
    
    processed_items = distribute_proportional_costs(raw_items, tax, tip)
    
    return {
        "merchant_name": "Splitty MOCK (No AI Configured)",
        "subtotal": float(subtotal),
        "tax": float(tax),
        "tip": float(tip),
        "total": float(total),
        "items": [
            {
                "id": item["id"],
                "name": item["name"],
                "price": float(item["price"]),
                "tax_share": float(item["tax_share"]),
                "tip_share": float(item["tip_share"]),
                "final_price": float(item["final_price"])
            } 
            for item in processed_items
        ]
    }
