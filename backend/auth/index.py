import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    '''API для аутентификации пользователей'''
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

    if method == 'POST':
        try:
            data = json.loads(event.get('body', '{}'))
            login = data.get('phone')
            password = data.get('password')

            if not login or not password:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Login and password are required'})
                }

            # Нормализация телефона
            def normalize_phone(phone_str):
                normalized = ''.join(c for c in phone_str if c.isdigit())
                if normalized.startswith('8'):
                    normalized = '7' + normalized[1:]
                return normalized

            # Подключение к БД
            conn = psycopg2.connect(os.environ['DATABASE_URL'])
            cur = conn.cursor(cursor_factory=RealDictCursor)

            # Проверяем, это email или телефон
            if '@' in login:
                cur.execute(
                    "SELECT id, name, phone, email, role, avatar, available_slots, education_docs FROM users WHERE email = %s AND password = %s",
                    (login, password)
                )
            else:
                normalized_login = normalize_phone(login)
                cur.execute(
                    "SELECT id, name, phone, email, role, avatar, available_slots, education_docs FROM users WHERE phone = %s AND password = %s",
                    (normalized_login, password)
                )
            
            user = cur.fetchone()

            cur.close()
            conn.close()

            if not user:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Invalid credentials'})
                }

            # Возвращаем данные пользователя
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'user': {
                        'id': user['id'],
                        'name': user['name'],
                        'phone': user['phone'],
                        'email': user['email'],
                        'role': user['role'],
                        'avatar': user['avatar'],
                        'availableSlots': user['available_slots'] or [],
                        'educationDocs': user['education_docs'] or []
                    }
                })
            }

        except Exception as e:
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