import sys
import os

# Add src to path
sys.path.append(os.path.join(os.getcwd(), "src"))

from app import app
from api.models import db, User

# Override DB URL with IPv6 direct
app.config['SQLALCHEMY_DATABASE_URI'] = "postgresql://postgres:splittykmjgg4@[2600:1f16:1cd0:3340:bb84:5bc2:9d45:ede1]:5432/postgres?sslmode=require"

with app.app_context():
    try:
        count = User.query.count()
        print(f"Users in DB: {count}")
    except Exception as e:
        print(f"Error: {e}")
