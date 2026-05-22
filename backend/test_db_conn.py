import psycopg
import sys

try:
    conn = psycopg.connect("postgresql://postgres:localpassword@127.0.0.1:5432/telemedicine", connect_timeout=5)
    print("Connection successful")
    with conn.cursor() as cur:
        cur.execute("SELECT 1")
        print(f"Query result: {cur.fetchone()}")
    conn.close()
except Exception as e:
    print(f"Connection failed: {e}")
    sys.exit(1)
