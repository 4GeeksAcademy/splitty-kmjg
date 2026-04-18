import sys
import os

# Add src to path
sys.path.append(os.path.join(os.getcwd(), "src"))

from app import app
from api.models import db, User

with app.app_context():
    try:
        count = User.query.count()
        print(f"Users in DB: {count}")
    except Exception as e:
        print(f"Error: {e}")
