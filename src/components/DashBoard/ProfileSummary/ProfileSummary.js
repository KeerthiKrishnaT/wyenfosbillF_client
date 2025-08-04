import React, { useState } from 'react';
import axios from 'axios';
import './ProfileSummary.css';

const ProfileSummary = ({ user = {}, setUser = () => {} }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePic', file);
    const token = localStorage.getItem('token');

    try {
      setUploading(true);
      const { data } = await axios.post(
        'http://localhost:5000/Uploads/profile',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setUser(prev => ({ ...prev, profilePic: data.url }));
      setUploading(false);
      setError('');
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload image');
      setUploading(false);
    }
  };

  return (
    <div className="profile-pic-container">
      {user?.profilePic ? (
        <img src={`${user.profilePic}?v=${Date.now()}`} alt="Profile" className="profile-pic" />
      ) : (
        <div className="profile-pic-placeholder">
          <span className="placeholder-text">No Pic</span>
        </div>
      )}
      <div>
        <label className="upload-label">
          {uploading ? 'Uploading...' : 'Upload Profile Picture'}
          <input
            type="file"
            accept="image/*"
            className="upload-input"
            onChange={handleProfilePicChange}
            disabled={uploading}
          />
        </label>
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
};

export default ProfileSummary;
