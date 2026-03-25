WITH ranked AS (
  SELECT id, user_id, endpoint,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, SUBSTRING(endpoint FROM '^https?://[^/]+')
      ORDER BY updated_at DESC
    ) as rn
  FROM push_subscriptions
)
UPDATE push_subscriptions SET endpoint = 'expired://' || id
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);