import React, { useEffect, useState } from 'react';
import { api, money, time } from './api';
const next = {MATCHED:['DRIVER_ARRIVED','Mark arrived'],DRIVER_ARRIVED:['STARTED','Start ride'],STARTED:['COMPLETED','Complete ride']};
function grouped(rows) {
  const pools = new Map();
  for(const row of rows) {
    if(!pools.has(row.pool_id)) pools.set(row.pool_id,{ id:row.pool_id,status:row.pool_status,pickup:row.pickup_zone,created:row.created_at,members:[] });
    pools.get(row.pool_id).members.push(row);
  }
  return [...pools.values()];
}
export function DriverDashboard({ session,onSessionExpired }) {
  const token=session.token;
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  async function load() {
    try { setData(await api('/api/driver/dashboard',{token})); }
    catch(e) { if (e.message==='Invalid session'||e.message==='Sign in required') onSessionExpired();else setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(()=>{load();const interval=setInterval(load,6000);return()=>clearInterval(interval)},[token]);
  async function action(path,body) {
    setBusy(true);setError('');setMessage('');
    try { await api(path,{token,method:'POST',body});await load();setMessage('Updated successfully.'); }
    catch(e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const pools=grouped(data?.rides || []), active=pools.find(p=>next[p.status]);
  const occupied=active?.members.filter(m=>!m.left_at).reduce((total,m)=>total+m.seats,0) || 0;
  return <main className="page"><div className="page-heading"><div><div className="eyebrow">DRIVER DESK</div><h1>Hello, {session.user.name}.</h1><p className="muted">Know who is aboard before Bullet moves.</p></div>
    {data && <button className={`online-toggle ${data.vehicle.online?'on':'off'}`} disabled={busy} onClick={()=>action('/api/driver/online',{online:!data.vehicle.online})}><span className="online-dot"/>{data.vehicle.online?'Online · accepting rides':'Offline · go online'}</button>}</div>
    {error && <p role="alert" className="notice error">{error}</p>}{message && <p role="status" className="notice success">{message}</p>}
    {loading ? <div className="panel"><p className="muted">Loading driver desk…</p></div> : !data ? <div className="panel">Driver desk unavailable.</div> : <div className="dashboard-grid driver-grid">
      <section className="panel active-pool"><div className="section-head"><div><div className="eyebrow">01 / LIVE POOL</div><h2>{active ? `Pool #${active.id}` : 'No active pool'}</h2></div><span className="count">{active ? `${occupied}/${data.vehicle.capacity}` : `0/${data.vehicle.capacity}`}</span></div>
        {active ? <><div className="pool-banner"><div><small>BULLET · {active.pickup.toUpperCase()} PICKUP</small><strong>{active.status.replaceAll('_',' ')}</strong></div><span>Seats occupied<br/><b>{occupied} of {data.vehicle.capacity}</b></span></div>
          <h3>Passenger manifest</h3><div className="manifest">{active.members.filter(m=>!m.left_at).map(m=><div className="manifest-row" key={m.request_id}><div><strong>{m.passenger_name}</strong><span>{m.destination_zone} · {m.seats} {m.seats===1?'seat':'seats'}</span></div><b>{money(m.fare_paisa)}</b></div>)}</div>
          <div className="button-row">{active.status==='MATCHED' && <button className="button secondary" disabled={busy} onClick={()=>action(`/api/driver/pools/${active.id}/fill`)}>Find more riders</button>}
            <button className="button primary" disabled={busy} onClick={()=>action(`/api/driver/pools/${active.id}/advance`,{to:next[active.status][0]})}>{next[active.status][1]}</button></div></>
          : <div className="empty"><strong>Bullet is ready</strong><p>Accept a request to create a pool. Compatible waiting riders will be assigned automatically.</p></div>}
      </section>
      <section className="panel"><div className="section-head"><div><div className="eyebrow">02 / INCOMING</div><h2>Waiting requests</h2></div><span className="count">{data.pending.length}</span></div>
        {data.pending.length===0 ? <div className="empty"><strong>All clear</strong><p>New requests appear here as riders book seats.</p></div> : <div className="request-list">{data.pending.map(request=><article className="pending" key={request.id}><div><strong>{request.passenger_name}</strong><span>{request.pickup_zone} → {request.destination_zone}</span><small>{request.seats} seat{request.seats>1?'s':''} · {time(request.created_at)}</small></div>
          {!active && data.vehicle.online && <button className="button secondary" disabled={busy} onClick={()=>action(`/api/driver/requests/${request.id}/accept`)}>Accept</button>}
        </article>)}</div>}
        {active && <p className="helper">Finish this pool before accepting another. Use “Find more riders” to fill compatible seats.</p>}
      </section>
      <section className="panel history"><div className="section-head"><div><div className="eyebrow">03 / HISTORY</div><h2>Previous pools</h2></div></div>
        {pools.filter(p=>!next[p.status]).length===0 ? <p className="muted">Completed and cancelled pools will appear here.</p> : pools.filter(p=>!next[p.status]).map(p=><div className="history-row" key={p.id}><div><strong>Pool #{p.id} · {p.status}</strong><span>{p.members.map(m=>m.passenger_name).join(', ')}</span></div><small>{time(p.created)}</small></div>)}
      </section>
    </div>}
  </main>;
}
