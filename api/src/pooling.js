import { transaction } from './db.js';
import { AppError } from './errors.js';
import { nextPoolStatus, quoteFare, routeGroup } from './domain.js';

function id(value) {
  if (!/^\d+$/.test(String(value))) throw new AppError(400,'Invalid ID');
  return String(value);
}

async function event(db, { requestId, poolId, actorId, type, from, to, details = {} }) {
  await db.query(
    `INSERT INTO ride_events(request_id,pool_id,actor_id,event_type,from_status,to_status,details)
     VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [requestId || null,poolId || null,actorId || null,type,from || null,to || null,JSON.stringify(details)]
  );
}

// All callers hold SELECT ... FOR UPDATE on this pool's vehicle row.
async function attach(db, vehicle, currentPool, request, actorId) {
  if (currentPool.status !== 'MATCHED' || request.status !== 'REQUESTED') return false;
  if (currentPool.pickup_zone !== request.pickup_zone ||
      currentPool.route_group !== routeGroup(request.pickup_zone,request.destination_zone)) return false;
  // This conditional UPDATE is an atomic second guard in addition to the vehicle lock.
  const seatClaim = await db.query(
    `UPDATE pools SET occupied_seats=occupied_seats+$2 WHERE id=$1 AND status='MATCHED'
     AND occupied_seats+$2 <= capacity RETURNING id`, [currentPool.id,request.seats]
  );
  if (!seatClaim.rowCount) return false;
  const fare = quoteFare(request.pickup_zone,request.destination_zone,request.seats);
  await db.query(
    `INSERT INTO pool_memberships(request_id,pool_id,seats,fare_paisa)
     VALUES($1,$2,$3,$4)`, [request.id,currentPool.id,request.seats,fare.farePaisa]
  );
  await db.query(
    `UPDATE ride_requests SET status='MATCHED',updated_at=now() WHERE id=$1`, [request.id]
  );
  await event(db, { requestId:request.id,poolId:currentPool.id,actorId,
    type:'SEAT_ASSIGNED',from:'REQUESTED',to:'MATCHED',details:{ farePaisa:fare.farePaisa,seats:request.seats } });
  return true;
}

async function addPendingRiders(db, vehicle, currentPool, actorId) {
  const candidates = await db.query(
    `SELECT * FROM ride_requests WHERE status='REQUESTED' AND pickup_zone=$1
     ORDER BY created_at,id LIMIT 100 FOR UPDATE SKIP LOCKED`, [currentPool.pickup_zone]
  );
  let added = 0;
  for (const request of candidates.rows) {
    if (await attach(db,vehicle,currentPool,request,actorId)) added++;
  }
  return added;
}

export async function createRequest(passengerId, input) {
  return transaction(async (db) => {
    const result = await db.query(
      `INSERT INTO ride_requests(passenger_id,pickup_zone,destination_zone,seats)
       VALUES($1,$2,$3,$4) RETURNING *`,
      [passengerId,input.pickupZone,input.destinationZone,input.seats]
    );
    const request = result.rows[0];
    await event(db,{ requestId:request.id,actorId:passengerId,type:'REQUEST_CREATED',to:'REQUESTED' });
    const candidates = await db.query(
      `SELECT id,vehicle_id FROM pools WHERE status='MATCHED' AND pickup_zone=$1
       AND route_group=$2 ORDER BY created_at,id`,
      [request.pickup_zone,routeGroup(request.pickup_zone,request.destination_zone)]
    );
    for (const candidate of candidates.rows) {
      // A vehicle lock serializes seat changes; re-read the pool and seats after it is acquired.
      const vehicle = await db.query('SELECT * FROM vehicles WHERE id=$1 FOR UPDATE',[candidate.vehicle_id]);
      const fresh = await db.query('SELECT * FROM pools WHERE id=$1',[candidate.id]);
      if (vehicle.rows[0]?.online && fresh.rows[0] && await attach(db,vehicle.rows[0],fresh.rows[0],request,passengerId)) break;
    }
    return request.id;
  });
}

export async function acceptRequest(driverId, requestId) {
  return transaction(async (db) => {
    const vehicleResult = await db.query('SELECT * FROM vehicles WHERE driver_id=$1 FOR UPDATE',[driverId]);
    const vehicle = vehicleResult.rows[0];
    if (!vehicle) throw new AppError(404,'Vehicle not found');
    if (!vehicle.online) throw new AppError(409,'Go online before accepting');
    const active = await db.query(
      `SELECT 1 FROM pools WHERE vehicle_id=$1 AND status IN ('MATCHED','DRIVER_ARRIVED','STARTED')`,[vehicle.id]
    );
    if (active.rowCount) throw new AppError(409,'Finish your active pool first');
    const requestResult = await db.query('SELECT * FROM ride_requests WHERE id=$1 FOR UPDATE',[id(requestId)]);
    const request = requestResult.rows[0];
    if (!request || request.status !== 'REQUESTED') throw new AppError(409,'Request is no longer available');
    if (request.seats > vehicle.capacity) throw new AppError(409,'Party exceeds vehicle capacity');
    const created = await db.query(
      `INSERT INTO pools(vehicle_id,pickup_zone,route_group,capacity) VALUES($1,$2,$3,$4) RETURNING *`,
      [vehicle.id,request.pickup_zone,routeGroup(request.pickup_zone,request.destination_zone),vehicle.capacity]
    );
    const currentPool = created.rows[0];
    await attach(db,vehicle,currentPool,request,driverId);
    await addPendingRiders(db,vehicle,currentPool,driverId);
    return currentPool.id;
  });
}

export async function fillPool(driverId, poolId) {
  return transaction(async (db) => {
    const vehicleResult = await db.query('SELECT * FROM vehicles WHERE driver_id=$1 FOR UPDATE',[driverId]);
    const vehicle = vehicleResult.rows[0];
    if (!vehicle) throw new AppError(404,'Vehicle not found');
    const result = await db.query('SELECT * FROM pools WHERE id=$1 AND vehicle_id=$2',[id(poolId),vehicle.id]);
    const currentPool = result.rows[0];
    if (!currentPool) throw new AppError(404,'Pool not found');
    if (currentPool.status !== 'MATCHED') throw new AppError(409,'Pool has already departed');
    return addPendingRiders(db,vehicle,currentPool,driverId);
  });
}

export async function cancelRequest(passengerId, requestId) {
  return transaction(async (db) => {
    const target = id(requestId);
    const ownership = await db.query('SELECT id FROM ride_requests WHERE id=$1 AND passenger_id=$2',[target,passengerId]);
    if (!ownership.rowCount) throw new AppError(404,'Ride not found');
    const preMembership = await db.query(
      `SELECT p.vehicle_id FROM pool_memberships m JOIN pools p ON p.id=m.pool_id
       WHERE m.request_id=$1 AND m.left_at IS NULL`,[target]
    );
    if (preMembership.rowCount) await db.query('SELECT id FROM vehicles WHERE id=$1 FOR UPDATE',[preMembership.rows[0].vehicle_id]);
    const current = await db.query('SELECT * FROM ride_requests WHERE id=$1 FOR UPDATE',[target]);
    const request = current.rows[0];
    if (!['REQUESTED','MATCHED','DRIVER_ARRIVED'].includes(request.status)) {
      throw new AppError(409,'This ride can no longer be cancelled');
    }
    const membership = await db.query(
      `SELECT pool_id,seats FROM pool_memberships WHERE request_id=$1 AND left_at IS NULL`,[target]
    );
    if (membership.rowCount) {
      const poolId = membership.rows[0].pool_id;
      await db.query("UPDATE pool_memberships SET left_at=now(),payment_status='VOID' WHERE request_id=$1",[target]);
      const remaining = await db.query(
        `UPDATE pools SET occupied_seats=occupied_seats-$2,updated_at=now()
         WHERE id=$1 RETURNING occupied_seats`,[poolId,membership.rows[0].seats]
      );
      if (remaining.rows[0].occupied_seats === 0) await db.query(
        `UPDATE pools SET status='CANCELLED',updated_at=now() WHERE id=$1`,[poolId]
      );
    }
    await db.query(`UPDATE ride_requests SET status='CANCELLED',updated_at=now() WHERE id=$1`,[target]);
    await event(db,{ requestId:target,poolId:membership.rows[0]?.pool_id,actorId:passengerId,
      type:'PASSENGER_CANCELLED',from:request.status,to:'CANCELLED' });
  });
}

export async function advancePool(driverId, poolId, to) {
  return transaction(async (db) => {
    const vehicleResult = await db.query('SELECT * FROM vehicles WHERE driver_id=$1 FOR UPDATE',[driverId]);
    const vehicle = vehicleResult.rows[0];
    if (!vehicle) throw new AppError(404,'Vehicle not found');
    const current = await db.query('SELECT * FROM pools WHERE id=$1 AND vehicle_id=$2 FOR UPDATE',[id(poolId),vehicle.id]);
    const currentPool = current.rows[0];
    if (!currentPool) throw new AppError(404,'Pool not found');
    if (nextPoolStatus[currentPool.status] !== to) throw new AppError(409,'Invalid ride state transition');
    const members = await db.query(
      `SELECT request_id FROM pool_memberships WHERE pool_id=$1 AND left_at IS NULL ORDER BY request_id`,[currentPool.id]
    );
    if (!members.rowCount) throw new AppError(409,'Cannot advance an empty pool');
    await db.query('UPDATE pools SET status=$1,updated_at=now() WHERE id=$2',[to,currentPool.id]);
    if (to === 'COMPLETED') await db.query(
      "UPDATE pool_memberships SET payment_status='COLLECTED' WHERE pool_id=$1 AND left_at IS NULL",[currentPool.id]
    );
    await db.query(
      `UPDATE ride_requests SET status=$1,updated_at=now()
       WHERE id = ANY($2::bigint[])`,[to,members.rows.map(x => x.request_id)]
    );
    for (const member of members.rows) await event(db,{ requestId:member.request_id,poolId:currentPool.id,
      actorId:driverId,type:'DRIVER_ADVANCED',from:currentPool.status,to });
    return to;
  });
}

export async function setOnline(driverId, online) {
  return transaction(async (db) => {
    const result = await db.query('SELECT * FROM vehicles WHERE driver_id=$1 FOR UPDATE',[driverId]);
    if (!result.rowCount) throw new AppError(404,'Vehicle not found');
    if (!online) {
      const active = await db.query(
        `SELECT 1 FROM pools WHERE vehicle_id=$1 AND status IN ('MATCHED','DRIVER_ARRIVED','STARTED')`,[result.rows[0].id]
      );
      if (active.rowCount) throw new AppError(409,'Finish your active pool before going offline');
    }
    await db.query('UPDATE vehicles SET online=$1 WHERE id=$2',[online,result.rows[0].id]);
  });
}
