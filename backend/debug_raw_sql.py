
from app.database.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print("--- Testing RAW SQL ---")
sql = """
SELECT profiles.full_name, r.name as role_name
FROM profiles 
JOIN users ON users.id = profiles.user_id 
JOIN user_roles ON user_roles.user_id = users.id 
JOIN roles r ON r.id = user_roles.role_id        
WHERE profiles.visibility = 'public' AND lower(r.name) LIKE lower('%student%')
"""

results = db.execute(text(sql)).fetchall()

print(f"Count: {len(results)}")
found_rj = False
for row in results:
    # print(row)
    if "Robert Jones" in row[0]:
        print(f"ERROR: Found Robert Jones! Role: {row[1]}")
        found_rj = True

if not found_rj:
    print("SUCCESS: Robert Jones NOT found in raw SQL.")

db.close()
