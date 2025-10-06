import React from 'react';
import { useEffect, useState } from 'react';
import { getHealth, HealthData } from '../services/api';

export default function Health() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Health check is at the root, not under /api
    fetch('/health')
      .then((r) => r.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch health data.');
        setLoading(false);
      });
  }, []);

  return (
    <div className="health-container">
      <h1>Platform Health</h1>

      {loading && <p>Loading health data...</p>}

      {error && (
        <div className="error-message">
          <h3>Error:</h3>
          <p>{error}</p>
        </div>
      )}

      {data && (
        <div className="health-status">
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
