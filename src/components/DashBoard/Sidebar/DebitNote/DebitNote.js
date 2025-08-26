import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import CompanyHeader from '../CompanyHeader/CompanyHeader';
import ProductSelector from '../../../Product/ProductSelector.js';
import { jsPDF } from 'jspdf';
import axios from 'axios';
import { debounce } from 'lodash';
import DOMPurify from 'dompurify';
import logo from '../../../../assets/images/Wyenfos_bills_logo.png';
import watermark from '../../../../assets/images/watermark.png';
import cancelledWatermark from '../../../../assets/images/cancelled.png';
import { useAuth } from '../../../../contexts/AuthContext.js';
import './DebitNote.css';

const companyPrefixes = {
  'WYENFOS INFOTECH': 'WIT',
  'WYENFOS GOLD AND DIAMONDS': 'WGD',
  'WYENFOS ADS': 'WAD',
  'WYENFOS CASH VAPASE': 'WCV',
  'AYUR FOR HERBALS INDIA': 'ALH',
  'WYENFOS': 'WNF',
  'WYENFOS PURE DROPS': 'WPD',
};

const getCompanyPrefix = (company) => {
  return companyPrefixes[company] || 'WB';
};

const selectedCompanyDetails = {
  'WYENFOS INFOTECH': {
    name: 'WYENFOS INFOTECH',
    address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
    GSTIN: '32AAECW1234B1Z0',
    state: 'Kerala',
    stateCode: '32',
    mobile: '+91 9847012345',
    email: 'info@wyenfos.com',
    website: 'www.wyenfos.com',
    logo: '/uploads/wyenfos_infotech.png',
    qrCode: '/uploads/bank-qr-codes/COMBINED_WYENFOS_1755333147704.png',
  },
  'WYENFOS GOLD AND DIAMONDS': {
    name: 'WYENFOS GOLD AND DIAMONDS',
    address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
    GSTIN: '32AAECW1234B1Z1',
    state: 'Kerala',
    stateCode: '32',
    mobile: '+91 9847012346',
    email: 'gold@wyenfos.com',
    website: 'www.wyenfosgold.com',
    logo: '/uploads/wyenfos_gold.png',
    qrCode: '/uploads/bank-qr-codes/COMBINED_WYENFOS_GOLD_AND_DIAMONDS_1755332863742.png',
  },
  'WYENFOS ADS': {
    name: 'WYENFOS ADS',
    address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
    GSTIN: '32AAECW1234B1Z2',
    state: 'Kerala',
    stateCode: '32',
    mobile: '+91 9847012347',
    email: 'ads@wyenfos.com',
    website: 'www.wyenfosads.com',
    logo: '/uploads/wyenfos_ads.png',
    qrCode: '/uploads/bank-qr-codes/COMBINED_WYENFOS_1755333147704.png',
  },
  'WYENFOS CASH VAPASE': {
    name: 'WYENFOS CASH VAPASE',
    address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
    GSTIN: '32AAECW1234B1Z3',
    state: 'Kerala',
    stateCode: '32',
    mobile: '+91 9847012348',
    email: 'vapase@wyenfos.com',
    website: 'www.wyenfosvapase.com',
    logo: '/uploads/wyenfos_cash.png',
    qrCode: '/uploads/bank-qr-codes/COMBINED_WYENFOS_CASH_VAPASE_1755490549175.png',
  },
  'AYUR FOR HERBALS INDIA': {
    name: 'AYUR FOR HERBALS INDIA',
    address: 'Ayur4Life Building, Thrissur, Kerala, 680001',
    GSTIN: '32AAECW1234B1Z4',
    state: 'Kerala',
    stateCode: '32',
    mobile: '+91 9847012349',
    email: 'info@ayur4life.com',
    website: 'www.ayur4life.com',
    logo: '/uploads/Ayur4life_logo.png',
    qrCode: '/uploads/bank-qr-codes/COMBINED_WYENFOS_1755333147704.png',
  },
  'WYENFOS': {
    name: 'WYENFOS',
    address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
    GSTIN: '32AAECW1234B1Z5',
    state: 'Kerala',
    stateCode: '32',
    mobile: '+91 9847012350',
    email: 'contact@wyenfos.com',
    website: 'www.wyenfos.com',
    logo: '/uploads/wyenfos.png',
    qrCode: '/uploads/bank-qr-codes/WYENFOS_QR_1755336487474.png',
  },
  'WYENFOS PURE DROPS': {
    name: 'WYENFOS PURE DROPS',
    address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
    GSTIN: '32AAECW1234B1Z6',
    state: 'Kerala',
    stateCode: '32',
    mobile: '+91 9847012351',
    email: 'drops@wyenfos.com',
    website: 'www.wyenfospuredrops.com',
    logo: '/uploads/wyenfos pure drops.png',
    qrCode: '/uploads/bank-qr-codes/COMBINED_WYENFOS_1755333147704.png',
  },
};

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('No token found in localStorage, request may fail due to authentication.');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const sanitizeInput = (input) => DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = () => setHasError(true);
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return <div>Something went wrong. Please try again or contact support.</div>;
  }
  return children;
}

