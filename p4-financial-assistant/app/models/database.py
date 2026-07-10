from sqlalchemy import create_engine, Column, Integer, String, Float, Date, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not found in environment/.env")

# Render (and Heroku) provision managed Postgres URLs with the legacy
# "postgres://" scheme, which SQLAlchemy's psycopg2 dialect rejects.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String, nullable=False, index=True)  # owner, from JWT
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    description = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    type = Column(String, nullable=False)  # "income" | "expense", from the uploaded file
    category = Column(String, nullable=True, index=True)  # Gemini-assigned
    merchant = Column(String, nullable=True)  # Gemini-assigned
    created_at = Column(DateTime, default=datetime.utcnow)

    account = relationship("Account", back_populates="transactions")

class RecurringTransaction(Base):
    """A detected recurring pattern (subscription, rent, paycheck, etc.), persisted
    so callers can read it without re-running fuzzy-matching detection every time.
    Refreshed (replaced) whenever GET /transactions/recurring is called."""
    __tablename__ = "recurring_transactions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    merchant = Column(String, nullable=False)
    amount = Column(Float, nullable=False)  # average amount across occurrences
    type = Column(String, nullable=False)  # "income" | "expense"
    frequency = Column(String, nullable=False)  # "weekly" | "monthly" | "yearly"
    occurrence_count = Column(Integer, nullable=False)
    last_seen_date = Column(Date, nullable=False)
    next_expected_date = Column(Date, nullable=False)
    total_spent_lifetime = Column(Float, nullable=False)
    transaction_ids = Column(String, nullable=False)  # comma-separated Transaction ids in this cluster
    detected_at = Column(DateTime, default=datetime.utcnow)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    Base.metadata.create_all(bind=engine)
