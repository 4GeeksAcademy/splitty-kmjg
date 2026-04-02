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
import cloudinary
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Cloudinary configuration
# DEBUG: Help user identify missing keys
cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
api_key = os.getenv("CLOUDINARY_API_KEY")
api_secret = os.getenv("CLOUDINARY_API_SECRET")

if not all([cloud_name, api_key, api_secret]):
    print("WARNING: Cloudinary configuration is incomplete. Receipt uploads will FAIL.")
    print(f"Loaded: cloud_name={bool(cloud_name)}, api_key={bool(api_key)}, api_secret={bool(api_secret)}")
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

app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', '587'))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True') == 'True'
app.config['MAIL_USE_SSL'] = os.getenv('MAIL_USE_SSL', 'False') == 'True'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME', 'katgmq19@gmail.com')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD', 'anhwshoipefqkwea')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', app.config['MAIL_USERNAME'])

mail = Mail(app)

# database configuration
db_url = os.getenv("DATABASE_URL")

# Supabase connection string format: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
if db_url and db_url.startswith("postgresql://"):
    # Direct PostgreSQL connection (Supabase or self-hosted)
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
elif db_url and db_url.startswith("postgres://"):
    # Legacy postgres:// prefix - convert to postgresql://
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace("postgres://", "postgresql://")
elif db_url and db_url.startswith("http"):
    # HTTP URL means SQLite was mistakenly set - fallback
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///test.db"
else:
    # Default: local SQLite for development
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///test.db"

# Log database type for debugging
if "supabase" in (db_url or "").lower():
    print("✓ Connected to Supabase PostgreSQL")
elif db_url:
    print(f"✓ Connected to: {db_url.split('@')[1] if '@' in db_url else 'custom database'}")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "any-secret-key")
MIGRATE = Migrate(app, db, compare_type=True)
db.init_app(app)
jwt = JWTManager(app)

# register a callback function that will check if a JWT exists in the blocklist
@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload.get("jti")
    return BlockedToken.query.filter_by(jti=jti).first() is not None


# add the admin
setup_admin(app)

# add the commands
setup_commands(app)

# Add all endpoints form the API with a "api" prefix
app.register_blueprint(api, url_prefix='/api')

# Handle/serialize errors like a JSON object
@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

# Catch-all for unhandled 500 errors — ensures CORS headers are always present
@app.errorhandler(500)
def handle_500(error):
    response = jsonify({"error": "Internal server error"})
    response.status_code = 500
    return response

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

# this only runs if `$ python src/app.py` is executed
if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    app.run(host='0.0.0.0', port=PORT, debug=True)
