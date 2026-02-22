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
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
                WHERE c.id IN (SELECT chat_id FROM chat_participants WHERE user_id = %s)
                GROUP BY c.id, c.name, c.type, c.avatar, c.schedule, c.conclusion_link, c.is_pinned, m.text, m.created_at, unread.count
                ORDER BY c.is_pinned DESC, m.created_at DESC NULLS LAST
            """, (user_id, user_id, user_id))

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

            for chat in chats:
                chat['lead_teachers'] = lead_teachers_dict.get(chat['id'], [])

            group_ids = [c['id'] for c in chats if c['type'] == 'group']
            topics_dict = {}

            if group_ids:
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
                """, (user_id, group_ids))

                for topic in cur.fetchall():
                    cid = topic['chat_id']
                    if cid not in topics_dict:
                        topics_dict[cid] = []
                    topics_dict[cid].append({
                        'id': topic['id'],
                        'name': topic['name'],
                        'icon': topic['icon'],
                        'unread': topic['unread']
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

            required_fields = ['id', 'name', 'type', 'participants']
            if not all(field in data for field in required_fields):
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Missing required fields'})}

            cur.execute("""
                INSERT INTO chats (id, name, type, avatar, schedule, conclusion_link, is_pinned)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
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

            result = cur.fetchone()
            chat_id = result['id'] if result else data['id']

            for uid in data['participants']:
                cur.execute("""
                    INSERT INTO chat_participants (chat_id, user_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                """, (chat_id, uid))

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

            if 'schedule' in data:
                updates.append('schedule = %s')
                values.append(data['schedule'])
            if 'conclusionLink' in data:
                updates.append('conclusion_link = %s')
                values.append(data['conclusionLink'])
            if 'name' in data:
                updates.append('name = %s')
                values.append(data['name'])

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

            conn.commit()
            cur.close()
            conn.close()

            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'chatId': chat_id})}

    except Exception as e:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

        return {'statusCode': 500, 'headers': cors, 'body': json.dumps({'error': str(e)})}

    return {'statusCode': 405, 'headers': cors, 'body': json.dumps({'error': 'Method not allowed'})}
