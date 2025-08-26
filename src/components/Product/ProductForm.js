import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './Products.css';
import {
  TextField,
  MenuItem,
  Select,
  FormControl,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';

const ProductForm = ({ onSubmitSuccess, onCancel }) => {
  const departments = ['General', 'Purchase', 'Sales', 'Storage', 'Electronics', 'Clothing'];

  const [productRows, setProductRows] = useState([
    { itemCode: '', itemName: '', hsn: '', gst: '', unitPrice: '', quantity: '', department: 'General' },
  ]);
  const [loading, setLoading] = useState(false);

  const handleChange = (index, e) => {
    const { name, value } = e.target;
    setProductRows(rows => {
      const updated = [...rows];
      updated[index][name] = ['gst', 'unitPrice', 'quantity'].includes(name) ? Number(value) || 0 : value;
      return updated;
    });
  };

  const handleAddRow = () => {
    setProductRows(rows => [
      ...rows,
      { itemCode: '', itemName: '', hsn: '', gst: '', unitPrice: '', quantity: '', department: 'General' },
    ]);
  };

  const validate = () => {
    return productRows.every(r =>
      r.itemCode.trim() &&
      r.itemName.trim() &&
      r.hsn.trim() &&
      !isNaN(parseFloat(r.gst)) && parseFloat(r.gst) >= 0 &&
      !isNaN(parseFloat(r.unitPrice)) && parseFloat(r.unitPrice) > 0 &&
      !isNaN(parseInt(r.quantity)) && parseInt(r.quantity) >= 0
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      alert('Please fill all fields correctly before saving.');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      

      
      if (!token) {
        alert('No authentication token found. Please log in.');
        setLoading(false);
        return;
      }
      
      const res = await axios.post('http://localhost:5000/api/bulk',
        { products: productRows },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setLoading(false);
      

      alert('Products added successfully!');
      if (typeof onSubmitSuccess === 'function') {
        onSubmitSuccess(res.data.products);
      }
      setProductRows([
        { itemCode: '', itemName: '', hsn: '', gst: '', unitPrice: '', quantity: '', department: 'General' }
      ]);
    } catch (err) {
      setLoading(false);
      console.error('Error adding products:', err);

      
      if (err.response?.status === 401) {
        alert('Authentication failed. Please log in again.');
      } else if (err.response?.status === 403) {
        alert('Access denied. You do not have permission to add products.');
      } else {
        const msg = err.response?.data?.error || err.message;
        alert(`Error: ${msg} (Status: ${err.response?.status || 'Unknown'})`);
      }
    }
  };

  return (
    <div className="product-table-container">
      <form onSubmit={handleSubmit}>
        <table className="product-input-table">
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>HSN</th>
              <th>GST (%)</th>
              <th>Unit Price</th>
              <th>Quantity</th>
              <th>Department</th>
            </tr>
          </thead>
          <tbody>
            {productRows.map((row, idx) => (
              <tr key={idx}>
                <td><TextField name="itemCode" value={row.itemCode} onChange={e => handleChange(idx, e)} size="small" required /></td>
                <td><TextField name="itemName" value={row.itemName} onChange={e => handleChange(idx, e)} size="small" required /></td>
                <td><TextField name="hsn" value={row.hsn} onChange={e => handleChange(idx, e)} size="small" required /></td>
                <td><TextField name="gst" type="number" inputProps={{ min: 0 }} value={row.gst} onChange={e => handleChange(idx, e)} size="small" required /></td>
                <td><TextField name="unitPrice" type="number" inputProps={{ min: 0 }} value={row.unitPrice} onChange={e => handleChange(idx, e)} size="small" required /></td>
                <td><TextField name="quantity" type="number" inputProps={{ min: 0 }} value={row.quantity} onChange={e => handleChange(idx, e)} size="small" required /></td>
                <td>
                  <FormControl fullWidth size="small">
                    <Select name="department" value={row.department} onChange={e => handleChange(idx, e)}>
                      {departments.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                    </Select>
                  </FormControl>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="product-table-actions">
          <button type="button" className="btn btn-outlined" onClick={onCancel} disabled={loading}>Cancel</button>
          <button type="submit" className="btn btn-primaryy" disabled={loading}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Save'}
          </button>
          <button type="button" className="btn btn-add" onClick={handleAddRow} disabled={loading}>Add Product</button>
        </div>
      </form>
    </div>
  );
};

ProductForm.propTypes = {
  onSubmitSuccess: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default ProductForm;