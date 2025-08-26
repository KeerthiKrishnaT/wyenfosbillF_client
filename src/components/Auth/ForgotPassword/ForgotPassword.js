import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaSpinner, FaArrowLeft, FaLock, FaEnvelope, FaEye, FaEyeSlash, FaUser, FaShieldAlt } from 'react-icons/fa';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [requestType, setRequestType] = useState(''); // 'password' or 'email'
  const [formData, setFormData] = useState({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    currentEmail: '',
    newEmail: '',
    confirmEmail: '',
    reason: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Add state for password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validatePasswordForm = () => {
    if (!formData.email || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setErrorMessage('All fields are required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrorMessage('Please enter a valid email address');
      return false;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setErrorMessage('New passwords do not match');
      return false;
    }
    if (formData.newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const validateEmailForm = () => {
    if (!formData.currentEmail || !formData.newEmail || !formData.confirmEmail) {
      setErrorMessage('All email fields are required');
      return false;
    }
    if (formData.newEmail !== formData.confirmEmail) {
      setErrorMessage('New emails do not match');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.newEmail)) {
      setErrorMessage('Please enter a valid new email address');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!requestType) {
      setErrorMessage('Please select a request type');
      return;
    }

    let isValid = false;
    if (requestType === 'password') {
      isValid = validatePasswordForm();
    } else if (requestType === 'email') {
      isValid = validateEmailForm();
    }

    if (!isValid) return;

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const requestData = {
        type: requestType,
        email: requestType === 'password' ? formData.email : null,
        currentPassword: requestType === 'password' ? formData.currentPassword : null,
        newPassword: requestType === 'password' ? formData.newPassword : null,
        confirmPassword: requestType === 'password' ? formData.confirmPassword : null,
        currentEmail: requestType === 'email' ? formData.currentEmail : null,
        newEmail: requestType === 'email' ? formData.newEmail : null,
        confirmEmail: requestType === 'email' ? formData.confirmEmail : null,
        reason: formData.reason,
        requestDate: new Date().toISOString(),
        status: 'pending'
      };

      console.log('Sending request data:', requestData);

      const response = await fetch('/api/forgot-password/change-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const responseText = await response.text();
      console.log('Response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        console.error('Failed to parse response:', error);
        setErrorMessage('Server response error');
        return;
      }

      if (data.success) {
        setSuccessMessage('Request submitted successfully! Super admin will review and notify you.');
        setFormData({
          email: '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          currentEmail: '',
          newEmail: '',
          confirmEmail: '',
          reason: ''
        });
        setRequestType('');
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      } else {
        setErrorMessage(data.message || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Request submission error:', error);
      setErrorMessage('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRequestType('');
    setFormData({
      email: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      currentEmail: '',
      newEmail: '',
      confirmEmail: '',
      reason: ''
    });
    setErrorMessage('');
    setSuccessMessage('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-wrapper">
        {/* Header Section */}
        <div className="forgot-password-header">
          <div className="logo-section">
            <div className="header-text">
              <h1>Account Change Request</h1>
              <p>Request password or email changes for your account</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="forgot-password-content">
          {/* Request Type Selection */}
          <div className="request-type-section">
            <h2>Select Request Type</h2>
            <div className="request-type-cards">
              <div 
                className={`request-card ${requestType === 'password' ? 'active' : ''}`}
                onClick={() => setRequestType('password')}
              >
                <div className="card-icon">
                  <FaShieldAlt />
                </div>
                <div className="card-content">
                  <h3>Password Reset</h3>
                  <p>Change your account password</p>
                </div>
                <div className="card-check">
                  {requestType === 'password' && <span>✓</span>}
                </div>
              </div>

              <div 
                className={`request-card ${requestType === 'email' ? 'active' : ''}`}
                onClick={() => setRequestType('email')}
              >
                <div className="card-icon">
                  <FaUser />
                </div>
                <div className="card-content">
                  <h3>Email Reset</h3>
                  <p>Change your email address</p>
                </div>
                <div className="card-check">
                  {requestType === 'email' && <span>✓</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          {errorMessage && (
            <div className="message error-message">
              <div className="message-icon">⚠️</div>
              <div className="message-text">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="message success-message">
              <div className="message-icon">✅</div>
              <div className="message-text">{successMessage}</div>
            </div>
          )}

          {/* Form Section */}
          {requestType && (
            <div className="form-section">
              <form onSubmit={handleSubmit} className="change-request-form">
                {/* Password Reset Form */}
                {requestType === 'password' && (
                  <div className="form-content">
                    <div className="form-header">
                      <h3><FaLock /> Password Reset Request</h3>
                      <p>Please provide your current credentials and new password</p>
                    </div>

                    <div className="form-grid">
                      <div className="form-group full-width">
                        <label htmlFor="email">Email Address</label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="Enter your email address"
                          required
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="currentPassword">Current Password</label>
                        <div className="password-input-group">
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            id="currentPassword"
                            name="currentPassword"
                            value={formData.currentPassword}
                            onChange={handleInputChange}
                            placeholder="Current password"
                            required
                            disabled={isSubmitting}
                          />
                          <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            disabled={isSubmitting}
                          >
                            {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="newPassword">New Password</label>
                        <div className="password-input-group">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            id="newPassword"
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleInputChange}
                            placeholder="New password"
                            required
                            disabled={isSubmitting}
                          />
                          <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            disabled={isSubmitting}
                          >
                            {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <div className="password-input-group">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            placeholder="Confirm new password"
                            required
                            disabled={isSubmitting}
                          />
                          <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            disabled={isSubmitting}
                          >
                            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                      </div>

                      <div className="form-group full-width">
                        <label htmlFor="reason">Reason for Change</label>
                        <textarea
                          id="reason"
                          name="reason"
                          value={formData.reason}
                          onChange={handleInputChange}
                          placeholder="Please provide a reason for the password change"
                          rows="3"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Email Reset Form */}
                {requestType === 'email' && (
                  <div className="form-content">
                    <div className="form-header">
                      <h3><FaEnvelope /> Email Reset Request</h3>
                      <p>Please provide your current email and new email address</p>
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label htmlFor="currentEmail">Current Email</label>
                        <input
                          type="email"
                          id="currentEmail"
                          name="currentEmail"
                          value={formData.currentEmail}
                          onChange={handleInputChange}
                          placeholder="Current email address"
                          required
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="newEmail">New Email</label>
                        <input
                          type="email"
                          id="newEmail"
                          name="newEmail"
                          value={formData.newEmail}
                          onChange={handleInputChange}
                          placeholder="New email address"
                          required
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="confirmEmail">Confirm New Email</label>
                        <input
                          type="email"
                          id="confirmEmail"
                          name="confirmEmail"
                          value={formData.confirmEmail}
                          onChange={handleInputChange}
                          placeholder="Confirm new email address"
                          required
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="form-group full-width">
                        <label htmlFor="reason">Reason for Change</label>
                        <textarea
                          id="reason"
                          name="reason"
                          value={formData.reason}
                          onChange={handleInputChange}
                          placeholder="Please provide a reason for the email change"
                          rows="3"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="form-actions">
                  <button
                    type="submit"
                    className={`submit-button ${isSubmitting ? 'loading' : ''}`}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <FaSpinner className="spinner" />
                        Submitting Request...
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </button>
                  
                  <button
                    type="button"
                    className="reset-button"
                    onClick={resetForm}
                    disabled={isSubmitting}
                  >
                    Reset Form
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Footer */}
          <div className="forgot-password-footer">
            <Link to="/login" className="back-link">
              <FaArrowLeft />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;