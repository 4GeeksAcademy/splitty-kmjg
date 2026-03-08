"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
import os
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import db, User, BlockedToken
from api.utils import generate_sitemap, APIException
from flask_cors import CORS
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from flask_bcrypt import Bcrypt

bcrypt = Bcrypt()

api = Blueprint('api', __name__)

# Allow CORS requests to this API
CORS(api)


@api.route('/hello', methods=['POST', 'GET'])
def handle_hello():

    response_body = {
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }

    return jsonify(response_body), 200

# Endpoint para registrar un nuevo usuario
@api.route('/register', methods=['POST'])
def reg_user():
    # traer datos del body
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    ci = data.get('ci')
    if not email or not password:
        return jsonify({"error": "Email y contraseña obligatorios"}), 400

    # verificar si la pasaron el ci
    if not ci:
        return jsonify({"error": "CI es obligatorio"}), 400
    # verificar si la ci ya esta registrada
    ci_exist = User.query.filter_by(ci=ci).first()
    if ci_exist:
        return jsonify({"error": "La CI ya esta registrada"}), 409

    # verificar si el correo ya esta registrado
    email_exist = User.query.filter_by(email=email).first()
    if email_exist:
        return jsonify({"error": "El correo previamente registrado en la DB"}), 409

    # hashear la password
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    # crear nuevo usuario
    new_user = User(
        username=username,
        email=email,
        password=hashed_password,
        is_active=True,
        ci=ci
    )

    # guardar en DB
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
