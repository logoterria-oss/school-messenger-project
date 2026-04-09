import base64
import io
import urllib.request

from PIL import Image

SOURCE_URL = (
    "https://cdn.poehali.dev/projects/"
    "4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/"
    "bucket/cbcb33d3-bec5-45ca-9af6-5542a72ada58.png"
)
TARGET_SIZE = (180, 180)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def handler(event: dict, context) -> dict:
    """Возвращает apple-touch-icon 180x180 в формате PNG."""

    method = event.get("httpMethod", "GET")

    if method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": "",
        }

    if method != "GET":
        return {
            "statusCode": 405,
            "headers": {
                "Content-Type": "text/plain",
                **CORS_HEADERS,
            },
            "body": "Method not allowed",
        }

    try:
        req = urllib.request.Request(SOURCE_URL)
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw_bytes = resp.read()

        img = Image.open(io.BytesIO(raw_bytes))
        img = img.convert("RGBA")
        img = img.resize(TARGET_SIZE, Image.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        png_bytes = buf.getvalue()

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "image/png",
                "Cache-Control": "public, max-age=31536000",
                **CORS_HEADERS,
            },
            "body": base64.b64encode(png_bytes).decode("utf-8"),
            "isBase64Encoded": True,
        }

    except Exception as exc:
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "text/plain",
                **CORS_HEADERS,
            },
            "body": f"Error generating icon: {exc}",
        }
