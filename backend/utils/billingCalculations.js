const roundCurrency = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const invalidInput = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
};

const calculatePosBill = ({
  items,
  productsById,
  discountType = 'flat',
  discountValue = 0,
  deliveryCharge = 0,
  gstEnabled = true
}) => {
  if (!Array.isArray(items) || items.length === 0) {
    invalidInput('Please add at least one product to the bill.');
  }

  const lines = items.map((item) => {
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      invalidInput('Each product quantity must be a positive whole number.');
    }

    const product = productsById.get(String(item.productId));
    if (!product) {
      const error = new Error('One or more selected products are unavailable in this shop.');
      error.statusCode = 404;
      throw error;
    }

    const unitPrice = Number(product.sellingPrice);
    const gstPercent = gstEnabled ? Number(product.gstPercent) : 0;
    const costPrice = Number(product.costPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      invalidInput(`Product "${product.name}" has an invalid saved selling price.`);
    }
    if (!Number.isFinite(costPrice) || costPrice < 0) {
      invalidInput(`Product "${product.name}" has an invalid saved cost price.`);
    }
    if (!Number.isFinite(gstPercent) || gstPercent < 0 || gstPercent > 100) {
      invalidInput(`Product "${product.name}" has an invalid saved GST rate.`);
    }

    return {
      product,
      quantity,
      unitPrice,
      costPrice,
      gstPercent,
      baseAmount: unitPrice * quantity
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.baseAmount, 0);
  const value = Number(discountValue);
  const kind = String(discountType).toLowerCase();
  if (!Number.isFinite(value) || value < 0 || !['flat', 'percent'].includes(kind)) {
    invalidInput('Discount type or amount is invalid.');
  }
  if (kind === 'percent' && value > 100) {
    invalidInput('Percentage discount cannot exceed 100%.');
  }
  if (kind === 'flat' && value > subtotal) {
    invalidInput('Flat discount cannot exceed the product subtotal.');
  }

  const overallDiscount = roundCurrency(
    kind === 'percent' ? subtotal * value / 100 : value
  );
  const subtotalCents = lines.reduce((sum, line) => sum + Math.round(line.baseAmount * 100), 0);
  const discountCents = Math.round(overallDiscount * 100);
  const discountAllocations = lines.map((line, index) => {
    const exactCents = subtotalCents > 0
      ? discountCents * Math.round(line.baseAmount * 100) / subtotalCents
      : 0;
    const allocatedCents = Math.min(Math.floor(exactCents), Math.round(line.baseAmount * 100));
    return {
      index,
      cents: allocatedCents,
      remainder: exactCents - allocatedCents
    };
  });
  let remainingDiscountCents = discountCents -
    discountAllocations.reduce((sum, allocation) => sum + allocation.cents, 0);
  const allocationPriority = [...discountAllocations]
    .sort((left, right) => right.remainder - left.remainder);
  for (const allocation of allocationPriority) {
    if (remainingDiscountCents <= 0) break;
    const maxCents = Math.round(lines[allocation.index].baseAmount * 100);
    if (discountAllocations[allocation.index].cents < maxCents) {
      discountAllocations[allocation.index].cents += 1;
      remainingDiscountCents -= 1;
    }
  }
  if (remainingDiscountCents > 0) {
    invalidInput('Discount could not be allocated across the selected products.');
  }

  let totalGst = 0;
  let totalCost = 0;
  const billItems = lines.map((line, index) => {
    const lineDiscount = discountAllocations[index].cents / 100;
    const taxableAmount = Math.max(0, line.baseAmount - lineDiscount);
    const lineGst = taxableAmount * line.gstPercent / 100;
    const totalAmount = roundCurrency(taxableAmount + lineGst);
    totalGst += lineGst;
    totalCost += line.costPrice * line.quantity;

    return {
      productId: line.product._id,
      productName: line.product.name,
      sku: line.product.sku,
      barcode: line.product.barcode,
      size: line.product.sizes?.[0] || '',
      colour: line.product.colours?.[0] || '',
      quantity: line.quantity,
      costPrice: line.costPrice,
      unitPrice: line.unitPrice,
      discountAmount: lineDiscount,
      gstPercent: line.gstPercent,
      gstAmount: roundCurrency(lineGst),
      totalAmount
    };
  });

  const roundedSubtotal = roundCurrency(subtotal);
  const roundedGst = roundCurrency(totalGst);
  const delivery = Number(deliveryCharge);
  if (!Number.isFinite(delivery) || delivery < 0) {
    invalidInput('Delivery charge is invalid.');
  }
  const cgstAmount = roundCurrency(roundedGst / 2);
  const sgstAmount = roundCurrency(roundedGst - cgstAmount);

  return {
    billItems,
    subtotal: roundedSubtotal,
    totalDiscount: overallDiscount,
    totalGst: roundedGst,
    cgstAmount,
    sgstAmount,
    totalCost: roundCurrency(totalCost),
    deliveryCharge: roundCurrency(delivery),
    grandTotal: roundCurrency(roundedSubtotal - overallDiscount + roundedGst + delivery)
  };
};

module.exports = { calculatePosBill, roundCurrency };
