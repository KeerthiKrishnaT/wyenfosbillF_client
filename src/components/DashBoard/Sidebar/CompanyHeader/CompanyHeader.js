import React, { useState, useEffect, useCallback } from 'react';
import { getLogoUrl } from '../../Sidebar/utils/urlHelpers.js';
import defaultLogo from '../../../../assets/images/Wyenfos_bills_logo.png';
// import { QRCodeCanvas } from 'qrcode.react';
import './CompanyHeader.css';
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

const BILL_TYPES = {
  CASH_BILL: { title: 'CASH BILL' },
  CREDIT_BILL: { title: 'CREDIT BILL' },
  CREDIT_NOTE: { title: 'CREDIT NOTE' },
  DEBIT_NOTE: { title: 'DEBIT NOTE' },
  PAYMENT_RECEIPT: { title: 'PAYMENT RECEIPT' },
};

const CompanyHeader = ({ 
  billType = '', 
  billDetails = {},
  selectedCompany = null,
  showBankDetails = true
}) => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    ifsc: '',
    swiftCode: '',
    branch: '',
    upiId: '',
  });
  const [loadingBank, setLoadingBank] = useState(false);
  const [message, setMessage] = useState(null);
  const [qrCodeData, setQrCodeData] = useState('');

  const currentBillType = BILL_TYPES[billType] || BILL_TYPES.CASH_BILL;
console.log('company object in generateInvoiceNumber:', company);

const generateInvoiceNumber = () => {
  if (billDetails.invoiceNumber) {
    return billDetails.invoiceNumber;
  }
  const prefix = company?.prefix || currentBillType.title.substring(0, 2);
  return `${prefix}-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`;
};

const fetchCompanyDetails = useCallback(async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem('token');
    const response = await api.get('/api/companies', {
      params: { name: selectedCompany?.name },
      headers: { Authorization: `Bearer ${token}` },
    });

    const responseData = response.data.data || response.data;
    if (Array.isArray(responseData)) {
      const company = responseData.find(c => c.name === selectedCompany?.name) || responseData[0];
      setCompany(company);
    } else {
      setCompany(responseData);
    }
  } catch (err) {
    const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch company details';
    setError(errorMessage);
    setMessage({ type: 'error', text: errorMessage });
    setTimeout(() => setMessage(null), 3000);
  } finally {
    setLoading(false);
  }
}, [selectedCompany?.name]);


  const fetchBankDetails = useCallback(async () => {
    if (!company?.name || !showBankDetails) return;

    setLoadingBank(true);
    try {
     const token = localStorage.getItem('token');
const response = await api.get('/api/bank-details', {
  params: { companyName: company.name },
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});


      const data = response.data.data || response.data;
      const updatedDetails = {
        bankName: data.bankName || '',
        accountNumber: data.accountNumber || '',
        ifsc: data.ifsc || '',
        swiftCode: data.swiftCode || '',
        branch: data.branch || '',
        upiId: data.upiId || '',
      };
      setBankDetails(updatedDetails);

      if (updatedDetails.upiId) {
        setQrCodeData(`upi://pay?pa=${updatedDetails.upiId}&pn=${encodeURIComponent(company.name)}`);
      } else if (updatedDetails.accountNumber && updatedDetails.ifsc) {
        setQrCodeData(JSON.stringify({
          account: updatedDetails.accountNumber,
          ifsc: updatedDetails.ifsc,
          name: company.name,
        }));
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch bank details';
      setError(errorMessage);
      setMessage({ type: 'error', text: errorMessage });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoadingBank(false);
    }
  }, [company, showBankDetails]);

useEffect(() => {
  console.log('selectedCompany:', selectedCompany);
  if (selectedCompany) {
    setCompany(selectedCompany);
    setLoading(false);
  } else {
    fetchCompanyDetails();
  }
}, [selectedCompany, fetchCompanyDetails]);

  useEffect(() => {
    fetchBankDetails();
  }, [fetchBankDetails]);

  
  if (loading) return <div className="loading-message">Loading company details...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!company) return <div className="error-message">No company found</div>;

  const logo = getLogoUrl(company.logo || company.logoUrl, defaultLogo);
  const secondaryLogo = company.secondaryLogoUrl ? getLogoUrl(company.secondaryLogoUrl) : null;
  const invoiceNumber = generateInvoiceNumber();

  return (
    <div className="company-header-container">
      <div className="company-header-modern">
        <div className="header-content-wrapper">
          <div className="logo-and-info">
            <img
              src={logo}
              alt="Company Logo"
              className="modern-logo"
              onError={(e) => (e.target.src = defaultLogo)}
            />
            <div className="company-main-info">
              <h4 className="company-name">{company.name}</h4>
              <p className="company-address">{company.address}</p>
            <div className="company-contact-info">
             {company.mobile ? <p>📞 {company.mobile}</p> : <p>📞 Not provided</p>}
             {company.email ? <p>✉️ {company.email}</p> : <p>✉️ Not provided</p>}
             {company.website ? <p>🌐 {company.website}</p> : <p>🌐 Not provided</p>}
             {company.GSTIN ? <p>🆔 GSTIN: {company.GSTIN}</p> : null}
             {company.state ? <p>🌍 State: {company.state} (Code: {company.stateCode || 'N/A'})</p> : null}
             </div>
            </div>
          </div>
          <div className="cashbill-header-info">
            <h2>{currentBillType.title}{billDetails.isCancelled ? ' (CANCELLED)' : ''}</h2>
            <div className="bill-number">{currentBillType.title} No:{generateInvoiceNumber()}</div>
            <div className="date">Date: <strong>{billDetails.date || new Date().toLocaleDateString('en-IN')}</strong></div>
            {billDetails.reference && <div className="reference">Ref: <strong>{billDetails.reference}</strong></div>}
          </div>

          {secondaryLogo && (
            <div className="secondary-logo-center">
              <img 
                src={secondaryLogo} 
                alt="Company Secondary Logo" 
                className="secondary-logo-img"
                onError={(e) => (e.target.src = defaultLogo)}
              />
            </div>
          )}
        </div>
        {/* {showBankDetails && (
          <div className="bank-details-section">
            <div className="bank-details-content">
              <h4>Bank Details</h4>
              {loadingBank ? (
                <p>Loading bank details...</p>
              ) : (
                <>
                  {bankDetails.bankName && <p><strong>Bank:</strong> {bankDetails.bankName}</p>}
                  {bankDetails.accountNumber && <p><strong>Account:</strong> {bankDetails.accountNumber}</p>}
                  {bankDetails.ifsc && <p><strong>IFSC:</strong> {bankDetails.ifsc}</p>}
                  {bankDetails.swiftCode && <p><strong>SWIFT:</strong> {bankDetails.swiftCode}</p>}
                  {bankDetails.branch && <p><strong>Branch:</strong> {bankDetails.branch}</p>}
                  {bankDetails.upiId && <p><strong>UPI ID:</strong> {bankDetails.upiId}</p>}
                </>
              )}
            </div>
            {qrCodeData && (
              <div className="qr-code-section">
                <div className="qr-code-container">
              <QRCodeCanvas value={qrCodeData} size={100} level="H" includeMargin />
                  <p className="qr-code-label">Scan to Pay</p>
                </div>
              </div>
            )}
          </div>
        )} */}
      </div>
      {message && (
        <div className={`message-${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default CompanyHeader;