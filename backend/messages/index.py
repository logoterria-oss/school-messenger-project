import json
import os
import sys
import base64
import uuid
import boto3
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

def log(msg):
    print(msg, file=sys.stderr, flush=True)

def upload_base64_to_s3(data_url):
    try:
        header, b64data = data_url.split(',', 1)
        mime = header.split(':')[1].split(';')[0] if ':' in header else 'application/octet-stream'
        ext_map = {
            'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
            'image/webp': 'webp', 'application/pdf': 'pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
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
        return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
    except Exception as e:
        log(f"[S3] Upload error: {e}")
        return None

def handler(event: dict, context) -> dict:
    '''API для работы с сообщениями и отправки push-уведомлений'''
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
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

            where_clause = "m.topic_id = %s" if topic_id else "m.chat_id = %s AND m.topic_id IS NULL"
            filter_val = topic_id if topic_id else chat_id

            cur.execute("""
                SELECT m.id, m.text, m.sender_id, m.sender_name, m.created_at,
                       m.reply_to_id, m.reply_to_sender, m.reply_to_text,
                       m.forwarded_from_id, m.forwarded_from_sender, m.forwarded_from_text,
                       m.forwarded_from_date, m.forwarded_from_chat_name,
                       att.attachments,
                       rct.reactions
                FROM messages m
                LEFT JOIN LATERAL (
                    SELECT ARRAY_AGG(DISTINCT jsonb_build_object(
                        'type', a.type, 'fileUrl', a.file_url,
                        'fileName', a.file_name, 'fileSize', a.file_size
                    )) as attachments
                    FROM attachments a WHERE a.message_id = m.id
                ) att ON true
                LEFT JOIN LATERAL (
                    SELECT ARRAY_AGG(jsonb_build_object(
                        'emoji', rg.emoji, 'count', rg.cnt, 'users', rg.user_names
                    )) as reactions
                    FROM (
                        SELECT r.emoji, COUNT(*) as cnt,
                               ARRAY_AGG(u.name) as user_names
                        FROM reactions r
                        LEFT JOIN users u ON u.id = r.user_id
                        WHERE r.message_id = m.id
                        GROUP BY r.emoji
                    ) rg
                ) rct ON true
                WHERE """ + where_clause + """
                ORDER BY m.created_at ASC
            """, (filter_val,))

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
                if d.get('attachments'):
                    cleaned = []
                    for att in d['attachments']:
                        if att and isinstance(att, dict):
                            url = att.get('fileUrl') or ''
                            if url.startswith('data:'):
                                att = dict(att)
                                att['fileUrl'] = None
                            cleaned.append(att)
                    d['attachments'] = cleaned if cleaned else None
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

            if topic_id and topic_id.endswith('-payment') and sender_id:
                cur.execute("SELECT role FROM users WHERE id = %s", (sender_id,))
                sender_row = cur.fetchone()
                if sender_row and sender_row['role'] == 'teacher':
                    return {
                        'statusCode': 403,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Педагогам недоступна отправка сообщений в раздел «Оплата»'})
                    }

            if created_at:
                cur.execute("""
                    INSERT INTO messages (id, chat_id, topic_id, sender_id, sender_name, text, created_at,
                        reply_to_id, reply_to_sender, reply_to_text,
                        forwarded_from_id, forwarded_from_sender, forwarded_from_text,
                        forwarded_from_date, forwarded_from_chat_name)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text
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
                    ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text
                    RETURNING id, created_at
                """, (message_id, chat_id, topic_id, sender_id, sender_name, text,
                      reply_to_id, reply_to_sender, reply_to_text,
                      forwarded_from_id, forwarded_from_sender, forwarded_from_text,
                      forwarded_from_date, forwarded_from_chat_name))
            
            result = cur.fetchone()

            for att in attachments:
                att_id = f"{message_id}-{att.get('type')}-{datetime.now().timestamp()}"
                file_url = att.get('fileUrl')
                if file_url and file_url.startswith('data:'):
                    cdn_url = upload_base64_to_s3(file_url)
                    if cdn_url:
                        file_url = cdn_url
                cur.execute("""
                    INSERT INTO attachments (id, message_id, type, file_url, file_name, file_size)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (att_id, message_id, att.get('type'), file_url, att.get('fileName'), att.get('fileSize')))

            conn.commit()

            user_subs = []
            lead_teacher_ids = set()
            chat_type = 'group'
            try:
                cur2 = conn.cursor(cursor_factory=RealDictCursor)
                cur2.execute("SELECT type FROM chats WHERE id = %s", (chat_id,))
                chat_row = cur2.fetchone()
                if chat_row:
                    chat_type = chat_row['type']

                cur2.execute("""
                    SELECT DISTINCT cp.user_id FROM chat_participants cp
                    WHERE cp.chat_id = %s AND cp.user_id != %s
                """, (chat_id, sender_id))
                participant_ids = [r['user_id'] for r in cur2.fetchall()]

                cur2.execute(
                    "SELECT user_id FROM chat_lead_teachers WHERE chat_id = %s",
                    (chat_id,)
                )
                lead_teacher_ids = {r['user_id'] for r in cur2.fetchall()}

                if participant_ids:
                    placeholders = ','.join(['%s'] * len(participant_ids))
                    cur2.execute(
                        "SELECT id, name, role FROM users WHERE id IN (%s)" % placeholders,
                        participant_ids
                    )
                    users_map = {r['id']: r for r in cur2.fetchall()}

                    cur2.execute(
                        "SELECT user_id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id IN (%s) AND endpoint LIKE 'https://%%%%'" % placeholders,
                        participant_ids
                    )
                    user_subs = cur2.fetchall()

                    for sub in user_subs:
                        u = users_map.get(sub['user_id'])
                        sub['user_name'] = u['name'] if u else None
                        sub['user_role'] = u['role'] if u else None
                cur2.close()
            except Exception as e:
                log(f"[Push] DB error: {e}")
            finally:
                if not conn.closed:
                    conn.close()

            log(f"[Push] Found {len(user_subs)} subs for chat {chat_id}, lead_teachers={lead_teacher_ids}")
            if user_subs:
                try:
                    from pywebpush import webpush, WebPushException
                    vapid_private = os.environ.get('VAPID_PRIVATE_KEY', '').strip()
                    preview = (text or '')[:100] or 'Новое сообщение'
                    msg_text = text or ''
                    has_admin_mention = '@[админ' in msg_text

                    STUDENT_ALLOWED_SUFFIXES = ('-important', '-zoom', '-homework', '-reports', '-cancellation')

                    subs_to_send = []
                    for sub in user_subs:
                        personal_mention = False
                        if sub['user_name'] and ('@[' + sub['user_name']) in msg_text:
                            personal_mention = True
                        if has_admin_mention and sub.get('user_role') == 'admin':
                            personal_mention = True

                        if sub.get('user_role') == 'teacher' and topic_id and topic_id.endswith('-admin-contact'):
                            log(f"[Push] SKIP teacher {sub.get('user_name')} ({sub['user_id']}) — no access to -admin-contact")
                            continue

                        if sub.get('user_role') == 'student' and topic_id and not any(topic_id.endswith(s) for s in STUDENT_ALLOWED_SUFFIXES):
                            log(f"[Push] SKIP student {sub.get('user_name')} ({sub['user_id']}) — topic {topic_id} not in allowed list")
                            continue

                        if sub.get('user_role') == 'teacher' and lead_teacher_ids and sub['user_id'] not in lead_teacher_ids:
                            if not personal_mention:
                                log(f"[Push] SKIP non-lead teacher {sub.get('user_name')} ({sub['user_id']})")
                                continue

                        if sub.get('user_role') == 'tech_specialist' and chat_type == 'group':
                            if not personal_mention:
                                log(f"[Push] SKIP tech_specialist {sub.get('user_name')} ({sub['user_id']}) — no mention in group")
                                continue

                        sub['_mention'] = personal_mention
                        subs_to_send.append(sub)

                    def send_one_push(sub):
                        personal_mention = sub['_mention']
                        is_apple = 'apple' in sub['endpoint'].lower()
                        log(f"[Push] Sending to {sub.get('user_name')} ({sub['user_id']}) apple={is_apple} endpoint={sub['endpoint'][:80]}")

                        payload = json.dumps({
                            'title': sender_name,
                            'body': preview,
                            'icon': 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/files/favicon-1773208222088.jpg',
                            'tag': 'msg-%s' % message_id,
                            'data': {'chatId': chat_id, 'topicId': topic_id, 'hasMention': personal_mention}
                        })
                        try:
                            webpush(
                                subscription_info={
                                    'endpoint': sub['endpoint'],
                                    'keys': {'p256dh': sub['p256dh'], 'auth': sub['auth']}
                                },
                                data=payload,
                                vapid_private_key=vapid_private,
                                vapid_claims={'sub': 'mailto:push@lineya.school'},
                                ttl=300
                            )
                            log(f"[Push] OK for {sub.get('user_name')}")
                        except WebPushException as e:
                            log(f"[Push] WebPushException for {sub.get('user_name')}: {e}")
                            resp_body = getattr(e, 'response', None)
                            if resp_body:
                                log(f"[Push] Response status: {getattr(resp_body, 'status_code', 'unknown')}, body: {getattr(resp_body, 'text', '')[:200]}")
                        except Exception as e:
                            log(f"[Push] Error for {sub.get('user_name')}: {e}")

                    if subs_to_send:
                        with ThreadPoolExecutor(max_workers=min(len(subs_to_send), 10)) as executor:
                            list(executor.map(send_one_push, subs_to_send))
                except Exception as e:
                    log(f"[Push] Send error: {e}")

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

        elif method == 'PATCH':
            headers = event.get('headers', {}) or {}
            user_id = headers.get('x-user-id') or headers.get('X-User-Id')
            raw_body = event.get('body')
            data = json.loads(raw_body) if raw_body else {}
            message_id = data.get('messageId')
            emoji = data.get('emoji')

            if not user_id or not message_id or not emoji:
                cur.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'X-User-Id header, messageId and emoji are required'})
                }

            cur.execute(
                "SELECT id FROM reactions WHERE message_id = %s AND user_id = %s AND emoji = %s",
                (message_id, user_id, emoji)
            )
            existing = cur.fetchone()

            if existing:
                cur.execute("DELETE FROM reactions WHERE id = %s", (existing['id'],))
            else:
                cur.execute(
                    "INSERT INTO reactions (message_id, user_id, emoji) VALUES (%s, %s, %s)",
                    (message_id, user_id, emoji)
                )

            conn.commit()
            cur.close()
            conn.close()

            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'ok': True, 'action': 'removed' if existing else 'added'})
            }

        elif method == 'DELETE':
            headers = event.get('headers', {}) or {}
            user_id = headers.get('x-user-id') or headers.get('X-User-Id')
            params = event.get('queryStringParameters', {}) or {}
            message_id = params.get('messageId')

            if not user_id or not message_id:
                cur.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'X-User-Id header and messageId are required'})
                }

            cur.execute("DELETE FROM reactions WHERE message_id = %s", (message_id,))
            cur.execute("DELETE FROM attachments WHERE message_id = %s", (message_id,))
            cur.execute("DELETE FROM message_status WHERE message_id = %s", (message_id,))
            cur.execute("DELETE FROM messages WHERE id = %s", (message_id,))
            conn.commit()
            cur.close()
            conn.close()

            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'ok': True})
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