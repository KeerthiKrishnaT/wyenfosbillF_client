import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Products.css';

const ProductList = ({ userId }) => {
  const [products, setProducts] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [editedProduct, setEditedProduct] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');

  const navigate = useNavigate();

  // Debug function to check authentication
  const checkAuth = () => {
    const token = localStorage.getItem('token');
    return !!token;
  };

 const fetchProducts = useCallback(async () => {
  try {
    setLoading(true);
    
    // Check authentication first
    const auth = checkAuth();
    if (!auth) {
      setError('No authentication token found. Please log in.');
      setLoading(false);
      return;
    }
    
    const url = userId
      ? `http://localhost:5000/api/products/by-creator/${userId}`
      : 'http://localhost:5000/api/products';

    
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    const fetchedProducts = res.data;
    // Check if the response is an array or has a data property
    const productsArray = Array.isArray(fetchedProducts) ? fetchedProducts : (fetchedProducts.data || fetchedProducts);
    
    const validProducts = productsArray.filter(product => product.id && Object.keys(product).length > 1);
    if (validProducts.length !== productsArray.length) {
      console.warn('Some products were filtered out due to missing id or data');
    }
    setProducts(validProducts);
    setLoading(false);
  } catch (err) {
    console.error('Fetch error:', err.response?.data || err);
    console.error('Error status:', err.response?.status);
    console.error('Error headers:', err.response?.headers);
    
    if (err.response?.status === 401) {
      setError('Authentication failed. Please log in again.');
    } else if (err.response?.status === 403) {
      setError('Access denied. You do not have permission to view products.');
    } else {
      setError('Error fetching products: ' + (err.response?.data?.error || err.message));
    }
    setLoading(false);
  }
}, [userId]);

useEffect(() => {
  fetchProducts();
}, [fetchProducts]);

const handleEditClick = (index) => {
  const product = products[index];
  if (!product || !product.id) {
    alert('Error: Cannot edit product with missing or invalid ID.');
    return;
  }
  setEditIndex(index);
  setEditedProduct({ ...product });
};

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedProduct({
      ...editedProduct,
      [name]: ['gst', 'unitPrice', 'quantity'].includes(name) ? Number(value) || 0 : value,
    });
  };

  const handleSave = async () => {
    if (!editedProduct.id) {
      alert('Error: Product ID is missing.');
      console.error('Missing id in editedProduct:', editedProduct);
      return;
    }
    try {
      const token = localStorage.getItem('token');

      
      await axios.put(
        `http://localhost:5000/api/products/${editedProduct.id}`,
        editedProduct,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      

      
      // Update the product in the list with the edited data
      const updated = [...products];
      const updatedProduct = {
        ...editedProduct,
        // Ensure all required fields are present
        itemCode: editedProduct.itemCode || '',
        itemName: editedProduct.itemName || '',
        hsn: editedProduct.hsn || '',
        gst: editedProduct.gst || 0,
        unitPrice: editedProduct.unitPrice || 0,
        quantity: editedProduct.quantity || 0
      };
      

      updated[editIndex] = updatedProduct;
      setProducts(updated);
      setEditIndex(null);
      setSaveMessage('Product updated successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error('Update error:', err.response?.data || err);
      alert('Error updating product: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  const handleCancel = () => {
    setEditIndex(null);
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="product-list">
      <div className="product-list-header">
        <button onClick={handleBack} className="black-button"> Back</button>
        <h2>{userId ? 'Products Added by Purchase Admin' : 'All Products'}</h2>
        {saveMessage && <div className="success-message">{saveMessage}</div>}
      </div>
      
      <table className="product-list-table">
        <thead>
          <tr>
            <th>Item Code</th>
            <th>Item Name</th>
            <th>HSN</th>
            <th>GST</th>
            <th>Price</th>
            <th>Qty</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan="7">No products found.</td>
            </tr>
          ) : (
            products.map((product, idx) => (
              <tr key={product.id} className="product-row">
                {editIndex === idx ? (
                  <>
                    <td><input name="itemCode" value={editedProduct.itemCode ?? ''} onChange={handleChange} /></td>
                    <td><input name="itemName" value={editedProduct.itemName ?? ''} onChange={handleChange} /></td>
                    <td><input name="hsn" value={editedProduct.hsn ?? ''} onChange={handleChange} /></td>
                    <td><input name="gst" value={editedProduct.gst ?? ''} type="number" onChange={handleChange} /></td>
                    <td><input name="unitPrice" value={editedProduct.unitPrice ?? ''} type="number" onChange={handleChange} /></td>
                    <td><input name="quantity" value={editedProduct.quantity ?? ''} type="number" onChange={handleChange} /></td>
                    <td>
                      <button onClick={handleSave}>Save</button>
                      <button onClick={handleCancel}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{product.itemCode || 'N/A'}</td>
                    <td>{product.itemName || 'N/A'}</td>
                    <td>{product.hsn || 'N/A'}</td>
                    <td>{product.gst != null ? product.gst : 'N/A'}</td>
                    <td>
                      {product.unitPrice != null
                        ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(product.unitPrice)
                        : 'N/A'}
                    </td>
                    <td>{product.quantity != null ? product.quantity : 'N/A'}</td>
                    <td>
                      <button onClick={() => handleEditClick(idx)}>Edit</button>
                    </td>
                  </>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProductList;