"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
import os
from flask import Flask, request, jsonify, url_for, send_from_directory
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
from flask_migrate import Migrate
from flask_swagger import swagger
from api.utils import APIException, generate_sitemap
from api.models import db, BlockedToken
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from api.routes import api, limiter, bcrypt
from api.admin import setup_admin
from api.commands import setup_commands
from flask_cors import CORS
from flask_mail import Mail, Message
import cloudinary
from dotenv import load_dotenv
from api.models import Expense

# Load environment variables from .env
load_dotenv()

# Cloudinary configuration
# DEBUG: Help user identify missing keys
cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
api_key = os.getenv("CLOUDINARY_API_KEY")
api_secret = os.getenv("CLOUDINARY_API_SECRET")

if not all([cloud_name, api_key, api_secret]):
    print("WARNING: Cloudinary configuration is incomplete. Receipt uploads will FAIL.")
else:
    print(f"Cloudinary configured successfully for cloud: {cloud_name}")

cloudinary.config(
    cloud_name=cloud_name,
    api_key=api_key,
    api_secret=api_secret,
    secure=True
)

ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(
    os.path.realpath(__file__)), '../dist/')
app = Flask(__name__)
app.url_map.strict_slashes = False
CORS(app, resources={r"/api/*": {"origins": "*"}})

app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS') == 'True'
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_DEBUG'] = os.getenv('FLASK_DEBUG') == '1'

mail = Mail(app)

# database configuration
db_url = os.getenv("DATABASE_URL")

# Force SQLite for testing environment
if os.getenv("TESTING") in ("1", "true", "yes"):
    print("[TEST] Forcing in-memory SQLite database")
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['RATELIMIT_ENABLED'] = False
    engine_options = {
        "pool_pre_ping": True,
    }
elif db_url:
    # Estandarizar el prefijo para SQLAlchemy
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    # Fix para Supabase/PgBouncer: 'prepared_statements' no es reconocido por el driver psycopg2.
    try:
        parsed = urlparse(db_url)
        query = parse_qs(parsed.query)
        if 'prepared_statements' in query:
            query.pop('prepared_statements')
            db_url = urlunparse(parsed._replace(
                query=urlencode(query, doseq=True)))
    except Exception:
        pass
    
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
    engine_options = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }
    if db_url.startswith("postgresql://"):
        engine_options["connect_args"] = {"sslmode": "require"}
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///test.db"
    engine_options = {
        "pool_pre_ping": True,
    }

app.config['SQLALCHEMY_ENGINE_OPTIONS'] = engine_options

# Log database type for debugging
if os.getenv("TESTING") not in ("1", "true", "yes"):
    if "supabase" in (db_url or "").lower():
        print("[OK] Connected to Supabase PostgreSQL")
    elif db_url:
        print(f"[OK] Connected to: {db_url.split('@')[1] if '@' in db_url else 'custom database'}")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "any-secret-key")
MIGRATE = Migrate(app, db, compare_type=True)
db.init_app(app)
jwt = JWTManager(app)

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload.get("jti")
    return BlockedToken.query.filter_by(jti=jti).first() is not None

setup_admin(app)
setup_commands(app)
limiter.init_app(app)
bcrypt.init_app(app)
app.register_blueprint(api, url_prefix='/api')

@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

@app.errorhandler(500)
def handle_500(error):
    app.logger.error(f"Error Interno del Servidor: {error}")
    response = jsonify({"error": "Internal server error"})
    response.status_code = 500
    return response

@app.route('/')
def sitemap():
    if ENV == "development":
        return generate_sitemap(app)
    return send_from_directory(static_file_dir, 'index.html')

@app.route('/<path:path>', methods=['GET'])
def serve_any_other_file(path):
    if not os.path.isfile(os.path.join(static_file_dir, path)):
        path = 'index.html'
    response = send_from_directory(static_file_dir, path)
    response.cache_control.max_age = 0
    return response

@app.route('/api/confirm-payment', methods=['POST'])
def confirm_payment():
    try:
        body = request.get_json()
        order_id = body.get("orderID") 
        expense_id = body.get("expense_id")
        if not order_id or not expense_id:
            return jsonify({"msg": "Faltan datos (orderID o expense_id)"}), 400
        expense = Expense.query.get(expense_id)
        if expense:
            expense.is_settled = True
            db.session.commit()
            return jsonify({"msg": "Pago registrado con éxito en la base de datos"}), 200
        return jsonify({"msg": "Gasto no encontrado"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    app.run(host='0.0.0.0', port=PORT, debug=True)
