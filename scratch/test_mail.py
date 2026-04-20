import sys
import os

# Add src to path
sys.path.append(os.path.join(os.getcwd(), 'src'))

from app import app
from api.mail_utils import send_splitty_mail

with app.app_context():
    print("Testing mail sending...")
    recipient = "group.splitty@gmail.com" # Test sending to the same account
    success, msg = send_splitty_mail(
        subject="Test Splitty Mail",
        recipient=recipient,
        template_type='verification',
        context={
            "username": "Test User",
            "code": "123456",
            "link": "http://localhost:3000/verify?code=123456"
        }
    )
    if success:
        print("SUCCESS:", msg)
    else:
        print("FAILED:", msg)
