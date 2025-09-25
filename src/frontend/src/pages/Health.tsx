import React from 'react';
import { useEffect, useState } from 'react';
import { getHealth, HealthData } from '../services/api';

export default function Health() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      const response = await getHealth();

      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setData(response.data);
      }

      setLoading(false);
    };

    fetchHealth();
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
