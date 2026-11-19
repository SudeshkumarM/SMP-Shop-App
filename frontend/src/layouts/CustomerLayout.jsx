import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import Sidebar from '../components/common/Sidebar';

const CustomerLayout = () => {
  return (
    <div className="d-flex flex-column min-vh-100" style={{ backgroundColor: 'var(--smp-bg-primary)' }}>
      <Navbar />
      <div className="container py-4 flex-grow-1">
        <div className="row g-4">
          <div className="col-lg-3 d-none d-lg-block">
            <div className="sticky-top" style={{ top: '80px', zIndex: 10 }}>
              <Sidebar module="customer" />
            </div>
          </div>
          <div className="col-lg-9 col-12">
            <Outlet />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CustomerLayout;
