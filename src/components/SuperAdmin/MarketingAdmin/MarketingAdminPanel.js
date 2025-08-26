import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../../../contexts/AuthContext';
import Sidebar from './Sidebar';
import './MarketingAdminPanel.css';

const MarketingAdminPanel = () => {
  const [clients, setClients] = useState([]);
  const [shops, setShops] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('clients');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: '' });
  const [newClient, setNewClient] = useState({ name: '', contact: '', address: '' });
  const [newShop, setNewShop] = useState({ name: '', address: '', gstNumber: '' });
  const [message, setMessage] = useState('');
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);

  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [userData, setUserData] = useState({
    name: userProfile?.name || "",
    email: userProfile?.email || "",
    role: userProfile?.role || "Marketing Admin",
    profilePhoto: userProfile?.profilePhoto || "",
  });

  // Update userData when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setUserData({
        name: userProfile.name || "",
        email: userProfile.email || "",
        role: userProfile.role || "Marketing Admin",
        profilePhoto: userProfile.profilePhoto || "",
      });
    }
  }, [userProfile]);

  const handleUpdateProfile = (updatedUser) => {
    setUserData(updatedUser);
  };

  const handleLogout = () => {
    // This will be handled by the AuthContext
    navigate('/login');
  };

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const idToken = await currentUser.getIdToken(true);
        
        const fetchDataFromAPI = async (url, setter) => {
          try {
            const res = await fetch(url, {
              headers: { Authorization: `Bearer ${idToken}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch data');
            setter(data[Object.keys(data)[0]].map(item => ({ ...item, isEditing: false })));
          } catch (err) {
            setError(err.message);
            toast.error(`Error: ${err.message}`);
          }
        };

        await Promise.all([
          fetchDataFromAPI('http://localhost:5000/api/marketing/client-details', setClients),
          fetchDataFromAPI('http://localhost:5000/api/marketing/shop-details', setShops),
          fetchDataFromAPI('http://localhost:5000/api/marketing/staff-details', setStaffs)
        ]);
      } catch (err) {
        setError(err.message);
        toast.error(`Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, navigate]);

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
          const idToken = await currentUser.getIdToken(true);
          const res = await fetch(`http://localhost:5000/api/marketing/staff-details/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${idToken}` },
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

  const handleClientInputChange = (e) => {
    setNewClient({ ...newClient, [e.target.name]: e.target.value });
  };

  const handleShopInputChange = (e) => {
    setNewShop({ ...newShop, [e.target.name]: e.target.value });
  };

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.email || !newStaff.role) {
      toast.error("All fields are required to add a staff member.");
      return;
    }
    try {
      if (!currentUser) {
        toast.error("No authentication found. Please log in again.");
        navigate('/login');
        return;
      }
      const idToken = await currentUser.getIdToken(true);
      const res = await fetch('http://localhost:5000/api/marketing/staff-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
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

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.contact || !newClient.address) {
      toast.error("All fields are required to add a client.");
      return;
    }
    try {
      if (!currentUser) {
        toast.error("No authentication found. Please log in again.");
        navigate('/login');
        return;
      }
      const idToken = await currentUser.getIdToken(true);
      const res = await fetch('http://localhost:5000/api/marketing/client-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(newClient),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add client');
      setClients([...clients, { ...data.client, isEditing: false }]);
      setNewClient({ name: '', contact: '', address: '' });
      toast.success("Client added successfully!");
    } catch (err) {
      console.error("Error adding client:", err);
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleAddShop = async () => {
    if (!newShop.name || !newShop.address || !newShop.gstNumber) {
      toast.error("All fields are required to add a shop.");
      return;
    }
    try {
      if (!currentUser) {
        toast.error("No authentication found. Please log in again.");
        navigate('/login');
        return;
      }
      const idToken = await currentUser.getIdToken(true);
      const res = await fetch('http://localhost:5000/api/marketing/shop-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(newShop),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add shop');
      setShops([...shops, { ...data.shop, isEditing: false }]);
      setNewShop({ name: '', address: '', gstNumber: '' });
      toast.success("Shop added successfully!");
    } catch (err) {
      console.error("Error adding shop:", err);
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
      const idToken = await currentUser.getIdToken(true);
      const res = await fetch('http://localhost:5000/api/marketing/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
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
          {error && <div className="map-error-message">{error}</div>}
          {loading && <div className="map-loading-message">Loading data...</div>}
          {activeTab === 'clients' && (
            <>
              {renderTable('client', clients, ['name', 'contact', 'address'])}
              <div className="map-section add-form">
                <h4>Add New Client</h4>
                <button className="action-btn add" onClick={() => setShowClientModal(true)}>Add New Client</button>
              </div>
            </>
          )}
          {activeTab === 'shops' && (
            <>
              {renderTable('shop', shops, ['name', 'address', 'gstNumber'])}
              <div className="map-section add-form">
                <h4>Add New Shop</h4>
                <button className="action-btn add" onClick={() => setShowShopModal(true)}>Add New Shop</button>
              </div>
            </>
          )}
          {activeTab === 'groups' && (
            <>
              {renderTable('staff', staffs, ['name', 'email', 'role'])}
              <div className="map-section add-form">
                <h4>Add New Staff</h4>
                <input name="name" placeholder="Name" value={newStaff.name} onChange={handleStaffInputChange} />
                <input name="email" placeholder="Email" value={newStaff.email} onChange={handleStaffInputChange} />
                <input name="role" placeholder="Role" value={newStaff.role} onChange={handleStaffInputChange} />
                <button className="action-btn add" onClick={handleAddStaff}>Add Staff</button>
              </div>
            </>
          )}
          {activeTab === 'messages' && (
            <div className="map-section message-section">
              <h3>Send Message to Selected Staff</h3>
              
              {/* Staff Selection Section */}
              <div className="staff-selection-container">
                <h4>Select Staff Members to Message:</h4>
                <div className="staff-list">
                  {staffs.length > 0 ? staffs.map((staff) => (
                    <div key={staff._id} className="staff-item">
                      <input
                        type="checkbox"
                        id={`staff-${staff._id}`}
                        checked={selectedStaffIds.includes(staff._id)}
                        onChange={() => toggleStaffSelect(staff._id)}
                      />
                      <label htmlFor={`staff-${staff._id}`}>
                        <strong>{staff.name}</strong> - {staff.email} ({staff.role})
                      </label>
                    </div>
                  )) : (
                    <p>No staff members available. Please add staff members first.</p>
                  )}
                </div>
                
                {selectedStaffIds.length > 0 && (
                  <div className="selected-staff-summary">
                    <strong>Selected Staff ({selectedStaffIds.length}):</strong>
                    <ul>
                      {selectedStaffIds.map(id => {
                        const staff = staffs.find(s => s._id === id);
                        return staff ? <li key={id}>{staff.name} ({staff.role})</li> : null;
                      })}
                    </ul>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="message-input-container">
                <h4>Message:</h4>
                <textarea
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="message-actions">
                <button 
                  className="action-btn save" 
                  onClick={sendMessageToSelected}
                  disabled={selectedStaffIds.length === 0 || !message.trim()}
                >
                  Send Message
                </button>
                <button 
                  className="action-btn delete" 
                  onClick={() => {
                    setSelectedStaffIds([]);
                    setMessage('');
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Client Modal */}
      {showClientModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Client</h3>
              <button className="modal-close" onClick={() => setShowClientModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <input name="name" placeholder="Client Name" value={newClient.name} onChange={handleClientInputChange} />
              <input name="contact" placeholder="Contact Number" value={newClient.contact} onChange={handleClientInputChange} />
              <input name="address" placeholder="Address" value={newClient.address} onChange={handleClientInputChange} />
            </div>
            <div className="modal-footer">
              <button className="action-btn add" onClick={() => {
                handleAddClient();
                setShowClientModal(false);
              }}>Add Client</button>
              <button className="action-btn delete" onClick={() => setShowClientModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Shop Modal */}
      {showShopModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Shop</h3>
              <button className="modal-close" onClick={() => setShowShopModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <input name="name" placeholder="Shop Name" value={newShop.name} onChange={handleShopInputChange} />
              <input name="address" placeholder="Address" value={newShop.address} onChange={handleShopInputChange} />
              <input name="gstNumber" placeholder="GST Number" value={newShop.gstNumber} onChange={handleShopInputChange} />
            </div>
            <div className="modal-footer">
              <button className="action-btn add" onClick={() => {
                handleAddShop();
                setShowShopModal(false);
              }}>Add Shop</button>
              <button className="action-btn delete" onClick={() => setShowShopModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MarketingAdminPanel;