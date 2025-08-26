import React, { useState, useEffect } from 'react';
import './ChangeRequests.css';

const ChangeRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/forgot-password/change-requests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }
      
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId, action) => {
    try {
      const response = await fetch(`/api/forgot-password/change-requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} request`);
      }
      
      // Refresh the requests list
      fetchRequests();
      alert(`Request ${action} successfully!`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: '⏳ Pending', class: 'badge-pending' },
      approved: { text: '✅ Approved', class: 'badge-approved' },
      rejected: { text: '❌ Rejected', class: 'badge-rejected' }
    };
    
    const badge = badges[status] || badges.pending;
    return <span className={`badge ${badge.class}`}>{badge.text}</span>;
  };

  if (loading) {
    return (
      <div className="change-requests-container">
        <div className="loading">Loading change requests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="change-requests-container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="change-requests-container">
      <div className="header">
        <h2>🔄 Change Requests</h2>
        <button onClick={fetchRequests} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="no-requests">
          <p>No change requests found.</p>
        </div>
      ) : (
        <div className="requests-grid">
          {requests.map((request) => (
            <div key={request.id} className="request-card">
              <div className="request-header">
                <h3>
                  {request.type === 'password' ? '🔒 Password Reset' : '📧 Email Reset'}
                </h3>
                {getStatusBadge(request.status)}
              </div>
              
              <div className="request-details">
                {request.type === 'password' ? (
                  <>
                    <p><strong>👤 User Email:</strong> {request.email}</p>
                    <p><strong>🔑 Current Password:</strong> ••••••••</p>
                    <p><strong>🔑 New Password:</strong> ••••••••</p>
                  </>
                ) : (
                  <>
                    <p><strong>📧 Current Email:</strong> {request.currentEmail}</p>
                    <p><strong>📧 New Email:</strong> {request.newEmail}</p>
                  </>
                )}
                
                <p><strong>📝 Reason:</strong> {request.reason}</p>
                <p><strong>🆔 Request ID:</strong> {request.id}</p>
                <p><strong>📅 Date:</strong> {new Date(request.requestDate).toLocaleString()}</p>
              </div>
              
              {request.status === 'pending' && (
                <div className="request-actions">
                  <button 
                    onClick={() => handleAction(request.id, 'approved')}
                    className="btn-approve"
                  >
                    ✅ Approve
                  </button>
                  <button 
                    onClick={() => handleAction(request.id, 'rejected')}
                    className="btn-reject"
                  >
                    ❌ Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChangeRequests;
