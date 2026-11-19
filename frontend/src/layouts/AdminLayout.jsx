import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import TopHeader from '../components/common/TopHeader';

const AdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="d-flex min-vh-100" style={{ backgroundColor: 'var(--smp-bg-primary)' }}>
      <Sidebar module="admin" mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="d-flex flex-column flex-grow-1 overflow-hidden" style={{ minWidth: 0, backgroundColor: 'var(--smp-bg-primary)' }}>
        <TopHeader
          title="SMP Admin Console"
          subtitle="Inventory, Staff, Products, Customers & Financial Reports"
          module="admin"
          onToggleSidebar={() => setMobileOpen(!mobileOpen)}
        />
        <main className="p-3 p-md-4 flex-grow-1 overflow-auto" style={{ backgroundColor: 'var(--smp-bg-primary)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;