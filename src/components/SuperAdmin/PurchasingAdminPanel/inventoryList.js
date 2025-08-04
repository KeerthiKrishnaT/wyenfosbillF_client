import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const InventoryPanel = () => {
  const [lowStockItems, setLowStockItems] = useState({ levelOne: [], levelTwo: [], noStock: [] });
  const [restockForm, setRestockForm] = useState({
    itemCode: '',
    itemName: '',
    quantity: '',
    unitPrice: '',
    gst: '',
  });
  const navigate = useNavigate();

  const fetchLowStockAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/inventory/alerts?threshold=5', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setLowStockItems({
        levelOne: res.data.levelOne || [],
        levelTwo: res.data.levelTwo || [],
        noStock: res.data.noStock || []
      });
    } catch (err) {
      console.error('Error fetching low stock items:', err);
    }
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/inventory/restock', restockForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Inventory restocked successfully!');
      setRestockForm({ itemCode: '', itemName: '', quantity: '', unitPrice: '', gst: '' });
      fetchLowStockAlerts();
    } catch (err) {
      console.error('Error restocking:', err);
      alert('Error restocking inventory');
    }
  };

  useEffect(() => {
    fetchLowStockAlerts();
  }, []);

  const prefillRestockForm = (product) => {
    setRestockForm({
      itemCode: product.itemCode,
      itemName: product.itemName,
      quantity: '',
      unitPrice: '',
      gst: product.gst || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="inventory-panel">
      <button className="bck-button" onClick={() => navigate(-1)}>← Back</button>
      <h2>📦 Inventory Management</h2>

      <h3 style={{ textAlign: 'center', marginBlockEnd: '1rem' }}>➕ Restock Inventory</h3>
      <form onSubmit={handleRestockSubmit} className="restock-form">
        <input type="text" placeholder="Item Code" value={restockForm.itemCode} onChange={(e) => setRestockForm({ ...restockForm, itemCode: e.target.value })} required />
        <input type="text" placeholder="Item Name" value={restockForm.itemName} onChange={(e) => setRestockForm({ ...restockForm, itemName: e.target.value })} required />
        <input type="number" placeholder="Quantity" value={restockForm.quantity} onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })} required />
        <input type="number" placeholder="Unit Price" value={restockForm.unitPrice} onChange={(e) => setRestockForm({ ...restockForm, unitPrice: e.target.value })} required />
        <input type="number" placeholder="GST %" value={restockForm.gst} onChange={(e) => setRestockForm({ ...restockForm, gst: e.target.value })} required />
        <button type="submit">Restock</button>
      </form>

      {/* Section: Low Stock Items */}
      <div style={{ marginTop: '2rem' }}>
        <h3>⚠️ Low Stock Items (2-5)</h3>
        {lowStockItems.levelOne.length === 0 ? (
          <p>None</p>
        ) : (
          <table border="1" cellPadding="8">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Name</th>
                <th>Qty</th>
                <th>Price</th>
                <th>GST</th>
                <th>Total Value</th>
                <th>Restock</th>
              </tr>
            </thead>
            <tbody>
              {lowStockItems.levelOne.map(item => (
                <tr key={item._id}>
                  <td>{item.itemCode}</td>
                  <td>{item.itemName}</td>
                  <td style={{ color: item.quantity < 0 ? 'red' : 'black' }}>{item.quantity}</td>
                  <td>{item.unitPrice}</td>
                  <td>{item.gst}%</td>
                  <td>₹{((item.unitPrice * item.quantity * (1 + item.gst / 100)).toFixed(2))}</td>
                  <td><button onClick={() => prefillRestockForm(item)}>Restock</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Section: Critical Stock */}
      <div style={{ marginTop: '2rem' }}>
        <h3>🔴 Critically Low Stock (&lt; 2)</h3>
        {lowStockItems.levelTwo.length === 0 ? (
          <p>None</p>
        ) : (
          <table border="1" cellPadding="8">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Name</th>
                <th>Qty</th>
                <th>Price</th>
                <th>GST</th>
                <th>Total Value</th>
                <th>Restock</th>
              </tr>
            </thead>
            <tbody>
              {lowStockItems.levelTwo.map(item => (
                <tr key={item._id}>
                  <td>{item.itemCode}</td>
                  <td>{item.itemName}</td>
                  <td style={{ color: item.quantity < 0 ? 'red' : 'black' }}>{item.quantity}</td>
                  <td>{item.unitPrice}</td>
                  <td>{item.gst}%</td>
                  <td>₹{((item.unitPrice * item.quantity * (1 + item.gst / 100)).toFixed(2))}</td>
                  <td><button onClick={() => prefillRestockForm(item)}>Restock</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Section: No Stock */}
      <div style={{ marginTop: '2rem' }}>
        <h3>🚫 No Stock Products (Missing Inventory)</h3>
        {lowStockItems.noStock.length === 0 ? (
          <p>All products have inventory records.</p>
        ) : (
          <table border="1" cellPadding="8">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Name</th>
                <th>HSN</th>
                <th>GST</th>
                <th>Restock</th>
              </tr>
            </thead>
            <tbody>
              {lowStockItems.noStock.map(product => (
                <tr key={product._id}>
                  <td>{product.itemCode}</td>
                  <td>{product.itemName}</td>
                  <td>{product.hsn}</td>
                  <td>{product.gst}%</td>
                  <td><button onClick={() => prefillRestockForm(product)}>Restock</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default InventoryPanel;
