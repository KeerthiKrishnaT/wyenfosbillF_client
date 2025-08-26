import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './TodayOrders.css';

const TodayOrders = () => {
  const [totalOrders, setTotalOrders] = useState(0);
  const [orderDetails, setOrderDetails] = useState({
    cashBills: 0,
    creditBills: 0,
    products: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayOrders = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.warn('No authentication token found');
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        
        // Fetch today's data from multiple endpoints
        const [cashResponse, creditResponse, productsResponse] = await Promise.all([
          axios.get('http://localhost:5000/api/cashbills/today', { headers }),
          axios.get('http://localhost:5000/api/creditbills/today', { headers }),
          axios.get('http://localhost:5000/api/products', { headers })
        ]);

        // Extract data with fallbacks
        const cashBills = cashResponse.data?.data?.length || 0;
        const creditBills = creditResponse.data?.data?.length || 0;
        const products = productsResponse.data?.length || 0;

        // Calculate total orders (cash bills + credit bills)
        const total = cashBills + creditBills;

        setOrderDetails({
          cashBills,
          creditBills,
          products
        });
        setTotalOrders(total);
      } catch (error) {
        console.error('Error fetching today orders:', error);
        setTotalOrders(0);
        setOrderDetails({
          cashBills: 0,
          creditBills: 0,
          products: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTodayOrders();
  }, []);

  return (
    <div className="orders-card orders-animated">
      <h4>Today's Orders</h4>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="orders-details">
          <p className="total-orders">{totalOrders}</p>
          <div className="order-breakdown">
            <span className="breakdown-item">Cash: {orderDetails.cashBills}</span>
            <span className="breakdown-item">Credit: {orderDetails.creditBills}</span>
            <span className="breakdown-item">Products: {orderDetails.products}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodayOrders;