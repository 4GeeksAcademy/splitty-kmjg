import sys
import os

# Add src to path
sys.path.append(os.path.join(os.getcwd(), 'src'))

from app import app
from flask_mail import Message

with app.app_context():
    print("Testing mail extension from app context...")
    
    mail_ext = app.extensions.get('mail')
    if not mail_ext:
        print("CRITICAL: Mail extension not found!")
        sys.exit(1)
        
    recipient = os.getenv("MAIL_USERNAME")
    msg = Message(
        subject="Splitty Extension Test",
        recipients=[recipient],
        sender=app.config.get('MAIL_USERNAME'),
        body="This test uses the extension directly from the app context."
    )
    
    try:
        print(f"Sending via extension to {recipient}...")
        mail_ext.send(msg)
        print("SUCCESS!")
    except Exception as e:
        print(f"FAILED: {str(e)}")
