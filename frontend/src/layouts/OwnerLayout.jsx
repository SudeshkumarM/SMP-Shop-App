import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import TopHeader from '../components/common/TopHeader';

const OwnerLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="d-flex min-vh-100" style={{ backgroundColor: 'var(--smp-bg-primary)' }}>
      {mobileOpen && (
        <button
          type="button"
          className="portal-sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <Sidebar module="owner" mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="d-flex flex-column flex-grow-1 overflow-hidden" style={{ minWidth: 0, backgroundColor: 'var(--smp-bg-primary)' }}>
        <TopHeader
          title="Master Corporate Executive Governance"
          subtitle="Multi-Shop, Multi-Branch, Investments, Profit & Loss Oversight"
          module="owner"
          sidebarOpen={mobileOpen}
          onToggleSidebar={() => setMobileOpen(!mobileOpen)}
        />
        <main className="p-3 p-md-4 flex-grow-1 overflow-auto" style={{ backgroundColor: 'var(--smp-bg-primary)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default OwnerLayout;