ALTER TABLE pool_memberships ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'CASH'
  CHECK (payment_method = 'CASH');
ALTER TABLE pool_memberships ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'PENDING'
  CHECK (payment_status IN ('PENDING','COLLECTED','VOID'));
