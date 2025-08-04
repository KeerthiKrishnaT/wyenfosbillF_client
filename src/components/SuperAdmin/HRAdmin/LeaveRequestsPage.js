import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './LeavePermissionPage.css';
import { FaEdit, FaTrash, FaSave, FaTimes, FaPlus, FaUserClock, FaUserSlash } from 'react-icons/fa';

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
  const [absentStaff, setAbsentStaff] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('leave');
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState('staff');
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');

  const token = localStorage.getItem('token');
  const API_URL = 'http://localhost:5000/api';

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserRole(response.data.role || 'staff');
      setCurrentUserId(response.data._id);
      setCurrentUserName(response.data.name);
      
      // If user is not admin, pre-select their own ID in the form
      if (response.data.role !== 'admin') {
        setFormData(prev => ({ ...prev, staffId: response.data._id }));
      }
    } catch (err) {
      console.error('Failed to fetch user info:', err);
    }
  };

  const fetchActiveStaff = async () => {
    try {
      const response = await axios.get(`${API_URL}/staff/active-minimal`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      return [];
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [staffData, leaveData, attendanceData] = await Promise.all([
        fetchActiveStaff(),
        axios.get(`${API_URL}/leave-requests`, { headers }),
        axios.get(`${API_URL}/attendance/today`, { headers }).catch(() => null)
      ]);

      setActiveStaff(staffData);
      setLeaveRequests(leaveData.data);

      if (attendanceData) {
        const presentStaffIds = attendanceData.data.map(record => record.staffId._id);
        const absent = staffData.filter(staff => !presentStaffIds.includes(staff._id));
        setAbsentStaff(absent);
      } else {
        setAbsentStaff([]);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();
    fetchData();
  }, [token]);

  const handleInput = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    try {
      if (!formData.staffId) {
        throw new Error('Please select a staff member');
      }

      const response = await axios.post(
        `${API_URL}/leave-requests`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
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
      setError(err.message || err.response?.data?.error || 'Failed to create leave request');
    }
  };

  const handleUpdate = async (id) => {
    try {
      const response = await axios.put(
        `${API_URL}/leave-requests/${id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setLeaveRequests(prev =>
        prev.map(item => (item._id === id ? response.data : item))
      );
      resetForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update leave request');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/leave-requests/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeaveRequests(prev => prev.filter(item => item._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete leave request');
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
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
      const response = await axios.put(
        `${API_URL}/leave-requests/${id}`,
        { status },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      setLeaveRequests(prev => prev.map(req => (req._id === id ? response.data : req)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update leave status');
    }
  };

  const markAbsence = async (staffId, reason) => {
    try {
      await axios.post(
        `${API_URL}/attendance/absence`,
        { staffId, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark absence');
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
        activeStaff.map(staff => (
          <option key={staff._id} value={staff._id}>
            {staff.name} ({staff.department || 'No Department'})
          </option>
        ))
      ) : (
        <option value={currentUserId}>
          {currentUserName} (Your Account)
        </option>
      )}
    </select>
  );

  return (
    <div className="leave-permission-page">
      <h2>Leave & Absence Management</h2>
      {error && <p className="error-message">{error}</p>}
      
      <div className="view-toggle">
        <button 
          className={`toggle-btn ${viewMode === 'leave' ? 'active' : ''}`}
          onClick={() => setViewMode('leave')}
          disabled={loading}
        >
          Leave Requests
        </button>
        <button 
          className={`toggle-btn ${viewMode === 'absence' ? 'active' : ''}`}
          onClick={() => setViewMode('absence')}
          disabled={loading}
        >
          Absence Tracking
        </button>
      </div>

      {loading ? (
        <div className="loading-indicator">Loading data...</div>
      ) : viewMode === 'leave' ? (
        <>
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
              {leaveRequests.length > 0 ? (
                leaveRequests.map((req) => (
                  <tr key={req._id}>
                    <td>{req.staffId?.name || 'Unknown'}</td>
                    <td>{req.leaveType}</td>
                    <td>{new Date(req.startDate).toLocaleDateString()}</td>
                    <td>{new Date(req.endDate).toLocaleDateString()}</td>
                    <td>{req.reason}</td>
                    <td>
                      <span className={`badge-${req.status}`}>{req.status}</span>
                    </td>
                    <td>
                      {(userRole === 'admin' || req.staffId?._id === currentUserId) && (
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
                            onClick={() => handleDelete(req._id)}
                            disabled={loading}
                          >
                            <FaTrash />
                          </button>
                        </>
                      )}
                      {userRole === 'admin' && req.status === 'pending' && (
                        <>
                          <button
                            className="action-btn approve"
                            onClick={() => handleLeaveAction(req._id, 'approved')}
                            disabled={loading}
                          >
                            Approve
                          </button>
                          <button
                            className="action-btn reject"
                            onClick={() => handleLeaveAction(req._id, 'rejected')}
                            disabled={loading}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">No leave requests available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      ) : (
        <>
          {userRole === 'admin' ? (
            <>
              <h3>Today's Absent Staff ({new Date().toLocaleDateString()})</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Department</th>
                    <th>Position</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {absentStaff.length > 0 ? (
                    absentStaff.map((staff) => (
                      <tr key={staff._id}>
                        <td>{staff.name}</td>
                        <td>{staff.department}</td>
                        <td>{staff.position}</td>
                        <td>
                          <span className="badge-absent">Absent</span>
                        </td>
                        <td>
                          <button 
                            className="action-btn approve"
                            onClick={() => markAbsence(staff._id, 'Late arrival')}
                            disabled={loading}
                          >
                            <FaUserClock /> Mark Late
                          </button>
                          <button 
                            className="action-btn reject"
                            onClick={() => markAbsence(staff._id, 'Unauthorized absence')}
                            disabled={loading}
                          >
                            <FaUserSlash /> Mark Absent
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5">All staff are present today.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          ) : (
            <div className="access-denied">
              <p>You don't have permission to view this section.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LeavePermissionPage;