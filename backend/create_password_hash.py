
from getpass import getpass
from app.auth import hash_password

password = getpass("Enter a new authority password: ")
confirm = getpass("Confirm authority password: ")

if password != confirm:
    raise SystemExit("Passwords do not match.")

if len(password) < 12:
    raise SystemExit("Use a password with at least 12 characters.")

print("\nCopy this hash into backend/.env:\n")
print(hash_password(password))
