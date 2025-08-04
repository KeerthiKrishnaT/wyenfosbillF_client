import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './TodayOrders.css';

const TodayOrders = () => {
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        const [cashResponse, creditResponse] = await Promise.all([
          axios.get('http://localhost:5000/api/cashbills/today', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get('http://localhost:5000/api/creditbills/today', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const total = (cashResponse.data.data?.length || 0) + (creditResponse.data.data?.length || 0);
        setTotalItems(total);
      } catch (error) {
        console.error('Error fetching today orders:', error);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="orders-card orders-animated">
      <h4>Today's Orders</h4>
      <p>{totalItems}</p>
    </div>
  );
};

export default TodayOrders;