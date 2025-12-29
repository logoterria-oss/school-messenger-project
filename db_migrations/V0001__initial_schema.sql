-- Таблица пользователей
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'parent', 'student')),
    avatar TEXT,
    available_slots TEXT[],
    education_docs TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Таблица чатов
CREATE TABLE chats (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('group', 'private')),
    avatar TEXT,
    schedule TEXT,
    conclusion_link TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Таблица участников чатов
CREATE TABLE chat_participants (
    chat_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (chat_id, user_id)
);

-- Таблица топиков (для групповых чатов)
CREATE TABLE topics (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Таблица сообщений
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    topic_id TEXT,
    sender_id TEXT,
    sender_name TEXT NOT NULL,
    text TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Таблица вложений
CREATE TABLE attachments (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('image', 'file')),
    file_url TEXT,
    file_name TEXT,
    file_size TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Таблица реакций
CREATE TABLE reactions (
    id SERIAL PRIMARY KEY,
    message_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- Таблица статусов прочтения сообщений
CREATE TABLE message_status (
    message_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'read')),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_topic_id ON messages(topic_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX idx_reactions_message_id ON reactions(message_id);
CREATE INDEX idx_message_status_user_id ON message_status(user_id);
