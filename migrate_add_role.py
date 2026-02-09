import sqlite3
from pathlib import Path

DB_PATH = Path('mathlingo.db')

if not DB_PATH.exists():
    raise SystemExit('mathlingo.db not found. Start app or create tables first.')

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.execute('PRAGMA table_info(users)')
columns = {row[1] for row in cur.fetchall()}

if 'role' not in columns:
    cur.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")
    conn.commit()
    print('Added users.role column with default=\'user\'.')
else:
    print('users.role already exists. No changes made.')

conn.close()
