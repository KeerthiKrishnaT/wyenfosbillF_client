import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AddCompanyPage.css';
import { jwtDecode } from 'jwt-decode';

const AddCompanyPage = ({ refreshCompanies }) => {
  const [companies, setCompanies] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    prefix: '',
    address: '',
    mobile: '',
    email: '',
    website: '',
    GSTIN: '',
    state: '',
    stateCode: '',
    primaryLogo: null,
    secondaryLogo: null,
    type: 'MAIN',
  });
  const [logoPreview, setLogoPreview] = useState('');
  const [secondaryLogoPreview, setSecondaryLogoPreview] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [blobUrls, setBlobUrls] = useState([]);
  const navigate = useNavigate();

  const validateToken = (token) => {
    try {
      const payload = jwtDecode(token);
      return payload && payload.role === 'super_admin' && payload.exp > Math.floor(Date.now() / 1000);
    } catch (error) {
      return false;
    }
  };

  const fetchCompanies = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !validateToken(token)) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      const response = await axios.get('http://localhost:5000/api/companies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Fetched companies:', response.data.companies);
      setCompanies(response.data.companies || response.data);
      if (refreshCompanies) refreshCompanies();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to load companies' });
    }
  }, [refreshCompanies, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name } = e.target;
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, [name]: file }));
      if (name === 'primaryLogo') setLogoPreview(previewUrl);
      if (name === 'secondaryLogo') setSecondaryLogoPreview(previewUrl);
      setBlobUrls((prev) => [...prev, previewUrl]);
    }
  };

  useEffect(() => {
    fetchCompanies();
    return () => {
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [blobUrls, fetchCompanies]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('handleSubmit triggered', { isEditing, editingId, formData });

    if (!formData.prefix.trim()) {
      setMessage({ type: 'error', text: 'Company prefix is required and cannot be empty' });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token || !validateToken(token)) {
      localStorage.removeItem('token');
      navigate('/login');
      return;
    }

    const formDataToSend = new FormData();
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== null) {
        formDataToSend.append(key, formData[key] instanceof File ? formData[key] : formData[key] || '');
      }
    });

    try {
      if (isEditing) {
        console.log('Sending PUT request to', `/api/companies/${editingId}`);
        const response = await axios.put(`http://localhost:5000/api/companies/${editingId}`, formDataToSend, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
        console.log('Update response:', response.data);
        setMessage({ type: 'success', text: `Company "${formData.name}" updated successfully on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}!` });
      } else {
        await axios.post('http://localhost:5000/api/companies', formDataToSend, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
        setMessage({ type: 'success', text: `Company "${formData.name}" added successfully on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}!` });
      }

      resetForm();
      fetchCompanies();
    } catch (error) {
      console.error('Error in handleSubmit:', error.response?.data || error.message);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save company' });
    }
  };

  const handleEdit = (company) => {
    console.log('Editing company:', company);
    setFormData({
      name: company.name,
      prefix: company.prefix || '',
      address: company.address || '',
      mobile: company.mobile || '',
      email: company.email || '',
      website: company.website || '',
      GSTIN: company.GSTIN || '',
      state: company.state || '',
      stateCode: company.stateCode || '',
      primaryLogo: null,
      secondaryLogo: null,
      type: company.type || 'MAIN',
    });
    setLogoPreview(company.logoUrl ? `http://localhost:5000${company.logoUrl}` : '');
    setSecondaryLogoPreview(company.secondaryLogoUrl ? `http://localhost:5000${company.secondaryLogoUrl}` : '');
    setIsEditing(true);
    setEditingId(company._id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this company?')) return;

    const token = localStorage.getItem('token');
    if (!token || !validateToken(token)) {
      localStorage.removeItem('token');
      navigate('/login');
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/api/companies/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage({ type: 'success', text: 'Company deleted!' });
      fetchCompanies();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to delete company' });
    }
  };

  const resetForm = () => {
    blobUrls.forEach((url) => URL.revokeObjectURL(url));
    setBlobUrls([]);
    setFormData({
      name: '',
      prefix: '',
      address: '',
      mobile: '',
      email: '',
      website: '',
      GSTIN: '',
      state: '',
      stateCode: '',
      primaryLogo: null,
      secondaryLogo: null,
      type: 'MAIN',
    });
    setLogoPreview('');
    setSecondaryLogoPreview('');
    setIsEditing(false);
    setEditingId(null);
  };

  return (
    <div className="add-company-container">
      <h2>{isEditing ? 'Edit Company' : 'Company Management'}</h2>

      {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

      <form onSubmit={handleSubmit} className="company-form">
        <div className="form-group">
          <label>Company Name:</label>
          <input type="text" name="name" value={formData.name} onChange={handleInputChange} required />
        </div>

        <div className="form-group">
          <label>Company Prefix:</label>
          <input type="text" name="prefix" value={formData.prefix} onChange={handleInputChange} required />
        </div>

        <div className="form-group">
          <label>Address:</label>
          <textarea name="address" value={formData.address} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label>Mobile:</label>
          <input type="text" name="mobile" value={formData.mobile} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label>Email:</label>
          <input type="email" name="email" value={formData.email} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label>Website:</label>
          <input type="text" name="website" value={formData.website} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label>GSTIN:</label>
          <input type="text" name="GSTIN" value={formData.GSTIN} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label>State:</label>
          <input type="text" name="state" value={formData.state} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label>State Code:</label>
          <input type="text" name="stateCode" value={formData.stateCode} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label>Company Type:</label>
          <select name="type" value={formData.type} onChange={handleInputChange}>
            <option value="MAIN">MAIN</option>
            <option value="INFOTECH">INFOTECH</option>
            <option value="GOLD">GOLD</option>
            <option value="ADS">ADS</option>
            <option value="CASH">CASH</option>
          </select>
        </div>

        <div className="form-group">
          <label>Primary Logo:</label>
          <input type="file" name="primaryLogo" accept="image/*" onChange={handleFileChange} />
          {logoPreview && <img src={logoPreview} alt="Logo" className="preview-logo" />}
        </div>

        <div className="form-group">
          <label>Secondary Logo:</label>
          <input type="file" name="secondaryLogo" accept="image/*" onChange={handleFileChange} />
          {secondaryLogoPreview && <img src={secondaryLogoPreview} alt="Logo2" className="preview-logo" />}
        </div>

        <div className="form-action">
          <button type="submit" className="save-btn">{isEditing ? 'Update Company' : 'Create Company'}</button>
          <button type="button" className="remove-btn" onClick={resetForm}>Cancel</button>
          <button className="back-btn" onClick={() => navigate(-1)}>
            <i className="fa-solid fa-backward"></i>
          </button>
        </div>
      </form>

      <div className="companies-list-section">
        <h3>Existing Companies</h3>
        {companies.length === 0 ? (
          <p>No companies found</p>
        ) : (
          <table className="companies-table">
            <thead>
              <tr>
                <th>Logos</th>
                <th>Details</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => {
                console.log('Company data in table:', company);
                return (
                  <tr key={company._id}>
                    <td>
                      {company.logoUrl && <img src={`http://localhost:5000${company.logoUrl}`} alt="Logo" className="company-logo-img" />}
                      <br />
                      {company.secondaryLogoUrl && <img src={`http://localhost:5000${company.secondaryLogoUrl}`} alt="Logo2" className="company-logo-img" />}
                    </td>
                    <td>
                      <strong>{company.name}</strong><br />
                      📞 {company.mobile || 'N/A'}<br />
                      📧 {company.email || 'N/A'}<br />
                      🌐 {company.website || 'N/A'}<br />
                      🏷 {company.type || 'N/A'}<br />
                      GSTIN: {company.GSTIN || 'N/A'}<br />
                      State: {company.state || 'N/A'}<br />
                      State Code: {company.stateCode || 'N/A'}<br />
                    </td>
                    <td>
                      <button className="edit-btn" onClick={() => handleEdit(company)}>Edit</button>
                      <button className="delete-btn" onClick={() => handleDelete(company._id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AddCompanyPage;