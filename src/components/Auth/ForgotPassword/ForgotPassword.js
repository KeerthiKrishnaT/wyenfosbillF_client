import React, { useState } from 'react';
import axios from 'axios';
import './ForgotPassword.css';
import { useNavigate } from 'react-router-dom';


const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/forgot-password', {
        email,
        newPassword
      });
      setMessage(res.data.message || 'Password updated successfully');
      setEmail('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-container">
      <form onSubmit={handleSubmit} className="forgot-form">
        <h2 className="forgot-heading">Forgot Password</h2>

        <input
          type="email"
          placeholder="Email"
          className="forgot-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="New Password"
          className="forgot-input"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm Password"
          className="forgot-input"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <button type="submit" className="forgot-button" disabled={loading}>
          {loading ? 'Updating...' : 'Update Password'}
        </button>
          <button
          type="button"
          className="forgot-button back-buttton"
          onClick={() => navigate('/login')}
        >
          ← Back to Login
        </button>
        {message && <p className="forgot-message">{message}</p>}
      </form>
    </div>
  );
};

export default ForgotPassword;
