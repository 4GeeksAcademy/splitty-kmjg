from decimal import Decimal
from api.utils import simplify_debts

def test_simple_split():
    balances = {
        "A": Decimal("75.00"),
        "B": Decimal("-25.00"),
        "C": Decimal("-25.00"),
        "D": Decimal("-25.00"),
    }
    transactions = simplify_debts(balances)
    assert len(transactions) == 3
    for t in transactions:
        assert t["to"] == "A"
        assert t["amount"] == 25.0

def test_chain_debts():
    balances = {
        "A": Decimal("-10.00"),
        "B": Decimal("0.00"),
        "C": Decimal("10.00")
    }
    transactions = simplify_debts(balances)
    assert len(transactions) == 1
    assert transactions[0]["from"] == "A"
    assert transactions[0]["to"] == "C"
    assert transactions[0]["amount"] == 10.0

def test_complex_split():
    balances = {
        "A": Decimal("-50.00"),
        "B": Decimal("-25.00"),
        "C": Decimal("60.00"),
        "D": Decimal("15.00"),
    }
    transactions = simplify_debts(balances)
    assert len(transactions) == 3

def test_no_debts():
    balances = {
        "A": Decimal("0.00"),
        "B": Decimal("0.00"),
    }
    assert len(simplify_debts(balances)) == 0

def test_deleted_expense_with_payment():
    # Demonstrates the state that occurs if an expense is deleted but its payment isn't.
    # Ex: A pays 100 for B. B owes A 100.
    # B pays A 100 in cash. Normal balance: A=0, B=0.
    # A deletes the original 100 expense. 
    # Now, B's payment of 100 to A remains, meaning A effectively received 100 from B
    # without any underlying expense. Thus, A owes B 100.
    # The API prevents this scenario by blocking expense deletion if there are payments.
    balances = {
        "A": Decimal("-100.00"),  # A received 100 from B
        "B": Decimal("100.00"),   # B paid 100 to A
    }
    transactions = simplify_debts(balances)
    assert len(transactions) == 1
    assert transactions[0]["from"] == "A"
    assert transactions[0]["to"] == "B"
    assert transactions[0]["amount"] == 100.0

if __name__ == "__main__":
    test_simple_split()
    test_chain_debts()
    test_complex_split()
    test_no_debts()
    test_deleted_expense_with_payment()
    print("All tests passed!")
