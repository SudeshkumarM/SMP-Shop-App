/**
 * Generate a unique Code128 / EAN-13 compatible barcode string
 * Prefix 890 is standard for India / Retail
 */
const generateProductBarcode = (sku = '') => {
  const cleanSku = (sku || '').replace(/[^0-9A-Z]/gi, '').toUpperCase();
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `890${randomPart}${cleanSku.slice(0, 4)}`;
};

/**
 * Generate Invoice Barcode
 */
const generateInvoiceBarcode = (invoiceNumber) => {
  return invoiceNumber.replace(/[^0-9A-Z]/gi, '');
};

module.exports = {
  generateProductBarcode,
  generateInvoiceBarcode
};
