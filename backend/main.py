
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from urllib.parse import urlencode
import hashlib
import json
import os
import re
import secrets
import smtplib
import ssl

import mysql.connector
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from pwdlib import PasswordHash

from database import get_connection

# -------------------- Configuration --------------------

load_dotenv()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 12
password_hash = PasswordHash.recommended()
bearer_scheme = HTTPBearer()


# -------------------- Application startup --------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    if len(JWT_SECRET_KEY) < 32:
        raise RuntimeError(
            "Set JWT_SECRET_KEY in backend/.env to a strong random secret."
        )

    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        print("MySQL connection successful.")
    except mysql.connector.Error as exc:
        print(f"MySQL connection failed: {exc}")
        raise RuntimeError(
            "Could not connect to MySQL. Check backend/.env and MySQL Server."
        ) from exc
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

    yield


app = FastAPI(
    title="DevNotes API",
    description="DevNotes with authentication, private notes and password recovery",
    version="2.2.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[

        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "https://dev-notes-three-zeta.vercel.app",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)



# -------------------- Request models --------------------

class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    new_password: str = Field(min_length=8, max_length=128)


class NoteCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    language: str = Field(default="Other", max_length=50)
    content: str = Field(min_length=1)
    favorite: bool = False
    tags: list[str] = Field(default_factory=list)
    collection_name: str | None = Field(default=None, max_length=100)


class NoteUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    language: str = Field(default="Other", max_length=50)
    content: str = Field(min_length=1)
    favorite: bool | None = None
    tags: list[str] = Field(default_factory=list)
    collection_name: str | None = Field(default=None, max_length=100)


class FavoriteUpdate(BaseModel):
    favorite: bool


# -------------------- Database helper --------------------


def run_query(
    query,
    params=(),
    fetch_one=False,
    commit=False,
    fetch_all=True,
):
    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(query, params)

        if commit:
            connection.commit()
            return {
                "id": cursor.lastrowid,
                "rowcount": cursor.rowcount,
            }

        if fetch_one:
            return cursor.fetchone()

        if fetch_all:
            return cursor.fetchall()

        # Consume any remaining result rows before closing the cursor.
        if cursor.with_rows:
            cursor.fetchall()

        return None

    except mysql.connector.Error as exc:
        if connection and commit:
            connection.rollback()

        print(f"Database error: {exc}")
        raise HTTPException(
            status_code=500,
            detail="A database operation failed. Check the backend terminal.",
        ) from exc

    finally:
        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()



# -------------------- Email helpers --------------------

def normalize_email(email: str) -> str:
    return email.strip().lower()


def validate_email(email: str) -> str:
    email = normalize_email(email)

    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(
            status_code=422,
            detail="Enter a valid email address.",
        )

    return email


def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def send_reset_email(email: str, token: str):
    frontend_url = os.getenv(
        "FRONTEND_URL",
        "http://localhost:5174",
    ).rstrip("/")

    reset_url = (
        f"{frontend_url}/reset-password?"
        f"{urlencode({'token': token})}"
    )

    smtp_email = os.getenv("SMTP_EMAIL", "").strip()
    smtp_password = os.getenv("SMTP_APP_PASSWORD", "").replace(" ", "")
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    if not smtp_email or not smtp_password:
        raise RuntimeError("SMTP settings are missing.")

    message = EmailMessage()
    message["Subject"] = "Reset your DevNotes password"
    message["From"] = smtp_email
    message["To"] = email

    message.set_content(
        "We received a request to reset your DevNotes password.\n\n"
        "Open the following link within 15 minutes:\n\n"
        f"{reset_url}\n\n"
        "If you did not request this, you can ignore this email."
    )

    context = ssl.create_default_context()

    with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
        server.ehlo()
        server.starttls(context=context)
        server.ehlo()
        server.login(smtp_email, smtp_password)
        server.send_message(message)


# -------------------- Authentication helpers --------------------

