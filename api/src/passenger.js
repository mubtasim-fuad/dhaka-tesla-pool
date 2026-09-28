import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from './auth.js';
import { AppError } from './errors.js';
import { pool } from './db.js';
import { ZONES, quoteFare } from './domain.js';
import { createRequest, cancelRequest } from './pooling.js';

const router = Router();
router.use(requireRole('PASSENGER'));
const inputSchema = z.object({
  pickupZone: z.enum(ZONES), destinationZone: z.enum(ZONES), seats: z.number().int().min(1).max(3)
}).strict().refine(v => v.pickupZone !== v.destinationZone, 'Pickup and destination must differ');

router.get('/quote', (req,res) => {
  const input = inputSchema.parse({ pickupZone:req.query.pickupZone, destinationZone:req.query.destinationZone, seats:Number(req.query.seats || 1) });
  res.json(quoteFare(input.pickupZone,input.destinationZone,input.seats));
});
router.post('/', async (req,res) => {
  const input = inputSchema.parse(req.body);
  const id = await createRequest(req.user.id,input);
  res.status(201).json({ id });
});
router.get('/', async (req,res) => {
  const result = await pool.query(
    `SELECT r.id,r.pickup_zone,r.destination_zone,r.seats,r.status,r.created_at,r.updated_at,
            m.fare_paisa,m.pool_id,m.payment_method,m.payment_status,
            v.name AS vehicle_name,u.name AS driver_name
     FROM ride_requests r LEFT JOIN pool_memberships m ON m.request_id=r.id
     LEFT JOIN pools p ON p.id=m.pool_id LEFT JOIN vehicles v ON v.id=p.vehicle_id
     LEFT JOIN users u ON u.id=v.driver_id
     WHERE r.passenger_id=$1 ORDER BY r.created_at DESC,r.id DESC`, [req.user.id]
  );
  res.json({ requests: result.rows });
});
router.get('/:id/events', async (req,res) => {
  const owned = await pool.query('SELECT 1 FROM ride_requests WHERE id=$1 AND passenger_id=$2', [req.params.id,req.user.id]);
  if (!owned.rowCount) throw new AppError(404,'Ride not found');
  const events = await pool.query(
    `SELECT event_type,from_status,to_status,created_at,details FROM ride_events
     WHERE request_id=$1 ORDER BY id`, [req.params.id]
  );
  res.json({ events: events.rows });
});
router.post('/:id/cancel', async (req,res) => {
  await cancelRequest(req.user.id,req.params.id);
  res.json({ ok:true });
});
export default router;
