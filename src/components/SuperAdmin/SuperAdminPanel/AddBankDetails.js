import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaMoneyBillWave, FaQrcode, FaUpload, FaTrash, FaEdit, FaPlus } from 'react-icons/fa';
import './AddBankDetails.css';

const AddBankDetails = () => {
  const [bankDetails, setBankDetails] = useState({
    companyName: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
    branch: '',
    ifscCode: '',
    upiId: ''
  });
  const [generateQR, setGenerateQR] = useState('combined');
  const [qrCode, setQrCode] = useState(null);
  const [previewQrCode, setPreviewQrCode] = useState('');
  const [existingDetails, setExistingDetails] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const navigate = useNavigate();

  // Helper function to construct full QR code URL
  const getFullQrCodeUrl = (qrCodeUrl) => {
    console.log('🔧 getFullQrCodeUrl input:', qrCodeUrl);
    if (!qrCodeUrl) return '';
    if (qrCodeUrl.startsWith('http')) return qrCodeUrl;
    
    // Extract filename from the path
    let filename = '';
    if (qrCodeUrl.startsWith('/uploads/bank-qr-codes/')) {
      filename = qrCodeUrl.replace('/uploads/bank-qr-codes/', '');
    } else if (qrCodeUrl.startsWith('/bank-qr-codes/')) {
      filename = qrCodeUrl.replace('/bank-qr-codes/', '');
    } else if (qrCodeUrl.includes('/')) {
      filename = qrCodeUrl.split('/').pop();
    } else {
      filename = qrCodeUrl;
    }
    
    // Use the new API route that handles CORS properly
    const fullUrl = `http://localhost:5000/api/qr-codes/${filename}`;
    console.log('🔧 getFullQrCodeUrl output:', fullUrl);
    return fullUrl;
  };

  const getLocalStorageItem = (key) => {
    try {
      const value = localStorage.getItem(key);
      return value;
    } catch (err) {
      console.error('localStorage access error:', err);
      setMessage({ type: 'error', text: 'Storage access denied. Please check browser settings.' });
      return null;
    }
  };

  const removeTokens = useCallback(() => {
    console.log('Removing tokens from localStorage');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }, []);

  const refreshAccessToken = useCallback(async () => {
    if (isRefreshingToken) return;
    setIsRefreshingToken(true);
    try {
      const storedRefreshToken = getLocalStorageItem('refreshToken');
      if (!storedRefreshToken) {
        console.error('No refresh token found in localStorage');
        setMessage({ type: 'error', text: 'No refresh token. Please log in.' });
        removeTokens();
        // Don't redirect automatically, let the user handle it
        throw new Error('No refresh token found');
      }

      console.log('Sending refresh token request with:', storedRefreshToken);
      const response = await axios.post('http://localhost:5000/api/auth/refresh-token', { refreshToken: storedRefreshToken });
      const newToken = response.data.token;
      if (!newToken) {
        throw new Error('No new token received from refresh endpoint');
      }
      localStorage.setItem('token', newToken);
      console.log('New access token stored:', newToken);
      return newToken;
    } catch (err) {
      console.error('Token refresh failed:', err.message, err.response?.data);
      throw err;
    } finally {
      setIsRefreshingToken(false);
    }
  }, [isRefreshingToken, setMessage, removeTokens]);

  const makeApiRequest = useCallback(async (config, retry = true) => {
    try {
      let token = getLocalStorageItem('token');
      if (!token) {
        console.error('No access token found in localStorage');
        setMessage({ type: 'error', text: 'No access token. Please log in.' });
        throw new Error('No authentication token found');
      }

      config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
      console.log('Making API request:', config.url);
      return await axios(config);
    } catch (error) {
      if (error.response?.status === 401 && retry) {
        console.log('Received 401, attempting to refresh token');
        try {
          const newToken = await refreshAccessToken();
          config.headers.Authorization = `Bearer ${newToken}`;
          return await axios(config);
        } catch (refreshError) {
          console.error('Refresh token failed:', refreshError);
          setMessage({ type: 'error', text: 'Session expired. Please log in again.' });
          removeTokens();
          // Don't redirect automatically, let the user handle it
          throw refreshError;
        }
      }
      console.error('API request failed:', error.response?.data || error.message);
      setMessage({ type: 'error', text: error.response?.data?.message || 'API request failed' });
      throw error;
    }
  }, [refreshAccessToken, removeTokens]);

  const fetchBankDetails = useCallback(async (companyName = '') => {
    setIsLoading(true);
    try {
      const response = await makeApiRequest({
        method: 'get',
        url: 'http://localhost:5000/api/bank-details',
        params: companyName ? { companyName } : {}
      });
      setExistingDetails(response.data || []);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'Failed to fetch bank details' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setIsLoading(false);
    }
  }, [makeApiRequest]);

  const fetchBankDetailById = async (id) => {
    setIsLoading(true);
    try {
      const response = await makeApiRequest({
        method: 'get',
        url: `http://localhost:5000/api/bank-details/${id}`
      });
      console.log('🔍 Fetched bank detail:', response.data);
      console.log('🔍 Original QR Code URL:', response.data.qrCodeUrl);
      
      setBankDetails(response.data);
      // Set QR code URL with proper server address
      const fullQrCodeUrl = getFullQrCodeUrl(response.data.qrCodeUrl);
      console.log('🔍 Full QR Code URL:', fullQrCodeUrl);
      setPreviewQrCode(fullQrCodeUrl);
      setIsEditing(true);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'Failed to fetch bank detail' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = getLocalStorageItem('token');
    const role = (localStorage.getItem('role') || '').toLowerCase();
    console.log('Checking tokens on mount:', { token: !!token, role });
    if (!token || role !== 'superadmin') {
      setMessage({ type: 'error', text: 'Please log in to access this page.' });
      return;
    }
    // Only fetch if we have valid authentication
    if (token && role === 'superadmin') {
      fetchBankDetails();
    }
  }, [fetchBankDetails]);

  useEffect(() => {
    return () => {
      if (previewQrCode) {
        URL.revokeObjectURL(previewQrCode);
      }
    };
  }, [previewQrCode]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBankDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleQrCodeUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (previewQrCode) {
        URL.revokeObjectURL(previewQrCode);
      }
      setQrCode(file);
      setPreviewQrCode(URL.createObjectURL(file));
    }
  };

  const handleAdd = () => {
    setIsEditing(false);
    setBankDetails({
      companyName: '',
      bankName: '',
      accountNumber: '',
      accountName: '',
      branch: '',
      ifscCode: '',
      upiId: ''
    });
    if (previewQrCode) {
      URL.revokeObjectURL(previewQrCode);
    }
    setPreviewQrCode('');
    setQrCode(null);
  };

  const handleEdit = (detail) => {
    fetchBankDetailById(detail.id || detail._id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formData = new FormData();
      Object.entries(bankDetails).forEach(([key, value]) => {
        formData.append(key, value);
      });
      if (qrCode) {
        formData.append('qrCode', qrCode);
      }
      // Add QR code generation preference
      formData.append('generateQR', generateQR);

      await makeApiRequest({
        method: isEditing ? 'put' : 'post',
        url: isEditing 
          ? `http://localhost:5000/api/bank-details/${bankDetails.id || bankDetails._id}`
          : 'http://localhost:5000/api/bank-details',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage({ type: 'success', text: isEditing ? 'Bank details updated!' : 'Bank details saved!' });
      handleAdd();
      fetchBankDetails();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to save bank details' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setIsLoading(true);
    try {
      await makeApiRequest({
        method: 'delete',
        url: `http://localhost:5000/api/bank-details/${id}`
      });
      setMessage({ type: 'success', text: 'Bank details deleted!' });
      fetchBankDetails();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to delete bank details' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQR = async (id, type = 'combined') => {
    setIsLoading(true);
    try {
      await makeApiRequest({
        method: 'post',
        url: `http://localhost:5000/api/bank-details/${id}/generate-qr`,
        data: { type },
        headers: { 'Content-Type': 'application/json' }
      });

      setMessage({ type: 'success', text: `${type.toUpperCase()} QR code generated successfully!` });
      fetchBankDetails();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to generate QR code' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bank-details-container">
     <div className="back-button-wrapper">
    <button className="back-btn" onClick={() => navigate(-1)}>
      ← Back
    </button>
  </div>
      <h2><FaMoneyBillWave /> {isEditing ? 'Update Bank Details' : 'Add Bank Details'}</h2>
      
      {message.text && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      {isLoading && <div className="loading">Loading...</div>}

      <form onSubmit={handleSubmit} className="bank-details-form">
        <div className="input-row">
          <div className="form-group">
            <label>Company Name</label>
            <input type="text" name="companyName" value={bankDetails.companyName} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label>Bank Name</label>
            <input type="text" name="bankName" value={bankDetails.bankName} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label>Account Number</label>
            <input type="text" name="accountNumber" value={bankDetails.accountNumber} onChange={handleInputChange} required />
          </div>
        </div>

        <div className="input-row">
          <div className="form-group">
            <label>Account Name</label>
            <input type="text" name="accountName" value={bankDetails.accountName} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label>Branch</label>
            <input type="text" name="branch" value={bankDetails.branch} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label>IFSC Code</label>
            <input type="text" name="ifscCode" value={bankDetails.ifscCode} onChange={handleInputChange} required />
          </div>
        </div>

        <div className="input-row">
          <div className="form-group">
            <label>UPI ID</label>
            <input type="text" name="upiId" value={bankDetails.upiId} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>QR Code Generation</label>
            <select 
              value={generateQR} 
              onChange={(e) => setGenerateQR(e.target.value)}
              disabled={!!qrCode}
            >
              <option value="combined">Auto Generate Combined (UPI + Bank)</option>
              <option value="upi">Auto Generate UPI Only</option>
              <option value="bank">Auto Generate Bank Account Only</option>
              <option value="none">Manual Upload Only</option>
            </select>
            {qrCode && (
              <small style={{ color: '#666', fontSize: '12px' }}>
                Manual upload selected - auto generation disabled
              </small>
            )}
          </div>
        </div>

        <div className="input-row">
          <div className="form-group qr-code-upload">
            <label>QR Code for Payments <FaQrcode /></label>
           <div className="qr-code-preview">
  {previewQrCode ? (
    <>
      <div className="qr-preview-container">
        <img src={previewQrCode} alt="QR Code" />
        <button
          className="remove-qr-btn"
          onClick={() => {
            setPreviewQrCode('');
            setQrCode(null);
          }}
          title="Remove QR"
        >
        <i className="fa-solid fa-xmark"></i>       
 </button>
      </div>
      <label className="upload-btn">
        <FaUpload /> Change QR Code
        <input type="file" accept="image/*" onChange={handleQrCodeUpload} style={{ display: 'none' }} />
      </label>
    </>
  ) : (
    <label className="upload-btn">
      <FaUpload /> Upload QR Code
      <input type="file" accept="image/*" onChange={handleQrCodeUpload} style={{ display: 'none' }} />
    </label>
  )}
</div>

          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="subbmit-btn" disabled={isLoading}>
            {isEditing ? 'Update Details' : 'Save Details'}
          </button>
        </div>
      </form>

      <div className="saved-details">
        <h3>Saved Bank Details</h3>
        <button onClick={handleAdd} className="add-btn" disabled={isLoading}>
          <FaPlus /> Add New
        </button>
        {existingDetails.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Bank Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {existingDetails.map(detail => (
                <tr key={detail.id || detail._id || detail.companyName}>
                  <td>{detail.companyName}</td>
                  <td>{detail.bankName}</td>
                  <td>
                    <button onClick={() => handleEdit(detail)} className="edit-btn" disabled={isLoading}>
                      <FaEdit /> Edit
                    </button>
                    <button onClick={() => handleDelete(detail.id || detail._id)} className="delete-btn" disabled={isLoading}>
                      <FaTrash /> Delete
                    </button>
                    <div className="qr-actions">
                      <button 
                        onClick={() => handleGenerateQR(detail.id || detail._id, 'combined')} 
                        className="generate-qr-btn" 
                        disabled={isLoading}
                        title="Generate Combined QR"
                      >
                        <FaQrcode /> Combined
                      </button>
                      <button 
                        onClick={() => handleGenerateQR(detail.id || detail._id, 'upi')} 
                        className="generate-qr-btn" 
                        disabled={isLoading}
                        title="Generate UPI QR"
                      >
                        <FaQrcode /> UPI
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No bank details found.</p>
        )}
      </div>
    </div>
  );
};

export default AddBankDetails;