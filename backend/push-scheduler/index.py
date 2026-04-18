import json
import os
import psycopg2
from datetime import datetime, timedelta, timezone
from pywebpush import webpush, WebPushException

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p85754813_daily_planner_app")
VAPID_PRIVATE = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_CLAIMS = {"sub": "mailto:push@diary.app"}

ADVANCE_MINUTES = {
    "За 15 мин": 15,
    "За 1 час": 60,
    "За 3 часа": 180,
    "За 6 часов": 360,
    "За 1 день": 1440,
    "За 2 дня": 2880,
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def get_fire_times(task: dict, tz_offset_min: int = 0):
    """Возвращает список {fire_at, tag, title, body} для задачи. tz_offset_min — смещение пользователя от UTC в минутах (напр. +180 для МСК)."""
    if task.get("done") or not task.get("date") or not task.get("time"):
        return []
    results = []
    try:
        base_str = task["date"] + "T" + task["time"] + ":00"
        # Парсим как local time, затем конвертируем в UTC вычитая смещение
        local_dt = datetime.fromisoformat(base_str)
        base = local_dt - timedelta(minutes=tz_offset_min)  # naive UTC
    except Exception:
        return []

    results.append({
        "fire_at": base,
        "tag": f"task-{task['id']}-exact",
        "title": "Ежедневник",
        "body": f"🔔 {task['text']}",
    })

    advance = task.get("advance", "none")
    adv_min = ADVANCE_MINUTES.get(advance, 0) if advance not in ("none", "custom") else 0
    if adv_min > 0:
        results.append({
            "fire_at": base - timedelta(minutes=adv_min),
            "tag": f"task-{task['id']}-advance",
            "title": "Напоминание",
            "body": f"⏰ {'%d мин' % adv_min if adv_min < 60 else '%d ч' % (adv_min // 60)} до: {task['text']}",
        })

    if advance == "custom" and task.get("advanceTime"):
        try:
            h, m = map(int, task["advanceTime"].split(":"))
            custom = datetime.fromisoformat(task["date"] + "T00:00:00").replace(tzinfo=timezone.utc)
            custom = custom.replace(hour=h, minute=m)
            results.append({
                "fire_at": custom,
                "tag": f"task-{task['id']}-custom",
                "title": "Напоминание",
                "body": f"📌 {task['text']}",
            })
        except Exception:
            pass

    return results

def get_reminder_fire(reminder: dict):
    if not reminder.get("active") or not reminder.get("time"):
        return None
    try:
        h, m = map(int, reminder["time"].split(":"))
        now = datetime.utcnow()
        base = now.replace(hour=h, minute=m, second=0, microsecond=0)
        if base < now:
            base += timedelta(days=1)
        today = now.strftime("%Y-%m-%d")
        return {
            "fire_at": base,
            "tag": f"reminder-{reminder['id']}-{today}",
            "title": "Напоминание",
            "body": f"🔔 {reminder['title']} · {reminder['time']}",
        }
    except Exception:
        return None

def send_push(subscription: dict, title: str, body: str, tag: str):
    payload = json.dumps({"title": title, "body": body, "tag": tag})
    webpush(
        subscription_info=subscription,
        data=payload,
        vapid_private_key=VAPID_PRIVATE,
        vapid_claims=VAPID_CLAIMS,
    )

def handler(event: dict, context) -> dict:
    """Планировщик: каждую минуту проверяет все подписки и шлёт пуши по расписанию."""
    headers = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS"}

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    if not VAPID_PRIVATE or not VAPID_PUBLIC:
        return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": "VAPID keys not configured"})}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT user_key, subscription, tasks, reminders FROM {SCHEMA}.push_subscriptions")
    rows = cur.fetchall()

    # Используем naive datetime (без timezone) — время задач хранится без TZ
    now = datetime.utcnow()
    window = timedelta(seconds=90)
    sent = 0
    errors = 0
    print(f"[push] scheduler tick at {now.isoformat()}Z, subscriptions={len(rows)}")

    for (user_key, subscription, tasks, reminders) in rows:
        all_items = []
        # tz_offset хранится в подписке (минуты от UTC, например +180 для МСК)
        tz_offset = subscription.get("tz_offset_min", 0) if isinstance(subscription, dict) else 0

        for task in (tasks or []):
            all_items.extend(get_fire_times(task, tz_offset))

        for reminder in (reminders or []):
            ft = get_reminder_fire(reminder)
            if ft:
                all_items.append(ft)

        for item in all_items:
            fire_at = item["fire_at"]
            tag = item["tag"]

            if not (fire_at <= now <= fire_at + window):
                continue

            # Проверяем не отправляли ли уже
            cur.execute(
                f"SELECT 1 FROM {SCHEMA}.push_fired WHERE user_key = %s AND tag = %s",
                (user_key, tag)
            )
            if cur.fetchone():
                continue

            # Отправляем
            print(f"[push] firing tag={tag} to user={user_key[:12]}")
            try:
                send_push(subscription, item["title"], item["body"], tag)
                cur.execute(
                    f"INSERT INTO {SCHEMA}.push_fired (user_key, tag) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (user_key, tag)
                )
                conn.commit()
                sent += 1
                print(f"[push] sent ok tag={tag}")
            except WebPushException as e:
                resp_text = e.response.text if e.response else "no response"
                status = e.response.status_code if e.response else 0
                print(f"[push] WebPushException status={status} body={resp_text}")
                errors += 1
                if e.response and e.response.status_code in (404, 410):
                    print(f"[push] subscription expired, deleting user={user_key[:12]}")
                    cur.execute(f"DELETE FROM {SCHEMA}.push_subscriptions WHERE user_key = %s", (user_key,))
                    conn.commit()
            except Exception as e:
                print(f"[push] Exception: {type(e).__name__}: {e}")
                errors += 1

    cur.close()
    conn.close()

    return {"statusCode": 200, "headers": headers, "body": json.dumps({"sent": sent, "errors": errors, "checked": len(rows)})}