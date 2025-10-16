import { useEffect, useState } from 'react';

// A simple reusable card component
const StatCard = ({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) => (
  <div className="card">
    <h2>{title}</h2>
    <p>{value}</p>
  </div>
);

// Version information component
const VersionInfo = ({ version }: { version: any }) => (
  <div className="version-info">
    <p>
      Commit: <span>{version?.commit || 'N/A'}</span>
    </p>
    <p>
      Built At:{' '}
      <span>
        {version?.built_at
          ? new Date(parseInt(version.built_at) * 1000).toLocaleString()
          : 'N/A'}
      </span>
    </p>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [version, setVersion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, versionRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/version'),
        ]);

        if (!statsRes.ok || !versionRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const statsData = await statsRes.json();
        const versionData = await versionRes.json();

        setStats(statsData);
        setVersion(versionData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="dashboard">
      <header>
        <h1>Security Dashboard</h1>
        <VersionInfo version={version} />
      </header>
      <div className="cards">
        <StatCard title="Assets" value={stats?.assets ?? 0} />
        <StatCard title="Intel Events" value={stats?.intel_events ?? 0} />
        <StatCard title="Risk Items" value={stats?.risk_items ?? 0} />
      </div>
      <div className="dashboard-section">
        <h2>Top 5 Risky Assets</h2>
        <TopRiskyAssets />
      </div>
      {/* Health check can be moved to a footer or a separate status page */}
    </div>
  );
}

function TopRiskyAssets() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/assets/top?limit=5')
      .then((r) => r.json())
      .then(setAssets)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading risky assets...</div>;

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Risk Score</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => (
          <tr key={asset.id}>
            <td>{asset.name}</td>
            <td>{asset.risk.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
