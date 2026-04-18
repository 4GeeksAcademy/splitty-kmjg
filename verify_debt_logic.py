
import sys
import os
from decimal import Decimal

# Adjust path to include the app
sys.path.append(os.path.join(os.getcwd(), 'src'))

try:
    from app import app
    from api.models import db, User, Expense, ExpenseParticipant, Payment, GroupMember
    from sqlalchemy import or_, and_
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)

with app.app_context():
    # We'll use mock-like data or actual DB data but focused on the calculation logic
    # Let's test the endpoint directly via a mock request if possible, 
    # or just run the same logic we put in routes.py
    
    print("--- VERIFYING CALCULATION LOGIC ---")
    
    # Mock friend debts result
    mock_friend_debts = [
        {"name": "Friend A", "net": 100.0},  # Owed to you
        {"name": "Friend B", "net": -50.0},  # You owe
        {"name": "Friend C", "net": 10.0},   # Owed to you
        {"name": "Friend D", "net": -200.0}  # You owe
    ]
    
    # Old logic: summing components (simplified)
    # New logic: summing net balances
    total_owed_to_you = 0.0
    total_you_owe = 0.0
    
    for f in mock_friend_debts:
        net = f["net"]
        if net > 0:
            total_owed_to_you += net
        elif net < 0:
            total_you_owe += abs(net)
            
    print(f"Total Owed to You: {total_owed_to_you} (Expected: 110.0)")
    print(f"Total You Owe: {total_you_owe} (Expected: 250.0)")
    print(f"Net Global: {total_owed_to_you - total_you_owe} (Expected: -140.0)")
    
    # Test with a "flipped" balance (e.g., Friend B is paid $60)
    # This is what happened in the user's screenshot
    print("\n--- TEST: Overpayment / Settlement Scenario ---")
    mock_friend_debts_2 = [
        {"name": "Miguel", "net": -5.0} # You owe Miguel $5
    ]
    
    # If user makes a pending payment of $10
    pending_sent = 10.0
    
    # Frontend logic:
    eff_owed_to_you = 0
    eff_you_owe = 0
    
    for d in mock_friend_debts_2:
        eff_bal = d["net"] + pending_sent # -5 + 10 = +5 (He now owes you)
        
        if eff_bal > 0:
            eff_owed_to_you += eff_bal
        elif eff_bal < 0:
            eff_you_owe += abs(eff_bal)
            
    print(f"Synthetic Owed to You: {eff_owed_to_you} (Should be 5.0, not negative!)")
    print(f"Synthetic You Owe: {eff_you_owe} (Should be 0.0)")
