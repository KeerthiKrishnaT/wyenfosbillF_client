import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { jwtDecode } from 'jwt-decode';
import './LogIn.css';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState(localStorage.getItem('role') || '');
  const [dept, setDepartment] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { email, password } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/all-departments');
      if (!res.ok) throw new Error('Failed to fetch departments');
      const data = await res.json();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch departments:', err.message);
      setDepartments([]);
      setErrors(prev => [...prev, { msg: 'Failed to load departments' }]);
    }
  };

  const recordLoginTime = async (token, userId, email, role) => {
  try {
    const response = await fetch('http://localhost:5000/api/punching-times/record-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        email,
        role,
        punchIn: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to record login time');
    }

    return await response.json();
  } catch (recordError) {
    console.error('Login time recording failed:', recordError);
    setErrors(prev => [...prev, { msg: 'Login successful but time recording failed' }]);
    throw recordError;
  }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMessage('');
    setLoading(true);

    if (!email || !password) {
      setErrors([{ msg: 'Email and password are required' }]);
      setLoading(false);
      return;
    }

    if (role === 'admin' && !dept) {
      setErrors([{ msg: 'Please select a department for Admin login' }]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          role,
          ...(role === 'admin' && { department: dept }),
        }),
      });

      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || result.message || 'Login failed');
      }

      if (!result.token || typeof result.token !== 'string') {
        throw new Error('Invalid token received');
      }
      const decoded = jwtDecode(result.token);
      if (!decoded?.id) {
        throw new Error('Invalid token: Missing user ID');
      }
      localStorage.setItem('token', result.token);
      localStorage.setItem('refreshToken', result.refreshToken);
      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('role', result.user?.role || decoded.role);

      try {
      await recordLoginTime(
      result.token, 
      decoded.id,
      result.user?.email || email,
      result.user?.role || decoded.role
    );      } catch (recordError) {
          console.log(recordError);
      }

      setSuccessMessage('Login successful! Redirecting...');
      setTimeout(() => {
        navigate(result.redirectTo || '/dashboard');
      }, 1000);

    } catch (error) {
      console.error('Login error:', error);
      setErrors([{ msg: error.message || 'Login failed. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loginauth-container">
      <div className="loginauth-form">
        <h2>Login to Your Account</h2>

        {successMessage && (
          <p className="success-message">{successMessage}</p>
        )}

        {errors.map((error, index) => (
          <p key={index} className="error-message">
            {error.msg}
          </p>
        ))}

        <form onSubmit={handleSubmit}>
          <div className="loginform-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={handleChange}
              required
              autoComplete="username"
            />
          </div>

          <div className="loginform-group password-group">
            <label htmlFor="password">Password</label>
            <div className="loginpassword-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="loginpasswordicon"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="loginform-group">
            <label htmlFor="role">Login as</label>
            <select
              id="role"
              value={role}
              onChange={(e) => {
                const selectedRole = e.target.value;
                setRole(selectedRole);
                localStorage.setItem('role', selectedRole);
                if (selectedRole === 'admin') {
                  fetchDepartments();
                } else {
                  setDepartment('');
                  setDepartments([]);
                }
              }}
              required
            >
              <option value="">Select Role</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          {role === 'admin' && (
            <div className="loginform-group">
              <label htmlFor="department">Department</label>
              <select
                id="department"
                value={dept}
                onChange={(e) => setDepartment(e.target.value)}
                required
              >
                <option value="">Select Department</option>
                {departments.map((department, index) => (
                  <option key={index} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            className="loginauth-subbmit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-links">
          <p>
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
          <div>
            <Link to="/forgot-password">Forgot Password?</Link>
            <Link to="/reset-password">Reset Password</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;