def create_access_token(user_id: int) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    token = credentials.credentials

    unauthorized = HTTPException(
        status_code=401,
        detail="Invalid or expired token. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )

        subject = payload.get("sub")
        if not subject:
            raise unauthorized

        user_id = int(subject)

    except (JWTError, ValueError, TypeError):
        raise unauthorized

    user = run_query(
        """
        SELECT id, name, email, created_at
        FROM users
        WHERE id = %s
        """,
        (user_id,),
        fetch_one=True,
    )

    if not user:
        raise unauthorized

    return user


# -------------------- General endpoints --------------------

@app.get("/")
def root():
    return {"message": "DevNotes API is running"}


@app.get("/api/health")
def health():
    run_query("SELECT 1", fetch_all=False)
    return {"status": "ok", "database": "connected"}


# -------------------- Registration --------------------

@app.post("/api/auth/register", status_code=201)
def register(body: RegisterRequest):
    name = body.name.strip()
    email = validate_email(body.email)

    if not name:
        raise HTTPException(
            status_code=422,
            detail="Name cannot be empty.",
        )

    existing_user = run_query(
        "SELECT id FROM users WHERE email = %s",
        (email,),
        fetch_one=True,
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    hashed_password = password_hash.hash(body.password)

    try:
        result = run_query(
            """
            INSERT INTO users (name, email, password_hash)
            VALUES (%s, %s, %s)
            """,
            (name, email, hashed_password),
            commit=True,
        )
    except HTTPException:
        existing_user = run_query(
            "SELECT id FROM users WHERE email = %s",
            (email,),
            fetch_one=True,
        )
        if existing_user:
            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists.",
            )
        raise

    user = run_query(
        """
        SELECT id, name, email, created_at
        FROM users
        WHERE id = %s
        """,
        (result["id"],),
        fetch_one=True,
    )

    return {
        "access_token": create_access_token(user["id"]),
        "token_type": "bearer",
        "user": user,
    }


# -------------------- Login --------------------

@app.post("/api/auth/login")
def login(body: LoginRequest):
    email = validate_email(body.email)

    user = run_query(
        """
        SELECT id, name, email, password_hash, created_at
        FROM users
        WHERE email = %s
        """,
        (email,),
        fetch_one=True,
    )

    if not user or not password_hash.verify(
        body.password,
        user["password_hash"],
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "access_token": create_access_token(user["id"]),
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "created_at": user["created_at"],
        },
    }


# -------------------- Get current user --------------------

@app.get("/api/auth/me")
def get_me(user=Depends(get_current_user)):
    return user


# -------------------- Forgot password --------------------

@app.post("/api/auth/forgot-password")
def forgot_password(body: ForgotPasswordRequest):
    email = validate_email(body.email)

    response_message = (
        "If an account exists for that email, "
        "a password-reset link will be sent."
    )

    user = run_query(
        "SELECT id, email FROM users WHERE email = %s",
        (email,),
        fetch_one=True,
    )

    if not user:
        return {"message": response_message}

    run_query(
        """
        UPDATE password_resets
        SET used = TRUE
        WHERE user_id = %s AND used = FALSE
        """,
        (user["id"],),
        commit=True,
    )

    token = secrets.token_urlsafe(32)
    token_hash = hash_reset_token(token)
    expires_at = datetime.now() + timedelta(minutes=15)

    run_query(
        """
        INSERT INTO password_resets
            (user_id, token_hash, expires_at, used)
        VALUES (%s, %s, %s, FALSE)
        """,
        (user["id"], token_hash, expires_at),
        commit=True,
    )

    try:
        send_reset_email(user["email"], token)
    except Exception as exc:
        run_query(
            """
            UPDATE password_resets
            SET used = TRUE
            WHERE token_hash = %s
            """,
            (token_hash,),
            commit=True,
        )

        print(f"Password reset email delivery failed: {type(exc).__name__}")

        raise HTTPException(
            status_code=503,
            detail=(
                "Unable to send the reset email. "
                "Please check the SMTP settings and try again."
            ),
        )

    return {"message": response_message}


# -------------------- Reset password --------------------

@app.post("/api/auth/reset-password")
def reset_password(body: ResetPasswordRequest):
    token_hash = hash_reset_token(body.token)

    reset_record = run_query(
        """
        SELECT id, user_id
        FROM password_resets
        WHERE token_hash = %s
          AND used = FALSE
          AND expires_at > NOW()
        """,
        (token_hash,),
        fetch_one=True,
    )

    if not reset_record:
        raise HTTPException(
            status_code=400,
            detail="This reset link is invalid or has expired.",
        )

    result = run_query(
        """
        UPDATE password_resets
        SET used = TRUE
        WHERE id = %s
          AND used = FALSE
          AND expires_at > NOW()
        """,
        (reset_record["id"],),
        commit=True,
    )

    if result["rowcount"] != 1:
        raise HTTPException(
            status_code=400,
            detail="This reset link is invalid or has expired.",
        )

    new_password_hash = password_hash.hash(body.new_password)

    run_query(
        """
        UPDATE users
        SET password_hash = %s
        WHERE id = %s
        """,
        (new_password_hash, reset_record["user_id"]),
        commit=True,
    )

    run_query(
        """
        UPDATE password_resets
        SET used = TRUE
        WHERE user_id = %s AND used = FALSE
        """,
        (reset_record["user_id"],),
        commit=True,
    )

    return {
        "message": "Password reset successful. You can now log in."
    }


# -------------------- Tags and collections helpers --------------------

