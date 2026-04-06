
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
    # Print sys.path for debugging
    print(f"sys.path: {sys.path}")
    sys.exit(1)

with app.app_context():
    # user1_id = 1 (gustavo)
    u2 = User.query.filter(User.username.ilike('%Miguel%')).first()
    if not u2:
        print("User Miguel not found. Listing all users:")
        users = User.query.all()
        for u in users:
            print(f"ID {u.id}: {u.username}")
        sys.exit(0)
    
    user1_id = 1
    user2_id = u2.id
    print(f"--- DEBUGGING DEBTS BETWEEN user_id={user1_id} (gustavo) AND user_id={user2_id} ({u2.username}) ---")
    
    # 1. Expenses where user1 paid and user2 participates
    e_part_1 = db.session.query(Expense, ExpenseParticipant).join(
        ExpenseParticipant, Expense.id == ExpenseParticipant.expense_id
    ).filter(
        Expense.paid_by == user1_id,
        ExpenseParticipant.user_id == user2_id
    ).all()
    
    print(f"\n[1] Expenses paid by {user1_id}, {user2_id} participates (Friend owes User):")
    sum_owed_to_1 = Decimal("0")
    for e, p in e_part_1:
        print(f"  Expense ID {e.id}: {e.description} | Total {e.amount} | {u2.username} owes {p.amount_owed} | Group {e.group_id}")
        sum_owed_to_1 += Decimal(str(p.amount_owed))
    print(f"  TOTAL OWED BY FRIEND BEFORE PAYMENTS: {sum_owed_to_1}")

    # 2. Expenses where user2 paid and user1 participates
    e_part_2 = db.session.query(Expense, ExpenseParticipant).join(
        ExpenseParticipant, Expense.id == ExpenseParticipant.expense_id
    ).filter(
        Expense.paid_by == user2_id,
        ExpenseParticipant.user_id == user1_id
    ).all()
    
    print(f"\n[2] Expenses paid by {user2_id}, {user1_id} participates (User owes Friend):")
    sum_owed_to_2 = Decimal("0")
    for e, p in e_part_2:
        print(f"  Expense ID {e.id}: {e.description} | Total {e.amount} | gustavo owes {p.amount_owed} | Group {e.group_id}")
        sum_owed_to_2 += Decimal(str(p.amount_owed))
    print(f"  TOTAL OWED BY USER BEFORE PAYMENTS: {sum_owed_to_2}")

    # 3. Confirmed Payments between them
    payments = Payment.query.filter(
        Payment.status == 'confirmed',
        or_(
            and_(Payment.payer_id == user1_id, Payment.receiver_id == user2_id),
            and_(Payment.payer_id == user2_id, Payment.receiver_id == user1_id)
        )
    ).all()
    
    print(f"\n[3] Confirmed Payments between {user1_id} and {user2_id}:")
    pay_1_to_2 = Decimal("0") # gustavo paid Miguel
    pay_2_to_1 = Decimal("0") # Miguel paid gustavo
    for p in payments:
        print(f"  Payment ID {p.id}: {p.amount} from {p.payer_id} to {p.receiver_id} | Group {p.group_id}")
        if p.payer_id == user1_id:
            pay_1_to_2 += Decimal(str(p.amount))
        else:
            pay_2_to_1 += Decimal(str(p.amount))
    
    print(f"  Total gustavo paid Miguel (reduces user debt): {pay_1_to_2}")
    print(f"  Total Miguel paid gustavo (reduces friend debt): {pay_2_to_1}")

    # 4. Calculation Logic Simulation (Correct logic)
    print("\n--- SIMULATED CALCULATION (Corrected logic) ---")
    final_friend_owes_user = sum_owed_to_1 - pay_2_to_1
    final_user_owes_friend = sum_owed_to_2 - pay_1_to_2
    
    print(f"Friend still owes User: {final_friend_owes_user}")
    print(f"User still owes Friend: {final_user_owes_friend}")
    
    net_balance = final_friend_owes_user - final_user_owes_friend
    print(f"Net Balance (User perspective): {net_balance} (Positive = Friend owes User, Negative = User owes Friend)")

    # 5. API Result
    from api.utils import calculate_friend_debts
    actual = calculate_friend_debts(user1_id, user2_id)
    print("\n[ACTUAL API RESULT]:")
    print(actual)
