import pytest
from decimal import Decimal
from api.utils import distribute_proportional_costs

def test_distribute_simple_proportion():
    """
    Test simple case: 2 items of equal value.
    Tax and Tip should be split evenly.
    """
    items = [
        {"id": "item1", "price": Decimal("50.00")},
        {"id": "item2", "price": Decimal("50.00")}
    ]
    tax = Decimal("10.00")
    tip = Decimal("20.00")
    
    result = distribute_proportional_costs(items, tax, tip)
    
    # Each item was $50.00. Tax is $10, so each gets $5.
    # Tip is $20, each gets $10. Total = $65.
    assert result[0]["tax_share"] == Decimal("5.00")
    assert result[0]["tip_share"] == Decimal("10.00")
    assert result[0]["final_price"] == Decimal("65.00")
    
    assert result[1]["tax_share"] == Decimal("5.00")
    assert result[1]["tip_share"] == Decimal("10.00")
    assert result[1]["final_price"] == Decimal("65.00")

def test_distribute_odd_amount_rounding():
    """
    Test to ensure no pennies are lost or duplicated when dividing odd numbers.
    Using largest remainder method.
    """
    items = [
        {"id": "item1", "price": Decimal("33.33")},
        {"id": "item2", "price": Decimal("33.33")},
        {"id": "item3", "price": Decimal("33.34")}
    ]
    # Total = 100.00
    tax = Decimal("10.00")
    tip = Decimal("0.00")
    
    result = distribute_proportional_costs(items, tax, tip)
    
    # The sum of tax_shares MUST perfectly equal 10.00
    total_tax_distributed = sum(item["tax_share"] for item in result)
    assert total_tax_distributed == Decimal("10.00")
    
    # 33.33 / 100 * 10 = 3.333 -> 3.33
    # 33.34 / 100 * 10 = 3.334 -> 3.33 (wait, 3.33 + 3.33 + 3.33 = 9.99! missing 0.01)
    # The largest remainder algorithm must give the extra 0.01 to the item with the largest fractional part after multiplication.
    # Expected: 3.33, 3.33, 3.34
    
    # Let's verify our specific algorithm gives exact total length
    assert result[2]["tax_share"] == Decimal("3.34")

def test_distribute_zero_tax_tip():
    """Test where tax and tip are zero."""
    items = [
        {"id": "item1", "price": Decimal("10.00")}
    ]
    tax = Decimal("0.00")
    tip = Decimal("0.00")
    
    result = distribute_proportional_costs(items, tax, tip)
    
    assert result[0]["tax_share"] == Decimal("0.00")
    assert result[0]["tip_share"] == Decimal("0.00")
    assert result[0]["final_price"] == Decimal("10.00")

def test_distribute_single_item():
    """Single item should absorb all tax and tip."""
    items = [
        {"id": "item1", "price": Decimal("40.00")}
    ]
    tax = Decimal("5.50")
    tip = Decimal("8.00")
    
    result = distribute_proportional_costs(items, tax, tip)
    
    assert result[0]["tax_share"] == Decimal("5.50")
    assert result[0]["tip_share"] == Decimal("8.00")
    assert result[0]["final_price"] == Decimal("53.50")

def test_distribute_empty_items():
    """Empty items should return empty list."""
    result = distribute_proportional_costs([], Decimal("10.00"), Decimal("5.00"))
    assert result == []
