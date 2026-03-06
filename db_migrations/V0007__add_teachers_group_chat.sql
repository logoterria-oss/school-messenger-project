
INSERT INTO chats (id, name, type, is_pinned)
VALUES ('teachers-group', 'Педагоги', 'group', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO topics (id, chat_id, name, icon) VALUES
('teachers-group-important', 'teachers-group', 'Важное', 'AlertCircle'),
('teachers-group-general', 'teachers-group', 'Общее', 'MessageSquare'),
('teachers-group-flood', 'teachers-group', 'Флудилка', 'Coffee'),
('teachers-group-new-students', 'teachers-group', 'Новые ученики', 'UserPlus'),
('teachers-group-parent-reviews', 'teachers-group', 'Отзывы родителей', 'Star'),
('teachers-group-support', 'teachers-group', 'Техподдержка', 'Headphones')
ON CONFLICT (id) DO NOTHING;

INSERT INTO chat_participants (chat_id, user_id) VALUES
('teachers-group', 'admin'),
('teachers-group', 'test-admin-2'),
('teachers-group', 'test-admin-3'),
('teachers-group', 'test-admin-4'),
('teachers-group', 'test-admin-5'),
('teachers-group', '1771669968872'),
('teachers-group', 'test-teacher-2'),
('teachers-group', 'test-teacher-3'),
('teachers-group', 'test-teacher-4'),
('teachers-group', 'test-teacher-5')
ON CONFLICT DO NOTHING;
