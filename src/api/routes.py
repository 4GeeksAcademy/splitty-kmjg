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
    Invitation
)
from flask_mail import Message
import cloudinary.uploader
from api.utils import generate_sitemap, APIException
from flask_cors import CORS
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from flask_bcrypt import Bcrypt

bcrypt = Bcrypt()
api = Blueprint('api', __name__)

# Permite peticiones CORS específicamente para el prefijo /api/

CORS(api, resources={r"/api/*": {"origins": "*"}})


@api.route('/hello', methods=['POST', 'GET'])
def handle_hello():
    response_body = {
        "message": "Hello! I'm a message from the backend"
    }
    return jsonify(response_body), 200

# --- ENDPOINTS DE USUARIO (Registro, Login, Logout) ---

@api.route('/register', methods=['POST'])
def reg_user():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

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
        return jsonify({"error": "Internal server error", "details": str(e)}), 500
    
@api.route('/login', methods=['POST'])

def login_user():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not bcrypt.check_password_hash(user.password, password):
        return jsonify({"error": "Incorrect email or password"}), 401

    acces_token = create_access_token(identity=str(user.id))
    return jsonify({
        "message": "Login correcto",
        "access_token": acces_token,
        "username": user.username
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
            group_id=group_id

        )

        db.session.add(nueva_invitacion)
        db.session.commit()



        token = nueva_invitacion.token

        # URL de tu frontend

        url_aceptacion = f"https://silver-memory-pj57p55w575xc76g7-3000.app.github.dev/accept-invite?token={token}"

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

    current_app.extensions['mail'].send(msg)
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
        import traceback
        print(traceback.format_exc())
        return jsonify({"msg": "Error processing invitation", "error": str(e)}), 500

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
        return jsonify({"error": "Invitación no válida o expirada"}), 404
    # --2- VERIFICAR SI EL USUARIO YA ES MIEMBRO PARA NO DUPLICAR
    existing_member = GroupMember.query.filter_by(
        group_id=invitation.group.id,
        user_id=user_id
    ).first()
    if existing_member:
        return jsonify({"message": "Ya eres miembro de este grupo"}), 200
    try:
        # --3- AÑADIR EL USUARIO AL GRUPA
        new_member = GroupMember(
            group_id=invitation.group_id,
            user_id=user_id
        )
        db.session.add(new_member)
        db.session.commit()
        return jsonify({"message": "¡Te has unido al grupo con éxito!", "group_id": invitation.group_id}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

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

    # Validate that the payer belongs to the group
    payer_membership = GroupMember.query.filter_by(group_id=group_id, user_id=paid_by).first()
    if not payer_membership:
        return jsonify({"error": "The user who paid does not belong to the group"}), 400

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

    # Validate all participants belong to the group
    for p in normalized_participants:
        p_id = p["user_id"] if isinstance(p, dict) else p
        participant_membership = GroupMember.query.filter_by(
            group_id=group_id,
            user_id=p_id
        ).first()

        if not participant_membership:
            return jsonify({
                "error": f"User {p_id} does not belong to the group"
            }), 400

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
        print(f"DEBUG: Error creating expense: {str(e)}")
        return jsonify({"error": "Error creating expense", "details": str(e)}), 500

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

# Actualizar un gasto
@api.route('/expenses/<int:expense_id>', methods=['PUT'])
@jwt_required()
def update_expense(expense_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()

    expense = Expense.query.get(expense_id)
    if not expense:
        return jsonify({"error": "Expense not found"}), 404

    # Verificar que el usuario pertenece al grupo
    membership = GroupMember.query.filter_by(group_id=expense.group_id, user_id=user_id).first()
    if not membership:
        return jsonify({"error": "You do not have access to this expense"}), 403

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
            return jsonify({"error": "The user who paid does not belong to the group"}), 400
        expense.paid_by = paid_by

    try:
        if participants:
            # Eliminar participantes anteriores
            ExpenseParticipant.query.filter_by(expense_id=expense.id).delete()
            
            # Crear nuevos participantes
            for p in participants:
                p_user_id = p["user_id"]
                p_amount = Decimal(str(p.get("amount_owed", 0)))
                
                # Validar que el participante pertenece al grupo
                p_membership = GroupMember.query.filter_by(group_id=expense.group_id, user_id=p_user_id).first()
                if not p_membership:
                    continue

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
        return jsonify({"error": "Error updating expense", "details": str(e)}), 500

# Eliminar un gasto
@api.route('/expenses/<int:expense_id>', methods=['DELETE'])
@jwt_required()
def delete_expense(expense_id):
    user_id = int(get_jwt_identity())
    
    expense = Expense.query.get(expense_id)
    if not expense:
        return jsonify({"error": "Expense not found"}), 404

    # Verificar que el usuario pertenece al grupo
    membership = GroupMember.query.filter_by(group_id=expense.group_id, user_id=user_id).first()
    if not membership:
        return jsonify({"error": "You do not have permission to delete this expense"}), 403

    try:
        # Los participantes se eliminan en cascada si está configurado, o manualmente
        ExpenseParticipant.query.filter_by(expense_id=expense.id).delete()
        db.session.delete(expense)
        db.session.commit()
        return jsonify({"message": "Expense deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error deleting expense", "details": str(e)}), 500


@api.route('/invite', methods=['POST'])
@jwt_required()
def send_invitation():
    body = request.get_json()
    email_destinatario = body.get("email")
    group_id = body.get("group_id")
    
    # 1. Validaciones básicas
    if not email_destinatario or not group_id:
        return jsonify({"msg": "Missing data (email or group_id)"}), 400

    # 2. Verificar que el grupo existe
    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    try:
        # 3. Guardar la invitación en la DB (esto genera el UUID automáticamente)
        nueva_invitacion = Invitation(
            email=email_destinatario,
            group_id=group_id
        )
        db.session.add(nueva_invitacion)
        db.session.commit()

        # 4. Configurar el contenido del correo
        # El token se genera gracias al 'default=lambda: str(uuid.uuid4())' de tu modelo
        token = nueva_invitacion.token
        
        # URL de tu frontend (ajusta según tu entorno de Codespaces o producción)
        url_aceptacion = f"https://fluffy-guacamole-v6jpqjjr7xw93wg4v-3000.app.github.dev/accept-invite?token={token}"

        msg = Message(
            subject=f"¡Te han invitado al grupo {group.name} en Splitty!",
            recipients=[email_destinatario]
        )
        
        # Cuerpo del correo en HTML para que se vea bien
        msg.html = f"""
            <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px;">
                <h2 style="color: #2D3E50;">¡Hola!</h2>
                <p>Tu amigo te ha invitado a unirse al grupo <strong>{group.name}</strong> para gestionar gastos juntos.</p>
                <p>Haz clic en el siguiente botón para aceptar la invitación:</p>
                <a href="{url_aceptacion}" 
                   style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">
                   Unirme al grupo
                </a>
                <p style="margin-top: 20px; font-size: 0.8em; color: #777;">
                    Si no esperabas esta invitación, puedes ignorar este correo.
                </p>
            </div>
        """

        # 5. Enviar el correo
        current_app.extensions['mail'].send(msg)

        return jsonify({
            "msg": "Invitación guardada y correo enviado con éxito",
            "invitation_id": nueva_invitacion.id
        }), 201

    except Exception as e:
        # Si algo falla, hacemos rollback para no dejar invitaciones huérfanas
        db.session.rollback()
        return jsonify({"msg": "Error processing invitation", "error": str(e)}), 500


# ===============================
# RECEIPTS (SUBIR / ELIMINAR)
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

    try:
        upload_result = cloudinary.uploader.upload(file)

        expense.receipt_url = upload_result['secure_url']
        db.session.commit()

        return jsonify({
            "message": "Receipt uploaded successfully",
            "receipt_url": expense.receipt_url
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


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
