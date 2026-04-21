import os
import random
import string
from decimal import Decimal, InvalidOperation
from flask import Flask, request, jsonify, url_for, Blueprint, current_app
from api.models import (
    db,
    User,
    BlockedToken,
    Group,
    GroupMember,
    Expense,
    ExpenseParticipant,
    Invitation,
    Friendship,
    FriendInvitation,
    Payment
)
from flask_mail import Message
import cloudinary.uploader
from api.utils import generate_sitemap, APIException, validate_file_type
from flask_cors import CORS
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from flask_bcrypt import Bcrypt
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from datetime import datetime, timedelta
import datetime as dt_module # Use an alias to avoid conflict with the name 'datetime' imported from 'datetime'
from api.mail_utils import send_splitty_mail

bcrypt = Bcrypt()
api = Blueprint('api', __name__)

# Configure Limiter
limiter = Limiter(
    key_func=get_remote_address,
    # Increased dramatically because the dashboard makes 4-5 API requests on every mount.
    default_limits=["5000 per day", "1000 per hour", "50 per minute"],
    storage_uri="memory://",
)

# Permite peticiones CORS específicamente para el prefijo /api/
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
# Sugerencia: En desarrollo, permitir el puerto 3001 que es común en Vite
allowed_origins = [frontend_url, "http://localhost:3000",
                   "http://localhost:3001", "http://localhost:5173"]
CORS(api, resources={r"/api/*": {"origins": allowed_origins}})


@api.route('/hello', methods=['POST', 'GET'])
def handle_hello():
    response_body = {
        "message": "Hello! I'm a message from the backend"
    }
    return jsonify(response_body), 200

# --- ENDPOINTS DE USUARIO (Registro, Login, Logout) ---


@api.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def reg_user():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    from api.utils import validate_password
    is_valid, msg = validate_password(password)
    if not is_valid:
        return jsonify({"error": msg}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user and existing_user.is_verified:
        return jsonify({"error": "Email already registered"}), 409

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    # Generar código de verificación de 6 dígitos
    verification_code = ''.join(random.choices(string.digits, k=6))
    expires_at = datetime.utcnow() + timedelta(minutes=30)

    if existing_user:
        # Reutilizar y actualizar el registro no verificado
        current_app.logger.info(f"Refreshing registration for unverified email: {email}")
        existing_user.username = username
        existing_user.password = hashed_password
        existing_user.verification_code = verification_code
        existing_user.verification_expires_at = expires_at
        new_user = existing_user
    else:
        # Crear un nuevo usuario desde cero
        new_user = User(
            username=username,
            email=email,
            password=hashed_password,
            is_active=True,
            is_verified=False,
            verification_code=verification_code,
            verification_expires_at=expires_at
        )
        db.session.add(new_user)

    try:
        db.session.commit()

        # Enviar email con el código usando la nueva utilidad centralizada
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        verify_link = f"{frontend_url}/verify-email?email={email}&code={verification_code}"
        
        success, error_msg = send_splitty_mail(
            subject="Verify your email - Splitty",
            recipient=email,
            template_type='verification',
            context={
                "username": username,
                "code": verification_code,
                "link": verify_link
            }
        )

        if not success:
            current_app.logger.error(f"Error sending verification mail: {error_msg}")

        return jsonify({"message": "Usuario creado. Por favor, verifica tu email."}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in registration: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


@api.route('/login', methods=['POST'])
@limiter.limit("5 per minute")
def login_user():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not bcrypt.check_password_hash(user.password, password):
        current_app.logger.warning(
            f"Intento de login fallido para el email: {email}")
        return jsonify({"error": "Incorrect email or password"}), 401

    if not user.is_verified:
        return jsonify({"error": "Please verify your email first", "not_verified": True}), 403

    access_token = create_access_token(
        identity=str(user.id),
        expires_delta=timedelta(days=7)
    )
    return jsonify({
        "message": "Login correcto",
        "access_token": access_token,
        "username": user.username,
        "id": user.id
    }), 200


@api.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    blocked_token = BlockedToken(jti=jti)
    db.session.add(blocked_token)
    db.session.commit()
    return jsonify({"msg": "Usuario desconectado correctamente"}), 200


@api.route('/forgot-password', methods=['POST'])
def forgot_password():
    email = request.json.get('email')
    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"msg": "Email not found"}), 404

    # Generar un token que expire en 15 minutos
    expires = dt_module.timedelta(minutes=15)
    reset_token = create_access_token(
        identity=str(user.id), expires_delta=expires)

    # Usar la url del frontend global definida al inicio de routes.py
    link = f"{frontend_url}/reset-password?token={reset_token}"

    # Enviar email usando la nueva utilidad centralizada
    success, error_msg = send_splitty_mail(
        subject="Password Recovery - Splitty",
        recipient=email,
        template_type='password_reset',
        context={
            "username": user.username,
            "link": link
        }
    )

    if success:
        return jsonify({"msg": "Email sent successfully"}), 200
    else:
        current_app.logger.error(f"Error sending password reset mail: {error_msg}")
        return jsonify({"msg": "Error sending email"}), 500


@api.route('/reset-password', methods=['POST'])
@jwt_required()
def reset_password():
    new_password = request.json.get('password')
    if not new_password:
        return jsonify({"msg": "Password is required"}), 400
        
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')
    user.password = hashed_password
    db.session.commit()
    return jsonify({"msg": "Password updated successfully"}), 200


