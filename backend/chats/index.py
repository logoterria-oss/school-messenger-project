import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    '''API для управления чатами и группами'''
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id'
            },
            'body': ''
        }

    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor(cursor_factory=RealDictCursor)

        if method == 'GET':
            # Получить чаты пользователя
            headers = event.get('headers', {}) or {}
            user_id = headers.get('x-user-id') or headers.get('X-User-Id')

            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'X-User-Id header is required'})
                }

            # Получаем чаты с последним сообщением и непрочитанными
            cur.execute("""
                SELECT DISTINCT c.id, c.name, c.type, c.avatar, c.schedule, c.conclusion_link, c.is_pinned,
                       COALESCE(m.text, '') as last_message,
                       TO_CHAR(m.created_at, 'HH24:MI') as timestamp,
                       COALESCE(unread.count, 0) as unread,
                       ARRAY_AGG(DISTINCT cp.user_id) as participants
                FROM chats c
                JOIN chat_participants cp ON cp.chat_id = c.id
                LEFT JOIN LATERAL (
                    SELECT text, created_at
                    FROM messages
                    WHERE chat_id = c.id
                    ORDER BY created_at DESC
                    LIMIT 1
                ) m ON true
                LEFT JOIN LATERAL (
                    SELECT COUNT(*) as count
                    FROM messages msg
                    LEFT JOIN message_status ms ON ms.message_id = msg.id AND ms.user_id = %s
                    WHERE msg.chat_id = c.id
                    AND (ms.status IS NULL OR ms.status != 'read')
                    AND msg.sender_id != %s
                ) unread ON true
                WHERE cp.user_id = %s
                GROUP BY c.id, c.name, c.type, c.avatar, c.schedule, c.conclusion_link, c.is_pinned, m.text, m.created_at, unread.count
                ORDER BY c.is_pinned DESC, m.created_at DESC NULLS LAST
            """, (user_id, user_id, user_id))

            chats = cur.fetchall()

            # Получаем топики для групповых чатов
            chat_ids = [c['id'] for c in chats if c['type'] == 'group']
            topics_dict = {}

            if chat_ids:
                cur.execute("""
                    SELECT t.id, t.chat_id, t.name, t.icon,
                           COALESCE(COUNT(DISTINCT m.id) FILTER (
                               WHERE ms.status IS NULL OR ms.status != 'read'
                           ), 0) as unread
                    FROM topics t
                    LEFT JOIN messages m ON m.topic_id = t.id
                    LEFT JOIN message_status ms ON ms.message_id = m.id AND ms.user_id = %s
                    WHERE t.chat_id = ANY(%s)
                    GROUP BY t.id, t.chat_id, t.name, t.icon
                    ORDER BY t.created_at
                """, (user_id, chat_ids))

                topics = cur.fetchall()
                for topic in topics:
                    chat_id = topic['chat_id']
                    if chat_id not in topics_dict:
                        topics_dict[chat_id] = []
                    topics_dict[chat_id].append({
                        'id': topic['id'],
                        'name': topic['name'],
                        'icon': topic['icon'],
                        'unread': topic['unread']
                    })

            cur.close()
            conn.close()

            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'chats': [dict(c) for c in chats],
                    'topics': topics_dict
                }, default=str)
            }

        elif method == 'POST':
            # Создать новый чат
            data = json.loads(event.get('body', '{}'))

            required_fields = ['id', 'name', 'type', 'participants']
            if not all(field in data for field in required_fields):
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Missing required fields'})
                }

            # Создаем чат
            cur.execute("""
                INSERT INTO chats (id, name, type, avatar, schedule, conclusion_link, is_pinned)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                data['id'],
                data['name'],
                data['type'],
                data.get('avatar'),
                data.get('schedule'),
                data.get('conclusionLink'),
                data.get('isPinned', False)
            ))

            chat_id = cur.fetchone()['id']

            # Добавляем участников
            for user_id in data['participants']:
                cur.execute("""
                    INSERT INTO chat_participants (chat_id, user_id)
                    VALUES (%s, %s)
                """, (chat_id, user_id))

            # Создаем топики для группового чата
            if data['type'] == 'group' and 'topics' in data:
                for topic in data['topics']:
                    cur.execute("""
                        INSERT INTO topics (id, chat_id, name, icon)
                        VALUES (%s, %s, %s, %s)
                    """, (topic['id'], chat_id, topic['name'], topic['icon']))

            conn.commit()
            cur.close()
            conn.close()

            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'chatId': chat_id})
            }

        elif method == 'PUT':
            # Обновить чат
            data = json.loads(event.get('body', '{}'))
            chat_id = data.get('id')

            if not chat_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Chat ID is required'})
                }

            updates = []
            values = []

            if 'schedule' in data:
                updates.append('schedule = %s')
                values.append(data['schedule'])
            if 'conclusionLink' in data:
                updates.append('conclusion_link = %s')
                values.append(data['conclusionLink'])

            if not updates:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'No fields to update'})
                }

            updates.append('updated_at = NOW()')
            values.append(chat_id)

            query = f"UPDATE chats SET {', '.join(updates)} WHERE id = %s RETURNING id"
            cur.execute(query, values)

            result = cur.fetchone()
            conn.commit()
            cur.close()
            conn.close()

            if not result:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Chat not found'})
                }

            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'chatId': result['id']})
            }

    except Exception as e:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }

    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }
