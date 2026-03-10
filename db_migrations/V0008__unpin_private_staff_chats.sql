UPDATE t_p86655125_school_messenger_pro.chats
SET is_pinned = false
WHERE type = 'private' AND is_pinned = true;