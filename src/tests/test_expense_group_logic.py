import os
import sys
from decimal import Decimal

# Ensure the src directory is in the Python path so imports resolve
TESTING_SOURCES = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "src"))
if TESTING_SOURCES not in sys.path:
    sys.path.insert(0, TESTING_SOURCES)

# Import the app and models after adjusting the path so Flask app context can be created
import pytest
import json

# Set TESTING env before importing app so the in-memory DB is used
os.environ.setdefault("TESTING", "1")

from app import app, db  # type: ignore
from api.models import User, Group, GroupMember, Expense, ExpenseParticipant  # type: ignore
from api.routes import bcrypt  # type: ignore
from api.utils import simplify_debts  # type: ignore


def _create_user(username, email, raw_password):
    hashed = bcrypt.generate_password_hash(raw_password).decode('utf-8')
    user = User(username=username, email=email, password=hashed,
                is_active=True, is_verified=True)
    return user


def test_expense_and_group_creation_and_debt_simplification():
    # Initialize a clean in-memory DB for this test
    with app.app_context():
        db.drop_all()
        db.create_all()

        # Create two users
        u1 = _create_user("alice", "alice@example.com", "password1")
        u2 = _create_user("bob", "bob@example.com", "password2")
        db.session.add_all([u1, u2])
        db.session.commit()

        # Create a group and add both users
        grp = Group(name="WeekendTrip", category="Friends", created_by=u1.id)
        db.session.add(grp)
        db.session.flush()
        gm1 = GroupMember(group_id=grp.id, user_id=u1.id)
        gm2 = GroupMember(group_id=grp.id, user_id=u2.id)
        db.session.add_all([gm1, gm2])
        db.session.commit()

        # Create an expense in the group paid by u1, with two participants
        exp = Expense(description="Gas and snacks", amount=Decimal("100.00"),
                      currency="$", group_id=grp.id, paid_by=u1.id)
        db.session.add(exp)
        db.session.flush()
        p1 = ExpenseParticipant(expense_id=exp.id, user_id=u1.id, amount_owed=Decimal("40.00"))
        p2 = ExpenseParticipant(expense_id=exp.id, user_id=u2.id, amount_owed=Decimal("60.00"))
        db.session.add_all([p1, p2])
        db.session.commit()

        # Basic assertions on created entities
        assert exp.id is not None
        assert exp.group_id == grp.id
        assert len(exp.participants) == 2

        # Debt division between two users: Bob should pay Alice 60
        balances = {
            "alice": Decimal("60.00"),
            "bob": Decimal("-60.00"),
        }
        transactions = simplify_debts(balances)
        assert len(transactions) == 1
        assert transactions[0]["from"] == "bob"
        assert transactions[0]["to"] == "alice"
        assert transactions[0]["amount"] == 60.0


def test_simplify_debts_three_participants():
    balances = {
        "alice": Decimal("20.00"),
        "bob": Decimal("-5.00"),
        "carol": Decimal("-15.00")
    }
    transactions = simplify_debts(balances)
    # For two debtors and one creditor, the algorithm pops the largest debt first
    # which means: carol -> alice (15.00), then bob -> alice (5.00)
    assert len(transactions) == 2
    assert transactions[0]["from"] == "carol"
    assert transactions[0]["to"] == "alice"
    assert transactions[0]["amount"] == 15.0
    assert transactions[1]["from"] == "bob"
    assert transactions[1]["to"] == "alice"
    assert transactions[1]["amount"] == 5.0


def test_calculate_friend_debts_basic():
    with app.app_context():
        db.drop_all()
        db.create_all()

        # Create users and group with two members
        u1 = _create_user("dana", "dana@example.com", "password3")
        u2 = _create_user("eric", "eric@example.com", "password4")
        db.session.add_all([u1, u2])
        db.session.commit()

        grp = Group(name="Office", category="Work", created_by=u1.id)
        db.session.add(grp)
        db.session.flush()
        db.session.add_all([
            GroupMember(group_id=grp.id, user_id=u1.id),
            GroupMember(group_id=grp.id, user_id=u2.id),
        ])
        db.session.commit()

        # Expense paid by u1, user u2 participates owe 50
        exp = Expense(description="Lunch", amount=Decimal("50.00"), group_id=grp.id, paid_by=u1.id, currency="$")
        db.session.add(exp)
        db.session.flush()
        db.session.add_all([
            ExpenseParticipant(expense_id=exp.id, user_id=u1.id, amount_owed=Decimal("0.00")),
            ExpenseParticipant(expense_id=exp.id, user_id=u2.id, amount_owed=Decimal("50.00")),
        ])
        db.session.commit()

        from api.utils import calculate_friend_debts
        result = calculate_friend_debts(u1.id, u2.id)
        assert isinstance(result, dict)
        assert result.get("net_balance") == 50.0


