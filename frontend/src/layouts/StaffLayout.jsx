import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import TopHeader from '../components/common/TopHeader';

const StaffLayout = () => {
  return (
    <div className="d-flex min-vh-100" style={{ backgroundColor: 'var(--smp-bg-primary)', color: 'var(--smp-text-primary)' }}>
      <div className="d-none d-md-block">
        <Sidebar module="staff" />
      </div>
      <div className="d-flex flex-column flex-grow-1 overflow-hidden" style={{ backgroundColor: 'var(--smp-bg-primary)' }}>
        <TopHeader
          title="Point of Sale & Staff Billing Counter"
          subtitle="SMP Retail POS System | Multi-Shop Counter Terminal"
          module="staff"
        />
        <main className="p-3 p-md-4 flex-grow-1 overflow-auto" style={{ backgroundColor: 'var(--smp-bg-primary)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StaffLayout;
