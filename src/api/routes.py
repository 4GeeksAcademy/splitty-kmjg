import os
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
    FriendInvitation
)
from flask_mail import Message
import cloudinary.uploader
from api.utils import generate_sitemap, APIException, validate_file_type
from flask_cors import CORS
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from flask_bcrypt import Bcrypt
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from datetime import timedelta

bcrypt = Bcrypt()
api = Blueprint('api', __name__)

# Configure Limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
)

# Permite peticiones CORS específicamente para el prefijo /api/
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
CORS(api, resources={r"/api/*": {"origins": [frontend_url, "http://localhost:3000"]}})


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

    email_exist = User.query.filter_by(email=email).first()
    if email_exist:
        return jsonify({"error": "Email already registered"}), 409

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    new_user = User(
        username=username,
        email=email,
        password=hashed_password,
        is_active=True,
    )



    try:

        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "Usuario creado con exito"}), 201
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
        return jsonify({"error": "Incorrect email or password"}), 401

    acces_token = create_access_token(
        identity=str(user.id),
        expires_delta=timedelta(hours=24)
    )
    return jsonify({
        "message": "Login correcto",
        "access_token": acces_token,
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
    # Si body es None o no tiene "email", email_destinatario será None
    email_destinatario = body.get("email") if body else None
    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404
    try:

        # 1. Siempre creamos la invitación en la base de datos para tener un token

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

        # 2. SOLO si el usuario escribió un email, intentamos enviar el correo

        if email_destinatario:
            msg = Message(
                subject=f"¡Te han invitado al grupo {group.name} en Splitty!",
                recipients=[email_destinatario],
                sender=current_app.config.get('MAIL_USERNAME')
            )

            msg.html = f"""
            <div style="background-color: #121212; padding: 40px; font-family: 'Segoe UI', Arial, sans-serif; color: #ffffff; text-align: center;">
                <div style="max-width: 500px; margin: auto; background-color: #1e1e1e; padding: 40px; border-radius: 24px; border: 1px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    <h1 style="color: #FF914D; margin-bottom: 10px; font-size: 32px; font-weight: bold;">Splitty</h1>
                <div style="width: 60px; height: 3px; background: linear-gradient(90deg, #FF914D, #FF6B00); margin: 0 auto 30px auto; border-radius: 10px;"></div>
                    <p style="font-size: 18px; line-height: 1.6; color: #a19b95; margin-bottom: 10px;">
                        ¡Hola! Has sido invitado a unirte al grupo:
                    </p>
                    <p style="color: #ffffff; font-size: 24px; font-weight: 600; margin-bottom: 40px;">{group.name}
                    </p>
                <div style="margin: 40px 0;">
                    <a href="{url_aceptacion}" style="background: linear-gradient(90deg, #FF914D, #FF6B00); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(255, 145, 77, 0.3);">
                        Aceptar Invitación
                    </a>
                </div>
                    <p style="font-size: 13px; color: #555; margin-top: 40px; line-height: 1.4;">
                        Este es un enlace de invitación privado. <br>
                        Si no esperabas este correo, puedes ignorarlo con seguridad.
                    </p>
                <div style="margin-top: 20px; border-top: 1px solid #333; pt-20px; font-size: 11px; color: #444;">
                    © 2026 Splitty App. Todos los derechos reservados.
                </div>
                </div>
            </div>
            """
            current_app.extensions['mail'].send(msg)
        # 3. Siempre respondemos con éxito (201) y el link,
        # así el modal puede mostrar el link naranja aunque no se haya enviado email aún.
        return jsonify({
            "msg": "Invitación procesada con éxito",
            "link": url_aceptacion,
            "token": token
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error processing invitation: {str(e)}")
        return jsonify({"msg": "Error processing invitation"}), 500

# --- ACEPTAR INVITACIÓN ---

@api.route('/groups/accept-invite', methods=['POST'])
@jwt_required()
def accept_group_invitation():
    body = request.get_json()
    token = body.get("token")
    user_id = get_jwt_identity()
    # --1- BUSCAR LA INVITACIÓN POR EL TOKEN ---
    invitation = Invitation.query.filter_by(token=token).first()
    if not invitation:
        return jsonify({"error": "Invitación no válida"}), 404
    
    if invitation.expires_at and invitation.expires_at < datetime.utcnow():
        return jsonify({"error": "La invitación ha expirado"}), 410
    # --2- VERIFICAR SI EL USUARIO YA ES MIEMBRO PARA NO DUPLICAR
    existing_member = GroupMember.query.filter_by(
        group_id=invitation.group.id,
        user_id=user_id
    ).first()
    if existing_member:
        return jsonify({"message": "Ya eres miembro de este grupo"}), 200
    try:
        # --3- AÑADIR EL USUARIO AL GRUPO
        new_member = GroupMember(
            group_id=invitation.group_id,
            user_id=user_id
        )
        db.session.add(new_member)
        db.session.commit()
        return jsonify({"message": "¡Te has unido al grupo con éxito!", "group_id": invitation.group_id}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error joining group: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

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
    current_membership = GroupMember.query.filter_by(group_id=group_id, user_id=user_id).first()
    if not current_membership:
        return jsonify({"error": "You do not have access to this group"}), 403

    # Ensure the payer belongs to the group, if not, add them (auto-invite)
    payer_membership = GroupMember.query.filter_by(group_id=group_id, user_id=paid_by).first()
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
        normalized_participants = [{"user_id": paid_by, "amount_owed": float(amount_decimal)}]
    elif isinstance(participants[0], dict):
        # Frontend sends [{user_id, amount_owed}]
        normalized_participants = participants
    else:
        # Legacy: plain list of user IDs — split evenly
        split_amount = float(amount_decimal) / len(participants)
        normalized_participants = [{"user_id": pid, "amount_owed": split_amount} for pid in participants]

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
        participants = ExpenseParticipant.query.filter_by(expense_id=expense.id).all()

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

    if description: expense.description = description
    if amount is not None: 
        try:
            expense.amount = Decimal(str(amount))
        except:
            return jsonify({"error": "Invalid amount"}), 400
    if currency: expense.currency = currency
    if paid_by:
        payer_membership = GroupMember.query.filter_by(group_id=expense.group_id, user_id=paid_by).first()
        if not payer_membership:
            new_member = GroupMember(group_id=expense.group_id, user_id=paid_by)
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
                p_membership = GroupMember.query.filter_by(group_id=expense.group_id, user_id=p_user_id).first()
                if not p_membership:
                    new_member = GroupMember(group_id=expense.group_id, user_id=p_user_id)
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
            and_(Friendship.requester_id == user_id, Friendship.addressee_id == target_user.id),
            and_(Friendship.requester_id == target_user.id, Friendship.addressee_id == user_id)
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
        
        total_owed_to_you += debt_data["total_owed_to_user"]
        total_you_owe += debt_data["total_user_owes"]
        
        debts_by_friend.append({
            "friend": friend_user.serialize(),
            "friendship_id": f.id,
            "net_balance": debt_data["net_balance"],
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
        
        # Send email if provided
        if email_destinatario:
            inviter = User.query.get(user_id)
            inviter_name = inviter.username if inviter else "Someone"
            
            msg = Message(
                subject=f"¡{inviter_name} quiere ser tu amigo en Splitty!",
                recipients=[email_destinatario],
                sender=current_app.config.get('MAIL_USERNAME')
            )
            
            msg.html = f"""
            <div style="background-color: #121212; padding: 40px; font-family: 'Segoe UI', Arial, sans-serif; color: #ffffff; text-align: center;">
                <div style="max-width: 500px; margin: auto; background-color: #1e1e1e; padding: 40px; border-radius: 24px; border: 1px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    <h1 style="color: #FF914D; margin-bottom: 10px; font-size: 32px; font-weight: bold;">Splitty</h1>
                    <div style="width: 60px; height: 3px; background: linear-gradient(90deg, #FF914D, #FF6B00); margin: 0 auto 30px auto; border-radius: 10px;"></div>
                    <p style="font-size: 18px; line-height: 1.6; color: #a19b95; margin-bottom: 10px;">
                        ¡Hola! <strong style="color: #ffffff;">{inviter_name}</strong> quiere agregarte como amigo:
                    </p>
                    <div style="margin: 40px 0;">
                        <a href="{url_aceptacion}" style="background: linear-gradient(90deg, #FF914D, #FF6B00); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(255, 145, 77, 0.3);">
                            Aceptar Solicitud de Amistad
                        </a>
                    </div>
                    <p style="font-size: 13px; color: #555; margin-top: 40px; line-height: 1.4;">
                        Este es un enlace privado.<br>
                        Si no esperabas este correo, puedes ignorarlo con seguridad.
                    </p>
                    <div style="margin-top: 20px; border-top: 1px solid #333; padding-top: 20px; font-size: 11px; color: #444;">
                        © 2026 Splitty App. Todos los derechos reservados.
                    </div>
                </div>
            </div>
            """
            try:
                current_app.extensions['mail'].send(msg)
            except Exception as mail_err:
                print(f"Warning: Could not send friend invite email: {mail_err}")
        
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
            and_(Friendship.requester_id == user_id, Friendship.addressee_id == inviter_id),
            and_(Friendship.requester_id == inviter_id, Friendship.addressee_id == user_id)
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
