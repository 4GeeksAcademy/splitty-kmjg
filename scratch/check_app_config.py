import sys
import os

# Add src to path
sys.path.append(os.path.join(os.getcwd(), 'src'))

from app import app

with app.app_context():
    print("Checking Flask-Mail Configuration:")
    for key in ['MAIL_SERVER', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_USE_TLS', 'MAIL_USE_SSL', 'MAIL_DEFAULT_SENDER']:
        val = app.config.get(key)
        if key == 'MAIL_PASSWORD' and val:
            print(f"{key}: [HIDDEN] (length: {len(val)})")
        else:
            print(f"{key}: {val}")
    
    mail_ext = app.extensions.get('mail')
    print(f"Mail extension found: {mail_ext is not None}")
