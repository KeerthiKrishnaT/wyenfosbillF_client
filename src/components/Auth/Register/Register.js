import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaSpinner, FaGoogle } from 'react-icons/fa';
import logo from '../../../assets/images/Wyenfos_bills_logo.png';
import { useAuth } from '../../../contexts/AuthContext';
import './Register.css';

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    department: ''
  });
  const [errors, setErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { signup, signInWithGoogle } = useAuth();

  const { name, email, password, confirmPassword, role, department } = formData;

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const validateForm = () => {
    const newErrors = [];
    
    if (!name.trim()) {
      newErrors.push({ msg: 'Full name is required' });
    }
    
    if (!email.trim()) {
      newErrors.push({ msg: 'Email is required' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.push({ msg: 'Please enter a valid email address' });
    }
    
    if (!password) {
      newErrors.push({ msg: 'Password is required' });
    } else if (password.length < 6) {
      newErrors.push({ msg: 'Password must be at least 6 characters' });
    }
    
    if (password !== confirmPassword) {
      newErrors.push({ msg: 'Passwords do not match' });
    }
    
    if (!role) {
      newErrors.push({ msg: 'Please select a role' });
    }
    
    if (role === 'admin' && !department) {
      newErrors.push({ msg: 'Please select a department for Admin registration' });
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors([]);
    setSuccessMessage('');

    try {
      const userData = {
        displayName: name,
        role: role,
        department: role === 'admin' ? department : null,
        email: email,
        isActive: true
      };

      await signup(email, password, userData);

      setSuccessMessage('Registration successful! Redirecting to login...');
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'user',
        department: ''
      });

      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'Registration failed. Please try again.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Email already registered. Please use a different email or try logging in.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters long.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled. Please contact support.';
          break;
        default:
          errorMessage = error.message || 'Registration failed. Please try again.';
      }
      
      setErrors([{ msg: errorMessage }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsSubmitting(true);
    setErrors([]);
    setSuccessMessage('');

    try {
      await signInWithGoogle();
      
      setSuccessMessage('Google registration successful! Redirecting to dashboard...');
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Google sign-up error:', error);
      setErrors([{ msg: 'Google sign-up failed. Please try again.' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <div className="register-header">
        <img src={logo} alt="Logo" className="logo" />     
          <h2>Create Your Account</h2>
          <p>Join us today</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          {errors.length > 0 && (
            <div className="error-container">
              {errors.map((error, index) => (
                <div key={index} className="error-message">
                  {error.msg}
                </div>
              ))}
            </div>
          )}

          {successMessage && (
            <div className="success-message">
              {successMessage}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-input">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={role}
              onChange={handleChange}
              required
            >
              <option value="">Select Role</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {role === 'admin' && (
            <div className="form-group">
              <label htmlFor="department">Department</label>
              <select
                id="department"
                value={department}
                onChange={handleChange}
                required
              >
                <option value="">Select Department</option>
                <option value="hr">HR</option>
                <option value="marketing">Marketing</option>
                <option value="accounts">Accounts</option>
                <option value="purchasing">Purchasing</option>
                <option value="digital-marketing">Digital Marketing</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className={`register-btn ${isSubmitting ? 'loading' : ''}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <FaSpinner className="spinner" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>

          <div className="divider">
            <span>or</span>
          </div>

          <button
            type="button"
            className="google-btn"
            onClick={handleGoogleSignUp}
            disabled={isSubmitting}
          >
            <FaGoogle />
            Sign up with Google
          </button>

          <div className="register-links">
            <Link to="/login" className="login-link">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;