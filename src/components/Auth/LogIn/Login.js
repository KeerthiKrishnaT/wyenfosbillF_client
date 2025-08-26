import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaSpinner, FaGoogle } from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';
import logo from '../../../assets/images/Wyenfos_bills_logo.png';
import './LogIn.css';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState((localStorage.getItem('role') || '').toLowerCase());
  const [dept, setDepartment] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showButterfly, setShowButterfly] = useState(false);
  const navigate = useNavigate();
  const { login, signInWithGoogle, userProfile } = useAuth();
  const { email, password } = formData;

  useEffect(() => {
    const emailInput = document.getElementById('email');
    if (emailInput) {
      emailInput.focus();
    }
  }, []);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const validateForm = () => {
    const newErrors = [];
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
    if (!role) {
      newErrors.push({ msg: 'Please select a role' });
    }
    if (role === 'admin' && !dept) {
      newErrors.push({ msg: 'Please select a department for Admin login' });
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
      // Login with Firebase
      const result = await login(email, password);

      // Normalize role/department for consistent comparisons and storage
      let normalizedRole = (role || '').toLowerCase().replace(/[ _]/g, '');
      let normalizedDept = (dept || '')
        .toLowerCase()
        .replace(/[ _]+/g, '-') // unify spaces/underscores to hyphen
        .trim();
      
      // Check if user profile exists and has the required role
      if (userProfile) {
        const userRole = userProfile.role?.toLowerCase().replace(/[ _]/g, '');
        
        // Allow super_admin to access any admin panel
        if (userRole === 'super_admin' || userRole === 'superadmin') {
          // Super admin can access any role, so we'll use their actual role
          normalizedRole = userRole;
          normalizedDept = userProfile.department?.toLowerCase().replace(/[ _]+/g, '-').trim() || '';
        } else if (userRole !== normalizedRole) {
          throw new Error(`Invalid role for this user. Your account role is: ${userProfile.role}`);
        }
        
        if (normalizedRole === 'admin' || normalizedRole === 'purchaseadmin' || normalizedRole === 'purchase_admin' || (userRole === 'super_admin' && normalizedRole === 'admin')) {
          const userDept = (userProfile.department || '')
            .toLowerCase()
            .replace(/[ _]+/g, '-')
            .trim();
          // Handle department name variations
          const departmentMapping = {
            'purchase': 'purchase',
            'purchasing': 'purchase',
            'Purchase': 'purchase',
            'Purchasing': 'purchase'
          };
          const normalizedUserDept = departmentMapping[userDept] || userDept;
          if (!userDept || normalizedUserDept !== normalizedDept) {
            throw new Error(`Invalid department for this admin user. Your department is: ${userProfile.department}`);
          }
        }
      }

      // Store user info in localStorage for backend auth
      const tokenToStore = result.idToken || result.user.accessToken;
      localStorage.setItem('token', tokenToStore);
      localStorage.setItem('role', normalizedRole);
      localStorage.setItem('dept', normalizedDept);
      localStorage.setItem('email', email);
      localStorage.setItem('userId', result.user.uid);
      
      setSuccessMessage('Login successful! Redirecting...');
      setShowButterfly(true);
      
      // Determine route based on role and department
      let targetRoute = '/dashboard'; // default
      
      if (normalizedRole === 'superadmin' || normalizedRole === 'super_admin') {
        targetRoute = '/super-admin';
      } else if (normalizedRole === 'admin' || normalizedRole === 'purchaseadmin' || normalizedRole === 'purchase_admin') {
        switch (normalizedDept) {
          case 'accounts':
            targetRoute = '/admin';
            break;
          case 'hr':
            targetRoute = '/hr-admin';
            break;
          case 'marketing':
            targetRoute = '/marketing-admin';
            break;
          case 'digital-marketing':
            targetRoute = '/digital-marketing-admin';
            break;
          case 'purchase':
          case 'purchasing':
            targetRoute = '/purchasing-admin';
            break;
          default:
            targetRoute = '/dashboard';
        }
      } else {
        targetRoute = '/dashboard';
      }
      
      // Show butterfly animation briefly before navigation
      setTimeout(() => {
        setShowButterfly(false);
        navigate(targetRoute);
      }, 1000);

    } catch (error) {
      let errorMessage = 'Login failed. Please try again.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/Password sign-in is disabled. Enable it in Firebase Console → Authentication → Sign-in method.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid credentials. If you recently reset your password, please wait a few minutes and try again.';
          break;
        case 'auth/user-token-expired':
          errorMessage = 'Your session has expired. Please log in again.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection and try again.';
          break;
        default:
          // Check if it's a password reset related issue
          if (error.message && error.message.includes('password')) {
            errorMessage = 'Password authentication failed. If you recently reset your password, please wait a few minutes before trying again.';
          } else {
            errorMessage = error.message || 'Login failed. Please try again.';
          }
      }
      
      setErrors([{ msg: errorMessage }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrors([]);
    setSuccessMessage('');

    try {
      const result = await signInWithGoogle();
      
      // Store user info in localStorage for backend auth
      const tokenToStore = result?.idToken || result.user.accessToken;
      localStorage.setItem('token', tokenToStore);
      localStorage.setItem('email', result.user.email);
      localStorage.setItem('userId', result.user.uid);
      
      // Set default role for Google sign-in (you might want to prompt user to select role)
      const defaultRole = 'user';
      localStorage.setItem('role', defaultRole);

      setSuccessMessage('Google login successful! Redirecting...');
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (error) {
      console.error('Google sign-in error:', error);
      setErrors([{ msg: 'Google sign-in failed. Please try again.' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = (e) => {
    const nextRole = (e.target.value || '').toLowerCase().replace(/[ _]/g, '');
    setRole(nextRole);
    setDepartment('');
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
        <img src={logo} alt="Logo" className="logo" />     
             <h2>Welcome Back</h2>
          <h3>Sign in to your account</h3>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
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
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
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
                onKeyPress={handleKeyPress}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={role}
              onChange={handleRoleChange}
              required
            >
              <option value="">Select Role</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>

          {role === 'admin' && (
            <div className="form-group">
              <label htmlFor="department">Department</label>
              <select
                id="department"
                value={dept}
                onChange={(e) => setDepartment(e.target.value)}
                required
              >
                <option value="">Select Department</option>
                <option value="hr">HR</option>
                <option value="marketing">Marketing</option>
                <option value="accounts">Accounts</option>
                <option value="purchase">Purchase</option>
                <option value="digital-marketing">Digital Marketing</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className={`login-btn ${isSubmitting ? 'loading' : ''}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <FaSpinner className="spinner" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          <div className="divider">
            <span>or</span>
          </div>

          <button
            type="button"
            className="google-btn"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
          >
            <FaGoogle />
            Sign in with Google
          </button>

          <div className="login-links">
            <Link to="/forgot-password" className="forgot-password">
              Forgot Password?
            </Link>
            <Link to="/register" className="register-link">
              Don't have an account? Sign up
            </Link>
          </div>
        </form>
      </div>

      {showButterfly && (
        <img
          src="https://cdn.pixabay.com/animation/2023/03/05/21/13/21-13-51-872_512.gif"
          alt="Butterfly Animation"
          className="butterfly-gif-animation"
          style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '120px',
            zIndex: 1000,
            pointerEvents: 'none',
            animation: 'fly 1.5s linear'
          }}
        />
      )}
    </div>
  );
};

export default Login;