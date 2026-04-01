import json
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor

def log(msg):
    print(msg, file=sys.stderr, flush=True)

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Content-Type': 'application/json',
}

def handler(event: dict, context) -> dict:
    '''API для индикатора "печатает..." — хранит и отдаёт состояния печатающих пользователей'''
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor(cursor_factory=RealDictCursor)

        if method == 'GET':
            # Получить список печатающих пользователей в чате/топике
            params = event.get('queryStringParameters', {}) or {}
            chat_id = params.get('chatId')
            # Используем '' вместо NULL для topic_id
            topic_id = params.get('topicId') or ''
            current_user_id = (
                event.get('headers', {}).get('X-User-Id') or
                event.get('headers', {}).get('x-user-id') or
                ''
            )

            if not chat_id:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'chatId is required'})
                }

            # Удалить устаревшие записи (старше 5 секунд)
            cur.execute(
                "DELETE FROM typing_states WHERE chat_id = %s AND topic_id = %s AND updated_at < NOW() - INTERVAL '5 seconds'",
                (chat_id, topic_id)
            )

            # Получить актуальных печатающих (кроме текущего пользователя)
            cur.execute(
                "SELECT user_name FROM typing_states WHERE chat_id = %s AND topic_id = %s AND user_id != %s ORDER BY updated_at ASC",
                (chat_id, topic_id, current_user_id)
            )

            rows = cur.fetchall()
            typing_users = [r['user_name'] for r in rows]

            conn.commit()
            cur.close()
            conn.close()

            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({'typingUsers': typing_users})
            }

        elif method == 'POST':
            # Пользователь начал/продолжает печатать — upsert записи
            body = {}
            if event.get('body'):
                try:
                    body = json.loads(event['body'])
                except Exception:
                    pass

            chat_id = body.get('chatId')
            # Используем '' вместо NULL для topic_id (PRIMARY KEY не любит NULL)
            topic_id = body.get('topicId') or ''
            user_id = (
                body.get('userId') or
                event.get('headers', {}).get('X-User-Id') or
                event.get('headers', {}).get('x-user-id')
            )
            user_name = body.get('userName')

            if not chat_id or not user_id or not user_name:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'chatId, userId and userName are required'})
                }

            cur.execute("""
                INSERT INTO typing_states (chat_id, topic_id, user_id, user_name, updated_at)
                VALUES (%s, %s, %s, %s, NOW())
                ON CONFLICT (chat_id, topic_id, user_id) DO UPDATE SET
                    user_name = EXCLUDED.user_name,
                    updated_at = NOW()
            """, (chat_id, topic_id, user_id, user_name))

            conn.commit()
            cur.close()
            conn.close()

            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({'ok': True})
            }

        elif method == 'DELETE':
            # Пользователь остановил печать — удалить запись
            params = event.get('queryStringParameters', {}) or {}
            body = {}
            if event.get('body'):
                try:
                    body = json.loads(event['body'])
                except Exception:
                    pass

            chat_id = body.get('chatId') or params.get('chatId')
            topic_id = body.get('topicId') or params.get('topicId') or ''
            user_id = (
                body.get('userId') or
                params.get('userId') or
                event.get('headers', {}).get('X-User-Id') or
                event.get('headers', {}).get('x-user-id')
            )

            if not chat_id or not user_id:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'chatId and userId are required'})
                }

            cur.execute(
                "DELETE FROM typing_states WHERE chat_id = %s AND topic_id = %s AND user_id = %s",
                (chat_id, topic_id, user_id)
            )

            conn.commit()
            cur.close()
            conn.close()

            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({'ok': True})
            }

        else:
            return {
                'statusCode': 405,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Method not allowed'})
            }

    except Exception as e:
        log(f"[typing] Error: {e}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': str(e)})
        }
