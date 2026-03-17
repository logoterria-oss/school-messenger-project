import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

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

        if action == 'send':
            chat_id = data.get('chatId')
            topic_id = data.get('topicId')
            sender_id = data.get('senderId')
            sender_name = data.get('senderName', 'Кто-то')
            text = data.get('text', '')
            chat_name = data.get('chatName', '')

            if not chat_id or not sender_id:
                cur.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': cors,
                    'body': json.dumps({'error': 'chatId and senderId required'})
                }

            if topic_id:
                cur.execute("""
                    SELECT DISTINCT cp.user_id FROM chat_participants cp
                    WHERE cp.chat_id = %s AND cp.user_id != %s
                """, (chat_id, sender_id))
            else:
                cur.execute("""
                    SELECT DISTINCT cp.user_id FROM chat_participants cp
                    WHERE cp.chat_id = %s AND cp.user_id != %s
                """, (chat_id, sender_id))

            participant_rows = cur.fetchall()
            participant_ids = [r['user_id'] for r in participant_rows]

            if not participant_ids:
                cur.close()
                conn.close()
                return {
                    'statusCode': 200,
                    'headers': cors,
                    'body': json.dumps({'sent': 0})
                }

            placeholders = ','.join(['%s'] * len(participant_ids))
            cur.execute(
                "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id IN (%s)" % placeholders,
                participant_ids
            )
            subscriptions = cur.fetchall()
            cur.close()
            conn.close()

            if not subscriptions:
                return {
                    'statusCode': 200,
                    'headers': cors,
                    'body': json.dumps({'sent': 0})
                }

            from pywebpush import webpush, WebPushException

            vapid_private = os.environ.get('VAPID_PRIVATE_KEY', '')
            vapid_claims = {'sub': 'mailto:push@lineya.school'}

            preview = text[:100] if text else 'Новое сообщение'
            payload = json.dumps({
                'title': sender_name,
                'body': preview,
                'icon': 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/files/favicon-1773208222088.jpg',
                'tag': f'chat-{chat_id}',
                'data': {
                    'chatId': chat_id,
                    'topicId': topic_id
                }
            })

            sent = 0
            failed_endpoints = []
            for sub in subscriptions:
                try:
                    webpush(
                        subscription_info={
                            'endpoint': sub['endpoint'],
                            'keys': {
                                'p256dh': sub['p256dh'],
                                'auth': sub['auth']
                            }
                        },
                        data=payload,
                        vapid_private_key=vapid_private,
                        vapid_claims=vapid_claims
                    )
                    sent += 1
                except WebPushException as e:
                    print(f"[Push] WebPushException for {sub['endpoint'][:60]}: {e}")
                    if '410' in str(e) or '404' in str(e):
                        failed_endpoints.append(sub['endpoint'])
                except Exception as e:
                    print(f"[Push] Error for {sub['endpoint'][:60]}: {e}")

            if failed_endpoints:
                conn2 = psycopg2.connect(os.environ['DATABASE_URL'])
                cur2 = conn2.cursor()
                for ep in failed_endpoints:
                    cur2.execute("DELETE FROM push_subscriptions WHERE endpoint = %s", (ep,))
                conn2.commit()
                cur2.close()
                conn2.close()

            return {
                'statusCode': 200,
                'headers': cors,
                'body': json.dumps({'sent': sent})
            }

    return {
        'statusCode': 405,
        'headers': cors,
        'body': json.dumps({'error': 'Method not allowed'})
    }