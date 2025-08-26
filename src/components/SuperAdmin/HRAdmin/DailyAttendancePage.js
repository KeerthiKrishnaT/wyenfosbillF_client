import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DailyAttendancePage.css';
import { 
  FaCalendarAlt, 
  FaUsers, 
  FaCheckCircle, 
  FaClock, 
  FaTimesCircle, 
  FaDownload,
  FaSync
} from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';

const DailyAttendancePage = () => {
  const { currentUser } = useAuth();
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [workingHours, setWorkingHours] = useState(null);
  
  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    if (currentUser) {
      fetchAttendanceData();
      fetchWorkingHours();
    }
  }, [currentUser, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const idToken = await currentUser.getIdToken(true);
      const headers = { Authorization: `Bearer ${idToken}` };
      
      const response = await axios.get(
        `${API_URL}/attendance/daily?date=${selectedDate}`, 
        { headers }
      );
      setAttendanceData(response.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch attendance data:', err);
      setError(err.response?.data?.error || 'Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkingHours = async () => {
    try {
      const idToken = await currentUser.getIdToken(true);
      const headers = { Authorization: `Bearer ${idToken}` };
      
      const response = await axios.get(`${API_URL}/attendance/working-hours`, { headers });
      setWorkingHours(response.data.workingHours);
    } catch (err) {
      console.error('Failed to fetch working hours:', err);
    }
  };

  const markUserPresent = async (email) => {
    try {
      setLoading(true);
      const idToken = await currentUser.getIdToken(true);
      const headers = { Authorization: `Bearer ${idToken}` };
      
      await axios.post(
        `${API_URL}/attendance/mark-present`,
        { email, date: selectedDate },
        { headers }
      );
      fetchAttendanceData(); // Refresh data
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark user as present');
    } finally {
      setLoading(false);
    }
  };

  const markUserAbsent = async (email, reason = 'Not logged in') => {
    try {
      setLoading(true);
      const idToken = await currentUser.getIdToken(true);
      const headers = { Authorization: `Bearer ${idToken}` };
      
      await axios.post(
        `${API_URL}/attendance/mark-absent`,
        { email, date: selectedDate, reason },
        { headers }
      );
      fetchAttendanceData(); // Refresh data
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark user as absent');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <FaCheckCircle className="status-icon present" />;
      case 'late':
        return <FaClock className="status-icon late" />;
      case 'absent':
        return <FaTimesCircle className="status-icon absent" />;
      default:
        return <FaTimesCircle className="status-icon absent" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return '#28a745';
      case 'late':
        return '#ffc107';
      case 'absent':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return new Date(timeString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin':
        return '#dc3545';
      case 'admin':
        return '#007bff';
      case 'staff':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  const filteredRecords = attendanceData?.records?.filter(record => {
    const roleMatch = filterRole === 'all' || record.role === filterRole;
    const statusMatch = filterStatus === 'all' || record.status === filterStatus;
    return roleMatch && statusMatch;
  }) || [];

  const exportToCSV = () => {
    if (!attendanceData) return;
    
    const headers = ['Name', 'Email', 'Role', 'Department', 'Status', 'Punch In', 'Punch Out', 'Duration'];
    const csvData = filteredRecords.map(record => [
      record.name,
      record.email,
      record.role,
      record.department || 'N/A',
      record.status,
      formatTime(record.punchIn),
      formatTime(record.punchOut),
      formatDuration(record.duration)
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!currentUser) {
    return <div className="daily-attendance-page">Loading...</div>;
  }

  return (
    <div className="daily-attendance-page">
      <div className="page-header">
        <div className="header-left">
          <h2><FaCalendarAlt /> Daily Attendance Management</h2>
          <p className="working-hours">
            Working Hours: {workingHours?.start || 9}:00 AM - {workingHours?.end || 9}:30 AM 
            (Grace Period: {workingHours?.gracePeriod || 30} minutes)
          </p>
        </div>
        <div className="header-actions">
          <button className="refresh-btn" onClick={fetchAttendanceData} disabled={loading}>
            <FaSync /> Refresh
          </button>
          <button className="export-btn" onClick={exportToCSV} disabled={!attendanceData}>
            <FaDownload /> Export CSV
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="controls-section">
        <div className="date-control">
          <label>Select Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <label>Filter by Role:</label>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Filter by Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
            </select>
          </div>
        </div>
      </div>

      {attendanceData && (
        <div className="summary-cards">
          <div className="summary-card total">
            <h3>Total Users</h3>
            <span className="count">{attendanceData.totalUsers}</span>
          </div>
          <div className="summary-card present">
            <h3>Present</h3>
            <span className="count">{attendanceData.present}</span>
          </div>
          <div className="summary-card late">
            <h3>Late</h3>
            <span className="count">{attendanceData.late}</span>
          </div>
          <div className="summary-card absent">
            <h3>Absent</h3>
            <span className="count">{attendanceData.absent}</span>
          </div>
        </div>
      )}

      <div className="table-container">
        <div className="table-header">
          <h3><FaUsers /> Attendance Records for {selectedDate}</h3>
          <span className="record-count">
            Showing {filteredRecords.length} of {attendanceData?.totalUsers || 0} records
          </span>
        </div>

        {loading ? (
          <div className="loading-message">Loading attendance data...</div>
        ) : (
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Punch In</th>
                <th>Punch Out</th>
                <th>Duration</th>
                <th>Login Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id} className={`attendance-row ${record.status}`}>
                    <td>
                      <div className="status-cell">
                        {getStatusIcon(record.status)}
                        <span 
                          className="status-text"
                          style={{ color: getStatusColor(record.status) }}
                        >
                          {record.status.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td>{record.name}</td>
                    <td>{record.email}</td>
                    <td>
                      <span 
                        className="role-badge"
                        style={{ backgroundColor: getRoleBadgeColor(record.role) }}
                      >
                        {record.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{record.department || 'N/A'}</td>
                    <td>{formatTime(record.punchIn)}</td>
                    <td>{formatTime(record.punchOut)}</td>
                    <td>{formatDuration(record.duration)}</td>
                    <td>
                      <span className={`login-type ${record.loginType}`}>
                        {record.loginType}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {record.status === 'absent' && (
                          <button
                            className="mark-present-btn"
                            onClick={() => markUserPresent(record.email)}
                            disabled={loading}
                            title="Mark as Present"
                          >
                            <FaCheckCircle />
                          </button>
                        )}
                        {record.status !== 'absent' && (
                          <button
                            className="mark-absent-btn"
                            onClick={() => markUserAbsent(record.email)}
                            disabled={loading}
                            title="Mark as Absent"
                          >
                            <FaTimesCircle />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="no-data">
                    No attendance records found for the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DailyAttendancePage;
