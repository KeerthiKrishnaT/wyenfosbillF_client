import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './StaffTable.css';

const StaffTable = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.warn('No authentication token found');
          setStaffList([]);
          return;
        }
        
        // Use the staff endpoint that doesn't require admin privileges
        const response = await axios.get('http://localhost:5000/api/staff/active/minimal', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        // The staff endpoint returns active staff with minimal data
        const staffMembers = (response.data || []).map(staff => ({
          id: staff._id || staff.id,
          name: staff.name || 'Unknown',
          email: staff.email || 'N/A',
          role: staff.role || 'staff',
          department: staff.department || 'N/A',
          joinDate: staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : 'N/A',
          lastLogin: staff.lastLoginAt ? new Date(staff.lastLoginAt).toLocaleDateString() : 'Never',
          status: 'Active' // All staff from this endpoint are active
        }));
        
        console.log('Staff API response:', response);
        console.log('Filtered staff members:', staffMembers);
        setStaffList(staffMembers);
      } catch (err) {
        console.error('Error fetching staff:', err);
        console.error('Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        
        // Show a more user-friendly error message
        if (err.response?.status === 403) {
          console.warn('Access denied - user may not have required permissions');
        } else if (err.response?.status === 404) {
          console.warn('Staff endpoint not found');
        }
        
        setStaffList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, []);

  return (
    <div className="staff-container">
      <div className="staff-table staff-animated">
        <h3>Staff Members</h3>
        {loading ? (
          <div className="loading">Loading staff members...</div>
        ) : (
          <div className="table-wrapper">
            <table className="staff-table-card" aria-label="Staff Members Table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Status</th>
                  <th scope="col">Join Date</th>
                  <th scope="col">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {staffList.length > 0 ? (
                  staffList.map((staff, index) => (
                    <tr key={staff.id || index}>
                      <td data-label="Name">{staff.name || 'N/A'}</td>
                      <td data-label="Email">{staff.email || 'N/A'}</td>
                      <td data-label="Status">
                        <span className={`status-badge ${staff.status.toLowerCase()}`}>
                          {staff.status}
                        </span>
                      </td>
                      <td data-label="Join Date">{staff.joinDate}</td>
                      <td data-label="Last Login">{staff.lastLogin}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center' }}>
                      No staff members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffTable;