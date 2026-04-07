-- Индексы для ускорения запроса чатов
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_topic_created ON messages(topic_id, created_at DESC) WHERE topic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_status_msg_user ON message_status(message_id, user_id);
CREATE INDEX IF NOT EXISTS idx_message_status_user ON message_status(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
