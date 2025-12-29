import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

def handler(event: dict, context) -> dict:
    '''API для работы с сообщениями'''
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id'
            },
            'body': ''
        }

    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor(cursor_factory=RealDictCursor)

        if method == 'GET':
            # Получить сообщения чата или топика
            params = event.get('queryStringParameters', {}) or {}
            chat_id = params.get('chatId')
            topic_id = params.get('topicId')

            if not chat_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'chatId is required'})
                }

            # Запрос сообщений
            if topic_id:
                cur.execute("""
                    SELECT m.id, m.text, m.sender_id, m.sender_name, m.created_at,
                           ARRAY_AGG(DISTINCT jsonb_build_object(
                               'type', a.type,
                               'fileUrl', a.file_url,
                               'fileName', a.file_name,
                               'fileSize', a.file_size
                           )) FILTER (WHERE a.id IS NOT NULL) as attachments,
                           ARRAY_AGG(DISTINCT jsonb_build_object(
                               'emoji', r.emoji,
                               'count', COUNT(r.id) OVER (PARTITION BY r.emoji),
                               'users', ARRAY_AGG(u.name) OVER (PARTITION BY r.emoji)
                           )) FILTER (WHERE r.id IS NOT NULL) as reactions
                    FROM messages m
                    LEFT JOIN attachments a ON a.message_id = m.id
                    LEFT JOIN reactions r ON r.message_id = m.id
                    LEFT JOIN users u ON u.id = r.user_id
                    WHERE m.topic_id = %s
                    GROUP BY m.id, m.text, m.sender_id, m.sender_name, m.created_at
                    ORDER BY m.created_at ASC
                """, (topic_id,))
            else:
                cur.execute("""
                    SELECT m.id, m.text, m.sender_id, m.sender_name, m.created_at,
                           ARRAY_AGG(DISTINCT jsonb_build_object(
                               'type', a.type,
                               'fileUrl', a.file_url,
                               'fileName', a.file_name,
                               'fileSize', a.file_size
                           )) FILTER (WHERE a.id IS NOT NULL) as attachments,
                           ARRAY_AGG(DISTINCT jsonb_build_object(
                               'emoji', r.emoji,
                               'count', COUNT(r.id) OVER (PARTITION BY r.emoji),
                               'users', ARRAY_AGG(u.name) OVER (PARTITION BY r.emoji)
                           )) FILTER (WHERE r.id IS NOT NULL) as reactions
                    FROM messages m
                    LEFT JOIN attachments a ON a.message_id = m.id
                    LEFT JOIN reactions r ON r.message_id = m.id
                    LEFT JOIN users u ON u.id = r.user_id
                    WHERE m.chat_id = %s AND m.topic_id IS NULL
                    GROUP BY m.id, m.text, m.sender_id, m.sender_name, m.created_at
                    ORDER BY m.created_at ASC
                """, (chat_id,))

            messages = cur.fetchall()
            
            cur.close()
            conn.close()

            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'messages': [dict(m) for m in messages]
                }, default=str)
            }

        elif method == 'POST':
            # Отправить новое сообщение
            data = json.loads(event.get('body', '{}'))
            message_id = data.get('id')
            chat_id = data.get('chatId')
            topic_id = data.get('topicId')
            sender_id = data.get('senderId')
            sender_name = data.get('senderName')
            text = data.get('text')
            attachments = data.get('attachments', [])

            if not message_id or not chat_id or not sender_id or not sender_name:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Missing required fields'})
                }

            # Вставка сообщения
            cur.execute("""
                INSERT INTO messages (id, chat_id, topic_id, sender_id, sender_name, text, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                RETURNING id, created_at
            """, (message_id, chat_id, topic_id, sender_id, sender_name, text))
            
            result = cur.fetchone()

            # Вставка вложений
            for att in attachments:
                att_id = f"{message_id}-{att.get('type')}-{datetime.now().timestamp()}"
                cur.execute("""
                    INSERT INTO attachments (id, message_id, type, file_url, file_name, file_size)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (att_id, message_id, att.get('type'), att.get('fileUrl'), att.get('fileName'), att.get('fileSize')))

            conn.commit()
            cur.close()
            conn.close()

            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'message': {
                        'id': result['id'],
                        'createdAt': str(result['created_at'])
                    }
                })
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
