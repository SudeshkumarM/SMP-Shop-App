import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const OwnerHelp = () => {
  const [activeTopic, setActiveTopic] = useState('governance');

  const topics = [
    { id: 'governance', title: 'Corporate Multi-Store Governance', icon: 'bi-briefcase-fill' },
    { id: 'pnl', title: 'Mathematical Profit & Loss Engine', icon: 'bi-calculator-fill' },
    { id: 'investments', title: 'Capital Investment Tracking', icon: 'bi-cash-coin' },
    { id: 'gst', title: 'GST Audits & Tax Remittance', icon: 'bi-receipt' },
    { id: 'scalability', title: 'Shopping Mall Expansion Roadmap', icon: 'bi-buildings' },
    { id: 'security', title: 'Data Isolation & Role Guards', icon: 'bi-shield-check' }
  ];

  return (
    <div className="fade-in">
      <div className="smp-card p-4 p-md-5 mb-4 shadow-sm">
        <div className="d-flex align-items-center gap-3 mb-4">
          <div className="p-3 rounded-4 shadow-sm" style={{ backgroundColor: 'var(--smp-royal-blue)', color: '#fff' }}>
            <i className="bi bi-crown fs-3"></i>
          </div>
          <div>
            <h2 className="fw-bold brand-font mb-1 text-white">Master Owner Governance Manual & Help</h2>
            <p className="text-muted mb-0">Executive directives, mathematical P&L models, investment accounting & enterprise scalability</p>
          </div>
        </div>

        <div className="row g-4">
          {/* Navigation Sidebar */}
          <div className="col-lg-3 col-md-4">
            <div className="list-group shadow-sm border-0 rounded-3">
              {topics.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTopic(t.id)}
                  className={`list-group-item list-group-item-action d-flex align-items-center gap-2 py-3 ${
                    activeTopic === t.id ? 'active text-white fw-semibold' : 'text-white'
                  }`}
                  style={{
                    backgroundColor: activeTopic === t.id ? 'var(--smp-royal-blue)' : 'var(--smp-dark-blue)',
                    borderColor: 'var(--smp-border)'
                  }}
                >
                  <i className={`bi ${t.icon}`}></i>
                  <span>{t.title}</span>
                </button>
              ))}
            </div>

            <div className="card mt-4 border-0 p-3 text-center rounded-3" style={{ backgroundColor: 'var(--smp-dark-blue)' }}>
              <i className="bi bi-shield-lock fs-2 mb-2" style={{ color: 'var(--smp-royal-blue)' }}></i>
              <div className="fw-bold small text-white">Enterprise Direct Support</div>
              <small className="text-muted">owner-support@smp.com</small>
              <div className="mt-2 text-muted" style={{ fontSize: '0.72rem' }}>Priority 24/7 Tech Lead Hotline</div>
            </div>
          </div>

          {/* Detailed Content Pane */}
          <div className="col-lg-9 col-md-8">
            <div className="p-4 rounded-4 border" style={{ backgroundColor: 'var(--smp-dark-blue)' }}>
              {activeTopic === 'governance' && (
                <div>
                  <h4 className="fw-bold text-white mb-3">1. Corporate Multi-Store Governance</h4>
                  <p className="text-secondary leading-relaxed">
                    The Owner Console provides master oversight across all retail stores, branches, and commercial entities within the <strong>SMP</strong> enterprise. As the Master Owner, you have unrestricted global authority to review sales, audits, inventory reserves, and financial metrics across every subsidiary shop.
                  </p>
                  <div className="alert alert-info border small">
                    <i className="bi bi-info-circle-fill me-2"></i>
                    <strong>Shop Isolation Guarantee:</strong> While each shop's Admin and Staff can only view their own isolated branch transactions, the Owner Console aggregates data across all locations into unified consolidated reports.
                  </div>
                  <h6 className="fw-bold text-white mt-4">Key Responsibilities:</h6>
                  <ul className="text-secondary small">
                    <li>Authorizing new shop entities (e.g. expanding into Footwear, Electronics, Groceries).</li>
                    <li>Conducting monthly fiscal reconciliations and monitoring return on capital.</li>
                    <li>Overseeing shop managers, designating branch permissions, and monitoring store audits.</li>
                  </ul>
                </div>
              )}

              {activeTopic === 'pnl' && (
                <div>
                  <h4 className="fw-bold text-white mb-3">2. Mathematical Profit & Loss Engine</h4>
                  <p className="text-secondary leading-relaxed">
                    SMP implements true mathematical financial auditing. Unlike basic websites that confuse gross revenue with profit, SMP strictly separates:
                  </p>
                  <div className="p-3 rounded-3 border mb-3" style={{ backgroundColor: 'var(--smp-card-bg)' }}>
                    <div className="fw-bold text-primary mb-2 font-monospace">Mathematical Formulas:</div>
                    <ul className="mb-0 small text-secondary">
                      <li><strong>Gross Profit</strong> = Total Revenue - Total Purchase Cost of Goods Sold (COGS)</li>
                      <li><strong>Net Profit</strong> = Gross Profit - Total Operating Expenses (Rent, Salaries, Electricity, Logistics)</li>
                      <li><strong>COGS</strong> = Σ (Cost Price × Units Sold)</li>
                    </ul>
                  </div>
                  <p className="text-secondary small">
                    For example, if 100 Units of apparel (Cost: ₹500, Selling: ₹1,000) are sold:
                    <br />
                    • Revenue = ₹100,000 | Purchase Cost = ₹50,000 | Gross Profit = ₹50,000.
                    <br />
                    • If Store Overheads = ₹20,000, Net Profit = ₹30,000.
                  </p>
                </div>
              )}

              {activeTopic === 'investments' && (
                <div>
                  <h4 className="fw-bold text-white mb-3">3. Capital Investment Tracking</h4>
                  <p className="text-secondary leading-relaxed">
                    All financial injections into SMP are tracked in the <code>Investments</code> ledger. This includes:
                  </p>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="p-3 rounded-3 border h-100" style={{ backgroundColor: 'var(--smp-card-bg)' }}>
                        <div className="fw-bold text-success mb-1">Initial Capital</div>
                        <p className="small text-muted mb-0">Initial lease deposit, boutique interior design, POS hardware terminals, and initial brand inventory.</p>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 rounded-3 border h-100" style={{ backgroundColor: 'var(--smp-card-bg)' }}>
                        <div className="fw-bold text-primary mb-1">Inventory Capital</div>
                        <p className="small text-muted mb-0">Bulk supplier garment purchases, textile procurement, and stock replenishment.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTopic === 'gst' && (
                <div>
                  <h4 className="fw-bold text-white mb-3">4. GST Audits & Tax Remittance</h4>
                  <p className="text-secondary leading-relaxed">
                    Every invoice generated in the platform explicitly accounts for 5% Apparel GST, split equally into <strong>CGST (2.5%)</strong> and <strong>SGST (2.5%)</strong>.
                  </p>
                  <p className="text-secondary small">
                    Cumulative collections are tracked in the Owner Financial Dashboard under <strong>GST Collection</strong>. Ensure that monthly remittances match the aggregate CGST + SGST figures prior to the 20th of every calendar month.
                  </p>
                </div>
              )}

              {activeTopic === 'scalability' && (
                <div>
                  <h4 className="fw-bold text-white mb-3">5. Shopping Mall Expansion Roadmap</h4>
                  <p className="text-secondary leading-relaxed">
                    The SMP architecture is natively multitenant and engineered for limitless scalability across multi-store malls and retail chains.
                  </p>
                  <p className="text-secondary small">
                    Every product, bill, inventory unit, and expense is indexed with <code>shopId</code> and <code>branchId</code>. Expanding into a complete 50-store shopping mall requires simply adding new shop records via the Owner Store Manager.
                  </p>
                </div>
              )}

              {activeTopic === 'security' && (
                <div>
                  <h4 className="fw-bold text-white mb-3">6. Data Isolation & Role Guards</h4>
                  <p className="text-secondary leading-relaxed">
                    Security is enforced at both the API routing layer (JWT verification + RBAC authorization) and frontend routing layer (<code>ProtectedRoute</code>):
                  </p>
                  <ul className="text-secondary small">
                    <li>Customers can only access their personal cart, orders, and addresses.</li>
                    <li>Staff accounts are restricted to POS billing and cannot access investment ledgers or profit audits.</li>
                    <li>Store Admins manage their respective store inventory, customers, and staff.</li>
                    <li>Master Owner holds top-tier governance across all financial and multi-shop entities.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerHelp;
