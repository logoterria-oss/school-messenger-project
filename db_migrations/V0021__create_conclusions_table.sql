CREATE TABLE conclusions (
    id SERIAL PRIMARY KEY,
    chat_id TEXT NOT NULL,
    conclusion_link TEXT,
    conclusion_pdf TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conclusions_chat_id ON conclusions(chat_id);

INSERT INTO conclusions (chat_id, conclusion_link, conclusion_pdf, created_at)
SELECT id, conclusion_link, conclusion_pdf, COALESCE(updated_at, NOW())
FROM chats
WHERE conclusion_link IS NOT NULL OR conclusion_pdf IS NOT NULL;