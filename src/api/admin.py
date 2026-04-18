import os
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from api.models import db, User, BlockedToken, Group, GroupMember, Expense, ExpenseParticipant
from flask_bcrypt import generate_password_hash
from flask_admin.theme import Bootstrap4Theme


class UserView(ModelView):
    column_list = ["id", "username", "email", "is_active"]

    def on_model_change(self, form, model, is_created):
        if form.password.data:
            if not form.password.data.startswith('$2b$'):
                model.password = generate_password_hash(
                    form.password.data).decode('utf-8')

        return super().on_model_change(form, model, is_created)


class GroupView(ModelView):
    column_list = ["id", "name", "category", "created_by", "created_at"]


class GroupMemberView(ModelView):
    column_list = ["id", "group_id", "user_id", "joined_at"]


class ExpenseView(ModelView):
    column_list = ["id", "description", "amount", "date", "group_id", "paid_by"]


class ExpenseParticipantView(ModelView):
    column_list = ["id", "expense_id", "user_id"]


def setup_admin(app):
    app.secret_key = os.environ.get('FLASK_APP_KEY', 'sample key')
    app.config['FLASK_ADMIN_SWATCH'] = 'cerulean'
    admin = Admin(app, name='4Geeks Admin',
                  theme=Bootstrap4Theme(swatch='cerulean'))

    admin.add_view(UserView(User, db.session))
    admin.add_view(ModelView(BlockedToken, db.session))

    admin.add_view(GroupView(Group, db.session))
    admin.add_view(GroupMemberView(GroupMember, db.session))
    admin.add_view(ExpenseView(Expense, db.session))
    admin.add_view(ExpenseParticipantView(ExpenseParticipant, db.session))