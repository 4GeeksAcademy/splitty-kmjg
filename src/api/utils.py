from flask import jsonify, url_for
from decimal import Decimal

class APIException(Exception):
    status_code = 400

    def __init__(self, message, status_code=None, payload=None):
        Exception.__init__(self)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or ())
        rv['message'] = self.message
        return rv

def has_no_empty_params(rule):
    defaults = rule.defaults if rule.defaults is not None else ()
    arguments = rule.arguments if rule.arguments is not None else ()
    return len(defaults) >= len(arguments)

def generate_sitemap(app):
    links = ['/admin/']
    for rule in app.url_map.iter_rules():
        # Filter out rules we can't navigate to in a browser
        # and rules that require parameters
        if "GET" in rule.methods and has_no_empty_params(rule):
            url = url_for(rule.endpoint, **(rule.defaults or {}))
            if "/admin/" not in url:
                links.append(url)

    links_html = "".join(["<li><a href='" + y + "'>" + y + "</a></li>" for y in links])
    return """
        <div style="text-align: center;">
        <img style="max-height: 80px" src='https://storage.googleapis.com/breathecode/boilerplates/rigo-baby.jpeg' />
        <h1>Rigo welcomes you to your API!!</h1>
        <p>API HOST: <script>document.write('<input style="padding: 5px; width: 300px" type="text" value="'+window.location.href+'" />');</script></p>
        <p>Start working on your project by following the <a href="https://start.4geeksacademy.com/starters/full-stack" target="_blank">Quick Start</a></p>
        <p>Remember to specify a real endpoint path like: </p>
        <ul style="text-align: left;">"""+links_html+"</ul></div>"


# ============================================
# DEBT SIMPLIFICATION ALGORITHM
# Greedy max-heap approach for minimizing
# the number of transactions in a group.
# ============================================

def simplify_debts(balances: dict) -> list:
    """
    Simplifies net balances into the minimum number of direct peer-to-peer
    transactions using a heap-based greedy approach.

    This implementation uses two max-heaps (emulated with Python's min-heap
    by negating values) to continuously pair the largest debtor with the
    largest creditor, transferring the smaller of the two amounts until all
    balances are settled.

    Balances are expected as Decimal-compatible values and the sum should be 0.
    """
    import heapq

    transactions: list = []

    # Build heaps: store (-amount, user_id) to simulate a max-heap with heapq
    debt_heap: list = []     # debtors: amount owed (positive values)
    credit_heap: list = []   # creditors: amount to receive (positive values)

    for user, bal in balances.items():
        bal_dec = Decimal(str(bal))
        if bal_dec == Decimal("0"):
            continue
        if bal_dec < 0:
            amount = -bal_dec  # positive owed amount
            heapq.heappush(debt_heap, (-amount, user))  # max-heap via negative
        else:
            amount = bal_dec
            heapq.heappush(credit_heap, (-amount, user))  # max-heap via negative

    while debt_heap and credit_heap:
        debt_neg, debtor = heapq.heappop(debt_heap)
        debt_amt = -debt_neg

        cred_neg, creditor = heapq.heappop(credit_heap)
        cred_amt = -cred_neg

        transfer = min(debt_amt, cred_amt)

        transactions.append({
            "from": debtor,
            "to": creditor,
            "amount": float(Decimal(str(transfer)).quantize(Decimal("0.01")))
        })

        debt_amt -= transfer
        cred_amt -= transfer

        if debt_amt > Decimal("0"):
            heapq.heappush(debt_heap, (-debt_amt, debtor))
        if cred_amt > Decimal("0"):
            heapq.heappush(credit_heap, (-cred_amt, creditor))

    return transactions


# ============================================
# FRIENDS & DEBTS UTILITIES
# ============================================

