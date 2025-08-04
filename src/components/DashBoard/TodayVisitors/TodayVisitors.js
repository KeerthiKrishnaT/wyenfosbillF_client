import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './TodayVisitors.css';

const TodayVisitors = () => {
  const [visitorCount, setVisitorCount] = useState(0);

  useEffect(() => {
    const fetchTodayVisitors = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/customers/today', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setVisitorCount(res.data.length || 0);
      } catch (err) {
        console.error('Error fetching today visitors:', err);
      }
    };

    fetchTodayVisitors();
  }, []);

  return (
    <div className="visitor-card visitor-animated">
      <h4>Today's Visitors</h4>
      <p>{visitorCount}</p>
    </div>
  );
};

export default TodayVisitors;