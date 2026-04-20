import pytest
import sys
import os
from datetime import datetime, timedelta

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from app import app
from api.models import db, User, Group, GroupMember, Invitation

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.session.remove()
            db.drop_all()

@pytest.fixture
def setup_users(client):
    with app.app_context():
        from flask_bcrypt import Bcrypt
        bcrypt = Bcrypt(app)
        
        users_data = [
            {"username": "Alice", "email": "alice@test.com", "password": "test123"},
            {"username": "Bob", "email": "bob@test.com", "password": "test123"},
        ]
        
        tokens = {}
        user_ids = {}
        
        for udata in users_data:
            hashed = bcrypt.generate_password_hash(udata["password"]).decode("utf-8")
            user = User(
                username=udata["username"],
                email=udata["email"],
                password=hashed,
                is_active=True,
                is_verified=True
            )
            db.session.add(user)
            db.session.flush()
            user_ids[udata["username"]] = user.id
        
        db.session.commit()
        
        for udata in users_data:
            resp = client.post('/api/login', json={
                "email": udata["email"],
                "password": udata["password"]
            })
            data = resp.get_json()
            tokens[udata["username"]] = data["access_token"]
        
        return {"tokens": tokens, "user_ids": user_ids}

def auth_header(token):
    return {"Authorization": f"Bearer {token}"}

class TestGroupInvitation:
    
    def test_accept_group_invite(self, client, setup_users):
        """Bob accepts Alice's group invitation."""
        tokens = setup_users["tokens"]
        user_ids = setup_users["user_ids"]
        
        # 1. Alice creates a group
        resp = client.post('/api/groups', 
            json={"name": "Alice Group", "category": "Home"},
            headers=auth_header(tokens["Alice"]))
        group_id = resp.get_json()["group"]["id"]
        
        # 2. Alice generates an invite link
        resp = client.post(f'/api/groups/{group_id}/invite-link',
            json={"email": "bob@test.com"},
            headers=auth_header(tokens["Alice"]))
        token = resp.get_json()["token"]
        
        # 3. Bob accepts the invite
        resp = client.post('/api/groups/accept-invite',
            json={"token": token},
            headers=auth_header(tokens["Bob"]))
        
        assert resp.status_code == 200
        assert resp.get_json()["message"] == "Successfully joined the group!"
        
        # 4. Verify Bob is a member
        resp = client.get(f'/api/groups', headers=auth_header(tokens["Bob"]))
        groups = resp.get_json()["groups"]
        assert any(g["id"] == group_id for g in groups)

    def test_cannot_reuse_group_token(self, client, setup_users):
        """A group invitation cannot be used twice."""
        tokens = setup_users["tokens"]
        user_ids = setup_users["user_ids"]
        
        # Alice creates group and invite
        resp = client.post('/api/groups', 
            json={"name": "Alice Group", "category": "Home"},
            headers=auth_header(tokens["Alice"]))
        group_id = resp.get_json()["group"]["id"]
        
        resp = client.post(f'/api/groups/{group_id}/invite-link',
            json={"email": "bob@test.com"},
            headers=auth_header(tokens["Alice"]))
        token = resp.get_json()["token"]
        
        # Bob accepts first time
        client.post('/api/groups/accept-invite',
            json={"token": token},
            headers=auth_header(tokens["Bob"]))
            
        # Bob (or anyone) tries to use it again
        resp = client.post('/api/groups/accept-invite',
            json={"token": token},
            headers=auth_header(tokens["Bob"]))
        
        assert resp.status_code == 400
        assert "already been used" in resp.get_json()["error"]

    def test_expired_token(self, client, setup_users):
        """Expired tokens should be rejected."""
        tokens = setup_users["tokens"]
        
        with app.app_context():
            # Create a group manually
            group = Group(name="Old Group", category="Test", created_by=setup_users["user_ids"]["Alice"])
            db.session.add(group)
            db.session.commit()
            
            # Create an expired invitation
            expired_invite = Invitation(
                email="bob@test.com",
                group_id=group.id,
                expires_at=datetime.utcnow() - timedelta(days=1)
            )
            db.session.add(expired_invite)
            db.session.commit()
            token = expired_invite.token
            
        resp = client.post('/api/groups/accept-invite',
            json={"token": token},
            headers=auth_header(tokens["Bob"]))
            
        assert resp.status_code == 400
        assert "expired" in resp.get_json()["error"]
