import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { jsPDF } from 'jspdf';
import logo from '../../../../assets/images/Wyenfos_bills_logo.png';
import watermark from '../../../../assets/images/watermark.png';
import CompanyHeader from '../CompanyHeader/CompanyHeader.js';
import './PaymentReceipt.css';

function PaymentReceipt() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const initialReceiptId = state?.receiptId || null;
  const [customers, setCustomers] = useState([]);
  const [userRole, setUserRole] = useState('user');
  const [userId, setUserId] = useState(null); // Store userId from token
  const [currentReceiptNumber, setCurrentReceiptNumber] = useState(1);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestChanges, setRequestChanges] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [creditBills, setCreditBills] = useState([]);
  const [debitNotes, setDebitNotes] = useState([]);
  const [form, setForm] = useState({
    receiptNumber: 'PR-1',
    date: new Date().toISOString().split('T')[0], // Use ISO date for input
    remarks: '',
    customer: {
      name: '',
      address: '',
      phone: '',
      email: '',
      gstin: ''
    }
  });
  const [receipts, setReceipts] = useState([]);
  const [showSideView, setShowSideView] = useState(!!initialReceiptId);
  const [highlightedReceiptId, setHighlightedReceiptId] = useState(initialReceiptId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const totalProductAmount = Array.isArray(creditBills)
    ? creditBills.reduce((sum, bill) => sum + (bill?.totalAmount || 0), 0)
    : 0;

  const totalPaidAmount = Array.isArray(debitNotes)
    ? debitNotes.reduce((sum, note) => sum + (note?.amountPaid || 0), 0)
    : 0;

  const remainingBalance = totalProductAmount - totalPaidAmount;

  const validCompanies = [
    'WYENFOS INFOTECH',
    'WYENFOS GOLD & DIAMONDS',
    'WYENFOS ADS',
    'WYENFOS CASH VAPASE',
    'WYENFOS',
  ];
  const selectedCompany = validCompanies.includes(state?.selectedCompany?.toUpperCase())
    ? state.selectedCompany
    : 'WYENFOS';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserRole(decoded.role || 'user');
        setUserId(decoded.id || decoded.sub || 'unknown');
        localStorage.setItem('userId', decoded.id || decoded.sub || 'unknown');
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
  }, []);

  const generateReceiptNumber = () => {
    return `PR-${currentReceiptNumber}`;
  };

  useEffect(() => {
    const fetchNextReceiptNumber = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/payment-receipts/next-number', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.nextNumber) {
          setCurrentReceiptNumber(response.data.nextNumber);
          setForm(prev => ({
            ...prev,
            receiptNumber: `PR-${response.data.nextNumber}`
          }));
        }
      } catch (error) {
        console.error('Error fetching next receipt number:', error);
      }
    };

    fetchNextReceiptNumber();
  }, []);

  const handleRequestChange = async () => {
    if (!requestChanges.trim()) {
      setError('Please describe the changes you want to request');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        '/api/payment-receipts/request-change',
        {
          receiptId: highlightedReceiptId,
          changes: requestChanges,
          reason: 'Requested by non-admin user'
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setShowRequestModal(false);
      setRequestChanges('');
      alert('Your change request has been submitted to the admin');
    } catch (error) {
      console.error('Request change error:', error);
      setError(error.response?.data?.message || 'Failed to submit change request');
    }
  };

  const fetchCustomers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/customers', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Fetched customers:', JSON.stringify(response.data, null, 2));
      setCustomers(response.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers. Please try again.');
    }
  }, []);

  const fetchCustomerBills = useCallback(async (customerId) => {
    try {
      const token = localStorage.getItem('token');
      const [creditBillResponse, debitNoteResponse] = await Promise.all([
        axios.get(`/api/creditbills?customerId=${customerId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`/api/debitnotes?customerId=${customerId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const creditBillsData = Array.isArray(creditBillResponse.data) ? creditBillResponse.data : [];
      const debitNotesData = Array.isArray(debitNoteResponse.data) ? debitNoteResponse.data : [];

      setCreditBills(creditBillsData);
      setDebitNotes(debitNotesData);
    } catch (error) {
      console.error('Error fetching customer bills:', error.message);
      setError('Failed to fetch customer bills.');
      setCreditBills([]);
      setDebitNotes([]);
    }
  }, []);

  useEffect(() => {
    console.log('Selected Customer:', JSON.stringify(selectedCustomer, null, 2));
  }, [selectedCustomer, form.customer]);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/payment-receipts', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setReceipts(response.data || []);
    } catch (error) {
      console.error('Full error:', {
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      if (error.response?.status === 403) {
        const serverMessage = error.response?.data?.error || 'Access denied';
        const required = error.response?.data?.required || {};
        const userPerms = error.response?.data?.user || {};
        setError(`${serverMessage}\n\nRequired: ${JSON.stringify(required)}\nYour permissions: ${JSON.stringify(userPerms)}`);
        navigate('/unauthorized');
      } else if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Failed to load receipts. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const fetchInitialReceiptNumber = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/payment-receipts/last', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (response.data && response.data.receiptNo) {
          const lastNumber = parseInt(response.data.receiptNo.split('-')[1]) || 0;
          setCurrentReceiptNumber(lastNumber + 1);
        }
      } catch (error) {
        console.error('Error fetching last receipt number:', error);
        setCurrentReceiptNumber(1);
      }
    };

    fetchInitialReceiptNumber();
    fetchCustomers();
    fetchReceipts();
  }, [fetchCustomers, fetchReceipts]);

 const handleCustomerSelect = (e) => {
  const customerId = e.target.value;
  const customer = customers.find(c => c._id === customerId);
  console.log('Selected customer:', JSON.stringify(customer, null, 2));
  setSelectedCustomer(customer);

  if (customer) {
    setForm(prev => ({
      ...prev,
      customer: {
        name: customer.name || customer.customerName || 'N/A',
        address: customer.address || '',
        phone: customer.phone || '',
        email: customer.email || '',
        gstin: customer.gstin || ''
      }
    }));
    setSelectedCustomer({
      _id: customer._id,
      name: customer.name || customer.customerName || 'N/A',
      customerId: customer.customerId || `CUST${customer._id.slice(-4)}`,
      address: customer.address || '',
      phone: customer.phone || '',
      email: customer.email || '',
      gstin: customer.gstin || ''
    });
    if (customer._id) {
      fetchCustomerBills(customer._id);
    }
  } else {
    setCreditBills([]);
    setDebitNotes([]);
    setForm(prev => ({
      ...prev,
      customer: {
        name: '',
        address: '',
        phone: '',
        email: '',
        gstin: ''
      }
    }));
    setSelectedCustomer(null);
  }
};

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCustomerDetailChange = (e) => {
    const { name, value } = e.target;
    setSelectedCustomer(prev => ({
      ...prev,
      [name]: value
    }));
    setForm(prev => ({
      ...prev,
      customer: {
        ...prev.customer,
        [name]: value
      }
    }));
  };

  const saveReceipt = async () => {
    if (!selectedCustomer) {
      setError('Please select a customer.');
      return;
    }
    if (!selectedCustomer._id || !/^[0-9a-fA-F]{24}$/.test(selectedCustomer._id)) {
      setError('Invalid customer ID.');
      return;
    }
    if (!totalPaidAmount || totalPaidAmount <= 0) {
      setError('Total paid amount must be greater than zero.');
      return;
    }

    setLoading(true);
    setError(null);

    const receipt = {
      receiptNo: generateReceiptNumber(),
      customerId: selectedCustomer._id,
      customerName: form.customer.name || selectedCustomer.name || 'N/A',
      amount: totalPaidAmount,
      date: new Date(form.date),
      type: 'payment',
      creditBillId: creditBills.length > 0 ? creditBills[0]._id : undefined,
      metadata: {
        creditBills: creditBills.map(bill => ({
          _id: bill._id,
          creditBillNo: bill.creditBillNo,
          date: new Date(bill.date),
          totalAmount: bill.totalAmount
        })),
        debitNotes: debitNotes.map(note => ({
          _id: note._id,
          debitNoteNo: note.debitNoteNo,
          date: new Date(note.date),
          amountPaid: note.amountPaid
        })),
        totalProductAmount,
        totalPaidAmount,
        remainingBalance,
        remarks: form.remarks
      },
      createdBy: userId || 'unknown',
      lastUpdatedBy: userId || 'unknown'
    };

    console.log('Receipt payload:', JSON.stringify(receipt, null, 2));

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/payment-receipts', receipt, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setReceipts([...receipts, response.data]);
      setCurrentReceiptNumber(prev => prev + 1);
      setError(null);
      alert('Payment receipt saved successfully!');
    } catch (error) {
      console.error('Error saving receipt:', error.response?.data || error);
      setError(error.response?.data?.message || 'Failed to save payment receipt.');
    } finally {
      setLoading(false);
    }
  };

  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.error(`Failed to load image: ${src}`);
        reject(new Error(`Failed to load image: ${src}`));
      };
    });
  };

  const downloadPDF = async (receipt = {
    receiptNo: form.receiptNumber,
    date: form.date,
    customer: selectedCustomer,
    creditBills,
    debitNotes,
    totalProductAmount,
    totalPaidAmount,
    remainingBalance,
    remarks: form.remarks
  }) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      doc.setFontSize(12);
      let y = 10;

      const logoImg = await loadImage(logo);
      const watermarkImg = await loadImage(watermark);

      doc.addImage(watermarkImg, 'PNG', 50, 100, 100, 100, undefined, 'NONE', 0.3);

      const logoWidth = 30;
      const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
      doc.addImage(logoImg, 'PNG', 10, y, logoWidth, logoHeight);
      y += logoHeight + 5;

      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT RECEIPT', 190, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text('Wyenfos Bills', 10, y + 10);
      doc.setFontSize(10);
      doc.text('Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001', 10, y + 16);
      doc.text(`Receipt No: ${receipt.receiptNo}`, 190, y + 10, { align: 'right' });
      doc.text(`Date: ${new Date(receipt.date).toLocaleDateString()}`, 190, y + 16, { align: 'right' });
      y += 34;

      doc.setFontSize(12);
      doc.text(`Customer: ${receipt.customer?.name || 'N/A'}`, 10, y);
      y += 6;
      doc.text(`Customer ID: ${receipt.customer?._id || receipt.customer?.customerId || 'N/A'}`, 10, y);
      y += 6;
      doc.text(`Address: ${receipt.customer?.address || 'N/A'}`, 10, y);
      y += 6;
      doc.text(`Phone: ${receipt.customer?.phone || 'N/A'}`, 10, y);
      y += 6;
      doc.text(`Email: ${receipt.customer?.email || 'N/A'}`, 10, y);
      y += 6;
      doc.text(`GSTIN: ${receipt.customer?.gstin || 'N/A'}`, 10, y);
      y += 10;

      doc.text('Payment Details:', 10, y);
      y += 6;
      doc.text('--------------------------------------------------', 10, y);
      y += 6;
      doc.text('S.No  Credit Bill  Debit Note  Paid Date  Paid Amount', 10, y);
      y += 6;
      doc.text('--------------------------------------------------', 10, y);
      y += 6;

      receipt.debitNotes.forEach((note, index) => {
        const creditBill = receipt.creditBills.find(bill => bill._id === note.creditBillId);
        doc.text(
          `${index + 1}     ${creditBill?.creditBillNo || 'N/A'}     ${note.debitNoteNo || 'N/A'}     ${note.date ? new Date(note.date).toLocaleDateString() : 'N/A'}     ₹${note.amountPaid?.toFixed(2) || '0.00'}`,
          10,
          y
        );
        y += 6;
      });

      y += 10;
      doc.text(`Total Amount of Product: ₹${receipt.totalProductAmount?.toFixed(2) || '0.00'}`, 10, y);
      y += 6;
      doc.text(`Total Amount Paid: ₹${receipt.totalPaidAmount?.toFixed(2) || '0.00'}`, 10, y);
      y += 6;
      doc.text(`Amount to Pay: ₹${receipt.remainingBalance?.toFixed(2) || '0.00'}`, 10, y);
      y += 6;
      doc.text(`Remaining Balance: ₹${receipt.remainingBalance?.toFixed(2) || '0.00'}`, 10, y);
      y += 10;

      if (receipt.remainingBalance === 0) {
        doc.text(`Verification: Customer has been paid full amount as per the date ${new Date(receipt.date).toLocaleDateString()}`, 10, y);
        y += 10;
      }

      doc.text(`Remarks: ${receipt.remarks || 'None'}`, 10, y);
      y += 10;
      doc.text('Authorized Signatory', 190, y, { align: 'right' });

      doc.save(`Payment_Receipt_${receipt.receiptNo}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF.');
    }
  };

  const printReceipt = () => {
    const printContent = document.querySelector('.receipt-container').innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  const sendEmail = async () => {
    if (!selectedCustomer?.email) {
      setError('No customer email available.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/api/payment-receipts/${highlightedReceiptId}/send-email`,
        {
          emailTo: selectedCustomer.email,
          subject: `Payment Receipt ${form.receiptNumber}`,
          body: `Dear ${form.customer.name || selectedCustomer.name || 'Customer'},\n\nPlease find attached your payment receipt from Wyenfos Bills.`
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      alert('Email sent successfully!');
    } catch (error) {
      console.error('Email error:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptClick = (receiptId) => {
    setHighlightedReceiptId(receiptId);
    const receipt = receipts.find(r => r._id === receiptId);
    if (receipt) {
      setSelectedCustomer({
        _id: receipt.customerId,
        name: receipt.customerName,
        customerId: receipt.customerId,
        address: receipt.metadata?.address || '',
        phone: receipt.metadata?.phone || '',
        email: receipt.metadata?.email || '',
        gstin: receipt.metadata?.gstin || ''
      });
      setForm({
        receiptNumber: receipt.receiptNo,
        date: new Date(receipt.date).toISOString().split('T')[0],
        remarks: receipt.metadata?.remarks || '',
        customer: {
          name: receipt.customerName || '',
          address: receipt.metadata?.address || '',
          phone: receipt.metadata?.phone || '',
          email: receipt.metadata?.email || '',
          gstin: receipt.metadata?.gstin || ''
        }
      });
      if (receipt.customerId) {
        fetchCustomerBills(receipt.customerId);
      }
    }
  };

  const handleEdit = async () => {
    if (!selectedCustomer) {
      setError('Please select a customer.');
      return;
    }
    if (!selectedCustomer._id || !/^[0-9a-fA-F]{24}$/.test(selectedCustomer._id)) {
      setError('Invalid customer ID.');
      return;
    }
    if (!totalPaidAmount || totalPaidAmount <= 0) {
      setError('Total paid amount must be greater than zero.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const updateData = {
        receiptNo: form.receiptNumber,
        customerId: selectedCustomer._id,
        customerName: form.customer.name || selectedCustomer.name || 'N/A',
        amount: totalPaidAmount,
        date: new Date(form.date),
        type: 'payment',
        creditBillId: creditBills.length > 0 ? creditBills[0]._id : undefined,
        metadata: {
          creditBills: creditBills.map(bill => ({
            _id: bill._id,
            creditBillNo: bill.creditBillNo,
            date: new Date(bill.date),
            totalAmount: bill.totalAmount
          })),
          debitNotes: debitNotes.map(note => ({
            _id: note._id,
            debitNoteNo: note.debitNoteNo,
            date: new Date(note.date),
            amountPaid: note.amountPaid
          })),
          totalProductAmount,
          totalPaidAmount,
          remainingBalance,
          remarks: form.remarks
        },
        lastUpdatedBy: userId || 'unknown'
      };
      await axios.put(
        `/api/payment-receipts/${highlightedReceiptId}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      alert('Receipt updated successfully');
      fetchReceipts();
    } catch (error) {
      console.error('Edit error:', error);
      setError(error.response?.data?.message || 'Failed to update receipt');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this receipt?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/payment-receipts/${highlightedReceiptId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      alert('Receipt deleted successfully');
      fetchReceipts();
      setHighlightedReceiptId(null);
    } catch (error) {
      console.error('Delete error:', error);
      setError(error.response?.data?.message || 'Failed to delete receipt');
    }
  };

  return (
    <div className="receipt-page">
      <div className="receipt-container">
        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {loading && <div className="loading-overlay">Loading...</div>}

        {showRequestModal && (
          <div className="modal-overlay">
            <div className="change-request-modal">
              <h3>Request Changes</h3>
              <textarea
                value={requestChanges}
                onChange={(e) => setRequestChanges(e.target.value)}
                placeholder="Describe the changes you'd like to request..."
              />
              <div className="modal-actions">
                <button onClick={() => setShowRequestModal(false)}>Cancel</button>
                <button onClick={handleRequestChange}>Submit Request</button>
              </div>
            </div>
          </div>
        )}

        <div className="receipt-header">
          <div className="header-left">
            <CompanyHeader selectedCompany={selectedCompany} />
          </div>
          <div className="header-right">
            <h1 className="receipt-title">PAYMENT RECEIPT</h1>
            <p>Receipt No: <input type="text" name="receiptNumber" value={form.receiptNumber} onChange={handleFormChange} /></p>
            <p>Date: <input type="date" name="date" value={form.date} onChange={handleFormChange} /></p>
          </div>
        </div>

        <div className="customer-details">
          <div className="detail-item full-width">
            <label>Select Customer</label>
            <select value={selectedCustomer?._id || ''} onChange={handleCustomerSelect}>
              <option value="">Select a customer</option>
              {customers.map(customer => {
                const displayId = customer.customerId || `CUST${customer._id.slice(-4)}`;
                return (
                  <option key={customer._id} value={customer._id}>
                    {customer.name || customer.customerName || 'Unknown'} (ID: {displayId})
                  </option>
                );
              })}
            </select>
          </div>
          {selectedCustomer && (
      <>
      <div className="detail-item">
        <label>Customer Name</label>
        <input
          type="text"
          name="name"
          value={form.customer.name || ''}
          onChange={handleCustomerDetailChange}
        />
      </div>
      <div className="detail-item">
        <label>Customer ID</label>
        <input
          type="text"
          value={selectedCustomer.customerId || selectedCustomer._id.slice(-4)}
          readOnly
        />
      </div>
      <div className="detail-item">
        <label>Address</label>
        <input
          type="text"
          name="address"
          value={form.customer.address || ''}
          onChange={handleCustomerDetailChange}
        />
      </div>
      <div className="detail-item">
        <label>Phone</label>
        <input
          type="text"
          name="phone"
          value={form.customer.phone || ''}
          onChange={handleCustomerDetailChange}
        />
      </div>
      <div className="detail-item">
        <label>Email</label>
        <input
          type="email"
          name="email"
          value={form.customer.email || ''}
          onChange={handleCustomerDetailChange}
        />
      </div>
      <div className="detail-item">
        <label>GSTIN</label>
        <input
          type="text"
          name="gstin"
          value={form.customer.gstin || ''}
          onChange={handleCustomerDetailChange}
        />
      </div>
    </>
          )}
        </div>

        {(creditBills.length > 0 || debitNotes.length > 0) && (
          <div className="payment-table">
            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Credit Bill No</th>
                  <th>Debit Note No</th>
                  <th>Paid Date</th>
                  <th>Paid Amount</th>
                </tr>
              </thead>
              <tbody>
                {debitNotes.map((note, index) => {
                  const creditBill = creditBills.find(bill => bill._id === note.creditBillId);
                  return (
                    <tr key={note._id}>
                      <td>{index + 1}</td>
                      <td>{creditBill?.creditBillNo || 'N/A'}</td>
                      <td>{note.debitNoteNo || 'N/A'}</td>
                      <td>{note.date ? new Date(note.date).toLocaleDateString() : 'N/A'}</td>
                      <td>₹{note.amountPaid?.toFixed(2) || '0.00'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {(creditBills.length > 0 || debitNotes.length > 0) && (
          <div className="receipt-summary">
            <p>Total Amount of Product: <span>₹{totalProductAmount.toFixed(2)}</span></p>
            <p>Total Amount Paid: <span>₹{totalPaidAmount.toFixed(2)}</span></p>
            <p className="amount-to-pay">Amount to Pay: <span>₹{remainingBalance.toFixed(2)}</span></p>
            <p>Remaining Balance: <span>₹{remainingBalance.toFixed(2)}</span></p>
            {remainingBalance === 0 && (
              <p className="verification-note">
                Verification: Customer has been paid full amount as per the date {form.date}
              </p>
            )}
          </div>
        )}

        <div className="remarks-signature">
          <div className="remarks">
            <label>Remarks</label>
            <textarea
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Enter remarks"
            />
          </div>
          <div className="signature">
            <strong>Authorized Signatory</strong><br />
            <strong>{selectedCompany}</strong>
          </div>
        </div>

        <div className="receipt-actions">
          <button onClick={saveReceipt} className="action-btn save-btn">Save</button>
          <button onClick={printReceipt} className="action-btn print-btn">Print</button>
          <button onClick={() => downloadPDF()} className="action-btn download-btn">Download</button>
          <button onClick={sendEmail} className="action-btn email-btn">Send Email</button>
          <button onClick={() => setShowSideView(!showSideView)} className="action-btn toggle-btn">
            {showSideView ? 'Hide Receipts' : 'View Receipts'}
          </button>
          <button onClick={() => navigate(-1)} className="action-btn back-btn">Back</button>
          {userRole === 'admin' ? (
            <>
              <button onClick={() => handleEdit()} className="action-btn edit-btn">
                Edit
              </button>
              <button onClick={() => handleDelete()} className="action-btn delete-btn">
                Delete
              </button>
            </>
          ) : (
            <button onClick={() => setShowRequestModal(true)} className="action-btn request-btn">
              Request Changes
            </button>
          )}
        </div>
      </div>

      {showSideView && (
        <div className="side-view">
          <h3 className="side-view-title">Saved Payment Receipts</h3>
          <div className="side-view-content">
            {receipts.length > 0 ? (
              receipts.map(receipt => (
                <div
                  key={receipt._id}
                  className={`side-view-item ${highlightedReceiptId === receipt._id ? 'highlighted' : ''}`}
                  onClick={() => handleReceiptClick(receipt._id)}
                >
                  <p>
                    {receipt.customerName || 'N/A'} - {new Date(receipt.date).toLocaleDateString()} - ₹{receipt.amount?.toFixed(2) || '0.00'}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadPDF({
                        receiptNo: receipt.receiptNo,
                        date: receipt.date,
                        customer: {
                          name: receipt.customerName,
                          _id: receipt.customerId,
                          address: receipt.metadata?.address,
                          phone: receipt.metadata?.phone,
                          email: receipt.metadata?.email,
                          gstin: receipt.metadata?.gstin
                        },
                        creditBills: receipt.metadata?.creditBills || [],
                        debitNotes: receipt.metadata?.debitNotes || [],
                        totalProductAmount: receipt.metadata?.totalProductAmount || 0,
                        totalPaidAmount: receipt.metadata?.totalPaidAmount || 0,
                        remainingBalance: receipt.metadata?.remainingBalance || 0,
                        remarks: receipt.metadata?.remarks || ''
                      });
                    }}
                    className="download-link"
                  >
                    Download PDF
                  </button>
                </div>
              ))
            ) : (
              <p>No payment receipts available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentReceipt;