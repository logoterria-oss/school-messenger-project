-- Меняем дефолт для topic_id чтобы избежать NULL в PRIMARY KEY
ALTER TABLE typing_states ALTER COLUMN topic_id SET DEFAULT '';
ALTER TABLE typing_states ALTER COLUMN topic_id SET NOT NULL;
-- Обновим существующие NULL значения
UPDATE typing_states SET topic_id = '' WHERE topic_id IS NULL;
