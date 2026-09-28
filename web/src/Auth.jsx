import React, { useState } from 'react';
import { api } from './api';

const demos = [
  ['Nusrat','nusrat@example.test'],['Rafiq','rafiq@example.test'],
  ['Shirin','shirin@example.test'],['Jashim · Driver','jashim@example.test']
];
export function Auth({ onSignedIn }) {
  const [mode,setMode] = useState('login');
  const [form,setForm] = useState({name:'',email:'',password:''});
  const [busy,setBusy] = useState(false), [error,setError] = useState('');
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      onSignedIn(await api(`/api/auth/${mode === 'login' ? 'login':'register'}`,{method:'POST',body:formForApi()}));
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  function formForApi() { return mode === 'login' ? {email:form.email,password:form.password} : form; }
  return <main className="auth-layout">
    <section className="auth-story"><div className="eyebrow">THE BANANI RUSH HOUR</div>
      <h1>Same direction.<br/><span>Better ride.</span></h1>
      <p>Book a seat, share Bullet with a compatible neighbour, and see exactly what your trip costs.</p>
      <div className="story-route"><span>Banani</span><div className="route-line"/><span>Mohakhali<br/><small>or Gulshan 1</small></span></div>
      <div className="story-foot">3 seats in Bullet. One clear fare for each rider.</div>
    </section>
    <section className="auth-card"><div className="eyebrow">WELCOME ABOARD</div><h2>{mode === 'login' ? 'Sign in to ride' : 'Create passenger account'}</h2>
      <p className="muted">{mode === 'login' ? 'Use a demo account or your own passenger login.' : 'A new account can book and track rides.'}</p>
      <form onSubmit={submit}>
        {mode === 'register' && <label>Full name<input required minLength="2" maxLength="80" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} autoComplete="name"/></label>}
        <label>Email<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} autoComplete="email"/></label>
        <label>Password<input required type="password" minLength="8" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/></label>
        {error && <p className="notice error" role="alert">{error}</p>}
        <button className="button primary wide" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
      <button className="text-button switch" onClick={()=>{setMode(mode === 'login' ? 'register' : 'login');setError('')}}>{mode === 'login' ? 'New rider? Create account' : 'Have an account? Sign in'}</button>
      {mode === 'login' && <div className="demo-accounts"><strong>Try a demo account</strong><p className="muted">Select an account, then enter the private demo password set during setup.</p><div className="demo-grid">
        {demos.map(([name,email])=><button key={email} className="demo-button" onClick={()=>{setForm({name:'',email,password:''});setError('')}}>{name}</button>)}
      </div></div>}
    </section>
  </main>;
}
