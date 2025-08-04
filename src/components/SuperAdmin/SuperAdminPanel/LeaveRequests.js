import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './LeaveRequests.css'; 

const LeaveRequests = () => {
  const [requests, setRequests] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaveRequests = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/hr/leave-requests', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRequests(res.data);
      } catch (err) {
        console.error('Failed to fetch leave requests:', err);
      }
    };
    fetchLeaveRequests();
  }, []);

  return (
    <div className="leaverequests-container">
      <button className="leaverequests-back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <h2 className="leaverequests-title">Leave Requests</h2>
      <ul className="leaverequests-list">
        {requests.map((r, i) => (
          <li className="leaverequests-item" key={i}>
            {r.employeeName} – {r.reason} ({r.status})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LeaveRequests;
