import React, { useState, useEffect, useCallback } from 'react';
import { getLogoUrl } from '../utils/companyHelpers.js';
import defaultLogo from '../../../../assets/images/Wyenfos_bills_logo.png';
import './CompanyHeader.css';
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Token expired, redirect to login
      console.log('Token expired, redirecting to login...');
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

const BILL_TYPES = {
  CASH_BILL: { title: 'CASH BILL' },
  CREDIT_BILL: { title: 'CREDIT BILL' },
  CREDIT_NOTE: { title: 'CREDIT NOTE' },
  DEBIT_NOTE: { title: 'DEBIT NOTE' },
  PAYMENT_RECEIPT: { title: 'PAYMENT RECEIPT' },
  QUOTATION: { title: 'QUOTATION' },
};

const CompanyHeader = ({ 
  billType = '', 
  billDetails = {},
  selectedCompany = null,
  showBankDetails = true
}) => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);

  const currentBillType = BILL_TYPES[billType] || BILL_TYPES.CASH_BILL;

  const generateInvoiceNumber = () => {
    if (billDetails.invoiceNumber) {
      return billDetails.invoiceNumber;
    }
    const prefix = company?.prefix || currentBillType.title.substring(0, 2);
    return `${prefix}-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`;
  };

  const fetchBankDetails = useCallback(async (companyName) => {
  if (!companyName) return;
  
  try {
    const response = await api.get('/bank-details', {
      params: { companyName: companyName },
    });
    const data = response.data;
    if (data) {
      setBankDetails({
        bankName: data.bankName || '',
        accountNumber: data.accountNumber || '',
        ifsc: data.ifsc || '',
        swiftCode: data.swiftCode || '',
        branch: data.branch || '',
        upiId: data.upiId || '',
      });
    }
  } catch (error) {
    console.error('Error fetching bank details:', error.response?.data || error.message);
  }
}, []);

  // Set company from props
  useEffect(() => {
    console.log('CompanyHeader - selectedCompany:', selectedCompany);
    if (selectedCompany && selectedCompany.name) {
      setCompany(selectedCompany);
      setLoading(false);
      setError(null);
      console.log('CompanyHeader - Company set successfully:', {
        name: selectedCompany.name,
        prefix: selectedCompany.prefix,
        logo: selectedCompany.logo || selectedCompany.logoUrl,
        address: selectedCompany.address,
        mobile: selectedCompany.mobile,
        email: selectedCompany.email,
        website: selectedCompany.website,
        GSTIN: selectedCompany.GSTIN
      });
    } else {
      console.log('CompanyHeader - No valid company data:', selectedCompany);
      setError('No company selected or invalid company data');
      setLoading(false);
    }
  }, [selectedCompany]);

  // Fetch bank details when company changes
  useEffect(() => {
    if (company?.name) {
      fetchBankDetails(company.name);
    }
  }, [company?.name, fetchBankDetails]);



  
  if (loading) return <div className="loading-message">Loading company details...</div>;
  if (error) return (
    <div className="error-message">
      <h3>Company Header Error</h3>
      <p>{error}</p>
      <p>Please ensure you have selected a company before accessing this page.</p>
    </div>
  );
  if (!company) return (
    <div className="error-message">
      <h3>No Company Data</h3>
      <p>No company information is available.</p>
      <p>Please select a company from the dashboard.</p>
    </div>
  );

  const logo = getLogoUrl(company.logo || company.logoUrl, company.name);
  const secondaryLogo = company.secondaryLogoUrl ? getLogoUrl(company.secondaryLogoUrl, company.name) : null;

  return (
    <div className="company-header-container">
      <div className="company-header-modern">
        <div className="header-content-wrapper">
          <div className="logo-and-info">
            <div className="logo-company-info-row">
              <img
                src={logo}
                alt="Company Logo"
                className="modern-logo"
                onError={(e) => {
                  e.target.src = defaultLogo;
                }}
              />
              <div className="company-information">
                <h4 className="company-name">{company.name}</h4>
                <p className="company-address">{company.address}</p>
                {company.GSTIN && <p className="contact-item">🆔 GSTIN: {company.GSTIN}</p>}
                {company.email && <p className="contact-item">✉️ {company.email}</p>}
                {company.mobile && <p className="contact-item">📞 {company.mobile}</p>}
                {company.website && <p className="contact-item">🌐 {company.website}</p>}
                {company.state && <p className="contact-item">🌍 State: {company.state} (Code: {company.stateCode || 'N/A'})</p>}
              </div>
            </div>
          </div>
          <div className="cashbill-header-info">
            <h2>{currentBillType.title}{billDetails.isCancelled ? ' (CANCELLED)' : ''}</h2>
            <div className="bill-info-row">
              <div className="bill-number">{currentBillType.title} No: {generateInvoiceNumber()}</div>
              <div className="date">Date: <strong>{billDetails.date || new Date().toLocaleDateString('en-IN')}</strong></div>
            </div>
            {billDetails.reference && <div className="reference">Ref: <strong>{billDetails.reference}</strong></div>}
          </div>

          {secondaryLogo && (
            <div className="secondary-logo-center">
              <img 
                src={secondaryLogo} 
                alt="Company Secondary Logo" 
                className="secondary-logo-img"
                onError={(e) => {
                  e.target.src = defaultLogo;
                }}
              />
            </div>
          )}
        </div>
        {showBankDetails && bankDetails && (
          <div className="bank-details-section">
            <div className="bank-details-content">
              <div className="bank-info">
                {bankDetails.bankName && <p><strong>Bank:</strong> {bankDetails.bankName}</p>}
                {bankDetails.accountNumber && <p><strong>Account:</strong> {bankDetails.accountNumber}</p>}
                {bankDetails.ifsc && <p><strong>IFSC:</strong> {bankDetails.ifsc}</p>}
                {bankDetails.swiftCode && <p><strong>SWIFT:</strong> {bankDetails.swiftCode}</p>}
                {bankDetails.branch && <p><strong>Branch:</strong> {bankDetails.branch}</p>}
                {bankDetails.upiId && <p><strong>UPI ID:</strong> {bankDetails.upiId}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyHeader;