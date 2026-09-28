ALTER TABLE pools ADD COLUMN capacity SMALLINT;
UPDATE pools SET capacity = vehicles.capacity FROM vehicles WHERE pools.vehicle_id = vehicles.id;
ALTER TABLE pools ALTER COLUMN capacity SET NOT NULL;
ALTER TABLE pools ADD COLUMN occupied_seats SMALLINT NOT NULL DEFAULT 0;
UPDATE pools SET occupied_seats = s.total
FROM (SELECT pool_id, SUM(seats)::smallint AS total FROM pool_memberships WHERE left_at IS NULL GROUP BY pool_id) s
WHERE pools.id = s.pool_id;
ALTER TABLE pools ADD CONSTRAINT pool_seats_within_capacity
  CHECK (capacity BETWEEN 1 AND 6 AND occupied_seats BETWEEN 0 AND capacity);
