import React, { useState } from 'react';
import axios from 'axios';
import './ResetPassword.css';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/reset/send-otp', { email });
      console.log(otp);
      setMessage(res.data.message);
      setStep(2);
    } catch (err) {
      setMessage(err.response?.data?.message || 'OTP sending failed');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setMessage('');

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/reset/verify-otp', {
        email,
        otp,
        newPassword,
      });
      setMessage(res.data.message);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-container">
      <form onSubmit={step === 1 ? sendOtp : resetPassword} className="reset-form">
        <h2 className="reset-heading">Reset Password (OTP)</h2>

        <input
          type="email"
          placeholder="Email"
          className="reset-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={step === 2}
        />

        {step === 2 && (
          <>
            <input
              type="text"
              placeholder="Enter OTP"
              className="reset-input"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="New Password"
              className="reset-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirm Password"
              className="reset-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </>
        )}

        <button className="reset-button" type="submit" disabled={loading}>
          {loading ? 'Processing...' : step === 1 ? 'Send OTP' : 'Reset Password'}
        </button>
            <button
          type="button"
          className="forgot-button back-buttton"
          onClick={() => navigate('/login')}
        >
          ← Back to Login
        </button>
        {message && <p className="reset-message">{message}</p>}
      </form>
    </div>
  );
};

export default ResetPassword;
