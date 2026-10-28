
import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    # Get the absolute path to the CA certificate file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    ca_cert_path = os.path.join(current_dir, "ca.pem")

    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        user=os.getenv("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD"),
        database=os.getenv("MYSQL_DATABASE", "defaultdb"),
        ssl_ca=ca_cert_path,          # Passes your downloaded Aiven CA certificate
        ssl_verify_cert=True          # Enforces secure verification
    )
