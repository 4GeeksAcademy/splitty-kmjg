import os
from flask import Flask
from flask_mail import Mail, Message
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Config
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS') == 'True'
app.config['MAIL_USE_SSL'] = os.getenv('MAIL_USE_SSL') == 'True'
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME')

mail = Mail(app)

print(f"Server: {app.config['MAIL_SERVER']}")
print(f"Port: {app.config['MAIL_PORT']}")
print(f"Username: {app.config['MAIL_USERNAME']}")
print(f"TLS: {app.config['MAIL_USE_TLS']}")
print(f"SSL: {app.config['MAIL_USE_SSL']}")

with app.app_context():
    msg = Message(
        subject="Splitty Debug Mail",
        recipients=[os.getenv('MAIL_USERNAME')], # Send to self
        body="If you see this, email is working!"
    )
    try:
        print("Attempting to send...")
        mail.send(msg)
        print("SUCCESS!")
    except Exception as e:
        print(f"FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
