
ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

UPDATE chats SET is_archived = true WHERE id IN (
    'private-test-admin-2-admin',
    'private-test-admin-3-admin',
    'private-test-admin-4-admin'
);

UPDATE chats SET is_pinned = false WHERE type = 'private';
