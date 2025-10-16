import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function AssetDetailPage() {
  const { id } = useParams();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/assets/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch asset details');
        return res.json();
      })
      .then((data) => {
        setAsset(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div>Loading asset details...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!asset) return <div>Asset not found.</div>;

  return (
    <div className="page">
      <h1>{asset.name}</h1>
      <div className="asset-details-grid">
        <div className="detail-item">
          <strong>Type:</strong> {asset.type}
        </div>
        <div className="detail-item">
          <strong>Owner:</strong> {asset.owner}
        </div>
        <div className="detail-item">
          <strong>IP Address:</strong> {asset.ip}
        </div>
        <div className="detail-item">
          <strong>Hostname:</strong> {asset.hostname}
        </div>
        <div className="detail-item">
          <strong>Criticality:</strong> {asset.criticality}
        </div>
        <div className="detail-item">
          <strong>Data Sensitivity:</strong> {asset.data_sensitivity}
        </div>
        <div className="detail-item">
          <strong>Risk Score:</strong> {asset.risk.score}
        </div>
        <div className="detail-item">
          <strong>Risk Explanation:</strong> {asset.risk.explanation}
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Recent Intel Events</h2>
        {asset.recent_intel && asset.recent_intel.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Indicator</th>
                <th>Severity</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {asset.recent_intel.map((intel: any) => (
                <tr key={intel.id}>
                  <td>{intel.source}</td>
                  <td>{intel.indicator}</td>
                  <td>{intel.severity}</td>
                  <td>{new Date(intel.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No recent intelligence events found for this asset.</p>
        )}
      </div>
    </div>
  );
}
