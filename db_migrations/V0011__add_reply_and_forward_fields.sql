ALTER TABLE messages
ADD COLUMN reply_to_id TEXT NULL,
ADD COLUMN reply_to_sender TEXT NULL,
ADD COLUMN reply_to_text TEXT NULL,
ADD COLUMN forwarded_from_id TEXT NULL,
ADD COLUMN forwarded_from_sender TEXT NULL,
ADD COLUMN forwarded_from_text TEXT NULL,
ADD COLUMN forwarded_from_date TIMESTAMP NULL,
ADD COLUMN forwarded_from_chat_name TEXT NULL;

CREATE INDEX idx_messages_reply_to ON messages(reply_to_id);
