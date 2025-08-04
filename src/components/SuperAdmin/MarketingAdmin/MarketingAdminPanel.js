import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Sidebar from './Sidebar';
import './MarketingAdminPanel.css';

const MarketingAdminPanel = () => {
  const [clients, setClients] = useState([]);
  const [shops, setShops] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [error, setError] = useState(''); // Line 12: 'error' declared here
  const [activeTab, setActiveTab] = useState('clients');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: '' });
  const [message, setMessage] = useState('');
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [userData, setUserData] = useState({
    name: user.name || "",
    email: user.email || "",
    role: user.role || "Marketing Admin",
    profilePhoto: user.profilePhoto || "",
  });

  const navigate = useNavigate();

  const handleUpdateProfile = (updatedUser) => {
    setUserData(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate('/login');
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchData = async (url, setter) => {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch data');
        setter(data[Object.keys(data)[0]].map(item => ({ ...item, isEditing: false })));
      } catch (err) {
        setError(err.message);
        toast.error(`Error: ${err.message}`);
      }
    };

    fetchData('http://localhost:5000/api/auth/marketing/client-details', setClients);
    fetchData('http://localhost:5000/api/auth/marketing/shop-details', setShops);
    fetchData('http://localhost:5000/api/auth/marketing/staff-details', setStaffs);
  }, [navigate]);

  const handleEdit = (type, id) => {
    const list = type === "client" ? clients : type === "shop" ? shops : staffs;
    const updated = list.map(item => item._id === id ? { ...item, isEditing: true } : item);
    if (type === "client") setClients(updated);
    else if (type === "shop") setShops(updated);
    else setStaffs(updated);
  };

  const handleSave = (type, id) => {
    const list = type === "client" ? clients : type === "shop" ? shops : staffs;
    const updated = list.map(item => item._id === id ? { ...item, isEditing: false } : item);
    if (type === "client") setClients(updated);
    else if (type === "shop") setShops(updated);
    else setStaffs(updated);
    toast.success(`Saved ${type} with ID: ${id}`);
  };

  const handleDelete = async (type, id) => {
    if (window.confirm(`Are you sure you want to delete this ${type}?`)) {
      if (type === 'staff') {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`http://localhost:5000/api/auth/marketing/staff-details/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to delete staff');
          }
          setStaffs(staffs.filter(item => item._id !== id));
          toast.success(`Deleted ${type} with ID: ${id}`);
        } catch (err) {
          toast.error(`Error: ${err.message}`);
        }
      } else {
        const list = type === "client" ? clients : shops;
        const updated = list.filter(item => item._id !== id);
        if (type === "client") setClients(updated);
        else setShops(updated);
        toast.success(`Deleted ${type} with ID: ${id}`);
      }
    }
  };

  const handleChange = (e, id, field, type) => {
    const list = type === "client" ? clients : type === "shop" ? shops : staffs;
    const updated = list.map(item => item._id === id ? { ...item, [field]: e.target.value } : item);
    if (type === "client") setClients(updated);
    else if (type === "shop") setShops(updated);
    else setStaffs(updated);
  };

  const handleStaffInputChange = (e) => {
    setNewStaff({ ...newStaff, [e.target.name]: e.target.value });
  };

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.email || !newStaff.role) {
      toast.error("All fields are required to add a staff member.");
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error("No authentication token found. Please log in again.");
        navigate('/login');
        return;
      }
      const res = await fetch('http://localhost:5000/api/auth/marketing/staff-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newStaff),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add staff');
      setStaffs([...staffs, { ...data.staff, isEditing: false }]);
      setNewStaff({ name: '', email: '', role: '' });
      toast.success("Staff added successfully!");
    } catch (err) {
      console.error("Error adding staff:", err);
      toast.error(`Error: ${err.message}`);
    }
  };

  const toggleStaffSelect = (id) => {
    setSelectedStaffIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const sendMessageToSelected = async () => {
    if (!message) {
      toast.error("Message cannot be empty");
      return;
    }
    if (selectedStaffIds.length === 0) {
      toast.error("Please select at least one staff member");
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/auth/marketing/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ staffIds: selectedStaffIds, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');
      toast.success(`Message sent to staff IDs: ${selectedStaffIds.join(", ")}`);
      setMessage('');
      setSelectedStaffIds([]);
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const renderTable = (type, data, fields) => (
    <div className="map-section">
      <h3>{type.charAt(0).toUpperCase() + type.slice(1)} Details</h3>
      <table className="map-data-table">
        <thead>
          <tr>
            {fields.map(f => <th key={f}>{f}</th>)}
            {type === 'staff' && <th>Select</th>}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? data.map((item) => (
            <tr key={item._id}>
              {fields.map(field => (
                <td key={field}>
                  {item.isEditing ? (
                    <input value={item[field]} onChange={(e) => handleChange(e, item._id, field, type)} />
                  ) : item[field]}
                </td>
              ))}
              {type === 'staff' && (
                <td>
                  <input
                    type="checkbox"
                    checked={selectedStaffIds.includes(item._id)}
                    onChange={() => toggleStaffSelect(item._id)}
                  />
                </td>
              )}
              <td>
                <button className="action-btn edit" onClick={() => handleEdit(type, item._id)}>Edit</button>
                <button className="action-btn save" onClick={() => handleSave(type, item._id)}>Save</button>
                <button className="action-btn delete" onClick={() => handleDelete(type, item._id)}>Delete</button>
              </td>
            </tr>
          )) : <tr><td colSpan={fields.length + (type === 'staff' ? 2 : 1)}>No data available.</td></tr>}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover />
      <div className="map-animated-bg"></div>
      <div className="map-container">
        <Sidebar
          user={userData}
          setActiveTab={setActiveTab}
          handleLogout={handleLogout}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onUpdateProfile={handleUpdateProfile}
        />
        <div className="map-main-panel">
          <h2>Marketing Admin Panel</h2>
          {error && <div className="map-error-message">{error}</div>} {/* Display the error */}
          {activeTab === 'clients' && renderTable('client', clients, ['name', 'contact', 'address'])}
          {activeTab === 'shops' && renderTable('shop', shops, ['name', 'address', 'gstNumber'])}
          {activeTab === 'groups' && (
            <>
              {renderTable('staff', staffs, ['name', 'email', 'role'])}
              <div className="map-section">
                <h4>Add New Staff</h4>
                <input name="name" placeholder="Name" value={newStaff.name} onChange={handleStaffInputChange} />
                <input name="email" placeholder="Email" value={newStaff.email} onChange={handleStaffInputChange} />
                <input name="role" placeholder="Role" value={newStaff.role} onChange={handleStaffInputChange} />
                <button className="action-btn add" onClick={handleAddStaff}>Add Staff</button>
              </div>
            </>
          )}
          {activeTab === 'messages' && (
            <div className="map-section">
              <h3>Send Message to Selected Staff</h3>
              <textarea
                placeholder="Type your message here..."
                style={{ width: '100%', height: '100px' }}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              ></textarea>
              <button className="action-btn save" style={{ marginTop: '10px' }} onClick={sendMessageToSelected}>Send</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MarketingAdminPanel;