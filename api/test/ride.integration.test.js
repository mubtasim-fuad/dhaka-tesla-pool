import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { app } from '../src/app.js';
import { pool } from '../src/db.js';

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) throw new Error('Set DATABASE_URL and JWT_SECRET for integration tests');

async function request(base,path,{token,method='GET',body}={}) {
  const res=await fetch(`${base}${path}`,{method,
    headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{})});
  const value=await res.json();
  return { httpStatus:res.status, ...value };
}

test('end-to-end ride, role, cancellation and last-seat race', async () => {
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try {
    const database = await pool.query('SELECT current_database() AS name');
    if (!database.rows[0].name.endsWith('_test') && process.env.ALLOW_TEST_DB_RESET !== 'yes') {
      throw new Error('Integration tests reset data. Use a database ending in _test.');
    }
    await pool.query('TRUNCATE ride_events,pool_memberships,pools,ride_requests,vehicles,users RESTART IDENTITY CASCADE');
    const fixturePassword=randomBytes(24).toString('base64url');
    const hash=await bcrypt.hash(fixturePassword,4);
    for(const [name,role] of [['Jashim','DRIVER'],['Nusrat','PASSENGER'],['Rafiq','PASSENGER'],['Shirin','PASSENGER'],['Farhan','PASSENGER']]) {
      await pool.query('INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4)',[name,`${name.toLowerCase()}@example.test`,hash,role]);
    }
    await pool.query("INSERT INTO vehicles(driver_id,name,capacity,online) VALUES(1,'Bullet',3,true)");
    for(const [passenger,destination] of [[2,'Mohakhali'],[3,'Gulshan 1']]) {
      await pool.query("INSERT INTO ride_requests(passenger_id,pickup_zone,destination_zone,seats) VALUES($1,'Banani',$2,1)",[passenger,destination]);
    }
    const tokens={};
    for(const name of ['Jashim','Nusrat','Rafiq','Shirin','Farhan']) {
      const login=await request(base,'/api/auth/login',{method:'POST',body:{email:`${name.toLowerCase()}@example.test`,password:fixturePassword}});
      assert.equal(login.httpStatus,200);tokens[name]=login.token;
    }
    const quote=await request(base,'/api/requests/quote?pickupZone=Banani&destinationZone=Mohakhali&seats=1',{token:tokens.Nusrat});
    assert.equal(quote.farePaisa,9800);
    assert.equal((await request(base,'/api/driver/dashboard',{token:tokens.Nusrat})).httpStatus,403);
    const accepted=await request(base,'/api/driver/requests/1/accept',{token:tokens.Jashim,method:'POST'});
    assert.equal(accepted.httpStatus,201);
    const poolId=accepted.poolId;
    const nusrat=(await request(base,'/api/requests',{token:tokens.Nusrat})).requests[0];
    const rafiq=(await request(base,'/api/requests',{token:tokens.Rafiq})).requests[0];
    assert.equal(nusrat.status,'MATCHED');assert.equal(nusrat.fare_paisa,9800);
    assert.equal(rafiq.status,'MATCHED');assert.equal(rafiq.fare_paisa,8600);
    assert.equal((await request(base,'/api/requests/1/events',{token:tokens.Rafiq})).httpStatus,404);
    assert.equal((await request(base,'/api/requests/1/cancel',{token:tokens.Rafiq,method:'POST'})).httpStatus,404);
    assert.equal((await request(base,`/api/driver/pools/${poolId}/advance`,{token:tokens.Jashim,method:'POST',body:{to:'STARTED'}})).httpStatus,409);

    const [shirin,farhan]=await Promise.all(['Shirin','Farhan'].map(name=>request(base,'/api/requests',{token:tokens[name],method:'POST',body:{pickupZone:'Banani',destinationZone:'Gulshan 1',seats:1}})));
    assert.equal(shirin.httpStatus,201);assert.equal(farhan.httpStatus,201);
    const shirinRide=(await request(base,'/api/requests',{token:tokens.Shirin})).requests[0];
    const farhanRide=(await request(base,'/api/requests',{token:tokens.Farhan})).requests[0];
    assert.deepEqual([shirinRide.status,farhanRide.status].sort(),['MATCHED','REQUESTED']);
    const occupied=await pool.query('SELECT COALESCE(SUM(seats),0)::integer AS seats FROM pool_memberships WHERE pool_id=$1 AND left_at IS NULL',[poolId]);
    assert.equal(occupied.rows[0].seats,3);
    const loser=shirinRide.status==='REQUESTED' ? ['Shirin',shirinRide] : ['Farhan',farhanRide];
    assert.equal((await request(base,`/api/requests/${loser[1].id}/cancel`,{token:tokens[loser[0]],method:'POST'})).httpStatus,200);
    for(const status of ['DRIVER_ARRIVED','STARTED','COMPLETED']) {
      const response=await request(base,`/api/driver/pools/${poolId}/advance`,{token:tokens.Jashim,method:'POST',body:{to:status}});
      assert.equal(response.httpStatus,200);
    }
    assert.equal((await request(base,'/api/requests/1/cancel',{token:tokens.Nusrat,method:'POST'})).httpStatus,409);
    const history=await request(base,'/api/requests/1/events',{token:tokens.Nusrat});
    assert.deepEqual(history.events.map(x=>x.to_status),['MATCHED','DRIVER_ARRIVED','STARTED','COMPLETED']);
    const completed=(await request(base,'/api/requests',{token:tokens.Nusrat})).requests[0];
    assert.equal(completed.payment_method,'CASH');
    assert.equal(completed.payment_status,'COLLECTED');
  } finally {
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
    await pool.end();
  }
});
