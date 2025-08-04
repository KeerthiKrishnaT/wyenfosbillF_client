import React, { useState } from 'react';
import axios from 'axios';
import './Request.css';

const PermissionRequest = ({ resourceId, resourceType, action = 'edit', onSubmitted }) => {
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  
  const submitRequest = async () => {
    if (!reason.trim() || reason.length < 10) {
      setError('Please provide a detailed reason (min 10 characters)');
      return;
    }
    
    try {
      setStatus('loading');
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/requests', {
        resourceId,
        resourceType,
        reason,
        action
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setStatus('success');
        if (onSubmitted) onSubmitted();
        
        // Reset form after 3 seconds
        setTimeout(() => {
          setStatus('idle');
          setReason('');
        }, 3000);
      } else {
        setError(response.data.message || 'Request failed');
        setStatus('error');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit request');
      setStatus('error');
    }
  };

  const actionTexts = {
    edit: 'Edit Permission',
    create: 'Create Permission',
    delete: 'Delete Permission'
  };

  return (
    <div className="permission-request">
      <h4>Request {actionTexts[action] || 'Permission'}</h4>
      
      {status === 'success' ? (
        <div className="success-message">
          Request submitted! Admin will review your request.
        </div>
      ) : (
        <>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Reason for request:</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Explain why you need ${actionTexts[action]?.toLowerCase()}...`}
              rows={4}
              disabled={status === 'loading'}
            />
            <div className="character-count">
              {reason.length}/500 characters
            </div>
          </div>
          
          <button
            className="submit-btn"
            onClick={submitRequest}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Submitting...' : 'Submit Request'}
          </button>
        </>
      )}
    </div>
  );
};

export default PermissionRequest;