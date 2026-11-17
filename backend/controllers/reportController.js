const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Staff = require('../models/Staff');
const Customer = require('../models/Customer');
const Inventory = require('../models/Inventory');
const xlsx = require('xlsx');

/**
 * @desc    Get Sales Report (Daily, Weekly, Monthly, Yearly)
 * @route   GET /api/reports/sales
 * @access  Private (Admin, Owner)
 */
const getSalesReport = async (req, res) => {
  try {
    const { period = 'monthly', startDate, endDate, shopId } = req.query;
    const filter = { paymentStatus: { $in: ['PAID', 'PENDING'] } };

    if (shopId || req.user.shopId) {
      filter.shopId = shopId || req.user.shopId;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const orders = await Order.find(filter).sort({ createdAt: 1 });

    const groupedData = {};
    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalGst = 0;
    let totalOrders = orders.length;

    orders.forEach(order => {
      totalRevenue += order.grandTotal || 0;
      totalDiscount += order.totalDiscount || 0;
      totalGst += order.totalGst || 0;

      let key;
      const date = new Date(order.createdAt);
      if (period === 'daily') {
        key = date.toISOString().slice(0, 10);
      } else if (period === 'weekly') {
        // Group by week start
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        key = `Week of ${d.toISOString().slice(0, 10)}`;
      } else if (period === 'yearly') {
        key = `${date.getFullYear()}`;
      } else {
        // monthly
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!groupedData[key]) {
        groupedData[key] = {
          period: key,
          ordersCount: 0,
          revenue: 0,
          discount: 0,
          gst: 0
        };
      }

      groupedData[key].ordersCount += 1;
      groupedData[key].revenue += order.grandTotal;
      groupedData[key].discount += order.totalDiscount || 0;
      groupedData[key].gst += order.totalGst || 0;
    });

    const reportRows = Object.values(groupedData).map(row => ({
      ...row,
      revenue: Math.round(row.revenue * 100) / 100,
      discount: Math.round(row.discount * 100) / 100,
      gst: Math.round(row.gst * 100) / 100
    }));

    res.status(200).json({
      success: true,
      period,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalGst: Math.round(totalGst * 100) / 100,
        averageOrderValue: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0
      },
      report: reportRows
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Product Sales Report
 * @route   GET /api/reports/products
 * @access  Private (Admin, Owner)
 */
const getProductSalesReport = async (req, res) => {
  try {
    const shopId = req.user.shopId || req.query.shopId;
    const filter = shopId ? { shopId } : {};

    const orders = await Order.find(filter);
    const productStats = {};

    orders.forEach(order => {
      order.items.forEach(item => {
        const pId = item.productId ? item.productId.toString() : item.productName;
        if (!productStats[pId]) {
          productStats[pId] = {
            productId: pId,
            productName: item.productName,
            sku: item.sku,
            unitsSold: 0,
            revenue: 0,
            cost: 0,
            grossProfit: 0
          };
        }

        const rev = item.totalAmount || 0;
        const cst = (item.costPrice || 0) * item.quantity;
        productStats[pId].unitsSold += item.quantity;
        productStats[pId].revenue += rev;
        productStats[pId].cost += cst;
        productStats[pId].grossProfit += (rev - cst);
      });
    });

    const report = Object.values(productStats)
      .map(p => ({
        ...p,
        revenue: Math.round(p.revenue * 100) / 100,
        cost: Math.round(p.cost * 100) / 100,
        grossProfit: Math.round(p.grossProfit * 100) / 100,
        marginPercent: p.revenue > 0 ? Math.round((p.grossProfit / p.revenue) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    res.status(200).json({ success: true, count: report.length, report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Staff Performance Report
 * @route   GET /api/reports/staff
 * @access  Private (Admin, Owner)
 */
const getStaffReport = async (req, res) => {
  try {
    const shopId = req.user.shopId || req.query.shopId;
    const filter = shopId ? { shopId } : {};

    const staffMembers = await Staff.find(filter);
    const invoices = await Invoice.find(filter);

    const report = staffMembers.map(member => {
      const memberInvoices = invoices.filter(inv => inv.staffId && inv.staffId.toString() === member._id.toString());
      const revenue = memberInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

      return {
        staffId: member.staffId,
        fullName: member.fullName,
        department: member.department,
        jobRole: member.jobRole,
        totalBills: memberInvoices.length,
        totalRevenue: Math.round(revenue * 100) / 100,
        averageBillValue: memberInvoices.length > 0 ? Math.round((revenue / memberInvoices.length) * 100) / 100 : 0,
        status: member.isActive ? 'Active' : 'Inactive'
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);

    res.status(200).json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get GST Report
 * @route   GET /api/reports/gst
 * @access  Private (Admin, Owner)
 */
const getGstReport = async (req, res) => {
  try {
    const shopId = req.user.shopId || req.query.shopId;
    const { startDate, endDate } = req.query;

    const filter = {};
    if (shopId) filter.shopId = shopId;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const invoices = await Invoice.find(filter);

    let totalTaxableTurnover = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalTax = 0;

    const rateBuckets = {
      '5%': { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 },
      '12%': { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 },
      '18%': { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 }
    };

    invoices.forEach(inv => {
      totalTaxableTurnover += (inv.subtotal - inv.totalDiscount);
      totalCgst += inv.cgstAmount || 0;
      totalSgst += inv.sgstAmount || 0;
      totalIgst += inv.igstAmount || 0;

      // Group items by GST %
      inv.items.forEach(item => {
        const rateKey = `${item.gstPercent || 5}%`;
        if (!rateBuckets[rateKey]) {
          rateBuckets[rateKey] = { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 };
        }
        const itemTaxable = (item.unitPrice * item.quantity) - (item.discountAmount || 0);
        const itemTax = item.gstAmount || 0;
        rateBuckets[rateKey].taxable += itemTaxable;
        rateBuckets[rateKey].cgst += itemTax / 2;
        rateBuckets[rateKey].sgst += itemTax / 2;
        rateBuckets[rateKey].totalTax += itemTax;
      });
    });

    totalTax = totalCgst + totalSgst + totalIgst;

    res.status(200).json({
      success: true,
      summary: {
        totalTaxableTurnover: Math.round(totalTaxableTurnover * 100) / 100,
        totalCgst: Math.round(totalCgst * 100) / 100,
        totalSgst: Math.round(totalSgst * 100) / 100,
        totalIgst: Math.round(totalIgst * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        invoicesCount: invoices.length
      },
      rateBuckets
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Inventory Valuation Report
 * @route   GET /api/reports/inventory
 * @access  Private (Admin, Owner)
 */
const getInventoryReport = async (req, res) => {
  try {
    const shopId = req.user.shopId || req.query.shopId;
    const filter = { isActive: true };
    if (shopId) filter.shopId = shopId;

    const products = await Product.find(filter).populate('category', 'name');

    let totalQuantity = 0;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;
    let lowStockCount = 0;

    const items = products.map(p => {
      const qty = p.availableQuantity || 0;
      const costVal = qty * (p.costPrice || 0);
      const retailVal = qty * (p.sellingPrice || 0);

      totalQuantity += qty;
      totalCostValuation += costVal;
      totalRetailValuation += retailVal;
      if (qty <= (p.lowStockThreshold || 5)) lowStockCount++;

      return {
        id: p._id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        category: p.category ? p.category.name : '',
        stock: qty,
        unitCost: p.costPrice,
        unitPrice: p.sellingPrice,
        costValuation: Math.round(costVal * 100) / 100,
        retailValuation: Math.round(retailVal * 100) / 100,
        potentialProfit: Math.round((retailVal - costVal) * 100) / 100
      };
    });

    res.status(200).json({
      success: true,
      summary: {
        totalProducts: products.length,
        totalStockUnits: totalQuantity,
        totalCostValuation: Math.round(totalCostValuation * 100) / 100,
        totalRetailValuation: Math.round(totalRetailValuation * 100) / 100,
        potentialGrossProfit: Math.round((totalRetailValuation - totalCostValuation) * 100) / 100,
        lowStockCount
      },
      items
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Export any report to Excel
 * @route   POST /api/reports/export-excel
 * @access  Private (Admin, Owner)
 */
const exportReportExcel = async (req, res) => {
  try {
    const { title = 'SMP_Report', data = [] } = req.body;

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ success: false, message: 'No data to export' });
    }

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Report');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSalesReport,
  getProductSalesReport,
  getStaffReport,
  getGstReport,
  getInventoryReport,
  exportReportExcel
};
