import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './TerminatedStaff.css';

const TerminatedStaff = () => {
  const [terminated, setTerminated] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTerminatedStaff = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/hr/terminated-staff', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTerminated(res.data);
      } catch (err) {
        console.error('Failed to fetch terminated staff:', err);
      }
    };
    fetchTerminatedStaff();
  }, []);

  return (
    <div className="terminatedstaff-container">
      <button className="terminatedstaff-back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <h2 className="terminatedstaff-title">Terminated Staff</h2>
      <ul className="terminatedstaff-list">
        {terminated.map((t, i) => (
          <li className="terminatedstaff-item" key={i}>
            {t.name} – {t.reason}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TerminatedStaff;
