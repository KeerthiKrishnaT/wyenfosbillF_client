import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchProducts();
  }, [userId]);

 const fetchProducts = async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem('token');
    const url = userId
      ? `http://localhost:5000/api/products/by-creator/${userId}`
      : 'http://localhost:5000/api/products';
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const fetchedProducts = res.data;
    console.log('Fetched products:', fetchedProducts); 
    const validProducts = fetchedProducts.filter(product => product._id && Object.keys(product).length > 1);
    if (validProducts.length !== fetchedProducts.length) {
      console.warn('Some products were filtered out due to missing _id or data:', fetchedProducts);
    }
    setProducts(validProducts);
    setLoading(false);
  } catch (err) {
    console.error('Fetch error:', err.response?.data || err);
    setError('Error fetching products.');
    setLoading(false);
  }
};

const handleEditClick = (index) => {
  const product = products[index];
  console.log('Editing product:', product); 
  if (!product || !product._id) {
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
    if (!editedProduct._id) {
      alert('Error: Product ID is missing.');
      console.error('Missing _id in editedProduct:', editedProduct);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `http://localhost:5000/api/products/${editedProduct._id}`,
        editedProduct,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = [...products];
      updated[editIndex] = res.data;
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
              <tr key={product._id} className="product-row">
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