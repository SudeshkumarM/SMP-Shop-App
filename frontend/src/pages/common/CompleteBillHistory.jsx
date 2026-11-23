import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import socket from '../../services/socket';
import { useToast } from '../../context/ToastContext';
import InvoicePrintModal from '../../components/pos/InvoicePrintModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const CompleteBillHistory = ({ role = 'admin' }) => {
  const { addToast } = useToast();

  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({
    totalBills: 0,
    totalSales: 0,
    totalGst: 0,
    totalDiscounts: 0,
    totalDeliveryCharges: 0,
    totalCancelledBills: 0,
    totalSuccessfulPayments: 0
  });

  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [staffId, setStaffId] = useState('all');
  const [date, setDate] = useState('');
  const [month, setMonth] = useState('all');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [billStatus, setBillStatus] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 20;

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modals
  const [viewInvoice, setViewInvoice] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [editReason, setEditReason] = useState('Invoice correction');
  const [savingBill, setSavingBill] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletingBill, setDeletingBill] = useState(false);
  const editInFlightRef = useRef(false);
  const deletionInFlightRef = useRef(false);
  const canManageBills = role === 'admin' || role === 'owner';

  // Fetch staff list for filter dropdown
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get('/admin/staff');
        if (res.data?.success) {
          setStaffList(res.data.staff || []);
        }
      } catch (err) {
        // Non-blocking
      }
    };
    fetchStaff();
  }, []);

  const fetchHistory = async (page = currentPage) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        search: search.trim() || undefined,
        staffId: staffId !== 'all' ? staffId : undefined,
        date: date || undefined,
        month: month !== 'all' ? month : undefined,
        year: year || undefined,
        paymentStatus: paymentStatus !== 'all' ? paymentStatus : undefined,
        billStatus: billStatus !== 'all' ? billStatus : undefined
      };

      const res = await api.get('/billing/complete-history', { params });
      if (res.data?.success) {
        setInvoices(res.data.invoices || []);
        setSummary(res.data.summary || {
          totalBills: 0,
          totalSales: 0,
          totalGst: 0,
          totalDiscounts: 0,
          totalDeliveryCharges: 0,
          totalCancelledBills: 0,
          totalSuccessfulPayments: 0
        });
        setTotalPages(res.data.totalPages || 1);
        setCurrentPage(res.data.currentPage || 1);
        setTotalRecords(res.data.total || 0);
      }
    } catch (err) {
      console.error('Fetch bill history error:', err);
      addToast(err.response?.data?.message || 'Error fetching complete bill history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (invoice) => {
    setEditingInvoice(invoice);
    setEditItems((invoice.items || []).map((item) => ({ ...item })));
    setEditReason('Invoice correction');
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!editingInvoice || editInFlightRef.current) return;
    const reason = editReason.trim();
    if (!reason) {
      addToast('Enter a reason before editing this bill.', 'warning');
      return;
    }

    editInFlightRef.current = true;
    setSavingBill(true);
    try {
      const res = await api.put(`/billing/invoice/${editingInvoice._id}`, {
        items: editItems,
        reason
      });
      if (!res.data?.success) {
        addToast(res.data?.message || 'Bill was not updated.', 'error');
        return;
      }

      addToast(res.data.message || 'Bill updated successfully.', 'success');
      setEditingInvoice(null);
      fetchHistory(currentPage);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update bill.', 'error');
    } finally {
      editInFlightRef.current = false;
      setSavingBill(false);
    }
  };

  const handleDeleteBill = async () => {
    if (!deletingInvoice || deletionInFlightRef.current) return;
    const reason = deleteReason.trim();
    if (!reason) {
      addToast('Enter a reason before deleting this bill.', 'warning');
      return;
    }

    deletionInFlightRef.current = true;
    setDeletingBill(true);
    try {
      const res = await api.delete(`/billing/invoice/${deletingInvoice._id}`, {
        data: { reason }
      });
      if (!res.data?.success) {
        addToast(res.data?.message || 'Bill was not deleted.', 'error');
        return;
      }

      addToast(res.data.message || 'Bill permanently deleted.', 'success');
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(deletingInvoice._id);
        return next;
      });
      setDeletingInvoice(null);
      setDeleteReason('');
      fetchHistory(currentPage);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete bill.', 'error');
    } finally {
      deletionInFlightRef.current = false;
      setDeletingBill(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
  }, [search, staffId, date, month, year, paymentStatus, billStatus]);

  // Real-time update listeners
  useEffect(() => {
    const onBillGenerated = () => {
      addToast('New bill generated in real-time!', 'info');
      fetchHistory(currentPage);
    };

    socket.on('bill:created', onBillGenerated);
    socket.on('bill:updated', () => fetchHistory(currentPage));
    socket.on('bill:deleted', () => fetchHistory(currentPage));

    return () => {
      socket.off('bill:created', onBillGenerated);
      socket.off('bill:updated');
      socket.off('bill:deleted');
    };
  }, [currentPage]);

  const resetFilters = () => {
    setSearch('');
    setStaffId('all');
    setDate('');
    setMonth('all');
    setYear(new Date().getFullYear().toString());
    setPaymentStatus('all');
    setBillStatus('all');
  };

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedIds.size === invoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(invoices.map(inv => inv._id)));
    }
  };

  const toggleSelectOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // 1. Prominent "DOWNLOAD ALL BILLS – PDF"
  const handleDownloadAllPdf = async () => {
    try {
      setExportingPdf(true);
      addToast('Preparing Complete Bill History PDF...', 'info');

      // Fetch ALL matching invoices from backend
      const res = await api.get('/billing/complete-history', {
        params: {
          search: search.trim() || undefined,
          staffId: staffId !== 'all' ? staffId : undefined,
          date: date || undefined,
          month: month !== 'all' ? month : undefined,
          year: year || undefined,
          paymentStatus: paymentStatus !== 'all' ? paymentStatus : undefined,
          billStatus: billStatus !== 'all' ? billStatus : undefined,
          exportAll: 'true'
        }
      });

      if (!res.data?.success || !res.data.invoices?.length) {
        addToast('No bills available to export.', 'warning');
        return;
      }

      const allBills = res.data.invoices;
      const kpis = res.data.summary;

      // Generate Clean Multi-Page PDF with jsPDF and autoTable
      const doc = new jsPDF('landscape', 'pt', 'a4');

      // Header Banner
      doc.setFillColor(7, 20, 38); // Deep Navy
      doc.rect(0, 0, 842, 65, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.text('SMP – COMPLETE BILL HISTORY REPORT', 40, 38);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(184, 197, 214);
      doc.text(`Generated: ${new Date().toLocaleString()} | Filter: ${year || 'All Years'}`, 40, 54);
      doc.text(`Total Records: ${allBills.length} Invoices`, 650, 54);

      // KPI Summary Row in PDF
      doc.setFillColor(21, 42, 69);
      doc.roundedRect(40, 75, 762, 42, 4, 4, 'F');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Bills: ${kpis.totalBills}`, 50, 100);
      doc.text(`Total Sales: ₹${kpis.totalSales.toLocaleString('en-IN')}`, 160, 100);
      doc.text(`Total GST: ₹${kpis.totalGst.toLocaleString('en-IN')}`, 300, 100);
      doc.text(`Discounts: ₹${kpis.totalDiscounts.toLocaleString('en-IN')}`, 430, 100);
      doc.text(`Delivery: ₹${kpis.totalDeliveryCharges.toLocaleString('en-IN')}`, 560, 100);
      doc.text(`Paid: ${kpis.totalSuccessfulPayments}`, 670, 100);

      // Table Data
      const tableData = allBills.map((inv, idx) => {
        const productsSummary = (inv.items || [])
          .map(it => `${it.productName} (x${it.quantity})`)
          .join(', ');
        const totalQty = (inv.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0);
        const gst = (inv.cgstAmount || 0) + (inv.sgstAmount || 0) + (inv.igstAmount || 0);

        return [
          idx + 1,
          inv.invoiceNumber,
          inv.customerInfo?.name || 'Walk-in',
          inv.customerInfo?.phone || 'N/A',
          productsSummary || 'Item',
          totalQty,
          `₹${(inv.subtotal || 0).toFixed(2)}`,
          `₹${gst.toFixed(2)}`,
          `₹${(inv.totalDiscount || 0).toFixed(2)}`,
          `₹${(inv.deliveryCharge || 0).toFixed(2)}`,
          `₹${(inv.grandTotal || 0).toFixed(2)}`,
          inv.paymentMethod || 'CASH',
          inv.paymentStatus || 'PAID',
          inv.staffId?.fullName || inv.staffId?.username || 'Staff',
          new Date(inv.createdAt).toLocaleDateString()
        ];
      });

      autoTable(doc, {
        startY: 125,
        head: [[
          '#', 'Invoice No', 'Customer', 'Mobile', 'Products',
          'Qty', 'Price', 'GST', 'Disc', 'Del', 'Grand Total',
          'Method', 'Status', 'Staff', 'Date'
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 3,
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 65, fontStyle: 'bold' },
          2: { cellWidth: 65 },
          3: { cellWidth: 55 },
          4: { cellWidth: 120 },
          5: { cellWidth: 24, halign: 'center' },
          6: { cellWidth: 42, halign: 'right' },
          7: { cellWidth: 38, halign: 'right' },
          8: { cellWidth: 35, halign: 'right' },
          9: { cellWidth: 35, halign: 'right' },
          10: { cellWidth: 55, halign: 'right', fontStyle: 'bold' },
          11: { cellWidth: 45, halign: 'center' },
          12: { cellWidth: 40, halign: 'center' },
          13: { cellWidth: 55 },
          14: { cellWidth: 55 }
        },
        didDrawPage: (data) => {
          // Footer
          doc.setFontSize(8);
          doc.setTextColor(120);
          doc.text(
            `Page ${doc.internal.getNumberOfPages()} | SMP Retail POS System | Confidential`,
            40,
            doc.internal.pageSize.height - 15
          );
        }
      });

      doc.save(`SMP_Complete_Bill_History_${Date.now()}.pdf`);
      addToast('Complete Bill History PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error('PDF export error:', err);
      addToast('Failed to export PDF report.', 'error');
    } finally {
      setExportingPdf(false);
    }
  };

  // 2. Download Selected Bills PDF
  const handleDownloadSelectedPdf = () => {
    if (selectedIds.size === 0) {
      addToast('Please select at least one bill from the table.', 'warning');
      return;
    }

    const selectedBills = invoices.filter(inv => selectedIds.has(inv._id));
    const doc = new jsPDF('landscape', 'pt', 'a4');

    doc.setFillColor(7, 20, 38);
    doc.rect(0, 0, 842, 60, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('SMP – SELECTED INVOICES REPORT', 40, 38);

    const tableData = selectedBills.map((inv, idx) => {
      const productsSummary = (inv.items || [])
        .map(it => `${it.productName} (x${it.quantity})`)
        .join(', ');
      const totalQty = (inv.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0);
      const gst = (inv.cgstAmount || 0) + (inv.sgstAmount || 0) + (inv.igstAmount || 0);

      return [
        idx + 1,
        inv.invoiceNumber,
        inv.customerInfo?.name || 'Walk-in',
        inv.customerInfo?.phone || 'N/A',
        productsSummary || 'Item',
        totalQty,
        `₹${(inv.subtotal || 0).toFixed(2)}`,
        `₹${gst.toFixed(2)}`,
        `₹${(inv.grandTotal || 0).toFixed(2)}`,
        inv.paymentMethod || 'CASH',
        inv.paymentStatus || 'PAID',
        new Date(inv.createdAt).toLocaleDateString()
      ];
    });

    autoTable(doc, {
      startY: 80,
      head: [[
        '#', 'Invoice No', 'Customer', 'Mobile', 'Products',
        'Qty', 'Subtotal', 'GST', 'Grand Total', 'Method', 'Status', 'Date'
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [124, 58, 237] }
    });

    doc.save(`SMP_Selected_Bills_${Date.now()}.pdf`);
    addToast(`Exported ${selectedBills.length} selected bills to PDF.`, 'success');
  };

  // 3. Export to Excel
  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      addToast('Preparing Excel workbook...', 'info');

      const res = await api.get('/billing/complete-history', {
        params: {
          search: search.trim() || undefined,
          staffId: staffId !== 'all' ? staffId : undefined,
          date: date || undefined,
          month: month !== 'all' ? month : undefined,
          year: year || undefined,
          paymentStatus: paymentStatus !== 'all' ? paymentStatus : undefined,
          billStatus: billStatus !== 'all' ? billStatus : undefined,
          exportAll: 'true'
        }
      });

      if (!res.data?.success || !res.data.invoices?.length) {
        addToast('No bills to export.', 'warning');
        return;
      }

      const rows = res.data.invoices.map((inv, idx) => ({
        'Serial No': idx + 1,
        'Invoice No': inv.invoiceNumber,
        'Customer Name': inv.customerInfo?.name || 'Walk-in',
        'Customer Mobile': inv.customerInfo?.phone || 'N/A',
        'Items Summary': (inv.items || []).map(i => `${i.productName} (x${i.quantity})`).join(', '),
        'Total Quantity': (inv.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0),
        'Product Price (Subtotal)': inv.subtotal,
        'Total GST': (inv.cgstAmount || 0) + (inv.sgstAmount || 0) + (inv.igstAmount || 0),
        'Discount': inv.totalDiscount || 0,
        'Delivery Charge': inv.deliveryCharge || 0,
        'Grand Total': inv.grandTotal,
        'Payment Method': inv.paymentMethod,
        'Payment Status': inv.paymentStatus,
        'Staff Name': inv.staffId?.fullName || inv.staffId?.username || 'Staff',
        'Bill Date & Time': new Date(inv.createdAt).toLocaleString(),
        'Bill Status': inv.isDeleted ? 'CANCELLED' : 'ACTIVE'
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'SMP Bills');
      XLSX.writeFile(wb, `SMP_Complete_Bill_History_${Date.now()}.xlsx`);
      addToast('Excel export completed!', 'success');
    } catch (err) {
      console.error('Excel export error:', err);
      addToast('Failed to export Excel.', 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div className="fade-in pb-5">
      {/* Top Header & Prominent Download Action */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold brand-font text-white mb-1">
            <i className="bi bi-journal-text text-primary me-2"></i>Complete Bill History
          </h2>
          <p className="text-muted mb-0">
            Audit-grade comprehensive billing record since platform inception with live KPI metrics.
          </p>
        </div>

        {/* Action Buttons with Prominent PDF Download */}
        <div className="d-flex flex-wrap align-items-center gap-2">
          <button
            onClick={handleDownloadAllPdf}
            className="btn btn-download-all"
            disabled={exportingPdf}
            title="Download full multi-page PDF covering all matching records"
          >
            {exportingPdf ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                Generating PDF...
              </>
            ) : (
              <>
                <i className="bi bi-file-earmark-pdf-fill fs-5"></i>
                DOWNLOAD ALL BILLS – PDF
              </>
            )}
          </button>

          <button
            onClick={handleExportExcel}
            className="btn btn-teal text-white btn-sm px-3 fw-bold"
            disabled={exportingExcel}
          >
            <i className="bi bi-file-earmark-spreadsheet-fill me-1"></i>
            {exportingExcel ? 'Exporting...' : 'Export Excel'}
          </button>

          {selectedIds.size > 0 && (
            <button
              onClick={handleDownloadSelectedPdf}
              className="btn btn-purple btn-sm px-3 fw-bold"
            >
              <i className="bi bi-check2-square me-1"></i>
              Export Selected ({selectedIds.size})
            </button>
          )}

          <button
            onClick={() => fetchHistory(currentPage)}
            className="btn btn-outline-primary btn-sm"
            title="Refresh records"
          >
            <i className="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>

      {/* 7 Summary KPI Metric Cards */}
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-lg-4 col-sm-6">
          <div className="kpi-card kpi-card-blue h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Total Bills</span>
              <div className="kpi-icon"><i className="bi bi-receipt"></i></div>
            </div>
            <h3 className="fw-bold text-white mb-0">{summary.totalBills.toLocaleString()}</h3>
            <small className="text-info">All transactions to date</small>
          </div>
        </div>

        <div className="col-xl-3 col-lg-4 col-sm-6">
          <div className="kpi-card kpi-card-purple h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Total Sales</span>
              <div className="kpi-icon"><i className="bi bi-currency-rupee"></i></div>
            </div>
            <h3 className="fw-bold text-white mb-0">₹{summary.totalSales.toLocaleString('en-IN')}</h3>
            <small className="text-purple" style={{ color: '#c4b5fd' }}>Gross bill revenues</small>
          </div>
        </div>

        <div className="col-xl-3 col-lg-4 col-sm-6">
          <div className="kpi-card kpi-card-teal h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Total GST</span>
              <div className="kpi-icon"><i className="bi bi-percent"></i></div>
            </div>
            <h3 className="fw-bold text-white mb-0">₹{summary.totalGst.toLocaleString('en-IN')}</h3>
            <small className="text-teal" style={{ color: '#5eead4' }}>CGST + SGST tax pool</small>
          </div>
        </div>

        <div className="col-xl-3 col-lg-4 col-sm-6">
          <div className="kpi-card kpi-card-green h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Total Discounts</span>
              <div className="kpi-icon"><i className="bi bi-tag-fill"></i></div>
            </div>
            <h3 className="fw-bold text-white mb-0">₹{summary.totalDiscounts.toLocaleString('en-IN')}</h3>
            <small className="text-success">Promotional benefits</small>
          </div>
        </div>

        <div className="col-xl-3 col-lg-4 col-sm-6">
          <div className="kpi-card kpi-card-sky h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Delivery Charges</span>
              <div className="kpi-icon"><i className="bi bi-truck"></i></div>
            </div>
            <h3 className="fw-bold text-white mb-0">₹{summary.totalDeliveryCharges.toLocaleString('en-IN')}</h3>
            <small className="text-info">Logistics collected</small>
          </div>
        </div>

        <div className="col-xl-3 col-lg-4 col-sm-6">
          <div className="kpi-card kpi-card-coral h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Cancelled Bills</span>
              <div className="kpi-icon"><i className="bi bi-x-circle-fill"></i></div>
            </div>
            <h3 className="fw-bold text-white mb-0">{summary.totalCancelledBills}</h3>
            <small className="text-danger">Voided / refunded</small>
          </div>
        </div>

        <div className="col-xl-3 col-lg-4 col-sm-6">
          <div className="kpi-card kpi-card-orange h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Paid Payments</span>
              <div className="kpi-icon"><i className="bi bi-check-circle-fill"></i></div>
            </div>
            <h3 className="fw-bold text-white mb-0">{summary.totalSuccessfulPayments}</h3>
            <small className="text-warning">Completed checkouts</small>
          </div>
        </div>
      </div>

      {/* Comprehensive Filter Toolbar */}
      <div className="smp-card p-3 mb-4">
        <div className="row g-2 align-items-end">
          {/* Search */}
          <div className="col-md-3">
            <label className="form-label small text-muted mb-1">Search</label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-transparent border-end-0 text-muted">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Invoice, Name or Mobile..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Staff Filter */}
          <div className="col-md-2 col-sm-6">
            <label className="form-label small text-muted mb-1">Staff</label>
            <select
              className="form-select form-select-sm"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
            >
              <option value="all">All Staff</option>
              {staffList.map((st) => (
                <option key={st._id} value={st._id}>
                  {st.fullName || st.username} ({st.staffId || 'STF'})
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="col-md-2 col-sm-6">
            <label className="form-label small text-muted mb-1">Specific Date</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Month */}
          <div className="col-md-1 col-sm-4">
            <label className="form-label small text-muted mb-1">Month</label>
            <select
              className="form-select form-select-sm"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              <option value="all">All</option>
              <option value="1">Jan</option>
              <option value="2">Feb</option>
              <option value="3">Mar</option>
              <option value="4">Apr</option>
              <option value="5">May</option>
              <option value="6">Jun</option>
              <option value="7">Jul</option>
              <option value="8">Aug</option>
              <option value="9">Sep</option>
              <option value="10">Oct</option>
              <option value="11">Nov</option>
              <option value="12">Dec</option>
            </select>
          </div>

          {/* Year */}
          <div className="col-md-1 col-sm-4">
            <label className="form-label small text-muted mb-1">Year</label>
            <select
              className="form-select form-select-sm"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="">All</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>

          {/* Payment Status */}
          <div className="col-md-1 col-sm-4">
            <label className="form-label small text-muted mb-1">Payment</label>
            <select
              className="form-select form-select-sm"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              <option value="all">All</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Bill Status */}
          <div className="col-md-1 col-sm-6">
            <label className="form-label small text-muted mb-1">Status</label>
            <select
              className="form-select form-select-sm"
              value={billStatus}
              onChange={(e) => setBillStatus(e.target.value)}
            >
              <option value="all">All</option>
              <option value="ACTIVE">Active</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="EDITED">Edited</option>
            </select>
          </div>

          {/* Reset */}
          <div className="col-md-1 col-sm-6">
            <button
              onClick={resetFilters}
              className="btn btn-cancel btn-sm w-100"
              title="Reset all filters"
            >
              <i className="bi bi-arrow-counterclockwise"></i> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Bill History Table: 17 Required Columns */}
      <div className="smp-card overflow-hidden mb-4">
        <div className="table-responsive">
          <table className="table align-middle mb-0" style={{ minWidth: '1200px' }}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={invoices.length > 0 && selectedIds.size === invoices.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={{ width: '45px' }}>#</th>
                <th>Invoice No</th>
                <th>Customer Name</th>
                <th>Customer Mobile</th>
                <th>Product Details</th>
                <th className="text-center">Qty</th>
                <th className="text-end">Price</th>
                <th className="text-end">GST</th>
                <th className="text-end">Discount</th>
                <th className="text-end">Delivery</th>
                <th className="text-end">Grand Total</th>
                <th className="text-center">Method</th>
                <th className="text-center">Payment Status</th>
                <th>Staff</th>
                <th>Bill Date</th>
                <th className="text-center">Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="18" className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="18" className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary"></i>
                    No billing records found matching your filters.
                  </td>
                </tr>
              ) : (
                invoices.map((inv, idx) => {
                  const isCancelled = inv.isDeleted;
                  const isEdited = inv.editHistory && inv.editHistory.length > 0;
                  const totalGst = (inv.cgstAmount || 0) + (inv.sgstAmount || 0) + (inv.igstAmount || 0);
                  const totalQty = (inv.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0);
                  const isSelected = selectedIds.has(inv._id);

                  return (
                    <tr
                      key={inv._id}
                      className={isCancelled ? 'opacity-75 bg-danger bg-opacity-10' : ''}
                    >
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(inv._id)}
                        />
                      </td>
                      <td className="text-muted small">
                        {(currentPage - 1) * limit + idx + 1}
                      </td>
                      <td>
                        <span className="font-monospace fw-bold text-info">
                          {inv.invoiceNumber}
                        </span>
                      </td>
                      <td>
                        <span className="fw-semibold text-white">
                          {inv.customerInfo?.name || 'Walk-in Customer'}
                        </span>
                      </td>
                      <td>
                        <span className="font-monospace text-muted small">
                          {inv.customerInfo?.phone || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <div style={{ maxWidth: '180px' }} className="text-truncate" title={(inv.items || []).map(i => `${i.productName} (x${i.quantity})`).join(', ')}>
                          {(inv.items || []).map(i => i.productName).join(', ') || 'Item'}
                        </div>
                      </td>
                      <td className="text-center">
                        <span className="badge bg-secondary font-monospace">
                          {totalQty}
                        </span>
                      </td>
                      <td className="text-end font-monospace text-white">
                        ₹{(inv.subtotal || 0).toFixed(2)}
                      </td>
                      <td className="text-end font-monospace text-teal" style={{ color: '#5eead4' }}>
                        ₹{totalGst.toFixed(2)}
                      </td>
                      <td className="text-end font-monospace text-muted">
                        ₹{(inv.totalDiscount || 0).toFixed(2)}
                      </td>
                      <td className="text-end font-monospace text-muted">
                        ₹{(inv.deliveryCharge || 0).toFixed(2)}
                      </td>
                      <td className="text-end font-monospace fw-bold text-white fs-6">
                        ₹{(inv.grandTotal || 0).toFixed(2)}
                      </td>
                      <td className="text-center">
                        <span className="badge bg-secondary font-monospace small">
                          {inv.paymentMethod || 'CASH'}
                        </span>
                      </td>
                      <td className="text-center">
                        <span
                          className={`badge ${
                            inv.paymentStatus === 'PAID'
                              ? 'bg-success'
                              : inv.paymentStatus === 'PENDING'
                              ? 'bg-warning text-dark'
                              : 'bg-danger'
                          }`}
                        >
                          {inv.paymentStatus || 'PAID'}
                        </span>
                      </td>
                      <td>
                        <small className="text-muted text-nowrap">
                          {inv.staffId?.fullName || inv.staffId?.username || 'Staff'}
                        </small>
                      </td>
                      <td>
                        <small className="text-muted text-nowrap">
                          {new Date(inv.createdAt).toLocaleDateString()} {new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </small>
                      </td>
                      <td className="text-center">
                        {isCancelled ? (
                          <span className="badge bg-danger">CANCELLED</span>
                        ) : isEdited ? (
                          <span className="badge bg-warning text-dark">EDITED</span>
                        ) : (
                          <span className="badge bg-outline-success border border-success text-success">
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            onClick={() => setViewInvoice(inv)}
                            className="btn btn-info btn-sm text-white"
                            title="View Invoice & Print"
                          >
                            <i className="bi bi-eye-fill"></i> View
                          </button>
                          {canManageBills && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(inv)}
                                className="btn btn-outline-warning btn-sm"
                                title="Edit bill"
                              >
                                <i className="bi bi-pencil-square"></i> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeletingInvoice(inv);
                                  setDeleteReason('');
                                }}
                                className="btn btn-outline-danger btn-sm"
                                title="Permanently delete bill"
                              >
                                <i className="bi bi-trash3"></i> Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="d-flex flex-wrap justify-content-between align-items-center p-3 border-top border-secondary gap-2">
          <small className="text-muted">
            Showing <strong>{invoices.length}</strong> of <strong>{totalRecords}</strong> total records (Page {currentPage} of {totalPages})
          </small>
          <div className="d-flex gap-1">
            <button
              className="btn btn-secondary btn-sm"
              disabled={currentPage <= 1 || loading}
              onClick={() => fetchHistory(currentPage - 1)}
            >
              <i className="bi bi-chevron-left"></i> Previous
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={currentPage >= totalPages || loading}
              onClick={() => fetchHistory(currentPage + 1)}
            >
              Next <i className="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Single Invoice View & Print Modal */}
      {viewInvoice && (
        <InvoicePrintModal
          invoice={viewInvoice}
          onClose={() => setViewInvoice(null)}
        />
      )}

      {editingInvoice && canManageBills && (
        <div className="modal show d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content shadow-lg">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-white">
                  Edit bill: {editingInvoice.invoiceNumber}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  disabled={savingBill}
                  onClick={() => setEditingInvoice(null)}
                />
              </div>
              <form onSubmit={handleSaveEdit}>
                <div className="modal-body">
                  <p className="small text-muted">
                    {role === 'owner'
                      ? 'Owner access applies across shops.'
                      : 'Admin access is limited to the assigned shop.'}
                    {' '}Changes adjust stock and are retained in the invoice audit history.
                  </p>
                  <div className="table-responsive mb-3">
                    <table className="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Unit Price</th>
                          <th>Quantity</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editItems.map((item, index) => (
                          <tr key={`${item.productId || item.sku || item.productName}-${index}`}>
                            <td>{item.productName}</td>
                            <td>₹{Number(item.unitPrice || 0).toFixed(2)}</td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                className="form-control form-control-sm"
                                value={item.quantity}
                                disabled={savingBill}
                                onChange={(event) => {
                                  const quantity = Math.max(1, Number.parseInt(event.target.value, 10) || 1);
                                  setEditItems((current) => current.map((entry, entryIndex) => (
                                    entryIndex === index ? { ...entry, quantity } : entry
                                  )));
                                }}
                                aria-label={`Quantity for ${item.productName}`}
                              />
                            </td>
                            <td>₹{(Number(item.unitPrice || 0) * Number(item.quantity || 0)).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <label htmlFor="complete-history-edit-reason" className="form-label small fw-semibold">
                    Reason for correction
                  </label>
                  <input
                    id="complete-history-edit-reason"
                    type="text"
                    className="form-control"
                    maxLength="500"
                    required
                    value={editReason}
                    disabled={savingBill}
                    onChange={(event) => setEditReason(event.target.value)}
                  />
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={savingBill}
                    onClick={() => setEditingInvoice(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-warning"
                    disabled={savingBill || !editReason.trim() || editItems.length === 0}
                  >
                    {savingBill ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {deletingInvoice && canManageBills && (
        <div className="modal show d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-white">Permanently delete bill</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  disabled={deletingBill}
                  onClick={() => setDeletingInvoice(null)}
                />
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  Permanently delete invoice <strong>{deletingInvoice.invoiceNumber}</strong>?
                </p>
                <p className="small text-danger">
                  This permanently removes the bill and cannot be undone. For an active bill, stock is restored and any linked order is cancelled/refunded in the same database transaction. Previously cancelled bills are removed without repeating those actions.
                </p>
                <label htmlFor="complete-history-delete-reason" className="form-label small fw-semibold">
                  Reason for permanent deletion
                </label>
                <textarea
                  id="complete-history-delete-reason"
                  className="form-control"
                  rows="3"
                  maxLength="500"
                  value={deleteReason}
                  onChange={(event) => setDeleteReason(event.target.value)}
                  disabled={deletingBill}
                  required
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={deletingBill}
                  onClick={() => setDeletingInvoice(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={deletingBill || !deleteReason.trim()}
                  onClick={handleDeleteBill}
                >
                  {deletingBill ? 'Deleting...' : 'Confirm Permanent Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompleteBillHistory;
