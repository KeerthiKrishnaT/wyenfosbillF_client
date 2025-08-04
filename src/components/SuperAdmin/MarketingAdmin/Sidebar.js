import React, { useState } from 'react';
import './Sidebar.css';

const Sidebar = ({ user, setActiveTab, handleLogout, sidebarOpen, setSidebarOpen, onUpdateProfile }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [name, setName] = useState(user.name || 'Marketing Admin');
  const [email, setEmail] = useState(user.email || 'admin@example.com');
  const [role, setRole] = useState(user.role || 'Marketing Admin');
  const [profilePhoto, setProfilePhoto] = useState(user.profilePhoto || '');

  const handleSave = (field) => {
    if (field === 'name') setIsEditingName(false);
    if (field === 'email') setIsEditingEmail(false);
    if (field === 'role') setIsEditingRole(false);
    onUpdateProfile({ name, email, role, profilePhoto });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPhoto = reader.result;
        setProfilePhoto(newPhoto);
        onUpdateProfile({ name, email, role, profilePhoto: newPhoto });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <div className={`map-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        {sidebarOpen && (
          <>
            <div className="map-profile-section">
              <label htmlFor="profile-photo-upload" className="map-profile-photo-label">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Profile"
                    className="map-profile-photo"
                  />
                ) : (
                  <div className="map-profile-placeholder">No Photo</div>
                )}
                <input
                  id="profile-photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ display: 'none' }}
                />
              </label>

              {isEditingName ? (
                <div className="map-edit-field">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="map-input"
                  />
                  <button onClick={() => handleSave('name')} className="map-save-btn">Save</button>
                </div>
              ) : (
                <h3 onClick={() => setIsEditingName(true)} className="map-editable">
                  {name}
                </h3>
              )}

              {isEditingEmail ? (
                <div className="map-edit-field">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="map-input"
                  />
                  <button onClick={() => handleSave('email')} className="map-save-btn">Save</button>
                </div>
              ) : (
                <p onClick={() => setIsEditingEmail(true)} className="map-editable">
                  {email}
                </p>
              )}

              {isEditingRole ? (
                <div className="map-edit-field">
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="map-input"
                  />
                  <button onClick={() => handleSave('role')} className="map-save-btn">Save</button>
                </div>
              ) : (
                <p onClick={() => setIsEditingRole(true)} className="map-editable map-role">
                  {role}
                </p>
              )}
            </div>
            <div className="map-sidebar-menu">
              <button onClick={() => setActiveTab('clients')}>Clients</button>
              <button onClick={() => setActiveTab('shops')}>Shops</button>
              <button onClick={() => setActiveTab('groups')}>Groups</button>
              <button onClick={() => setActiveTab('messages')}>Messages</button>
              <button onClick={handleLogout}>Sign Out</button>
            </div>
          </>
        )}
      </div>
      <button className="map-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? '◀' : '▶'}
      </button>
    </>
  );
};

export default Sidebar;