def get_accepted_friends(user_id):
    """
    Returns list of accepted Friendship objects for a user.
    Checks both directions (requester and addressee).
    """
    from api.models import Friendship
    from sqlalchemy import or_, and_
    
    friendships = Friendship.query.filter(
        and_(
            or_(
                Friendship.requester_id == user_id,
                Friendship.addressee_id == user_id
            ),
            Friendship.status == "accepted"
        )
    ).all()
    
    return friendships


def calculate_friend_debts(user_id, friend_id):
    """
    Calculate the net debt between two users across ALL shared groups.
    
    Returns:
        dict with:
          - net_balance: positive = friend owes user, negative = user owes friend
          - groups: list of {group_id, group_name, balance} breakdowns
          - total_owed_to_user: sum of what friend owes user
          - total_user_owes: sum of what user owes friend
    
    Uses Decimal for financial precision (TDD Skill).
    """
    from api.models import GroupMember, Group, Expense, ExpenseParticipant, Payment
    from sqlalchemy import and_, or_
    
    # Find all groups where both users are members
    user_groups = set(
        gm.group_id for gm in GroupMember.query.filter_by(user_id=user_id).all()
    )
    friend_groups = set(
        gm.group_id for gm in GroupMember.query.filter_by(user_id=friend_id).all()
    )
    shared_group_ids = user_groups & friend_groups
    
    if not shared_group_ids:
        return {
            "net_balance": 0.0,
            "groups": [],
            "total_owed_to_user": 0.0,
            "total_user_owes": 0.0
        }
    
    total_owed_to_user = Decimal("0")  # friend owes user
    total_user_owes = Decimal("0")     # user owes friend
    group_breakdowns = []
    
    for gid in shared_group_ids:
        group = Group.query.get(gid)
        group_balance = Decimal("0")
        
        # Get all expenses in this group
        expenses = Expense.query.filter_by(group_id=gid).all()
        
        for expense in expenses:
            participants = ExpenseParticipant.query.filter_by(
                expense_id=expense.id
            ).all()
            
            for p in participants:
                # Case 1: User paid, friend participates → friend owes user
                if expense.paid_by == user_id and p.user_id == friend_id:
                    amount = Decimal(str(p.amount_owed))
                    total_owed_to_user += amount
                    group_balance += amount
                
                # Case 2: Friend paid, user participates → user owes friend
                elif expense.paid_by == friend_id and p.user_id == user_id:
                    amount = Decimal(str(p.amount_owed))
                    total_user_owes += amount
                    group_balance -= amount
                    
        # Consider ONLY confirmed payments between these two in this group
        payments = Payment.query.filter(
            Payment.group_id == gid,
            Payment.status == 'confirmed',
            or_(
                and_(Payment.payer_id == user_id, Payment.receiver_id == friend_id),
                and_(Payment.payer_id == friend_id, Payment.receiver_id == user_id)
            )
        ).all()
        
        for pmt in payments:
            amount = Decimal(str(pmt.amount))
            if pmt.payer_id == user_id:
                # user paid friend. Reduces what user owes.
                total_user_owes -= amount
                group_balance += amount # shifts balance in user's favor
            else:
                # friend paid user. Reduces what friend owes.
                total_owed_to_user -= amount
                group_balance -= amount
        
        if group_balance != 0:
            group_breakdowns.append({
                "group_id": gid,
                "group_name": group.name if group else f"Group #{gid}",
                "balance": float(group_balance)
            })
    
    net = total_owed_to_user - total_user_owes
    
    return {
        "net_balance": float(net),
        "groups": group_breakdowns,
        "total_owed_to_user": float(total_owed_to_user),
        "total_user_owes": float(total_user_owes)
    }

