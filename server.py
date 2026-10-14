#!/usr/bin/env python3
"""JoJo Bizarre Chess web server with SQLite-backed accounts and saves."""

from __future__ import annotations

import argparse
import hashlib
import hmac
import http.cookies
import json
import os
import re
import secrets
import sqlite3
import time
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("JOJO_DB_PATH", ROOT / "data" / "jojo_chess.sqlite3"))
SESSION_COOKIE = "jojo_session"
SESSION_SECONDS = 60 * 60 * 24 * 30
PASSWORD_ITERATIONS = 310_000
MAX_BODY_BYTES = 1_000_000
POWER_IDS = {"hamon", "arrow", "time", "crimson", "diamond", "killer"}
LOGIN_ATTEMPTS: dict[str, list[float]] = {}


class ClosingConnection(sqlite3.Connection):
    def __exit__(self, exc_type, exc_value, traceback):
        try:
            return super().__exit__(exc_type, exc_value, traceback)
        finally:
            self.close()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, timeout=15, factory=ClosingConnection)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database() -> None:
    with connect_db() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL COLLATE NOCASE UNIQUE,
                password_salt BLOB NOT NULL,
                password_hash BLOB NOT NULL,
                role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
                created_at TEXT NOT NULL,
                last_login TEXT
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at INTEGER NOT NULL,
                expires_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
            CREATE TABLE IF NOT EXISTS user_saves (
                user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                profile_json TEXT,
                active_match_json TEXT,
                updated_at TEXT NOT NULL
            );
            """
        )


def valid_username(username: str) -> bool:
    return bool(re.fullmatch(r"[A-Za-z0-9_-]{3,24}", username))


def hash_password(password: str, salt: bytes | None = None) -> tuple[bytes, bytes]:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)
    return salt, digest


def public_user(row: sqlite3.Row) -> dict[str, object]:
    return {"id": row["id"], "username": row["username"], "role": row["role"]}


def create_admin() -> None:
    initialize_database()
    username = input("Nome da conta administradora (3 a 24 caracteres): ").strip()
    if not valid_username(username):
        raise SystemExit("Nome inválido. Use letras, números, _ ou - (3 a 24 caracteres).")
    import getpass

    password = getpass.getpass("Senha de administrador (mínimo 12 caracteres): ")
    confirm = getpass.getpass("Repita a senha: ")
    if len(password) < 12 or len(password) > 128 or password != confirm:
        raise SystemExit("Senhas inválidas ou diferentes. Nenhuma conta foi criada.")
    salt, digest = hash_password(password)
    with connect_db() as db:
        db.execute(
            "INSERT INTO users(username,password_salt,password_hash,role,created_at) VALUES(?,?,?,?,?) "
            "ON CONFLICT(username) DO UPDATE SET password_salt=excluded.password_salt, "
            "password_hash=excluded.password_hash, role='admin'",
            (username, salt, digest, "admin", now_iso()),
        )
    print(f"Conta administradora '{username}' pronta. A senha não foi salva em texto legível.")


class ChessHandler(SimpleHTTPRequestHandler):
    server_version = "JoJoChess/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def translate_path(self, path: str) -> str:
        parts = Path(unquote(urlsplit(path).path).lstrip("/")).parts
        if (
            any(part.startswith(".") for part in parts)
            or (parts and parts[0] in {"data", "__pycache__"})
            or (parts and parts[0] == "server.py")
        ):
            return str(ROOT / "__jojo_private_file_not_found__")
        return super().translate_path(path)

    def end_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        super().end_headers()

    def _json(self, status: int, value: object, extra_headers: dict[str, str] | None = None) -> None:
        payload = json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        if extra_headers:
            for name, header_value in extra_headers.items():
                self.send_header(name, header_value)
        self.end_headers()
        self.wfile.write(payload)

    def _body(self) -> dict:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise ValueError("Requisição inválida.")
        if length < 1 or length > MAX_BODY_BYTES:
            raise ValueError("O pedido está vazio ou é grande demais.")
        try:
            value = json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            raise ValueError("JSON inválido.")
        if not isinstance(value, dict):
            raise ValueError("Formato de pedido inválido.")
        return value

    def _client_ip(self) -> str:
        return self.client_address[0]

    def _rate_limited(self, bucket: str, limit: int, window: int) -> bool:
        now = time.time()
        events = [event for event in LOGIN_ATTEMPTS.get(bucket, []) if now - event < window]
        if len(events) >= limit:
            LOGIN_ATTEMPTS[bucket] = events
            return True
        events.append(now)
        LOGIN_ATTEMPTS[bucket] = events
        return False

    def _session_token(self) -> str | None:
        cookie = http.cookies.SimpleCookie()
        try:
            cookie.load(self.headers.get("Cookie", ""))
            return cookie[SESSION_COOKIE].value if SESSION_COOKIE in cookie else None
        except http.cookies.CookieError:
            return None

    def _current_user(self) -> sqlite3.Row | None:
        token = self._session_token()
        if not token:
            return None
        token_hash = hashlib.sha256(token.encode("ascii")).hexdigest()
        with connect_db() as db:
            row = db.execute(
                "SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id "
                "WHERE sessions.token_hash=? AND sessions.expires_at>?",
                (token_hash, int(time.time())),
            ).fetchone()
            if row is None:
                db.execute("DELETE FROM sessions WHERE token_hash=? OR expires_at<=?", (token_hash, int(time.time())))
            return row

    def _require_user(self) -> sqlite3.Row | None:
        user = self._current_user()
        if user is None:
            self._json(401, {"error": "Entre na sua conta para continuar."})
        return user

    def _create_session(self, user_id: int) -> str:
        token = secrets.token_urlsafe(32)
        now = int(time.time())
        with connect_db() as db:
            db.execute("DELETE FROM sessions WHERE expires_at<=?", (now,))
            db.execute(
                "INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)",
                (hashlib.sha256(token.encode("ascii")).hexdigest(), user_id, now, now + SESSION_SECONDS),
            )
        return token

    def _session_cookie(self, token: str, max_age: int = SESSION_SECONDS) -> str:
        secure = "; Secure" if self.headers.get("X-Forwarded-Proto", "").lower() == "https" else ""
        return f"{SESSION_COOKIE}={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age={max_age}{secure}"

    def do_GET(self) -> None:
        path = urlsplit(self.path).path
        if path == "/api/auth/me":
            user = self._current_user()
            self._json(200, {"user": public_user(user) if user else None})
            return
        if path == "/api/state":
            user = self._require_user()
            if user is None:
                return
            with connect_db() as db:
                row = db.execute("SELECT profile_json,active_match_json FROM user_saves WHERE user_id=?", (user["id"],)).fetchone()
            state = {"profile": None, "activeMatch": None}
            if row:
                state["profile"] = json.loads(row["profile_json"]) if row["profile_json"] else None
                state["activeMatch"] = json.loads(row["active_match_json"]) if row["active_match_json"] else None
            self._json(200, state)
            return
        if path == "/api/admin/users":
            user = self._require_user()
            if user is None:
                return
            if user["role"] != "admin":
                self._json(403, {"error": "A área VIP é exclusiva da administração."})
                return
            with connect_db() as db:
                users = db.execute("SELECT id,username,role,created_at,last_login FROM users ORDER BY id").fetchall()
            self._json(200, {"users": [dict(row) for row in users]})
            return
        super().do_GET()

    def do_POST(self) -> None:
        path = urlsplit(self.path).path
        if path not in {"/api/auth/register", "/api/auth/login", "/api/auth/logout"}:
            self._json(404, {"error": "Rota não encontrada."})
            return
        try:
            body = self._body()
        except ValueError as error:
            self._json(400, {"error": str(error)})
            return

        if path == "/api/auth/logout":
            token = self._session_token()
            if token:
                with connect_db() as db:
                    db.execute("DELETE FROM sessions WHERE token_hash=?", (hashlib.sha256(token.encode("ascii")).hexdigest(),))
            self._json(200, {"ok": True}, {"Set-Cookie": self._session_cookie("", 0)})
            return

        username = str(body.get("username", "")).strip()
        password = body.get("password", "")
        if not isinstance(password, str):
            self._json(400, {"error": "Informe nome e senha válidos."})
            return
        if len(password) > 128:
            self._json(400, {"error": "A senha deve ter no máximo 128 caracteres."})
            return

        if path.endswith("register"):
            if self._rate_limited(f"register:{self._client_ip()}", 10, 3600):
                self._json(429, {"error": "Muitas tentativas. Aguarde um pouco e tente novamente."})
                return
            if not valid_username(username):
                self._json(400, {"error": "Use um nome de 3 a 24 caracteres, com letras, números, _ ou -."})
                return
            if len(password) < 10 or len(password) > 128:
                self._json(400, {"error": "A senha deve ter entre 10 e 128 caracteres."})
                return
            salt, digest = hash_password(password)
            try:
                with connect_db() as db:
                    cursor = db.execute(
                        "INSERT INTO users(username,password_salt,password_hash,role,created_at) VALUES(?,?,?,?,?)",
                        (username, salt, digest, "user", now_iso()),
                    )
                    user_id = cursor.lastrowid
            except sqlite3.IntegrityError:
                self._json(409, {"error": "Esse nome já está em uso."})
                return
        else:
            if self._rate_limited(f"login:{self._client_ip()}", 10, 900):
                self._json(429, {"error": "Muitas tentativas de acesso. Aguarde 15 minutos."})
                return
            with connect_db() as db:
                row = db.execute("SELECT * FROM users WHERE username=? COLLATE NOCASE", (username,)).fetchone()
                salt = row["password_salt"] if row else b"jojo-chess-login-salt"
                expected = row["password_hash"] if row else b"\0" * 32
                _, actual = hash_password(password[:128], salt)
                if not row or not hmac.compare_digest(actual, expected):
                    self._json(401, {"error": "Nome ou senha incorretos."})
                    return
                db.execute("UPDATE users SET last_login=? WHERE id=?", (now_iso(), row["id"]))
                user_id = row["id"]

        token = self._create_session(user_id)
        with connect_db() as db:
            user = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        self._json(200, {"user": public_user(user)}, {"Set-Cookie": self._session_cookie(token)})

    def do_PUT(self) -> None:
        if urlsplit(self.path).path != "/api/state":
            self._json(404, {"error": "Rota não encontrada."})
            return
        user = self._require_user()
        if user is None:
            return
        try:
            body = self._body()
        except ValueError as error:
            self._json(400, {"error": str(error)})
            return
        if not set(body).issubset({"profile", "activeMatch"}):
            self._json(400, {"error": "Dados de progresso inválidos."})
            return
        with connect_db() as db:
            current = db.execute("SELECT profile_json,active_match_json FROM user_saves WHERE user_id=?", (user["id"],)).fetchone()
            profile_json = current["profile_json"] if current else None
            match_json = current["active_match_json"] if current else None
            if "profile" in body:
                profile = body["profile"]
                if profile is not None and not isinstance(profile, dict):
                    self._json(400, {"error": "Perfil inválido."})
                    return
                if profile is not None:
                    coins = profile.get("coins", 0)
                    if not isinstance(coins, (int, float)) or isinstance(coins, bool) or not 0 <= coins <= 1_000_000_000:
                        self._json(400, {"error": "Quantidade de moedas inválida."})
                        return
                    powers = profile.get("unlockedPowers", [])
                    if not isinstance(powers, list) or not all(power in POWER_IDS for power in powers):
                        self._json(400, {"error": "Lista de poderes inválida."})
                        return
                    profile_json = json.dumps(profile, ensure_ascii=False, separators=(",", ":"))
            if "activeMatch" in body:
                match = body["activeMatch"]
                if match is not None and (not isinstance(match, dict) or match.get("version") != 1):
                    self._json(400, {"error": "Dados da partida inválidos."})
                    return
                match_json = json.dumps(match, ensure_ascii=False, separators=(",", ":")) if match is not None else None
            db.execute(
                "INSERT INTO user_saves(user_id,profile_json,active_match_json,updated_at) VALUES(?,?,?,?) "
                "ON CONFLICT(user_id) DO UPDATE SET profile_json=excluded.profile_json, "
                "active_match_json=excluded.active_match_json,updated_at=excluded.updated_at",
                (user["id"], profile_json, match_json, now_iso()),
            )
        self._json(200, {"ok": True})

    def log_message(self, fmt: str, *args) -> None:
        # Keep standard access logging without ever logging request bodies.
        super().log_message(fmt, *args)


def run_server(host: str, port: int) -> None:
    initialize_database()
    server = ThreadingHTTPServer((host, port), ChessHandler)
    print(f"JoJo Bizarre Chess disponível em http://{host}:{port}")
    print(f"Banco SQLite: {DB_PATH}")
    server.serve_forever()


def main() -> None:
    parser = argparse.ArgumentParser(description="Servidor do JoJo Bizarre Chess")
    parser.add_argument("--host", default="127.0.0.1", help="interface de rede (padrão: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="porta HTTP (padrão: 8000)")
    parser.add_argument("--create-admin", action="store_true", help="cria ou redefine uma conta de administrador VIP")
    args = parser.parse_args()
    if args.create_admin:
        create_admin()
    else:
        run_server(args.host, args.port)


if __name__ == "__main__":
    main()
