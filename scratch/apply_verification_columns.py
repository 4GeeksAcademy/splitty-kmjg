import os
from sqlalchemy import text
from flask import Flask
from api.models import db
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
db_url = os.getenv("DATABASE_URL")
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    try:
        # Add is_verified
        db.session.execute(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;"))
        # Add verification_code
        db.session.execute(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6);"))
        # Add verification_expires_at
        db.session.execute(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP;"))
        db.session.commit()
        print("Columns added successfully!")
    except Exception as e:
        db.session.rollback()
        print(f"Error adding columns: {e}")
