import React from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const InvoicePrintModal = ({ invoice, onClose }) => {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text(invoice.shopInfo?.name || 'SMP', 14, 20);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(invoice.shopInfo?.address || '100 Feet Road, Anna Nagar, Chennai - 600040', 14, 26);
    doc.text(`GSTIN: ${invoice.shopInfo?.gstNumber || '33AAAAA0000A1Z5'} | Phone: ${invoice.shopInfo?.phone || '+91 98400 12345'}`, 14, 31);

    doc.setDrawColor(200);
    doc.line(14, 35, 196, 35);

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
    doc.text(`Staff: ${invoice.staffId?.fullName || invoice.staffId || 'Counter 1'}`, 120, 62);

    // Table
    const tableRows = (invoice.items || []).map((item, idx) => [
      idx + 1,
      `${item.productName} (${item.size || 'Std'}, ${item.colour || 'Def'})`,
      item.quantity,
      `₹${item.unitPrice.toFixed(2)}`,
      `${item.gstPercent || 5}%`,
      `₹${item.totalAmount.toFixed(2)}`
    ]);

    doc.autoTable({
      startY: 68,
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

    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.text(`Grand Total: ₹${(invoice.grandTotal || 0).toFixed(2)}`, 140, finalY + 26);

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Thank you for shopping with SMP! Exchange within 7 days with bill.', 14, finalY + 36);

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
                    {invoice.shopInfo?.name || 'SMP'}
                  </h3>
                  <p className="text-secondary small mb-1">
                    {invoice.shopInfo?.address || '100 Feet Road, Anna Nagar, Chennai - 600040'}
                  </p>
                  <p className="text-secondary small mb-0">
                    <strong>GSTIN:</strong> {invoice.shopInfo?.gstNumber || '33AAAAA0000A1Z5'} | <strong>Phone:</strong> {invoice.shopInfo?.phone || '+91 98400 12345'}
                  </p>
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
                  <div><strong>Status:</strong> <span className="badge bg-success">{invoice.paymentStatus}</span></div>
                  <div><strong>Staff / Terminal:</strong> {invoice.staffId?.fullName || invoice.staffId?.staffId || 'Counter 1'}</div>
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
                          <small className="text-muted">Size: {item.size || 'Std'} | Color: {item.colour || 'Def'} | SKU: {item.sku || 'N/A'}</small>
                        </td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-end">₹{item.unitPrice.toFixed(2)}</td>
                        <td className="text-end">{item.gstPercent || 5}%</td>
                        <td className="text-end fw-bold">₹{item.totalAmount.toFixed(2)}</td>
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
                    <span className="text-muted">CGST (2.5%):</span>
                    <span>₹{(invoice.cgstAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom small">
                    <span className="text-muted">SGST (2.5%):</span>
                    <span>₹{(invoice.sgstAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between py-2 border-top fs-5 fw-bold text-primary">
                    <span>Grand Total:</span>
                    <span>₹{(invoice.grandTotal || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Barcode & Footer terms */}
              <div className="text-center pt-3 border-top">
                <div className="brand-font fw-bold letter-spacing-1 text-muted small mb-1">
                  ||||| | |||| ||| |||||| | ||||| |||||||
                </div>
                <div className="small text-muted">{invoice.invoiceNumber}</div>
                <p className="small text-secondary mt-2 mb-0">
                  Thank you for shopping at SMP! Exchanges allowed within 7 days along with this bill.
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