function DebitNote() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { currentUser } = useAuth();
 
  // Handle company selection from location state
  let selectedCompanyFromState = 'WYENFOS';
 
  if (state?.selectedCompany) {
    // If selectedCompany is an object, extract the name
    if (typeof state.selectedCompany === 'object' && state.selectedCompany.name) {
      selectedCompanyFromState = state.selectedCompany.name;
    } else if (typeof state.selectedCompany === 'string') {
      selectedCompanyFromState = state.selectedCompany;
    }
  }
 
  // Handle company name mapping for backward compatibility
  if (selectedCompanyFromState === 'AYUR 4 LIFE HERBALS India') {
    selectedCompanyFromState = 'AYUR FOR HERBALS INDIA';
  }
 
  // Handle company name mapping for WYENFOS GOLD
  if (selectedCompanyFromState === 'WYENFOS GOLD & DIAMONDS') {
    selectedCompanyFromState = 'WYENFOS GOLD AND DIAMONDS';
  }
 
  // Ensure selectedCompanyFromState is always a string
  if (typeof selectedCompanyFromState !== 'string') {
    console.warn('selectedCompanyFromState is not a string:', selectedCompanyFromState);
    selectedCompanyFromState = 'WYENFOS';
  }

  const companyDetails = useMemo(() => {
    return selectedCompanyDetails[selectedCompanyFromState] || {
      name: selectedCompanyFromState,
      address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
      GSTIN: '32AAECW1234B1Z0',
      state: 'Kerala',
      stateCode: '32',
      mobile: '',
      email: '',
      website: '',
      logo: '/uploads/wyenfos.png',
      qrCode: '/uploads/bank-qr-codes/WYENFOS_QR_1755336487474.png',
    };
  }, [selectedCompanyFromState]);

  let selectedCompany = selectedCompanyFromState;

  const [savedBills, setSavedBills] = useState([]);
  const [filteredCreditBills, setFilteredCreditBills] = useState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [isFinalInstallmentPaid, setIsFinalInstallmentPaid] = useState(false);
  // const [paymentReceiptUrl, setPaymentReceiptUrl] = useState(''); // Removed - payment receipt functionality not implemented
  const [notificationMessage, setNotificationMessage] = useState(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [bankDetails, setBankDetails] = useState({
    bankName: 'IDFC FIRST BANK',
    accountNumber: '10192468394',
    ifsc: 'IDFB0080732',
    swiftCode: 'IDFBINBBMUM',
    branch: 'THRISSUR - EAST FORT THRISSUR BRANCH',
    upiId: '',
  });
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isCustomerLoading, setIsCustomerLoading] = useState(false);
  const [debitNoteSearched, setDebitNoteSearched] = useState(false);
  const [editPermissions, setEditPermissions] = useState({});
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [pendingEditBill, setPendingEditBill] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  // const [paymentStatus, setPaymentStatus] = useState('pending'); // 'pending', 'installment_paid', 'fully_paid' - Removed unused variable
  const userEmail = state?.userEmail || '';
  const userRole = state?.userRole || 'staff';
  const fetchInProgressRef = useRef(false);
 
  // Get Firebase ID token for API calls
  const getAuthToken = useCallback(async () => {
    if (!currentUser) {
      throw new Error('No authenticated user');
    }
    try {
      return await currentUser.getIdToken(true);
    } catch (error) {
      if (error.code === 'auth/quota-exceeded') {
        console.warn('Firebase quota exceeded, using mock token for testing');
        // Return a mock token for testing
        return 'mock-token-for-testing';
      }
      throw error;
    }
  }, [currentUser]);
  const [form, setForm] = useState({
    invoiceNumber: '',
    customerId: '',
    customerName: '',
    customerContact: { address: '', phone: '', email: '', gstin: '' },
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    selectedCreditBill: null,
    selectedDebitNote: null,
    installments: [],
    manualItems: [{ name: '', itemCode: '', hsnCode: '', quantity: 1, rate: 0 }],
    cgst: 0,
    sgst: 0,
    igst: 0,
    discount: 0,
    roundOff: 0,
    isOtherState: false,
    isCancelled: false,
    remarks: '',
    bankDetails: { accountNumber: '', ifsc: '', bankName: '' },
    signature: '',
    paymentStatus: 'pending',
  });

  // Note: errors state is not currently used in this component

  // Helper functions for manual items calculations
  const getManualItemAmount = (item) => {
    if (!item || typeof item !== 'object') {
      return 0;
    }
    return (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
  };

  const getManualItemsTotal = useCallback(() => {
    if (!form.manualItems || !Array.isArray(form.manualItems)) {
      return 0;
    }
    return form.manualItems.reduce((sum, item) => sum + getManualItemAmount(item), 0);
  }, [form.manualItems]);

  // Customer search functions
  const fetchCustomers = async () => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found');
        return;
      }
     
      const response = await api.get('/customers');
      // We don't need to store all customers, just fetch to ensure API is working
      console.log('Customers fetched successfully:', response.data?.length || 0);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      if (error.response?.status === 401) {
        setNotificationMessage({ type: 'error', text: 'Authentication failed. Please log in again.' });
      } else {
        setNotificationMessage({ type: 'error', text: 'Failed to fetch customers' });
      }
      setTimeout(() => setNotificationMessage(null), 5000);
    }
  };

  const fetchCreditBills = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/creditbills', {
        params: { company: selectedCompany }
      });
     
      // Handle different response structures
      let bills = [];
      if (response.data && Array.isArray(response.data)) {
        bills = response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        bills = response.data.data;
      } else if (Array.isArray(response)) {
        bills = response;
      } else {
        console.warn('Unexpected credit bills response structure:', response);
        bills = [];
      }
     
      // Filter bills that have outstanding balance
      const billsWithBalance = bills.filter(bill => {
        try {
          // Safety check for bill object
          if (!bill || typeof bill !== 'object') {
            console.warn('Invalid bill object:', bill);
            return false;
          }
         
          // Use the balance amount directly from the database (no calculations needed)
          let balanceAmount = 0;
         
          // Check if balanceAmount exists directly on the bill (this is the outstanding balance)
          if (bill.balanceAmount !== undefined && bill.balanceAmount > 0) {
            balanceAmount = Number(bill.balanceAmount);
          }
          // Check if paymentDetails.balanceAmount exists (this is the outstanding balance)
          else if (bill.paymentDetails?.balanceAmount !== undefined && bill.paymentDetails.balanceAmount > 0) {
            balanceAmount = Number(bill.paymentDetails.balanceAmount);
          }
          // Check if totals.remainingBalance exists (this is the outstanding balance)
          else if (bill.totals?.remainingBalance !== undefined && bill.totals.remainingBalance > 0) {
            balanceAmount = Number(bill.totals.remainingBalance);
          }
          // Check if items have balanceAmount (this is the outstanding balance)
          else if (bill.items && Array.isArray(bill.items)) {
            const itemWithBalance = bill.items.find(item =>
              item && item.balanceAmount !== undefined && item.balanceAmount > 0
            );
            if (itemWithBalance) {
              balanceAmount = Number(itemWithBalance.balanceAmount);
            }
          }
          return balanceAmount > 0;
        } catch (error) {
          console.error('Error processing bill:', bill, error);
          return false; // Skip this bill if there's an error
        }
      });
     
      // Filter out bills without _id or id to prevent issues
      const validBills = billsWithBalance.filter(bill => bill._id || bill.id);
     
      // If no bills found for the company, try to get all bills (fallback)
      if (validBills.length === 0) {
        try {
          const fallbackResponse = await api.get('/creditbills');
          const fallbackBills = fallbackResponse.data.data || fallbackResponse.data || [];
         
          // Filter fallback bills for outstanding balance
          const fallbackBillsWithBalance = fallbackBills.filter(bill => {
            try {
              if (!bill || typeof bill !== 'object') return false;
             
              let balanceAmount = 0;
              // Check if balanceAmount exists directly on the bill (this is the outstanding balance)
              if (bill.balanceAmount !== undefined && bill.balanceAmount > 0) {
                balanceAmount = Number(bill.balanceAmount);
              } else if (bill.paymentDetails?.balanceAmount !== undefined && bill.paymentDetails.balanceAmount > 0) {
                balanceAmount = Number(bill.paymentDetails.balanceAmount);
              } else if (bill.totals?.remainingBalance !== undefined && bill.totals.remainingBalance > 0) {
                balanceAmount = Number(bill.totals.remainingBalance);
              } else if (bill.items && Array.isArray(bill.items)) {
                const itemWithBalance = bill.items.find(item =>
                  item && item.balanceAmount !== undefined && item.balanceAmount > 0
                );
                if (itemWithBalance) {
                  balanceAmount = Number(itemWithBalance.balanceAmount);
                }
              }
             
              return balanceAmount > 0 && (bill._id || bill.id);
            } catch (error) {
              return false;
            }
          });
         
          setFilteredCreditBills(fallbackBillsWithBalance);
        } catch (fallbackError) {
          setFilteredCreditBills(validBills);
        }
      } else {
        setFilteredCreditBills(validBills);
      }
     
      // Show success message if we found credit bills
      if (validBills.length > 0) {
        setNotificationMessage({ type: 'success', text: `Successfully loaded ${validBills.length} credit bill(s) with outstanding balance` });
        setTimeout(() => setNotificationMessage(null), 3000);
      }
    } catch (error) {
      console.error('Failed to fetch credit bills:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Network error';
      setNotificationMessage({
        type: 'error',
        text: `Failed to fetch credit bills: ${errorMessage}. Please check if the server is running.`
      });
      setTimeout(() => setNotificationMessage(null), 8000);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompany]);

  // New function to fetch payment history for a credit bill
  const fetchPaymentHistory = useCallback(async (creditBillId) => {
    try {
      console.log('fetchPaymentHistory called with creditBillId:', creditBillId);
      
      // Fetch all debit notes for this credit bill
      const debitNotesResponse = await api.get('/debitnotes');
      let allDebitNotes = [];
      
      if (debitNotesResponse.data && Array.isArray(debitNotesResponse.data)) {
        allDebitNotes = debitNotesResponse.data;
      } else if (debitNotesResponse.data && debitNotesResponse.data.data && Array.isArray(debitNotesResponse.data.data)) {
        allDebitNotes = debitNotesResponse.data.data;
      }
      
      console.log('All debit notes fetched:', allDebitNotes);

      // Filter debit notes for this credit bill
      const relatedDebitNotes = allDebitNotes.filter(note => note.creditBillId === creditBillId);
      console.log('Related debit notes for creditBillId', creditBillId, ':', relatedDebitNotes);
      
      // Create payment history
      const paymentHistory = [];
      
      // Add credit bill as first entry
      const creditBill = filteredCreditBills.find(bill => bill._id === creditBillId);
      if (creditBill) {
        const grandTotal = creditBill.totals?.grandTotal || creditBill.totalAmount || 0;
        const amountPaid = creditBill.paymentDetails?.amountPaid || creditBill.amountPaid || 0;
        const remainingBalance = grandTotal - amountPaid;
        
        paymentHistory.push({
          invoiceNumber: creditBill.invoiceNumber || creditBill.invoiceNo,
          billType: 'Credit Bill',
          paidAmount: amountPaid,
          remainingBalance: Math.max(0, remainingBalance),
          date: creditBill.date || creditBill.createdAt,
          description: 'Initial Payment',
          isCreditBill: true,
          grandTotal: grandTotal
        });
      }

      // Add all related debit notes in chronological order
      const sortedDebitNotes = relatedDebitNotes
        .sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));

      let runningBalance = creditBill ? (creditBill.totals?.grandTotal || creditBill.totalAmount || 0) - (creditBill.paymentDetails?.amountPaid || creditBill.amountPaid || 0) : 0;
      
      sortedDebitNotes.forEach((note, index) => {
        const amountPaid = note.totals?.totalAmount || note.amountPaid || 0;
        runningBalance = Math.max(0, runningBalance - amountPaid);
        
        paymentHistory.push({
          invoiceNumber: note.invoiceNumber,
          billType: 'Debit Note',
          paidAmount: amountPaid,
          remainingBalance: runningBalance,
          date: note.date || note.createdAt,
          description: `Installment ${index + 1}`,
          isDebitNote: true,
          debitNoteId: note._id
        });
      });

      console.log('Final payment history being returned:', paymentHistory);
      return paymentHistory;
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }
  }, [filteredCreditBills]);

  const selectCustomer = (customer) => {
    setForm({
      ...form,
      customerId: customer.customerId || '',
      customerName: customer.customerName || '',
      customerContact: {
        address: customer.customerContact?.address || '',
        phone: customer.customerContact?.phone || '',
        email: customer.customerContact?.email || '',
        gstin: customer.customerContact?.gstin || '',
      },
    });
    setCustomerName(customer.customerName || '');
    setCustomerSearch('');
    setSearchResults([]);
  };

  const createNewCustomer = useCallback(
    async (name) => {
      if (!name.trim()) {
        setNotificationMessage({ type: 'error', text: 'Customer name is required to create a new customer.' });
        setTimeout(() => setNotificationMessage(null), 5000);
        return '';
      }
      const token = localStorage.getItem('token');
      if (!token || !userEmail) {
        setNotificationMessage({ type: 'error', text: 'Please log in to create a customer.', duration: 3000 });
        setTimeout(() => setNotificationMessage(null), 5000);
        return '';
      }
      try {
        const payload = {
          customerName: sanitizeInput(name),
          customerContact: {
            address: form.customerContact.address || '',
            phone: form.customerContact.phone || '',
            email: form.customerContact.email || '',
            gstin: form.customerContact.gstin || '',
          },
          company: selectedCompany,
          createdBy: userEmail,
          lastUpdatedBy: userEmail,
        };
        const response = await api.post('/customers', payload);
        const newCustomer = response.data;
        setForm((prev) => ({
          ...prev,
          customerId: newCustomer.customerId || '',
          customerName: newCustomer.customerName || '',
          customerContact: {
            address: newCustomer.customerContact?.address || '',
            phone: newCustomer.customerContact?.phone || '',
            email: newCustomer.customerContact?.email || '',
            gstin: newCustomer.customerContact?.gstin || '',
          },
        }));
        setCustomerName(newCustomer.customerName || '');
        setNotificationMessage({ type: 'success', text: `Customer created: ${newCustomer.customerName}` });
        setTimeout(() => setNotificationMessage(null), 5000);
        return newCustomer.customerId || '';
      } catch (err) {
        console.error('createNewCustomer Error:', err);
        setNotificationMessage({ type: 'error', text: `Failed to create customer: ${err.response?.data?.message || err.message}` });
        setTimeout(() => setNotificationMessage(null), 5000);
        return '';
      }
    },
    [selectedCompany, userEmail, form.customerContact]
  );

  const handleCustomerSearch = useCallback(async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      setNotificationMessage({ type: 'error', text: 'Please enter at least 3 characters to search for customers.' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return;
    }
   
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      setNotificationMessage({ type: 'error', text: 'Please log in again. Your session has expired.' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return;
    }
   
    setIsCustomerLoading(true);
    try {
      const response = await api.get('/customers/find', {
        params: { query: sanitizeInput(query), company: selectedCompany },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const customers = Array.isArray(response.data) ? response.data : [];
      setSearchResults(customers);
     
      if (customers.length === 0) {
        setNotificationMessage({ type: 'info', text: `No customers found for "${query}". You can create a new customer below.` });
        setTimeout(() => setNotificationMessage(null), 5000);
      }
    } catch (error) {
      console.error('Failed to search customers:', error);
      setSearchResults([]);
     
      if (error.response?.status === 401) {
        setNotificationMessage({ type: 'error', text: 'Authentication failed. Please log in again.' });
      } else {
        setNotificationMessage({ type: 'error', text: `Failed to search customers: ${error.response?.data?.message || error.message}. Please try again.` });
      }
      setTimeout(() => setNotificationMessage(null), 5000);
    } finally {
      setIsCustomerLoading(false);
    }
  }, [selectedCompany]);



  const validateGSTIN = (gstin) => {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return !gstin || gstinRegex.test(gstin);
  };

  const fetchLatestDebitNoteNo = useCallback(async ({ cancelToken } = {}) => {
    setIsLoading(true);
    try {
      const companyPrefix = getCompanyPrefix(selectedCompany);
      const response = await api.get('/debitnotes/latest-invoice', {
        params: { company: selectedCompany, prefix: companyPrefix },
        cancelToken,
      });

      const invoiceNumber = response.data?.invoiceNumber || `${companyPrefix}-1`;
      setForm(prev => ({ ...prev, invoiceNumber }));
    } catch (error) {
      if (!axios.isCancel(error)) {
        setForm(prev => ({ ...prev, invoiceNumber: `${getCompanyPrefix(selectedCompany)}-1` }));
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompany]);

  const generateNextDebitNoteNumber = useCallback(async () => {
    try {
      const companyPrefix = getCompanyPrefix(selectedCompany);
      const response = await api.get('/debitnotes/latest-invoice', {
        params: { company: selectedCompany, prefix: companyPrefix },
      });

      const currentInvoiceNumber = response.data?.invoiceNumber || `${companyPrefix}-1`;
     
      // Extract number from current invoice (e.g., "WGD-2" -> 2)
      const match = currentInvoiceNumber.match(/(\d+)$/);
      const currentNumber = match ? parseInt(match[1]) : 1;
      const nextNumber = currentNumber + 1;
     
      const nextInvoiceNumber = `${companyPrefix}-${nextNumber}`;
      console.log('Generated next debit note number:', nextInvoiceNumber);
     
      return nextInvoiceNumber;
    } catch (error) {
      console.error('Failed to generate next debit note number:', error);
      const companyPrefix = getCompanyPrefix(selectedCompany);
      return `${companyPrefix}-${Math.floor(Math.random() * 1000) + 1}`;
    }
  }, [selectedCompany]);

  const saveUpdatedDebitNote = useCallback(async () => {
    try {
      // Check user permissions
      if (userRole !== 'admin' && userRole !== 'super_admin') {
        // For staff users, just save locally without updating the database
        setNotificationMessage({
          type: 'info',
          text: 'Installment added locally. Admin will need to approve and save to database.'
        });
        setTimeout(() => setNotificationMessage(null), 5000);
        return { success: true, localOnly: true };
      }
     
      // Calculate updated totals
      const totalPaid = Array.isArray(form.installments) ? form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0) : 0;
      const remainingBalance = Math.max(0, (form.totals?.totalAmount || 0) - totalPaid);
     
      const updatedDebitNote = {
        ...form,
        totals: {
          ...form.totals,
          totalAmount: form.totals?.totalAmount || 0, // Keep original balance
          remainingAmountToPay: remainingBalance,
        },
        installments: form.installments,
        lastUpdatedBy: userEmail,
        updatedAt: new Date().toISOString(),
        isFullyPaid: remainingBalance === 0,
      };
     
      // Save to database (admin only)
      const response = await api.put(`/debitnotes/${selectedId}`, updatedDebitNote);
     
      setNotificationMessage({
        type: 'success',
        text: 'Installment saved to database successfully!'
      });
      setTimeout(() => setNotificationMessage(null), 3000);
     
      return response.data;
    } catch (error) {
      console.error('Failed to save updated debit note:', error);
     
      if (error.response?.status === 403) {
        setNotificationMessage({
          type: 'warning',
          text: 'Permission denied. Installment added locally only. Contact admin to save to database.'
        });
      } else if (error.response?.status === 401) {
        setNotificationMessage({
          type: 'error',
          text: 'Authentication failed. Please log in again.'
        });
      } else {
        setNotificationMessage({
          type: 'error',
          text: `Failed to save updated debit note: ${error.response?.data?.message || error.message}`
        });
      }
      setTimeout(() => setNotificationMessage(null), 5000);
     
      // Return success for local operations even if database save fails
      return { success: true, localOnly: true };
    }
  }, [form, selectedId, userEmail, userRole]);

  const fetchSavedBills = useCallback(async ({ cancelToken } = {}) => {
    setIsLoading(true);
    try {
      const response = await api.get('/debitnotes', { cancelToken });
     
      // Handle different response structures
      let savedBillsData = [];
      if (response.data && Array.isArray(response.data)) {
        savedBillsData = response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        savedBillsData = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        savedBillsData = response.data;
      }
     
      setSavedBills(savedBillsData);
     
      // Show success message
      if (savedBillsData.length > 0) {
        setNotificationMessage({ type: 'success', text: `Loaded ${savedBillsData.length} saved debit notes` });
        setTimeout(() => setNotificationMessage(null), 3000);
      }
    } catch (error) {
      if (!axios.isCancel(error)) {
        console.error('Failed to fetch saved bills:', error);
        setNotificationMessage({ type: 'error', text: `Failed to fetch saved bills: ${error.message}` });
        setTimeout(() => setNotificationMessage(null), 5000);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchBillById = useCallback(async (id) => {
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      setNotificationMessage({ type: 'error', text: 'Only admins can edit debit notes.' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return;
    }
   
    // Check if user is authenticated
    if (!currentUser) {
      setNotificationMessage({ type: 'error', text: 'Please log in again. Your session has expired.' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return;
    }
   
    // Get fresh Firebase token
    let token;
    try {
      token = await getAuthToken();
    } catch (error) {
      setNotificationMessage({ type: 'error', text: 'Authentication failed. Please log in again.' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return;
    }
   
    setIsLoading(true);
    try {
      // Create a separate axios instance for fetch request to avoid interceptor conflicts
      const fetchApi = axios.create({
        baseURL: 'http://localhost:5000/api',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
     
      const response = await fetchApi.get(`/debitnotes/${id}`);
      const bill = response.data;
      setSelectedId(id);
      setForm({
        invoiceNumber: bill.invoiceNumber,
        customerId: bill.customerId,
        customerName: bill.customerName,
        customerContact: {
          address: bill.customerAddress || '',
          phone: bill.customerPhone || '',
          email: bill.customerEmail || '',
          gstin: bill.customerGSTIN || '',
        },
        date: bill.date,
        dueDate: bill.dueDate,
        selectedCreditBill: bill.creditBillId ? {
          creditBillId: bill.creditBillId,
          creditBillNo: bill.items[0]?.creditBillNo || '',
          itemName: bill.items[0]?.description || 'N/A',
          hsnCode: bill.items[0]?.hsnSac || '',
          totalAmount: bill.totals?.taxableAmount || 0,
          remainingBalance: bill.totals?.remainingBalance || 0,
          status: 'N/A',
        } : null,
        installments: bill.installments || [],
        discount: bill.totals?.discount || 0,
        isOtherState: bill.isOtherState || false,
        isCancelled: bill.cancelled || false,
        remarks: bill.reason || '',
        bankDetails: bill.bankDetails || { accountNumber: '', ifsc: '', bankName: '' },
        signature: bill.signature || '',
      });
      setCustomerName(bill.customerName);
    } catch (error) {
      if (!axios.isCancel(error)) {
        setNotificationMessage({ type: 'error', text: `Failed to fetch bill: ${error.message}` });
        setTimeout(() => setNotificationMessage(null), 5000);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userRole, currentUser, getAuthToken]);

  const checkUserRole = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/auth/user-role');
      const { EditPermission: editPermissions } = response.data;
      setEditPermissions(editPermissions);
    } catch (error) {
      console.error('Error checking user role:', error.response?.data || error.message);
     
      // If token expired, redirect to login
      if (error.response?.status === 401) {
        setNotificationMessage({
          type: 'error',
          text: 'Session expired. Please log in again.',
        });
        setTimeout(() => {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }, 2000);
        return;
      }
     
      setNotificationMessage({
        type: 'error',
        text: `Failed to verify user role: ${error.response?.data?.error || 'Please try again.'}`,
      });
      setTimeout(() => setNotificationMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestEditPermission = useCallback(async (billId, billData) => {
    try {
      const response = await api.post('/notifications/request-permission', {
        type: 'edit_request',
        billType: 'debitnote',
        billId: billId,
        billData: billData,
        requestedBy: userEmail,
        requestedByRole: userRole,
        reason: 'Staff requested permission to edit debit note',
        status: 'pending'
      });
     
      if (response.data.success) {
        setNotificationMessage({ type: 'success', text: 'Edit request sent to admin for approval. You will be notified once approved.' });
        setTimeout(() => setNotificationMessage(null), 5000);
      } else {
        setNotificationMessage({ type: 'error', text: 'Failed to send edit request.' });
        setTimeout(() => setNotificationMessage(null), 5000);
      }
    } catch (error) {
      setNotificationMessage({ type: 'error', text: 'Failed to send edit request.' });
      setTimeout(() => setNotificationMessage(null), 5000);
    }
  }, [userEmail, userRole]);

  const requestDeletePermission = useCallback(async (billId, billData) => {
    try {
      const response = await api.post('/notifications/request-permission', {
        type: 'delete_request',
        billType: 'debitnote',
        billId: billId,
        billData: billData,
        requestedBy: userEmail,
        requestedByRole: userRole,
        reason: 'Staff requested permission to delete debit note',
        status: 'pending'
      });
     
      if (response.data.success) {
        setNotificationMessage({ type: 'success', text: 'Delete request sent to admin for approval. You will be notified once approved.' });
        setTimeout(() => setNotificationMessage(null), 5000);
      } else {
        setNotificationMessage({ type: 'error', text: 'Failed to send delete request.' });
        setTimeout(() => setNotificationMessage(null), 5000);
      }
    } catch (error) {
      setNotificationMessage({ type: 'error', text: 'Failed to send delete request.' });
      setTimeout(() => setNotificationMessage(null), 5000);
    }
  }, [userEmail, userRole]);

  const handleDeleteBill = useCallback(async (id) => {
    // Check if user has edit permissions for this specific bill
    if (editPermissions[id] || userRole === 'admin' || userRole === 'super_admin') {
      // Check if user is authenticated
      if (!currentUser) {
        setNotificationMessage({ type: 'error', text: 'Please log in again. Your session has expired.' });
        setTimeout(() => setNotificationMessage(null), 5000);
        return;
      }
     
          // Get fresh Firebase token
    let token;
    try {
      token = await getAuthToken();
    } catch (error) {
        setNotificationMessage({ type: 'error', text: 'Authentication failed. Please log in again.' });
        setTimeout(() => setNotificationMessage(null), 5000);
        return;
      }
     
      setIsLoading(true);
      try {
        // Create a separate axios instance for delete request to avoid interceptor conflicts
        const deleteApi = axios.create({
          baseURL: 'http://localhost:5000/api',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
       
        await deleteApi.delete(`/debitnotes/${id}`);
        setSavedBills(prev => prev.filter(bill => bill._id !== id));
        setNotificationMessage({ type: 'success', text: 'Debit note deleted successfully.' });
        setSelectedId(null);
        setForm({
          customerId: '',
          customerName: '',
          customerContact: { address: '', phone: '', email: '', gstin: '' },
          invoiceNumber: '',
          date: new Date().toISOString().split('T')[0],
          dueDate: '',
          selectedCreditBill: null,
          installments: [],
          cgst: 0,
          sgst: 0,
          igst: 0,
          discount: 0,
          roundOff: 0,
          isOtherState: false,
          isCancelled: false,
          remarks: '',
          bankDetails: { accountNumber: '', ifsc: '', bankName: '' },
          signature: '',
        });
        fetchLatestDebitNoteNo();
      } catch (error) {
        if (!axios.isCancel(error)) {
          setNotificationMessage({ type: 'error', text: `Failed to delete bill: ${error.message}` });
          setTimeout(() => setNotificationMessage(null), 5000);
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      // Staff needs to request permission
      const billData = savedBills.find(bill => bill._id === id);
      if (billData) {
        setPendingEditBill(billData);
        setShowPermissionModal(true);
        await requestDeletePermission(id, billData);
      } else {
        setNotificationMessage({ type: 'error', text: 'Debit note data not found.' });
        setTimeout(() => setNotificationMessage(null), 5000);
      }
    }
  }, [userRole, fetchLatestDebitNoteNo, savedBills, requestDeletePermission, currentUser, getAuthToken, editPermissions]);

  const handleEditBill = useCallback(async (id) => {
    // Check if user has edit permissions for this specific bill
    if (editPermissions[id] || userRole === 'admin' || userRole === 'super_admin') {
      await fetchBillById(id);
    } else {
      // Staff needs to request permission
      const billData = savedBills.find(bill => bill._id === id);
      if (billData) {
        setPendingEditBill(billData);
        setShowPermissionModal(true);
        await requestEditPermission(id, billData);
      } else {
        setNotificationMessage({ type: 'error', text: 'Debit note data not found.' });
        setTimeout(() => setNotificationMessage(null), 5000);
      }
    }
  }, [userRole, savedBills, fetchBillById, requestEditPermission, editPermissions]);

  useEffect(() => {
    const source = axios.CancelToken.source();
    const fetchData = async () => {
      if (fetchInProgressRef.current) return;
      fetchInProgressRef.current = true;
      try {
        await fetchLatestDebitNoteNo({ cancelToken: source.token });
        await fetchSavedBills({ cancelToken: source.token });
        await fetchCustomers();
        await fetchCreditBills();
        await checkUserRole();
      } finally {
        fetchInProgressRef.current = false;
      }
    };

    fetchData();
    return () => {
      source.cancel('Component unmounted');
      fetchInProgressRef.current = false;
    };
  }, [selectedCompany, fetchLatestDebitNoteNo, fetchSavedBills, fetchCreditBills, checkUserRole]);

  const totals = useMemo(() => {
    // Calculate manual items total
    const manualItemsTotal = getManualItemsTotal();
   
    // Calculate credit bill total
    const creditBillTotal = form.selectedCreditBill ? (form.selectedCreditBill.totalAmount || 0) : 0;
    const balanceAmount = form.selectedCreditBill ? (form.selectedCreditBill.remainingBalance || 0) : 0;
    const sumOfInstallments = Array.isArray(form.installments) ? form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0) : 0;
    const remainingAmountToPay = balanceAmount - sumOfInstallments;

    // For debit notes: use remaining balance as subtotal, not the full credit bill amount
    // Use manual items total if no credit bill, otherwise use remaining balance
    const subtotal = form.selectedCreditBill ? remainingAmountToPay : manualItemsTotal;
    const discount = parseFloat(form.discount || 0);
    const taxableAmount = subtotal - discount;
   
    // For debit notes: no GST calculation on remaining balance
    const keralaGST = 0;
    const cgst = 0;
    const sgst = 0;
    const igst = 0;
    const totalBeforeRoundOff = taxableAmount + cgst + sgst + igst;
    const rounded = Math.round(totalBeforeRoundOff);
    const roundOff = (rounded - totalBeforeRoundOff).toFixed(2);

    return {
      subtotal,
      discount,
      taxableAmount,
      keralaGST,
      cgst,
      sgst,
      igst,
      roundOff: parseFloat(roundOff),
      rounded,
      remainingAmountToPay: form.selectedCreditBill ? Math.max(remainingAmountToPay, 0) : 0,
      balanceAmount: form.selectedCreditBill ? Math.max(balanceAmount, 0) : 0,
      manualItemsTotal,
      creditBillTotal, // Keep original total for reference
    };
  }, [form.selectedCreditBill, form.installments, form.discount, getManualItemsTotal]);

  const getCustomer = async (name, { cancelToken } = {}) => {
    const sanitizedName = sanitizeInput(name).toLowerCase();
    if (sanitizedName.length < 4) return null;

    try {
      const response = await api.get('/customers/find', {
        params: { query: sanitizedName },
        cancelToken
      });

      if (response.data && response.data.length > 0) {
        const customer = response.data[0];
        return {
          customerId: customer._id,
          customerDisplayId: customer.customerId || `CUST${customer._id.slice(-4)}`,
          customerName: customer.customerName || customer.name || '',
          customerContact: {
            address: customer.customerAddress || customer.address || customer.contactDetails?.address || '',
            phone: customer.customerPhone || customer.phone || customer.contactDetails?.phone || '',
            email: customer.customerEmail || customer.email || customer.contactDetails?.email || '',
            gstin: customer.customerGSTIN || customer.gstin || customer.contactDetails?.gstin || ''
          }
        };
      }
      return null;
    } catch (error) {
      if (!axios.isCancel(error)) {
        return null;
      }
      return null;
    }
  };

  const handleCustomerNameChange = useCallback((e) => {
    const name = sanitizeInput(e.target.value);
    setCustomerName(name);

    if (!name || name.length < 4) {
      setForm((prev) => ({
        ...prev,
        customerId: '',
        customerName: '',
        customerContact: {
          address: '',
          phone: '',
          email: '',
          gstin: '',
        },
      }));
    }
  }, []);

  const debouncedFetchCustomer = useMemo(() => {
    return debounce(async (name) => {
      const source = axios.CancelToken.source();
      try {
        const customerData = await getCustomer(name, { cancelToken: source.token });
        if (customerData) {
          setForm((prev) => ({
            ...prev,
            customerId: customerData.customerId,
            customerDisplayId: customerData.customerDisplayId,
            customerName: customerData.customerName,
            customerContact: {
              ...prev.customerContact,
              address: customerData.customerContact.address,
              phone: customerData.customerContact.phone,
              email: customerData.customerContact.email,
              gstin: customerData.customerContact.gstin,
            },
          }));
        } else {
          setForm((prev) => ({
            ...prev,
            customerId: '',
            customerName: name,
            customerContact: {
              address: '',
              phone: '',
              email: '',
              gstin: '',
            },
          }));
        }
      } catch (error) {
        if (!axios.isCancel(error)) {
          setNotificationMessage({
            type: 'error',
            text: 'Failed to fetch customer details. Please try again.',
          });
          setTimeout(() => setNotificationMessage(null), 5000);
        }
      }
      return () => source.cancel('Debounced fetch cancelled');
    }, 500);
  }, []);

  useEffect(() => {
    if (!customerName || customerName.length < 4) return;

    debouncedFetchCustomer(customerName);

    return () => debouncedFetchCustomer.cancel();
  }, [customerName, debouncedFetchCustomer]);

  const fetchBankDetails = useCallback(async (companyName) => {
    if (!companyName) return;
   
    try {
      const response = await api.get('/bank-details', {
        params: { companyName: companyName },
      });
     
      const data = response.data;
      if (data) {
        const bankData = {
          bankName: data.bankName || '',
          accountNumber: data.accountNumber || '',
          ifsc: data.ifscCode || data.ifsc || '',
          swiftCode: data.swiftCode || '',
          branch: data.branch || '',
          upiId: data.upiId || '',
        };
       
        setBankDetails(bankData);
       
        // Update form bank details
        setForm(prev => ({
          ...prev,
          bankDetails: {
            bankName: data.bankName || '',
            accountNumber: data.accountNumber || '',
            ifsc: data.ifscCode || data.ifsc || '',
          }
        }));
      } else {
        // Set default bank details if none found
        const defaultBankData = {
          bankName: 'IDFC FIRST BANK',
          accountNumber: '10192468394',
          ifsc: 'IDFB0080732',
          swiftCode: 'IDFBINBBMUM',
          branch: 'THRISSUR - EAST FORT THRISSUR BRANCH',
          upiId: '',
        };
        setBankDetails(defaultBankData);
        setForm(prev => ({
          ...prev,
          bankDetails: {
            bankName: defaultBankData.bankName,
            accountNumber: defaultBankData.accountNumber,
            ifsc: defaultBankData.ifsc,
          }
        }));
      }
    } catch (error) {
      // Set default bank details on error
      const defaultBankData = {
        bankName: 'IDFC FIRST BANK',
        accountNumber: '10192468394',
        ifsc: 'IDFB0080732',
        swiftCode: 'IDFBINBBMUM',
        branch: 'THRISSUR - EAST FORT THRISSUR BRANCH',
        upiId: '',
      };
      setBankDetails(defaultBankData);
      setForm(prev => ({
        ...prev,
        bankDetails: {
          bankName: defaultBankData.bankName,
          accountNumber: defaultBankData.accountNumber,
          ifsc: defaultBankData.ifsc,
        }
      }));
    }
  }, []);

  // Fetch bank details when component mounts
  useEffect(() => {
    if (selectedCompany) {
      fetchBankDetails(selectedCompany);
    }
  }, [selectedCompany, fetchBankDetails]);



  // Function to check if user has product access permissions
  const hasProductAccess = useCallback(() => {
    // Users with these roles have access to product details and don't need manual entry
    const rolesWithProductAccess = ['admin', 'super_admin', 'product_admin', 'inventory_admin'];
    const hasAccess = rolesWithProductAccess.includes(userRole);
    return hasAccess;
  }, [userRole]);



  const loadDebitNoteIntoForm = useCallback((debitNote) => {
    try {
     
      // Map database fields correctly
      const totalAmount = debitNote.totals?.totalAmount || 0; // This is the remaining balance (₹50,000)
      const rateAsInstallment = debitNote.rate || 0; // This is the installment paid (₹30,000)
     
      // Create an installment entry for the rate amount
      const existingInstallments = rateAsInstallment > 0 ? [
        {
          amountPaid: rateAsInstallment,
          date: debitNote.date || new Date().toISOString().split('T')[0],
          saved: true
        }
      ] : [];
     
      const remainingAmount = totalAmount; // The totalAmount is already the remaining balance
     

     
      setForm({
        invoiceNumber: debitNote.invoiceNumber || '',
        customerId: debitNote.customerId || '',
        customerName: debitNote.customerName || '',
        customerContact: {
          address: debitNote.customerAddress || '',
          phone: debitNote.customerPhone || '',
          email: debitNote.customerEmail || '',
          gstin: debitNote.customerGSTIN || '',
        },
        date: debitNote.date || new Date().toISOString().split('T')[0],
        dueDate: debitNote.dueDate || '',
        selectedCreditBill: null, // Don't show credit bill details, only debit note
        installments: existingInstallments,
        manualItems: debitNote.manualItems || [{ name: '', itemCode: '', hsnCode: '', quantity: 1, rate: 0 }],
        cgst: debitNote.totals?.cgstTotal || debitNote.totals?.cgst || 0,
        sgst: debitNote.totals?.sgstTotal || debitNote.totals?.sgst || 0,
        igst: debitNote.totals?.igstTotal || debitNote.totals?.igst || 0,
        discount: debitNote.totals?.discount || 0,
        roundOff: debitNote.totals?.roundOff || 0,
        totals: {
          totalAmount: debitNote.totals?.totalAmount || 0, // Fetch from debit note totals
          remainingAmountToPay: debitNote.totals?.totalAmount || 0, // Fetch from debit note totals
        },
        isOtherState: Boolean(debitNote.isOtherState),
        isCancelled: Boolean(debitNote.cancelled),
        remarks: debitNote.reason || debitNote.remarks || '',
        bankDetails: debitNote.bankDetails || { accountNumber: '', ifsc: '', bankName: '' },
        signature: debitNote.signature || '',
      });
     
      setSelectedId(debitNote.id || debitNote._id);
      setCustomerName(debitNote.customerName || '');
      setDebitNoteSearched(true); // Mark that debit note has been searched and loaded
     
      // Force a re-render to update totals
      setTimeout(() => {
        setForm(prevForm => {
          return { ...prevForm };
        });
      }, 100);
     
      setNotificationMessage({
        type: 'success',
        text: `Loaded debit note ${debitNote.invoiceNumber} for editing. Remaining balance: ₹${remainingAmount.toFixed(2)}`
      });
      setTimeout(() => setNotificationMessage(null), 5000);
     
    } catch (error) {
      console.error('Error loading debit note into form:', error);
      setNotificationMessage({ type: 'error', text: 'Failed to load debit note into form' });
      setTimeout(() => setNotificationMessage(null), 5000);
    }
  }, []);

  const fetchDebitNoteByInvoiceNumber = useCallback(async (invoiceNumber) => {
    if (!invoiceNumber) {
      setNotificationMessage({ type: 'error', text: 'Please provide an invoice number' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return;
    }
   
    setIsLoading(true);
    try {
      // First, get all debit notes and filter by invoice number
      const response = await api.get('/debitnotes');
     
      let allDebitNotes = [];
      if (response.data && Array.isArray(response.data)) {
        allDebitNotes = response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        allDebitNotes = response.data.data;
      }
     
      // Find the debit note with matching invoice number
      const foundDebitNote = allDebitNotes.find(note =>
        note.invoiceNumber === invoiceNumber ||
        note.invoiceNumber === invoiceNumber.toUpperCase() ||
        note.invoiceNumber === invoiceNumber.toUpperCase().trim()
      );
     
      if (foundDebitNote) {
        setNotificationMessage({ type: 'success', text: `Found debit note: ${foundDebitNote.invoiceNumber} - ${foundDebitNote.customerName}` });
        setTimeout(() => setNotificationMessage(null), 5000);
       
        // Optionally load the debit note into the form for editing
        const shouldLoad = window.confirm(`Found debit note: ${foundDebitNote.invoiceNumber}\nCustomer: ${foundDebitNote.customerName}\n\nDo you want to load this debit note for editing?`);
        if (shouldLoad) {
          loadDebitNoteIntoForm(foundDebitNote);
        }
       
        return foundDebitNote;
      } else {
        setNotificationMessage({ type: 'error', text: `No debit note found with invoice number: ${invoiceNumber}` });
        setTimeout(() => setNotificationMessage(null), 5000);
        return null;
      }
    } catch (error) {
      console.error('Failed to fetch debit note by invoice number:', error);
      setNotificationMessage({ type: 'error', text: `Failed to fetch debit note: ${error.response?.data?.message || error.message}` });
      setTimeout(() => setNotificationMessage(null), 5000);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [loadDebitNoteIntoForm]);

  const handleCreditBillChange = async (e) => {
    const invoiceNo = e.target.value;
    if (!invoiceNo) {
      setForm(prev => ({ ...prev, selectedCreditBill: null }));
      return;
    }

    setIsLoading(true);
   
    try {
      // Find the credit bill from our already loaded data
      const creditBill = filteredCreditBills.find(bill =>
        bill.invoiceNumber === invoiceNo || bill.invoiceNo === invoiceNo
      );
     
      if (!creditBill) {
        throw new Error(`Credit bill ${invoiceNo} not found in loaded data`);
      }

      // Validate that the credit bill has an _id or id
      if (!creditBill._id && !creditBill.id) {
        console.error('Credit bill missing _id or id:', creditBill);
        throw new Error(`Credit bill ${invoiceNo} is missing _id or id field`);
      }

      // Validate credit bill structure
      if (!creditBill.invoiceNo && !creditBill.invoiceNumber) {
        console.error('Credit bill missing invoiceNo or invoiceNumber:', creditBill);
        throw new Error(`Credit bill ${invoiceNo} is missing invoiceNo or invoiceNumber field`);
      }

      const firstItem = creditBill.items?.[0] || {};
      const totals = creditBill.totals || {};
      const paymentDetails = creditBill.paymentDetails || {};
     
      // Extract the key values from the credit bill
      const grandTotal = Number(totals.grandTotal) || 0;
      const amountToPay = Number(totals.amountToPay) || 0;
      const balanceAmount = Number(paymentDetails.balanceAmount) || 0;
     

     
      // Use the balance amount directly from the database (no calculations needed)
      let remainingBalance = balanceAmount;
     
      // If balanceAmount is not available, try alternative sources
      if (balanceAmount <= 0) {
        // Check if totals.remainingBalance exists (this is the outstanding balance)
        if (totals.remainingBalance !== undefined && totals.remainingBalance > 0) {
          remainingBalance = Number(totals.remainingBalance) || 0;
        }
        // Check if items have balanceAmount (this is the outstanding balance)
        else if (creditBill.items && Array.isArray(creditBill.items)) {
          const itemWithBalance = creditBill.items.find(item =>
            item && item.balanceAmount !== undefined && item.balanceAmount > 0
          );
          if (itemWithBalance) {
            remainingBalance = Number(itemWithBalance.balanceAmount) || 0;
          }
        }
      }
     
      // Ensure remainingBalance is a valid number
      if (typeof remainingBalance !== 'number' || isNaN(remainingBalance)) {
        remainingBalance = 0;
      }

      // Check if the bill has outstanding balance
      if (remainingBalance <= 0) {
        const displayBalance = typeof remainingBalance === 'number' && !isNaN(remainingBalance)
          ? remainingBalance.toFixed(2)
          : '0.00';
        setNotificationMessage({
          type: 'warning',
          text: `Credit bill ${invoiceNo} has no outstanding balance (₹${displayBalance}). Debit notes are typically created for bills with pending amounts.`
        });
        setTimeout(() => setNotificationMessage(null), 5000);
      }

      let customerId = form.customerId;
      let customerContact = { ...form.customerContact };
      if (creditBill.customerName && creditBill.customerName.trim().length > 0) {
        const customerData = await getCustomer(creditBill.customerName);
        if (customerData) {
          customerId = customerData.customerId;
          customerContact = customerData.customerContact;
          setCustomerName(customerData.customerName);
        }
      }

      // Ensure creditBillId is a valid string
      const creditBillId = String(creditBill._id || creditBill.id).trim();
      if (!creditBillId) {
        throw new Error(`Credit bill ${invoiceNo} has invalid _id or id: ${creditBill._id || creditBill.id}`);
      }

      setForm(prev => ({
        ...prev,
        selectedCreditBill: {
          creditBillId: creditBillId,
          creditBillNo: creditBill.invoiceNumber || creditBill.invoiceNo,
          invoiceNo: creditBill.invoiceNumber || creditBill.invoiceNo,
          itemName: firstItem.description || firstItem.name || 'N/A',
          hsnCode: firstItem.hsnSac || firstItem.hsnCode || '',
          grandTotal: grandTotal,
          amountToPay: amountToPay,
          totalAmount: amountToPay, // Keep for backward compatibility
          remainingBalance: remainingBalance,
          balanceAmount: remainingBalance, // Keep for backward compatibility
          status: paymentDetails.status || 'Pending'
        },
        customerId,
        customerContact
      }));

      // Fetch payment history for this credit bill
      const history = await fetchPaymentHistory(creditBillId);
      console.log('Payment History fetched:', history);
      console.log('Credit Bill ID:', creditBillId);
      console.log('Filtered Credit Bills:', filteredCreditBills);
      console.log('Setting payment history state:', history);
      setPaymentHistory(history);
      setShowPaymentHistory(true);
      
      // Calculate payment status
      if (history.length > 0) {
        const lastEntry = history[history.length - 1];
        const totalPaid = history.reduce((sum, entry) => sum + entry.paidAmount, 0);
        // const originalAmount = history[0]?.grandTotal || 0; // Removed unused variable
        const remainingBalance = lastEntry.remainingBalance;
        
        if (remainingBalance === 0) {
          // setPaymentStatus('fully_paid'); // Removed unused function call
        } else if (totalPaid > 0) {
          // setPaymentStatus('installment_paid'); // Removed unused function call
        } else {
          // setPaymentStatus('pending'); // Removed unused function call
        }
      }



      const displayBalance = typeof remainingBalance === 'number' && !isNaN(remainingBalance)
        ? remainingBalance.toFixed(2)
        : '0.00';
      setNotificationMessage({
        type: 'success',
        text: `✅ Successfully loaded credit bill ${invoiceNo}. Outstanding balance: ₹${displayBalance}. You can now add installments to track payments.`
      });
      setTimeout(() => setNotificationMessage(null), 5000);

    } catch (error) {
      console.error('Error fetching credit bill:', error);
      let errorMessage = 'Failed to fetch credit bill details.';
     
      if (error.response?.status === 404) {
        errorMessage = `❌ Credit bill ${invoiceNo} not found. Please check the invoice number and try again.`;
      } else if (error.response?.status === 500) {
        errorMessage = `❌ Server error while fetching credit bill details. Please try again later.`;
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = `❌ Network error. Please check your connection and try again.`;
      }
     
      setNotificationMessage({
        type: 'error',
        text: errorMessage
      });
      setTimeout(() => setNotificationMessage(null), 5000);
      setForm(prev => ({ ...prev, selectedCreditBill: null }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualItemChange = (index, field, value) => {
    const newItems = [...form.manualItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm(prev => ({ ...prev, manualItems: newItems }));
  };

  const handleProductSelect = (index, product) => {
    const newItems = [...form.manualItems];
    newItems[index] = {
      ...newItems[index],
      name: product.itemName || '',
      itemCode: product.itemCode || '',
      hsnCode: product.hsn || '',
      rate: product.unitPrice || 0,
    };
    setForm(prev => ({ ...prev, manualItems: newItems }));
  };

  const addManualItem = () => {
    setForm(prev => ({
      ...prev,
      manualItems: [...prev.manualItems, { name: '', itemCode: '', hsnCode: '', quantity: 1, rate: 0 }]
    }));
  };

  const removeManualItem = (index) => {
    if (form.manualItems.length === 1) {
      setNotificationMessage({ type: 'error', text: 'At least one item is required.' });
      setTimeout(() => setNotificationMessage(null), 3000);
      return;
    }
    const newItems = form.manualItems.filter((_, i) => i !== index);
    setForm(prev => ({ ...prev, manualItems: newItems }));
  };

  // const handleChange = (e) => {
  //   const { name, value } = e.target;
  //   setForm((prev) => ({ ...prev, [name]: sanitizeInput(value) }));
  // }; // Removed unused function

  const updateCustomerContact = (field, value) => {
    const sanitizedValue = sanitizeInput(value);
    if (field === 'phone' && sanitizedValue && !/^\+?\d{10,15}$/.test(sanitizedValue)) {
      setNotificationMessage({ type: 'error', text: 'Phone number must be 10-15 digits.' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return;
    }
    setForm((prev) => ({
      ...prev,
      customerContact: { ...prev.customerContact, [field]: sanitizedValue },
    }));
  };

  const addInstallment = () => {
    setForm((prev) => ({
      ...prev,
      installments: [...prev.installments, { amountPaid: 0 }],
    }));
  };

  // const handleInstallmentChange = async (index, e) => {
  //   const { name, value } = e.target;
  //   const amount = parseFloat(value) || 0;
  //  
  //   if (amount < 0) {
  //     setNotificationMessage({ type: 'error', text: 'Installment amount cannot be negative.' });
  //     setTimeout(() => setNotificationMessage(null), 5000);
  //     return;
  //   }

  //   // Get the original balance amount from the selected credit bill
  //   const originalBalance = form.selectedCreditBill?.remainingBalance || 0;
  //  
  //   // Calculate total amount already paid (excluding current installment)
  //   const currentInstallments = [...form.installments];
  //   const totalPaidExcludingCurrent = currentInstallments.reduce((sum, inst, i) => {
  //     if (i !== index) {
  //       return sum + (inst.amountPaid || 0);
  //       }
  //     return sum;
  //   }, 0);
  //  
  //   // Calculate new total with current installment
  //   const newTotalPaid = totalPaidExcludingCurrent + amount;
  //   const newRemainingBalance = Math.max(originalBalance - newTotalPaid, 0);
  //  
  //   // Check if payment exceeds the outstanding balance
  //   if (newTotalPaid > originalBalance) {
  //     setNotificationMessage({
  //       type: 'warning',
  //       text: `Payment amount (₹${newTotalPaid.toFixed(2)}) exceeds outstanding balance (₹${originalBalance.toFixed(2)}). Remaining balance will be ₹0.00.`
  //     });
  //     setTimeout(() => setNotificationMessage(null), 5000);
  //   } else if (newTotalPaid === originalBalance) {
  //     setNotificationMessage({
  //       type: 'success',
  //       text: `✅ Full payment received! Outstanding balance: ₹${newRemainingBalance.toFixed(2)}`
  //     });
  //     setTimeout(() => setNotificationMessage(null), 5000);
  //   } else {
  //     setNotificationMessage({
  //       type: 'info',
  //       text: `Payment recorded. Remaining balance: ₹${newRemainingBalance.toFixed(2)}`
  //     });
  //     setTimeout(() => setNotificationMessage(null), 3000);
  //   }
  //  
  //   // Update the installment
  //   const installments = [...form.installments];
  //   installments[index][name] = amount;
  //   setForm((prev) => ({ ...prev, installments }));
  //  
  //   // Check if final installment is paid
  //   setIsFinalInstallmentPaid(newRemainingBalance === 0);
  //  
  //   // Generate payment receipt if balance is fully paid
  //   if (newRemainingBalance === 0 && !isFinalInstallmentPaid) {
  //     const receiptBlob = await generatePaymentReceipt();
  //     if (receiptBlob) {
  //       setPaymentReceiptUrl(URL.createObjectURL(receiptBlob));
  //     }
  //   }
  // }; // Removed unused function

  // const saveInstallment = (index) => {
  //   const installment = form.installments[index];
  //   if (!installment || installment.amountPaid <= 0) {
  //     setNotificationMessage({
  //       type: 'error',
  //       text: 'Please enter a valid amount before saving the installment.'
  //     });
  //     setTimeout(() => setNotificationMessage(null), 3000);
  //     return;
  //   }

  //   // Mark the installment as saved
  //   const installments = [...form.installments];
  //   installments[index] = { ...installment, saved: true };
  //   setForm((prev) => ({ ...prev, installments }));

  //   // Calculate remaining balance
  //   const originalBalance = form.selectedCreditBill?.remainingBalance || 0;
  //   const totalPaid = installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0);
  //   const remainingBalance = Math.max(originalBalance - totalPaid, 0);

  //   setNotificationMessage({
  //     type: 'success',
  //     text: `✅ Installment of ₹${installment.amountPaid.toFixed(2)} saved successfully! Remaining balance: ₹${remainingBalance.toFixed(2)}`
  //   });
  //   setTimeout(() => setNotificationMessage(null), 3000);

  //   // Check if final installment is paid
  //   setIsFinalInstallmentPaid(remainingBalance === 0);
  // }; // Removed unused function

  const removeInstallment = (index) => {
    const installments = [...form.installments];
    const removedAmount = installments[index]?.amountPaid || 0;
    installments.splice(index, 1);
    setForm((prev) => ({ ...prev, installments }));
   
    // Calculate new remaining balance after removal
    const originalBalance = form.selectedCreditBill?.remainingBalance || 0;
    const newTotalPaid = installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0);
    const newRemainingBalance = Math.max(originalBalance - newTotalPaid, 0);
   
    // Show feedback about the removal
    if (removedAmount > 0) {
      setNotificationMessage({
        type: 'info',
        text: `Installment of ₹${removedAmount.toFixed(2)} removed. Remaining balance: ₹${newRemainingBalance.toFixed(2)}`
      });
      setTimeout(() => setNotificationMessage(null), 3000);
    }
   
    setIsFinalInstallmentPaid(newRemainingBalance === 0);
  };

  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = () => {
        setNotificationMessage({ type: 'error', text: `Failed to load image: ${src}` });
        setTimeout(() => setNotificationMessage(null), 5000);
        reject(new Error(`Failed to load image: ${src}`));
      };
    });
  };

  const addCommonPDFElements = async (doc, y, pageWidth, isCancelled) => {
    doc.setFontSize(40);
    doc.setTextColor(200, 200, 200);
    doc.text('DEBIT NOTE', pageWidth / 2, 148, { align: 'center' });
    if (isCancelled) {
      doc.setFontSize(50);
      doc.setTextColor(255, 0, 0, 0.5);
      doc.text('CANCELLED', pageWidth / 2, 148, { align: 'center', angle: 45 });
    }
    const logoImg = await loadImage(logo);
    const watermarkImg = await loadImage(watermark);
    doc.addImage(watermarkImg, 'PNG', 50, 100, 100, 100, undefined, 'NONE', 0.3);
    const logoWidth = 30;
    const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
    doc.addImage(logoImg, 'PNG', 10, y, logoWidth, logoHeight);
    return y + logoHeight + 5;
  }
   // Helper function to convert blob to base64
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]; // Remove data:application/pdf;base64, prefix
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };



  const generatePaymentReceipt = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 10;

    try {
      y = await addCommonPDFElements(doc, y, doc.internal.pageSize.getWidth(), false);

      doc.setFont(undefined, 'bold');
      doc.text('PAYMENT RECEIPT', 190, y, { align: 'right' });
      doc.setFont(undefined, 'normal');
      doc.text('Wyenfos Bills', 10, y + 10);
      doc.setFontSize(10);
      doc.text('Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001', 10, y + 16);
      y += 34;

      doc.setFontSize(12);
      doc.text(`Receipt Date: ${new Date().toISOString().split('T')[0]}`, 10, y);
      y += 6;
      doc.text(`Customer: ${form.customerName} (ID: ${form.customerId})`, 10, y);
      y += 6;
      doc.text(`Debit Note #${form.invoiceNumber}`, 10, y);
      y += 6;
      doc.text(`Total Amount: ₹${form.selectedCreditBill?.totalAmount.toFixed(2)}`, 10, y);
      y += 6;
      doc.text(`Total Paid: ₹${(form.selectedCreditBill?.amountPaid + form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0)).toFixed(2)}`, 10, y);
      y += 6;
      doc.text(`Remaining Balance: ₹${totals.balanceAmount.toFixed(2)}`, 10, y);
      y += 10;

      doc.text('Thank you for your payment!', 10, y);
      y += 10;
      doc.text('Authorized Signatory', 190, y, { align: 'right' });

      return doc.output('blob');
    } catch (error) {
      setNotificationMessage({ type: 'error', text: `Failed to generate payment receipt: ${error.message}` });
      setTimeout(() => setNotificationMessage(null), 5000);
      return null;
    }
  };

  const validateForm = useCallback(() => {
   
    if (!form.customerId) {
      setNotificationMessage({ type: 'error', text: 'Please select or create a customer.' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return false;
    }
    if (!form.customerContact.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerContact.email)) {
      setNotificationMessage({ type: 'error', text: 'Please enter a valid customer email address.' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return false;
    }
    if (!form.dueDate) {
      setNotificationMessage({ type: 'error', text: 'Please enter a due date.' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return false;
    }
    if (!form.selectedCreditBill) {
      setNotificationMessage({ type: 'error', text: 'Please select a credit bill.' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return false;
    }
    if (!form.selectedCreditBill.creditBillId || typeof form.selectedCreditBill.creditBillId !== 'string' || form.selectedCreditBill.creditBillId.trim() === '') {
      setNotificationMessage({ type: 'error', text: 'Credit bill ID is invalid. Please reselect the credit bill.' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return false;
    }
    if (form.installments.some((inst) => inst.amountPaid < 0)) {
      setNotificationMessage({ type: 'error', text: 'Installment amounts cannot be negative.' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return false;
    }
    return true;
  }, [form.customerId, form.customerContact.email, form.dueDate, form.selectedCreditBill, form.installments]);



  const sendEmail = async () => {
   
    // Check if user is authenticated
    if (!currentUser) {
      console.log('No current user found');
      setNotificationMessage({ type: 'error', text: 'Please log in again. Your session has expired.' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return;
    }
   
    // Get fresh Firebase token
    let token;
    try {
      if (!currentUser?.getIdToken) {
        throw new Error('User does not have getIdToken method');
      }
     
      token = await getAuthToken();
    } catch (error) {
      setNotificationMessage({ type: 'error', text: 'Authentication failed. Please log in again.' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return;
    }
   
    if (!validateForm()) {
      setNotificationMessage({ type: 'error', text: 'Please correct the form errors before sending email.' });
      return;
    }
    if (!form.customerContact?.email) {
      setNotificationMessage({ type: 'error', text: 'Please provide a customer email address.' });
      return;
    }
    setIsLoading(true);
   
    // Reduced timeout to 30 seconds for faster feedback
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Email operation timed out. Please try again.')), 30000); // 30 second timeout
    });
   
    try {

     
      // Create a separate axios instance for email request to avoid interceptor conflicts
      const emailApi = axios.create({
        baseURL: 'http://localhost:5000/api',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
     

     
      // Test the token with a simple GET request first
      try {
        await emailApi.get('/debitnotes');
      } catch (testError) {
        throw new Error('Token validation failed');
      }
     
      // Generate PDF for attachment using the same function as download
      setNotificationMessage({
        type: 'info',
        text: 'Generating PDF for email attachment...'
      });
     
      let pdfBase64;
     
      // Try to generate PDF with a shorter timeout
      try {
        const pdfTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('PDF generation timeout')), 15000); // 15 second timeout for PDF
        });
       
        setNotificationMessage({
          type: 'info',
          text: 'Generating PDF attachment...'
        });
       
        const pdfBlob = await Promise.race([generatePDF(), pdfTimeoutPromise]);
        pdfBase64 = await blobToBase64(pdfBlob);
       
        setNotificationMessage({
          type: 'info',
          text: 'Sending email with PDF...'
        });
      } catch (pdfError) {
        setNotificationMessage({
          type: 'warning',
          text: 'Sending email without PDF attachment...'
        });
        pdfBase64 = null;
      }
     
      // Use the separate API instance for email request with timeout
      const emailOperation = emailApi.post('/debitnotes/send-email', {
        to: form.customerContact.email,
        subject: `Debit Note ${form.invoiceNumber} - ${selectedCompany}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #b39eb5; border-bottom: 2px solid #b39eb5; padding-bottom: 10px;">
              Debit Note from ${selectedCompany}
            </h2>
           
            <p>Dear ${form.customerName},</p>
           
            <p>Please find attached your debit note for the outstanding balance.</p>
           
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Debit Note Details:</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li><strong>Debit Note Number:</strong> ${form.invoiceNumber}</li>
                <li><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</li>
                <li><strong>Customer ID:</strong> ${form.customerId}</li>
                <li><strong>Customer Name:</strong> ${form.customerName}</li>
                <li><strong>Total Amount:</strong> ₹${totals.rounded.toFixed(2)}</li>
                <li><strong>Status:</strong> ${form.isCancelled ? 'Cancelled' : 'Active'}</li>
              </ul>
            </div>
           
            <p><strong>Important Notes:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>This debit note is issued for outstanding balance</li>
              <li>Please contact us within 7 days for any discrepancies</li>
              <li>Payment should be made as per agreed terms</li>
            </ul>
           
            <p>If you have any questions, please don't hesitate to contact us.</p>
           
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="margin: 0;"><strong>Best regards,</strong><br>
              ${selectedCompany}<br>
              Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001<br>
              Mobile: 8547014116 | Email: wyenfos@gmail.com<br>
              Website: www.wyenfos.com</p>
            </div>
          </div>
        `,
        attachments: pdfBase64 ? [{
          filename: `DebitNote_${form.invoiceNumber}.pdf`,
          content: pdfBase64,
          contentType: 'application/pdf'
        }] : []
      });
     
      // Race between email operation and timeout
      await Promise.race([emailOperation, timeoutPromise]);
      setNotificationMessage({
        type: 'success',
        text: pdfBase64 ? '✅ Email sent successfully! Debit note PDF has been attached.' : '✅ Email sent successfully! (without PDF attachment)'
      });
      setTimeout(() => setNotificationMessage(null), 5000);
    } catch (error) {
     
      // Handle timeout errors specifically
      if (error.message.includes('timed out')) {
        setNotificationMessage({
          type: 'error',
          text: 'Email operation timed out. The PDF generation is taking too long. Please try using the Download button to save the PDF and send it manually, or try again later.'
        });
      } else if (error.response?.status === 401) {
        const errorMessage = error.response?.data?.error || 'Authentication failed';
        if (errorMessage.includes('expired') || errorMessage.includes('Invalid')) {
          setNotificationMessage({
            type: 'error',
            text: 'Your session has expired. Please log out and log in again to send emails. You can also use the Download button to save the PDF and send it manually.'
          });
          // Clear the invalid token
          localStorage.removeItem('token');
        } else {
          setNotificationMessage({
            type: 'error',
            text: 'Authentication failed. Please log in again and try sending the email. You can also use the Download button to save the PDF and send it manually.'
          });
        }
      } else if (error.response?.status === 500) {
        setNotificationMessage({
          type: 'error',
          text: 'Server error. Please try again later or contact support.'
        });
      } else {
        setNotificationMessage({
          type: 'error',
          text: error.response?.data?.message || error.response?.data?.error || 'Failed to send email. Please try again.'
        });
      }
      setTimeout(() => setNotificationMessage(null), 8000); // Show error longer for timeout issues
    } finally {
      setIsLoading(false);
    }
  };

  const saveDebitNote = async () => {
    if (!validateForm()) return;
    if (userRole !== 'admin' && userRole !== 'super_admin' && selectedId) {
      setNotificationMessage({ type: 'error', text: 'Only admins can edit debit notes.' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return;
    }
   
    // Check if user is authenticated
    if (!currentUser) {
      setNotificationMessage({ type: 'error', text: 'Please log in again. Your session has expired.' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return;
    }
   
    // Get fresh Firebase token
    let token;
    try {
      token = await getAuthToken();
      console.log('Save: Fresh token obtained, length:', token ? token.length : 0);
    } catch (error) {
      console.error('Save: Failed to get fresh token:', error);
      setNotificationMessage({ type: 'error', text: 'Authentication failed. Please log in again.' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return;
    }
   
    setIsLoading(true);
    try {
      if (!form.selectedCreditBill) {
        setNotificationMessage({ type: 'error', text: 'Please select a credit bill.' });
        return;
      }
      if (!form.selectedCreditBill.creditBillId || form.selectedCreditBill.creditBillId.trim() === '') {
        setNotificationMessage({ type: 'error', text: 'Credit bill ID is missing. Please reselect the credit bill.' });
        return;
      }
      if (!form.customerId) {
        setNotificationMessage({ type: 'error', text: 'Please select a customer.' });
        return;
      }
      if (!form.dueDate) {
        setNotificationMessage({ type: 'error', text: 'Please enter a due date.' });
        return;
      }
      if (!validateGSTIN(form.customerContact.gstin)) {
        setNotificationMessage({ type: 'error', text: 'Invalid GSTIN format.' });
        setTimeout(() => setNotificationMessage(null), 5000);
        return;
      }

     
      const updatedForm = {
        invoiceNumber: form.invoiceNumber,
        date: form.date,
        dueDate: form.dueDate,
        creditBillId: form.selectedCreditBill.creditBillId,
        customerId: form.customerId,
        customerName: form.customerName,
        customerAddress: form.customerContact.address || '',
        customerGSTIN: form.customerContact.gstin || '',
        company: { name: selectedCompany },
        items: [
          {
            description: form.selectedCreditBill.itemName || 'Product',
            hsnSac: form.selectedCreditBill.hsnCode || '',
            quantity: 1,
            unit: 'unit',
            rate: Number(form.selectedCreditBill.totalAmount) || 0,
            taxableValue: Number(form.selectedCreditBill.totalAmount) || 0,
            cgstRate: form.isOtherState ? 0 : 9,
            cgstAmount: Number(totals.cgst) || 0,
            sgstRate: form.isOtherState ? 0 : 9,
            sgstAmount: Number(totals.sgst) || 0,
            igstRate: form.isOtherState ? 18 : 0,
            igstAmount: Number(totals.igst) || 0,
          },
          ...form.installments.map((installment) => ({
            description: 'Installment',
            hsnSac: form.selectedCreditBill.hsnCode || '',
            quantity: 1,
            unit: 'unit',
            rate: Number(installment.amountPaid) || 0,
            taxableValue: Number(installment.amountPaid) || 0,
            cgstRate: form.isOtherState ? 0 : 9,
            cgstAmount: 0,
            sgstRate: form.isOtherState ? 0 : 9,
            sgstAmount: 0,
            igstRate: form.isOtherState ? 18 : 0,
            igstAmount: 0,
          })),
        ],
        totals: {
          taxableAmount: Number(totals.taxableAmount) || 0,
          cgstTotal: Number(totals.cgst) || 0,
          sgstTotal: Number(totals.sgst) || 0,
          igstTotal: Number(totals.igst) || 0,
          totalAmount: Number(totals.rounded) || 0,
        },
        reason: form.remarks || 'Debit note issued',
        isOtherState: Boolean(form.isOtherState),
        cancelled: Boolean(form.isCancelled),
        createdBy: userEmail || 'system',
        lastUpdatedBy: userEmail || 'system',
        bankDetails: form.bankDetails || {},
        signature: form.signature || '',
      };
     

     
      // Final validation before sending
      if (!updatedForm.creditBillId || typeof updatedForm.creditBillId !== 'string' || updatedForm.creditBillId.trim() === '') {
        setNotificationMessage({ type: 'error', text: 'Invalid credit bill ID. Please reselect the credit bill.' });
        return;
      }
     
      // Create a separate axios instance for save request to avoid interceptor conflicts
      const saveApi = axios.create({
        baseURL: 'http://localhost:5000/api',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
     
      let response;
      if (selectedId) {
        response = await saveApi.put(`/debitnotes/${selectedId}`, updatedForm);
        setNotificationMessage({ type: 'success', text: 'Debit note updated successfully.' });
      } else {
        response = await saveApi.post('/debitnotes', updatedForm);
        setSelectedId(response.data._id);
        setForm((prev) => ({ ...prev, invoiceNumber: response.data.invoiceNumber }));
        setNotificationMessage({ type: 'success', text: 'Debit note created successfully.' });
      }
      setForm({
        customerId: '',
        customerName: '',
        customerContact: { address: '', phone: '', email: '', gstin: '' },
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: '',
        selectedCreditBill: null,
        installments: [],
        cgst: 0,
        sgst: 0,
        igst: 0,
        discount: 0,
        roundOff: 0,
        isOtherState: false,
        isCancelled: false,
        remarks: '',
        bankDetails: { accountNumber: '', ifsc: '', bankName: '' },
        signature: '',
      });
      setSelectedId(null);
      fetchLatestDebitNoteNo();
      fetchSavedBills();
    } catch (error) {
      if (!axios.isCancel(error)) {
       
        let errorMessage = 'Failed to save debit note';
        if (error.response?.data?.message) {
          errorMessage += `: ${error.response.data.message}`;
        } else if (error.response?.data?.error) {
          errorMessage += `: ${error.response.data.error}`;
        } else if (error.message) {
          errorMessage += `: ${error.message}`;
        }
       
        setNotificationMessage({ type: 'error', text: errorMessage });
        setTimeout(() => setNotificationMessage(null), 8000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Generate PDF function that returns a blob (for both download and email)
  const generatePDF = useCallback(async () => {
   
    if (!form.selectedCreditBill) {
      throw new Error('Please select a credit bill');
    }

    console.log('PDF Generation - Payment History Check:', {
      paymentHistory: paymentHistory,
      hasPaymentHistory: !!paymentHistory,
      paymentHistoryLength: paymentHistory ? paymentHistory.length : 0,
      condition: paymentHistory && paymentHistory.length > 0,
      selectedCreditBill: form.selectedCreditBill,
      hasSelectedCreditBill: !!form.selectedCreditBill,
      installments: form.installments,
      installmentsLength: form.installments ? form.installments.length : 0
    });



    // Create a temporary div with the formatted content for PDF
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '800px';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.padding = '20px';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    tempDiv.style.fontSize = '12px';
    tempDiv.style.color = 'black';
   
    // Generate the formatted content
    tempDiv.innerHTML = `
      <div style="margin-bottom: 20px; padding-right: 30px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="flex: 1; display: flex; align-items: flex-start;">
            <div style="width: 90px; height: 70px; margin-right: 15px; display: flex; align-items: center; justify-content: center; border-radius: 50%; overflow: hidden;">
              <img src="${companyDetails.logo || '/uploads/wyenfos.png'}" alt="Company Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 50%;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <span style="font-size: 12px; color: #333; text-align: center; font-weight: bold; display: none;">${selectedCompany.split(' ').map(word => word[0]).join('')}</span>
            </div>
            <div>
              <h2 style="margin: 0 0 10px 0; color: #333; font-size: 20px;">${selectedCompany}</h2>
              <p style="margin: 5px 0; font-size: 12px;"><strong>Address:</strong> ${companyDetails.address || 'N/A'}</p>
              <p style="margin: 5px 0; font-size: 12px;"><strong>Mobile:</strong> ${companyDetails.mobile || 'N/A'}</p>
              <p style="margin: 5px 0; font-size: 12px;"><strong>Email:</strong> ${companyDetails.email || 'N/A'}</p>
              <p style="margin: 5px 0; font-size: 12px;"><strong>Website:</strong> ${companyDetails.website || 'N/A'}</p>
              <p style="margin: 5px 0; font-size: 12px;"><strong>GSTIN:</strong> ${companyDetails.GSTIN || 'N/A'}</p>
              <p style="margin: 5px 0; font-size: 12px;"><strong>State:</strong> ${companyDetails.state || 'N/A'}</p>
            </div>
          </div>
          <div style="flex: 1; text-align: right; padding-right: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #333;">Bill Details</h3>
            <p style="margin: 5px 0; font-size: 12px;"><strong>Bill No:</strong> ${form.invoiceNumber || 'N/A'}</p>
            <p style="margin: 5px 0; font-size: 12px;"><strong>Date:</strong> ${form.date || 'N/A'}</p>
            <p style="margin: 5px 0; font-size: 12px;"><strong>Due Date:</strong> ${form.dueDate || 'N/A'}</p>
          </div>
        </div>
      </div>
     
              <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="font-size: 18px; margin: 0; color: #333;">DEBIT NOTE</h3>
          ${form.selectedCreditBill ? `
            <p style="margin: 5px 0; font-size: 12px; color: #666;">
              <strong>Reference Credit Bill:</strong> ${form.selectedCreditBill.creditBillNo || 'N/A'} |
              <strong>Product Grand Total:</strong> ₹${form.selectedCreditBill.grandTotal?.toFixed(2) || '0.00'}
            </p>
          ` : ''}
        </div>
     
              <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0;">Customer Information:</h3>
          <div style="display: flex; justify-content: space-between;">
            <div style="flex: 1;">
              <p style="margin: 5px 0; font-size: 12px;"><strong>Customer ID:</strong> ${form.customerId || 'N/A'}</p>
              <p style="margin: 5px 0; font-size: 12px;"><strong>Name:</strong> ${form.customerName || 'N/A'}</p>
              <p style="margin: 5px 0; font-size: 12px;"><strong>Address:</strong> ${form.customerContact.address || 'N/A'}</p>
            </div>
            <div style="flex: 1;">
              <p style="margin: 5px 0; font-size: 12px;"><strong>Phone:</strong> ${form.customerContact.phone || 'N/A'}</p>
              <p style="margin: 5px 0; font-size: 12px;"><strong>Email:</strong> ${form.customerContact.email || 'N/A'}</p>
              <p style="margin: 5px 0; font-size: 12px;"><strong>GSTIN:</strong> ${form.customerContact.gstin || 'N/A'}</p>
            </div>
          </div>
          ${form.selectedCreditBill ? `
            <div style="margin-top: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 5px; border-left: 4px solid #28a745;">
              <h4 style="margin: 0 0 8px 0; color: #28a745;">Product Details:</h4>
              <div style="display: flex; justify-content: space-between; font-size: 12px;">
                <div>
                  <p style="margin: 3px 0;"><strong>Product:</strong> ${form.selectedCreditBill.itemName || 'N/A'}</p>
                  <p style="margin: 3px 0;"><strong>Product Grand Total:</strong> ₹${form.selectedCreditBill.grandTotal?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p style="margin: 3px 0;"><strong>Amount Customer Previously Paid:</strong> ₹${form.selectedCreditBill.amountToPay?.toFixed(2) || '0.00'}</p>
                  <p style="margin: 3px 0;"><strong>Outstanding Balance:</strong> ₹${form.selectedCreditBill.remainingBalance?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
     
      <!-- Complete Payment History Section -->
      <div style="margin-bottom: 20px;padding: 10px; background-color: white;">
        <h3 style="margin: 0 0 15px 0; color: #28a745; text-align: center; font-size: 16px;">
          📊 Complete Payment History - TEST VISIBLE
        </h3>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 10px; background-color: white; border-radius: 4px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <thead>
              <tr style="background-color: #28a745; color: white;">
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">S.No</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Invoice Number</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Bill Type</th>
                <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">Paid Amount</th>
                <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">Remaining Balance</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Date</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Description</th>
              </tr>
            </thead>
            <tbody>
              ${paymentHistory && paymentHistory.length > 0 ? paymentHistory.map((entry, index) => `
                <tr style="background-color: ${entry.remainingBalance <= 0 ? '#e8f5e8' : '#fff3cd'}; border-bottom: 1px solid #ddd;">
                  <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
                  <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold;">${entry.invoiceNumber || 'N/A'}</td>
                  <td style="padding: 6px; border: 1px solid #ddd;">
                    <span style="padding: 2px 6px; border-radius: 8px; font-size: 9px; font-weight: bold; background-color: ${entry.billType === 'Credit Bill' ? '#007bff' : '#28a745'}; color: white;">
                      ${entry.billType}
                    </span>
                  </td>
                  <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-weight: bold;">₹${entry.paidAmount.toFixed(2)}</td>
                  <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: ${entry.remainingBalance <= 0 ? '#28a745' : '#dc3545'};">₹${entry.remainingBalance.toFixed(2)}</td>
                  <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${new Date(entry.date).toLocaleDateString('en-IN')}</td>
                  <td style="padding: 6px; border: 1px solid #ddd;">${entry.description}</td>
                </tr>
              `).join('') : ''}
              
              ${(!paymentHistory || paymentHistory.length === 0) ? `
                <tr style="background-color: #e8f5e8; border-bottom: 1px solid #ddd;">
                  <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">1</td>
                  <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold;">${form.selectedCreditBill.creditBillNo || 'N/A'}</td>
                  <td style="padding: 6px; border: 1px solid #ddd;">
                    <span style="padding: 2px 6px; border-radius: 8px; font-size: 9px; font-weight: bold; background-color: #007bff; color: white;">
                      Credit Bill
                    </span>
                  </td>
                  <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-weight: bold;">₹${form.selectedCreditBill.amountPaid?.toFixed(2) || '0.00'}</td>
                  <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #dc3545;">₹${form.selectedCreditBill.remainingBalance?.toFixed(2) || '0.00'}</td>
                  <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${form.date || new Date().toLocaleDateString('en-IN')}</td>
                  <td style="padding: 6px; border: 1px solid #ddd;">Initial Payment</td>
                </tr>
              ` : ''}
              
              <!-- New Payment Row -->
              ${form.installments.length > 0 ? `
                <tr style="background-color: #e3f2fd; border-top: 2px solid #2196f3; font-weight: bold;">
                  <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${(paymentHistory ? paymentHistory.length : 0) + 1}</td>
                  <td style="padding: 6px; border: 1px solid #ddd;">${form.invoiceNumber || 'New Debit Note'}</td>
                  <td style="padding: 6px; border: 1px solid #ddd;">
                    <span style="padding: 2px 6px; border-radius: 8px; font-size: 9px; font-weight: bold; background-color: #ff9800; color: white;">
                      New Payment
                    </span>
                  </td>
                  <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-weight: bold;">₹${form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0).toFixed(2)}</td>
                  <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #dc3545;">₹${Math.max(0, (paymentHistory && paymentHistory.length > 0 ? paymentHistory[paymentHistory.length - 1]?.remainingBalance || 0 : (form.selectedCreditBill?.remainingBalance || 0)) - form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0)).toFixed(2)}</td>
                  <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${new Date().toLocaleDateString('en-IN')}</td>
                  <td style="padding: 6px; border: 1px solid #ddd;">New Installment</td>
                </tr>
              ` : ''}
            </tbody>
          </table>

          <!-- Payment Summary -->
          <div style="padding: 12px; background-color: #e8f5e8; border-radius: 6px; border: 1px solid #28a745; margin-top: 15px;">
            <h5 style="margin: 0 0 10px 0; color: #28a745; font-weight: bold; font-size: 14px;">
              💰 Payment Summary:
            </h5>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
              <div><strong>Original Amount:</strong> ₹${paymentHistory && paymentHistory.length > 0 ? paymentHistory[0]?.grandTotal?.toFixed(2) || '0.00' : (form.selectedCreditBill?.grandTotal?.toFixed(2) || '0.00')}</div>
              <div><strong>Current Balance:</strong> ₹${(paymentHistory && paymentHistory.length > 0 ? paymentHistory[paymentHistory.length - 1]?.remainingBalance || 0 : (form.selectedCreditBill?.remainingBalance || 0)).toFixed(2)}</div>
              <div><strong>New Payment:</strong> ₹${form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0).toFixed(2)}</div>
               <div><strong>Total Paid:</strong> ₹${((paymentHistory && paymentHistory.length > 0 ? paymentHistory.reduce((sum, entry) => sum + entry.paidAmount, 0) : (form.selectedCreditBill?.amountPaid || 0)) + form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0)).toFixed(2)}</div>
              <div><strong>Final Balance:</strong> ₹${Math.max(0, (paymentHistory && paymentHistory.length > 0 ? paymentHistory[0]?.grandTotal || 0 : (form.selectedCreditBill?.grandTotal || 0)) - ((paymentHistory && paymentHistory.length > 0 ? paymentHistory.reduce((sum, entry) => sum + entry.paidAmount, 0) : (form.selectedCreditBill?.amountPaid || 0)) + form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0))).toFixed(2)}</div>
              <div><strong>Status:</strong> 
                <span style="padding: 2px 6px; border-radius: 8px; font-size: 10px; font-weight: bold; background-color: ${(form.paymentStatus || 'pending') === 'fully_paid' ? '#28a745' : (form.paymentStatus || 'pending') === 'installment_paid' ? '#ffc107' : '#dc3545'}; color: white; margin-left: 5px;">
                  ${(form.paymentStatus || 'pending') === 'fully_paid' ? '✅ FULLY PAID' : (form.paymentStatus || 'pending') === 'installment_paid' ? '💰 INSTALLMENT PAID' : '⏳ PENDING'}
                </span>
              </div>
            </div>
          </div>
        </div>
     


      
     
      <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
        <div style="flex: 1;">
          <h4>Remarks:</h4>
          <p>${form.remarks || '—'}</p>
        </div>
        <div style="flex: 1; text-align: right; padding-right: 20px;">
          <h4>Amount Summary</h4>
          ${form.selectedCreditBill ? `
            <p><strong>Product Grand Total:</strong> ₹${form.selectedCreditBill.grandTotal?.toFixed(2) || '0.00'}</p>
            <p><strong>Amount Customer Paid:</strong> ₹${form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0).toFixed(2)}</p>
            <hr style="border: 1px solid #ddd; margin: 10px 0;">
          ` : ''}
          <h3><strong>Remaining Balance:</strong> ₹${(paymentHistory && paymentHistory.length > 0 ? paymentHistory[paymentHistory.length - 1]?.remainingBalance || 0 : (form.selectedCreditBill?.remainingBalance || 0)).toFixed(2)}</h3>
        </div>
      </div>
    `;
   
    document.body.appendChild(tempDiv);
   
    // Use html2canvas to capture the formatted content (optimized for speed)
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(tempDiv, {
      scale: 1.5, // Reduced scale for faster processing
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 800,
      height: tempDiv.scrollHeight,
      logging: false, // Disable logging for faster processing
      removeContainer: true // Automatically remove container
    });
   
    // Remove the temporary div (if not already removed by html2canvas)
    if (document.body.contains(tempDiv)) {
      document.body.removeChild(tempDiv);
    }
   
    // Convert canvas to PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 190; // A4 width minus margins
    const pageHeight = 277; // A4 height minus margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
   
    // Add first page
    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    heightLeft -= pageHeight;
   
    // Add additional pages if content is longer than one page
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, 10 + position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
   
    // Add second page with Bank Details and Terms & Conditions
    pdf.addPage();
   
    // Create second page content
    const secondPageDiv = document.createElement('div');
    secondPageDiv.style.width = '800px';
    secondPageDiv.style.padding = '20px';
    secondPageDiv.style.backgroundColor = 'white';
    secondPageDiv.style.color = 'black';
    secondPageDiv.style.fontFamily = 'Arial, sans-serif';
   
    secondPageDiv.innerHTML = `
      <!-- Terms & Conditions Section - Top -->
      <div style="margin-top: 20px; margin-bottom: 30px;">
        <h4 style="margin: 0 0 15px 0; text-align: center; color: #333; font-size: 16px;">Terms & Conditions:</h4>
        <ol style="margin: 0; padding-left: 40px; font-size: 12px; line-height: 1.6; max-width: 600px; margin: 0 auto;">
          <li style="margin: 8px 0; padding: 0;">This debit note is issued as per agreed terms.</li>
          <li style="margin: 8px 0; padding: 0;">Contact us within 7 days for discrepancies.</li>
          <li style="margin: 8px 0; padding: 0;">Subject to applicable tax laws.</li>
          <li style="margin: 8px 0; padding: 0;">Payment should be made within the specified due date.</li>
          <li style="margin: 8px 0; padding: 0;">Late payments may incur additional charges.</li>
        </ol>
      </div>

      <!-- Bank Details and QR Code Section - Below Terms -->
      <div style="display: flex; margin-bottom: 30px;">
        <div style="flex: 1; margin-right: 40px;">
          <h4 style="margin: 0 0 15px 0; color: #28a745; font-size: 16px;">Bank Details:</h4>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6;">
            <ul style="list-style: none; padding: 0; margin: 0; font-size: 12px; line-height: 1.6;">
              <li style="margin: 8px 0; padding: 0;"><strong>Company name:</strong> ${selectedCompany}</li>
              <li style="margin: 8px 0; padding: 0;"><strong>Account No:</strong> ${bankDetails?.accountNumber || '10192468394'}</li>
              <li style="margin: 8px 0; padding: 0;"><strong>IFSC:</strong> ${bankDetails?.ifsc || 'IDFB0080732'}</li>
              <li style="margin: 8px 0; padding: 0;"><strong>SWIFT code:</strong> ${bankDetails?.swiftCode || 'IDFBINBBMUM'}</li>
              <li style="margin: 8px 0; padding: 0;"><strong>Bank name:</strong> ${bankDetails?.bankName || 'IDFC FIRST BANK'}</li>
              <li style="margin: 8px 0; padding: 0;"><strong>Branch:</strong> ${bankDetails?.branch || 'THRISSUR - EAST FORT THRISSUR BRANCH'}</li>
            </ul>
          </div>
        </div>
        <div style="flex: 1; text-align: center;">
          <div style="margin-bottom: 20px;">
            <p style="font-size: 14px; margin-bottom: 10px; font-weight: bold;">QR Code</p>
            <p style="font-size: 12px; color: #666; margin-bottom: 15px;">Scan to Pay</p>
            <div id="qr-code-container-page2"></div>
          </div>
        </div>
      </div>

      <!-- Payment Information Section - Centered -->
      <div style="margin-bottom: 30px; text-align: center;">
        <h4 style="margin: 0 0 20px 0; color: #28a745; font-size: 16px;">Payment Information</h4>
        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; border: 2px solid #28a745; max-width: 500px; margin: 0 auto;">
          <h5 style="margin: 0 0 15px 0; color: #28a745; font-size: 14px;">Installment Summary</h5>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: left; margin-bottom: 15px;">
            <div><strong>Total Installments Made:</strong> ${Array.isArray(form.installments) ? form.installments.length : 0}</div>
            <div><strong>Total Amount Paid:</strong> ₹${((paymentHistory && paymentHistory.length > 0 ? paymentHistory.reduce((sum, entry) => sum + entry.paidAmount, 0) : (form.selectedCreditBill?.amountPaid || 0)) + form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0)).toFixed(2)}</div>
            <div><strong>Remaining Balance:</strong> ₹${(paymentHistory && paymentHistory.length > 0 ? paymentHistory[paymentHistory.length - 1]?.remainingBalance || 0 : (form.selectedCreditBill?.remainingBalance || 0)).toFixed(2)}</div>
            <div><strong>Status:</strong> ${(form.paymentStatus || 'pending') === 'fully_paid' ? '✅ Fully Paid' : (form.paymentStatus || 'pending') === 'installment_paid' ? '💰 Installment Paid' : '⏳ Payment Pending'}</div>
          </div>
          ${(form.paymentStatus || 'pending') === 'fully_paid' ? `
            <div style="margin-top: 15px; padding: 12px; background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px;">
              <p style="margin: 0; font-size: 12px; color: #155724; font-weight: bold;">
                ✅ Payment Complete: All installments have been paid successfully.
              </p>
            </div>
          ` : (form.paymentStatus || 'pending') === 'installment_paid' ? `
            <div style="margin-top: 15px; padding: 12px; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 6px;">
              <p style="margin: 0; font-size: 12px; color: #856404; font-weight: bold;">
                💰 Installment Paid: Partial payment received. Remaining balance: ₹${totals.remainingAmountToPay?.toFixed(2) || '0.00'}
              </p>
            </div>
          ` : `
            <div style="margin-top: 15px; padding: 12px; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px;">
              <p style="margin: 0; font-size: 12px; color: #721c24; font-weight: bold;">
                ⏳ Payment Pending: Please contact us to arrange the next payment of ₹${totals.remainingAmountToPay?.toFixed(2) || '0.00'}
              </p>
            </div>
          `}
        </div>
      </div>

      <!-- Authorized Signatory - Right Side -->
      <div style="text-align: right; margin-top: 40px; padding-right: 20px;">
        <p style="font-size: 14px; margin: 8px 0; text-align: right;">Authorized Signatory</p>
        <strong style="font-size: 14px;">${selectedCompany}</strong>
      </div>
    `;
   
    
    document.body.appendChild(secondPageDiv);
   
    // Add QR code to the second page
    const qrCodeContainerPage2 = secondPageDiv.querySelector('#qr-code-container-page2');
    if (qrCodeContainerPage2) {
      const qrCodeData = `Company: ${selectedCompany}\nAccount: ${bankDetails?.accountNumber || '10192468394'}\nIFSC: ${bankDetails?.ifsc || 'IDFB0080732'}\nBank: ${bankDetails?.bankName || 'IDFC FIRST BANK'}\nBranch: ${bankDetails?.branch || 'THRISSUR - EAST FORT THRISSUR BRANCH'}`;
     
      // Create QR code using canvas
      const qrCanvas = document.createElement('canvas');
      qrCanvas.width = 60;
      qrCanvas.height = 60;
      qrCanvas.style.width = '60px';
      qrCanvas.style.height = '60px';
      qrCodeContainerPage2.appendChild(qrCanvas);
     
      // Generate QR code using qrcode library (optimized for speed)
      const QRCode = (await import('qrcode')).default;
      await QRCode.toCanvas(qrCanvas, qrCodeData, {
        width: 60,
        margin: 1, // Reduced margin for faster processing
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'L' // Lower error correction for faster generation
      });
    }
   
    // Capture second page (optimized for speed)
    const secondPageCanvas = await html2canvas(secondPageDiv, {
      scale: 1.5, // Reduced scale for faster processing
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 800,
      height: secondPageDiv.scrollHeight,
      logging: false, // Disable logging for faster processing
      removeContainer: true // Automatically remove container
    });
   
    // Remove the second page div (if not already removed by html2canvas)
    if (document.body.contains(secondPageDiv)) {
      document.body.removeChild(secondPageDiv);
    }
   
    // Add second page to PDF
    const secondPageImgData = secondPageCanvas.toDataURL('image/png');
    const secondPageImgWidth = 190;
    const secondPageImgHeight = (secondPageCanvas.height * secondPageImgWidth) / secondPageCanvas.width;
    pdf.addImage(secondPageImgData, 'PNG', 10, 10, secondPageImgWidth, secondPageImgHeight);
   
    // Return the PDF as a blob
    return pdf.output('blob');
  }, [form, selectedCompany, totals, bankDetails, companyDetails, paymentHistory]);

  const downloadPDF = useCallback(async () => {
    if (!form.selectedCreditBill) {
      setNotificationMessage({ type: 'error', text: 'Please select a credit bill' });
      setTimeout(() => setNotificationMessage(null), 3000);
      return;
    }

    setIsLoading(true);
   
    try {
      const pdfBlob = await generatePDF();
     
      // Create a download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DebitNote_${form.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
     
      setNotificationMessage({ type: 'success', text: 'PDF downloaded successfully.' });
    } catch (error) {
      setNotificationMessage({ type: 'error', text: `Failed to download PDF: ${error.message}` });
      setTimeout(() => setNotificationMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  }, [form, generatePDF]);

  const printDebitNote = useCallback(async () => {
    if (!form.selectedCreditBill) {
      setNotificationMessage({ type: 'error', text: 'Please select a credit bill' });
      setTimeout(() => setNotificationMessage(null), 3000);
      return;
    }

    setIsLoading(true);
   
    try {
      // Prepare debit note data for PDF generation (similar to CreditNote approach)
      const debitNoteData = {
        ...form,
        invoiceNumber: form.invoiceNumber,
        date: form.date || new Date().toISOString().split('T')[0],
        dueDate: form.dueDate,
        creditBillId: form.selectedCreditBill?.creditBillId,
        customerId: form.customerId,
        customerName: form.customerName,
        customerAddress: form.customerContact.address || '',
        customerGSTIN: form.customerContact.gstin || '',
        company: { name: selectedCompany },
        items: [
          {
            description: form.selectedCreditBill?.itemName || 'Product',
            hsnSac: form.selectedCreditBill?.hsnCode || '',
            quantity: 1,
            unit: 'unit',
            rate: Number(form.selectedCreditBill?.remainingBalance) || 0,
            taxableValue: Number(form.selectedCreditBill?.remainingBalance) || 0,
            cgstRate: form.isOtherState ? 0 : 9,
            cgstAmount: Number(totals.cgst) || 0,
            sgstRate: form.isOtherState ? 0 : 9,
            sgstAmount: Number(totals.sgst) || 0,
            igstRate: form.isOtherState ? 18 : 0,
            igstAmount: Number(totals.igst) || 0,
          },
          ...form.installments.map((installment) => ({
            description: 'Installment Payment',
            hsnSac: form.selectedCreditBill?.hsnCode || '',
            quantity: 1,
            unit: 'unit',
            rate: Number(installment.amountPaid) || 0,
            taxableValue: Number(installment.amountPaid) || 0,
            cgstRate: 0,
            cgstAmount: 0,
            sgstRate: 0,
            sgstAmount: 0,
            igstRate: 0,
            igstAmount: 0,
          })),
        ],
        totals: {
          taxableAmount: Number(totals.taxableAmount) || 0,
          cgstTotal: Number(totals.cgst) || 0,
          sgstTotal: Number(totals.sgst) || 0,
          igstTotal: Number(totals.igst) || 0,
          totalAmount: Number(totals.rounded) || 0,
          remainingAmountToPay: Number(totals.remainingAmountToPay) || 0,
        },
        reason: form.remarks || 'Debit note issued',
        isOtherState: Boolean(form.isOtherState),
        cancelled: Boolean(form.isCancelled),
        createdBy: userEmail || 'system',
        lastUpdatedBy: userEmail || 'system',
        bankDetails: form.bankDetails || {},
        signature: form.signature || '',
        installments: form.installments || [],
        selectedCreditBill: form.selectedCreditBill,
      };
     
      // Generate PDF using server (similar to CreditNote approach)
      const pdfResponse = await Promise.race([
        api.post('/debitnotes/generate-pdf-unsaved', { debitNoteData }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('PDF generation timed out')), 30000)
        )
      ]);
     
      const pdfBase64 = pdfResponse.data.data.pdf;
     
      // Convert base64 to blob and create URL (same as CreditNote)
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });
      const pdfBlobUrl = URL.createObjectURL(pdfBlob);
     
      // Open PDF in new window and trigger print (same as CreditNote)
      const newWindow = window.open(pdfBlobUrl);
      if (newWindow) {
        // Wait for PDF to load then trigger print
        setTimeout(() => {
          newWindow.print();
          // Clean up blob URL after printing
          setTimeout(() => {
            URL.revokeObjectURL(pdfBlobUrl);
          }, 2000);
        }, 1000);
      }
     
      setNotificationMessage({ type: 'success', text: 'Print dialog opened successfully with PDF format!' });
      setTimeout(() => setNotificationMessage(null), 3000);
     
    } catch (error) {
      console.error('Print error:', error);
      setNotificationMessage({
        type: 'error',
        text: `Failed to generate print view: ${error.message}`
      });
      setTimeout(() => setNotificationMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  }, [form, selectedCompany, totals, userEmail]);



  return (
    <ErrorBoundary>
      <div className="page-wrapper">
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
          </div>
        )}
        {notificationMessage && (
          <div className={`notification ${notificationMessage.type}`}>
            {notificationMessage.text}
            <button
              onClick={() => setNotificationMessage(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                marginLeft: '10px',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>
        )}
                  <div className="content-container">

           
            {form.isCancelled && (
              <div className="cancelled-watermark">
                <img src={cancelledWatermark} alt="Cancelled Watermark" />
              </div>
            )}
         
          <div className="note-header">
            <CompanyHeader
              selectedCompany={{
                name: companyDetails.name || selectedCompany,
                address: companyDetails.address || 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
                GSTIN: companyDetails.GSTIN || '32AAECW1234B1Z0',
                state: companyDetails.state || 'Kerala',
                stateCode: companyDetails.stateCode || '32',
                mobile: companyDetails.mobile || '+91 9847012349',
                email: companyDetails.email || 'info@wyenfos.com',
                website: companyDetails.website || 'www.wyenfos.com',
                logo: companyDetails.logo || '/uploads/wyenfos.png',
                prefix: getCompanyPrefix(selectedCompany)
              }}
              billType="DEBIT_NOTE"
              billDetails={{
                invoiceNumber: form.invoiceNumber,
                date: form.date,
                reference: form.dueDate ? `Due: ${form.dueDate}` : '',
                isCancelled: form.isCancelled
              }}
              showBankDetails={false}
                        />
          </div>
     
          {/* Customer Search Section - Hidden in Print/PDF */}
          <div className="customer-search-section no-print">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search customers by ID, name, phone, or email"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="customer-search-input"
                disabled={form.isCancelled || isLoading}
              />
              <button
                type="button"
                className="search-button no-print"
                onClick={() => {
                  if (customerSearch.trim()) {
                    handleCustomerSearch(customerSearch);
                  }
                }}
                disabled={form.isCancelled || isLoading || isCustomerLoading}
              >
                <i className="fas fa-search"></i>
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((customer) => (
                  <div
                    key={customer._id || customer.customerId}
                    onClick={() => selectCustomer(customer)}
                    className="search-result-item"
                  >
                    {customer.customerId} - {customer.customerName} ({Array.isArray(customer.company) ? customer.company.join(', ') : customer.company || 'N/A'})
                    {customer.customerContact?.phone && ` - ${customer.customerContact.phone}`}
                    {customer.customerContact?.email && ` - ${customer.customerContact.email}`}
                  </div>
                ))}
              </div>
            )}
            {customerSearch.trim() && searchResults.length === 0 && (
              <button
                className="btn-create-customer no-print"
                onClick={() => createNewCustomer(customerSearch)}
                disabled={isLoading}
              >
                Create New Customer: {customerSearch}
              </button>
            )}
          </div>

          <div className="customer-details ">
            <h3 className="customer-info-heading">Customer Information</h3>
            <div className="customer-form">
              <div className="credit-bill-input-group">
                <label>Customer Name:</label>
                <input
                  type="text"
                  placeholder="Customer Name (min 4 characters)"
                  value={customerName}
                  onChange={handleCustomerNameChange}
                  className="credit-bill-input"
                  disabled={form.isCancelled}
                  minLength={4}
                  required
                />
                {form.customerId && (
                  <div className="customer-id-display">
                    Customer ID: {form.customerId}
                  </div>
                )}
                {/* Error handling removed - not currently used */}
              </div>

              <div className="credit-bill-input-group">
                <label>Customer ID:</label>
                <input
                  type="text"
                  placeholder="Customer ID (optional)"
                  value={form.customerId || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, customerId: e.target.value }))}
                  className="credit-bill-input"
                  disabled={form.isCancelled}
                />
                {/* Error handling removed - not currently used */}
              </div>

              <div className="credit-bill-input-group">
                <label>Date:</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                  className="credit-bill-input"
                  disabled={form.isCancelled}
                />
                {/* Error handling removed - not currently used */}
              </div>

              <div className="credit-bill-input-group">
                <label>Address:</label>
                <input
                  type="text"
                  placeholder="Customer Address"
                  value={form.customerContact.address || ''}
                  onChange={(e) => updateCustomerContact('address', e.target.value)}
                  className="credit-bill-input"
                  disabled={form.isCancelled}
                />
                {/* Error handling removed - not currently used */}
              </div>

              <div className="credit-bill-input-group">
                <label>Phone:</label>
                <input
                  type="text"
                  placeholder="Customer Phone (10-15 digits)"
                  value={form.customerContact.phone || ''}
                  onChange={(e) => updateCustomerContact('phone', e.target.value)}
                  className="credit-bill-input"
                  disabled={form.isCancelled}
                />
                {/* Error handling removed - not currently used */}
              </div>

              <div className="credit-bill-input-group">
                <label>Email:</label>
                <input
                  type="email"
                  placeholder="Customer Email"
                  value={form.customerContact.email || ''}
                  onChange={(e) => updateCustomerContact('email', e.target.value)}
                  className="credit-bill-input"
                  disabled={form.isCancelled}
                  required
                />
                {/* Error handling removed - not currently used */}
              </div>

              <div className="credit-bill-input-group">
                <label>GSTIN:</label>
                <input
                  type="text"
                  placeholder="Customer GSTIN (optional)"
                  value={form.customerContact.gstin || ''}
                  onChange={(e) => updateCustomerContact('gstin', e.target.value)}
                  className="credit-bill-input"
                  disabled={form.isCancelled}
                />
                {/* Error handling removed - not currently used */}
              </div>

              <div className="credit-bill-input-group">
                <label>Due Date:</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="credit-bill-input"
                  disabled={form.isCancelled}
                  required
                />
                {/* Error handling removed - not currently used */}
              </div>
            </div>
          </div>

          <div className="tax-options no-print">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={form.isOtherState}
                onChange={(e) => setForm((prev) => ({ ...prev, isOtherState: e.target.checked }))}
                disabled={form.isCancelled}
              />
              Is Other State (IGST applicable)
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={form.isCancelled}
                onChange={(e) => setForm((prev) => ({ ...prev, isCancelled: e.target.checked }))}
              />
              Cancel
            </label>
          </div>




          <h3 className="Debitsection-title">
            Credit Bill Details
            {form.selectedCreditBill && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setForm(prev => ({ ...prev, selectedCreditBill: null }));
                    setFilteredCreditBills([]);
                    setShowPaymentHistory(false);
                    setPaymentHistory([]);
                  }}
                  className="change-credit-bill-btn no-print"
                  style={{
                    marginLeft: '10px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Change Credit Bill
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                  className="toggle-payment-history-btn no-print"
                  style={{
                    marginLeft: '10px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    backgroundColor: showPaymentHistory ? '#dc3545' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {showPaymentHistory ? '📊 Hide Payment History' : '📊 Show Payment History'}
                </button>
              </>
            )}
          </h3>
           
          <div className="credit-bill-selection">
          <div className="items-sectionn">
            <div className="item-headerr">
              <div>Invoice No.</div>
              <div>Item Details</div>
              <div>Total Amount Paid</div>
              <div>Status</div>
              <div>Installment Paid</div>
              <div>Balance Amount</div>
            </div>
            <div className="item-row">
              <div></div>
              <div className="search-container">
                {/* Status indicator */}
                <div style={{
                  marginBottom: '10px',
                  padding: '8px 12px',
                  backgroundColor: isLoading ? '#fff3cd' : filteredCreditBills.length > 0 ? '#d4edda' : '#f8d7da',
                  border: `1px solid ${isLoading ? '#ffeaa7' : filteredCreditBills.length > 0 ? '#c3e6cb' : '#f5c6cb'}`,
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: isLoading ? '#856404' : filteredCreditBills.length > 0 ? '#155724' : '#721c24'
                }}>
                  {isLoading ? '🔄 Loading credit bills...' :
                   filteredCreditBills.length > 0 ? `✅ Found ${filteredCreditBills.length} credit bills with outstanding balance (₹ > 0)` :
                   '❌ No credit bills with outstanding balance found (all bills are fully paid)'}
                 
                 
                </div>
                <select
                  value={form.selectedCreditBill?.creditBillNo || ''}
                  onChange={handleCreditBillChange}
                  className="credit-bill-select"
                  disabled={form.isCancelled || !filteredCreditBills.length}
                  required
                >
                  <option key="select-placeholder" value="">Select Credit Bill with Outstanding Balance</option>
                  {Array.isArray(filteredCreditBills) && filteredCreditBills.length > 0 ? (
                    filteredCreditBills.map((bill, index) => {
                      try {
                        // Safety check for bill object
                        if (!bill || typeof bill !== 'object') {
                          console.warn('Invalid bill object in dropdown:', bill);
                          return null;
                        }
                       
                        // Ensure bill has _id or id field
                        if (!bill._id && !bill.id) {
                          console.warn('Bill missing _id or id field in dropdown:', bill.invoiceNo);
                          return null;
                        }
                       
                        // Use the balance amount directly from the database (no calculations needed)
                        let remainingBalance = 0;
                       
                        // Check if balanceAmount exists directly on the bill (this is the outstanding balance)
                        if (bill.balanceAmount !== undefined && bill.balanceAmount > 0) {
                          remainingBalance = Number(bill.balanceAmount) || 0;
                        }
                        // Check if paymentDetails.balanceAmount exists (this is the outstanding balance)
                        else if (bill.paymentDetails?.balanceAmount !== undefined && bill.paymentDetails.balanceAmount > 0) {
                          remainingBalance = Number(bill.paymentDetails.balanceAmount) || 0;
                        }
                        // Check if totals.remainingBalance exists (this is the outstanding balance)
                        else if (bill.totals?.remainingBalance !== undefined && bill.totals.remainingBalance > 0) {
                          remainingBalance = Number(bill.totals.remainingBalance) || 0;
                        }
                        // Check if items have balanceAmount (this is the outstanding balance)
                        else if (bill.items && Array.isArray(bill.items)) {
                          const itemWithBalance = bill.items.find(item =>
                            item && item.balanceAmount !== undefined && item.balanceAmount > 0
                          );
                          if (itemWithBalance) {
                            remainingBalance = Number(itemWithBalance.balanceAmount) || 0;
                          }
                        }
                       
                        // Ensure remainingBalance is a valid number
                        if (typeof remainingBalance !== 'number' || isNaN(remainingBalance)) {
                          remainingBalance = 0;
                        }
                       
                        // Ensure remainingBalance is a valid number
                        const displayBalance = typeof remainingBalance === 'number' && !isNaN(remainingBalance)
                          ? remainingBalance.toFixed(2)
                          : '0.00';
                       
                        return (
                          <option key={bill._id || bill.id || bill.invoiceNumber || bill.invoiceNo || `bill-${index}`} value={bill.invoiceNumber || bill.invoiceNo}>
                            {bill.invoiceNumber || bill.invoiceNo} - {bill.customerName} (Balance: ₹{displayBalance})
                          </option>
                        );
                      } catch (error) {
                        console.error('Error rendering bill option:', bill, error);
                        return null;
                      }
                    })
                  ) : (
                    <option key="no-bills-found" value="">
                      {isLoading ? 'Loading credit bills...' : `No Credit Bills with Outstanding Balance Found (${filteredCreditBills.length} bills loaded)`}
                    </option>
                  )}
                </select>
              </div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
            </div>
            {form.selectedCreditBill && (
              <>
                <div style={{
                  marginBottom: '10px',
                  padding: '8px 12px',
                  backgroundColor: '#e8f5e8',
                  border: '1px solid #28a745',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}>
                  📋 <strong>Credit Bill loaded: {form.selectedCreditBill.creditBillNo || form.selectedCreditBill.invoiceNo || form.selectedCreditBill.creditBillId}</strong> - Outstanding balance: ₹{form.selectedCreditBill.remainingBalance.toFixed(2)}
                </div>
                <div className="credit-bill-row">
                  <div>{form.selectedCreditBill.creditBillNo || form.selectedCreditBill.invoiceNo || form.selectedCreditBill.creditBillId}</div>
                  <div>{form.selectedCreditBill.itemName || form.selectedCreditBill.customerName || 'N/A'}</div>
                  <div>₹{(form.selectedCreditBill.totalAmount || 0).toFixed(2)}</div>
                  <div>{form.selectedCreditBill.status || 'Active'}</div>
                  <div></div>
                  <div>₹{(form.selectedCreditBill.remainingBalance || 0).toFixed(2)}</div>
                </div>
                {/* Grand Total Row */}
            
              </>
            )}
           
            {/* Product Grand Total Summary */}
            {form.selectedCreditBill && (
              <div className="product-summary" style={{
                marginBottom: '15px',
                padding: '12px',
                backgroundColor: '#f0f8ff',
                border: '1px solid #007bff',
                borderRadius: '6px',
                fontSize: '14px'
              }}>
                <div className="summary-row" style={{ marginBottom: '8px' }}>
                  <span className="summary-label" style={{ fontWeight: 'bold', color: '#007bff' }}>Product Grand Total:</span>
                  <span className="summary-value" style={{ fontWeight: 'bold', color: '#007bff' }}>₹{form.selectedCreditBill.grandTotal?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="summary-row" style={{ marginBottom: '8px' }}>
                  <span className="summary-label">Amount Customer Paid:</span>
                  <span className="summary-value">₹{form.selectedCreditBill.amountPaid?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Outstanding Balance:</span>
                  <span className="summary-value">₹{form.selectedCreditBill.remainingBalance?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            )}

            {/* Payment History Table */}
            {showPaymentHistory && paymentHistory.length > 0 && (
              <div className="payment-history-section" style={{
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                border: '2px solid #28a745',
                borderRadius: '8px'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#28a745', fontWeight: 'bold', textAlign: 'center' }}>
                  📊 Complete Payment History
                </h4>
                
                <div className="payment-history-table" style={{
                  overflowX: 'auto',
                  marginBottom: '15px'
                }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '12px',
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: '#28a745', color: 'white' }}>
                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>S.No</th>
                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Invoice Number</th>
                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Bill Type</th>
                        <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #ddd' }}>Paid Amount</th>
                        <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #ddd' }}>Remaining Balance</th>
                        <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>Date</th>
                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((entry, index) => (
                        <tr key={index} style={{
                          backgroundColor: entry.remainingBalance <= 0 ? '#e8f5e8' : '#fff3cd',
                          borderBottom: '1px solid #ddd'
                        }}>
                          <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{index + 1}</td>
                          <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>
                            {entry.invoiceNumber || 'N/A'}
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              backgroundColor: entry.billType === 'Credit Bill' ? '#007bff' : '#28a745',
                              color: 'white'
                            }}>
                              {entry.billType}
                            </span>
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>
                            ₹{entry.paidAmount.toFixed(2)}
                          </td>
                          <td style={{ 
                            padding: '8px', 
                            border: '1px solid #ddd', 
                            textAlign: 'right', 
                            fontWeight: 'bold',
                            color: entry.remainingBalance <= 0 ? '#28a745' : '#dc3545'
                          }}>
                            ₹{entry.remainingBalance.toFixed(2)}
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                            {new Date(entry.date).toLocaleDateString('en-IN')}
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                            {entry.description}
                          </td>
                        </tr>
                      ))}
                      
                      {/* New Payment Row */}
                      <tr style={{
                        backgroundColor: '#e3f2fd',
                        borderTop: '2px solid #2196f3',
                        fontWeight: 'bold'
                      }}>
                        <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                          {paymentHistory.length + 1}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          <input 
                            type="text" 
                            placeholder="New Debit Note No" 
                            value={form.invoiceNumber}
                            onChange={(e) => setForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '4px',
                              border: '1px solid #2196f3',
                              borderRadius: '3px',
                              fontSize: '12px'
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            backgroundColor: '#ff9800',
                            color: 'white'
                          }}>
                            New Payment
                          </span>
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>
                          <input 
                            type="number" 
                            placeholder="Amount to Pay" 
                            value={form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0)}
                            onChange={(e) => {
                              const amount = parseFloat(e.target.value) || 0;
                              // Update installments
                              if (amount > 0) {
                                setForm(prev => ({
                                  ...prev,
                                  installments: [{ amountPaid: amount, date: new Date().toISOString().split('T')[0] }]
                                }));
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '4px',
                              border: '1px solid #2196f3',
                              borderRadius: '3px',
                              fontSize: '12px',
                              textAlign: 'right'
                            }}
                          />
                        </td>
                        <td style={{ 
                          padding: '8px', 
                          border: '1px solid #ddd', 
                          textAlign: 'right', 
                          fontWeight: 'bold',
                          color: '#dc3545'
                        }}>
                          ₹{Math.max(0, (paymentHistory[paymentHistory.length - 1]?.remainingBalance || 0) - form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0)).toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                          {new Date().toLocaleDateString('en-IN')}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          New Installment
                        </td>
                      </tr>
                      
                      {/* Additional Installment Rows */}
                      {form.installments.filter(inst => inst.isNewRow).map((installment, index) => {
                        const rowNumber = paymentHistory.length + 2 + index;
                        const previousBalance = index === 0 ? 
                          (paymentHistory[paymentHistory.length - 1]?.remainingBalance || 0) - form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0) :
                          (paymentHistory[paymentHistory.length - 1]?.remainingBalance || 0) - form.installments.slice(0, index + 1).reduce((sum, inst) => sum + (inst.amountPaid || 0), 0);
                        
                        return (
                          <tr key={`new-row-${index}`} style={{
                            backgroundColor: '#e8f5e8',
                            borderTop: '1px solid #28a745',
                            fontWeight: 'bold'
                          }}>
                            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                              {rowNumber}
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                              <input 
                                type="text" 
                                placeholder="Debit Note No" 
                                value={installment.invoiceNumber || ''}
                                onChange={(e) => {
                                  const updatedInstallments = [...form.installments];
                                  updatedInstallments[form.installments.findIndex(inst => inst === installment)].invoiceNumber = e.target.value;
                                  setForm(prev => ({ ...prev, installments: updatedInstallments }));
                                }}
                                style={{
                                  width: '100%',
                                  padding: '4px',
                                  border: '1px solid #28a745',
                                  borderRadius: '3px',
                                  fontSize: '12px'
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                backgroundColor: '#28a745',
                                color: 'white'
                              }}>
                                Debit Note
                              </span>
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>
                              <input 
                                type="number" 
                                placeholder="Amount to Pay" 
                                value={installment.amountPaid || 0}
                                onChange={(e) => {
                                  const amount = parseFloat(e.target.value) || 0;
                                  const updatedInstallments = [...form.installments];
                                  updatedInstallments[form.installments.findIndex(inst => inst === installment)].amountPaid = amount;
                                  setForm(prev => ({ ...prev, installments: updatedInstallments }));
                                }}
                                style={{
                                  width: '100%',
                                  padding: '4px',
                                  border: '1px solid #28a745',
                                  borderRadius: '3px',
                                  fontSize: '12px',
                                  textAlign: 'right'
                                }}
                              />
                            </td>
                            <td style={{ 
                              padding: '8px', 
                              border: '1px solid #ddd', 
                              textAlign: 'right', 
                              fontWeight: 'bold',
                              color: Math.max(0, previousBalance - (installment.amountPaid || 0)) === 0 ? '#28a745' : '#dc3545'
                            }}>
                              ₹{Math.max(0, previousBalance - (installment.amountPaid || 0)).toFixed(2)}
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                              {new Date(installment.date).toLocaleDateString('en-IN')}
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                <span>Installment {index + 1}</span>
                                <button
                                  onClick={() => {
                                    const updatedInstallments = form.installments.filter(inst => inst !== installment);
                                    setForm(prev => ({ ...prev, installments: updatedInstallments }));
                                  }}
                                  style={{
                                    padding: '2px 6px',
                                    fontSize: '10px',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Payment Summary */}
                <div style={{
                  padding: '12px',
                  backgroundColor: '#e8f5e8',
                  borderRadius: '6px',
                  border: '1px solid #28a745'
                }}>
                  <h5 style={{ margin: '0 0 10px 0', color: '#28a745', fontWeight: 'bold' }}>
                    💰 Payment Summary:
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                    <div><strong>Original Amount:</strong> ₹{paymentHistory[0]?.grandTotal?.toFixed(2) || '0.00'}</div>
                    <div><strong>Total Paid:</strong> ₹{(paymentHistory.reduce((sum, entry) => sum + entry.paidAmount, 0) + form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0)).toFixed(2)}</div>
                    <div><strong>Current Balance:</strong> ₹{(paymentHistory[paymentHistory.length - 1]?.remainingBalance || 0).toFixed(2)}</div>
                    <div><strong>New Payment:</strong> ₹{form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0).toFixed(2)}</div>
                    <div><strong>Final Balance:</strong> ₹{Math.max(0, (paymentHistory[paymentHistory.length - 1]?.remainingBalance || 0) - form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0)).toFixed(2)}</div>
                    <div><strong>Status:</strong> 
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        backgroundColor: (form.paymentStatus || 'pending') === 'fully_paid' ? '#28a745' : (form.paymentStatus || 'pending') === 'installment_paid' ? '#ffc107' : '#dc3545',
                        color: 'white',
                        marginLeft: '5px'
                      }}>
                        {(form.paymentStatus || 'pending') === 'fully_paid' ? '✅ FULLY PAID' : (form.paymentStatus || 'pending') === 'installment_paid' ? '💰 INSTALLMENT PAID' : '⏳ PENDING'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Add Installment Button */}
                <div style={{
                  textAlign: 'center',
                  marginTop: '15px',
                  padding: '15px',
                  backgroundColor: '#e3f2fd',
                  borderRadius: '8px',
                  border: '2px solidrgb(147, 94, 190)'
                }}>
                                    <button
                    onClick={() => {
                      // Add a new installment to the form
                      const newInstallment = {
                        amountPaid: 0,
                        date: new Date().toISOString().split('T')[0],
                        saved: false,
                        invoiceNumber: `WGD-${form.installments.length + 1}`,
                        isNewRow: true
                      };
                     
                      setForm(prev => ({
                        ...prev,
                        installments: [...prev.installments, newInstallment]
                      }));
                     
                      setNotificationMessage({
                        type: 'success',
                        text: '✅ New installment row added to table! Enter amount and save.'
                      });
                     
                      setTimeout(() => setNotificationMessage(null), 3000);
                    }}
                    className="add-item-btn no-print"
                    disabled={form.isCancelled}
                    style={{
                      padding: '12px 24px',
                      fontSize: '12px',
                      backgroundColor:'#997a8d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    + Add Installment
                  </button>
                </div>
              </div>
            )}
           
            {/* Payment Summary */}
            {form.selectedCreditBill && (
              <div className="payment-summary">
           
                <div className="summary-row">
                  <span className="summary-label">Amount Going to Pay:</span>
                  <span className="summary-value">₹{(Array.isArray(form.installments) ? form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0) : 0).toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Remaining Balance:</span>
                  <span className={`summary-value ${paymentHistory.length > 0 && (paymentHistory[paymentHistory.length - 1]?.remainingBalance || 0) - (Array.isArray(form.installments) ? form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0) : 0) === 0 ? 'paid' : 'pending'}`}>
                    ₹{Math.max(0, (paymentHistory.length > 0 ? (paymentHistory[paymentHistory.length - 1]?.remainingBalance || 0) : (totals.remainingAmountToPay || 0)) - (Array.isArray(form.installments) ? form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0) : 0)).toFixed(2)}
                  </span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Payment Status:</span>
                  <select
                    value={form.paymentStatus || 'pending'}
                    onChange={(e) => setForm(prev => ({ ...prev, paymentStatus: e.target.value }))}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      border: '1px solid #ccc',
                      backgroundColor: form.paymentStatus === 'fully_paid' ? '#28a745' : form.paymentStatus === 'installment_paid' ? '#ffc107' : '#dc3545',
                      color: 'white',
                      cursor: 'pointer',
                      marginLeft: '10px',
                      minWidth: '150px'
                    }}
                    disabled={form.isCancelled}
                  >
                    <option value="pending" style={{ backgroundColor: '#dc3545', color: 'white' }}>⏳ PENDING</option>
                    <option value="installment_paid" style={{ backgroundColor: '#ffc107', color: 'white' }}>💰 INSTALLMENT PAID</option>
                    <option value="fully_paid" style={{ backgroundColor: '#28a745', color: 'white' }}>✅ FULLY PAID</option>
                  </select>
                </div>
              </div>
            )}
           
            {/* {form.installments.map((installment, index) => (
              <div key={index} className="credit-bill-row">
                <div>{index + 1}</div>
                <div></div>
                <div></div>
                <div></div>
                <div>
                  <input
                    type="number"
                    name="amountPaid"
                    value={installment.amountPaid}
                    onChange={(e) => handleInstallmentChange(index, e)}
                    className="input-field"
                    min="0"
                    step="0.01"
                    disabled={form.isCancelled}
                  />
                </div>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <button
                    onClick={() => saveInstallment(index)}
                    className="save-installment-btn no-print"
                    disabled={form.isCancelled}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      backgroundColor: installment.saved ? '#6c757d' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginRight: '5px'
                    }}
                  >
                    {installment.saved ? '✅ Saved' : '💾 Save'}
                  </button>
                  <button
                    onClick={() => removeInstallment(index)}
                    className="remove-item-btn no-print"
                    disabled={form.isCancelled}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))} */}
            {/* Installments Grand Total Row */}
            {form.installments.length > 0 && (
              <div className="credit-bill-row grand-total-row" style={{
                backgroundColor: '#e8f5e8',
                borderTop: '2px solid #28a745',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                <div></div>
                <div></div>
                <div></div>
                <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                  ₹{(Array.isArray(form.installments) ? form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0) : 0).toFixed(2)}
                </div>
                <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                  ₹{(Array.isArray(form.installments) ? form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0) : 0).toFixed(2)}
                </div>
                <div></div>
              </div>
            )}
        
          </div>
          </div>

          {/* Loaded Debit Note Information - Only show after search */}
          {form.invoiceNumber && form.invoiceNumber !== '' && selectedId && debitNoteSearched && (
            <div className="loaded-debit-note-info" style={{
              marginBottom: '15px',
              padding: '15px',
              backgroundColor: '#fff3cd',
              border: '2px solid #ffc107',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#856404', fontWeight: 'bold' }}>
                📄 Loaded Debit Note: {form.invoiceNumber}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                <div><strong>Customer:</strong> {form.customerName}</div>
                <div><strong>Customer ID:</strong> {form.customerId}</div>
                <div><strong>Date:</strong> {form.date}</div>
                <div><strong>Due Date:</strong> {form.dueDate || 'Not set'}</div>
                <div><strong>Status:</strong> {form.isCancelled ? '❌ Cancelled' : '✅ Active'}</div>
              </div>
              <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#e8f5e8', borderRadius: '4px', border: '1px solid #28a745' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                  <div><strong>Balance Amount:</strong> ₹{(form.totals?.totalAmount || 0).toFixed(2)}</div>
                  <div><strong>Previous Installment:</strong> ₹{(form.installments && form.installments.length > 0 ? form.installments[0].amountPaid : 0).toFixed(2)}</div>
                  <div><strong>New Installments:</strong> ₹{(Array.isArray(form.installments) && form.installments.length > 1 ? form.installments.slice(1).reduce((sum, inst) => sum + (inst.amountPaid || 0), 0) : 0).toFixed(2)}</div>
                  <div><strong>Remaining Balance:</strong> ₹{(Math.max(0, (form.totals?.totalAmount || 0) - (Array.isArray(form.installments) ? form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0) : 0))).toFixed(2)}</div>
                </div>
              </div>
                              {form.remarks && (
                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <strong>Remarks:</strong> {form.remarks}
                  </div>
                )}
                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                  <button
                    onClick={addInstallment}
                    className="add-item-btn no-print"
                    disabled={form.isCancelled}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    💰 Add Installment Payment
                  </button>
                </div>
            </div>
          )}

          {/* Debit Note Installment Details Section */}
          {form.invoiceNumber && form.invoiceNumber !== '' && selectedId && debitNoteSearched && (
            <div className="debit-note-installments" style={{
              marginBottom: '15px',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              border: '2px solid #6c757d',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#495057', fontWeight: 'bold', textAlign: 'center' }}>
                📋 Debit Note Installment Details - {form.invoiceNumber}
              </h4>
             
              {/* Installment History */}
              {form.installments && form.installments.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <h5 style={{ margin: '0 0 10px 0', color: '#495057', fontWeight: 'bold' }}>
                    📊 Installment History:
                  </h5>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto auto auto',
                    gap: '8px',
                    fontSize: '12px',
                    backgroundColor: 'white',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #dee2e6'
                  }}>
                    <div style={{ fontWeight: 'bold' }}>#</div>
                    <div style={{ fontWeight: 'bold' }}>Date</div>
                    <div style={{ fontWeight: 'bold', textAlign: 'right' }}>Amount</div>
                    <div style={{ fontWeight: 'bold', textAlign: 'center' }}>Status</div>
                    <div style={{ fontWeight: 'bold', textAlign: 'center' }}>Action</div>
                   
                    {form.installments.map((installment, index) => (
                      <React.Fragment key={index}>
                        <div>{index + 1}</div>
                        <div>{installment.date || form.date}</div>
                        <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                          ₹{(installment.amountPaid || 0).toFixed(2)}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          {installment.saved ? '✅ Saved' : '⏳ Pending'}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => removeInstallment(index)}
                            className="remove-item-btn no-print"
                            disabled={form.isCancelled}
                            style={{
                              padding: '2px 6px',
                              fontSize: '10px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer'
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Next Installment Section */}
              <div style={{
                padding: '12px',
                backgroundColor: '#e3f2fd',
                borderRadius: '6px',
                border: '1px solid #2196f3'
              }}>
                <h5 style={{ margin: '0 0 10px 0', color: '#1976d2', fontWeight: 'bold' }}>
                  💰 Add Next Installment to {form.invoiceNumber}:
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>
                      Installment Amount (₹):
                    </label>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      min="0"
                      step="0.01"
                      className="input-field"
                      style={{
                        width: '100%',
                        padding: '8px',
                        fontSize: '14px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px'
                      }}
                      id="debitNoteInstallmentAmount"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      onClick={async () => {
                        const amount = parseFloat(document.getElementById('debitNoteInstallmentAmount').value) || 0;
                        if (amount > 0) {
                          const newInstallment = {
                            amountPaid: amount,
                            date: new Date().toISOString().split('T')[0],
                            saved: false
                          };
                         
                          // Add installment to form
                          setForm(prev => ({
                            ...prev,
                            installments: [...prev.installments, newInstallment]
                          }));
                         
                          document.getElementById('debitNoteInstallmentAmount').value = '';
                         
                          // Calculate if this is the final payment
                          const totalPaid = (Array.isArray(form.installments) ? form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0) : 0) + amount;
                          const remainingBalance = Math.max(0, (form.totals?.totalAmount || 0) - totalPaid);
                         
                          if (remainingBalance === 0) {
                            // Save the updated debit note with final installment
                            const saveResult = await saveUpdatedDebitNote();
                           
                            // Generate new debit note invoice number for next installment
                            const nextInvoiceNumber = await generateNextDebitNoteNumber();
                           
                            if (saveResult?.localOnly) {
                              setNotificationMessage({
                                type: 'success',
                                text: `✅ Final installment of ₹${amount.toFixed(2)} added locally! Payment complete. Next debit note: ${nextInvoiceNumber} (Admin approval needed)`
                              });
                            } else {
                              setNotificationMessage({
                                type: 'success',
                                text: `✅ Final installment of ₹${amount.toFixed(2)} added! Payment complete. Next debit note: ${nextInvoiceNumber}`
                              });
                            }
                           
                            // Generate payment receipt
                            setTimeout(() => {
                              generatePaymentReceipt();
                            }, 1000);
                          } else {
                            // Save the updated debit note with new installment
                            const saveResult = await saveUpdatedDebitNote();
                           
                            // Generate new debit note invoice number for next installment
                            const nextInvoiceNumber = await generateNextDebitNoteNumber();
                           
                            if (saveResult?.localOnly) {
                              setNotificationMessage({
                                type: 'success',
                                text: `Added installment of ₹${amount.toFixed(2)} to ${form.invoiceNumber}. Remaining: ₹${remainingBalance.toFixed(2)}. Next debit note: ${nextInvoiceNumber} (Admin approval needed)`
                              });
                            } else {
                              setNotificationMessage({
                                type: 'success',
                                text: `Added installment of ₹${amount.toFixed(2)} to ${form.invoiceNumber}. Remaining: ₹${remainingBalance.toFixed(2)}. Next debit note: ${nextInvoiceNumber}`
                              });
                            }
                          }
                         
                          setTimeout(() => setNotificationMessage(null), 5000);
                        } else {
                          setNotificationMessage({
                            type: 'error',
                            text: 'Please enter a valid amount'
                          });
                          setTimeout(() => setNotificationMessage(null), 3000);
                        }
                      }}
                      className="add-item-btn no-print"
                      disabled={form.isCancelled}
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      ➕ Add Installment
                    </button>
                    <button
                      onClick={async () => {
                        const remainingBalance = Math.max(0, (form.totals?.totalAmount || 0) - (Array.isArray(form.installments) ? form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0) : 0));
                        if (remainingBalance > 0) {
                          const newInstallment = {
                            amountPaid: remainingBalance,
                            date: new Date().toISOString().split('T')[0],
                            saved: false
                          };
                         
                          // Add installment to form
                          setForm(prev => ({
                            ...prev,
                            installments: [...prev.installments, newInstallment]
                          }));
                         
                          // Save the updated debit note with final installment
                          const saveResult = await saveUpdatedDebitNote();
                         
                          // Generate new debit note invoice number for next installment
                          const nextInvoiceNumber = await generateNextDebitNoteNumber();
                         
                          if (saveResult?.localOnly) {
                            setNotificationMessage({
                              type: 'success',
                              text: `✅ Final payment of ₹${remainingBalance.toFixed(2)} added locally! Payment complete. Next debit note: ${nextInvoiceNumber} (Admin approval needed)`
                            });
                          } else {
                            setNotificationMessage({
                              type: 'success',
                              text: `✅ Final payment of ₹${remainingBalance.toFixed(2)} added! Payment complete. Next debit note: ${nextInvoiceNumber}`
                            });
                          }
                         
                          // Generate payment receipt
                          setTimeout(() => {
                            generatePaymentReceipt();
                          }, 1000);
                         
                          setTimeout(() => setNotificationMessage(null), 5000);
                        } else {
                          setNotificationMessage({
                            type: 'info',
                            text: 'No remaining balance to pay'
                          });
                          setTimeout(() => setNotificationMessage(null), 3000);
                        }
                      }}
                      className="add-item-btn no-print"
                      disabled={form.isCancelled}
                      style={{
                        padding: '8px 12px',
                        fontSize: '12px',
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      💯 Pay Full Balance
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#fff3cd',
                borderRadius: '4px',
                border: '1px solid #ffc107'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                  <div><strong>Total Installments:</strong> {form.installments ? form.installments.length : 0}</div>
                  <div><strong>Total Paid:</strong> ₹{(Array.isArray(form.installments) ? form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0) : 0).toFixed(2)}</div>
                  <div><strong>Remaining Balance:</strong> ₹{(Math.max(0, (form.totals?.totalAmount || 0) - (Array.isArray(form.installments) ? form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0) : 0))).toFixed(2)}</div>
                  <div><strong>Status:</strong> {(form.paymentStatus || 'pending') === 'fully_paid' ? '✅ FULLY PAID' : (form.paymentStatus || 'pending') === 'installment_paid' ? '💰 INSTALLMENT PAID' : '⏳ PENDING'}</div>
                </div>
              </div>
            </div>
          )}

          <h3 className="Debitsection-title no-print">Select Previous Debit Note (For Installment Payments)</h3>
          <div className="bill-search-section no-print">
            <div className="bill-search-grid">
              <div className="credit-bill-input-group">
                <label>Previous Debit Note Number</label>
                <input
                  type="text"
                  placeholder="Enter previous debit note number (optional)"
                  className="credit-bill-input"
                  disabled={form.isCancelled}
                  id="previousDebitNoteInput"
                />
              </div>
              <div className="credit-bill-input-group">
                <button
                  className="search-button no-print"
                  disabled={form.isCancelled}
                  onClick={() => {
                    const invoiceNumber = document.getElementById('previousDebitNoteInput').value;
                    if (invoiceNumber) {
                      fetchDebitNoteByInvoiceNumber(invoiceNumber);
                    } else {
                      setNotificationMessage({ type: 'error', text: 'Please enter a debit note number' });
                      setTimeout(() => setNotificationMessage(null), 3000);
                    }
                  }}
                >
                  Find Previous Debit Note
                </button>
              </div>
            </div>
            <div className="bill-search-info">
              <p><strong>Note:</strong> For installment payments, you can reference the previous debit note to track the payment sequence.</p>
              <p><strong>Tip:</strong> This helps maintain a clear payment history for customers with multiple installments.</p>
            </div>
          </div>
          </div>

          {/* Manual Product Entry - Only show if staff cannot access product details */}
          {!hasProductAccess() && (
            <>
              <h3 className="Debitsection-title no-print">Manual Product Entry (Alternative to Credit Bill)</h3>
             
              {/* Show button if manual entry is hidden */}
              {!showManualEntry && (
                <div className="bill-search-section no-print">
                  <div className="bill-search-info">
                    <p><strong>Note:</strong> If you need to create a debit note without referencing a credit bill, you can manually enter product details.</p>
                    <p><strong>Tip:</strong> This is useful for additional charges, penalties, or standalone debit notes.</p>
                    <button
                      onClick={() => setShowManualEntry(true)}
                      className="add-item-btn no-print"
                      style={{
                        marginTop: '10px',
                        padding: '10px 20px',
                        fontSize: '14px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      📝 Add Manual Product Entry
                    </button>
                  </div>
                </div>
              )}
             
              {/* Show manual entry table when button is clicked */}
              {showManualEntry && (
                <>
                  <div className="bill-search-section no-print">
                    <div className="bill-search-info">
                      <p><strong>Manual Product Entry Active:</strong> You can now manually enter product details below.</p>
                      <button
                        onClick={() => setShowManualEntry(false)}
                        className="add-item-btn no-print"
                        style={{
                          marginTop: '10px',
                          padding: '8px 16px',
                          fontSize: '12px',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        ❌ Hide Manual Entry
                      </button>
                    </div>
                  </div>
                 
                  <div className="items-sectionn manual-items-table">
            <div className="item-headerr">
              <div>#</div>
              <div>Item Code</div>
              <div>HSN Code</div>
              <div>Description</div>
              <div>Quantity</div>
              <div>Rate</div>
              <div>Amount</div>
              <div>Action</div>
            </div>
            {form.manualItems.map((item, index) => (
              <div key={index} className="credit-bill-row">
                <div>{index + 1}</div>
                <div>
                  <input
                    type="text"
                    value={item.itemCode}
                    onChange={(e) => handleManualItemChange(index, 'itemCode', e.target.value)}
                    placeholder="Item code"
                    className="input-field"
                    disabled={form.isCancelled}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={item.hsnCode}
                    onChange={(e) => handleManualItemChange(index, 'hsnCode', e.target.value)}
                    placeholder="HSN code"
                    className="input-field"
                    disabled={form.isCancelled}
                  />
                </div>
                <div>
                  <ProductSelector
                    value={item.name}
                    onChange={(value) => handleManualItemChange(index, 'name', value)}
                    onProductSelect={(product) => handleProductSelect(index, product)}
                    placeholder="Search products..."
                    disabled={form.isCancelled}
                    showEditMode={true}
                    showFieldEditors={true}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleManualItemChange(index, 'quantity', e.target.value)}
                    min="1"
                    step="1"
                    className="input-field"
                    disabled={form.isCancelled}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={item.rate}
                    onChange={(e) => handleManualItemChange(index, 'rate', e.target.value)}
                    min="0"
                    step="0.01"
                    className="input-field"
                    disabled={form.isCancelled}
                  />
                </div>
                <div>₹{getManualItemAmount(item).toFixed(2)}</div>
                <div>
                  <button
                    onClick={() => removeManualItem(index)}
                    className="remove-item-btn no-print"
                    disabled={form.isCancelled}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
            <div className="manual-items-actions">
              <button
                onClick={addManualItem}
                className="add-item-btn no-print"
                disabled={form.isCancelled}
              >
                + Add Manual Item
              </button>
              {form.manualItems.length > 0 && (
                <div className="manual-items-total">
                  📋 <strong>Manual Items Total: ₹{getManualItemsTotal().toFixed(2)}</strong>
                </div>
              )}
            </div>
          </div>
          </>
          )}
          </>
          )}
         
          {/* Message for users with product access */}
          {hasProductAccess() && (
            <div className="bill-search-section no-print">
              <div className="bill-search-info" style={{
                backgroundColor: '#e3f2fd',
                border: '1px solid #2196f3',
                borderRadius: '4px',
                padding: '12px'
              }}>
                <p><strong>ℹ️ Product Access Available:</strong> Since you have product access permissions, you can use the ProductSelector component to search and select products directly. Manual product entry is not needed.</p>
                <p><strong>Tip:</strong> Use the credit bill selection above to create debit notes for outstanding balances, or use the ProductSelector in other sections for new products.</p>
              </div>
            </div>
          )}



          <h3 className="remaining-amount-heading" style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: (form.paymentStatus || 'pending') === 'fully_paid' ? '#28a745' : (form.paymentStatus || 'pending') === 'installment_paid' ? '#ff9800' : '#d32f2f',
            textAlign: 'center',
            margin: '20px 0',
            padding: '15px',
            backgroundColor: (form.paymentStatus || 'pending') === 'fully_paid' ? '#e8f5e8' : (form.paymentStatus || 'pending') === 'installment_paid' ? '#fff3cd' : '#ffebee',
            border: `3px solid ${(form.paymentStatus || 'pending') === 'fully_paid' ? '#28a745' : (form.paymentStatus || 'pending') === 'installment_paid' ? '#ff9800' : '#d32f2f'}`,
            borderRadius: '8px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            {(form.paymentStatus || 'pending') === 'fully_paid' ? 
              '✅ FULLY PAID - NO REMAINING BALANCE' : 
              (form.paymentStatus || 'pending') === 'installment_paid' ?
              `💰 INSTALLMENT PAID - REMAINING: ₹${Math.max(0, (paymentHistory.length > 0 ? (paymentHistory[paymentHistory.length - 1]?.remainingBalance || 0) : (totals.remainingAmountToPay || 0)) - (Array.isArray(form.installments) ? form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0) : 0)).toFixed(2)}` :
              `⏳ PENDING - REMAINING: ₹${Math.max(0, (paymentHistory.length > 0 ? (paymentHistory[paymentHistory.length - 1]?.remainingBalance || 0) : (totals.remainingAmountToPay || 0)) - (Array.isArray(form.installments) ? form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0) : 0)).toFixed(2)}`
            }
          </h3>

          {isFinalInstallmentPaid && (
            <div className="remaining-balance-section">
              <h3>Payment Completed</h3>
              <div className="amount-details">
                <label>Remaining Balance:</label>
                <input
                  type="text"
                  value="₹0.00"
                  className="input-field input-disabled"
                  disabled
                />
                {/* Payment receipt download link removed - functionality not implemented */}
              </div>
            </div>
          )}

          <div className="remarks-section ">
            <label>Remarks:</label>
            <textarea
              value={form.remarks}
              onChange={(e) => setForm((prev) => ({ ...prev, remarks: sanitizeInput(e.target.value) }))}
              placeholder="Add any remarks"
              className="input-field"
              disabled={form.isCancelled}
            />
          </div>

          <div className="futerr">
            <div className="futer-content">
              <div className="left-section">
                <div className="terms-section">
                  <h4>Terms & Conditions</h4>
                  <div className="terms-content">
                    <p>
                      1. This debit note is issued as per agreed terms.<br />
                      2. Payment to be processed within the due date.<br />
                      3. Contact us for any discrepancies.
                    </p>
                  </div>
                </div>
               
                <div className="bank-details-section">
                <h4>Bank Details</h4>
                <div className="bank-container">
                  <div className="bank-contentcashbill">
                    <p><strong>Company name:</strong> {selectedCompany}</p>
                    <p><strong>Account number:</strong> {bankDetails?.accountNumber || '10192468394'}</p>
                    <p><strong>IFSC:</strong> {bankDetails?.ifsc || 'IDFB0080732'}</p>
                    <p><strong>SWIFT code:</strong> {bankDetails?.swiftCode || 'IDFBINBBMUM'}</p>
                    <p><strong>Bank name:</strong> {bankDetails?.bankName || 'IDFC FIRST BANK'}</p>
                    <p><strong>Branch:</strong> {bankDetails?.branch || 'THRISSUR - EAST FORT THRISSUR BRANCH'}</p>
                  </div>
                  <div className="qr-code-section">
                    <div className="qr-code-container">
                      <QRCodeCanvas
                        value={`Company: ${selectedCompany}\nAccount: ${bankDetails?.accountNumber || '10192468394'}\nIFSC: ${bankDetails?.ifsc || 'IDFB0080732'}\nBank: ${bankDetails?.bankName || 'IDFC FIRST BANK'}\nBranch: ${bankDetails?.branch || 'THRISSUR - EAST FORT THRISSUR BRANCH'}`}
                        size={100}
                        level="H"
                        includeMargin
                      />
                    </div>
                    <p className="qr-code-label">Scan to Pay</p>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>

          <div className="signaturee">
            <strong>Authorized Signatory</strong><br />
            <strong>{selectedCompany}</strong>
          </div>

          <div className="button-group no-print">
            <button
              onClick={saveDebitNote}
              className="debitsave-btn no-print"
           >
              Save
            </button>
            <button
              onClick={sendEmail}
              className="debitemail-btn no-print"    >
              <i className="fa-solid fa-envelope"></i> Email
            </button>
            <button
              onClick={downloadPDF}
              className="debitdownload-btn no-print"
           
            >
              <i className="fa-solid fa-file-pdf"></i> Download
            </button>
            <button
              onClick={printDebitNote}
              className="debitprint-btn no-print"
              style={{
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              <i className="debitprint-btn"></i>🖨️ Print
            </button>
            <button
              onClick={() => navigate(-1)}
              className="debitback-btn no-print"
            >
              <i className="fa-solid fa-backward"></i> Back
            </button>
           

           
            {selectedId && (userRole === 'admin' || userRole === 'super_admin') && (
              <button
                onClick={() => handleDeleteBill(selectedId)}
                className="debitdelete-btn no-print"
              >
                <i className="fa-solid fa-trash"></i> Delete
              </button>
            )}
         
          </div>

          <div className="saved-bills-section no-print">
            <h3>Saved Bills ({savedBills.length})</h3>
            <div className="table-responsive">
              <table className="table saved-bills-table table-striped">
                <thead>
                  <tr>
                    <th>Bill No</th>
                    <th>Customer</th>
                    <th>Customer ID</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(savedBills) && savedBills.map((bill) => (
                    <tr key={bill._id || bill.invoiceNumber}>
                      <td>{bill.invoiceNumber}</td>
                      <td>{bill.customerName}</td>
                      <td>{bill.customerId || 'N/A'}</td>
                      <td>{new Date(bill.date).toLocaleDateString('en-IN')}</td>
                      <td>₹{bill.totals?.totalAmount?.toFixed(2) || '0.00'}</td>
                      <td>
                        {editPermissions[bill._id] ? (
                          <button
                            className="select-btn no-print"
                            onClick={() => handleEditBill(bill._id)}
                          >
                            Edit
                          </button>
                        ) : (
                          <button
                            className="select-btn no-print"
                            onClick={() => { setPendingEditBill(bill); requestEditPermission(bill._id, bill); }}
                          >
                            Request Edit
                          </button>
                        )}
                        {editPermissions[bill._id] ? (
                          <button
                            className="btn-danger no-print"
                            onClick={() => handleDeleteBill(bill._id)}
                          >
                            Delete
                          </button>
                        ) : (
                          <button
                            className="btn-danger no-print"
                            onClick={() => { setPendingEditBill(bill); requestDeletePermission(bill._id, bill); }}
                          >
                            Request Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Permission Modal */}
          {showPermissionModal && pendingEditBill && (
            <div className="modal" style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000
            }}>
              <div className="modal-content" style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                maxWidth: '400px',
                width: '90%'
              }}>
                <h3>Permission Request</h3>
                <p>Request permission to edit debit note {pendingEditBill.invoiceNumber}?</p>
                <div className="modal-buttons" style={{
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'flex-end',
                  marginTop: '20px'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPermissionModal(false);
                      setPendingEditBill(null);
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPermissionModal(false);
                      setPendingEditBill(null);
                      // The permission request is already sent when the button was clicked
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    </ErrorBoundary>
  );
}

export default DebitNote;