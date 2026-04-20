import os
import sys
import pytest
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))
from app import app
from api.models import db


@pytest.fixture(scope="session")
def client():
    # Isolated SQLite in-memory DB for tests; prevents touching real/PostgreSQL DB
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    # Ensure tables are created fresh for the test session
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.session.remove()
            db.drop_all()
