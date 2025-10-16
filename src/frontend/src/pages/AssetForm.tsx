import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const AssetForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState({
    name: '',
    type: 'Service',
    ip: '',
    hostname: '',
    owner: '',
    business_unit: '',
    criticality: 3,
    data_sensitivity: 'Low',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = Boolean(id);

  useEffect(() => {
    if (isEditing) {
      setLoading(true);
      fetch(`/api/assets/${id}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error('Failed to fetch asset details');
          }
          return res.json();
        })
        .then((data) => {
          setAsset(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [id, isEditing]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setAsset((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const url = isEditing ? `/api/assets/${id}` : '/api/assets';
    const method = isEditing ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        ...asset,
        criticality: Number(asset.criticality),
      }),
    })
      .then((res) => {
        if (res.status === 204) {
          return;
        }
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.detail || 'An error occurred');
          });
        }
        return res.json();
      })
      .then(() => {
        navigate('/assets');
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  if (loading && isEditing) {
    return <div>Loading asset...</div>;
  }

  return (
    <div className="asset-form-container">
      <h2>{isEditing ? 'Edit Asset' : 'Create New Asset'}</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Asset Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={asset.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="type">Asset Type</label>
          <select
            id="type"
            name="type"
            value={asset.type}
            onChange={handleChange}
          >
            <option value="HW">Hardware</option>
            <option value="SW">Software</option>
            <option value="Data">Data</option>
            <option value="User">User</option>
            <option value="Service">Service</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="ip">IP Address</label>
          <input
            type="text"
            id="ip"
            name="ip"
            value={asset.ip || ''}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="hostname">Hostname</label>
          <input
            type="text"
            id="hostname"
            name="hostname"
            value={asset.hostname || ''}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="owner">Owner</label>
          <input
            type="text"
            id="owner"
            name="owner"
            value={asset.owner || ''}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="business_unit">Business Unit</label>
          <input
            type="text"
            id="business_unit"
            name="business_unit"
            value={asset.business_unit || ''}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="criticality">Criticality (1-5)</label>
          <input
            type="number"
            id="criticality"
            name="criticality"
            value={asset.criticality}
            onChange={handleChange}
            min="1"
            max="5"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="data_sensitivity">Data Sensitivity</label>
          <select
            id="data_sensitivity"
            name="data_sensitivity"
            value={asset.data_sensitivity}
            onChange={handleChange}
          >
            <option value="Low">Low</option>
            <option value="Moderate">Moderate</option>
            <option value="High">High</option>
          </select>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Asset'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/assets')}
            className="cancel-btn"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssetForm;
