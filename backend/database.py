
import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    config = {
        "host": os.getenv("MYSQL_HOST", "localhost"),
        "port": int(os.getenv("MYSQL_PORT", "3306")),
        "user": os.getenv("MYSQL_USER", "root"),
        "password": os.getenv("MYSQL_PASSWORD", ""),
        "database": os.getenv("MYSQL_DATABASE", "devnotes_db"),
    }

    # Configure SSL when a CA certificate is provided
    ssl_ca = os.getenv("MYSQL_SSL_CA")

    if ssl_ca:
        # Resolve relative paths from the backend directory
        if not os.path.isabs(ssl_ca):
            ssl_ca = os.path.join(os.path.dirname(os.path.abspath(__file__)), ssl_ca)

        config["ssl_ca"] = ssl_ca
        config["ssl_verify_cert"] = True
        config["ssl_verify_identity"] = True

    return mysql.connector.connect(**config)
