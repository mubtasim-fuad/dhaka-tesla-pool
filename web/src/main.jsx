import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './api';
import { Auth } from './Auth';
import { PassengerDashboard } from './PassengerDashboard';
import { DriverDashboard } from './DriverDashboard';
import './style.css';

function App() {
  const [session,setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tesla-session')); } catch { return null; }
  });
  function signedIn(value) { localStorage.setItem('tesla-session',JSON.stringify(value)); setSession(value); }
  function signOut() { localStorage.removeItem('tesla-session'); setSession(null); }
  return <>
    <header className="topbar"><div className="top-inner">
      <a className="brand" href="/" aria-label="Dhaka Tesla Pool home"><span className="brand-mark">↗</span><span>Dhaka Tesla <strong>Pool</strong></span></a>
      {session && <div className="header-user"><span>{session.user.name} <em>· {session.user.role.toLowerCase()}</em></span><button className="text-button" onClick={signOut}>Sign out</button></div>}
    </div></header>
    {!session ? <Auth onSignedIn={signedIn} /> : session.user.role === 'DRIVER'
      ? <DriverDashboard session={session} onSessionExpired={signOut} />
      : <PassengerDashboard session={session} onSessionExpired={signOut} />}
    <footer>Dhaka Tesla Pool · A local demo with cash fares and fictional accounts</footer>
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
