import json
import os
import psycopg2
from datetime import datetime, timedelta
from pywebpush import webpush, WebPushException

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p85754813_daily_planner_app")
VAPID_PUBLIC = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_CLAIMS = {"sub": "mailto:push@diary.app"}


def normalize_vapid_private_key(raw: str) -> str:
    """Нормализует VAPID private key:
    - заменяет литеральные \\n на реальные переносы
    - если PEM одной строкой — восстанавливает стандартный многострочный PEM."""
    if not raw:
        return raw
    s = raw.strip()
    # Заменяем литеральные \n которые могли попасть при копипасте
    if "\\n" in s and "\n" not in s:
        s = s.replace("\\n", "\n")
    # Уже с переносами и не нуждается в доработке
    if "\n" in s and "-----BEGIN" in s and "-----END" in s:
        # Нормализуем: извлекаем тело заново и переформатируем (на случай неправильных разрывов)
        for header, footer in [
            ("-----BEGIN EC PRIVATE KEY-----", "-----END EC PRIVATE KEY-----"),
            ("-----BEGIN PRIVATE KEY-----", "-----END PRIVATE KEY-----"),
        ]:
            if header in s and footer in s:
                body = s.split(header, 1)[1].split(footer, 1)[0]
                body = "".join(body.split())  # убираем все whitespace
                lines = [body[i:i + 64] for i in range(0, len(body), 64)]
                return header + "\n" + "\n".join(lines) + "\n" + footer
        return s
    # Однострочный PEM: извлекаем base64 тело и форматируем по 64 символа
    for header, footer in [
        ("-----BEGIN EC PRIVATE KEY-----", "-----END EC PRIVATE KEY-----"),
        ("-----BEGIN PRIVATE KEY-----", "-----END PRIVATE KEY-----"),
    ]:
        if header in s and footer in s:
            body = s.split(header, 1)[1].split(footer, 1)[0].strip()
            body = "".join(body.split())
            lines = [body[i:i + 64] for i in range(0, len(body), 64)]
            return header + "\n" + "\n".join(lines) + "\n" + footer
    return s


VAPID_PRIVATE = normalize_vapid_private_key(os.environ.get("VAPID_PRIVATE_KEY", ""))


def convert_ec_to_pkcs8(pem: str) -> str:
    """Конвертирует PEM из SEC1 (EC PRIVATE KEY) в PKCS8 (PRIVATE KEY)."""
    try:
        from cryptography.hazmat.primitives import serialization
        key = serialization.load_pem_private_key(pem.encode(), password=None)
        pkcs8 = key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
        return pkcs8.decode()
    except Exception as e:
        print(f"[push] convert_ec_to_pkcs8 failed: {type(e).__name__}: {e}")
        return pem


def extract_raw_private_key(pem: str) -> str:
    """Извлекает 32-байтный приватный ключ из PEM в base64url (без padding).
    py-vapid принимает такой формат и не требует ASN.1 парсинга."""
    try:
        import base64
        from cryptography.hazmat.primitives import serialization
        key = serialization.load_pem_private_key(pem.encode(), password=None)
        raw_int = key.private_numbers().private_value
        raw_bytes = raw_int.to_bytes(32, "big")
        return base64.urlsafe_b64encode(raw_bytes).decode().rstrip("=")
    except Exception as e:
        print(f"[push] extract_raw_private_key failed: {type(e).__name__}: {e}")
        return ""


VAPID_PRIVATE_PKCS8 = convert_ec_to_pkcs8(VAPID_PRIVATE) if VAPID_PRIVATE else ""
VAPID_PRIVATE_RAW = extract_raw_private_key(VAPID_PRIVATE) if VAPID_PRIVATE else ""

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

def get_fire_times(task_id, text, date, time_val, advance, advance_time, tz_offset_min=0, melody="classic"):
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
        "melody": melody,
    })

    adv = advance or "none"
    adv_min = ADVANCE_MINUTES.get(adv, 0) if adv not in ("none", "custom", "") else 0
    if adv_min > 0:
        results.append({
            "fire_at": base - timedelta(minutes=adv_min),
            "tag": f"task-{task_id}-advance",
            "title": "Напоминание",
            "body": f"⏰ {'%d мин' % adv_min if adv_min < 60 else '%d ч' % (adv_min // 60)} до: {text}",
            "melody": melody,
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
                "melody": melody,
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

def send_push(subscription: dict, title: str, body: str, tag: str, melody: str = "classic"):
    sub_clean = {k: v for k, v in subscription.items() if k != "tz_offset_min"}
    key_to_use = VAPID_PRIVATE_RAW or VAPID_PRIVATE_PKCS8 or VAPID_PRIVATE
    webpush(
        subscription_info=sub_clean,
        data=json.dumps({"title": title, "body": body, "tag": tag, "melody": melody}),
        vapid_private_key=key_to_use,
        vapid_claims=VAPID_CLAIMS,
    )

def handler(event: dict, context) -> dict:
    """Планировщик: один быстрый тик. Окно 6 минут — чтобы ловить срабатывания между вызовами cron.
    Дедупликация через push_fired не даёт отправить одно уведомление дважды."""
    headers = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS"}

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    if not VAPID_PRIVATE or not VAPID_PUBLIC:
        return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": "VAPID keys not configured"})}

    conn = get_conn()
    cur = conn.cursor()

    cur.execute(f"""
        SELECT ps.user_key, ps.subscription, ps.user_id,
               COALESCE((ps.subscription->>'tz_offset_min')::int, 0) as tz
        FROM {SCHEMA}.push_subscriptions ps
        WHERE ps.user_id IS NOT NULL
    """)
    subscriptions = cur.fetchall()

    now = datetime.utcnow()
    # Окно 3 минуты — задержка max 3 мин между срабатыванием и получением уведомления
    # Дедупликация через push_fired не даёт отправить одно и то же уведомление дважды
    window = timedelta(minutes=3)
    sent = 0
    errors = 0
    print(f"[push] tick {now.isoformat()}Z subs={len(subscriptions)} window=3min")

    for (user_key, subscription, user_id, tz_offset) in subscriptions:
        all_items = []

        cur.execute(f"""
            SELECT id, text, date, time, advance, advance_time, COALESCE(melody, 'classic')
            FROM {SCHEMA}.tasks
            WHERE user_id = %s AND done = false
              AND time IS NOT NULL AND time != ''
        """, (user_id,))
        for (tid, text, date, time_val, advance, adv_time, melody) in cur.fetchall():
            all_items.extend(get_fire_times(tid, text, date, time_val, advance, adv_time or "", tz_offset, melody or "classic"))

        cur.execute(f"""
            SELECT id, title, time FROM {SCHEMA}.reminders
            WHERE user_id = %s AND active = true
        """, (user_id,))
        for (rid, title, time_val) in cur.fetchall():
            ft = get_reminder_fire(rid, title, time_val, tz_offset)
            if ft:
                all_items.append(ft)

        print(f"[push] user_id={user_id} items={len(all_items)}")

        for item in all_items:
            # Срабатывание если время уже наступило и не позже чем 3 минуты назад
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
                send_push(subscription, item["title"], item["body"], item["tag"], item.get("melody", "classic"))
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

    cur.close()
    conn.close()
    return {"statusCode": 200, "headers": headers, "body": json.dumps({"sent": sent, "errors": errors, "checked": len(subscriptions)})}