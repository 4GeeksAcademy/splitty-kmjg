import os
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# Config
SQLITE_DB = "src/instance/test.db"
DATABASE_URL = os.getenv("DATABASE_URL")

def migrate_data():
    if not DATABASE_URL or "supabase" not in DATABASE_URL.lower():
        print("Error: DATABASE_URL not set to a Supabase/PostgreSQL instance in .env")
        return

    print(f"Starting migration from {SQLITE_DB} to Supabase...")

    # Connect to SQLite
    lite_conn = sqlite3.connect(SQLITE_DB)
    lite_conn.row_factory = sqlite3.Row
    lite_cur = lite_conn.cursor()

    # Connect to PostgreSQL
    try:
        pg_conn = psycopg2.connect(DATABASE_URL)
        pg_cur = pg_conn.cursor()
    except Exception as e:
        print(f"Error connecting to Supabase: {e}")
        return

    # Tables to migrate (ordered by dependencies)
    tables = [
        "user",
        "blocked_token",
        "group",
        "group_member",
        "invitation",
        "expense",
        "expense_participant",
        "friendship",
        "friend_invitation"
    ]

    try:
        for table in tables:
            print(f"Migrating table: {table}...")
            
            # 1. Get column names from SQLite
            lite_cur.execute(f"PRAGMA table_info(\"{table}\")")
            columns = [row[1] for row in lite_cur.fetchall()]
            
            if not columns:
                print(f"  Warning: Table {table} does not exist in SQLite or has no columns.")
                continue

            # 2. Fetch all data from SQLite
            lite_cur.execute(f"SELECT * FROM \"{table}\"")
            rows = lite_cur.fetchall()
            
            if not rows:
                print(f"  Table {table} is empty. Skipping.")
                continue

            print(f"  Found {len(rows)} rows. Inserting...")

            # 3. Prepare Postgres insert
            # Handle table name escaping ("group" is a reserved word)
            table_name = f'"{table}"' if table in ["group", "user"] else table
            
            cols_str = ", ".join([f'"{c}"' for c in columns])
            placeholders = ", ".join(["%s"] * len(columns))
            insert_query = f"INSERT INTO {table_name} ({cols_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"

            # 4. Perform insertions
            for row in rows:
                data = list(row)
                
                # Handling Postgres strict boolean types
                for i, col in enumerate(columns):
                    if col in ["is_active", "is_used"]:
                        data[i] = bool(data[i])
                
                pg_cur.execute(insert_query, tuple(data))
            
            # 5. Reset sequence for ID if it exists
            # SERIAL uses a sequence named tablename_id_seq
            seq_name = f"{table}_id_seq"
            # Special case for "user" and "group" sequences if Postgres created them with quotes
            # In Supabase/Postgres they are usually just user_id_seq or "user_id_seq"
            # We'll use a dynamic query to update the sequence to the max ID + 1
            pg_cur.execute(f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), COALESCE(MAX(id), 1)) FROM {table_name}")

        pg_conn.commit()
        print("\nMigration completed successfully!")

    except Exception as e:
        pg_conn.rollback()
        print(f"\nError during migration: {e}")
    finally:
        lite_conn.close()
        pg_conn.close()

if __name__ == "__main__":
    migrate_data()
