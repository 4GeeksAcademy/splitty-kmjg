import os
from flask import Flask
from config import Config
from api.models import db

def run_migration():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    with app.app_context():
        try:
            db.session.execute(db.text("ALTER TABLE payment ADD COLUMN receipt_url VARCHAR(255);"))
            db.session.commit()
            print("Successfully added receipt_url column")
        except Exception as e:
            # Maybe the column already exists
            print(f"Error: {e}")

if __name__ == '__main__':
    run_migration()
