import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash, FaUser, FaEnvelope, FaIdCard } from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';
import './StaffList.css';

const StaffList = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!currentUser) {
          console.log('No current user, cannot fetch staff data');
          setError('Authentication required');
          return;
        }
        
        console.log('Fetching staff data...');
        const idToken = await currentUser.getIdToken(true);
        
        const res = await axios.get('http://localhost:5000/api/staff', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        
        console.log('Staff data received:', res.data);
        setStaff(res.data);
      } catch (err) {
        console.error('Failed to fetch staff:', err);
        setError(err.response?.data?.message || 'Failed to fetch staff data');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchStaff();
    }
  }, [currentUser]);

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) {
      return;
    }

    try {
      if (!currentUser) {
        alert('Authentication required');
        return;
      }
      
      const idToken = await currentUser.getIdToken(true);
      await axios.delete(`http://localhost:5000/api/staff/${staffId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      
      // Remove from local state
      setStaff(prevStaff => prevStaff.filter(s => s.id !== staffId));
    } catch (err) {
      console.error('Failed to delete staff:', err);
      alert('Failed to delete staff member');
    }
  };

  if (loading) {
    return (
      <div className="stafflist-container">
        <button className="stafflist-back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h2 className="stafflist-title">All Staff</h2>
        <div className="stafflist-loading">Loading staff data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stafflist-container">
        <button className="stafflist-back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h2 className="stafflist-title">All Staff</h2>
        <div className="stafflist-error">
          <p>Error: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="stafflist-container">
      <div className="stafflist-header">
        <button className="stafflist-back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h2 className="stafflist-title">All Staff</h2>
        <button 
          className="stafflist-refresh-button"
          onClick={() => window.location.reload()}
        >
          🔄 Refresh
        </button>
      </div>
      
      {staff.length === 0 ? (
        <div className="stafflist-empty">
          <p>No staff members found</p>
        </div>
      ) : (
        <div className="stafflist-grid">
          {staff.map((staffMember) => (
            <div className="stafflist-card" key={staffMember.id}>
              <div className="stafflist-card-header">
                <FaUser className="stafflist-icon" />
                <h3>{staffMember.name}</h3>
                <span className={`stafflist-role ${staffMember.role}`}>
                  {staffMember.role}
                </span>
              </div>
              
              <div className="stafflist-card-body">
                <div className="stafflist-info">
                  <FaEnvelope className="stafflist-icon-small" />
                  <span>{staffMember.email}</span>
                </div>
                
                {staffMember.mobile && (
                  <div className="stafflist-info">
                    <FaIdCard className="stafflist-icon-small" />
                    <span>{staffMember.mobile}</span>
                  </div>
                )}
                
                {staffMember.department && (
                  <div className="stafflist-info">
                    <span className="stafflist-department">
                      📁 {staffMember.department}
                    </span>
                  </div>
                )}
                
                {staffMember.address && (
                  <div className="stafflist-info">
                    <span className="stafflist-address">
                      📍 {staffMember.address}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="stafflist-card-actions">
                <button 
                  className="stafflist-edit-btn"
                  onClick={() => navigate(`/edit-staff/${staffMember.id}`)}
                  title="Edit Staff"
                >
                  <FaEdit />
                </button>
                <button 
                  className="stafflist-delete-btn"
                  onClick={() => handleDeleteStaff(staffMember.id)}
                  title="Delete Staff"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffList;
