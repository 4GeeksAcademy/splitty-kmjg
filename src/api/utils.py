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
    from api.models import GroupMember, Group, Expense, ExpenseParticipant
    
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

