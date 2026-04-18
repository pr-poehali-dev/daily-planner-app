import json
import os
import time
import psycopg2
from datetime import datetime, timedelta
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

def get_fire_times(task_id, text, date, time_val, advance, advance_time, tz_offset_min=0):
    if not date or not time_val:
        return []
    results = []
    try:
        local_dt = datetime.fromisoformat(date + "T" + time_val + ":00")
        base = local_dt - timedelta(minutes=tz_offset_min)
    except Exception:
        return []

    results.append({
        "fire_at": base,
        "tag": f"task-{task_id}-exact",
        "title": "Ежедневник",
        "body": f"🔔 {text}",
    })

    adv = advance or "none"
    adv_min = ADVANCE_MINUTES.get(adv, 0) if adv not in ("none", "custom", "") else 0
    if adv_min > 0:
        results.append({
            "fire_at": base - timedelta(minutes=adv_min),
            "tag": f"task-{task_id}-advance",
            "title": "Напоминание",
            "body": f"⏰ {'%d мин' % adv_min if adv_min < 60 else '%d ч' % (adv_min // 60)} до: {text}",
        })

    if adv == "custom" and advance_time:
        try:
            h, m = map(int, advance_time.split(":"))
            custom_local = datetime.fromisoformat(date + "T00:00:00").replace(hour=h, minute=m)
            results.append({
                "fire_at": custom_local - timedelta(minutes=tz_offset_min),
                "tag": f"task-{task_id}-custom",
                "title": "Напоминание",
                "body": f"📌 {text}",
            })
        except Exception:
            pass

    return results

def get_reminder_fire(reminder_id, title, time_val, tz_offset_min=0):
    if not time_val:
        return None
    try:
        h, m = map(int, time_val.split(":"))
        now_utc = datetime.utcnow()
        now_local = now_utc + timedelta(minutes=tz_offset_min)
        base_local = now_local.replace(hour=h, minute=m, second=0, microsecond=0)
        if base_local < now_local:
            base_local += timedelta(days=1)
        base_utc = base_local - timedelta(minutes=tz_offset_min)
        today_local = now_local.strftime("%Y-%m-%d")
        return {
            "fire_at": base_utc,
            "tag": f"reminder-{reminder_id}-{today_local}",
            "title": "Напоминание",
            "body": f"🔔 {title} · {time_val}",
        }
    except Exception:
        return None

def send_push(subscription: dict, title: str, body: str, tag: str):
    sub_clean = {k: v for k, v in subscription.items() if k != "tz_offset_min"}
    webpush(
        subscription_info=sub_clean,
        data=json.dumps({"title": title, "body": body, "tag": tag}),
        vapid_private_key=VAPID_PRIVATE,
        vapid_claims=VAPID_CLAIMS,
    )

def run_tick(conn, cur, now: datetime) -> tuple[int, int, int]:
    """Один тик: проверяет задачи/напоминания и шлёт пуши. Возвращает (sent, errors, subs)."""
    cur.execute(f"""
        SELECT ps.user_key, ps.subscription, ps.user_id,
               COALESCE((ps.subscription->>'tz_offset_min')::int, 0) as tz
        FROM {SCHEMA}.push_subscriptions ps
        WHERE ps.user_id IS NOT NULL
    """)
    subscriptions = cur.fetchall()

    # Окно 90 секунд — с запасом перекрывает интервал между тиками
    window = timedelta(seconds=90)
    sent = 0
    errors = 0
    print(f"[push] tick {now.isoformat()}Z subs={len(subscriptions)}")

    for (user_key, subscription, user_id, tz_offset) in subscriptions:
        all_items = []

        cur.execute(f"""
            SELECT id, text, date, time, advance, advance_time
            FROM {SCHEMA}.tasks
            WHERE user_id = %s AND done = false
              AND time IS NOT NULL AND time != ''
        """, (user_id,))
        for (tid, text, date, time_val, advance, adv_time) in cur.fetchall():
            all_items.extend(get_fire_times(tid, text, date, time_val, advance, adv_time or "", tz_offset))

        cur.execute(f"""
            SELECT id, title, time FROM {SCHEMA}.reminders
            WHERE user_id = %s AND active = true
        """, (user_id,))
        for (rid, title, time_val) in cur.fetchall():
            ft = get_reminder_fire(rid, title, time_val, tz_offset)
            if ft:
                all_items.append(ft)

        for item in all_items:
            if not (item["fire_at"] <= now <= item["fire_at"] + window):
                continue

            cur.execute(
                f"SELECT 1 FROM {SCHEMA}.push_fired WHERE user_key = %s AND tag = %s",
                (user_key, item["tag"])
            )
            if cur.fetchone():
                continue

            print(f"[push] firing {item['tag']}")
            try:
                send_push(subscription, item["title"], item["body"], item["tag"])
                cur.execute(
                    f"INSERT INTO {SCHEMA}.push_fired (user_key, tag) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (user_key, item["tag"])
                )
                conn.commit()
                sent += 1
                print(f"[push] sent ok {item['tag']}")
            except WebPushException as e:
                status = e.response.status_code if e.response else 0
                txt = e.response.text[:200] if e.response else ""
                print(f"[push] WebPushException {status}: {txt}")
                errors += 1
                if status in (404, 410):
                    cur.execute(
                        f"UPDATE {SCHEMA}.push_subscriptions SET updated_at = NOW() WHERE user_key = %s",
                        (user_key,)
                    )
                    conn.commit()
            except Exception as ex:
                print(f"[push] Exception {type(ex).__name__}: {ex}")
                errors += 1

    return sent, errors, len(subscriptions)


def handler(event: dict, context) -> dict:
    """Планировщик: за один вызов тикает 5 раз с интервалом 60 сек, покрывая ~5 минут."""
    headers = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS"}

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    if not VAPID_PRIVATE or not VAPID_PUBLIC:
        return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": "VAPID keys not configured"})}

    conn = get_conn()
    cur = conn.cursor()

    total_sent = 0
    total_errors = 0
    total_subs = 0
    TICKS = 3
    INTERVAL = 55

    for i in range(TICKS):
        now = datetime.utcnow()
        try:
            s, e, n = run_tick(conn, cur, now)
            total_sent += s
            total_errors += e
            total_subs = n
        except Exception as ex:
            print(f"[push] tick error: {type(ex).__name__}: {ex}")
            try:
                conn.rollback()
            except Exception:
                pass

        if i < TICKS - 1:
            time.sleep(INTERVAL)

    cur.close()
    conn.close()
    return {"statusCode": 200, "headers": headers, "body": json.dumps({"sent": total_sent, "errors": total_errors, "checked": total_subs, "ticks": TICKS})}