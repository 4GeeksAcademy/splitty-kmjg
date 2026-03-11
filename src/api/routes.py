"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
import os
from decimal import Decimal, InvalidOperation
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import (
    db,
    User,
    BlockedToken,
    Group,
    GroupMember,
    Expense,
    ExpenseParticipant
)
from api.utils import generate_sitemap, APIException
from flask_cors import CORS
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from flask_bcrypt import Bcrypt

bcrypt = Bcrypt()

api = Blueprint('api', __name__)

# Allow CORS requests to this API; explicitly permit any origin on /api/*
CORS(api, resources={r"/api/*": {"origins": "*"}})


@api.route('/hello', methods=['POST', 'GET'])
def handle_hello():

    response_body = {
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }

    return jsonify(response_body), 200

# Endpoint para registrar un nuevo usuario
@api.route('/register', methods=['POST'])
def reg_user():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email y contraseña obligatorios"}), 400

    email_exist = User.query.filter_by(email=email).first()
    if email_exist:
        return jsonify({"error": "El correo previamente registrado en la DB"}), 409

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
        return jsonify({"error": "Error interno de servidor", "details": str(e)}), 500

# Endpoint para login de usuario
@api.route('/login', methods=['POST'])
def login_user():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "email y password requeridos"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not bcrypt.check_password_hash(user.password, password):
        return jsonify({"error": "Correo o password incorrectos"}), 401

    acces_token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "Login correcto",
        "access_token": acces_token
    }), 200


# Endpoint para logout de usuario
@api.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    blocked_token = BlockedToken(jti=jti)
    db.session.add(blocked_token)
    db.session.commit()
    return jsonify({"msg": "Usuario desconectado correctamente"}), 200


# Crear grupo
@api.route('/groups', methods=['POST'])
@jwt_required()
def create_group():
    data = request.get_json()
    user_id = int(get_jwt_identity())

    name = data.get('name')
    category = data.get('category')

    if not name or not category:
        return jsonify({"error": "name y category son obligatorios"}), 400

    try:
        new_group = Group(
            name=name,
            category=category,
            created_by=user_id
        )

        db.session.add(new_group)
        db.session.flush()

        #  el creador del grupo se agrega automáticamente como miembro
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
        return jsonify({"error": "Error al crear grupo", "details": str(e)}), 500


# Obtener todos los grupos donde participa el usuario logueado
@api.route('/groups', methods=['GET'])
@jwt_required()
def get_groups():
    user_id = int(get_jwt_identity())

    memberships = GroupMember.query.filter_by(user_id=user_id).all()
    group_ids = [membership.group_id for membership in memberships]

    groups = Group.query.filter(Group.id.in_(group_ids)).all() if group_ids else []

    return jsonify({
        "groups": [group.serialize() for group in groups]
    }), 200

# Obtener un grupo por id
@api.route('/groups/<int:group_id>', methods=['GET'])
@jwt_required()
def get_group_by_id(group_id):
    user_id = int(get_jwt_identity())

    membership = GroupMember.query.filter_by(group_id=group_id, user_id=user_id).first()
    if not membership:
        return jsonify({"error": "No tienes acceso a este grupo"}), 403

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"error": "Grupo no encontrado"}), 404

    members = GroupMember.query.filter_by(group_id=group_id).all()

    return jsonify({
        "group": group.serialize(),
        "members": [member.serialize() for member in members]
    }), 200


# Agregar miembro a un grupo
@api.route('/groups/<int:group_id>/members', methods=['POST'])
@jwt_required()
def add_member_to_group(group_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()

    new_member_user_id = data.get('user_id')

    if not new_member_user_id:
        return jsonify({"error": "user_id es obligatorio"}), 400

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"error": "Grupo no encontrado"}), 404

    # Solo un miembro del grupo puede agregar otros usuarios
    membership = GroupMember.query.filter_by(group_id=group_id, user_id=user_id).first()
    if not membership:
        return jsonify({"error": "No tienes permiso para modificar este grupo"}), 403

    user_exists = User.query.get(new_member_user_id)
    if not user_exists:
        return jsonify({"error": "El usuario a agregar no existe"}), 404

    already_member = GroupMember.query.filter_by(
        group_id=group_id,
        user_id=new_member_user_id
    ).first()

    if already_member:
        return jsonify({"error": "El usuario ya pertenece a este grupo"}), 409

    try:
        new_member = GroupMember(
            group_id=group_id,
            user_id=new_member_user_id
        )
        db.session.add(new_member)
        db.session.commit()

        return jsonify({
            "message": "Miembro agregado con exito",
            "member": new_member.serialize()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error al agregar miembro", "details": str(e)}), 500


# Crear gasto dentro de un grupo
@api.route('/groups/<int:group_id>/expenses', methods=['POST'])
@jwt_required()
def create_expense(group_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()

    description = data.get('description')
    amount = data.get('amount')
    paid_by = data.get('paid_by')
    participants = data.get('participants', [])

    if not description or amount is None or not paid_by:
        return jsonify({
            "error": "description, amount y paid_by son obligatorios"
        }), 400

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"error": "Grupo no encontrado"}), 404

    # Validar que el usuario logueado pertenezca al grupo
    current_membership = GroupMember.query.filter_by(group_id=group_id, user_id=user_id).first()
    if not current_membership:
        return jsonify({"error": "No tienes acceso a este grupo"}), 403

    # Validar que quien pagó pertenezca al grupo
    payer_membership = GroupMember.query.filter_by(group_id=group_id, user_id=paid_by).first()
    if not payer_membership:
        return jsonify({"error": "El usuario que pagó no pertenece al grupo"}), 400

    try:
        amount_decimal = Decimal(str(amount))
        if amount_decimal <= 0:
            return jsonify({"error": "El monto debe ser mayor a 0"}), 400
    except (InvalidOperation, ValueError):
        return jsonify({"error": "El monto no es válido"}), 400

    # Si no mandan participantes, se asigna por defecto al que pagó
    if not participants:
        participants = [paid_by]

    # Validar que todos los participantes pertenezcan al grupo
    for participant_id in participants:
        participant_membership = GroupMember.query.filter_by(
            group_id=group_id,
            user_id=participant_id
        ).first()

        if not participant_membership:
            return jsonify({
                "error": f"El usuario {participant_id} no pertenece al grupo"
            }), 400

    try:
        new_expense = Expense(
            description=description,
            amount=amount_decimal,
            group_id=group_id,
            paid_by=paid_by
        )

        db.session.add(new_expense)
        db.session.flush()

        # Crear participantes del gasto
        for participant_id in participants:
            expense_participant = ExpenseParticipant(
                expense_id=new_expense.id,
                user_id=participant_id
            )
            db.session.add(expense_participant)

        db.session.commit()

        return jsonify({
            "message": "Gasto creado con exito",
            "expense": new_expense.serialize(),
            "participants": participants
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error al crear gasto", "details": str(e)}), 500


# Obtener gastos de un grupo
@api.route('/groups/<int:group_id>/expenses', methods=['GET'])
@jwt_required()
def get_group_expenses(group_id):
    user_id = int(get_jwt_identity())

    membership = GroupMember.query.filter_by(group_id=group_id, user_id=user_id).first()
    if not membership:
        return jsonify({"error": "No tienes acceso a este grupo"}), 403

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"error": "Grupo no encontrado"}), 404

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