def clean_tags(tags: list[str]) -> list[str]:
    """Trim tags, remove duplicates, and limit their count and length."""
    cleaned = []
    seen = set()

    for tag in tags:
        tag = str(tag).strip()[:40]
        key = tag.casefold()

        if tag and key not in seen:
            cleaned.append(tag)
            seen.add(key)

    return cleaned[:20]


def prepare_note(row):
    """Return tags as a list for the React frontend."""
    if not row:
        return row

    tags = row.get("tags") or []

    if isinstance(tags, str):
        try:
            tags = json.loads(tags)
        except (ValueError, TypeError):
            tags = []

    row["tags"] = tags if isinstance(tags, list) else []
    row["collection_name"] = row.get("collection_name") or None

    return row


# -------------------- List private notes --------------------

@app.get("/api/notes")
def list_notes(user=Depends(get_current_user)):
    rows = run_query(
        """
        SELECT id, title, language, content, favorite, tags,
               collection_name, created_at, updated_at
        FROM notes
        WHERE user_id = %s
        ORDER BY created_at DESC, id DESC
        """,
        (user["id"],),
    )

    return [prepare_note(row) for row in rows]



# -------------------- Create note --------------------

@app.post("/api/notes", status_code=201)
def create_note(
    note: NoteCreate,
    user=Depends(get_current_user),
):
    title = note.title.strip()
    content = note.content.strip()
    language = note.language.strip() or "Other"
    tags = clean_tags(note.tags)
    collection = (note.collection_name or "").strip()[:100] or None

    if not title or not content:
        raise HTTPException(
            status_code=422,
            detail="Title and content cannot be empty.",
        )

    result = run_query(
        """
        INSERT INTO notes
            (title, language, content, favorite, user_id, tags, collection_name)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (
            title,
            language,
            content,
            note.favorite,
            user["id"],
            json.dumps(tags),
            collection,
        ),
        commit=True,
    )

    row = run_query(
        """
        SELECT id, title, language, content, favorite, tags,
               collection_name, created_at, updated_at
        FROM notes
        WHERE id = %s AND user_id = %s
        """,
        (result["id"], user["id"]),
        fetch_one=True,
    )

    return prepare_note(row)


# -------------------- Update note --------------------

@app.put("/api/notes/{note_id}")
def update_note(
    note_id: int,
    note: NoteUpdate,
    user=Depends(get_current_user),
):
    title = note.title.strip()
    content = note.content.strip()
    language = note.language.strip() or "Other"
    tags = clean_tags(note.tags)
    collection = (note.collection_name or "").strip()[:100] or None

    if not title or not content:
        raise HTTPException(
            status_code=422,
            detail="Title and content cannot be empty.",
        )

    run_query(
        """
        UPDATE notes
        SET title = %s,
            language = %s,
            content = %s,
            favorite = COALESCE(%s, favorite),
            tags = %s,
            collection_name = %s
        WHERE id = %s AND user_id = %s
        """,
        (
            title,
            language,
            content,
            note.favorite,
            json.dumps(tags),
            collection,
            note_id,
            user["id"],
        ),
        commit=True,
    )

    updated = run_query(
        """
        SELECT id, title, language, content, favorite, tags,
               collection_name, created_at, updated_at
        FROM notes
        WHERE id = %s AND user_id = %s
        """,
        (note_id, user["id"]),
        fetch_one=True,
    )

    if not updated:
        raise HTTPException(
            status_code=404,
            detail="Note not found.",
        )

    return prepare_note(updated)


# -------------------- Update favorite --------------------

@app.patch("/api/notes/{note_id}/favorite")
def set_favorite(
    note_id: int,
    body: FavoriteUpdate,
    user=Depends(get_current_user),
):
    run_query(
        """
        UPDATE notes
        SET favorite = %s
        WHERE id = %s AND user_id = %s
        """,
        (body.favorite, note_id, user["id"]),
        commit=True,
    )

    updated = run_query(
        """
        SELECT id, title, language, content, favorite, tags,
               collection_name, created_at, updated_at
        FROM notes
        WHERE id = %s AND user_id = %s
        """,
        (note_id, user["id"]),
        fetch_one=True,
    )

    if not updated:
        raise HTTPException(
            status_code=404,
            detail="Note not found.",
        )

    return prepare_note(updated)


# -------------------- Delete note --------------------

@app.delete("/api/notes/{note_id}", status_code=204)
def delete_note(
    note_id: int,
    user=Depends(get_current_user),
):
    result = run_query(
        """
        DELETE FROM notes
        WHERE id = %s AND user_id = %s
        """,
        (note_id, user["id"]),
        commit=True,
    )

    if result["rowcount"] == 0:
        raise HTTPException(
            status_code=404,
            detail="Note not found.",
        )

    return Response(status_code=204)
