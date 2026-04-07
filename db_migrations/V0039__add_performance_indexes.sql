-- Индексы для ускорения запроса списка чатов
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created ON messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_topic_id_created ON messages(topic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_status_message_user ON message_status(message_id, user_id);
CREATE INDEX IF NOT EXISTS idx_message_status_user_status ON message_status(user_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_sender ON messages(chat_id, sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat ON chat_participants(chat_id);