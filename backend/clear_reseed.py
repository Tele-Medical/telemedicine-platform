import sys
from sqlalchemy import create_engine
from app.core.config import settings
from app.core.database import Base
from seed import seed_db

def main():
    if not settings.database_url or "localhost" in settings.database_url:
        print("WARNING: You are about to run this on your LOCAL database or no DATABASE_URL is set.")
        print(f"DATABASE_URL currently set to: {settings.database_url}")
        confirm = input("Are you sure you want to proceed? (yes/no): ").strip().lower()
        if confirm != 'yes':
            print("Aborted.")
            sys.exit(0)

    print("Connecting to database to clear tables...")
    engine = create_engine(settings.database_url)

    print("Dropping all existing tables...")
    Base.metadata.drop_all(bind=engine)

    print("Recreating all database tables...")
    Base.metadata.create_all(bind=engine)

    print("\nStarting fresh database seed...")
    seed_db()

    print("\nDATABASE SUCCESSFULLY REFRESHED AND RESEEDED!")

if __name__ == "__main__":
    main()