def distribute_proportional_costs(items, tax: Decimal, tip: Decimal) -> list:
    """
    Distributes tax and tip across a list of items proportionally based on their price.
    Uses the largest remainder algorithm to ensure no pennies are lost to precision rounding.
    Arguments:
        items: list of dicts [{"id": str, "price": Decimal}]
        tax: Decimal (total tax)
        tip: Decimal (total tip)
    Returns:
        list of dicts with original data + tax_share, tip_share, and final_price
    """
    if not items:
        return []
        
    total_price = sum(item["price"] for item in items)
    if total_price == 0:
        return [
            {**item, "tax_share": Decimal("0.00"), "tip_share": Decimal("0.00"), "final_price": Decimal("0.00")}
            for item in items
        ]

    # Calculate exact shares (float-like) and floor-rounded (cent-level) shares
    processed = []
    
    # Track allocations and remainders
    tax_allocations = []
    tip_allocations = []
    
    allocated_tax = Decimal("0.00")
    allocated_tip = Decimal("0.00")
    
    for i, item in enumerate(items):
        price = item["price"]
        proportion = price / total_price
        
        # Unrounded shares
        raw_tax = proportion * tax
        raw_tip = proportion * tip
        
        # Floored shares (cents)
        base_tax = (raw_tax).quantize(Decimal("0.01"), rounding="ROUND_DOWN")
        base_tip = (raw_tip).quantize(Decimal("0.01"), rounding="ROUND_DOWN")
        
        # Calculate remainder
        rem_tax = raw_tax - base_tax
        rem_tip = raw_tip - base_tip
        
        allocated_tax += base_tax
        allocated_tip += base_tip
        
        tax_allocations.append({"index": i, "base": base_tax, "remainder": rem_tax})
        tip_allocations.append({"index": i, "base": base_tip, "remainder": rem_tip})
        
        processed.append({**item})
        
    # Distribute remaining tax pennies
    remaining_tax_cents = int((tax - allocated_tax) * 100)
    tax_allocations.sort(key=lambda x: x["remainder"], reverse=True)
    for i in range(remaining_tax_cents):
        idx = tax_allocations[i]["index"]
        tax_allocations[i]["base"] += Decimal("0.01")
        
    # Distribute remaining tip pennies
    remaining_tip_cents = int((tip - allocated_tip) * 100)
    tip_allocations.sort(key=lambda x: x["remainder"], reverse=True)
    for i in range(remaining_tip_cents):
        idx = tip_allocations[i]["index"]
        tip_allocations[i]["base"] += Decimal("0.01")
        
    # Apply logic to the final dataset
    for tax_obj in tax_allocations:
        processed[tax_obj["index"]]["tax_share"] = tax_obj["base"]
        
    for tip_obj in tip_allocations:
        processed[tip_obj["index"]]["tip_share"] = tip_obj["base"]
        
    for result in processed:
        result["final_price"] = result["price"] + result["tax_share"] + result["tip_share"]
        
    return processed

import re

def validate_password(password):
    """
    Validate password strength:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character"
    return True, "Password is valid"

def validate_file_type(file, allowed_extensions=None, allowed_mimetypes=None):
    """
    Validate file type and MIME type.
    """
    if allowed_extensions is None:
        allowed_extensions = {'png', 'jpg', 'jpeg', 'pdf'}
    if allowed_mimetypes is None:
        allowed_mimetypes = {'image/png', 'image/jpeg', 'application/pdf'}
    
    filename = file.filename
    if '.' not in filename:
        return False, "File has no extension"
    
    ext = filename.rsplit('.', 1)[1].lower()
    if ext not in allowed_extensions:
        return False, f"Extension .{ext} not allowed"
    
    if hasattr(file, 'content_type'):
        if file.content_type not in allowed_mimetypes:
            return False, f"MIME type {file.content_type} not allowed"
        
    return True, "File is valid"

def drop_views(db):
    """
    Explicitly drops custom SQL views that SQLAlchemy's drop_all() 
    fails to track, particularly in SQLite.
    """
    views = ["pending_payments", "group_payment_summary"]
    for view in views:
        try:
            db.session.execute(f"DROP VIEW IF EXISTS {view}")
        except Exception as e:
            # Silence errors if view doesn't exist or engine doesn't support it
            pass
    db.session.commit()
