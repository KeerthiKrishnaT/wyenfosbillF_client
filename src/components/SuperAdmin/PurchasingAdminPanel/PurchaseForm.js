import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const PurchaseProductList = () => {
  const [products, setProducts] = useState([]);
  const [finalAmount, setFinalAmount] = useState(0);
  const [discount, setDiscount] = useState(0);

  const addRow = () => {
    setProducts(prev => [...prev, {
      itemCode: '',
      itemName: '',
      quantity: 0,
      unitPrice: 0,
      gst: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      totalAmount: 0,
      editable: true
    }]);
  };

  const handleChange = (index, field, value) => {
    const updated = [...products];
    updated[index][field] = field === 'quantity' || field === 'unitPrice' || field === 'gst' ? parseFloat(value) || 0 : value;
    updated[index].totalAmount = (updated[index].quantity * updated[index].unitPrice * (1 + updated[index].gst / 100));
    setProducts(updated);
    recalculateFinalAmount(updated);
  };

  const saveRow = (index) => {
    const updated = [...products];
    updated[index].editable = false;
    setProducts(updated);
  };

  const editRow = (index) => {
    const updated = [...products];
    updated[index].editable = true;
    setProducts(updated);
  };

  const deleteRow = (index) => {
    const updated = products.filter((_, i) => i !== index);
    setProducts(updated);
    recalculateFinalAmount(updated);
  };

  const recalculateFinalAmount = (list) => {
    const total = list.reduce((sum, item) => sum + item.totalAmount, 0);
    setFinalAmount(total - discount);
  };

  const applyDiscount = () => {
    const value = parseFloat(prompt("Enter discount amount:"));
    if (!isNaN(value)) {
      setDiscount(value);
      setFinalAmount(products.reduce((sum, item) => sum + item.totalAmount, 0) - value);
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(products);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchases");
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), 'Purchases.xlsx');
  };

  return (
    <div className="purchase-list">
      <h2>Purchase Product List</h2>
      <button className="btn-3d" onClick={addRow}>Add Product</button>
      <button className="btn-3d" onClick={exportToExcel}>Export to Excel</button>
      <button className="btn-3d" onClick={applyDiscount}>Add Discount</button>

      <table>
        <thead>
          <tr>
            <th>Item Code</th>
            <th>Item Name</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>GST (%)</th>
            <th>Total Amount</th>
            <th>Purchase Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr key={index}>
              <td>{product.editable ? <input value={product.itemCode} onChange={(e) => handleChange(index, 'itemCode', e.target.value)} /> : product.itemCode}</td>
              <td>{product.editable ? <input value={product.itemName} onChange={(e) => handleChange(index, 'itemName', e.target.value)} /> : product.itemName}</td>
              <td>{product.editable ? <input type="number" value={product.quantity} onChange={(e) => handleChange(index, 'quantity', e.target.value)} /> : product.quantity}</td>
              <td>{product.editable ? <input type="number" value={product.unitPrice} onChange={(e) => handleChange(index, 'unitPrice', e.target.value)} /> : `₹${product.unitPrice}`}</td>
              <td>{product.editable ? <input type="number" value={product.gst} onChange={(e) => handleChange(index, 'gst', e.target.value)} /> : `${product.gst}%`}</td>
              <td>₹{product.totalAmount.toFixed(2)}</td>
              <td>{product.editable ? <input type="date" value={product.purchaseDate} onChange={(e) => handleChange(index, 'purchaseDate', e.target.value)} /> : new Date(product.purchaseDate).toLocaleDateString()}</td>
              <td>
                {product.editable ? (
                  <button onClick={() => saveRow(index)} className="btn-3d">Save</button>
                ) : (
                  <>
                    <button onClick={() => editRow(index)} className="btn-3d">Edit</button>
                    <button onClick={() => deleteRow(index)} className="btn-3d">Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="total-summary">
        <p>Total Before Discount: ₹{products.reduce((sum, item) => sum + item.totalAmount, 0).toFixed(2)}</p>
        <p>Discount: ₹{discount.toFixed(2)}</p>
        <h3>Final Amount: ₹{finalAmount.toFixed(2)}</h3>
      </div>
    </div>
  );
};

export default PurchaseProductList;
