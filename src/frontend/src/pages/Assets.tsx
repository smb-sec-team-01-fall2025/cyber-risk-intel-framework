import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface Asset {
  id: number;
  name: string;
  type: string;
  ip: string;
  hostname: string;
  owner: string;
  criticality: string;
  data_sensitivity: string;
  risk: {
    score: number;
  };
}

const AssetsPage = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssets = () => {
    setLoading(true);
    fetch('/api/assets')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Network response was not ok');
        }
        return res.json();
      })
      .then((data) => {
        setAssets(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleDelete = (assetId: number) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      fetch(`/api/assets/${assetId}`, { method: 'DELETE' })
        .then((res) => {
          if (res.status === 204) {
            return;
          }
          if (!res.ok) {
            throw new Error('Failed to delete asset');
          }
          return res.json();
        })
        .then(() => {
          fetchAssets(); // Refresh list after delete
        })
        .catch((err) => setError(err.message));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImportFile(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (!importFile) {
      setImportMessage('Please select a file to import.');
      return;
    }

    setImporting(true);
    setImportMessage('');
    const formData = new FormData();
    formData.append('file', importFile);

    fetch('/api/assets/import', {
      method: 'POST',
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        setImportMessage(data.message || 'Import completed.');
        fetchAssets(); // Refresh asset list
      })
      .catch((err) => {
        setImportMessage(`Import failed: ${err.message}`);
      })
      .finally(() => {
        setImporting(false);
        setImportFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      });
  };

  if (loading) return <div>Loading assets...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="assets-container">
      <div className="page-header">
        <h1>Asset Inventory</h1>
        <button onClick={() => navigate('/assets/new')} className="btn-create">
          Create New Asset
        </button>
      </div>

      <div className="import-section">
        <h3>Bulk Import Assets</h3>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          ref={fileInputRef}
        />
        <button
          onClick={handleImport}
          disabled={importing}
          className="btn-import"
        >
          {importing ? 'Importing...' : 'Import'}
        </button>
        <a
          href="/data/samples/sample_assets.csv"
          download
          className="template-link"
        >
          Download Template
        </a>
        {importMessage && <div className="import-message">{importMessage}</div>}
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>IP / Hostname</th>
            <th>Owner</th>
            <th>Criticality</th>
            <th>Data Sensitivity</th>
            <th>Risk Score</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset: Asset) => (
            <tr key={asset.id}>
              <td>{asset.name}</td>
              <td>{asset.type}</td>
              <td>{asset.ip || asset.hostname}</td>
              <td>{asset.owner}</td>
              <td>{asset.criticality}</td>
              <td>{asset.data_sensitivity}</td>
              <td>{asset.risk?.score?.toFixed(2) || 'N/A'}</td>
              <td className="actions-cell">
                <div className="actions-cell-content">
                  <Link to={`/assets/${asset.id}`} className="action-link">
                    View
                  </Link>
                  <Link
                    to={`/assets/${asset.id}/edit`}
                    className="action-link edit"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(asset.id)}
                    className="action-link delete"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AssetsPage;
