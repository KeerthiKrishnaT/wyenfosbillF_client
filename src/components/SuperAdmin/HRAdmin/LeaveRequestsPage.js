import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './LeavePermissionPage.css';
import { FaEdit, FaTrash, FaSave, FaTimes, FaPlus } from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';

const LeavePermissionPage = () => {
  const [formData, setFormData] = useState({
    staffId: '',
    startDate: '',
    endDate: '',
    reason: '',
    leaveType: 'casual'
  });
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [activeStaff, setActiveStaff] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState('staff');
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Debug: Log state changes
  useEffect(() => {
    // State changes handled by fetchLeaveRequests
  }, [leaveRequests]);

  const { currentUser } = useAuth();
  const API_URL = 'http://localhost:5000/api';

  const fetchUserInfo = useCallback(async () => {
    try {
      if (!currentUser) return;
      
      const idToken = await currentUser.getIdToken(true);
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      setUserRole(response.data.role || 'staff');
      setCurrentUserId(response.data._id);
      setCurrentUserName(response.data.name);
      
      // Check if user is Super Admin
      const isSuperAdminUser = response.data.role === 'superadmin' || response.data.role === 'super_admin';
      setIsSuperAdmin(isSuperAdminUser);
      
      // If user is not admin, pre-select their own ID in the form
      if (response.data.role !== 'admin') {
        setFormData(prev => ({ ...prev, staffId: response.data._id }));
      }
    } catch (err) {
      console.error('Failed to fetch user info:', err);
    }
  }, [currentUser]);

  const fetchActiveStaff = useCallback(async () => {
    try {
      if (!currentUser) return [];
      
      const idToken = await currentUser.getIdToken(true);
      const response = await axios.get(`${API_URL}/auth/users/all`, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      return [];
    }
  }, [currentUser]);

  const fetchData = useCallback(async () => {
    try {
      if (!currentUser) return;
      
      setLoading(true);
      setError('');
      const idToken = await currentUser.getIdToken(true);
      const headers = { Authorization: `Bearer ${idToken}` };
      
      const [staffData, leaveData] = await Promise.all([
        fetchActiveStaff(),
        axios.get(`${API_URL}/leave-requests`, { headers })
      ]);

      setActiveStaff(Array.isArray(staffData) ? staffData : []);
      
      // Fix: Check if leaveData.data exists and is an array
      let leaveRequestsData = [];
      
      if (leaveData.data) {
        if (Array.isArray(leaveData.data)) {
          leaveRequestsData = leaveData.data;
        } else if (leaveData.data.data && Array.isArray(leaveData.data.data)) {
          // Handle nested data structure
          leaveRequestsData = leaveData.data.data;
        } else if (typeof leaveData.data === 'object') {
          // Handle object with data property
          leaveRequestsData = leaveData.data.data || [];
        }
      }
      
      setLeaveRequests(leaveRequestsData);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchActiveStaff]);

  useEffect(() => {
    if (currentUser) {
      fetchUserInfo();
      fetchData();
    }
  }, [currentUser, fetchUserInfo, fetchData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInput = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    try {
      if (!currentUser) return;
      if (!formData.staffId) {
        throw new Error('Please select a staff member');
      }

      const idToken = await currentUser.getIdToken(true);
      const response = await axios.post(
        `${API_URL}/leave-requests`,
        formData,
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      
      setLeaveRequests(prev => [...prev, response.data]);
      setFormData({
        staffId: userRole === 'admin' ? '' : currentUserId,
        startDate: '',
        endDate: '',
        reason: '',
        leaveType: 'casual'
      });
    } catch (err) {
      console.error('Error creating leave request:', err);
      setError(err.message || err.response?.data?.error || 'Failed to create leave request');
    }
  };

  const handleUpdate = async (id) => {
    try {
      if (!currentUser) return;
      
      const idToken = await currentUser.getIdToken(true);
      const response = await axios.put(
        `${API_URL}/leave-requests/${id}`,
        formData,
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      
      setLeaveRequests(prev =>
        prev.map(item => ((item._id || item.id) === id ? response.data : item))
      );
      resetForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update leave request');
    }
  };

  const handleDelete = async (id) => {
    try {
      if (!currentUser) return;
      
      const idToken = await currentUser.getIdToken(true);
      await axios.delete(`${API_URL}/leave-requests/${id}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      setLeaveRequests(prev => prev.filter(item => (item._id || item.id) !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete leave request');
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id || item.id);
    setFormData({ ...item });
  };

  const resetForm = () => {
    setFormData({
      staffId: userRole === 'admin' ? '' : currentUserId,
      startDate: '',
      endDate: '',
      reason: '',
      leaveType: 'casual'
    });
    setEditingId(null);
  };

  const handleLeaveAction = async (id, status) => {
    try {
      if (!currentUser) return;
      
      const idToken = await currentUser.getIdToken(true);
      const response = await axios.put(
        `${API_URL}/leave-requests/${id}`,
        { status },
        { headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' } }
      );
      setLeaveRequests(prev => prev.map(req => ((req._id || req.id) === id ? response.data : req)));
    } catch (err) {
      console.error('Error updating leave status:', err);
      setError(err.response?.data?.error || 'Failed to update leave status');
    }
  };



  const renderStaffSelect = () => (
    <select
      value={formData.staffId}
      onChange={(e) => handleInput('staffId', e.target.value)}
      disabled={loading || editingId || userRole !== 'admin'}
      required
    >
      <option value="">Select Staff</option>
      {userRole === 'admin' ? (
        Array.isArray(activeStaff) && activeStaff.map(staff => (
          <option key={staff._id || staff.id || `staff-${staff.name}-${staff.email}`} value={staff._id || staff.id}>
            {staff.name} ({staff.role || 'Staff'}) - {staff.department || 'No Department'}
          </option>
        ))
      ) : (
        <option key={currentUserId || 'current-user'} value={currentUserId}>
          {currentUserName} (Your Account)
        </option>
      )}
    </select>
  );

  return (
    <div className="leave-permission-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Leave Request Management</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={fetchData}
            disabled={loading}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>
      {error && <p className="error-message">{error}</p>}

      {loading ? (
        <div className="loading-indicator">Loading data...</div>
      ) : (
        <div className="content-wrapper">
          {/* Hide form for Super Admin - only HR Admin can add leave requests */}
          {!isSuperAdmin && (
            <div className="crud-form">
              {renderStaffSelect()}

              <select
                value={formData.leaveType}
                onChange={(e) => handleInput('leaveType', e.target.value)}
                disabled={loading}
              >
                <option value="casual">Casual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="annual">Annual Leave</option>
                <option value="maternity">Maternity Leave</option>
                <option value="paternity">Paternity Leave</option>
                <option value="unpaid">Unpaid Leave</option>
                <option value="other">Other</option>
              </select>

              <input
                type="date"
                placeholder="Start Date"
                value={formData.startDate}
                onChange={(e) => handleInput('startDate', e.target.value)}
                disabled={loading}
                required
              />

              <input
                type="date"
                placeholder="End Date"
                value={formData.endDate}
                onChange={(e) => handleInput('endDate', e.target.value)}
                disabled={loading}
                required
              />

              <input
                type="text"
                placeholder="Reason"
                value={formData.reason}
                onChange={(e) => handleInput('reason', e.target.value)}
                disabled={loading}
                required
              />

              {editingId ? (
                <>
                  <button 
                    className="save-btn" 
                    onClick={() => handleUpdate(editingId)}
                    disabled={loading}
                  >
                    <FaSave /> Save
                  </button>
                  <button 
                    className="cancel-btn" 
                    onClick={resetForm}
                    disabled={loading}
                  >
                    <FaTimes /> Cancel
                  </button>
                </>
              ) : (
                <button 
                  className="add-btn" 
                  onClick={handleCreate}
                  disabled={loading || !formData.staffId}
                >
                  <FaPlus /> Add
                </button>
              )}
            </div>
          )}

          {/* Show info message for Super Admin */}
          {isSuperAdmin && (
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#e3f2fd', 
              border: '1px solid #2196f3', 
              borderRadius: '4px', 
              marginBottom: '20px',
              color: '#1976d2'
            }}>
              <strong>Super Admin View:</strong> You can only approve or reject leave requests. HR Admin is responsible for adding new leave requests.
            </div>
          )}

          <table className="data-table">
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Leave Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
                         <tbody>
               {(() => {
                 
                 return leaveRequests.length > 0 ? (
                   leaveRequests.map((req) => {
                     const requestId = req._id || req.id;
                     
                     return (
                     <tr key={requestId}>
                       <td>{req.staffId?.name || 'Unknown'}</td>
                       <td>{req.leaveType}</td>
                       <td>{new Date(req.startDate).toLocaleDateString()}</td>
                       <td>{new Date(req.endDate).toLocaleDateString()}</td>
                       <td>{req.reason}</td>
                       <td>
                         <span className={`badge-${req.status}`}>{req.status}</span>
                       </td>
                       <td>
                         {/* Show edit/delete only for HR Admin or the request owner */}
                         {(!isSuperAdmin && (userRole === 'admin' || req.staffId?._id === currentUserId)) && (
                           <>
                             <button 
                               className="edit-btn action-btn" 
                               onClick={() => handleEdit(req)}
                               disabled={loading}
                             >
                               <FaEdit />
                             </button>
                             <button 
                               className="delete-btn action-btn" 
                               onClick={() => handleDelete(requestId)}
                               disabled={loading}
                             >
                               <FaTrash />
                             </button>
                           </>
                         )}
                         {/* Show approve/reject for Super Admin and HR Admin */}
                         {(isSuperAdmin || userRole === 'admin') && req.status === 'pending' && (
                           <>
                             <button
                               className="action-btn approve"
                               onClick={() => handleLeaveAction(requestId, 'approved')}
                               disabled={loading}
                             >
                               Approve
                             </button>
                             <button
                               className="action-btn reject"
                               onClick={() => handleLeaveAction(requestId, 'rejected')}
                               disabled={loading}
                             >
                               Reject
                             </button>
                           </>
                         )}
                       </td>
                     </tr>
                   );
                 })
                                ) : (
                   <tr>
                     <td colSpan="7">No leave requests available.</td>
                   </tr>
                 );
               })()}
             </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LeavePermissionPage;