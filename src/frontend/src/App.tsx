import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export default function App() {
  return (
    <div>
      <nav>
        <Link to="/dashboard">Dashboard</Link> |{' '}
        <Link to="/health">Health</Link>
      </nav>
      <hr />
      <Outlet />
    </div>
  );
}
