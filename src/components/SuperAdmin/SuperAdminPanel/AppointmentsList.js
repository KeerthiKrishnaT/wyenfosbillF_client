import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AppointmentsList.css'; 

const AppointmentsList = () => {
  const [appointments, setAppointments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/hr/appointments', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAppointments(res.data);
      } catch (err) {
        console.error('Failed to fetch appointments:', err);
      }
    };
    fetchAppointments();
  }, []);

  return (
    <div className="appointments-container">
      <button className="appointments-back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <h2 className="appointments-title">Appointments</h2>
      <ul className="appointments-list">
        {appointments.map((a, i) => (
          <li className="appointments-item" key={i}>
            {a.date} – {a.description}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AppointmentsList;
