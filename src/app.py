"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
import os
from flask import Flask, request, jsonify, url_for, send_from_directory
from flask_migrate import Migrate
from flask_swagger import swagger
from flask_jwt_extended import JWTManager,create_access_token,jwt_required,get_jwt_identity
from api.utils import APIException, generate_sitemap
from api.models import db,User,bcrypt
from api.routes import api
from api.admin import setup_admin
from api.commands import setup_commands

# from models import Person

ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(
    os.path.realpath(__file__)), '../dist/')
app = Flask(__name__)
app.url_map.strict_slashes = False

# database condiguration
db_url = os.getenv("DATABASE_URL")
if db_url is not None:
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace(
        "postgres://", "postgresql://")
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:////tmp/test.db"

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
MIGRATE = Migrate(app, db, compare_type=True)
db.init_app(app)
bcrypt.init_app(app)
jwt=JWTManager(app)

# add the admin
setup_admin(app)

# add the admin
setup_commands(app)

# Add all endpoints form the API with a "api" prefix
app.register_blueprint(api, url_prefix='/api')

# Handle/serialize errors like a JSON object

#incializar bcrypt



@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

# generate sitemap with all your endpoints


@app.route('/')
def sitemap():
    if ENV == "development":
        return generate_sitemap(app)
    return send_from_directory(static_file_dir, 'index.html')

# any other endpoint will try to serve it like a static file
@app.route('/<path:path>', methods=['GET'])
def serve_any_other_file(path):
    if not os.path.isfile(os.path.join(static_file_dir, path)):
        path = 'index.html'
    response = send_from_directory(static_file_dir, path)
    response.cache_control.max_age = 0  # avoid cache memory
    return response

################################################################################
#endPoint Registro usuario 
@app.route('/register',methods=['POST'])
def reg_user():
    #traer datos del bodyy
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    if not email or not password : 
        return jsonify ({"error":"Email y contrasena obligatorios"}),400
    #verificar si el correo ya esta registrado 
    email_exist=User.query.filter_by(email=email).first()
    if email_exist:
        return jsonify({"error":"El correo previamente registrado en la DB"}),409
    #hashear la password
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    #crear nuevo usuario
    new_user = User(
        email=email,
        password=hashed_password,
        is_active=True
    )
    ##guardar en DB
    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message" :"Usuario creado con exito"}),201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error":"Error interno de servidor","details":str(e)}),500


@app.route('/login',methods=['POST'])
def login_user():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error":"email y password requeridos"}),400
    
    user = User.query.filter_by(email=email).first()

    if not user or not bcrypt.check_password_hash(user.password,password):
        return jsonify({"error":"Correo o password incorrectos"}),401
    
    acces_token = create_access_token(identity=str(user.id))

    return jsonify({
        "message" : "Login correcto",
        "access_token": acces_token
    }),200

# this only runs if `$ python src/main.py` is executed
if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    app.run(host='0.0.0.0', port=PORT, debug=True)
