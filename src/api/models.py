import uuid
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from decimal import Decimal

db = SQLAlchemy()

# Tabla intermedia para la relación N:N
user_group = db.Table('user_group',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('group_id', db.Integer, db.ForeignKey('group.id'), primary_key=True)
)

class User(db.Model):
    """
    Modelo de usuario del sistema.
    Ya existía previamente, pero se agregaron relaciones con las nuevas entidades
    como grupos y gastos.
    """

    __tablename__ = "user"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False)

    # relación con grupos que el usuario creó
    groups_created: Mapped[list["Group"]] = relationship(
        "Group", back_populates="creator"
    )

    # relación con grupos donde el usuario es miembro
    group_memberships: Mapped[list["GroupMember"]] = relationship(
        "GroupMember", back_populates="user", cascade="all, delete-orphan"
    )

    # relación con gastos que el usuario pagó
    expenses_paid: Mapped[list["Expense"]] = relationship(
        "Expense", back_populates="payer"
    )

    # relación con gastos donde el usuario participa
    expense_participations: Mapped[list["ExpenseParticipant"]] = relationship(
        "ExpenseParticipant", back_populates="user", cascade="all, delete-orphan"
    )

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "username": self.username
        }


class BlockedToken(db.Model):
    """
    Modelo existente utilizado para bloquear tokens JWT revocados.
    No se modificó su funcionalidad.
    """

    __tablename__ = "blocked_token"

    id: Mapped[int] = mapped_column(primary_key=True)
    jti: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    blocked_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

class Group(db.Model):
    __tablename__ = "group"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    created_by: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)

    creator: Mapped["User"] = relationship("User", back_populates="groups_created")
    
    # RELACIÓN PRINCIPAL: Usamos la tabla intermedia GroupMember
    members: Mapped[list["GroupMember"]] = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    
    invitations: Mapped[list["Invitation"]] = relationship("Invitation", back_populates="group", cascade="all, delete-orphan")
    expenses: Mapped[list["Expense"]] = relationship("Expense", back_populates="group", cascade="all, delete-orphan")

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "created_by": self.created_by,
            # Serializamos los IDs de los usuarios a través de la tabla intermedia
            "members": [m.user_id for m in self.members],
            "created_at": self.created_at.isoformat()
        }

class GroupMember(db.Model):
    __tablename__ = "group_member"
    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("group.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    # El back_populates debe coincidir EXACTAMENTE con el nombre en la clase Group
    group: Mapped["Group"] = relationship("Group", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="group_memberships")
    def serialize(self):
        return {
            "id": self.id,
            "group_id": self.group_id,
            "user_id": self.user_id,
            "joined_at": self.joined_at.isoformat()
        }


class Expense(db.Model):
    """
    Representa un gasto dentro de un grupo.
    Ejemplo: "Cena", "Uber", "Hotel".
    """

    __tablename__ = "expense"

    id: Mapped[int] = mapped_column(primary_key=True)

    # descripción del gasto
    description: Mapped[str] = mapped_column(String(255), nullable=False)

    # monto del gasto
    # se usa Numeric(10,2) para evitar errores de precisión con dinero
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    # fecha del gasto
    date: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    # grupo al que pertenece el gasto
    group_id: Mapped[int] = mapped_column(ForeignKey("group.id"), nullable=False)

    # usuario que pagó el gasto
    paid_by: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)

    # RELATIONS
    group: Mapped["Group"] = relationship("Group", back_populates="expenses")

    payer: Mapped["User"] = relationship("User", back_populates="expenses_paid")

    participants: Mapped[list["ExpenseParticipant"]] = relationship(
        "ExpenseParticipant", back_populates="expense", cascade="all, delete-orphan"
    )

    def serialize(self):
        return {
            "id": self.id,
            "description": self.description,
            "amount": float(self.amount),
            "date": self.date.isoformat(),
            "group_id": self.group_id,
            "paid_by": self.paid_by
        }

class ExpenseParticipant(db.Model):
    """
    Tabla que guarda qué usuarios participan en cada gasto.
    Permite dividir un gasto entre varios miembros.
    """

    __tablename__ = "expense_participant"

    id: Mapped[int] = mapped_column(primary_key=True)

    # referencia al gasto
    expense_id: Mapped[int] = mapped_column(ForeignKey("expense.id"), nullable=False)

    # usuario que participa en el gasto
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)

    # RELATIONS
    expense: Mapped["Expense"] = relationship("Expense", back_populates="participants")

    user: Mapped["User"] = relationship("User", back_populates="expense_participations")

    def serialize(self):
        return {
            "id": self.id,
            "expense_id": self.expense_id,
            "user_id": self.user_id
        }
    
#Invitacion
class Invitation(db.Model):
    __tablename__ = "invitation"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(120), nullable=False)
    token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    group_id: Mapped[int] = mapped_column(ForeignKey("group.id"), nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean(), default=False)

    group: Mapped["Group"] = relationship("Group", back_populates="invitations")

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "token": self.token,
            "group_id": self.group_id,
            "is_used": self.is_used
        }
    


