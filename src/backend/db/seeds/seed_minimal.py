# create one asset; print row counts
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import sessionmaker
import os
import sys

# Add the parent directory to the path to allow imports from `db`
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from db.models import Asset, IntelEvent, RiskItem

DATABASE_URL = os.getenv("DB_URL", "postgresql+psycopg2://smbuser:smbpass@localhost:5432/smbsec")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_data():
    session = SessionLocal()
    try:
        # Check if data exists
        asset_count = session.execute(select(func.count(Asset.id))).scalar_one()
        if asset_count > 0:
            print("Database already seeded. Skipping.")
            return

        print("Seeding database with initial data...")

        # Create a sample asset
        sample_asset = Asset(
            name="Primary Web Server",
            type="HW",
            criticality=5
        )
        session.add(sample_asset)
        session.commit()
        print(f"Added 1 sample asset.")

        # Print final counts
        a = session.execute(select(func.count(Asset.id))).scalar_one()
        e = session.execute(select(func.count(IntelEvent.id))).scalar_one()
        r = session.execute(select(func.count(RiskItem.id))).scalar_one()
        print(f"Total counts -> Assets: {a}, Intel Events: {e}, Risk Items: {r}")

    except Exception as e:
        print(f"An error occurred during seeding: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    seed_data()
