"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
import os
from flask import Flask, request, jsonify, url_for, send_from_directory
from flask_migrate import Migrate
from flask_swagger import swagger
from api.utils import APIException, generate_sitemap
from api.models import db, BlockedToken
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from api.routes import api
from api.admin import setup_admin
from api.commands import setup_commands
from flask_cors import CORS
from flask_mail import Mail, Message

# from models import Person

ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(
    os.path.realpath(__file__)), '../dist/')
app = Flask(__name__)
app.url_map.strict_slashes = False
CORS(app, resources={r"/api/*": {"origins": "*"}})


app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = 'katgmq19@gmail.com'
app.config['MAIL_PASSWORD'] = 'anhwshoipefqkwea'
app.config['MAIL_DEFAULT_SENDER'] = 'katgmq19@gmail.com'

app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME')
mail = Mail(app)

# database condiguration
db_url = os.getenv("DATABASE_URL")
if db_url is not None and db_url.startswith("http"):
    db_url = None
    
if db_url is not None:
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace(
        "postgres://", "postgresql://")
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:////tmp/test.db"

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config["JWT_SECRET_KEY"] = os.getenv(
    "FLASK_APP_KEY")
MIGRATE = Migrate(app, db, compare_type=True)
db.init_app(app)
jwt = JWTManager(app)

# register a callback function that will check if a JWT exists in the blocklist


@jwt.token_in_blocklist_loader
# jwt_header and jwt_payload are provided by flask_jwt_extended when verifying tokens
# return True if token has been revoked/blocked (i.e. should be treated as invalid)
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload.get("jti")
    # look up the jti in our BlockedToken table
    return BlockedToken.query.filter_by(jti=jti).first() is not None


# add the admin
setup_admin(app)

# add the admin
setup_commands(app)

# Add all endpoints form the API with a "api" prefix
app.register_blueprint(api, url_prefix='/api')

# Handle/serialize errors like a JSON object

# incializar bcrypt

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

@app.route('/')
def index():
    return "Backend de Splitty funcionando"

@app.route('/api/groups/invite', methods=['POST'])
def send_group_invitation():
    try:
        # Extraemos los datos enviados desde React
        data = request.get_json()
        
        email_destinatario = data.get('email')
        group_name = data.get('group_name')
        token = data.get('token')
        
        # Construimos el enlace de invitación
        # En producción, esto sería tu dominio real
        invite_link = f"https://silver-memory-pj57p55w575xc76g7-3000.app.github.dev/join?token={token}"

        # Creamos el objeto del mensaje
        msg = Message(
            subject=f"¡Te han invitado a unirte a {group_name} en Splitty!",
            recipients=[email_destinatario]
        )
        
        # Contenido del correo
        msg.body = f"""
        ¡Hola! 
        
        Tu amigo te ha invitado a dividir gastos en el grupo: {group_name}.
        
        Para unirte, haz clic en el siguiente enlace:
        {invite_link}
        
        ¡Nos vemos en Splitty!
        """
        
        # Enviamos el correo
        mail.send(msg)
        
        return jsonify({"message": "Invitación enviada con éxito"}), 200

    except Exception as e:
        # Si algo falla, devolvemos el error al frontend para debuguear
        print(f"Error enviando correo: {str(e)}")
        return jsonify({"error": "No se pudo enviar el correo", "details": str(e)}), 500

# this only runs if `$ python src/main.py` is executed
if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    app.run(host='0.0.0.0', port=5000, debug=True)
