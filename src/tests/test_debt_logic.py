from decimal import Decimal
from api.utils import simplify_debts


def test_simplify_debts_simple_split():
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


def test_simplify_debts_chain_debts():
    balances = {
        "A": Decimal("-10.00"),
        "B": Decimal("0.00"),
        "C": Decimal("10.00"),
    }
    transactions = simplify_debts(balances)
    assert len(transactions) == 1
    assert transactions[0]["from"] == "A"
    assert transactions[0]["to"] == "C"
    assert transactions[0]["amount"] == 10.0


def test_simplify_debts_complex_split():
    balances = {
        "A": Decimal("-50.00"),
        "B": Decimal("-25.00"),
        "C": Decimal("60.00"),
        "D": Decimal("15.00"),
    }
    transactions = simplify_debts(balances)
    assert len(transactions) >= 1


def test_simplify_debts_no_debts():
    balances = {
        "A": Decimal("0.00"),
        "B": Decimal("0.00"),
    }
    assert len(simplify_debts(balances)) == 0
