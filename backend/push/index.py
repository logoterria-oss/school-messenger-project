import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
# v2

def handler(event: dict, context) -> dict:
    '''API для управления push-подписками и отправки уведомлений'''
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id'
            },
            'body': ''
        }

    cors = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}

    if method == 'GET':
        params = event.get('queryStringParameters', {}) or {}
        action = params.get('action')

        if action == 'vapid-key':
            vapid_public = os.environ.get('VAPID_PUBLIC_KEY', '')
            return {
                'statusCode': 200,
                'headers': cors,
                'body': json.dumps({'publicKey': vapid_public})
            }

        return {
            'statusCode': 400,
            'headers': cors,
            'body': json.dumps({'error': 'Unknown action'})
        }

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)

    if method == 'POST':
        headers = event.get('headers', {}) or {}
        user_id = headers.get('x-user-id') or headers.get('X-User-Id')
        data = json.loads(event.get('body', '{}'))
        action = data.get('action')

        if action == 'subscribe':
            endpoint = data.get('endpoint')
            p256dh = data.get('p256dh')
            auth = data.get('auth')

            if not user_id or not endpoint or not p256dh or not auth:
                cur.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': cors,
                    'body': json.dumps({'error': 'Missing fields: user_id, endpoint, p256dh, auth'})
                }

            cur.execute("""
                DELETE FROM push_subscriptions WHERE user_id = %s AND endpoint = %s
            """, (user_id, endpoint))

            cur.execute("""
                INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, updated_at)
                VALUES (%s, %s, %s, %s, NOW())
            """, (user_id, endpoint, p256dh, auth))
            conn.commit()
            cur.close()
            conn.close()

            return {
                'statusCode': 200,
                'headers': cors,
                'body': json.dumps({'ok': True})
            }

        if action == 'unsubscribe':
            endpoint = data.get('endpoint')
            if not user_id or not endpoint:
                cur.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': cors,
                    'body': json.dumps({'error': 'Missing user_id or endpoint'})
                }

            cur.execute("DELETE FROM push_subscriptions WHERE user_id = %s AND endpoint = %s", (user_id, endpoint))
            conn.commit()
            cur.close()
            conn.close()

            return {
                'statusCode': 200,
                'headers': cors,
                'body': json.dumps({'ok': True})
            }

        cur.close()
        conn.close()

    return {
        'statusCode': 405,
        'headers': cors,
        'body': json.dumps({'error': 'Method not allowed'})
    }