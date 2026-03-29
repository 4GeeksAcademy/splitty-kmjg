"""
Comprehensive TDD tests for the Splitty Debt Simplification Algorithm.

Tests MUST be written BEFORE implementation (per TDD Skill).
All financial computations use Decimal for cent-level precision.

Algorithm under test: simplify_debts(balances: dict[str, Decimal]) -> list[dict]
  - Input: { user_id: net_balance } where positive = creditor, negative = debtor
  - Output: [ {"from": debtor, "to": creditor, "amount": float} ]
"""
import sys
import os
import pytest
from decimal import Decimal

# Add the api directory to the path so we can import utils directly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))

from utils import simplify_debts


# ============================================
# HELPER: Validate that a transaction list
# fully settles all balances to zero.
# ============================================
def _assert_balances_zeroed(balances: dict, transactions: list):
    """Apply all transactions and assert every balance reaches zero."""
    remaining = {k: Decimal(str(v)) for k, v in balances.items()}
    for t in transactions:
        remaining[t["from"]] += Decimal(str(t["amount"]))
        remaining[t["to"]] -= Decimal(str(t["amount"]))
    for user, bal in remaining.items():
        assert bal == Decimal("0"), (
            f"User {user} has unsettled balance: {bal}"
        )


def _assert_all_amounts_positive(transactions: list):
    """Every transaction amount must be > 0."""
    for t in transactions:
        assert t["amount"] > 0, f"Non-positive amount in transaction: {t}"


# ============================================
# CASE 1: One payer, multiple debtors
# "A paid $100 dinner for 4 people (A, B, C, D)"
# Net: A = +75, B = -25, C = -25, D = -25
# Expected: 3 transactions, all TO A, each $25.
# ============================================
class TestOnePayerMultipleDebtors:
    def test_transaction_count(self):
        balances = {
            "A": Decimal("75.00"),
            "B": Decimal("-25.00"),
            "C": Decimal("-25.00"),
            "D": Decimal("-25.00"),
        }
        txns = simplify_debts(balances)
        assert len(txns) == 3

    def test_all_pay_to_creditor(self):
        balances = {
            "A": Decimal("75.00"),
            "B": Decimal("-25.00"),
            "C": Decimal("-25.00"),
            "D": Decimal("-25.00"),
        }
        txns = simplify_debts(balances)
        for t in txns:
            assert t["to"] == "A"
            assert t["amount"] == 25.0

    def test_balances_zero(self):
        balances = {
            "A": Decimal("75.00"),
            "B": Decimal("-25.00"),
            "C": Decimal("-25.00"),
            "D": Decimal("-25.00"),
        }
        txns = simplify_debts(balances)
        _assert_balances_zeroed(balances, txns)


# ============================================
# CASE 2: Cyclic debts (A→B→C→A)
# A paid 30 split with B → B owes A 15
# B paid 30 split with C → C owes B 15
# C paid 30 split with A → A owes C 15
# Net balance: Everyone = 0.  Expected: 0 transactions.
# ============================================
class TestCyclicDebts:
    def test_perfect_cycle_zero_transactions(self):
        """Perfect circular debt: everyone's net = 0 → 0 transactions."""
        balances = {
            "A": Decimal("0.00"),
            "B": Decimal("0.00"),
            "C": Decimal("0.00"),
        }
        txns = simplify_debts(balances)
        assert len(txns) == 0

    def test_imperfect_cycle(self):
        """
        A→B: $20, B→C: $30, C→A: $10.
        Net: A = -10, B = -10, C = +20
        Expected: 2 transactions (A→C: 10, B→C: 10), or optimized to similar.
        """
        balances = {
            "A": Decimal("-10.00"),
            "B": Decimal("-10.00"),
            "C": Decimal("20.00"),
        }
        txns = simplify_debts(balances)
        # The algorithm should produce at most 2 transactions
        assert len(txns) <= 2
        _assert_balances_zeroed(balances, txns)
        _assert_all_amounts_positive(txns)


# ============================================
# CASE 3: Chain debts (A owes B, B owes C)
# Net: A = -10, B = 0, C = +10
# Expected: 1 transaction (A→C: $10), B is eliminated.
# ============================================
class TestChainDebts:
    def test_chain_simplification(self):
        balances = {
            "A": Decimal("-10.00"),
            "B": Decimal("0.00"),
            "C": Decimal("10.00"),
        }
        txns = simplify_debts(balances)
        assert len(txns) == 1
        assert txns[0]["from"] == "A"
        assert txns[0]["to"] == "C"
        assert txns[0]["amount"] == 10.0

    def test_chain_balances_zero(self):
        balances = {
            "A": Decimal("-10.00"),
            "B": Decimal("0.00"),
            "C": Decimal("10.00"),
        }
        txns = simplify_debts(balances)
        _assert_balances_zeroed(balances, txns)


# ============================================
# CASE 4: Complex multi-creditor, multi-debtor
# Net: A = -50, B = -25, C = +60, D = +15
# The greedy algorithm should minimize transactions.
# ============================================
class TestComplexSplit:
    def test_transaction_count(self):
        balances = {
            "A": Decimal("-50.00"),
            "B": Decimal("-25.00"),
            "C": Decimal("60.00"),
            "D": Decimal("15.00"),
        }
        txns = simplify_debts(balances)
        # Greedy: A→C(50), B→C(10), B→D(15) = 3 txns
        assert len(txns) <= 3

    def test_complex_balances_zero(self):
        balances = {
            "A": Decimal("-50.00"),
            "B": Decimal("-25.00"),
            "C": Decimal("60.00"),
            "D": Decimal("15.00"),
        }
        txns = simplify_debts(balances)
        _assert_balances_zeroed(balances, txns)
        _assert_all_amounts_positive(txns)


