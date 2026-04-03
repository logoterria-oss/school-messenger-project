import json
import os
import sys
import base64
import uuid
import boto3
from urllib.parse import unquote

def log(msg):
    print(msg, file=sys.stderr, flush=True)

def get_s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )

def handler(event: dict, context) -> dict:
    """Загрузка файла в S3 (POST) и скачивание через прокси (GET)"""
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }

    # GET — прокси-скачивание файла из S3 (чтобы обойти CORS CDN)
    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        key = params.get('key', '')
        file_name = unquote(params.get('name', 'file'))

        if not key:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'key is required'})
            }

        try:
            s3 = get_s3()
            obj = s3.get_object(Bucket='files', Key=key)
            file_bytes = obj['Body'].read()
            content_type = obj.get('ContentType', 'application/octet-stream')
            b64 = base64.b64encode(file_bytes).decode('utf-8')
            log(f"[Download] key={key} size={len(file_bytes)} name={file_name}")
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': content_type,
                    'Content-Disposition': f'attachment; filename="{file_name}"',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'private, max-age=3600',
                },
                'isBase64Encoded': True,
                'body': b64
            }
        except Exception as e:
            log(f"[Download] Error: {e}")
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': str(e)})
            }

    # POST — загрузка файла в S3
    if method != 'POST':
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

        s3 = get_s3()
        s3.put_object(Bucket='files', Key=key, Body=file_bytes, ContentType=mime)
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        log(f"[Upload] {file_name} ({len(file_bytes)} bytes) -> {key}")

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'url': cdn_url, 'key': key, 'fileName': file_name})
        }
    except Exception as e:
        log(f"[Upload] Error: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
