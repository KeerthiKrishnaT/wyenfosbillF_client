import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import './Register.css';

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const { name, email, password, confirmPassword } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    console.log('Form data updated:', { ...formData, [e.target.id]: e.target.value }); // Debug log
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMessage('');
    console.log('Submitting payload:', { name, email, password, confirmPassword }); // Debug log
    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirmPassword })
      });
      const result = await response.json();
      console.log('Backend response:', result); // Debug log
      if (result.success) {
        console.log('Registration successful:', result);
        setSuccessMessage('Registration successful! Redirecting to login...');
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: ''
        }); // Clear form inputs
        setTimeout(() => navigate('/login'), 2000); // Redirect after 2 seconds
      } else {
        console.error('Registration failed:', result.errors || result.message);
        if (result.errors) {
          setErrors(result.errors); // Display validation errors
        }
      }
    } catch (error) {
      console.error('Network error:', error);
      setErrors([{ msg: 'Network error, please try again' }]);
    }
  };

  return (
    <div className="register-container">
      <div className="register-form">
        <h2>Create Your Account</h2>
        {successMessage && (
          <div style={{ color: 'green', marginBottom: '10px', textAlign: 'center' }}>
            {successMessage}
          </div>
        )}
        {errors.length > 0 && (
          <div className="error-messages">
            {errors.map((error, index) => (
              <p key={index} style={{ color: 'red', textAlign: 'center' }}>{error.msg}</p>
            ))}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="registerform-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="registerform-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="registerform-group password-group">
            <label htmlFor="password">Password</label>
            <div className="registerpassword-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={handleChange}
                required
              />
              <span
                className="registerpassword-toggle-icon"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>
          <div className="registerform-group password-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="registerpassword-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={handleChange}
                required
              />
              <span
                className="registerpassword-toggle-icon"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>
          <button type="submit" className="registerauth-button" onSubmit={handleSubmit}>Register</button>
        </form>
        <p className="registerauth-switch">
  <span className="registertext-black">Already have an account? </span>
  <Link to="/login" className="login-link">Login here</Link>
</p>
      </div>
    </div>
  );
};

export default Register;