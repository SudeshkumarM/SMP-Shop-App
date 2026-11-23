import React from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import BarcodeVisual from '../common/BarcodeVisual';

const InvoicePrintModal = ({ invoice, onClose }) => {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    const staffName = invoice.staffInfo?.fullName || invoice.staffId?.fullName;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text(invoice.shopInfo?.name || 'Store', 14, 20);

    doc.setFontSize(9);
    doc.setTextColor(100);
    if (invoice.shopInfo?.address) doc.text(invoice.shopInfo.address, 14, 26);
    const shopContacts = [
      invoice.shopInfo?.gstNumber ? `GSTIN: ${invoice.shopInfo.gstNumber}` : '',
      invoice.shopInfo?.phone ? `Phone: ${invoice.shopInfo.phone}` : ''
    ].filter(Boolean).join(' | ');
    if (shopContacts) doc.text(shopContacts, 14, 31);
    if (invoice.branchInfo?.name) doc.text(`Branch: ${invoice.branchInfo.name}`, 14, 36);

    doc.setDrawColor(200);
    doc.line(14, 40, 196, 40);

    // Invoice Meta
    doc.setFontSize(14);
    doc.setTextColor(30);
    doc.text('TAX INVOICE', 14, 43);

    doc.setFontSize(10);
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, 14, 50);
    doc.text(`Date: ${new Date(invoice.createdAt || Date.now()).toLocaleString()}`, 14, 56);
    doc.text(`Payment: ${invoice.paymentMethod} (${invoice.paymentStatus})`, 14, 62);

    doc.text(`Customer: ${invoice.customerInfo?.name || 'Walk-in'}`, 120, 50);
    doc.text(`Phone: ${invoice.customerInfo?.phone || 'N/A'}`, 120, 56);
    if (staffName) doc.text(`Staff: ${staffName}`, 120, 62);

    // Table
    const tableRows = (invoice.items || []).map((item, idx) => [
      idx + 1,
      item.productName,
      item.quantity,
      `₹${Number(item.unitPrice || 0).toFixed(2)}`,
      `${Number(item.gstPercent || 0)}%`,
      `₹${Number(item.totalAmount || 0).toFixed(2)}`
    ]);

    doc.autoTable({
      startY: 74,
      head: [['#', 'Item Description', 'Qty', 'Unit Price', 'GST %', 'Total Amount']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [40, 116, 240] }
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    // Totals
    doc.setFontSize(10);
    doc.text(`Subtotal: ₹${(invoice.subtotal || 0).toFixed(2)}`, 140, finalY);
    doc.text(`Discount: ₹${(invoice.totalDiscount || 0).toFixed(2)}`, 140, finalY + 6);
    doc.text(`CGST: ₹${(invoice.cgstAmount || 0).toFixed(2)}`, 140, finalY + 12);
    doc.text(`SGST: ₹${(invoice.sgstAmount || 0).toFixed(2)}`, 140, finalY + 18);
    if (invoice.deliveryCharge > 0) {
      doc.text(`Delivery: ₹${invoice.deliveryCharge.toFixed(2)}`, 140, finalY + 24);
    }

    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.text(`Grand Total: ₹${(invoice.grandTotal || 0).toFixed(2)}`, 140, finalY + 32);

    let thankYouY = finalY + 42;
    const cashReceived = Number(invoice.paymentDetails?.amountReceived);
    const changeReturned = Number(invoice.paymentDetails?.changeDue);
    if (
      invoice.paymentMethod === 'POS_CASH' &&
      Number.isFinite(cashReceived) &&
      Number.isFinite(changeReturned)
    ) {
      doc.setFontSize(10);
      doc.setTextColor(30);
      doc.text(`Cash Received: ₹${cashReceived.toFixed(2)}`, 140, finalY + 39);
      doc.text(`Change Returned: ₹${changeReturned.toFixed(2)}`, 140, finalY + 45);
      thankYouY = finalY + 55;
    }

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Thank you for your purchase.', 14, thankYouY);

    doc.save(`${invoice.invoiceNumber}.pdf`);
  };

  const renderDeliveryBadge = () => {
    if (!invoice.deliveryStatus) return null;
    if (invoice.deliveryStatus.includes('WhatsApp')) {
      return (
        <span className="badge bg-success-subtle text-success border border-success px-2 py-1">
          <i className="bi bi-whatsapp me-1"></i> {invoice.deliveryStatus}
        </span>
      );
    }
    if (invoice.deliveryStatus.includes('SMS')) {
      return (
        <span className="badge bg-info-subtle text-info border border-info px-2 py-1">
          <i className="bi bi-chat-dots me-1"></i> {invoice.deliveryStatus}
        </span>
      );
    }
    return (
      <span className="badge bg-warning-subtle text-warning border border-warning px-2 py-1">
        <i className="bi bi-exclamation-circle me-1"></i> {invoice.deliveryStatus}
      </span>
    );
  };

  return (
    <div className="modal show d-block bg-dark bg-opacity-75 fade-in" tabIndex="-1" role="dialog" style={{ zIndex: 1050 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content shadow-lg border-0 rounded-4" style={{ backgroundColor: '#10243D', color: '#FFFFFF' }}>
          <div className="modal-header border-0 py-3 px-4" style={{ backgroundColor: '#071426', borderBottom: '1px solid #293D58' }}>
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2 text-white">
              <i className="bi bi-receipt text-primary"></i> SMP Tax Invoice Preview
            </h5>
            <div className="d-flex align-items-center gap-2">
              {renderDeliveryBadge()}
              <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>
          </div>

          <div className="modal-body p-4" style={{ backgroundColor: '#071426' }}>
            {/* Printable Invoice Container */}
            <div id="printable-invoice" className="p-4 bg-white text-dark border rounded-3 shadow-sm">
              {/* Header */}
              <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                <div>
                  <h3 className="brand-font fw-bold text-primary mb-1">
                    {invoice.shopInfo?.name || 'Store'}
                  </h3>
                  {invoice.shopInfo?.address && (
                    <p className="text-secondary small mb-1">{invoice.shopInfo.address}</p>
                  )}
                  {(invoice.shopInfo?.gstNumber || invoice.shopInfo?.phone) && (
                    <p className="text-secondary small mb-0">
                      {invoice.shopInfo?.gstNumber && <><strong>GSTIN:</strong> {invoice.shopInfo.gstNumber}</>}
                      {invoice.shopInfo?.gstNumber && invoice.shopInfo?.phone && ' | '}
                      {invoice.shopInfo?.phone && <><strong>Phone:</strong> {invoice.shopInfo.phone}</>}
                    </p>
                  )}
                  {invoice.branchInfo?.name && (
                    <p className="text-secondary small mb-0">
                      <strong>Branch:</strong> {invoice.branchInfo.name}
                      {invoice.branchInfo.address ? ` - ${invoice.branchInfo.address}` : ''}
                    </p>
                  )}
                </div>
                <div className="text-end">
                  <span className="badge bg-primary-subtle text-primary fs-6 px-3 py-2 rounded-pill">
                    TAX INVOICE
                  </span>
                  <div className="mt-2 text-muted small">
                    <strong>Invoice #:</strong> {invoice.invoiceNumber}
                  </div>
                  <div className="text-muted small">
                    <strong>Date:</strong> {new Date(invoice.createdAt || Date.now()).toLocaleDateString()}
                  </div>
                  {invoice.deliveryStatus && (
                    <div className="mt-1 small">
                      {renderDeliveryBadge()}
                    </div>
                  )}
                </div>
              </div>

              {/* Customer & Billing Meta */}
              <div className="row g-3 small mb-4 bg-light p-3 rounded-2">
                <div className="col-sm-6">
                  <div className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.72rem' }}>Billed To:</div>
                  <div className="fw-bold fs-6">{invoice.customerInfo?.name || 'Walk-in Customer'}</div>
                  <div>Phone: {invoice.customerInfo?.phone || 'N/A'}</div>
                  {invoice.customerInfo?.email && <div>Email: {invoice.customerInfo.email}</div>}
                </div>
                <div className="col-sm-6 text-sm-end">
                  <div className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.72rem' }}>Payment Details:</div>
                  <div><strong>Method:</strong> {invoice.paymentMethod}</div>
                  <div>
                    <strong>Status:</strong>{' '}
                    <span className={`badge ${invoice.paymentStatus === 'PAID' ? 'bg-success' : 'bg-warning text-dark'}`}>
                      {invoice.paymentStatus || 'UNKNOWN'}
                    </span>
                  </div>
                  {(invoice.staffInfo?.fullName || invoice.staffId?.fullName) && (
                    <div><strong>Staff:</strong> {invoice.staffInfo?.fullName || invoice.staffId.fullName}</div>
                  )}
                  {invoice.staffInfo?.staffId && <div><strong>Staff ID:</strong> {invoice.staffInfo.staffId}</div>}
                  {invoice.paymentDetails?.amountReceived !== undefined && (
                    <div><strong>Cash received:</strong> ₹{Number(invoice.paymentDetails.amountReceived).toFixed(2)}</div>
                  )}
                  {invoice.paymentDetails?.changeDue !== undefined && (
                    <div><strong>Change returned:</strong> ₹{Number(invoice.paymentDetails.changeDue).toFixed(2)}</div>
                  )}
                  {invoice.paymentDetails?.transactionRef && (
                    <div className="text-muted font-monospace small"><strong>UTR / Ref:</strong> {invoice.paymentDetails.transactionRef}</div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="table-responsive mb-4">
                <table className="table table-sm table-striped align-middle text-dark">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '5%' }}>#</th>
                      <th style={{ width: '45%' }}>Item Description</th>
                      <th className="text-center" style={{ width: '10%' }}>Qty</th>
                      <th className="text-end" style={{ width: '15%' }}>Price</th>
                      <th className="text-end" style={{ width: '10%' }}>GST</th>
                      <th className="text-end" style={{ width: '15%' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.items || []).map((item, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>
                          <div className="fw-semibold">{item.productName}</div>
                          <small className="text-muted">SKU: {item.sku || 'N/A'}{item.barcode ? ` | Barcode: ${item.barcode}` : ''}</small>
                        </td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-end">₹{Number(item.unitPrice || 0).toFixed(2)}</td>
                        <td className="text-end">{Number(item.gstPercent || 0)}%</td>
                        <td className="text-end fw-bold">₹{Number(item.totalAmount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Invoice Calculations */}
              <div className="row justify-content-end mb-4">
                <div className="col-md-5 col-sm-7">
                  <div className="d-flex justify-content-between py-1 border-bottom small">
                    <span className="text-muted">Subtotal:</span>
                    <span className="fw-semibold">₹{(invoice.subtotal || 0).toFixed(2)}</span>
                  </div>
                  {invoice.totalDiscount > 0 && (
                    <div className="d-flex justify-content-between py-1 border-bottom small text-success">
                      <span>Discount:</span>
                      <span>-₹{(invoice.totalDiscount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between py-1 border-bottom small">
                    <span className="text-muted">CGST:</span>
                    <span>₹{(invoice.cgstAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom small">
                    <span className="text-muted">SGST:</span>
                    <span>₹{(invoice.sgstAmount || 0).toFixed(2)}</span>
                  </div>
                  {invoice.deliveryCharge > 0 && (
                    <div className="d-flex justify-content-between py-1 border-bottom small">
                      <span className="text-muted">Delivery:</span>
                      <span>₹{invoice.deliveryCharge.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between py-2 border-top fs-5 fw-bold text-primary">
                    <span>Grand Total:</span>
                    <span>₹{(invoice.grandTotal || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Barcode & Footer terms */}
              <div className="text-center pt-3 border-top">
                <BarcodeVisual value={invoice.barcode || invoice.invoiceNumber} height={36} displayValue={false} />
                <div className="small text-muted">{invoice.invoiceNumber}</div>
                <p className="small text-secondary mt-2 mb-0">
                  Thank you for your purchase.
                </p>
              </div>
            </div>
          </div>

          <div className="modal-footer border-0 py-3 px-4 d-flex justify-content-between" style={{ backgroundColor: '#10243D', borderTop: '1px solid #293D58' }}>
            <button type="button" className="btn btn-outline-secondary" onClick={onClose} style={{ borderColor: '#3b567d', color: '#DCEBFF' }}>
              Close
            </button>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-outline-primary" onClick={handleDownloadPdf} style={{ borderColor: '#3b82f6', color: '#60a5fa' }}>
                <i className="bi bi-file-earmark-pdf me-1"></i> Download PDF
              </button>
              <button type="button" className="btn btn-primary" onClick={handlePrint} style={{ backgroundColor: '#2563EB', borderColor: '#60a5fa' }}>
                <i className="bi bi-printer me-1"></i> Print Bill
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePrintModal;
