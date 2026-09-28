import { Router } from 'express';
import { requireRole } from './auth.js';
import { AppError } from './errors.js';
import { pool } from './db.js';
import { acceptRequest, advancePool, setOnline, fillPool } from './pooling.js';

const router = Router();
router.use(requireRole('DRIVER'));
router.get('/dashboard', async (req,res) => {
  const vehicle = await pool.query('SELECT id,name,capacity,online FROM vehicles WHERE driver_id=$1', [req.user.id]);
  if (!vehicle.rowCount) throw new AppError(404,'Vehicle not found');
  const pending = await pool.query(
    `SELECT r.id,r.pickup_zone,r.destination_zone,r.seats,r.created_at,u.name AS passenger_name
     FROM ride_requests r JOIN users u ON u.id=r.passenger_id WHERE r.status='REQUESTED'
     ORDER BY r.created_at,r.id LIMIT 50`
  );
  const rides = await pool.query(
    `SELECT p.id AS pool_id,p.status AS pool_status,p.pickup_zone,p.route_group,p.created_at,
            r.id AS request_id,r.status AS request_status,r.destination_zone,r.seats,
            m.fare_paisa,m.left_at,u.name AS passenger_name
     FROM pools p JOIN pool_memberships m ON m.pool_id=p.id JOIN ride_requests r ON r.id=m.request_id
     JOIN users u ON u.id=r.passenger_id WHERE p.vehicle_id=$1 ORDER BY p.created_at DESC,p.id DESC,r.id`, [vehicle.rows[0].id]
  );
  res.json({ vehicle:vehicle.rows[0], pending:pending.rows, rides:rides.rows });
});
router.post('/online', async (req,res) => {
  if (typeof req.body.online !== 'boolean') throw new AppError(400,'online must be true or false');
  await setOnline(req.user.id,req.body.online);
  res.json({ ok:true });
});
router.post('/requests/:id/accept', async (req,res) => {
  const id = await acceptRequest(req.user.id,req.params.id);
  res.status(201).json({ poolId:id });
});
router.post('/pools/:id/fill', async (req,res) => {
  const count = await fillPool(req.user.id,req.params.id);
  res.json({ added:count });
});
router.post('/pools/:id/advance', async (req,res) => {
  const to = await advancePool(req.user.id,req.params.id,req.body.to);
  res.json({ status:to });
});
export default router;