@api.route('/verify-email', methods=['POST'])
@limiter.limit("10 per minute")
def verify_email():
    data = request.get_json()
    email = data.get('email')
    code = data.get('code')

    if not email or not code:
        return jsonify({"error": "Email and code are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.is_verified:
        return jsonify({"message": "Email already verified"}), 200

    if user.verification_code != code:
        return jsonify({"error": "Invalid verification code"}), 400

    if user.verification_expires_at < datetime.utcnow():
        return jsonify({"error": "Verification code expired"}), 400

    user.is_verified = True
    user.verification_code = None
    user.verification_expires_at = None
    db.session.commit()

    return jsonify({"message": "Email verified successfully!"}), 200


@api.route('/resend-verification', methods=['POST'])
@limiter.limit("3 per minute")
def resend_verification():
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.is_verified:
        return jsonify({"error": "Email already verified"}), 400

    # Generar nuevo código
    new_code = ''.join(random.choices(string.digits, k=6))
    user.verification_code = new_code
    user.verification_expires_at = datetime.utcnow() + timedelta(minutes=30)
    db.session.commit()

    # Enviar email usando la nueva utilidad
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    verify_link = f"{frontend_url}/verify-email?email={email}&code={new_code}"
    
    success, error_msg = send_splitty_mail(
        subject="Verify your email - Splitty",
        recipient=email,
        template_type='verification',
        context={
            "username": user.username,
            "code": new_code,
            "link": verify_link
        }
    )

    if success:
        return jsonify({"message": "Verification code resent!"}), 200
    else:
        current_app.logger.error(f"Error resending verification mail: {error_msg}")
        return jsonify({"error": "Error sending email"}), 500

    return jsonify({"error": "Email service not configured"}), 503

# --- ENDPOINTS DE GRUPOS ---


@api.route('/groups', methods=['POST'])
@jwt_required()
def create_group():
    data = request.get_json()
    user_id = int(get_jwt_identity())
    name = data.get('name')
    category = data.get('category')

    if not name or not category:
        return jsonify({"error": "Name and category are required"}), 400
    try:
        new_group = Group(
            name=name,
            category=category,
            created_by=user_id
        )

        db.session.add(new_group)
        db.session.flush()

        creator_membership = GroupMember(
            group_id=new_group.id,
            user_id=user_id

        )

        db.session.add(creator_membership)
        db.session.commit()

        return jsonify({
            "message": "Grupo creado con exito",
            "group": new_group.serialize()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error creating group", "details": str(e)}), 500


@api.route('/groups', methods=['GET'])
@jwt_required()
def get_groups():
    user_id = int(get_jwt_identity())
    memberships = GroupMember.query.filter_by(user_id=user_id).all()
    group_ids = [membership.group_id for membership in memberships]
    groups = Group.query.filter(Group.id.in_(
        group_ids)).all() if group_ids else []

    return jsonify({
        "groups": [group.serialize() for group in groups]
    }), 200


@api.route('/groups/<int:group_id>', methods=['GET'])
@jwt_required()
def get_group_by_id(group_id):
    user_id = int(get_jwt_identity())
    membership = GroupMember.query.filter_by(
        group_id=group_id, user_id=user_id).first()
    if not membership:
        return jsonify({"error": "You do not have access to this group"}), 403

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"error": "Group not found"}), 404
    members = GroupMember.query.filter_by(group_id=group_id).all()

    # Build member list with full user info (id, username, email)
    members_with_user_info = []
    for member in members:
        user = User.query.get(member.user_id)
        if user:
            members_with_user_info.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "joined_at": member.joined_at.isoformat()
            })

    return jsonify({
        "group": group.serialize(),
        "members": members_with_user_info
    }), 200


@api.route('/groups/<int:group_id>', methods=['DELETE'])
@jwt_required()
def delete_group(group_id):
    user_id = int(get_jwt_identity())

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"error": "Group not found"}), 404

    # Verificar que el usuario sea el creador del grupo
    if group.created_by != user_id:
        return jsonify({"error": "Only the creator of the group can delete it"}), 403

    try:
        db.session.delete(group)
        db.session.commit()
        return jsonify({"message": "Group deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error deleting group", "details": str(e)}), 500

# --- INVITACIONES (CORREGIDO) ---


