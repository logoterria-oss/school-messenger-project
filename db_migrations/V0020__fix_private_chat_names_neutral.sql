UPDATE chats c
SET name = sub.display_name
FROM (
  SELECT 
    cp.chat_id,
    string_agg(u.name, ' — ' ORDER BY u.name) AS display_name
  FROM chat_participants cp
  JOIN users u ON u.id = cp.user_id
  JOIN chats ch ON ch.id = cp.chat_id
  WHERE ch.type = 'private'
  GROUP BY cp.chat_id
) sub
WHERE c.id = sub.chat_id AND c.type = 'private';