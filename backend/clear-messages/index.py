import json
import os
import psycopg2

def handler(event: dict, context) -> dict:
    '''Очистка всех сообщений'''
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
