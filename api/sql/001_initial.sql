CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 80),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('PASSENGER', 'DRIVER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vehicles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  driver_id BIGINT NOT NULL UNIQUE REFERENCES users(id),
  name TEXT NOT NULL,
  capacity SMALLINT NOT NULL CHECK (capacity BETWEEN 1 AND 6),
  online BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ride_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  passenger_id BIGINT NOT NULL REFERENCES users(id),
  pickup_zone TEXT NOT NULL,
  destination_zone TEXT NOT NULL,
  seats SMALLINT NOT NULL CHECK (seats BETWEEN 1 AND 6),
  status TEXT NOT NULL DEFAULT 'REQUESTED'
    CHECK (status IN ('REQUESTED','MATCHED','DRIVER_ARRIVED','STARTED','COMPLETED','CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (pickup_zone <> destination_zone)
);

CREATE INDEX ride_requests_pending_idx ON ride_requests(pickup_zone, created_at, id)
  WHERE status = 'REQUESTED';
CREATE INDEX ride_requests_passenger_idx ON ride_requests(passenger_id, created_at DESC);

CREATE TABLE pools (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id),
  pickup_zone TEXT NOT NULL,
  route_group TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'MATCHED'
    CHECK (status IN ('MATCHED','DRIVER_ARRIVED','STARTED','COMPLETED','CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One driver cannot take a second active ride while still operating another one.
CREATE UNIQUE INDEX pools_one_active_per_vehicle ON pools(vehicle_id)
  WHERE status IN ('MATCHED','DRIVER_ARRIVED','STARTED');
CREATE INDEX pools_open_lookup_idx ON pools(pickup_zone, route_group, created_at)
  WHERE status = 'MATCHED';

CREATE TABLE pool_memberships (
  request_id BIGINT PRIMARY KEY REFERENCES ride_requests(id),
  pool_id BIGINT NOT NULL REFERENCES pools(id),
  seats SMALLINT NOT NULL CHECK (seats BETWEEN 1 AND 6),
  fare_paisa INTEGER NOT NULL CHECK (fare_paisa >= 0),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ
);
CREATE INDEX pool_memberships_active_idx ON pool_memberships(pool_id)
  WHERE left_at IS NULL;

CREATE TABLE ride_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id BIGINT REFERENCES ride_requests(id),
  pool_id BIGINT REFERENCES pools(id),
  actor_id BIGINT REFERENCES users(id),
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (request_id IS NOT NULL OR pool_id IS NOT NULL)
);
CREATE INDEX ride_events_request_idx ON ride_events(request_id, id);
CREATE INDEX ride_events_pool_idx ON ride_events(pool_id, id);
