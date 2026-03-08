import os
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from api.models import db, User, BlockedToken
from flask_bcrypt import generate_password_hash  # <-- 1. Importar esto
from flask_admin.theme import Bootstrap4Theme

# 2. Crear una vista personalizada para el User


class UserView(ModelView):
    def on_model_change(self, form, model, is_created):
        # Si hay una contraseña en el formulario
        if form.password.data:
            # Validamos que no esté ya hasheada (los hashes de bcrypt empiezan con $2b$)
            if not form.password.data.startswith('$2b$'):
                # Hasheamos la contraseña escrita en el admin
                model.password = generate_password_hash(
                    form.password.data).decode('utf-8')

        return super().on_model_change(form, model, is_created)


def setup_admin(app):
    app.secret_key = os.environ.get('FLASK_APP_KEY', 'sample key')
    app.config['FLASK_ADMIN_SWATCH'] = 'cerulean'
    admin = Admin(app, name='4Geeks Admin', theme=Bootstrap4Theme(swatch='cerulean'))

    # 3. Usar tu nueva vista personalizada en lugar del ModelView por defecto
    admin.add_view(UserView(User, db.session))
    admin.add_view(ModelView(BlockedToken, db.session))
