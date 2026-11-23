import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

const BarcodeVisual = ({
  value,
  format = 'CODE128',
  width = 1.5,
  height = 40,
  displayValue = true,
  fontSize = 11,
  className = ''
}) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, String(value), {
          format: format === 'UPCA' ? 'UPC' : (format || 'CODE128'),
          width,
          height,
          displayValue,
          fontSize,
          background: '#ffffff',
          lineColor: '#000000',
          margin: 4
        });
      } catch (err) {
        console.warn('Barcode rendering error for value:', value, err);
      }
    }
  }, [value, format, width, height, displayValue, fontSize]);

  if (!value) {
    return <span className="text-muted small fst-italic">Not Assigned</span>;
  }

  return (
    <div
      className={`d-inline-flex bg-white rounded p-1 shadow-sm ${className}`}
      style={{ border: '1px solid #cbd5e1' }}
    >
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default BarcodeVisual;
