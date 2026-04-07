import json
import os
import base64
import uuid
import psycopg2
from psycopg2.extras import RealDictCursor
import boto3
# v3

def upload_pdf_to_s3(pdf_base64: str, chat_id: str) -> str:
    if ',' in pdf_base64:
        pdf_base64 = pdf_base64.split(',', 1)[1]
    pdf_data = base64.b64decode(pdf_base64)
    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    )
    key = f"conclusions/{chat_id}/{uuid.uuid4().hex}.pdf"
    s3.put_object(Bucket='files', Key=key, Body=pdf_data, ContentType='application/pdf')
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

def handler(event: dict, context) -> dict:
    '''API для управления чатами и группами'''
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

    cors = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}

    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor(cursor_factory=RealDictCursor)

        if method == 'GET':
            headers = event.get('headers', {}) or {}
            user_id = headers.get('x-user-id') or headers.get('X-User-Id')

            if not user_id:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'X-User-Id header is required'})}

            cur.execute("SELECT role FROM users WHERE id = %s", (user_id,))
            role_row = cur.fetchone()
            user_role = role_row['role'] if role_row else ''

            cur.execute("""
                WITH chat_data AS (
                    SELECT c.id, c.name, c.type, c.avatar, c.schedule, c.conclusion_link, c.conclusion_pdf,
                           CASE WHEN c.type = 'private' THEN false ELSE COALESCE(c.is_pinned, false) END as is_pinned,
                           COALESCE(c.is_archived, false) as is_archived, c.lead_admin,
                           COALESCE(m.text, '') as last_message,
                           TO_CHAR(m.created_at, 'HH24:MI') as timestamp,
                           COALESCE(unread.count, 0) as unread,
                           ARRAY_AGG(DISTINCT cp.user_id ORDER BY cp.user_id) as participants,
                           m.created_at as last_msg_at
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
                        AND (
                            msg.topic_id IS NULL
                            OR NOT (
                                (%s = 'teacher' AND msg.topic_id LIKE '%%' || '-admin-contact')
                                OR (%s = 'student' AND msg.topic_id NOT LIKE '%%' || '-important'
                                    AND msg.topic_id NOT LIKE '%%' || '-zoom'
                                    AND msg.topic_id NOT LIKE '%%' || '-homework'
                                    AND msg.topic_id NOT LIKE '%%' || '-reports'
                                    AND msg.topic_id NOT LIKE '%%' || '-cancellation')
                            )
                        )
                    ) unread ON true
                    WHERE c.id IN (SELECT chat_id FROM chat_participants WHERE user_id = %s)
                    GROUP BY c.id, c.name, c.type, c.avatar, c.schedule, c.conclusion_link, c.conclusion_pdf, c.is_pinned, c.is_archived, c.lead_admin, m.text, m.created_at, unread.count
                ),
                deduped AS (
                    SELECT DISTINCT ON (
                        CASE WHEN type = 'private' THEN participants::text ELSE id END
                    ) *
                    FROM chat_data
                    ORDER BY CASE WHEN type = 'private' THEN participants::text ELSE id END, last_msg_at DESC NULLS LAST
                )
                SELECT id, name, type, avatar, schedule, conclusion_link, conclusion_pdf, is_pinned, is_archived, lead_admin, last_message, timestamp, unread, participants
                FROM deduped
                ORDER BY is_pinned DESC, last_msg_at DESC NULLS LAST
            """, (user_id, user_id, user_role, user_role, user_id))

            chats = cur.fetchall()
            chat_ids = [c['id'] for c in chats]

            lead_teachers_dict = {}
            if chat_ids:
                cur.execute("""
                    SELECT chat_id, ARRAY_AGG(user_id) as lead_teachers
                    FROM chat_lead_teachers
                    WHERE chat_id = ANY(%s)
                    GROUP BY chat_id
                """, (chat_ids,))
                for row in cur.fetchall():
                    lead_teachers_dict[row['chat_id']] = row['lead_teachers']

            conclusions_dict = {}
            if chat_ids:
                cur.execute("""
                    SELECT id, chat_id, conclusion_link, conclusion_pdf, TO_CHAR(created_at, 'YYYY-MM-DD') as created_date, TO_CHAR(diagnosis_date, 'YYYY-MM-DD') as diagnosis_date
                    FROM conclusions
                    WHERE chat_id = ANY(%s)
                    ORDER BY created_at ASC
                """, (chat_ids,))
                for row in cur.fetchall():
                    cid = row['chat_id']
                    if cid not in conclusions_dict:
                        conclusions_dict[cid] = []
                    conclusions_dict[cid].append({
                        'id': row['id'],
                        'conclusionLink': row['conclusion_link'],
                        'conclusionPdf': row['conclusion_pdf'],
                        'createdDate': row['created_date'],
                        'diagnosisDate': row['diagnosis_date']
                    })

            for chat in chats:
                chat['lead_teachers'] = lead_teachers_dict.get(chat['id'], [])
                chat['conclusions'] = conclusions_dict.get(chat['id'], [])

            group_ids = [c['id'] for c in chats if c['type'] == 'group']
            topics_dict = {}

            user_name = None
            if group_ids:
                cur.execute("SELECT name FROM users WHERE id = %s", (user_id,))
                user_row = cur.fetchone()
                if user_row:
                    user_name = user_row['name']

                mention_pattern = '%@[' + user_name + '%' if user_name else None
                admin_mention_pattern = '%@[админ%' if user_role == 'admin' else None

                if mention_pattern and admin_mention_pattern:
                    cur.execute("""
                        SELECT t.id, t.chat_id, t.name, t.icon,
                               COALESCE(COUNT(DISTINCT m.id) FILTER (
                                   WHERE (ms.status IS NULL OR ms.status != 'read') AND m.sender_id != %s
                               ), 0) as unread,
                               COALESCE(COUNT(DISTINCT m.id) FILTER (
                                   WHERE (ms.status IS NULL OR ms.status != 'read') AND m.sender_id != %s
                                   AND (m.text LIKE %s OR m.text LIKE %s)
                               ), 0) as unread_mentions
                        FROM topics t
                        LEFT JOIN messages m ON m.topic_id = t.id
                        LEFT JOIN message_status ms ON ms.message_id = m.id AND ms.user_id = %s
                        WHERE t.chat_id = ANY(%s)
                        GROUP BY t.id, t.chat_id, t.name, t.icon
                        ORDER BY t.created_at
                    """, (user_id, user_id, mention_pattern, admin_mention_pattern, user_id, group_ids))
                else:
                    cur.execute("""
                        SELECT t.id, t.chat_id, t.name, t.icon,
                               COALESCE(COUNT(DISTINCT m.id) FILTER (
                                   WHERE (ms.status IS NULL OR ms.status != 'read') AND m.sender_id != %s
                               ), 0) as unread,
                               COALESCE(COUNT(DISTINCT m.id) FILTER (
                                   WHERE (ms.status IS NULL OR ms.status != 'read') AND m.sender_id != %s
                                   AND m.text LIKE %s
                               ), 0) as unread_mentions
                        FROM topics t
                        LEFT JOIN messages m ON m.topic_id = t.id
                        LEFT JOIN message_status ms ON ms.message_id = m.id AND ms.user_id = %s
                        WHERE t.chat_id = ANY(%s)
                        GROUP BY t.id, t.chat_id, t.name, t.icon
                        ORDER BY t.created_at
                    """, (user_id, user_id, mention_pattern or '%%%NOMATCH%%%', user_id, group_ids))

                STUDENT_ALLOWED_SUFFIXES = ('-important', '-zoom', '-homework', '-reports', '-cancellation')

                for topic in cur.fetchall():
                    tid = topic['id']
                    if user_role == 'teacher' and tid.endswith('-admin-contact'):
                        continue
                    if user_role == 'student' and not any(tid.endswith(s) for s in STUDENT_ALLOWED_SUFFIXES):
                        continue

                    cid = topic['chat_id']
                    if cid not in topics_dict:
                        topics_dict[cid] = []
                    topics_dict[cid].append({
                        'id': topic['id'],
                        'name': topic['name'],
                        'icon': topic['icon'],
                        'unread': topic['unread'],
                        'unread_mentions': topic['unread_mentions']
                    })

            cur.close()
            conn.close()

            return {
                'statusCode': 200,
                'headers': cors,
                'body': json.dumps({'chats': [dict(c) for c in chats], 'topics': topics_dict}, default=str)
            }

        elif method == 'POST':
            data = json.loads(event.get('body', '{}'))
            action = data.get('action')

            if action == 'add_conclusion':
                chat_id = data.get('chatId')
                if not chat_id:
                    cur.close()
                    conn.close()
                    return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'chatId required'})}

                pdf_url = None
                if data.get('conclusionPdfBase64'):
                    pdf_url = upload_pdf_to_s3(data['conclusionPdfBase64'], chat_id)

                diagnosis_date = data.get('diagnosisDate')

                cur.execute("""
                    INSERT INTO conclusions (chat_id, conclusion_link, conclusion_pdf, diagnosis_date)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id, TO_CHAR(created_at, 'YYYY-MM-DD') as created_date, TO_CHAR(diagnosis_date, 'YYYY-MM-DD') as diagnosis_date
                """, (chat_id, data.get('conclusionLink'), pdf_url, diagnosis_date))
                row = cur.fetchone()

                conn.commit()
                cur.close()
                conn.close()

                return {'statusCode': 201, 'headers': cors, 'body': json.dumps({
                    'conclusion': {
                        'id': row['id'],
                        'conclusionLink': data.get('conclusionLink'),
                        'conclusionPdf': pdf_url,
                        'createdDate': row['created_date'],
                        'diagnosisDate': row['diagnosis_date']
                    }
                })}

            elif action == 'update_conclusion':
                conclusion_id = data.get('conclusionId')
                chat_id = data.get('chatId')
                if not conclusion_id or not chat_id:
                    cur.close()
                    conn.close()
                    return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'conclusionId and chatId required'})}

                c_updates = []
                c_values = []
                pdf_url = None
                if 'conclusionLink' in data:
                    c_updates.append('conclusion_link = %s')
                    c_values.append(data['conclusionLink'])
                if data.get('conclusionPdfBase64'):
                    pdf_url = upload_pdf_to_s3(data['conclusionPdfBase64'], chat_id)
                    c_updates.append('conclusion_pdf = %s')
                    c_values.append(pdf_url)
                if 'diagnosisDate' in data:
                    c_updates.append('diagnosis_date = %s')
                    c_values.append(data['diagnosisDate'])
                if c_updates:
                    c_values.extend([conclusion_id, chat_id])
                    cur.execute(f"UPDATE conclusions SET {', '.join(c_updates)} WHERE id = %s AND chat_id = %s", c_values)

                conn.commit()

                cur.execute("SELECT id, conclusion_link, conclusion_pdf, TO_CHAR(created_at, 'YYYY-MM-DD') as created_date, TO_CHAR(diagnosis_date, 'YYYY-MM-DD') as diagnosis_date FROM conclusions WHERE id = %s", (conclusion_id,))
                row = cur.fetchone()
                cur.close()
                conn.close()

                return {'statusCode': 200, 'headers': cors, 'body': json.dumps({
                    'conclusion': {
                        'id': row['id'],
                        'conclusionLink': row['conclusion_link'],
                        'conclusionPdf': row['conclusion_pdf'],
                        'createdDate': row['created_date'],
                        'diagnosisDate': row['diagnosis_date']
                    }
                })}

            elif action == 'delete_conclusion':
                conclusion_id = data.get('conclusionId')
                chat_id = data.get('chatId')
                if not conclusion_id or not chat_id:
                    cur.close()
                    conn.close()
                    return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'conclusionId and chatId required'})}

                cur.execute("DELETE FROM conclusions WHERE id = %s AND chat_id = %s", (conclusion_id, chat_id))
                conn.commit()
                cur.close()
                conn.close()

                return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'deleted': True})}

            print(f"POST /chats: creating {data.get('type')} chat '{data.get('name')}' id={data.get('id')} participants={len(data.get('participants', []))}")

            required_fields = ['id', 'name', 'type', 'participants']
            if not all(field in data for field in required_fields):
                print(f"POST /chats: missing fields, got keys: {list(data.keys())}")
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Missing required fields'})}

            if data['type'] == 'private' and len(data['participants']) == 2:
                sorted_p = sorted(data['participants'])
                cur.execute("""
                    SELECT c.id FROM chats c
                    WHERE c.type = 'private'
                    AND c.id IN (
                        SELECT cp1.chat_id
                        FROM chat_participants cp1
                        JOIN chat_participants cp2 ON cp1.chat_id = cp2.chat_id
                        WHERE cp1.user_id = %s AND cp2.user_id = %s
                    )
                    LIMIT 1
                """, (sorted_p[0], sorted_p[1]))
                existing = cur.fetchone()
                if existing:
                    cur.close()
                    conn.close()
                    return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'chatId': existing['id'], 'existing': True})}

            conclusion_pdf_url = None
            if data.get('conclusionPdfBase64'):
                conclusion_pdf_url = upload_pdf_to_s3(data['conclusionPdfBase64'], data['id'])

            cur.execute("""
                INSERT INTO chats (id, name, type, avatar, schedule, conclusion_link, conclusion_pdf, is_pinned, lead_admin)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
                RETURNING id
            """, (
                data['id'],
                data['name'],
                data['type'],
                data.get('avatar'),
                data.get('schedule'),
                data.get('conclusionLink'),
                conclusion_pdf_url,
                data.get('isPinned', False),
                data.get('leadAdmin')
            ))

            result = cur.fetchone()
            chat_id = result['id'] if result else data['id']

            if data.get('conclusionLink') or conclusion_pdf_url:
                cur.execute("""
                    INSERT INTO conclusions (chat_id, conclusion_link, conclusion_pdf)
                    VALUES (%s, %s, %s)
                """, (chat_id, data.get('conclusionLink'), conclusion_pdf_url))

            for uid in data['participants']:
                cur.execute("""
                    INSERT INTO chat_participants (chat_id, user_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                """, (chat_id, uid))

            for uid in data['participants']:
                cur.execute("""
                    INSERT INTO message_status (message_id, user_id, status, updated_at)
                    SELECT m.id, %s, 'read', NOW()
                    FROM messages m
                    WHERE m.chat_id = %s AND m.sender_id != %s
                    ON CONFLICT (message_id, user_id) DO NOTHING
                """, (uid, chat_id, uid))

            lead_teachers = data.get('leadTeachers', [])
            for uid in lead_teachers:
                cur.execute("""
                    INSERT INTO chat_lead_teachers (chat_id, user_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                """, (chat_id, uid))

            if data['type'] == 'group' and 'topics' in data:
                for topic in data['topics']:
                    cur.execute("""
                        INSERT INTO topics (id, chat_id, name, icon)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT DO NOTHING
                    """, (topic['id'], chat_id, topic['name'], topic['icon']))

                cur.execute("""
                    SELECT id FROM users WHERE role = 'tech_specialist'
                """)
                tech_specialists = [r['id'] for r in cur.fetchall()]
                for ts_id in tech_specialists:
                    cur.execute("""
                        INSERT INTO chat_participants (chat_id, user_id)
                        VALUES (%s, %s)
                        ON CONFLICT DO NOTHING
                    """, (chat_id, ts_id))
                    for topic in data['topics']:
                        cur.execute("""
                            INSERT INTO topic_mutes (topic_id, user_id)
                            VALUES (%s, %s)
                            ON CONFLICT DO NOTHING
                        """, (topic['id'], ts_id))

            conn.commit()
            cur.close()
            conn.close()

            return {'statusCode': 201, 'headers': cors, 'body': json.dumps({'chatId': chat_id})}

        elif method == 'PUT':
            data = json.loads(event.get('body', '{}'))
            chat_id = data.get('id')

            if not chat_id:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Chat ID is required'})}

            updates = []
            values = []
            new_pdf_url = None

            if 'schedule' in data:
                updates.append('schedule = %s')
                values.append(data['schedule'])
            if 'conclusionLink' in data:
                updates.append('conclusion_link = %s')
                values.append(data['conclusionLink'])
            if 'conclusionPdfBase64' in data:
                if data['conclusionPdfBase64']:
                    new_pdf_url = upload_pdf_to_s3(data['conclusionPdfBase64'], chat_id)
                    updates.append('conclusion_pdf = %s')
                    values.append(new_pdf_url)
                else:
                    updates.append('conclusion_pdf = %s')
                    values.append(None)

            if 'conclusionId' in data and ('conclusionLink' in data or 'conclusionPdfBase64' in data):
                conclusion_id = data['conclusionId']
                c_updates = []
                c_values = []
                if 'conclusionLink' in data:
                    c_updates.append('conclusion_link = %s')
                    c_values.append(data['conclusionLink'])
                if new_pdf_url:
                    c_updates.append('conclusion_pdf = %s')
                    c_values.append(new_pdf_url)
                if c_updates:
                    c_values.append(conclusion_id)
                    c_values.append(chat_id)
                    cur.execute(f"UPDATE conclusions SET {', '.join(c_updates)} WHERE id = %s AND chat_id = %s", c_values)
            if 'name' in data:
                updates.append('name = %s')
                values.append(data['name'])
            if 'is_archived' in data:
                updates.append('is_archived = %s')
                values.append(bool(data['is_archived']))
            if 'leadAdmin' in data:
                updates.append('lead_admin = %s')
                values.append(data['leadAdmin'])

            if updates:
                updates.append('updated_at = NOW()')
                values.append(chat_id)
                query = f"UPDATE chats SET {', '.join(updates)} WHERE id = %s RETURNING id"
                cur.execute(query, values)
                cur.fetchone()

            if 'leadTeachers' in data:
                cur.execute("SELECT user_id FROM chat_lead_teachers WHERE chat_id = %s", (chat_id,))
                existing = {r['user_id'] for r in cur.fetchall()}
                new_set = set(data['leadTeachers'])

                for uid in new_set - existing:
                    cur.execute("INSERT INTO chat_lead_teachers (chat_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (chat_id, uid))
                for uid in existing - new_set:
                    cur.execute("DELETE FROM chat_lead_teachers WHERE chat_id = %s AND user_id = %s", (chat_id, uid))

            if 'participants' in data:
                cur.execute("SELECT user_id FROM chat_participants WHERE chat_id = %s", (chat_id,))
                existing = {r['user_id'] for r in cur.fetchall()}
                new_set = set(data['participants'])

                for uid in new_set - existing:
                    cur.execute("INSERT INTO chat_participants (chat_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (chat_id, uid))
                    cur.execute("""
                        INSERT INTO message_status (message_id, user_id, status, updated_at)
                        SELECT m.id, %s, 'read', NOW()
                        FROM messages m
                        WHERE m.chat_id = %s AND m.sender_id != %s
                        ON CONFLICT (message_id, user_id) DO NOTHING
                    """, (uid, chat_id, uid))
                for uid in existing - new_set:
                    cur.execute("DELETE FROM chat_participants WHERE chat_id = %s AND user_id = %s", (chat_id, uid))

            conn.commit()
            cur.close()
            conn.close()

            resp = {'chatId': chat_id}
            if new_pdf_url:
                resp['conclusionPdf'] = new_pdf_url
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps(resp)}

        elif method == 'DELETE':
            params = event.get('queryStringParameters', {}) or {}
            chat_id = params.get('chatId')
            body_data = json.loads(event.get('body', '{}')) if event.get('body') else {}
            chat_ids = body_data.get('chatIds', [])

            if chat_id:
                chat_ids = [chat_id]

            if not chat_ids:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'chatId or chatIds required'})}

            for cid in chat_ids:
                cur.execute("DELETE FROM message_status WHERE message_id IN (SELECT id FROM messages WHERE chat_id = %s)", (cid,))
                cur.execute("DELETE FROM attachments WHERE message_id IN (SELECT id FROM messages WHERE chat_id = %s)", (cid,))
                cur.execute("DELETE FROM reactions WHERE message_id IN (SELECT id FROM messages WHERE chat_id = %s)", (cid,))
                cur.execute("DELETE FROM messages WHERE chat_id = %s", (cid,))
                cur.execute("DELETE FROM topics WHERE chat_id = %s", (cid,))
                cur.execute("DELETE FROM chat_lead_teachers WHERE chat_id = %s", (cid,))
                cur.execute("DELETE FROM chat_participants WHERE chat_id = %s", (cid,))
                cur.execute("DELETE FROM chats WHERE id = %s", (cid,))

            conn.commit()
            cur.close()
            conn.close()

            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'ok': True, 'deleted': len(chat_ids)})}

    except Exception as e:
        import traceback
        traceback.print_exc()
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

        return {'statusCode': 500, 'headers': cors, 'body': json.dumps({'error': str(e)})}

    return {'statusCode': 405, 'headers': cors, 'body': json.dumps({'error': 'Method not allowed'})}