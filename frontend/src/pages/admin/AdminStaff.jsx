import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminStaff = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [resetModalStaff, setResetModalStaff] = useState(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: 'Billing & POS',
    jobRole: 'Cashier / Billing Executive',
    salary: 25000,
    tempPassword: 'StaffPassword123'
  });

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/staff');
      if (res.data.success) {
        setStaffList(res.data.staff || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/staff', formData);
      if (res.data.success) {
        addToast(res.data.message, 'success');
        setShowAddModal(false);
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          department: 'Billing & POS',
          jobRole: 'Cashier / Billing Executive',
          salary: 25000,
          tempPassword: 'StaffPassword123'
        });
        fetchStaff();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create staff account', 'error');
    }
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/admin/staff/${editingStaff._id}`, editingStaff);
      if (res.data.success) {
        addToast('Staff details updated', 'success');
        setEditingStaff(null);
        fetchStaff();
      }
    } catch (err) {
      addToast('Update failed', 'error');
    }
  };

  const handleToggleActive = async (staff) => {
    try {
      const res = await api.put(`/admin/staff/${staff._id}`, { isActive: !staff.isActive });
      if (res.data.success) {
        addToast(`Staff member marked as ${!staff.isActive ? 'Active' : 'Inactive'}`, 'info');
        fetchStaff();
      }
    } catch (err) {
      addToast('Status change failed', 'error');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/admin/staff/${resetModalStaff._id}/reset-password`, { newPassword: newPasswordVal });
      if (res.data.success) {
        addToast(`Password reset successfully for ${resetModalStaff.fullName}`, 'success');
        setResetModalStaff(null);
        setNewPasswordVal('');
      }
    } catch (err) {
      addToast('Password reset failed', 'error');
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this staff member?')) return;
    try {
      const res = await api.delete(`/admin/staff/${id}`);
      if (res.data.success) {
        addToast('Staff member deleted', 'info');
        fetchStaff();
      }
    } catch (err) {
      addToast('Failed to delete staff member', 'error');
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold brand-font mb-0">Staff Management & Role Provisioning</h3>
          <small className="text-muted">Create POS operators, assign departments, reset passwords & track sales</small>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm rounded-pill px-3 fw-semibold">
          <i className="bi bi-person-plus-fill me-1"></i> Provision New Staff Account
        </button>
      </div>

      <div className="smp-card p-4 bg-white shadow-sm">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : staffList.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-person-workspace display-4 text-secondary mb-2 d-block"></i>
            <h5>No Staff Accounts Provisioned Yet</h5>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle small mb-0">
              <thead className="table-light">
                <tr>
                  <th>Staff ID</th>
                  <th>Name & Role</th>
                  <th>Department</th>
                  <th>Contact</th>
                  <th>Bills Handled</th>
                  <th>Sales Revenue</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((stf) => (
                  <tr key={stf._id}>
                    <td>
                      <span className="badge bg-primary-subtle text-primary fw-bold fs-6">
                        {stf.staffId}
                      </span>
                    </td>
                    <td>
                      <div className="fw-bold text-dark">{stf.fullName}</div>
                      <small className="text-muted">{stf.jobRole}</small>
                    </td>
                    <td>
                      <span className="badge bg-secondary text-uppercase">
                        {stf.department}
                      </span>
                    </td>
                    <td>
                      <div><i className="bi bi-envelope text-muted me-1"></i>{stf.email}</div>
                      <div className="text-muted"><i className="bi bi-telephone text-muted me-1"></i>{stf.phone}</div>
                    </td>
                    <td className="fw-bold text-primary">{stf.totalBillsHandled || 0} bills</td>
                    <td className="fw-bold text-success">₹{stf.totalRevenueGenerated?.toFixed(2) || '0.00'}</td>
                    <td>
                      {stf.isActive ? (
                        <span className="badge bg-success">Active</span>
                      ) : (
                        <span className="badge bg-danger">Deactivated</span>
                      )}
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button
                          onClick={() => setEditingStaff(stf)}
                          className="btn btn-outline-secondary"
                          title="Edit Staff"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          onClick={() => { setResetModalStaff(stf); setNewPasswordVal('Staff123!'); }}
                          className="btn btn-outline-warning text-dark"
                          title="Reset Password"
                        >
                          <i className="bi bi-key"></i>
                        </button>
                        <button
                          onClick={() => handleToggleActive(stf)}
                          className={`btn ${stf.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
                          title={stf.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <i className={`bi bi-${stf.isActive ? 'person-dash' : 'person-check'}`}></i>
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(stf._id)}
                          className="btn btn-outline-danger"
                          title="Delete"
                        >
                          <i className="bi bi-trash3"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Provision New Staff Member</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleCreateStaff}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Staff Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Anand Sharma"
                      className="form-control"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Login Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="anand@smp.com"
                        className="form-control"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Contact Phone *</label>
                      <input
                        type="tel"
                        required
                        placeholder="10-digit number"
                        className="form-control"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      />
                    </div>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Department *</label>
                      <select
                        className="form-select"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      >
                        <option value="Billing & POS">Billing & POS</option>
                        <option value="Inventory">Inventory Management</option>
                        <option value="Sales & Customer Care">Sales & Floor Assistance</option>
                        <option value="General Operations">General Operations</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Job Role</label>
                      <input
                        type="text"
                        placeholder="e.g. POS Operator"
                        className="form-control"
                        value={formData.jobRole}
                        onChange={(e) => setFormData({ ...formData, jobRole: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Monthly Salary (₹)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.salary}
                        onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Temporary Password *</label>
                      <input
                        type="text"
                        required
                        className="form-control font-monospace"
                        value={formData.tempPassword}
                        onChange={(e) => setFormData({ ...formData, tempPassword: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm px-4 fw-semibold">
                    Create & Generate Staff ID
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Edit Staff ({editingStaff.staffId})</h5>
                <button type="button" className="btn-close" onClick={() => setEditingStaff(null)}></button>
              </div>
              <form onSubmit={handleUpdateStaff}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Full Name</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={editingStaff.fullName}
                      onChange={(e) => setEditingStaff({ ...editingStaff, fullName: e.target.value })}
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Department</label>
                      <select
                        className="form-select"
                        value={editingStaff.department}
                        onChange={(e) => setEditingStaff({ ...editingStaff, department: e.target.value })}
                      >
                        <option value="Billing & POS">Billing & POS</option>
                        <option value="Inventory">Inventory</option>
                        <option value="Sales & Customer Care">Sales & Floor</option>
                        <option value="General Operations">General Operations</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Job Role</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingStaff.jobRole}
                        onChange={(e) => setEditingStaff({ ...editingStaff, jobRole: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Salary</label>
                      <input
                        type="number"
                        className="form-control"
                        value={editingStaff.salary}
                        onChange={(e) => setEditingStaff({ ...editingStaff, salary: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={editingStaff.phone}
                        onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="stfActiveCheck"
                      checked={editingStaff.isActive}
                      onChange={(e) => setEditingStaff({ ...editingStaff, isActive: e.target.checked })}
                    />
                    <label className="form-check-label small fw-semibold" htmlFor="stfActiveCheck">
                      Staff Member is Active
                    </label>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditingStaff(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm px-4 fw-semibold">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalStaff && (
        <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Reset Password</h5>
                <button type="button" className="btn-close" onClick={() => setResetModalStaff(null)}></button>
              </div>
              <form onSubmit={handleResetPassword}>
                <div className="modal-body">
                  <p className="small text-muted mb-2">
                    Enter new temporary password for <strong>{resetModalStaff.fullName}</strong>:
                  </p>
                  <input
                    type="text"
                    required
                    className="form-control font-monospace text-center fw-bold"
                    value={newPasswordVal}
                    onChange={(e) => setNewPasswordVal(e.target.value)}
                  />
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setResetModalStaff(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-warning text-dark btn-sm fw-semibold">
                    Reset & Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStaff;
