import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './ProductSelector.css';

const ProductSelector = ({ 
  value, 
  onChange, 
  onProductSelect, 
  placeholder = "Search products...",
  disabled = false,
  showEditMode = true, // New prop to control edit mode visibility
  showFieldEditors = false // New prop to show individual field editors
}) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false); // New state for edit mode
  const [showFieldEditorsMode, setShowFieldEditorsMode] = useState(false); // New state for field editors
  const dropdownRef = useRef(null);

  // Fetch products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/products', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const productsData = Array.isArray(response.data) ? response.data : (response.data.data || []);
        setProducts(productsData);
        setFilteredProducts(productsData);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Sync searchTerm with value prop
  useEffect(() => {
    if (value && value !== searchTerm) {
      setSearchTerm(value);
    }
  }, [value, searchTerm]);

  // Filter products based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => 
        product.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.itemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.hsn?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    
    // If in edit mode, don't open dropdown
    if (!editMode) {
      setIsOpen(true);
    }
  };

  const handleProductSelect = (product) => {
    setSearchTerm(product.itemName);
    onChange(product.itemName);
    setIsOpen(false);
    
    // Call the onProductSelect callback with the selected product
    if (onProductSelect) {
      onProductSelect(product);
    }
  };

  const handleInputFocus = () => {
    if (!editMode) {
      setIsOpen(true);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && filteredProducts.length > 0 && !editMode) {
      handleProductSelect(filteredProducts[0]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
    setIsOpen(false); // Close dropdown when switching to edit mode
  };

  const toggleFieldEditors = () => {
    setShowFieldEditorsMode(!showFieldEditorsMode);
  };

  return (
    <div className="product-selector" ref={dropdownRef}>
      <div className="product-selector-header">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          placeholder={loading ? "Loading products..." : (editMode ? "Type product name manually..." : placeholder)}
          disabled={disabled || loading}
          className={`product-selector-input ${editMode ? 'edit-mode' : ''}`}
        />
        
        {showEditMode && (
          <button
            type="button"
            onClick={toggleEditMode}
            className={`edit-mode-toggle ${editMode ? 'active' : ''}`}
            title={editMode ? "Switch to product search mode" : "Switch to manual edit mode"}
            disabled={disabled}
          >
            {editMode ? '🔍' : '✏️'}
          </button>
        )}

        {showFieldEditors && (
          <button
            type="button"
            onClick={toggleFieldEditors}
            className={`field-editors-toggle ${showFieldEditorsMode ? 'active' : ''}`}
            title={showFieldEditorsMode ? "Hide field editors" : "Show field editors for manual adjustment"}
            disabled={disabled}
          >
            {showFieldEditorsMode ? '📝' : '⚙️'}
          </button>
        )}
      </div>
      
      {editMode && (
        <div className="edit-mode-indicator">
          <span className="edit-mode-text">Manual Edit Mode - You can type product details directly</span>
        </div>
      )}

      {showFieldEditorsMode && (
        <div className="field-editors-panel">
          <div className="field-editors-header">
            <span className="field-editors-title">📝 Manual Field Adjustment</span>
            <span className="field-editors-subtitle">Edit these fields to correct purchase admin errors:</span>
          </div>
          <div className="field-editors-grid">
            <div className="field-editor">
              <label>Item Code:</label>
              <input 
                type="text" 
                placeholder="Enter item code"
                className="field-editor-input"
                disabled={disabled}
              />
            </div>
            <div className="field-editor">
              <label>HSN/SAC:</label>
              <input 
                type="text" 
                placeholder="Enter HSN/SAC code"
                className="field-editor-input"
                disabled={disabled}
              />
            </div>
            <div className="field-editor">
              <label>Quantity:</label>
              <input 
                type="number" 
                placeholder="Enter quantity"
                className="field-editor-input"
                disabled={disabled}
              />
            </div>
            <div className="field-editor">
              <label>Rate (₹):</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="Enter rate"
                className="field-editor-input"
                disabled={disabled}
              />
            </div>
            <div className="field-editor">
              <label>GST Rate (%):</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="Enter GST rate"
                className="field-editor-input"
                disabled={disabled}
              />
            </div>
          </div>
          <div className="field-editors-note">
            <span>💡 <strong>Note:</strong> All fields in the bill table below are also directly editable. Use these quick editors or edit directly in the table.</span>
          </div>
        </div>
      )}
      
      {isOpen && !editMode && (
        <div className="product-dropdown">
          {loading ? (
            <div className="dropdown-loading">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="dropdown-no-results">
              {searchTerm ? `No products found for "${searchTerm}"` : "No products available"}
            </div>
          ) : (
            <div className="dropdown-list">
              {filteredProducts.slice(0, 10).map((product, index) => (
                <div
                  key={product.id || `product-${index}`}
                  className="dropdown-item"
                  onClick={() => handleProductSelect(product)}
                >
                  <div className="product-name">{product.itemName}</div>
                  <div className="product-details">
                    <span className="product-code">Code: {product.itemCode}</span>
                    <span className="product-price">₹{product.unitPrice?.toFixed(2) || '0.00'}</span>
                    <span className="product-gst">GST: {product.gst || 0}%</span>
                  </div>
                </div>
              ))}
              {filteredProducts.length > 10 && (
                <div className="dropdown-more">
                  +{filteredProducts.length - 10} more products
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSelector;
