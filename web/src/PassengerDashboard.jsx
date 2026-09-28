import React, { useEffect, useState } from 'react';
import { api, money, time } from './api';

const zones = ['Banani','Gulshan 1','Mohakhali','Dhanmondi','Mirpur','Uttara','Farmgate','Bashundhara'];
function Badge({status}) { return <span className={`badge ${status?.toLowerCase()}`}>{status?.replaceAll('_',' ')}</span>; }

export function PassengerDashboard({ session, onSessionExpired }) {
  const token = session.token;
  const [form,setForm] = useState({pickupZone:'Banani',destinationZone:'Mohakhali',seats:1});
  const [rides,setRides] = useState([]), [quote,setQuote] = useState(null), [events,setEvents] = useState({});
  const [busy,setBusy] = useState(false), [loading,setLoading] = useState(true), [error,setError] = useState(''), [message,setMessage] = useState('');
  async function load() {
    try { const result = await api('/api/requests',{token}); setRides(result.requests); }
    catch(e) { if (e.message === 'Invalid session' || e.message === 'Sign in required') onSessionExpired(); else setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); const interval=setInterval(load,6000); return ()=>clearInterval(interval); },[token]);
  useEffect(() => {
    if (form.pickupZone === form.destinationZone) { setQuote(null); return; }
    let live = true;
    const query = new URLSearchParams(form);
    api(`/api/requests/quote?${query}`,{token}).then(data=>{if(live)setQuote(data)}).catch(()=>{if(live)setQuote(null)});
    return ()=>{live=false};
  },[form,token]);
  async function action(work) {
    setBusy(true);setError('');setMessage('');
    try { await work(); await load(); }
    catch(e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function book(e) {
    e.preventDefault(); await action(async()=>{
      if(form.pickupZone===form.destinationZone) throw new Error('Choose a different destination');
      await api('/api/requests',{token,method:'POST',body:form});setMessage('Request placed. We will match an available seat when possible.');
    });
  }
  async function viewEvents(id) {
    if(events[id]) { setEvents({...events,[id]:null});return; }
    try { const result=await api(`/api/requests/${id}/events`,{token});setEvents({...events,[id]:result.events}); }
    catch(e) { setError(e.message); }
  }
  const active = rides.find(r=>['REQUESTED','MATCHED','DRIVER_ARRIVED','STARTED'].includes(r.status));
  return <main className="page"><div className="page-heading"><div><div className="eyebrow">PASSENGER DESK</div><h1>Ride with clarity, {session.user.name}.</h1><p className="muted">Your booking, status, and fare stay in one place.</p></div><div className="tiny-stat"><span>YOUR ACTIVE RIDE</span><strong>{active ? active.status.replaceAll('_',' ') : 'None'}</strong></div></div>
    {error && <p role="alert" className="notice error">{error}</p>}{message && <p role="status" className="notice success">{message}</p>}
    <div className="dashboard-grid"><section className="panel booking"><div className="section-head"><div><div className="eyebrow">01 / PLAN A TRIP</div><h2>Book your seat</h2></div><span className="circle-icon">↗</span></div>
      <form onSubmit={book}>
        <div className="form-row"><label>Pickup<select value={form.pickupZone} onChange={e=>setForm({...form,pickupZone:e.target.value})}>{zones.map(z=><option key={z}>{z}</option>)}</select></label>
          <label>Destination<select value={form.destinationZone} onChange={e=>setForm({...form,destinationZone:e.target.value})}>{zones.map(z=><option key={z}>{z}</option>)}</select></label></div>
        <label>Seats<select value={form.seats} onChange={e=>setForm({...form,seats:Number(e.target.value)})}><option value="1">1 seat</option><option value="2">2 seats</option><option value="3">3 seats</option></select></label>
        <div className="fare-box"><div><span>Estimated shared fare</span><small>Base + zone distance − 20% distance discount</small></div><strong>{quote ? money(quote.farePaisa) : '—'}</strong></div>
        <button className="button primary wide" disabled={busy || !!active || !quote}>{busy ? 'Working…' : active ? 'Finish or cancel your current ride' : 'Request a ride'}</button>
        <p className="helper">Cash on arrival. A fare is fixed when a seat is assigned.</p>
      </form></section>
      <section className="panel"><div className="section-head"><div><div className="eyebrow">02 / TRACK</div><h2>Your rides</h2></div><span className="count">{rides.length}</span></div>
        {loading ? <p className="muted">Loading rides…</p> : rides.length===0 ? <div className="empty"><strong>No rides yet</strong><p>Choose a route to request your first seat.</p></div> : <div className="ride-list">{rides.map(ride=><article className="ride" key={ride.id}>
          <div className="ride-top"><strong>{ride.pickup_zone} <span className="arrow">→</span> {ride.destination_zone}</strong><Badge status={ride.status}/></div>
          <div className="ride-meta"><span>#{ride.id} · {time(ride.created_at)}</span><span>{ride.seats} {ride.seats===1?'seat':'seats'}</span></div>
          <div className="ride-detail"><span>{ride.vehicle_name ? `${ride.vehicle_name} · ${ride.driver_name}` : 'Waiting for a driver'}</span><strong>{ride.fare_paisa == null ? 'Fare pending' : money(ride.fare_paisa)}</strong></div>
          <div className="ride-actions"><button className="text-button" onClick={()=>viewEvents(ride.id)}>{events[ride.id] ? 'Hide timeline' : 'View timeline'}</button>
            {['REQUESTED','MATCHED','DRIVER_ARRIVED'].includes(ride.status) && <button disabled={busy} className="text-button danger" onClick={()=>action(async()=>{await api(`/api/requests/${ride.id}/cancel`,{token,method:'POST'});setMessage('Ride cancelled.');})}>Cancel ride</button>}
          </div>
          {events[ride.id] && <ol className="timeline">{events[ride.id].map((event,i)=><li key={i}><strong>{event.to_status?.replaceAll('_',' ') || event.event_type}</strong><span>{time(event.created_at)}</span></li>)}</ol>}
        </article>)}</div>}
      </section></div>
  </main>;
}
