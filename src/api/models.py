import uuid
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from decimal import Decimal

db = SQLAlchemy()

# Tabla intermedia para la relación N:N
user_group = db.Table('user_group',
                      db.Column('user_id', db.Integer, db.ForeignKey(
                          'user.id'), primary_key=True),
                      db.Column('group_id', db.Integer, db.ForeignKey(
                          'group.id'), primary_key=True)
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
    email: Mapped[str] = mapped_column(
        String(120), unique=True, nullable=False)
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

    # relación con amistades que el usuario envió
    friendships_sent: Mapped[list["Friendship"]] = relationship(
        "Friendship", foreign_keys="[Friendship.requester_id]", back_populates="requester"
    )

    # relación con amistades que el usuario recibió
    friendships_received: Mapped[list["Friendship"]] = relationship(
        "Friendship", foreign_keys="[Friendship.addressee_id]", back_populates="addressee"
    )

    # relación con invitaciones de amistad que el usuario envió
    friend_invitations_sent: Mapped[list["FriendInvitation"]] = relationship(
        "FriendInvitation", back_populates="inviter"
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
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow)
    created_by: Mapped[int] = mapped_column(
        ForeignKey("user.id"), nullable=False)

    creator: Mapped["User"] = relationship(
        "User", back_populates="groups_created")

    # RELACIÓN PRINCIPAL: Usamos la tabla intermedia GroupMember
    members: Mapped[list["GroupMember"]] = relationship(
        "GroupMember", back_populates="group", cascade="all, delete-orphan")

    invitations: Mapped[list["Invitation"]] = relationship(
        "Invitation", back_populates="group", cascade="all, delete-orphan")
    expenses: Mapped[list["Expense"]] = relationship(
        "Expense", back_populates="group", cascade="all, delete-orphan")

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
    group_id: Mapped[int] = mapped_column(
        ForeignKey("group.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow)

    # El back_populates debe coincidir EXACTAMENTE con el nombre en la clase Group
    group: Mapped["Group"] = relationship("Group", back_populates="members")
    user: Mapped["User"] = relationship(
        "User", back_populates="group_memberships")

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

    # moneda del gasto
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="$")

    # fecha del gasto
    date: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    # grupo al que pertenece el gasto
    group_id: Mapped[int] = mapped_column(
        ForeignKey("group.id"), nullable=False)

    # usuario que pagó el gasto
    paid_by: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)

    # url del recibo/comprobante
    receipt_url: Mapped[str] = mapped_column(String(500), nullable=True)

    # RELATIONS
    group: Mapped["Group"] = relationship("Group", back_populates="expenses")

    payer: Mapped["User"] = relationship(
        "User", back_populates="expenses_paid")

    participants: Mapped[list["ExpenseParticipant"]] = relationship(
        "ExpenseParticipant", back_populates="expense", cascade="all, delete-orphan"
    )

    def serialize(self):
        return {
            "id": self.id,
            "description": self.description,
            "amount": float(self.amount),
            "currency": self.currency,
            "date": self.date.isoformat(),
            "group_id": self.group_id,
            "paid_by": self.paid_by,
            "receipt_url": self.receipt_url
        }


class ExpenseParticipant(db.Model):
    """
    Tabla que guarda qué usuarios participan en cada gasto.
    Permite dividir un gasto entre varios miembros.
    """

    __tablename__ = "expense_participant"

    id: Mapped[int] = mapped_column(primary_key=True)

    # referencia al gasto
    expense_id: Mapped[int] = mapped_column(
        ForeignKey("expense.id"), nullable=False)

    # usuario que participa en el gasto
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)

    # monto que este participante debe
    amount_owed: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)

    # RELATIONS
    expense: Mapped["Expense"] = relationship(
        "Expense", back_populates="participants")

    user: Mapped["User"] = relationship(
        "User", back_populates="expense_participations")

    def serialize(self):
        return {
            "id": self.id,
            "expense_id": self.expense_id,
            "user_id": self.user_id,
            "amount_owed": float(self.amount_owed)
        }

# Invitacion


class Invitation(db.Model):
    __tablename__ = "invitation"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(120), nullable=False)
    token: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    group_id: Mapped[int] = mapped_column(
        ForeignKey("group.id"), nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean(), default=False)

    group: Mapped["Group"] = relationship(
        "Group", back_populates="invitations")

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "token": self.token,
            "group_id": self.group_id,
            "is_used": self.is_used
        }


# =========================
# FRIENDS SYSTEM
# =========================

class Friendship(db.Model):
    """
    Modelo de amistad bidireccional.
    El requester envía la solicitud, el addressee la acepta/rechaza.
    Status: 'pending', 'accepted', 'declined', 'blocked'
    """
    __tablename__ = "friendship"

    id: Mapped[int] = mapped_column(primary_key=True)

    requester_id: Mapped[int] = mapped_column(
        ForeignKey("user.id"), nullable=False)

    addressee_id: Mapped[int] = mapped_column(
        ForeignKey("user.id"), nullable=False)

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending")

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('requester_id', 'addressee_id', name='uq_friendship'),
    )

    # RELATIONS
    requester: Mapped["User"] = relationship(
        "User", foreign_keys=[requester_id], back_populates="friendships_sent")
    addressee: Mapped["User"] = relationship(
        "User", foreign_keys=[addressee_id], back_populates="friendships_received")

    def serialize(self):
        return {
            "id": self.id,
            "requester_id": self.requester_id,
            "addressee_id": self.addressee_id,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "requester": self.requester.serialize() if self.requester else None,
            "addressee": self.addressee.serialize() if self.addressee else None
        }


class FriendInvitation(db.Model):
    """
    Invitación de amistad por email/link.
    Permite invitar a alguien que puede no tener cuenta aún.
    """
    __tablename__ = "friend_invitation"

    id: Mapped[int] = mapped_column(primary_key=True)

    inviter_id: Mapped[int] = mapped_column(
        ForeignKey("user.id"), nullable=False)

    email: Mapped[str] = mapped_column(String(120), nullable=False)

    token: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))

    is_used: Mapped[bool] = mapped_column(Boolean(), default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow)

    # RELATIONS
    inviter: Mapped["User"] = relationship(
        "User", back_populates="friend_invitations_sent")

    def serialize(self):
        return {
            "id": self.id,
            "inviter_id": self.inviter_id,
            "email": self.email,
            "token": self.token,
            "is_used": self.is_used,
            "created_at": self.created_at.isoformat(),
            "inviter": self.inviter.serialize() if self.inviter else None
        }
