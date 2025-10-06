import React from 'react';
import { useEffect, useState } from 'react';

interface Stats {
  assets: number;
  intel_events: number;
  risk_items: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Force a change to break cache
    console.log('Dashboard component mounted. Fetching stats...');
    const apiBase = (import.meta as any).env?.VITE_API_BASE || '';
    const statsUrl = `${apiBase}/api/stats`;

    console.log('Fetching from URL:', statsUrl);

    fetch(statsUrl)
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP error! status: ${r.status}`);
        }
        return r.json();
      })
      .then(setStats)
      .catch((e) => {
        console.error('Failed to fetch stats:', e);
        setError(e.message);
      });
  }, []);

  if (error) {
    return <div className="error">Failed to load dashboard stats: {error}</div>;
  }

  return (
    <div>
      <h1>Security Dashboard (V2)</h1>
      <div className="cards">
        <div className="card">
          <h2>Assets</h2>
          <p>{stats?.assets ?? 'Loading...'}</p>
        </div>
        <div className="card">
          <h2>Latest Intel Events</h2>
          <p>{stats?.intel_events ?? 'Loading...'}</p>
        </div>
        <div className="card">
          <h2>Risk Items</h2>
          <p>{stats?.risk_items ?? 'Loading...'}</p>
        </div>
      </div>
    </div>
  );
}
