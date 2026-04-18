import json
import os
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p85754813_daily_planner_app")

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """Сохраняет push-подписку браузера и данные задач пользователя."""
    headers = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS"}

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    body = json.loads(event.get("body") or "{}")
    user_key = body.get("user_key")
    subscription = body.get("subscription")
    tasks = body.get("tasks", [])
    reminders = body.get("reminders", [])

    if not user_key or not subscription:
        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "user_key and subscription required"})}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"""
        INSERT INTO {SCHEMA}.push_subscriptions (user_key, subscription, tasks, reminders, updated_at)
        VALUES (%s, %s, %s, %s, NOW())
        ON CONFLICT (user_key) DO UPDATE SET
            subscription = EXCLUDED.subscription,
            tasks = EXCLUDED.tasks,
            reminders = EXCLUDED.reminders,
            updated_at = NOW()
    """, (user_key, json.dumps(subscription), json.dumps(tasks), json.dumps(reminders)))
    conn.commit()
    cur.close()
    conn.close()

    return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}
