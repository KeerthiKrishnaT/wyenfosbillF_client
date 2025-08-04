import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './PurchasingAdminPanel.css';

const AddPriceList = () => {
  const [validFrom, setValidFrom] = useState('');
  const [products, setProducts] = useState([
    { itemName: '', itemId: '', mrp: '', dp: '', sp: '', qty: '', profitPerPc: '', totalProfit: '' }
  ]);
  const navigate = useNavigate();

  const handleChange = (index, field, value) => {
    const updated = [...products];
    updated[index][field] = value;

    if (field === 'profitPerPc' || field === 'qty') {
      const profit = parseFloat(updated[index].profitPerPc || 0);
      const qty = parseInt(updated[index].qty || 0);
      updated[index].totalProfit = (profit * qty).toFixed(2);
    }

    setProducts(updated);
  };

  const handleAddRow = () => {
    setProducts([...products, { itemName: '', itemId: '', mrp: '', dp: '', sp: '', qty: '', profitPerPc: '', totalProfit: '' }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const response = await fetch('http://localhost:5000/api/price-lists', {
        method: 'POST',
        headers,
        body: JSON.stringify({ validFrom, products }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to save');

      alert('Price List Saved Successfully!');
      navigate('/price-lists');
    } catch (err) {
      console.error('Submit Error:', err);
      alert(err.message || 'Something went wrong');
    }
  };

  return (
    <div className="price-list-container">
      <h2>WYENFOS PRICE LIST</h2>
      <label>
        Valid from:
        <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} />
      </label>
      <form onSubmit={handleSubmit}>
        <table>
          <thead>
            <tr>
              <th>NO</th>
              <th>ITEM NAME</th>
              <th>ITEM ID</th>
              <th>MRP</th>
              <th>DP /PCS</th>
              <th>SP</th>
              <th>QTY</th>
              <th>PROFIT /PCS</th>
              <th>TOTAL PROFIT</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td><input value={p.itemName} onChange={e => handleChange(i, 'itemName', e.target.value)} /></td>
                <td><input value={p.itemId} onChange={e => handleChange(i, 'itemId', e.target.value)} /></td>
                <td><input value={p.mrp} onChange={e => handleChange(i, 'mrp', e.target.value)} /></td>
                <td><input value={p.dp} onChange={e => handleChange(i, 'dp', e.target.value)} /></td>
                <td><input value={p.sp} onChange={e => handleChange(i, 'sp', e.target.value)} /></td>
                <td><input value={p.qty} onChange={e => handleChange(i, 'qty', e.target.value)} /></td>
                <td><input value={p.profitPerPc} onChange={e => handleChange(i, 'profitPerPc', e.target.value)} /></td>
                <td>{p.totalProfit}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="button-group">
          <button type="button" className="back-button" onClick={() => navigate('/price-lists')}>Back</button>
          <button type="button" onClick={handleAddRow}>Add Row</button>
          <button type="submit">Save Price List</button>
        </div>
      </form>
    </div>
  );
};

export default AddPriceList;