CREATE TABLE IF NOT EXISTS typing_states (
    chat_id TEXT NOT NULL,
    topic_id TEXT,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (chat_id, topic_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_typing_states_chat ON typing_states(chat_id, topic_id);
