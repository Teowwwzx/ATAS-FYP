import os
import sys
import pytest

# Set env vars
os.environ["DATABASE_URL"] = "postgresql://user:pass@localhost/testdb"
os.environ["TESTING"] = "1"

if __name__ == "__main__":
    # Add backend to sys.path to mimic running from root but allow imports
    # Current dir is backend/
    sys.path.append(os.getcwd())
    
    print("Running tests from debug script...")
    with open("test_output.txt", "w") as f:
        sys.stdout = f
        sys.stderr = f
        retcode = pytest.main(["tests", "-v"])
    sys.exit(retcode)
