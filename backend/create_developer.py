# Create a platform developer account (the login for the Developer conso
import sys

from app import create_app
from utils.auth import bcrypt, db
from utils.platform import Developer


def main():
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(2)
    username, email, password = sys.argv[1], sys.argv[2], sys.argv[3]
    if len(password) < 8:
        print("Password must be at least 8 characters.")
        sys.exit(2)

    app = create_app()
    with app.app_context():
        db.create_all()
        if Developer.query.filter_by(username=username).first():
            print(f"A developer named '{username}' already exists.")
            sys.exit(1)
        count = Developer.query.count() + 1
        dev = Developer(
            developer_id=f"DEV-{count:03d}",
            first_name=username,
            last_name="Developer",
            email=email,
            username=username,
            password=bcrypt.generate_password_hash(password).decode("utf-8"),
        )
        db.session.add(dev)
        db.session.commit()
        print(f"Created developer '{username}'. Log in at /developer/login.")


if __name__ == "__main__":
    main()
