import json
import os
import psycopg2

def handler(event: dict, context) -> dict:
    '''Очистка сообщений и управление участниками'''
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': ''
        }

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    body = json.loads(event.get('body', '{}')) if event.get('body') else {}
    action = body.get('action', 'clear_messages')

    if action == 'cleanup_push':
        user_id = body.get('userId')
        keep_id = body.get('keepId')
        if not user_id or not keep_id:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'userId and keepId required'})}
        cur.execute("DELETE FROM push_subscriptions WHERE user_id = %s AND id != %s", (user_id, keep_id))
        deleted = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'success': True, 'deleted': deleted})}

    if action == 'fix_participants':
        chat_id = body.get('chatId')
        keep_ids = body.get('keepUserIds', [])
        if not chat_id or not keep_ids:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'chatId and keepUserIds required'})}

        placeholders = ','.join(['%s'] * len(keep_ids))
        cur.execute(
            "DELETE FROM chat_participants WHERE chat_id = %%s AND user_id NOT IN (%s)" % placeholders,
            [chat_id] + keep_ids
        )
        deleted = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True, 'deleted': deleted})
        }

    cur.execute("DELETE FROM reactions")
    cur.execute("DELETE FROM attachments")
    cur.execute("DELETE FROM message_status")
    cur.execute("DELETE FROM messages")
    conn.commit()

    cur.execute("SELECT COUNT(*) FROM messages")
    remaining = cur.fetchone()[0]

    cur.close()
    conn.close()

    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True, 'remaining': remaining})
    }