# ============================================
# CASE 5: No debts — all balances zero
# ============================================
class TestNoDebts:
    def test_all_zero(self):
        balances = {
            "A": Decimal("0.00"),
            "B": Decimal("0.00"),
        }
        assert len(simplify_debts(balances)) == 0

    def test_empty_dict(self):
        assert len(simplify_debts({})) == 0


# ============================================
# CASE 6: Single user — edge case
# ============================================
class TestSingleUser:
    def test_single_user_zero(self):
        balances = {"A": Decimal("0.00")}
        assert len(simplify_debts(balances)) == 0


# ============================================
# CASE 7: Float precision — recurring decimals
# Splitting $100 among 3 people:
# Each owes 33.33, one owes 33.34 (rounding).
# The function must handle Decimal precision.
# ============================================
class TestFloatPrecision:
    def test_thirds_split(self):
        """
        Three-way split of 100.00.
        Payer: A (keeps 0), Debtors: B and C owe 33.33, D owes 33.34.
        Net: A = +100.00, B = -33.33, C = -33.33, D = -33.34
        """
        balances = {
            "A": Decimal("100.00"),
            "B": Decimal("-33.33"),
            "C": Decimal("-33.33"),
            "D": Decimal("-33.34"),
        }
        txns = simplify_debts(balances)
        _assert_balances_zeroed(balances, txns)
        _assert_all_amounts_positive(txns)

    def test_penny_precision(self):
        """
        Very small amounts — must not lose pennies.
        """
        balances = {
            "A": Decimal("0.01"),
            "B": Decimal("-0.01"),
        }
        txns = simplify_debts(balances)
        assert len(txns) == 1
        assert txns[0]["amount"] == 0.01
        _assert_balances_zeroed(balances, txns)

    def test_large_amounts_precision(self):
        """
        Large dinner: $9999.99 split across 3 — Decimal must not drift.
        """
        total = Decimal("9999.99")
        each = (total / 3).quantize(Decimal("0.01"))
        remainder = total - (each * 2)
        balances = {
            "A": total,
            "B": -each,
            "C": -each,
            "D": -remainder,
        }
        txns = simplify_debts(balances)
        _assert_balances_zeroed(balances, txns)


# ============================================
# CASE 8: Two equal creditors, one debtor
# Net: A = +50, B = +50, C = -100
# Expected: 2 transactions (C→A:50, C→B:50)
# ============================================
class TestTwoCreditors:
    def test_even_split_to_multiple_creditors(self):
        balances = {
            "A": Decimal("50.00"),
            "B": Decimal("50.00"),
            "C": Decimal("-100.00"),
        }
        txns = simplify_debts(balances)
        assert len(txns) == 2
        _assert_balances_zeroed(balances, txns)
        _assert_all_amounts_positive(txns)


# ============================================
# CASE 9: Many users — stress test
# 10 users, the sum of balances = 0
# ============================================
class TestManyUsers:
    def test_ten_users(self):
        balances = {
            "U1": Decimal("100.00"),
            "U2": Decimal("50.00"),
            "U3": Decimal("-30.00"),
            "U4": Decimal("-20.00"),
            "U5": Decimal("-10.00"),
            "U6": Decimal("-15.00"),
            "U7": Decimal("-25.00"),
            "U8": Decimal("-10.00"),
            "U9": Decimal("-5.00"),
            "U10": Decimal("-35.00"),
        }
        # Verify sum = 0
        assert sum(balances.values()) == Decimal("0.00")

        txns = simplify_debts(balances)
        # Greedy should produce at most n-1 = 9 transactions
        assert len(txns) <= 9
        _assert_balances_zeroed(balances, txns)
        _assert_all_amounts_positive(txns)


# ============================================
# CASE 10: Return format validation
# Each transaction must be {"from": str, "to": str, "amount": float}
# ============================================
class TestReturnFormat:
    def test_keys_present(self):
        balances = {
            "A": Decimal("10.00"),
            "B": Decimal("-10.00"),
        }
        txns = simplify_debts(balances)
        for t in txns:
            assert "from" in t
            assert "to" in t
            assert "amount" in t

    def test_amount_is_float(self):
        balances = {
            "A": Decimal("10.00"),
            "B": Decimal("-10.00"),
        }
        txns = simplify_debts(balances)
        for t in txns:
            assert isinstance(t["amount"], float)

    def test_from_to_are_strings(self):
        balances = {
            "A": Decimal("10.00"),
            "B": Decimal("-10.00"),
        }
        txns = simplify_debts(balances)
        for t in txns:
            assert isinstance(t["from"], str)
            assert isinstance(t["to"], str)

    def test_no_self_transfers(self):
        """A person should never pay themselves."""
        balances = {
            "A": Decimal("50.00"),
            "B": Decimal("-30.00"),
            "C": Decimal("-20.00"),
        }
        txns = simplify_debts(balances)
        for t in txns:
            assert t["from"] != t["to"], f"Self-transfer detected: {t}"


# ============================================
# CASE 11: Integer user IDs (real-world DB keys)
# The function must work with int keys too.
# ============================================
class TestIntegerUserIds:
    def test_with_int_keys(self):
        balances = {
            1: Decimal("30.00"),
            2: Decimal("-15.00"),
            3: Decimal("-15.00"),
        }
        txns = simplify_debts(balances)
        assert len(txns) == 2
        _assert_balances_zeroed(balances, txns)
        _assert_all_amounts_positive(txns)
