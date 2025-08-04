import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './PunchingTimes.css'; // 👈 Import your CSS

const PunchingTimes = () => {
  const [punches, setPunches] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPunchingTimes = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/hr/punching-times', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPunches(res.data);
      } catch (err) {
        console.error('Failed to fetch punching times:', err);
      }
    };
    fetchPunchingTimes();
  }, []);

  return (
    <div className="punchingtimes-container">
      <button className="punchingtimes-back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <h2 className="punchingtimes-title">Punching Times</h2>
      <ul className="punchingtimes-list">
        {punches.map((p, i) => (
          <li className="punchingtimes-item" key={i}>
            {p.name} – {p.punchedIn} to {p.punchedOut}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PunchingTimes;
