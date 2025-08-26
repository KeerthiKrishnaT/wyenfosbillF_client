import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import PurchaseProductList from './PurchaseForm';
import ProductList from '../../Product/ProductList';
import ProductForm from '../../Product/ProductForm';
import SoldProductForm from '../../Product/SoldProductForm';
import { fetchPurchases } from './PurchaseService';
import './PurchasingAdminPanel.css';
import InventoryList from './inventoryList';
import PurchaseReceiptDetails from './PurchaseRescipt';
import AddPriceList from './AddPriceList.js';
import PriceListView from './PriceListView.js';
import PurchaseReceiptList from './PurchaseReceiptList.js';
import ProductReturns from './ProductReturns.js';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';

const PurchasingAdminPanel = () => {
  const [user, setUser] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [soldProducts, setSoldProducts] = useState([]);
  const [message, setMessage] = useState(null);
  const [showPriceMenu, setShowPriceMenu] = useState(false);
  const [showInventoryMenu, setShowInventoryMenu] = useState(false);
  const [showProductsMenu, setShowProductsMenu] = useState(false);
  const [showPurchaseMenu, setShowPurchaseMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Get Firebase ID token for API calls
  const getAuthToken = useCallback(async () => {
    if (!currentUser) {
      throw new Error('No authenticated user');
    }
    return await currentUser.getIdToken(true);
  }, [currentUser]);

  const calculateInventory = useCallback(() => {
    const monthlySales = {};
    soldProducts.forEach((sale) => {
      const saleDate = new Date(sale.date || sale.soldAt);
      const monthKey = `${saleDate.getFullYear()}-${saleDate.getMonth() + 1}`;
      if (!monthlySales[monthKey]) monthlySales[monthKey] = { totalSold: 0, items: {} };
      monthlySales[monthKey].totalSold += sale.quantity;
      monthlySales[monthKey].items[sale.itemCode] = (monthlySales[monthKey].items[sale.itemCode] || 0) + sale.quantity;
    });
    const totalSold = soldProducts.reduce((sum, s) => sum + s.quantity, 0);
    const totalMonths = Object.keys(monthlySales).length || 1;
    const avgSoldPerMonth = Math.round(totalSold / totalMonths);
    return {
      inventory: inventory.map(item => ({
        ...item,
        suggestedPurchase: Math.max(0, avgSoldPerMonth - (item.quantity || 0)),
      })),
    };
  }, [soldProducts, inventory]);

  const { inventory: updatedInventory } = useMemo(() => calculateInventory(), [calculateInventory]);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        const token = await getAuthToken();
        const headers = { Authorization: `Bearer ${token}` };

        // Use userProfile from Firebase Auth context instead of API call
        if (!userProfile) {
          throw new Error('User profile not found.');
        }

        // Check permissions - use both userProfile and localStorage
        const userRole = userProfile?.role?.toLowerCase() || localStorage.getItem('role')?.toLowerCase();
        const userDept = userProfile?.department?.toLowerCase() || localStorage.getItem('dept')?.toLowerCase();
        
        if (!['super_admin', 'superadmin', 'purchasing_admin', 'purchase_admin', 'purchaseadmin'].includes(userRole) &&
            !(userRole === 'admin' && ['purchase', 'purchasing'].includes(userDept))) {
          console.warn('User role is not allowed:', userRole, userDept);
          throw new Error('Insufficient permissions.');
        }
        
        setUser(userProfile);

        await fetchPurchases(token);

        try {
          const inventoryResponse = await axios.get(`${API_BASE_URL}/api/inventory`, { headers });
          setInventory(inventoryResponse.data.data || []);
        } catch (inventoryError) {
          console.error('Failed to fetch inventory:', inventoryError);
          setInventory([]);
          setMessage({ type: 'warning', text: 'Inventory data unavailable. Panel will load with empty inventory.' });
          // Don't block the entire panel for inventory error
        }

        try {
          const soldProductsResponse = await axios.get(`${API_BASE_URL}/api/sold-products`, { headers });
          setSoldProducts(soldProductsResponse.data.data || []);
        } catch (soldProductsError) {
          console.error('Failed to fetch sold products:', soldProductsError);
          setSoldProducts([]);
          setMessage({ type: 'warning', text: 'Sold products data unavailable. Panel will load with empty data.' });
          // Don't block the entire panel for sold products error
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setMessage({ type: 'error', text: err.message || 'Failed to fetch data' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [navigate, currentUser, userProfile, getAuthToken, API_BASE_URL]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('darkMode');
    localStorage.removeItem('role');
    localStorage.removeItem('dept');
    localStorage.removeItem('email');
    localStorage.removeItem('userId');
    navigate('/login');
  };

  const handlePurchaseOption = (option) => {
    setShowPurchaseMenu(false);
    if (option === 'list') navigate('/purchasing-admin/purchases/product');
    else if (option === 'form') navigate('/purchasing-admin/purchases/rescipt');
    else if (option === 'receiptList') navigate('/purchasing-admin/purchases/rescipt-List');
  };

  // Show loading while fetching user data
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Loading Purchasing Admin Panel...
      </div>
    );
  }

  // Check for either user state or userProfile from auth context
  if (!user && !userProfile) {
    console.log('No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  

const handleCancelProductForm = () => {
    navigate('/purchasing-admin/products/list');
};
  return (
    <div className='purchasing-admin-panel'>
      <header className="panel-header">
        <h1>Purchasing Admin Panel</h1>
        <div className="user-info">
          <button className="btn-4d" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <nav className="panel-nav">
        <ul>
          <li>
            <div className="dropdown">
              <button className="btn-3d" onClick={() => setShowProductsMenu(!showProductsMenu)}>Products</button>
              {showProductsMenu && (
                <div className="dropdown-menu">
                  <button onClick={() => navigate('/purchasing-admin/products/add')}>Add Product</button>
                  <button onClick={() => navigate('/purchasing-admin/products/list')}>Product List</button>
                  <button onClick={() => navigate('/purchasing-admin/products/sold')}>Sold Product</button>
                  <button onClick={() => navigate('/purchasing-admin/products/returns')}>Product Returns</button>
                </div>
              )}
            </div>
          </li>
          <li>
            <div className="dropdown">
              <button className="btn-3d" onClick={() => setShowPurchaseMenu(!showPurchaseMenu)}>Purchase</button>
              {showPurchaseMenu && (
                <div className="dropdown-menu">
                  <button onClick={() => handlePurchaseOption('list')}>Purchase Product List</button>
                  <button onClick={() => handlePurchaseOption('form')}>Purchase Receipt</button>
                  <button onClick={() => handlePurchaseOption('receiptList')}>Purchase Receipt List</button>
                </div>
              )}
            </div>
          </li>
          <li>
            <div className="dropdown">
              <button className="btn-3d" onClick={() => setShowInventoryMenu(!showInventoryMenu)}>Inventory</button>
              {updatedInventory.length > 0 && (
                <section className="suggested-inventory card-3d">
                  <h3>Suggested Restock</h3>
                  <ul>
                    {updatedInventory.map(item => (
                      <li key={item._id || item.itemCode}>
                        {item.itemName} – Suggest purchasing {item.suggestedPurchase}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {showInventoryMenu && (
                <div className="dropdown-menu">
                  <button onClick={() => navigate('/purchasing-admin/inventory/list')}>Inventory List</button>
                </div>
              )}
            </div>
          </li>
          <li>
            <div className="dropdown">
              <button className="btn-3d" onClick={() => setShowPriceMenu(!showPriceMenu)}>Price List</button>
              {showPriceMenu && (
                <div className="dropdown-menu">
                  <button onClick={() => navigate('/purchasing-admin/add-price-list')}>Add Price List</button>
                  <button onClick={() => navigate('/purchasing-admin/price-lists')}>View Price Lists</button>
                </div>
              )}
            </div>
          </li>
        </ul>
      </nav>

      <main className="panel-content">
        {message && <div className={`message ${message.type}`} role="alert">{message.text}</div>}
        <Routes>
          <Route path="/products/add" element={
            <div>
              <h2 className="page-heading">📦 Add New Product</h2>
              <ProductForm onCancel={handleCancelProductForm} onSubmitSuccess={() => navigate('/purchasing-admin/products/list')} />
            </div>
          } />
          <Route path="/products/list" element={
            <div>
              <h2 className="page-heading">📋 Product List</h2>
              <ProductList />
            </div>
          } />
          <Route path="/products/sold" element={
            <div>
              <h2 className="page-heading">💰 Sold Products</h2>
              <SoldProductForm />
            </div>
          } />
          <Route path="/products/returns" element={
            <div>
              <h2 className="page-heading">🔄 Product Returns</h2>
              <ProductReturns />
            </div>
          } />
          <Route path="/purchases/product" element={
            <div>
              <h2 className="page-heading">🛒 Purchase Product List</h2>
              <PurchaseProductList />
            </div>
          } />
          <Route path="/purchases/rescipt" element={
            <div>
              <h2 className="page-heading">🧾 Purchase Receipt</h2>
              <PurchaseReceiptDetails onSubmit={(data) => console.log(data)} onCancel={() => navigate(-1)} />
            </div>
          } />
          <Route path='/purchases/rescipt-List' element={
            <div>
              <h2 className="page-heading">📄 Purchase Receipt List</h2>
              <PurchaseReceiptList/>
            </div>
          }/>
          <Route path="/inventory/list" element={
            <div>
              <h2 className="page-heading">📦 Inventory Management</h2>
              <InventoryList />
            </div>
          } />
          <Route path="/price-list/add" element={
            <div>
              <h2 className="page-heading">💲 Add Price List</h2>
              <AddPriceList/>
            </div>
          } />
          <Route path="/price-list/view" element={
            <div>
              <h2 className="page-heading">📊 Price Lists</h2>
              <PriceListView />
            </div>
          } />
        </Routes>
      </main>
    </div>
  );
};

export default PurchasingAdminPanel;
