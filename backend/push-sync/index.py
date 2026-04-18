import json
import os
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p85754813_daily_planner_app")

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """Обновляет задачи и напоминания для существующей подписки."""
    headers = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS"}

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    body = json.loads(event.get("body") or "{}")
    user_key = body.get("user_key")
    tasks = body.get("tasks", [])
    reminders = body.get("reminders", [])

    if not user_key:
        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "user_key required"})}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"""
        UPDATE {SCHEMA}.push_subscriptions
        SET tasks = %s, reminders = %s, updated_at = NOW()
        WHERE user_key = %s
    """, (json.dumps(tasks), json.dumps(reminders), user_key))
    conn.commit()
    cur.close()
    conn.close()

    return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}
