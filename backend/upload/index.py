import json
import os
import sys
import base64
import uuid
import boto3

def log(msg):
    print(msg, file=sys.stderr, flush=True)

def handler(event: dict, context) -> dict:
    """Загрузка файла (base64) в S3 и возврат CDN URL"""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }

    if event.get('httpMethod') != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }

    body_raw = event.get('body') or '{}'
    if event.get('isBase64Encoded') and body_raw != '{}':
        body_raw = base64.b64decode(body_raw).decode('utf-8')
    try:
        data = json.loads(body_raw)
    except Exception:
        data = {}

    data_url = data.get('dataUrl', '')
    file_name = data.get('fileName', 'file')

    if not data_url or not data_url.startswith('data:'):
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'dataUrl is required'})
        }

    try:
        header, b64data = data_url.split(',', 1)
        mime = header.split(':')[1].split(';')[0] if ':' in header else 'application/octet-stream'
        ext_map = {
            'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
            'image/webp': 'webp', 'application/pdf': 'pdf',
            'application/msword': 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
            'application/vnd.ms-excel': 'xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
            'application/vnd.ms-powerpoint': 'ppt',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
            'application/zip': 'zip',
            'application/x-rar-compressed': 'rar',
            'text/plain': 'txt',
            'video/mp4': 'mp4',
            'video/quicktime': 'mov',
            'audio/mpeg': 'mp3',
            'audio/ogg': 'ogg',
        }
        ext = ext_map.get(mime, 'bin')
        file_bytes = base64.b64decode(b64data)
        key = f"chat-files/{uuid.uuid4()}.{ext}"

        s3 = boto3.client(
            's3',
            endpoint_url='https://bucket.poehali.dev',
            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
        )
        s3.put_object(Bucket='files', Key=key, Body=file_bytes, ContentType=mime)
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        log(f"[Upload] Uploaded {file_name} ({len(file_bytes)} bytes) -> {cdn_url}")

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'url': cdn_url, 'fileName': file_name})
        }
    except Exception as e:
        log(f"[Upload] Error: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }