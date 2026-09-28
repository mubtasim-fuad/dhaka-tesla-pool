import bcrypt from 'bcryptjs';
import { pool, transaction } from './db.js';

const people = [
  ['Jashim', 'jashim@example.test', 'DRIVER'],
  ['Nusrat', 'nusrat@example.test', 'PASSENGER'],
  ['Rafiq', 'rafiq@example.test', 'PASSENGER'],
  ['Shirin', 'shirin@example.test', 'PASSENGER'],
  ['Farhan', 'farhan@example.test', 'PASSENGER'],
];

try {
  const demoPassword = process.env.DEMO_PASSWORD;
  if (!demoPassword || demoPassword.length < 12) {
    throw new Error('Set a private DEMO_PASSWORD of at least 12 characters before seeding');
  }
  const hash = await bcrypt.hash(demoPassword, 10);
  await transaction(async (db) => {
    const ids = {};
    for (const [name, email, role] of people) {
      const result = await db.query(
        `INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4)
         ON CONFLICT(email) DO UPDATE SET name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash RETURNING id`,
        [name, email, hash, role]
      );
      ids[name] = result.rows[0].id;
    }
    await db.query(
      `INSERT INTO vehicles(driver_id,name,capacity,online) VALUES($1,'Bullet',3,true)
       ON CONFLICT(driver_id) DO NOTHING`, [ids.Jashim]
    );
    for (const [passenger, destination] of [['Nusrat','Mohakhali'], ['Rafiq','Gulshan 1']]) {
      const existing = await db.query('SELECT 1 FROM ride_requests WHERE passenger_id=$1', [ids[passenger]]);
      if (!existing.rowCount) {
        const request = await db.query(
          `INSERT INTO ride_requests(passenger_id,pickup_zone,destination_zone,seats)
           VALUES($1,'Banani',$2,1) RETURNING id`, [ids[passenger], destination]
        );
        await db.query(
          `INSERT INTO ride_events(request_id,actor_id,event_type,to_status)
           VALUES($1,$2,'REQUEST_CREATED','REQUESTED')`, [request.rows[0].id, ids[passenger]]
        );
      }
    }
  });
  console.log('Demo accounts seeded using the private DEMO_PASSWORD setting');
} finally {
  await pool.end();
}
