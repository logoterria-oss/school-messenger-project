import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def normalize_phone(phone_str):
    normalized = ''.join(c for c in str(phone_str) if c.isdigit())
    if normalized.startswith('8'):
        normalized = '7' + normalized[1:]
    return normalized

def handler(event: dict, context) -> dict:
    '''API для управления пользователями и группами'''
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

    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor(cursor_factory=RealDictCursor)

        if method == 'GET':
            params = event.get('queryStringParameters', {}) or {}
            user_id = params.get('userId')

            if user_id:
                # Получить данные конкретного пользователя
                cur.execute("""
                    SELECT id, name, phone, email, role, avatar, available_slots, education_docs
                    FROM users WHERE id = %s
                """, (user_id,))
                user = cur.fetchone()

                if not user:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'User not found'})
                    }

                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'user': dict(user)}, default=str)
                }
            else:
                # Получить всех пользователей
                cur.execute("""
                    SELECT id, name, phone, email, role, avatar, available_slots, education_docs
                    FROM users ORDER BY name
                """)
                users = cur.fetchall()

                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'users': [dict(u) for u in users]}, default=str)
                }

        elif method == 'POST':
            # Создать нового пользователя
            data = json.loads(event.get('body', '{}'))
            
            required_fields = ['id', 'name', 'phone', 'password', 'role']
            if not all(field in data for field in required_fields):
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Missing required fields'})
                }

            phone_normalized = normalize_phone(data['phone'])

            cur.execute("""
                INSERT INTO users (id, name, phone, email, password, role, avatar, available_slots, education_docs)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
                RETURNING id, name, phone, email, role
            """, (
                data['id'],
                data['name'],
                phone_normalized,
                data.get('email'),
                data['password'],
                data['role'],
                data.get('avatar'),
                data.get('availableSlots', []),
                data.get('educationDocs', [])
            ))

            user = cur.fetchone()
            conn.commit()

            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'user': dict(user)})
            }

        elif method == 'PUT':
            # Обновить данные пользователя
            data = json.loads(event.get('body', '{}'))
            user_id = data.get('id')

            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'User ID is required'})
                }

            # Формируем динамический UPDATE запрос
            updates = []
            values = []
            
            if 'phone' in data:
                updates.append('phone = %s')
                values.append(data['phone'])
            if 'email' in data:
                updates.append('email = %s')
                values.append(data['email'])
            if 'availableSlots' in data:
                updates.append('available_slots = %s')
                values.append(data['availableSlots'])
            if 'educationDocs' in data:
                updates.append('education_docs = %s')
                values.append(data['educationDocs'])
            if 'avatar' in data:
                updates.append('avatar = %s')
                values.append(data['avatar'])

            if not updates:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'No fields to update'})
                }

            updates.append('updated_at = NOW()')
            values.append(user_id)

            query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s RETURNING id, name, phone, email, role, avatar, available_slots, education_docs"
            cur.execute(query, values)
            
            user = cur.fetchone()
            conn.commit()

            if not user:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'User not found'})
                }

            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'user': dict(user)}, default=str)
            }

        elif method == 'DELETE':
            params = event.get('queryStringParameters', {}) or {}
            user_id = params.get('userId')

            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'userId is required'})
                }

            cur.execute("DELETE FROM users WHERE id = %s RETURNING id", (user_id,))
            deleted = cur.fetchone()
            conn.commit()

            if not deleted:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'User not found'})
                }

            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'deleted': user_id})
            }

        cur.close()
        conn.close()

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