CREATE TABLE chat_lead_teachers (
    chat_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (chat_id, user_id),
    CONSTRAINT fk_chat FOREIGN KEY (chat_id) REFERENCES chats(id),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
);