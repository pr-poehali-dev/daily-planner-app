import json
import os
import hashlib
import secrets
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p85754813_daily_planner_app")

HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def ok(data):
    return {"statusCode": 200, "headers": HEADERS, "body": json.dumps(data)}

def err(code, msg):
    return {"statusCode": code, "headers": HEADERS, "body": json.dumps({"error": msg})}

def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def get_user_id(conn, token: str):
    cur = conn.cursor()
    cur.execute(
        f"SELECT u.id FROM {SCHEMA}.users u JOIN {SCHEMA}.sessions s ON s.user_id = u.id WHERE s.id = %s AND s.expires_at > NOW()",
        (token,)
    )
    row = cur.fetchone()
    cur.close()
    return row[0] if row else None

def task_row(r):
    return {"id": r[0], "text": r[1], "done": r[2], "priority": r[3],
            "category": r[4], "date": r[5], "time": r[6] or "",
            "advance": r[7] or "none", "advanceTime": r[8] or "",
            "melody": r[9] if len(r) > 9 else "classic"}

def reminder_row(r):
    return {"id": r[0], "title": r[1], "time": r[2], "date": r[3] or "",
            "repeat": r[4], "active": r[5], "icon": r[6], "advance": r[7] or "none"}

def handler(event: dict, context) -> dict:
    """Единый API: auth + tasks + reminders"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": HEADERS, "body": ""}

    method = event.get("httpMethod", "GET")
    # Роут берём из queryStringParameters["route"] или последней части path
    raw_path = event.get("path", "/")
    qs = event.get("queryStringParameters") or {}
    route = qs.get("route", raw_path).lstrip("/").rstrip("/")
    path = "/" + route  # нормализованный путь: /register, /tasks, /tasks/123
    token = (event.get("headers") or {}).get("X-Authorization", "").replace("Bearer ", "")
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    conn = get_conn()

    # ══════════════ AUTH ══════════════

    if path.endswith("/register") and method == "POST":
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""
        name = (body.get("name") or "").strip()
        if not email or not password:
            conn.close(); return err(400, "Email и пароль обязательны")
        if len(password) < 6:
            conn.close(); return err(400, "Пароль минимум 6 символов")
        cur = conn.cursor()
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email = %s", (email,))
        if cur.fetchone():
            cur.close(); conn.close(); return err(409, "Email уже зарегистрирован")
        cur.execute(
            f"INSERT INTO {SCHEMA}.users (email, name, password_hash) VALUES (%s,%s,%s) RETURNING id",
            (email, name or email.split("@")[0], hash_pw(password))
        )
        user_id = cur.fetchone()[0]
        conn.commit(); cur.close()
        tok = secrets.token_hex(32)
        cur2 = conn.cursor()
        cur2.execute(f"INSERT INTO {SCHEMA}.sessions (id, user_id) VALUES (%s,%s)", (tok, user_id))
        conn.commit(); cur2.close(); conn.close()
        return ok({"token": tok, "user": {"id": user_id, "email": email, "name": name or email.split("@")[0]}})

    if path.endswith("/login") and method == "POST":
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, email, name FROM {SCHEMA}.users WHERE email = %s AND password_hash = %s",
            (email, hash_pw(password))
        )
        row = cur.fetchone(); cur.close()
        if not row:
            conn.close(); return err(401, "Неверный email или пароль")
        user_id, ue, un = row
        tok = secrets.token_hex(32)
        cur2 = conn.cursor()
        cur2.execute(f"INSERT INTO {SCHEMA}.sessions (id, user_id) VALUES (%s,%s)", (tok, user_id))
        conn.commit(); cur2.close(); conn.close()
        return ok({"token": tok, "user": {"id": user_id, "email": ue, "name": un}})

    if path.endswith("/logout") and method == "POST":
        if token:
            cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE id = %s", (token,))
            conn.commit(); cur.close()
        conn.close(); return ok({"ok": True})

    if path.endswith("/me") and method == "GET":
        if not token:
            conn.close(); return err(401, "Не авторизован")
        uid = get_user_id(conn, token)
        if not uid:
            conn.close(); return err(401, "Сессия истекла")
        cur = conn.cursor()
        cur.execute(f"SELECT id, email, name FROM {SCHEMA}.users WHERE id = %s", (uid,))
        row = cur.fetchone(); cur.close(); conn.close()
        return ok({"user": {"id": row[0], "email": row[1], "name": row[2]}})

    # ══════════════ TASKS ══════════════

    if "/tasks" in path:
        if not token:
            conn.close(); return err(401, "Не авторизован")
        uid = get_user_id(conn, token)
        if not uid:
            conn.close(); return err(401, "Сессия истекла")

        cur = conn.cursor()
        parts = path.split("/")

        if method == "GET":
            cur.execute(
                f"SELECT id, text, done, priority, category, date, time, advance, advance_time, COALESCE(melody, 'classic') FROM {SCHEMA}.tasks WHERE user_id = %s ORDER BY sort_order, created_at",
                (uid,)
            )
            tasks = [task_row(r) for r in cur.fetchall()]
            cur.close(); conn.close(); return ok(tasks)

        if method == "POST" and path.endswith("/tasks"):
            text = (body.get("text") or "").strip()
            if not text:
                cur.close(); conn.close(); return err(400, "Текст обязателен")
            cur.execute(
                f"INSERT INTO {SCHEMA}.tasks (user_id, text, priority, category, date, time, advance, advance_time, melody, sort_order) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,(SELECT COALESCE(MAX(sort_order),0)+1 FROM {SCHEMA}.tasks WHERE user_id=%s)) RETURNING id, text, done, priority, category, date, time, advance, advance_time, COALESCE(melody, 'classic')",
                (uid, text, body.get("priority","medium"), body.get("category","Общее"),
                 body.get("date",""), body.get("time",""), body.get("advance","none"),
                 body.get("advanceTime",""), body.get("melody","classic"), uid)
            )
            t = task_row(cur.fetchone()); conn.commit(); cur.close(); conn.close(); return ok(t)

        if method == "PUT" and len(parts) >= 2:
            tid = parts[-1]
            fields, vals = [], []
            for f, col in [("text","text"),("done","done"),("priority","priority"),("category","category"),
                           ("date","date"),("time","time"),("advance","advance"),("advanceTime","advance_time"),
                           ("melody","melody")]:
                if f in body:
                    fields.append(f"{col} = %s"); vals.append(body[f])
            if not fields:
                cur.close(); conn.close(); return err(400, "Нет полей")
            vals += [tid, uid]
            cur.execute(f"UPDATE {SCHEMA}.tasks SET {', '.join(fields)} WHERE id = %s AND user_id = %s RETURNING id, text, done, priority, category, date, time, advance, advance_time, COALESCE(melody, 'classic')", vals)
            row = cur.fetchone(); conn.commit(); cur.close(); conn.close()
            return ok(task_row(row)) if row else err(404, "Не найдено")

        if method == "DELETE" and len(parts) >= 2:
            tid = parts[-1]
            cur.execute(f"UPDATE {SCHEMA}.tasks SET done = true WHERE id = %s AND user_id = %s", (tid, uid))
            conn.commit(); cur.close(); conn.close(); return ok({"ok": True})

        cur.close(); conn.close()

    # ══════════════ REMINDERS ══════════════

    if "/reminders" in path:
        if not token:
            conn.close(); return err(401, "Не авторизован")
        uid = get_user_id(conn, token)
        if not uid:
            conn.close(); return err(401, "Сессия истекла")

        cur = conn.cursor()
        parts = path.split("/")

        if method == "GET":
            cur.execute(
                f"SELECT id, title, time, date, repeat, active, icon, advance FROM {SCHEMA}.reminders WHERE user_id = %s ORDER BY created_at",
                (uid,)
            )
            result = [reminder_row(r) for r in cur.fetchall()]
            cur.close(); conn.close(); return ok(result)

        if method == "POST" and path.endswith("/reminders"):
            title = (body.get("title") or "").strip()
            time_val = (body.get("time") or "").strip()
            if not title or not time_val:
                cur.close(); conn.close(); return err(400, "Название и время обязательны")
            cur.execute(
                f"INSERT INTO {SCHEMA}.reminders (user_id, title, time, date, repeat, active, icon, advance) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id, title, time, date, repeat, active, icon, advance",
                (uid, title, time_val, body.get("date",""), body.get("repeat","once"),
                 body.get("active", True), body.get("icon","Bell"), body.get("advance","none"))
            )
            r = reminder_row(cur.fetchone()); conn.commit(); cur.close(); conn.close(); return ok(r)

        if method == "PUT" and len(parts) >= 2:
            rid = parts[-1]
            fields, vals = [], []
            for f, col in [("title","title"),("time","time"),("date","date"),("repeat","repeat"),("active","active"),("icon","icon"),("advance","advance")]:
                if f in body:
                    fields.append(f"{col} = %s"); vals.append(body[f])
            if fields:
                vals += [rid, uid]
                cur.execute(f"UPDATE {SCHEMA}.reminders SET {', '.join(fields)} WHERE id = %s AND user_id = %s RETURNING id, title, time, date, repeat, active, icon, advance", vals)
                row = cur.fetchone(); conn.commit(); cur.close(); conn.close()
                return ok(reminder_row(row)) if row else err(404, "Не найдено")

        if method == "DELETE" and len(parts) >= 2:
            rid = parts[-1]
            cur.execute(f"UPDATE {SCHEMA}.reminders SET active = false WHERE id = %s AND user_id = %s", (rid, uid))
            conn.commit(); cur.close(); conn.close(); return ok({"ok": True})

        cur.close(); conn.close()

    conn.close()
    return err(404, "Not found")