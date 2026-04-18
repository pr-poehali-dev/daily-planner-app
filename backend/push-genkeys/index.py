import json
import base64
import os
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization

def handler(event: dict, context) -> dict:
    """Генерирует VAPID ключевую пару для Web Push."""
    headers = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS"}

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    private_key = ec.generate_private_key(ec.SECP256R1())

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption()
    ).decode()

    public_key_bytes = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint
    )
    public_b64 = base64.urlsafe_b64encode(public_key_bytes).decode().rstrip("=")

    private_numbers = private_key.private_numbers()
    private_bytes_raw = private_numbers.private_value.to_bytes(32, 'big')
    private_b64 = base64.urlsafe_b64encode(private_bytes_raw).decode().rstrip("=")

    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps({
            "VAPID_PUBLIC_KEY": public_b64,
            "VAPID_PRIVATE_KEY": private_b64,
            "VAPID_PRIVATE_PEM": private_pem,
            "note": "Сохраните VAPID_PUBLIC_KEY и VAPID_PRIVATE_PEM в секреты проекта"
        }, indent=2)
    }