def test_api_flow_group_and_expense_complete():
    # API-driven end-to-end for group and expense creation
    with app.app_context():
        db.drop_all()
        db.create_all()

        # Create two users via DB (must be verified for login)
        u1 = _create_user("api_alice", "api_alice@example.com", "secret1")
        u2 = _create_user("api_bob", "api_bob@example.com", "secret2")
        db.session.add_all([u1, u2])
        db.session.commit()

        # Login as u1 to obtain JWT
        client = app.test_client()
        login_resp = client.post(
            "/api/login",
            json={"email": u1.email, "password": "secret1"}
        )
        assert login_resp.status_code == 200
        token = login_resp.get_json().get("access_token")
        assert token is not None
        headers = {"Authorization": f"Bearer {token}"}

        # Create a group
        grp_resp = client.post(
            "/api/groups",
            json={"name": "API Group", "category": "Testing"},
            headers=headers
        )
        assert grp_resp.status_code == 201
        group_id = grp_resp.get_json()["group"]["id"]

        # Create an expense in the group, with u2 as participant
        exp_payload = {
            "description": "API lunch",
            "amount": "70.00",
            "currency": "$",
            "paid_by": u1.id,
            "participants": [{"user_id": u2.id, "amount_owed": 70.0}]
        }
        exp_resp = client.post(
            f"/api/groups/{group_id}/expenses",
            json=exp_payload,
            headers=headers
        )
        assert exp_resp.status_code == 201
        assert "expense" in exp_resp.get_json()
        assert len(exp_resp.get_json().get("participants", [])) == 1

        # Retrieve expenses for the group
        get_exp = client.get(f"/api/groups/{group_id}/expenses", headers=headers)
        assert get_exp.status_code == 200
        data = get_exp.get_json()
        assert data["group_id"] == group_id

        # Cleanup: test unauthorized expense attempt by a non-member
        u3 = _create_user("api_charlie", "api_charlie@example.com", "secret3")
        db.session.add(u3)
        db.session.commit()
        login3 = client.post("/api/login", json={"email": u3.email, "password": "secret3"})
        token3 = login3.get_json().get("access_token")
        headers3 = {"Authorization": f"Bearer {token3}"}
        bad_exp = client.post(
            f"/api/groups/{group_id}/expenses",
            json={"description": "Invalid", "amount": "10.00", "paid_by": u3.id},
            headers=headers3
        )
        assert bad_exp.status_code == 403



def test_distribute_proportional_costs_basic():
    items = [
        {"id": "A", "price": Decimal("10.00")},
        {"id": "B", "price": Decimal("20.00")}    
    ]
    tax = Decimal("0.90")
    tip = Decimal("0.60")
    from api.utils import distribute_proportional_costs
    result = distribute_proportional_costs(items, tax, tip)
    assert len(result) == 2
    # item A: tax 0.30, tip 0.20 -> final 10.50
    assert result[0]["tax_share"] == Decimal("0.30")
    assert result[0]["tip_share"] == Decimal("0.20")
    assert result[0]["final_price"] == Decimal("10.50")
    # item B: tax 0.60, tip 0.40 -> final 21.00
    assert result[1]["tax_share"] == Decimal("0.60")
    assert result[1]["tip_share"] == Decimal("0.40")
    assert result[1]["final_price"] == Decimal("21.00")


def test_group_invitation_and_accept_flow():
    with app.app_context():
        db.drop_all()
        db.create_all()

        # Create two users
        inviter = _create_user("inviter_api", "inviter_api@example.com", "pass1")
        invitee = _create_user("invitee_api", "invitee_api@example.com", "pass2")
        db.session.add_all([inviter, invitee])
        db.session.commit()

        client = app.test_client()
        login_resp = client.post("/api/login", json={"email": inviter.email, "password": "pass1"})
        token = login_resp.get_json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}

        grp = Group(name="InviteGroupAPI", category="Testing", created_by=inviter.id)
        db.session.add(grp)
        db.session.flush()
        db.session.add(GroupMember(group_id=grp.id, user_id=inviter.id))
        db.session.commit()

        # Send invitation to invitee via email
        inv_resp = client.post(f"/api/groups/{grp.id}/invite-link", json={"email": invitee.email}, headers=headers)
        assert inv_resp.status_code == 201
        token_inv = inv_resp.get_json().get("token")
        assert token_inv is not None

        # Login as invitee to accept the invitation
        login_inv = client.post("/api/login", json={"email": invitee.email, "password": "pass2"})
        token_inv_person = login_inv.get_json().get("access_token")
        headers_inv = {"Authorization": f"Bearer {token_inv_person}"}

        acc_resp = client.post("/api/groups/accept-invite", json={"token": token_inv}, headers=headers_inv)
        assert acc_resp.status_code == 200
        membership = GroupMember.query.filter_by(group_id=grp.id, user_id=invitee.id).first()
        assert membership is not None


