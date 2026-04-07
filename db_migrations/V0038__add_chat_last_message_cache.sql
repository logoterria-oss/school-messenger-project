-- Кэш последнего сообщения в таблице chats
ALTER TABLE chats ADD COLUMN IF NOT EXISTS last_msg_text TEXT;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS last_msg_at TIMESTAMP;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS last_msg_topic_id TEXT;

-- Заполнить текущими данными
UPDATE chats c
SET last_msg_text = m.text,
    last_msg_at = m.created_at,
    last_msg_topic_id = m.topic_id
FROM (
    SELECT DISTINCT ON (chat_id) chat_id, text, created_at, topic_id
    FROM messages
    ORDER BY chat_id, created_at DESC
) m
WHERE c.id = m.chat_id;
