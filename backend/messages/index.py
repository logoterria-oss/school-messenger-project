import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

def handler(event: dict, context) -> dict:
    '''API для работы с сообщениями и отправки push-уведомлений'''
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
                           m.reply_to_id, m.reply_to_sender, m.reply_to_text,
                           m.forwarded_from_id, m.forwarded_from_sender, m.forwarded_from_text,
                           m.forwarded_from_date, m.forwarded_from_chat_name,
                           (SELECT ARRAY_AGG(DISTINCT jsonb_build_object(
                               'type', a.type, 'fileUrl', a.file_url,
                               'fileName', a.file_name, 'fileSize', a.file_size
                           )) FROM attachments a WHERE a.message_id = m.id) as attachments,
                           (SELECT ARRAY_AGG(jsonb_build_object(
                               'emoji', rg.emoji, 'count', rg.cnt, 'users', rg.user_names
                           )) FROM (
                               SELECT r2.emoji, COUNT(*) as cnt,
                                      ARRAY_AGG(u2.name) as user_names
                               FROM reactions r2
                               LEFT JOIN users u2 ON u2.id = r2.user_id
                               WHERE r2.message_id = m.id
                               GROUP BY r2.emoji
                           ) rg) as reactions
                    FROM messages m
                    WHERE m.topic_id = %s
                    ORDER BY m.created_at ASC
                """, (topic_id,))
            else:
                cur.execute("""
                    SELECT m.id, m.text, m.sender_id, m.sender_name, m.created_at,
                           m.reply_to_id, m.reply_to_sender, m.reply_to_text,
                           m.forwarded_from_id, m.forwarded_from_sender, m.forwarded_from_text,
                           m.forwarded_from_date, m.forwarded_from_chat_name,
                           (SELECT ARRAY_AGG(DISTINCT jsonb_build_object(
                               'type', a.type, 'fileUrl', a.file_url,
                               'fileName', a.file_name, 'fileSize', a.file_size
                           )) FROM attachments a WHERE a.message_id = m.id) as attachments,
                           (SELECT ARRAY_AGG(jsonb_build_object(
                               'emoji', rg.emoji, 'count', rg.cnt, 'users', rg.user_names
                           )) FROM (
                               SELECT r2.emoji, COUNT(*) as cnt,
                                      ARRAY_AGG(u2.name) as user_names
                               FROM reactions r2
                               LEFT JOIN users u2 ON u2.id = r2.user_id
                               WHERE r2.message_id = m.id
                               GROUP BY r2.emoji
                           ) rg) as reactions
                    FROM messages m
                    WHERE m.chat_id = %s AND m.topic_id IS NULL
                    ORDER BY m.created_at ASC
                """, (chat_id,))

            messages = cur.fetchall()
            
            cur.close()
            conn.close()

            def serialize_message(m):
                d = dict(m)
                if d.get('created_at'):
                    ts = str(d['created_at'])
                    if not ts.endswith('Z') and '+' not in ts:
                        ts = ts + 'Z'
                    d['created_at'] = ts
                return d

            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'messages': [serialize_message(m) for m in messages]
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
            reply_to_id = data.get('replyToId')
            reply_to_sender = data.get('replyToSender')
            reply_to_text = data.get('replyToText')
            forwarded_from_id = data.get('forwardedFromId')
            forwarded_from_sender = data.get('forwardedFromSender')
            forwarded_from_text = data.get('forwardedFromText')
            forwarded_from_date = data.get('forwardedFromDate')
            forwarded_from_chat_name = data.get('forwardedFromChatName')
            created_at = data.get('createdAt')

            if not message_id or not chat_id or not sender_id or not sender_name:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Missing required fields'})
                }

            if created_at:
                cur.execute("""
                    INSERT INTO messages (id, chat_id, topic_id, sender_id, sender_name, text, created_at,
                        reply_to_id, reply_to_sender, reply_to_text,
                        forwarded_from_id, forwarded_from_sender, forwarded_from_text,
                        forwarded_from_date, forwarded_from_chat_name)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at
                """, (message_id, chat_id, topic_id, sender_id, sender_name, text, created_at,
                      reply_to_id, reply_to_sender, reply_to_text,
                      forwarded_from_id, forwarded_from_sender, forwarded_from_text,
                      forwarded_from_date, forwarded_from_chat_name))
            else:
                cur.execute("""
                    INSERT INTO messages (id, chat_id, topic_id, sender_id, sender_name, text, created_at,
                        reply_to_id, reply_to_sender, reply_to_text,
                        forwarded_from_id, forwarded_from_sender, forwarded_from_text,
                        forwarded_from_date, forwarded_from_chat_name)
                    VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at
                """, (message_id, chat_id, topic_id, sender_id, sender_name, text,
                      reply_to_id, reply_to_sender, reply_to_text,
                      forwarded_from_id, forwarded_from_sender, forwarded_from_text,
                      forwarded_from_date, forwarded_from_chat_name))
            
            result = cur.fetchone()

            # Вставка вложений
            for att in attachments:
                att_id = f"{message_id}-{att.get('type')}-{datetime.now().timestamp()}"
                cur.execute("""
                    INSERT INTO attachments (id, message_id, type, file_url, file_name, file_size)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (att_id, message_id, att.get('type'), att.get('fileUrl'), att.get('fileName'), att.get('fileSize')))

            conn.commit()

            try:
                cur2 = conn.cursor(cursor_factory=RealDictCursor)
                cur2.execute("""
                    SELECT DISTINCT cp.user_id FROM chat_participants cp
                    WHERE cp.chat_id = %s AND cp.user_id != %s
                """, (chat_id, sender_id))
                participant_ids = [r['user_id'] for r in cur2.fetchall()]

                if participant_ids:
                    placeholders = ','.join(['%s'] * len(participant_ids))
                    cur2.execute(
                        "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id IN (%s)" % placeholders,
                        participant_ids
                    )
                    subs = cur2.fetchall()
                    cur2.close()
                    conn.close()

                    if subs:
                        from pywebpush import webpush, WebPushException
                        vapid_private = os.environ.get('VAPID_PRIVATE_KEY', '')
                        vapid_claims = {'sub': 'mailto:push@lineya.school'}
                        preview = (text or '')[:100] or 'Новое сообщение'
                        payload = json.dumps({
                            'title': sender_name,
                            'body': preview,
                            'icon': 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/files/favicon-1773208222088.jpg',
                            'tag': 'chat-%s' % chat_id,
                            'data': {'chatId': chat_id, 'topicId': topic_id}
                        })
                        for sub in subs:
                            try:
                                webpush(
                                    subscription_info={
                                        'endpoint': sub['endpoint'],
                                        'keys': {'p256dh': sub['p256dh'], 'auth': sub['auth']}
                                    },
                                    data=payload,
                                    vapid_private_key=vapid_private,
                                    vapid_claims=vapid_claims
                                )
                            except WebPushException as e:
                                print(f"[Push] WebPushException: {e}")
                            except Exception as e:
                                print(f"[Push] Error: {e}")
                else:
                    cur2.close()
                    conn.close()
            except Exception as e:
                print(f"[Push] Send error: {e}")
                if 'conn' in dir() and conn and not conn.closed:
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

        elif method == 'PUT':
            headers = event.get('headers', {}) or {}
            user_id = headers.get('x-user-id') or headers.get('X-User-Id')
            data = json.loads(event.get('body', '{}'))
            chat_id = data.get('chatId')
            topic_id = data.get('topicId')

            if not user_id or not chat_id:
                cur.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'X-User-Id header and chatId are required'})
                }

            if topic_id:
                cur.execute("""
                    INSERT INTO message_status (message_id, user_id, status, updated_at)
                    SELECT m.id, %s, 'read', NOW()
                    FROM messages m
                    LEFT JOIN message_status ms ON ms.message_id = m.id AND ms.user_id = %s
                    WHERE m.topic_id = %s AND m.sender_id != %s AND (ms.status IS NULL OR ms.status != 'read')
                    ON CONFLICT (message_id, user_id) DO UPDATE SET status = 'read', updated_at = NOW()
                """, (user_id, user_id, topic_id, user_id))
            else:
                cur.execute("""
                    INSERT INTO message_status (message_id, user_id, status, updated_at)
                    SELECT m.id, %s, 'read', NOW()
                    FROM messages m
                    LEFT JOIN message_status ms ON ms.message_id = m.id AND ms.user_id = %s
                    WHERE m.chat_id = %s AND m.topic_id IS NULL AND m.sender_id != %s AND (ms.status IS NULL OR ms.status != 'read')
                    ON CONFLICT (message_id, user_id) DO UPDATE SET status = 'read', updated_at = NOW()
                """, (user_id, user_id, chat_id, user_id))

            conn.commit()
            cur.close()
            conn.close()

            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'ok': True})
            }

    except Exception as e:
        import traceback
        traceback.print_exc()
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