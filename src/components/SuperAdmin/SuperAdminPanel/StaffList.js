import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './StaffList.css'; // ✅ Import

const StaffList = () => {
  const [staff, setStaff] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/hr/staff', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStaff(res.data);
      } catch (err) {
        console.error('Failed to fetch staff:', err);
      }
    };

    fetchStaff();
  }, []);

  return (
    <div className="stafflist-container">
      <button className="stafflist-back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <h2 className="stafflist-title">All Staff</h2>
      <ul className="stafflist-list">
        {staff.map((user) => (
          <li className="stafflist-item" key={user._id}>
            {user.name} – {user.email} ({user.role})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StaffList;
