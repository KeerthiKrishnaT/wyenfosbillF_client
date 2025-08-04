import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './StaffTable.css';

const StaffTable = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get('http://localhost:5000/api/staff', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setStaffList(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching staff:', err);
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
          <p>Loading staff...</p>
        ) : (
          <div className="table-wrapper">
            <table className="staff-table-card" aria-label="Staff Members Table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Role</th>
                  <th scope="col">Current</th>
                  <th scope="col">Email</th>
                  <th scope="col">Join Date</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(staffList) && staffList.length > 0 ? (
                  staffList.map((staff, index) => (
                    <tr key={index}>
                      <td data-label="Name">{staff.name || 'N/A'}</td>
                      <td data-label="Role">{staff.role || 'N/A'}</td>
                      <td data-label="Current">{staff.current ? 'Yes' : 'No'}</td>
                      <td data-label="Email">{staff.email || 'N/A'}</td>
                      <td data-label="Join Date">{staff.joinDate || 'N/A'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center' }}>
                      No staff data available.
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