@api.route('/groups/<int:group_id>/invite-link', methods=['POST'])
@jwt_required()
def send_invitation(group_id):
    body = request.get_json()
    email_destinatario = body.get("email") if body else None

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    try:
        # 1. Database record creation
        nueva_invitacion = Invitation(
            email=email_destinatario if email_destinatario else "pending@link.com",
            group_id=group_id,
            expires_at=datetime.utcnow() + timedelta(days=7)
        )

        db.session.add(nueva_invitacion)
        db.session.commit()

        token = nueva_invitacion.token
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        url_aceptacion = f"{frontend_url}/accept-invite?token={token}"

        # 2. Secure Email Sending logic using centralized utility
        email_status = "not_sent"
        if email_destinatario:
            success, error_msg = send_splitty_mail(
                subject=f"You've been invited to join {group.name} on Splitty!",
                recipient=email_destinatario,
                template_type='invitation',
                context={
                    "group_name": group.name,
                    "inviter_name": User.query.get(get_jwt_identity()).username,
                    "link": url_aceptacion
                }
            )
            if success:
                email_status = "sent"
            else:
                email_status = f"failed: {error_msg}"

        return jsonify({
            "msg": "Invitation created successfully",
            "link": url_aceptacion,
            "token": token,
            "email_status": email_status
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in send_invitation: {str(e)}")
        return jsonify({"msg": "Error creating invitation", "error": str(e)}), 500


@api.route('/groups/accept-invite', methods=['POST'])
@jwt_required()
def accept_group_invite():
    """
    Accepts a group invitation using a token.
    If valid, adds the current user to the group.
    """
    body = request.get_json()
    token = body.get("token")
    user_id = int(get_jwt_identity())

    if not token:
        return jsonify({"error": "Token is required"}), 400

    invitation = Invitation.query.filter_by(token=token).first()
    if not invitation:
        return jsonify({"error": "Invalid invitation token"}), 404

    if invitation.is_used:
        return jsonify({"error": "This invitation has already been used"}), 400

    if invitation.expires_at and invitation.expires_at < datetime.utcnow():
        return jsonify({"error": "This invitation has expired"}), 400

    # Check if user is already a member
    existing_membership = GroupMember.query.filter_by(
        group_id=invitation.group_id, user_id=user_id
    ).first()

    if existing_membership:
        # Mark as used anyway if they are already in the group
        invitation.is_used = True
        db.session.commit()
        return jsonify({"message": "You are already a member of this group"}), 200

    try:
        # Add user to group
        new_member = GroupMember(
            group_id=invitation.group_id,
            user_id=user_id
        )
        db.session.add(new_member)

        # Mark invitation as used
        invitation.is_used = True

        db.session.commit()
        return jsonify({"message": "Successfully joined the group!", "group_id": invitation.group_id}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error accepting invitation: {str(e)}")
        return jsonify({"error": "Failed to join group"}), 500

# --- GASTOS ---


@api.route('/groups/<int:group_id>/expenses', methods=['POST'])
@jwt_required()
def create_expense(group_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    description = data.get('description')
    amount = data.get('amount')
    currency = data.get('currency', '$')
    paid_by = data.get('paid_by')
    participants = data.get('participants', [])

    if not description or amount is None or not paid_by:
        return jsonify({
            "error": "description, amount, and paid_by are required"
        }), 400

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"error": "Group not found"}), 404

    # Validate that the logged-in user belongs to the group
    current_membership = GroupMember.query.filter_by(
        group_id=group_id, user_id=user_id).first()
    if not current_membership:
        return jsonify({"error": "You do not have access to this group"}), 403

    # Ensure the payer belongs to the group, if not, add them (auto-invite)
    payer_membership = GroupMember.query.filter_by(
        group_id=group_id, user_id=paid_by).first()
    if not payer_membership:
        new_member = GroupMember(group_id=group_id, user_id=paid_by)
        db.session.add(new_member)
        # We don't commit yet, we'll commit with the expense

    try:
        amount_decimal = Decimal(str(amount))
        if amount_decimal <= 0:
            return jsonify({"error": "Amount must be greater than 0"}), 400
    except (InvalidOperation, ValueError):
        return jsonify({"error": "Invalid amount"}), 400

    # Participants can be objects {user_id, amount_owed} or plain IDs (backward compat)
    # Normalize to list of dicts
    normalized_participants = []
    if not participants:
        # Default: assign evenly to the payer only
        normalized_participants = [
            {"user_id": paid_by, "amount_owed": float(amount_decimal)}]
    elif isinstance(participants[0], dict):
        # Frontend sends [{user_id, amount_owed}]
        normalized_participants = participants
    else:
        # Legacy: plain list of user IDs — split evenly
        split_amount = float(amount_decimal) / len(participants)
        normalized_participants = [
            {"user_id": pid, "amount_owed": split_amount} for pid in participants]

    # Ensure all participants belong to the group (auto-invite them if they are friends)
    for p in normalized_participants:
        p_id = p["user_id"] if isinstance(p, dict) else p
        participant_membership = GroupMember.query.filter_by(
            group_id=group_id,
            user_id=p_id
        ).first()

        if not participant_membership:
            # Auto-join them to the group
            new_member = GroupMember(group_id=group_id, user_id=p_id)
            db.session.add(new_member)

    try:
        new_expense = Expense(
            description=description,
            amount=amount_decimal,
            currency=currency,
            group_id=group_id,
            paid_by=paid_by
        )
        db.session.add(new_expense)
        db.session.flush()

        # Create expense participants with amount_owed
        created_participants = []
        for p in normalized_participants:
            p_user_id = p["user_id"]
            p_amount = Decimal(str(p.get("amount_owed", 0)))
            expense_participant = ExpenseParticipant(
                expense_id=new_expense.id,
                user_id=p_user_id,
                amount_owed=p_amount
            )
            db.session.add(expense_participant)
            created_participants.append(expense_participant)

        db.session.commit()

        return jsonify({
            "message": "Expense created successfully",
            "expense": new_expense.serialize(),
            "participants": [ep.serialize() for ep in created_participants]
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating expense: {str(e)}")
        return jsonify({"error": "Error creating expense"}), 500


@api.route('/groups/<int:group_id>/expenses', methods=['GET'])
@jwt_required()
def get_group_expenses(group_id):
    expenses = Expense.query.filter_by(group_id=group_id).all()

    response = []
    for expense in expenses:
        participants = ExpenseParticipant.query.filter_by(
            expense_id=expense.id).all()

        response.append({
            "expense": expense.serialize(),
            "participants": [participant.serialize() for participant in participants]
        })

    return jsonify({
        "group_id": group_id,
        "expenses": response
    }), 200


# --- BALANCES (Debt Simplification) ---

@api.route('/groups/<int:group_id>/balances', methods=['GET'])
@jwt_required()
def get_group_balances(group_id):
    """
    Calculate net balances for all members of a group, then run the
    greedy debt-simplification algorithm to return the minimum set of
    peer-to-peer transfers needed to settle all debts.

    Response JSON:
    {
      "group_id": int,
      "balances": { user_id: float },      # raw net balances
      "transactions": [                     # simplified transfers
        {"from": user_id, "to": user_id, "amount": float}
      ],
      "members": [                          # enriched member info
        {"id": int, "username": str, "balance": float}
      ]
    }
    """
    user_id = int(get_jwt_identity())

    # Validate membership
    membership = GroupMember.query.filter_by(
        group_id=group_id, user_id=user_id
    ).first()
    if not membership:
        return jsonify({"error": "You do not have access to this group"}), 403

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"error": "Group not found"}), 404

    # Get all members of the group
    members = GroupMember.query.filter_by(group_id=group_id).all()
    member_ids = [m.user_id for m in members]

    # Initialize balances with Decimal for precision
    net_balances = {mid: Decimal("0") for mid in member_ids}

    # Get all expenses in this group
    expenses = Expense.query.filter_by(group_id=group_id).all()

    for expense in expenses:
        payer_id = expense.paid_by
        participants = ExpenseParticipant.query.filter_by(
            expense_id=expense.id
        ).all()

        for p in participants:
            amount_owed = Decimal(str(p.amount_owed))

            if p.user_id == payer_id:
                # The payer's own share — they paid for it, no net change from this
                # But they ARE credited the full expense amount below
                pass
            else:
                # This participant owes the payer
                net_balances[p.user_id] = net_balances.get(
                    p.user_id, Decimal("0")
                ) - amount_owed
                net_balances[payer_id] = net_balances.get(
                    payer_id, Decimal("0")
                ) + amount_owed

    # Subtract confirmed payments from balances
    payments = Payment.query.filter_by(
        group_id=group_id, status='confirmed').all()
    for p in payments:
        amount = Decimal(str(p.amount))
        # Debtor (payer) paid, so their negative balance improves
        if p.payer_id in net_balances:
            net_balances[p.payer_id] += amount
        # Creditor (receiver) received, so their positive balance reduces
        if p.receiver_id in net_balances:
            net_balances[p.receiver_id] -= amount

    # Run the simplification algorithm
    from api.utils import simplify_debts
    transactions = simplify_debts(net_balances)

    # Build enriched member info
    members_info = []
    for mid in member_ids:
        user = User.query.get(mid)
        if user:
            members_info.append({
                "id": user.id,
                "username": user.username,
                "balance": float(net_balances.get(mid, Decimal("0")))
            })

    return jsonify({
        "group_id": group_id,
        "balances": {str(k): float(v) for k, v in net_balances.items()},
        "transactions": transactions,
        "members": members_info
    }), 200

# Actualizar un gasto


@api.route('/expenses/<int:expense_id>', methods=['PUT'])
@jwt_required()
def update_expense(expense_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()

    expense = Expense.query.get(expense_id)
    if not expense:
        return jsonify({"error": "Expense not found"}), 404

    # Verificar que el usuario es el creador del grupo
    group = Group.query.get(expense.group_id)
    if not group or group.created_by != user_id:
        return jsonify({"error": "Only the group creator can modify expenses."}), 403

    description = data.get('description')
    amount = data.get('amount')
    currency = data.get('currency', '$')
    paid_by = data.get('paid_by')
    participants = data.get('participants', [])

    if description:
        expense.description = description
    if amount is not None:
        try:
            expense.amount = Decimal(str(amount))
        except:
            return jsonify({"error": "Invalid amount"}), 400
    if currency:
        expense.currency = currency
    if paid_by:
        payer_membership = GroupMember.query.filter_by(
            group_id=expense.group_id, user_id=paid_by).first()
        if not payer_membership:
            new_member = GroupMember(
                group_id=expense.group_id, user_id=paid_by)
            db.session.add(new_member)
        expense.paid_by = paid_by

    try:
        if participants:
            # Eliminar participantes anteriores
            ExpenseParticipant.query.filter_by(expense_id=expense.id).delete()

            # Crear nuevos participantes
            for p in participants:
                p_user_id = p["user_id"]
                p_amount = Decimal(str(p.get("amount_owed", 0)))

                # Validar que el participante pertenece al grupo (auto-unir si falta)
                p_membership = GroupMember.query.filter_by(
                    group_id=expense.group_id, user_id=p_user_id).first()
                if not p_membership:
                    new_member = GroupMember(
                        group_id=expense.group_id, user_id=p_user_id)
                    db.session.add(new_member)

                new_participant = ExpenseParticipant(
                    expense_id=expense.id,
                    user_id=p_user_id,
                    amount_owed=p_amount
                )
                db.session.add(new_participant)

        db.session.commit()
        return jsonify({"message": "Expense updated successfully", "expense": expense.serialize()}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating expense: {str(e)}")
        return jsonify({"error": "Error updating expense"}), 500

# Eliminar un gasto


@api.route('/expenses/<int:expense_id>', methods=['DELETE'])
@jwt_required()
def delete_expense(expense_id):
    user_id = int(get_jwt_identity())

    expense = Expense.query.get(expense_id)
    if not expense:
        return jsonify({"error": "Expense not found"}), 404

    # Verificar que el usuario es el creador del grupo
    group = Group.query.get(expense.group_id)
    if not group or group.created_by != user_id:
        return jsonify({"error": "Only the group creator can delete expenses."}), 403

    # Business Logic Fix: Prevent deleting if there are confirmed payments from participants to the payer
    # Since payments are group-wide, deleting an expense that has already been paid for 
    # will cause the payer to owe the participant (reverse debt).
    participants = ExpenseParticipant.query.filter_by(expense_id=expense.id).all()
    participant_ids = [p.user_id for p in participants if p.user_id != expense.paid_by]

    for pid in participant_ids:
        payment = Payment.query.filter_by(
            group_id=expense.group_id,
            payer_id=pid,
            receiver_id=expense.paid_by,
            status='confirmed'
        ).first()
        if payment:
            return jsonify({
                "error": "Cannot delete this expense because one or more participants have already made confirmed payments to the payer. Please cancel or delete the payments first to avoid negative balances."
            }), 400

    try:
        # Los participantes se eliminan en cascada si está configurado, o manualmente
        ExpenseParticipant.query.filter_by(expense_id=expense.id).delete()
        db.session.delete(expense)
        db.session.commit()
        return jsonify({"message": "Expense deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting expense: {str(e)}")
        return jsonify({"error": "Error deleting expense"}), 500


@api.route('/expenses/<int:expense_id>/settle', methods=['POST'])
@jwt_required()
def toggle_expense_settlement(expense_id):
    user_id = int(get_jwt_identity())
    expense = Expense.query.get(expense_id)
    if not expense:
        return jsonify({"error": "Expense not found"}), 404

    # Permission: Only group creator or payer can settle
    group = Group.query.get(expense.group_id)
    if not group:
        return jsonify({"error": "Group not found"}), 404

    if user_id != group.created_by and user_id != expense.paid_by:
        return jsonify({"error": "Only the group creator or the payer can change the settlement status."}), 403

    expense.is_settled = not expense.is_settled

    try:
        db.session.commit()
        return jsonify({
            "message": f"Expense mark as {'settled' if expense.is_settled else 'unsettled'}",
            "is_settled": expense.is_settled,
            "expense": expense.serialize()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# ===============================
# RECEIPTS (OCR ANALYZE)
# ===============================


@api.route('/receipt/analyze', methods=['POST'])
@jwt_required()
def analyze_receipt():
    """
    Recibe una imagen, la sube a Cloudinary y la procesa con Azure OCR.
    Devuelve los ítems prorrateados para que el frontend pueda pintar la UI interactiva.
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    isValid, msg = validate_file_type(file)
    if not isValid:
        return jsonify({"error": msg}), 400

    try:
        # 1. Subir a Cloudinary con resource_type="auto" para soportar PDFs
        upload_result = cloudinary.uploader.upload(file, resource_type="auto")
        secure_url = upload_result['secure_url']

        # 2. Procesar con IA (priorizando Gemini, luego Azure)
        from api.ocr_service import analyze_receipt_with_ai

        analysis = analyze_receipt_with_ai(secure_url)
        analysis['receipt_url'] = secure_url

        return jsonify({
            "message": "Receipt analyzed successfully",
            "data": analysis
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error Analyzing Receipt: {str(e)}")
        return jsonify({"error": "Error analyzing receipt"}), 500


# ===============================
# RECEIPTS (SUBIR / ELIMINAR DEFAULT)
# ===============================

@api.route('/expense/<int:expense_id>/receipt', methods=['POST'])
@jwt_required()
def upload_receipt(expense_id):
    user_id = int(get_jwt_identity())

    expense = Expense.query.get(expense_id)
    if not expense:
        return jsonify({"error": "Expense not found"}), 404

    membership = GroupMember.query.filter_by(
        group_id=expense.group_id,
        user_id=user_id
    ).first()

    if not membership:
        return jsonify({"error": "You do not have access to this expense"}), 403

    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    isValid, msg = validate_file_type(file)
    if not isValid:
        return jsonify({"error": msg}), 400

    try:
        # Subir a Cloudinary con resource_type="auto" para soportar PDFs
        upload_result = cloudinary.uploader.upload(file, resource_type="auto")

        expense.receipt_url = upload_result['secure_url']
        db.session.commit()

        return jsonify({
            "message": "Receipt uploaded successfully",
            "receipt_url": expense.receipt_url
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error uploading receipt: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


@api.route('/expense/<int:expense_id>/receipt', methods=['DELETE'])
@jwt_required()
def delete_receipt(expense_id):
    user_id = int(get_jwt_identity())

    expense = Expense.query.get(expense_id)
    if not expense:
        return jsonify({"error": "Expense not found"}), 404

    membership = GroupMember.query.filter_by(
        group_id=expense.group_id,
        user_id=user_id
    ).first()

    if not membership:
        return jsonify({"error": "You do not have access to this expense"}), 403

    if not expense.receipt_url:
        return jsonify({"error": "No receipt to delete"}), 400

    expense.receipt_url = None
    db.session.commit()

    return jsonify({"message": "Receipt removed"}), 200


# ===============================
# FRIENDS SYSTEM
# ===============================

@api.route('/friends', methods=['GET'])
@jwt_required()
def get_friends():
    """List all accepted friends for the current user."""
    user_id = int(get_jwt_identity())

    from api.utils import get_accepted_friends
    friendships = get_accepted_friends(user_id)

    friends = []
    for f in friendships:
        friend_user = f.addressee if f.requester_id == user_id else f.requester
        friends.append({
            "friendship_id": f.id,
            "friend": friend_user.serialize(),
            "since": f.updated_at.isoformat()
        })

    return jsonify({"friends": friends}), 200


@api.route('/friends/request', methods=['POST'])
@jwt_required()
def send_friend_request():
    """Send a friend request by user_id or email."""
    user_id = int(get_jwt_identity())
    data = request.get_json()

    target_user_id = data.get("user_id")
    target_email = data.get("email")

    if not target_user_id and not target_email:
        return jsonify({"error": "user_id or email is required"}), 400

    # Resolve target user
    target_user = None
    if target_user_id:
        target_user = User.query.get(target_user_id)
    elif target_email:
        target_user = User.query.filter_by(email=target_email).first()

    if not target_user:
        return jsonify({"error": "User not found"}), 404

    if target_user.id == user_id:
        return jsonify({"error": "You cannot send a friend request to yourself"}), 400

    # Check for existing friendship in either direction
    from sqlalchemy import or_, and_
    existing = Friendship.query.filter(
        or_(
            and_(Friendship.requester_id == user_id,
                 Friendship.addressee_id == target_user.id),
            and_(Friendship.requester_id == target_user.id,
                 Friendship.addressee_id == user_id)
        )
    ).first()

    if existing:
        if existing.status == "accepted":
            return jsonify({"error": "You are already friends"}), 409
        elif existing.status == "pending":
            return jsonify({"error": "A friend request already exists"}), 409
        elif existing.status == "declined":
            # Allow re-requesting after decline
            existing.status = "pending"
            existing.requester_id = user_id
            existing.addressee_id = target_user.id
            db.session.commit()
            return jsonify({
                "message": "Friend request sent",
                "friendship": existing.serialize()
            }), 201

    try:
        friendship = Friendship(
            requester_id=user_id,
            addressee_id=target_user.id,
            status="pending"
        )
        db.session.add(friendship)
        db.session.commit()

        return jsonify({
            "message": "Friend request sent",
            "friendship": friendship.serialize()
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error sending friend request: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


@api.route('/friends/accept/<int:friendship_id>', methods=['POST'])
@jwt_required()
def accept_friend_request(friendship_id):
    """Accept a pending friend request. Only the addressee can accept."""
    user_id = int(get_jwt_identity())

    friendship = Friendship.query.get(friendship_id)
    if not friendship:
        return jsonify({"error": "Friend request not found"}), 404

    if friendship.addressee_id != user_id:
        return jsonify({"error": "Only the recipient can accept this request"}), 403

    if friendship.status != "pending":
        return jsonify({"error": f"Request is already {friendship.status}"}), 400

    friendship.status = "accepted"
    db.session.commit()

    return jsonify({
        "message": "Friend request accepted",
        "friendship": friendship.serialize()
    }), 200


@api.route('/friends/decline/<int:friendship_id>', methods=['POST'])
@jwt_required()
def decline_friend_request(friendship_id):
    """Decline a pending friend request. Only the addressee can decline."""
    user_id = int(get_jwt_identity())

    friendship = Friendship.query.get(friendship_id)
    if not friendship:
        return jsonify({"error": "Friend request not found"}), 404

    if friendship.addressee_id != user_id:
        return jsonify({"error": "Only the recipient can decline this request"}), 403

    if friendship.status != "pending":
        return jsonify({"error": f"Request is already {friendship.status}"}), 400

    friendship.status = "declined"
    db.session.commit()

    return jsonify({
        "message": "Friend request declined",
        "friendship": friendship.serialize()
    }), 200


@api.route('/friends/<int:friendship_id>', methods=['DELETE'])
@jwt_required()
def remove_friend(friendship_id):
    """Remove a friend. Either party can remove."""
    user_id = int(get_jwt_identity())

    friendship = Friendship.query.get(friendship_id)
    if not friendship:
        return jsonify({"error": "Friendship not found"}), 404

    if friendship.requester_id != user_id and friendship.addressee_id != user_id:
        return jsonify({"error": "You are not part of this friendship"}), 403

    db.session.delete(friendship)
    db.session.commit()

    return jsonify({"message": "Friend removed successfully"}), 200


@api.route('/friends/pending', methods=['GET'])
@jwt_required()
def get_pending_requests():
    """Get pending friend requests (both sent and received)."""
    user_id = int(get_jwt_identity())

    received = Friendship.query.filter_by(
        addressee_id=user_id, status="pending"
    ).all()

    sent = Friendship.query.filter_by(
        requester_id=user_id, status="pending"
    ).all()

    return jsonify({
        "received": [
            {
                "id": f.id,
                "requester": f.requester.serialize(),
                "created_at": f.created_at.isoformat()
            }
            for f in received
        ],
        "sent": [
            {
                "id": f.id,
                "addressee": f.addressee.serialize(),
                "created_at": f.created_at.isoformat()
            }
            for f in sent
        ]
    }), 200


@api.route('/friends/debts', methods=['GET'])
@jwt_required()
def get_friend_debts():
    """Get consolidated debts with all friends."""
    user_id = int(get_jwt_identity())

    from api.utils import get_accepted_friends, calculate_friend_debts
    friendships = get_accepted_friends(user_id)

    total_owed_to_you = 0.0
    total_you_owe = 0.0
    debts_by_friend = []

    for f in friendships:
        friend_id = f.addressee_id if f.requester_id == user_id else f.requester_id
        friend_user = f.addressee if f.requester_id == user_id else f.requester

        debt_data = calculate_friend_debts(user_id, friend_id)
        net_bal = debt_data["net_balance"]

        # Standard logic: if net > 0, they owe you. If net < 0, you owe them.
        if net_bal > 0:
            total_owed_to_you += net_bal
        elif net_bal < 0:
            total_you_owe += abs(net_bal)

        debts_by_friend.append({
            "friend": friend_user.serialize(),
            "friendship_id": f.id,
            "net_balance": net_bal,
            "groups": debt_data["groups"],
            "total_owed_to_you": debt_data["total_owed_to_user"],
            "total_you_owe": debt_data["total_user_owes"]
        })

    net_balance = round(total_owed_to_you - total_you_owe, 2)

    return jsonify({
        "total_owed_to_you": round(total_owed_to_you, 2),
        "total_you_owe": round(total_you_owe, 2),
        "net_balance": net_balance,
        "debts_by_friend": debts_by_friend
    }), 200


# --- FRIEND INVITATIONS ---

@api.route('/friends/invite-link', methods=['POST'])
@jwt_required()
def generate_friend_invite():
    """Generate a friend invitation link, optionally send email."""
    user_id = int(get_jwt_identity())
    body = request.get_json() or {}
    email_destinatario = body.get("email")

    try:
        nueva_invitacion = FriendInvitation(
            inviter_id=user_id,
            email=email_destinatario if email_destinatario else "pending@link.com",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        db.session.add(nueva_invitacion)
        db.session.commit()

        token = nueva_invitacion.token
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        url_aceptacion = f"{frontend_url}/accept-friend?token={token}"

        # Send email if provided using centralized utility
        if email_destinatario:
            inviter = User.query.get(user_id)
            inviter_name = inviter.username if inviter else "Someone"

            send_splitty_mail(
                subject=f"¡{inviter_name} wants to be your friend on Splitty!",
                recipient=email_destinatario,
                template_type='friend_request',
                context={
                    "inviter_name": inviter_name,
                    "link": url_aceptacion
                }
            )

        return jsonify({
            "msg": "Friend invitation created",
            "link": url_aceptacion,
            "token": token
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in friends operation: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


@api.route('/friends/accept-invite', methods=['POST'])
@jwt_required()
def accept_friend_invite():
    """Accept a friend invitation by token."""
    user_id = int(get_jwt_identity())
    body = request.get_json()
    token = body.get("token")

    if not token:
        return jsonify({"error": "Token is required"}), 400

    invitation = FriendInvitation.query.filter_by(token=token).first()
    if not invitation:
        return jsonify({"error": "Invalid invitation"}), 404

    if invitation.expires_at and invitation.expires_at < datetime.utcnow():
        return jsonify({"error": "Invitation has expired"}), 410

    if invitation.is_used:
        return jsonify({"error": "This invitation has already been used"}), 400

    inviter_id = invitation.inviter_id

    if inviter_id == user_id:
        return jsonify({"error": "You cannot accept your own invitation"}), 400

    # Check if already friends
    from sqlalchemy import or_, and_
    existing = Friendship.query.filter(
        or_(
            and_(Friendship.requester_id == user_id,
                 Friendship.addressee_id == inviter_id),
            and_(Friendship.requester_id == inviter_id,
                 Friendship.addressee_id == user_id)
        )
    ).first()

    if existing and existing.status == "accepted":
        invitation.is_used = True
        db.session.commit()
        return jsonify({"message": "You are already friends"}), 200

    try:
        if existing:
            existing.status = "accepted"
        else:
            friendship = Friendship(
                requester_id=inviter_id,
                addressee_id=user_id,
                status="accepted"
            )
            db.session.add(friendship)

        invitation.is_used = True
        db.session.commit()

        return jsonify({
            "message": "You are now friends!",
            "friend": User.query.get(inviter_id).serialize()
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in friends operation: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


@api.route('/test-mail', methods=['GET'])
@jwt_required()
def test_mail():
    """
    Endpoint de diagnóstico para probar el envío de correos.
    Envía un correo de prueba al usuario autenticado.
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    print(f"[TEST-MAIL] Triggered by user: {user.email}")
    
    success, error_msg = send_splitty_mail(
        subject="Splitty Test Mail",
        recipient=user.email,
        template_type='verification', # Usamos el de verificación para probar el branding
        context={
            "username": user.username,
            "code": "123456",
            "link": f"{frontend_url}/verify-email?email={user.email}&code=123456"
        }
    )
    
    if success:
        return jsonify({
            "message": "Test email sent successfully!",
            "recipient": user.email
        }), 200
    else:
        return jsonify({
            "error": "Failed to send test email",
            "details": error_msg
        }), 500


# --- USER SEARCH ---

@api.route('/users/search', methods=['GET'])
@jwt_required()
def search_users():
    """Search users by username or email. Excludes current user."""
    user_id = int(get_jwt_identity())
    query = request.args.get("q", "").strip()

    if not query or len(query) < 2 or len(query) > 100:
        return jsonify({"error": "Search query must be between 2 and 100 characters"}), 400

    from sqlalchemy import or_
    results = User.query.filter(
        User.id != user_id,
        or_(
            User.username.ilike(f"%{query}%"),
            User.email.ilike(f"%{query}%")
        )
    ).limit(10).all()

    return jsonify({
        "users": [u.serialize() for u in results]
    }), 200


# ===============================
# PAYMENTS SYSTEM (Mark Debt as Paid)
# ===============================

def send_payment_email_notification(payment, notification_type):
    """
    Envía notificación por email sobre pagos.
    notification_type: 'payment_created' | 'payment_confirmed'
    """
    try:
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

        if notification_type == 'payment_created':
            # Notificar al receptor que alguien marcó un pago
            msg = Message(
                subject=f"¡{payment.payer.username} te ha enviado un pago en Splitty!",
                recipients=[payment.receiver.email],
                sender=current_app.config.get('MAIL_USERNAME')
            )

            msg.html = f"""
            <div style="background-color: #121212; padding: 40px; font-family: 'Segoe UI', Arial, sans-serif; color: #ffffff; text-align: center;">
                <div style="max-width: 500px; margin: auto; background-color: #1e1e1e; padding: 40px; border-radius: 24px; border: 1px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    <h1 style="color: #FF914D; margin-bottom: 10px; font-size: 32px; font-weight: bold;">Splitty</h1>
                    <div style="width: 60px; height: 3px; background: linear-gradient(90deg, #FF914D, #FF6B00); margin: 0 auto 30px auto; border-radius: 10px;"></div>
                    <p style="font-size: 18px; line-height: 1.6; color: #a19b95; margin-bottom: 10px;">
                        ¡Hola <strong style="color: #ffffff;">{payment.receiver.username}</strong>!
                    </p>
                    <p style="font-size: 16px; line-height: 1.6; color: #a19b95; margin-bottom: 20px;">
                        <strong style="color: #4ade80;">{payment.payer.username}</strong> ha registrado un pago de <strong style="color: #4ade80;">${float(payment.amount):.2f}</strong> en el grupo <strong style="color: #ffffff;">{payment.group.name}</strong>.
                    </p>
                    <p style="font-size: 14px; color: #888; margin-bottom: 30px;">
                        El pago está pendiente de tu confirmación. Ingresa a Splitty para confirmarlo.
                    </p>
                    <div style="margin: 30px 0;">
                        <a href="{frontend_url}/debts" style="background: linear-gradient(90deg, #FF914D, #FF6B00); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(255, 145, 77, 0.3);">
                            Ver Pagos Pendientes
                        </a>
                    </div>
                    <div style="margin-top: 20px; border-top: 1px solid #333; padding-top: 20px; font-size: 11px; color: #444;">
                        © 2026 Splitty App. Todos los derechos reservados.
                    </div>
                </div>
            </div>
            """
            current_app.extensions['mail'].send(msg)

        elif notification_type == 'payment_confirmed':
            # Notificar al pagador que su pago fue confirmado
            msg = Message(
                subject=f"¡Tu pago en Splitty ha sido confirmado!",
                recipients=[payment.payer.email],
                sender=current_app.config.get('MAIL_USERNAME')
            )

            msg.html = f"""
            <div style="background-color: #121212; padding: 40px; font-family: 'Segoe UI', Arial, sans-serif; color: #ffffff; text-align: center;">
                <div style="max-width: 500px; margin: auto; background-color: #1e1e1e; padding: 40px; border-radius: 24px; border: 1px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    <h1 style="color: #FF914D; margin-bottom: 10px; font-size: 32px; font-weight: bold;">Splitty</h1>
                    <div style="width: 60px; height: 3px; background: linear-gradient(90deg, #FF914D, #FF6B00); margin: 0 auto 30px auto; border-radius: 10px;"></div>
                    <p style="font-size: 18px; line-height: 1.6; color: #a19b95; margin-bottom: 10px;">
                        ¡Hola <strong style="color: #ffffff;">{payment.payer.username}</strong>!
                    </p>
                    <p style="font-size: 16px; line-height: 1.6; color: #a19b95; margin-bottom: 20px;">
                        Tu pago de <strong style="color: #4ade80;">${float(payment.amount):.2f}</strong> a <strong style="color: #ffffff;">{payment.receiver.username}</strong> ha sido confirmado.
                    </p>
                    <p style="font-size: 14px; color: #888; margin-bottom: 30px;">
                        ¡Tu deuda ha sido actualizada!
                    </p>
                    <div style="margin: 30px 0;">
                        <a href="{frontend_url}/debts" style="background: linear-gradient(90deg, #FF914D, #FF6B00); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(255, 145, 77, 0.3);">
                            Ver Mis Deudas
                        </a>
                    </div>
                    <div style="margin-top: 20px; border-top: 1px solid #333; padding-top: 20px; font-size: 11px; color: #444;">
                        © 2026 Splitty App. Todos los derechos reservados.
                    </div>
                </div>
            </div>
            """
            current_app.extensions['mail'].send(msg)

    except Exception as e:
        current_app.logger.error(f"Error sending payment email: {str(e)}")


@api.route('/groups/<int:group_id>/payments', methods=['POST'])
@jwt_required()
def create_payment(group_id):
    """
    Crea un nuevo pago (transferencia) en el grupo.
    El pago se crea con estado 'pending' y debe ser confirmado por el receptor.
    """
    user_id = int(get_jwt_identity())

    # Soporte para JSON o multipart/form-data
    if request.is_json:
        data = request.get_json()
        receiver_id = data.get('receiver_id')
        amount = data.get('amount')
        payment_method = data.get('payment_method', 'manual')
    else:
        receiver_id = request.form.get('receiver_id')
        amount = request.form.get('amount')
        payment_method = request.form.get('payment_method', 'manual')

    if not receiver_id or amount is None:
        return jsonify({"error": "receiver_id and amount are required"}), 400

    # Validar que el monto sea positivo
    try:
        amount_decimal = Decimal(str(amount))
        if amount_decimal <= 0:
            return jsonify({"error": "Amount must be greater than 0"}), 400
    except (InvalidOperation, ValueError):
        return jsonify({"error": "Invalid amount"}), 400

    # Validar que el grupo existe
    group = Group.query.get(group_id)
    if not group:
        return jsonify({"error": "Group not found"}), 404

    # Validar que el usuario pertenece al grupo
    user_membership = GroupMember.query.filter_by(
        group_id=group_id, user_id=user_id).first()
    if not user_membership:
        return jsonify({"error": "You do not have access to this group"}), 403

    # Validar que el receptor existe y pertenece al grupo
    receiver_membership = GroupMember.query.filter_by(
        group_id=group_id, user_id=receiver_id).first()
    if not receiver_membership:
        return jsonify({"error": "Receiver is not a member of this group"}), 400

    # No puedes pagarte a ti mismo
    if int(receiver_id) == user_id:
        return jsonify({"error": "You cannot pay yourself"}), 400

    try:
        new_payment = Payment(
            payer_id=user_id,
            receiver_id=receiver_id,
            group_id=group_id,
            amount=amount_decimal,
            status='pending',
            payment_method=payment_method
        )

        # Manejo de comprobante (receipt)
        file = request.files.get('receipt')
        if file and file.filename != '':
            try:
                import cloudinary.uploader
                upload_result = cloudinary.uploader.upload(
                    file, resource_type="auto")
                new_payment.receipt_url = upload_result.get('secure_url')
            except Exception as e:
                current_app.logger.error(
                    f"Error uploading payment receipt: {str(e)}")
                # Opcional: retornar error o continuar sin recibo
                return jsonify({"error": "Failed to upload receipt image"}), 500

        db.session.add(new_payment)
        db.session.flush()  # Para obtener el ID

        # Cargar relaciones para el email
        new_payment.payer = User.query.get(user_id)
        new_payment.receiver = User.query.get(receiver_id)
        new_payment.group = group

        db.session.commit()

        # Enviar notificación por email al receptor
        send_payment_email_notification(new_payment, 'payment_created')

        return jsonify({
            "message": "Payment created successfully",
            "payment": new_payment.serialize()
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating payment: {str(e)}")
        return jsonify({"error": "Error creating payment"}), 500


@api.route('/groups/<int:group_id>/payments', methods=['GET'])
@jwt_required()
def get_group_payments(group_id):
    """
    Obtiene todos los pagos de un grupo.
    """
    user_id = int(get_jwt_identity())

    # Validar membresía
    membership = GroupMember.query.filter_by(
        group_id=group_id, user_id=user_id).first()
    if not membership:
        return jsonify({"error": "You do not have access to this group"}), 403

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"error": "Group not found"}), 404

    # Obtener todos los pagos del grupo
    payments = Payment.query.filter_by(group_id=group_id).order_by(
        Payment.created_at.desc()).all()

    return jsonify({
        "group_id": group_id,
        "payments": [p.serialize() for p in payments]
    }), 200


@api.route('/payments/<int:payment_id>/confirm', methods=['PUT'])
@jwt_required()
def confirm_payment(payment_id):
    """
    Confirma un pago pendiente.
    Solo el receptor puede confirmar el pago.
    """
    user_id = int(get_jwt_identity())

    payment = Payment.query.get(payment_id)
    if not payment:
        return jsonify({"error": "Payment not found"}), 404

    # Solo el receptor puede confirmar
    if payment.receiver_id != user_id:
        return jsonify({"error": "Only the receiver can confirm this payment"}), 403

    if payment.status != 'pending':
        return jsonify({"error": f"Payment is already {payment.status}"}), 400

    try:
        payment.status = 'confirmed'
        payment.confirmed_at = datetime.utcnow()

        # Cargar relaciones para el email
        payment.payer = User.query.get(payment.payer_id)
        payment.receiver = User.query.get(payment.receiver_id)
        payment.group = Group.query.get(payment.group_id)

        db.session.commit()

        # Enviar notificación al pagador
        send_payment_email_notification(payment, 'payment_confirmed')

        return jsonify({
            "message": "Payment confirmed successfully",
            "payment": payment.serialize()
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error confirming payment: {str(e)}")
        return jsonify({"error": "Error confirming payment"}), 500


@api.route('/users/<int:user_id>/pending-payments', methods=['GET'])
@jwt_required()
def get_pending_payments(user_id):
    """
    Obtiene los pagos pendientes de confirmación para un usuario.
    Incluye:
    - Pagos donde el usuario es receptor (debe confirmar)
    - Pagos donde el usuario es pagador (esperando confirmación)
    """
    current_user_id = int(get_jwt_identity())

    # Solo el mismo usuario puede ver sus pagos pendientes
    if current_user_id != user_id:
        return jsonify({"error": "You can only view your own pending payments"}), 403

    # Pagos pendientes donde el usuario es receptor (debe confirmar)
    received_pending = Payment.query.filter_by(
        receiver_id=user_id,
        status='pending'
    ).order_by(Payment.created_at.desc()).all()

    # Pagos pendientes donde el usuario es pagador (esperando confirmación)
    sent_pending = Payment.query.filter_by(
        payer_id=user_id,
        status='pending'
    ).order_by(Payment.created_at.desc()).all()

    return jsonify({
        "received": [p.serialize() for p in received_pending],
        "sent": [p.serialize() for p in sent_pending]
    }), 200


@api.route('/payments/<int:payment_id>', methods=['DELETE'])
@jwt_required()
def cancel_payment(payment_id):
    """
    Cancela un pago pendiente.
    Solo el pagador puede cancelar su propio pago pendiente.
    """
    user_id = int(get_jwt_identity())

    payment = Payment.query.get(payment_id)
    if not payment:
        return jsonify({"error": "Payment not found"}), 404

    # Solo el pagador o el receptor pueden cancelar/rechazar
    if payment.payer_id != user_id and payment.receiver_id != user_id:
        return jsonify({"error": "Only the payer or receiver can cancel this payment"}), 403

    if payment.status != 'pending':
        return jsonify({"error": f"Cannot cancel a payment that is {payment.status}"}), 400

    try:
        db.session.delete(payment)
        db.session.commit()

        return jsonify({"message": "Payment cancelled successfully"}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error cancelling payment: {str(e)}")
        return jsonify({"error": "Error cancelling payment"}), 500
