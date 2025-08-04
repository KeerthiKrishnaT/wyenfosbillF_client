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
import axios from 'axios';

const PurchasingAdminPanel = () => {
  const [user, setUser] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [soldProducts, setSoldProducts] = useState([]);
  const [message, setMessage] = useState(null);
  const [showPriceMenu, setShowPriceMenu] = useState(false);
  const [showInventoryMenu, setShowInventoryMenu] = useState(false);
  const [showProductsMenu, setShowProductsMenu] = useState(false);
  const [showPurchaseMenu, setShowPurchaseMenu] = useState(false);

  const navigate = useNavigate();

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
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found.');
        const headers = { Authorization: `Bearer ${token}` };

        const userResponse = await axios.get('http://localhost:5000/api/auth/user-role', { headers });
        const userData = userResponse.data;
        localStorage.setItem('user', JSON.stringify(userData));

if (!['super_admin', 'purchasing_admin'].includes(userData.role) && !(userData.role === 'admin' && userData.department.toLowerCase() === 'purchase')) {
  console.warn('User role is not allowed:', userData.role, userData.department);
  throw new Error('Insufficient permissions.');
}

        setUser(userData);

        await fetchPurchases();

        const inventoryResponse = await axios.get('http://localhost:5000/api/inventory', { headers });
        setInventory(inventoryResponse.data.data || []);

        const soldProductsResponse = await axios.get('http://localhost:5000/api/sold-products', { headers });
        setSoldProducts(soldProductsResponse.data.data || []);
      } catch (err) {
        console.error('Fetch error:', err);
        setMessage({ type: 'error', text: err.message || 'Failed to fetch data' });
      }
    };
    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('darkMode');
    navigate('/login');
  };

  const handlePurchaseOption = (option) => {
    setShowPurchaseMenu(false);
    if (option === 'list') navigate('/purchasing-admin-panel/purchases/product');
    else if (option === 'form') navigate('/purchasing-admin-panel/purchases/rescipt');
    else if (option === 'receiptList') navigate('/purchasing-admin-panel/purchases/rescipt-List');
  };

  if (!user) return <Navigate to="/purchasing-admin-panel" replace />;
const handleCancelProductForm = () => {
    navigate('/purchasing-admin-panel/products/list');
 
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
                  <button onClick={() => navigate('/purchasing-admin-panel/products/add')}>Add Product</button>
                  <button onClick={() => navigate('/purchasing-admin-panel/products/list')}>Product List</button>
                  <button onClick={() => navigate('/purchasing-admin-panel/products/sold')}>Sold Product</button>
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
                  <button onClick={() => navigate('/purchasing-admin-panel/inventory/list')}>Inventory List</button>
                </div>
              )}
            </div>
          </li>
          <li>
            <div className="dropdown">
              <button className="btn-3d" onClick={() => setShowPriceMenu(!showPriceMenu)}>Price List</button>
              {showPriceMenu && (
                <div className="dropdown-menu">
                  <button onClick={() => navigate('/purchasing-admin-panel/price-list/add')}>Add Price</button>
                  <button onClick={() => navigate('/purchasing-admin-panel/price-list/view')}>Price Lists</button>
                </div>
              )}
            </div>
          </li>
        </ul>
      </nav>

      <main className="panel-content">
        {message && <div className={`message ${message.type}`} role="alert">{message.text}</div>}
        <Routes>
          <Route path="/products/add" element={<ProductForm onCancel={handleCancelProductForm} />} />
          <Route path="/products/list" element={<ProductList />} />
          <Route path="/products/sold" element={<SoldProductForm />} />
          <Route path="/purchases/product" element={<PurchaseProductList />} />
          <Route path="/purchases/rescipt" element={<PurchaseReceiptDetails onSubmit={(data) => console.log(data)} onCancel={() => navigate(-1)} />} />
          <Route path='/purchases/rescipt-List' element={<PurchaseReceiptList/>}/>
          <Route path="/inventory/list" element={<InventoryList />} />
          <Route path="/price-list/add" element={<AddPriceList/>} />
          <Route path="/price-list/view" element={<PriceListView />} />
        </Routes>
      </main>
    </div>
  );
};

export default PurchasingAdminPanel;
