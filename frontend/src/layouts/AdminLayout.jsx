import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import TopHeader from '../components/common/TopHeader';

const AdminLayout = () => {
  return (
    <div className="d-flex min-vh-100 bg-light">
      <div className="d-none d-md-block">
        <Sidebar module="admin" />
      </div>
      <div className="d-flex flex-column flex-grow-1 overflow-hidden">
        <TopHeader
          title="Admin Shop Management Console"
          subtitle="Inventory, Staff, Products, Customers & Financial Reports"
          module="admin"
        />
        <main className="p-3 p-md-4 flex-grow-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