def test_confirm_payment_endpoint_updates_expense():
    with app.app_context():
        db.drop_all()
        db.create_all()
        # create users and group
        payer = _create_user("payer2", "payer2@example.com", "ppass")
        other = _create_user("other2", "other2@example.com", "ppass2")
        db.session.add_all([payer, other])
        db.session.commit()

        grp = Group(name="PaymentsFlowAPI", category="Finance", created_by=payer.id)
        db.session.add(grp)
        db.session.flush()
        db.session.add_all([
            GroupMember(group_id=grp.id, user_id=payer.id),
            GroupMember(group_id=grp.id, user_id=other.id),
        ])
        db.session.commit()

        exp = Expense(description="Reimbursement API", amount=Decimal("25.00"), group_id=grp.id, paid_by=payer.id, currency="$")
        db.session.add(exp)
        db.session.flush()
        db.session.add_all([
            ExpenseParticipant(expense_id=exp.id, user_id=payer.id, amount_owed=Decimal("0.00")),
            ExpenseParticipant(expense_id=exp.id, user_id=other.id, amount_owed=Decimal("25.00")),
        ])
        db.session.commit()

        client = app.test_client()
        resp = client.post("/api/confirm-payment", json={"orderID": "ORD-API-001", "expense_id": exp.id})
        assert resp.status_code == 200
        refreshed = Expense.query.get(exp.id)
    assert refreshed.is_settled is True


def test_group_friend_invitation_flow():
    with app.app_context():
        db.drop_all()
        db.create_all()
        # Create two users
        inviter = _create_user("friend_invit", "inviter@example.com", "fpass1")
        invitee = _create_user("friend_invitee", "invitee@example.com", "fpass2")
        db.session.add_all([inviter, invitee])
        db.session.commit()

        client = app.test_client()
        login_resp = client.post("/api/login", json={"email": inviter.email, "password": "fpass1"})
        token = login_resp.get_json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}

        # Generate friend invite
        inv_resp = client.post("/api/friends/invite-link", json={"email": invitee.email}, headers=headers)
        assert inv_resp.status_code == 201
        invite_token = inv_resp.get_json().get("token")
        assert invite_token

        # Login as invitee and accept invite
        login_inv = client.post("/api/login", json={"email": invitee.email, "password": "fpass2"})
        token_inv = login_inv.get_json().get("access_token")
        headers_inv = {"Authorization": f"Bearer {token_inv}"}
        acc_resp = client.post("/api/friends/accept-invite", json={"token": invite_token}, headers=headers_inv)
        assert acc_resp.status_code == 200
        # Verify friendship exists (either direction, accepted)
        from api.models import Friendship
        f1 = Friendship.query.filter_by(requester_id=inviter.id, addressee_id=invitee.id, status="accepted").first()
        f2 = Friendship.query.filter_by(requester_id=invitee.id, addressee_id=inviter.id, status="accepted").first()
        assert (f1 is not None) or (f2 is not None)


def test_api_group_payment_flow_basic():
    with app.app_context():
        db.drop_all()
        db.create_all()
        # Create two users and a group
        payer = _create_user("pay_api", "pay_api@example.com", "ppass")
        receiver = _create_user("recv_api", "recv_api@example.com", "rpass")
        db.session.add_all([payer, receiver])
        db.session.commit()

        grp = Group(name="PaymentsGroupAPI", category="Finance", created_by=payer.id)
        db.session.add(grp)
        db.session.flush()
        db.session.add_all([
            GroupMember(group_id=grp.id, user_id=payer.id),
            GroupMember(group_id=grp.id, user_id=receiver.id),
        ])
        db.session.commit()

        client = app.test_client()
        login_resp = client.post("/api/login", json={"email": payer.email, "password": "ppass"})
        token = login_resp.get_json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}

        pay_resp = client.post(
            f"/api/groups/{grp.id}/payments",
            json={"receiver_id": receiver.id, "amount": 25, "payment_method": "manual"},
            headers=headers
        )
        assert pay_resp.status_code == 201
        payment_id = pay_resp.get_json()["payment"]["id"]
        assert payment_id is not None

        # Confirm payment as the receiver
        login_recv = client.post("/api/login", json={"email": receiver.email, "password": "rpass"})
        token_recv = login_recv.get_json().get("access_token")
        headers_recv = {"Authorization": f"Bearer {token_recv}"}
        conf_resp = client.put(f"/api/payments/{payment_id}/confirm", headers=headers_recv)
        assert conf_resp.status_code == 200
        # Fetch payment to ensure status updated
        from api.models import Payment
        p = Payment.query.get(payment_id)
        assert p is not None and p.status == 'confirmed'
