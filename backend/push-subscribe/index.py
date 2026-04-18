import json
import os
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p85754813_daily_planner_app")

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """Сохраняет push-подписку браузера с привязкой к user_id."""
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    body = json.loads(event.get("body") or "{}")
    user_key = body.get("user_key")
    subscription = body.get("subscription")

    if not user_key or not subscription:
        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "user_key and subscription required"})}

    # Получаем user_id из сессии если передан токен
    token = (event.get("headers") or {}).get("X-Authorization", "").replace("Bearer ", "")
    user_id = None

    conn = get_conn()
    cur = conn.cursor()

    if token:
        cur.execute(
            f"SELECT user_id FROM {SCHEMA}.sessions WHERE id = %s AND expires_at > NOW()",
            (token,)
        )
        row = cur.fetchone()
        if row:
            user_id = row[0]

    cur.execute(f"""
        INSERT INTO {SCHEMA}.push_subscriptions (user_key, subscription, tasks, reminders, user_id, updated_at)
        VALUES (%s, %s, '[]', '[]', %s, NOW())
        ON CONFLICT (user_key) DO UPDATE SET
            subscription = EXCLUDED.subscription,
            user_id = COALESCE(EXCLUDED.user_id, {SCHEMA}.push_subscriptions.user_id),
            updated_at = NOW()
    """, (user_key, json.dumps(subscription), user_id))

    conn.commit()
    cur.close()
    conn.close()

    return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True, "user_id": user_id})}
