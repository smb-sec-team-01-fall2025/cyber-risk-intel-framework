import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
} from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import AssetsPage from './pages/Assets';
import AssetDetailPage from './pages/AssetDetail';
import AssetForm from './pages/AssetForm';
import './index.css';

export default function App() {
  return (
    <Router>
      <div className="app-container">
        <nav className="sidebar">
          <h2>CRIF</h2>
          <ul>
            <li>
              <NavLink
                to="/"
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/assets"
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                Assets
              </NavLink>
            </li>
            {/* Add other links as pages are created */}
          </ul>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/assets/:id" element={<AssetDetailPage />} />
            <Route path="/assets/new" element={<AssetForm />} />
            <Route path="/assets/:id/edit" element={<AssetForm />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
