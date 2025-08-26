import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { jsPDF } from 'jspdf';
import logo from '../../../../assets/images/Wyenfos_bills_logo.png';
import wyenfosLogo from '../../../../assets/images/wyenfos.png';
import CompanyHeader from '../CompanyHeader/CompanyHeader.js';
import { getCompanyDetails } from '../utils/companyHelpers.js';
import './PaymentReceipt.css';

function PaymentReceipt() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const initialReceiptId = state?.receiptId || null;
  const [customers, setCustomers] = useState([]);
  const [userRole, setUserRole] = useState('user');
  const [userId, setUserId] = useState(null);
  const [currentReceiptNumber, setCurrentReceiptNumber] = useState(1);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestChanges, setRequestChanges] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [creditBills, setCreditBills] = useState([]);
  const [debitNotes, setDebitNotes] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedDebitNoteId, setSelectedDebitNoteId] = useState('');
  const [availableDebitNotes, setAvailableDebitNotes] = useState([]);

  const [selectedDebitNoteDetails, setSelectedDebitNoteDetails] = useState(null);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [form, setForm] = useState({
    receiptNumber: 'PR-1',
    date: new Date().toISOString().split('T')[0],
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
  const [successMessage, setSuccessMessage] = useState(null);
  const [showAllReceipts, setShowAllReceipts] = useState(false);


  const totalProductAmount = Array.isArray(creditBills)
    ? creditBills.reduce((sum, bill) => sum + (bill?.totalAmount || 0), 0)
    : 0;

  const totalPaidAmount = Array.isArray(debitNotes)
    ? debitNotes.reduce((sum, note) => sum + (note?.amountPaid || 0), 0)
    : 0;

  const remainingBalance = totalProductAmount - totalPaidAmount;

  // Display only latest 10 receipts by default, or all if showAllReceipts is true
  const displayedReceipts = showAllReceipts ? receipts : receipts.slice(0, 10);

  const validCompanies = [
    'WYENFOS INFOTECH',
    'WYENFOS GOLD & DIAMONDS',
    'WYENFOS ADS',
    'WYENFOS CASH VAPASE',
    'WYENFOS',
    'AYUR FOR HERBALS INDIA',
    'WYENFOS PURE DROPS'
  ];

  // Handle company selection from location state (similar to CreditBill)
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

  const defaultCompany = validCompanies.includes(
    typeof state?.selectedCompany === 'string' 
      ? state.selectedCompany.toUpperCase() 
      : (state?.selectedCompany?.name?.toUpperCase() || '')
  )
    ? (typeof state?.selectedCompany === 'string' ? state.selectedCompany : state?.selectedCompany?.name || 'WYENFOS')
    : 'WYENFOS';

  // Get company details using the helper function (similar to CreditBill)
  const selectedCompanyDetails = useMemo(() => {
    return getCompanyDetails(selectedCompanyFromState);
  }, [selectedCompanyFromState]);

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

  // Fetch initial company details
  useEffect(() => {
    const fetchInitialCompanyDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/companies', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const companies = Array.isArray(response.data) ? response.data : [];
        const company = companies.find(c => 
          c.name?.toUpperCase() === defaultCompany.toUpperCase()
        ) || companies[0];
        
        if (company) {
          // Load company logo if available
          let companyLogo = logo; // Default logo
          if (company.logo) {
            try {
              // If logo is a URL, use it directly
              if (company.logo.startsWith('http') || company.logo.startsWith('data:')) {
                companyLogo = company.logo;
              } else {
                // If logo is a file path, construct the full URL
                companyLogo = `${process.env.REACT_APP_API_URL || ''}/uploads/${company.logo}`
              }
            } catch (error) {
              console.error('Error loading company logo:', error);
              companyLogo = logo; // Fallback to default logo
            }
          }
          
          setSelectedCompany({
            ...company,
            logo: companyLogo
          });
        } else {
          // Set default company if no company found
          setSelectedCompany({
            name: defaultCompany,
            address: '',
            logo: logo,
            GSTIN: '',
            email: '',
            mobile: '',
            website: ''
          });
        }
      } catch (error) {
        console.error('Error fetching company details:', error);
        // Set default company if API fails
        setSelectedCompany({
          name: defaultCompany,
          address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
          logo: logo,
          GSTIN: '',
          email: '',
          mobile: '',
          website: ''
        });
      }
    };

    fetchInitialCompanyDetails();
  }, [defaultCompany]);

  const fetchCompanyDetails = useCallback(async (companyName) => {
    try {
      const token = localStorage.getItem('token');
      
      // Try the specific endpoint first
      try {
        const response = await axios.get(`/api/companies/details-by-name/${encodeURIComponent(companyName)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data && response.data.success && response.data.company) {
          const company = response.data.company;
          setCompanyDetails(company);
          return company;
        }
      } catch (specificError) {
        // Fallback to all companies search
      }
      
      // Fallback: Get all companies and search
      const allCompaniesResponse = await axios.get('/api/companies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (allCompaniesResponse.data && allCompaniesResponse.data.companies) {
        const companies = allCompaniesResponse.data.companies;
        const company = companies.find(c => 
          c.name && c.name.toLowerCase() === companyName.toLowerCase()
        );
        
        if (company) {
          setCompanyDetails(company);
          return company;
        }
      }
      
      setCompanyDetails(null);
      return null;
    } catch (error) {
      setCompanyDetails(null);
      return null;
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
      setError('Please describe the changes you would like to request');
      return;
    }

    if (!highlightedReceiptId) {
      setError('Please select a receipt to request changes for');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
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
      
      console.log('Request change response:', response.data);
      setShowRequestModal(false);
      setRequestChanges('');
      setSuccessMessage('✅ Change request submitted successfully! Admin will review your request.');
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (error) {
      console.error('Request change error:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.message || 'Failed to submit change request. Please try again.');
    }
  };



  const fetchCustomers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching customers with token:', token ? 'Token exists' : 'No token');
      
      const response = await axios.get('/api/customers', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('API Response:', response);
      console.log('Fetched customers:', JSON.stringify(response.data, null, 2));
      
      if (Array.isArray(response.data)) {
        console.log('Setting customers array with length:', response.data.length);
        console.log('First customer sample:', response.data[0]);
        console.log('First customer keys:', response.data[0] ? Object.keys(response.data[0]) : 'No customers');
        console.log('First customer full object:', response.data[0] ? JSON.stringify(response.data[0], null, 2) : 'No customers');
        setCustomers(response.data);
      } else {
        console.error('Response data is not an array:', response.data);
        setCustomers([]);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      console.error('Error details:', err.response?.data);
      setError('Failed to load customers. Please try again.');
      setCustomers([]);
    }
  }, []);

  const fetchCustomerBills = useCallback(async (customerId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching complete customer data for ID:', customerId);
      
      // First fetch complete customer details
      let completeCustomerData = null;
      try {
        const customerResponse = await axios.get(`/api/customers/${customerId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        completeCustomerData = customerResponse.data;
        console.log('Complete customer data received:', completeCustomerData);
        console.log('Customer data keys:', Object.keys(completeCustomerData));
        console.log('Customer address:', completeCustomerData.address);
        console.log('Customer phone:', completeCustomerData.phone);
        console.log('Customer email:', completeCustomerData.email);
        console.log('Customer gstin:', completeCustomerData.gstin);
        console.log('Full customer object:', JSON.stringify(completeCustomerData, null, 2));
      } catch (customerError) {
        console.error('Error fetching complete customer data:', customerError);
        // Fallback: try to find customer in the existing customers array
        completeCustomerData = customers.find(c => (c._id === customerId) || (c.id === customerId));
        console.log('Using fallback customer data:', completeCustomerData);
      }
      
      // Update customer data immediately with complete information
      if (completeCustomerData) {
        // Check for alternative field names
        console.log('Checking for alternative field names...');
        console.log('Possible address fields:', {
          address: completeCustomerData.address,
          customerAddress: completeCustomerData.customerAddress,
          billingAddress: completeCustomerData.billingAddress,
          shippingAddress: completeCustomerData.shippingAddress
        });
        console.log('Possible phone fields:', {
          phone: completeCustomerData.phone,
          phoneNumber: completeCustomerData.phoneNumber,
          contactNumber: completeCustomerData.contactNumber,
          mobile: completeCustomerData.mobile
        });
        console.log('Possible email fields:', {
          email: completeCustomerData.email,
          emailAddress: completeCustomerData.emailAddress,
          contactEmail: completeCustomerData.contactEmail
        });
        console.log('Possible GSTIN fields:', {
          gstin: completeCustomerData.gstin,
          gstNumber: completeCustomerData.gstNumber,
          gst: completeCustomerData.gst
        });
        
        const updatedCustomerData = {
          _id: completeCustomerData._id || completeCustomerData.id,
          name: completeCustomerData.name || completeCustomerData.customerName || 'N/A',
          customerId: completeCustomerData.customerId || `CUST${(completeCustomerData._id || completeCustomerData.id)?.slice(-4) || '0000'}`,
          address: completeCustomerData.address || completeCustomerData.customerAddress || completeCustomerData.billingAddress || completeCustomerData.shippingAddress || completeCustomerData.customerContact?.address || '',
          phone: completeCustomerData.phone || completeCustomerData.phoneNumber || completeCustomerData.contactNumber || completeCustomerData.mobile || completeCustomerData.customerContact?.phone || '',
          email: completeCustomerData.email || completeCustomerData.emailAddress || completeCustomerData.contactEmail || completeCustomerData.customerContact?.email || '',
          gstin: completeCustomerData.gstin || completeCustomerData.gstNumber || completeCustomerData.gst || completeCustomerData.customerContact?.gstin || ''
        };
        
        setSelectedCustomer(updatedCustomerData);
        setForm(prev => ({
          ...prev,
          customer: {
            name: updatedCustomerData.name,
            address: updatedCustomerData.address,
            phone: updatedCustomerData.phone,
            email: updatedCustomerData.email,
            gstin: updatedCustomerData.gstin
          }
        }));
        
        console.log('Updated customer data with complete information:', updatedCustomerData);
      }
      
      // Then fetch bills and debit notes
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
      
      console.log('Raw credit bills data:', creditBillsData);
      console.log('Raw debit notes data:', debitNotesData);
      console.log('First debit note structure:', debitNotesData[0]);

      // Process credit bills to include payment status
      const processedCreditBills = creditBillsData.map(bill => {
        try {
          const relatedDebitNotes = debitNotesData.filter(note => note.creditBillId === bill._id);
          const totalPaid = relatedDebitNotes.reduce((sum, note) => sum + (note.amountPaid || 0), 0);
          const remainingBalance = (bill.totalAmount || 0) - totalPaid;
          const isFullyPaid = remainingBalance <= 0;

          return {
            ...bill,
            totalPaid,
            remainingBalance,
            isFullyPaid,
            paymentStatus: isFullyPaid ? 'Fully Paid' : 'Partially Paid',
            relatedDebitNotes
          };
        } catch (error) {
          console.error('Error processing credit bill:', error, bill);
          return {
            ...bill,
            totalPaid: 0,
            remainingBalance: bill.totalAmount || 0,
            isFullyPaid: false,
            paymentStatus: 'Error',
            relatedDebitNotes: []
          };
        }
      });

      // Create comprehensive payment history for each credit bill
      const paymentHistory = processedCreditBills.map(bill => {
        const history = [];
        
        // Add credit bill as first entry
        history.push({
          invoiceNumber: bill.creditBillNo || bill.invoiceNumber,
          billType: 'Credit Bill',
          paidAmount: bill.totalPaid || 0,
          remainingBalance: bill.remainingBalance,
          date: bill.date || bill.createdAt,
          description: 'Initial Payment',
          isCreditBill: true
        });

        // Add all related debit notes in chronological order
        const sortedDebitNotes = (bill.relatedDebitNotes || [])
          .sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));

        let runningBalance = bill.totalAmount || 0;
        
        sortedDebitNotes.forEach((note, index) => {
          const amountPaid = note.amountPaid || 0;
          runningBalance -= amountPaid;
          
          history.push({
            invoiceNumber: note.debitNoteNo || note.invoiceNumber,
            billType: 'Debit Note',
            paidAmount: amountPaid,
            remainingBalance: Math.max(0, runningBalance),
            date: note.date || note.createdAt,
            description: `Installment ${index + 1}`,
            isDebitNote: true,
            debitNoteId: note._id
          });
        });

        return {
          ...bill,
          paymentHistory,
          currentBalance: runningBalance
        };
      });

      console.log('Payment History:', paymentHistory);
      setCreditBills(processedCreditBills);
      setDebitNotes(debitNotesData);
      
      // Set available debit notes for selection
      const availableNotes = debitNotesData.map(note => ({
        _id: note._id || note.id, // Handle both _id and id fields
        debitNoteNo: note.debitNoteNo || note.invoiceNumber,
        amountPaid: note.amountPaid,
        date: note.date || note.createdAt,
        creditBillId: note.creditBillId
      }));
      
      console.log('Original debit notes data:', debitNotesData);
      console.log('Mapped available notes:', availableNotes);
      setAvailableDebitNotes(availableNotes);
      console.log('Available Debit Notes:', availableNotes);
      

    } catch (error) {
      console.error('Error fetching customer bills:', error.message);
      setError('Failed to fetch customer bills.');
      setCreditBills([]);
      setDebitNotes([]);
    }
  }, [customers]);

  useEffect(() => {
    console.log('Selected Customer State Changed:', selectedCustomer);
    console.log('Form Customer State:', form.customer);
    console.log('Form customer address:', form.customer?.address);
    console.log('Form customer phone:', form.customer?.phone);
    console.log('Form customer email:', form.customer?.email);
    console.log('Form customer gstin:', form.customer?.gstin);
  }, [selectedCustomer, form.customer]);

  useEffect(() => {
    console.log('Customers State Changed:', customers);
    console.log('Customers array length:', customers.length);
    
    // If we have a selected customer but missing details, try to update with complete data
    if (selectedCustomer && customers.length > 0) {
      const completeCustomer = customers.find(c => 
        (c._id === selectedCustomer._id) || (c.id === selectedCustomer._id) || (c._id === selectedCustomer.id) || (c.id === selectedCustomer.id)
      );
      
      console.log('Looking for complete customer data for ID:', selectedCustomer._id);
      console.log('Found complete customer:', completeCustomer);
      
      // Check if we need to update with more complete data
      const needsUpdate = completeCustomer && (
        (!selectedCustomer.address || selectedCustomer.address === '') ||
        (!selectedCustomer.phone || selectedCustomer.phone === '') ||
        (!selectedCustomer.email || selectedCustomer.email === '') ||
        (!selectedCustomer.gstin || selectedCustomer.gstin === '')
      ) && (
        completeCustomer.customerContact?.address ||
        completeCustomer.customerContact?.phone ||
        completeCustomer.customerContact?.email ||
        completeCustomer.customerContact?.gstin
      );
      
      if (needsUpdate) {
        console.log('Updating selected customer with complete data from customers array');
        console.log('Current selected customer:', selectedCustomer);
        console.log('Complete customer data:', completeCustomer);
        
        const updatedCustomerData = {
          _id: completeCustomer._id || completeCustomer.id,
          name: completeCustomer.name || completeCustomer.customerName || selectedCustomer.name,
          customerId: completeCustomer.customerId || selectedCustomer.customerId,
          address: completeCustomer.address || completeCustomer.customerAddress || completeCustomer.billingAddress || completeCustomer.shippingAddress || completeCustomer.customerContact?.address || selectedCustomer.address || '',
          phone: completeCustomer.phone || completeCustomer.phoneNumber || completeCustomer.contactNumber || completeCustomer.mobile || completeCustomer.customerContact?.phone || selectedCustomer.phone || '',
          email: completeCustomer.email || completeCustomer.emailAddress || completeCustomer.contactEmail || completeCustomer.customerContact?.email || selectedCustomer.email || '',
          gstin: completeCustomer.gstin || completeCustomer.gstNumber || completeCustomer.gst || completeCustomer.customerContact?.gstin || selectedCustomer.gstin || ''
        };
        
        console.log('Complete customer object keys:', Object.keys(completeCustomer));
        console.log('Complete customer full object:', JSON.stringify(completeCustomer, null, 2));
        
        console.log('Updated customer data:', updatedCustomerData);
        
        setSelectedCustomer(updatedCustomerData);
        setForm(prev => ({
          ...prev,
          customer: {
            name: updatedCustomerData.name,
            address: updatedCustomerData.address,
            phone: updatedCustomerData.phone,
            email: updatedCustomerData.email,
            gstin: updatedCustomerData.gstin
          }
        }));
      }
    }
  }, [customers, selectedCustomer]);

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
      
      // Sort receipts by creation date (newest first) and store all receipts
      const sortedReceipts = (response.data || []).sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      setReceipts(sortedReceipts);
      console.log(`Fetched ${sortedReceipts.length} receipts, latest receipt:`, sortedReceipts[0]?.receiptNumber);
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
    
    // Fetch company details if selectedCompany has a name
    if (selectedCompany && selectedCompany.name) {
      fetchCompanyDetails(selectedCompany.name);
    }
  }, [fetchCustomers, fetchReceipts, fetchCompanyDetails, selectedCompany]);

 const handleCustomerSelect = (e) => {
  const customerId = e.target.value;
  
  if (!customerId) {
    setSelectedCustomer(null);
    setCreditBills([]);
    setDebitNotes([]);
    setAvailableDebitNotes([]);
    setSelectedDebitNoteId('');
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
    return;
  }

  const customer = customers.find(c => (c._id === customerId) || (c.id === customerId));
  
  if (customer) {
    const customerData = {
      _id: customer._id || customer.id,
      name: customer.name || customer.customerName || 'N/A',
      customerId: customer.customerId || `CUST${(customer._id || customer.id)?.slice(-4) || '0000'}`,
      address: customer.address || customer.customerAddress || customer.billingAddress || customer.shippingAddress || customer.customerContact?.address || '',
      phone: customer.phone || customer.phoneNumber || customer.contactNumber || customer.mobile || customer.customerContact?.phone || '',
      email: customer.email || customer.emailAddress || customer.contactEmail || customer.customerContact?.email || '',
      gstin: customer.gstin || customer.gstNumber || customer.gst || customer.customerContact?.gstin || ''
    };

    setSelectedCustomer(customerData);
    
    setForm(prev => ({
      ...prev,
      customer: {
        name: customerData.name,
        address: customerData.address,
        phone: customerData.phone,
        email: customerData.email,
        gstin: customerData.gstin
      }
    }));

    if (customer._id || customer.id) {
      const customerId = customer._id || customer.id;
      fetchCustomerBills(customerId);
    }
  } else {
    setSelectedCustomer(null);
    setCreditBills([]);
    setDebitNotes([]);
    setAvailableDebitNotes([]);
    setSelectedDebitNoteId('');
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
  }
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

  const fetchDebitNoteDetails = useCallback(async (debitNoteId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching debit note details for ID:', debitNoteId);
      
      const response = await axios.get(`/api/debitnotes/${debitNoteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const debitNoteDetails = response.data;
      console.log('Debit note details received:', debitNoteDetails);
      console.log('Debit note details keys:', Object.keys(debitNoteDetails));
      console.log('Amount fields check:', {
        totalAmount: debitNoteDetails.totalAmount,
        grandTotal: debitNoteDetails.grandTotal,
        amountPaid: debitNoteDetails.amountPaid,
        paidAmount: debitNoteDetails.paidAmount,
        totalPaid: debitNoteDetails.totalPaid,
        amount: debitNoteDetails.amount
      });
      
      setSelectedDebitNoteDetails(debitNoteDetails);
      return debitNoteDetails;
    } catch (error) {
      console.error('Error fetching debit note details:', error);
      // Fallback: try to find in available debit notes
      const fallbackNote = availableDebitNotes.find(note => note._id === debitNoteId);
      if (fallbackNote) {
        console.log('Using fallback debit note data:', fallbackNote);
        setSelectedDebitNoteDetails(fallbackNote);
        return fallbackNote;
      }
      return null;
    }
  }, [availableDebitNotes]);

  const handleDebitNoteSelect = async (debitNoteId) => {
    setSelectedDebitNoteId(debitNoteId);
    if (debitNoteId) {
      console.log('Debit note selected:', debitNoteId);
      // Fetch detailed debit note information
      const debitNoteDetails = await fetchDebitNoteDetails(debitNoteId);
      if (debitNoteDetails) {
        console.log('Debit note details loaded:', debitNoteDetails);
      }
    } else {
      // Clear debit note details when no debit note is selected
      setSelectedDebitNoteDetails(null);
    }
  };

  const saveReceipt = async () => {
    if (!selectedCustomer) {
      setError('Please select a customer.');
      return;
    }
    if (!selectedCustomer._id) {
      setError('Customer ID is required.');
      return;
    }
    
    // More flexible ID validation - allow both MongoDB ObjectId (24 chars) and Firestore IDs (20 chars)
    const idRegex = /^[0-9a-zA-Z]{20,24}$/;
    if (!idRegex.test(selectedCustomer._id)) {
      console.log('Customer ID validation failed:', selectedCustomer._id);
      console.log('Customer ID length:', selectedCustomer._id.length);
      setError('Invalid customer ID format.');
      return;
    }
    // Calculate amounts based on whether a debit note is selected
    const finalTotalProductAmount = selectedDebitNoteId && selectedDebitNoteDetails 
      ? (selectedDebitNoteDetails.totalAmount || selectedDebitNoteDetails.grandTotal || 0)
      : totalProductAmount;
    
    const finalTotalPaidAmount = selectedDebitNoteId && selectedDebitNoteDetails
      ? (selectedDebitNoteDetails.amountPaid || 0)
      : totalPaidAmount;

    // Validate that amounts are greater than zero
    if (!finalTotalPaidAmount || finalTotalPaidAmount <= 0) {
      setError('Total paid amount must be greater than zero.');
      return;
    }

    if (!finalTotalProductAmount || finalTotalProductAmount <= 0) {
      setError('Total product amount must be greater than zero.');
      return;
    }

    // Validate customer details
    if (!selectedCustomer.name || selectedCustomer.name.trim() === '') {
      setError('Customer name is required.');
      return;
    }
    
    // Validate email and mobile for receipt delivery
    if (!selectedCustomer.email || selectedCustomer.email.trim() === '') {
      setError('Email address is required for receipt delivery.');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(selectedCustomer.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    
    if (!selectedCustomer.phone || selectedCustomer.phone.trim() === '') {
      setError('Mobile number is required for receipt delivery.');
      return;
    }
    
    // Basic mobile validation (at least 10 digits)
    const phoneRegex = /^\d{10,}$/;
    if (!phoneRegex.test(selectedCustomer.phone.replace(/\D/g, ''))) {
      setError('Please enter a valid mobile number (at least 10 digits).');
      return;
    }

    // Validate that the amount paid equals the total product amount
    if (Math.abs(finalTotalPaidAmount - finalTotalProductAmount) > 0.01) {
      setError(`Payment receipt can only be generated for full payment. Amount paid (₹${finalTotalPaidAmount.toFixed(2)}) must equal total product amount (₹${finalTotalProductAmount.toFixed(2)}).`);
      return;
    }

    setLoading(true);
    setError(null);

    const receipt = {
      receiptNo: generateReceiptNumber(),
      receiptNumber: generateReceiptNumber(), // Add this for consistency
      customerId: selectedCustomer._id,
      customerName: form.customer.name || selectedCustomer.name || 'N/A',
      amount: finalTotalPaidAmount,
      date: new Date(form.date),
      type: 'payment',
      creditBillId: creditBills.length > 0 ? creditBills[0]._id : undefined,
      debitNoteId: selectedDebitNoteId || undefined,
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
        totalProductAmount: finalTotalProductAmount,
        totalPaidAmount: finalTotalPaidAmount,
        remainingBalance,
        remarks: form.remarks,
        email: selectedCustomer.email || form.customer.email,
        phone: selectedCustomer.phone || form.customer.phone,
        receiptDelivery: {
          email: selectedCustomer.email || form.customer.email,
          mobile: selectedCustomer.phone || form.customer.phone,
          deliveryMethod: 'email_and_sms'
        }
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
      
      // Check if email delivery was requested
      const emailDelivery = response.data.metadata?.receiptDelivery?.email;
      if (emailDelivery) {
        setSuccessMessage(`✅ Payment receipt saved successfully!\n\n📧 Email receipt sent to: ${emailDelivery}\n📱 Mobile: ${selectedCustomer.phone}\n\n📄 Receipt Number: ${response.data.receiptNumber}\n💰 Amount: ₹${response.data.amount.toFixed(2)}`);
      } else {
        setSuccessMessage(`✅ Payment receipt saved successfully!\n\n📧 Email: ${selectedCustomer.email}\n📱 Mobile: ${selectedCustomer.phone}\n\n📄 Receipt Number: ${response.data.receiptNumber}\n💰 Amount: ₹${response.data.amount.toFixed(2)}`);
      }
      
      // Clear success message after 8 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 8000);
    } catch (error) {
      console.error('Error saving receipt:', error.response?.data || error);
      setError(error.response?.data?.message || 'Failed to save payment receipt.');
    } finally {
      setLoading(false);
    }
  };

  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      if (!src) {
        reject(new Error('No image source provided'));
        return;
      }
      
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.error(`Failed to load image: ${src}`);
        reject(new Error(`Failed to load image: ${src}`));
      };
    });
  };

  const generatePrintFormatPDF = async (receipt = {
    receiptNo: form.receiptNumber,
    date: form.date,
    customer: selectedCustomer,
    creditBills,
    debitNotes,
    totalProductAmount: selectedDebitNoteId && selectedDebitNoteDetails 
      ? (selectedDebitNoteDetails.totalAmount || selectedDebitNoteDetails.grandTotal || 0)
      : totalProductAmount,
    totalPaidAmount: selectedDebitNoteId && selectedDebitNoteDetails
      ? (selectedDebitNoteDetails.amountPaid || 0)
      : totalPaidAmount,
    remainingBalance: selectedDebitNoteId && selectedDebitNoteDetails
      ? ((selectedDebitNoteDetails.totalAmount || selectedDebitNoteDetails.grandTotal || 0) - (selectedDebitNoteDetails.amountPaid || 0))
      : remainingBalance,
    remarks: form.remarks,
    selectedDebitNoteDetails
  }) => {
    try {
      // Create PDF with compression settings
      const doc = new jsPDF('p', 'mm', 'a4', {
        compress: true,
        precision: 16
      });
      doc.setFontSize(12);
      let y = 10;

      // Load and compress logo
      const logoImg = await loadImage(selectedCompanyDetails?.logo || wyenfosLogo);
      
      // Debug logo loading
      console.log('Logo Debug:', {
        companyDetailsLogo: companyDetails?.logo,
        selectedCompanyLogo: selectedCompany?.logo,
        selectedCompanyDetailsLogo: selectedCompanyDetails?.logo,
        defaultLogo: wyenfosLogo,
        finalLogo: selectedCompanyDetails?.logo || wyenfosLogo
      });

      // Add compressed logo with smaller size
      const logoWidth = 20; // Reduced from 25
      const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
      doc.addImage(logoImg, 'JPEG', 10, y, logoWidth, logoHeight, undefined, 'FAST', 0.8); // Use JPEG compression
      
      // Company Information - positioned on left side next to logo
      const companyInfoX = 10 + logoWidth + 5; // 5px gap after logo
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(selectedCompanyDetails?.name || companyDetails?.name || selectedCompany?.name || 'WYENFOS BILLS', companyInfoX, y + 5);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(selectedCompanyDetails?.address || companyDetails?.address || selectedCompany?.address || 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001', companyInfoX, y + 10);
      
      if (selectedCompanyDetails?.GSTIN || companyDetails?.GSTIN || selectedCompany?.GSTIN) {
        doc.text(`GSTIN: ${selectedCompanyDetails?.GSTIN || companyDetails?.GSTIN || selectedCompany?.GSTIN}`, companyInfoX, y + 14);
      }
      
      if (selectedCompanyDetails?.email || companyDetails?.email || selectedCompany?.email) {
        doc.text(`Email: ${selectedCompanyDetails?.email || companyDetails?.email || selectedCompany?.email}`, companyInfoX, y + 18);
      }
      
      if (selectedCompanyDetails?.mobile || companyDetails?.mobile || selectedCompany?.mobile) {
        doc.text(`Phone: ${selectedCompanyDetails?.mobile || companyDetails?.mobile || selectedCompany?.mobile}`, companyInfoX, y + 22);
      }
      
      // Payment Receipt Title and Details - positioned on right side (matching print format)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('PAYMENT RECEIPT', 190, y + 5, { align: 'right' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Receipt No: ${receipt.receiptNo}`, 190, y + 10, { align: 'right' });
      
      // Date display matching print format
      const displayDate = receipt.date ? new Date(receipt.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
      doc.text(`Date: ${displayDate}`, 190, y + 14, { align: 'right' });
      
      // Set y position to the bottom of the company header section
      y += Math.max(logoHeight, 30) + 5;
      y += 12;

      // Customer Information
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

      // Payment Details
      doc.text('Payment Details:', 10, y);
      y += 6;
      doc.text('--------------------------------------------------------------------------------', 10, y);
      y += 6;
      doc.text('S.No  Credit Bill  Total Amount  Debit Note  Paid Date  Paid Amount  Remaining  Status', 10, y);
      y += 6;
      doc.text('--------------------------------------------------------------------------------', 10, y);
      y += 6;

      // Show payment details based on whether a specific debit note is selected
      if (receipt.selectedDebitNoteDetails) {
        const note = receipt.selectedDebitNoteDetails;
        const totalAmount = note.totalAmount || note.grandTotal || 0;
        const amountPaid = note.amountPaid || 0;
        const remainingBalance = totalAmount - amountPaid;
        const isFullyPaid = remainingBalance <= 0;
        const status = isFullyPaid ? 'FULLY PAID' : 'PARTIAL';
        
        // Format with proper spacing
        const rowText = `1     N/A     ₹${totalAmount.toFixed(2)}     ${note.debitNoteNo || note.invoiceNumber || 'N/A'}     ${note.date ? new Date(note.date).toLocaleDateString('en-IN') : 'N/A'}     ₹${amountPaid.toFixed(2)}     ₹${remainingBalance.toFixed(2)}     ${status}`;
        doc.text(rowText, 10, y);
        y += 6;
      } else {
        receipt.debitNotes.forEach((note, index) => {
          const creditBill = receipt.creditBills.find(bill => bill._id === note.creditBillId);
          const totalAmount = note.totalAmount || creditBill?.totalAmount || 0;
          const amountPaid = note.amountPaid || 0;
          const remainingBalance = totalAmount - amountPaid;
          const isFullyPaid = remainingBalance <= 0;
          const status = isFullyPaid ? 'FULLY PAID' : 'PARTIAL';
          
          // Format with proper spacing
          const rowText = `${index + 1}     ${creditBill?.creditBillNo || 'N/A'}     ₹${totalAmount.toFixed(2)}     ${note.debitNoteNo || 'N/A'}     ${note.date ? new Date(note.date).toLocaleDateString('en-IN') : 'N/A'}     ₹${amountPaid.toFixed(2)}     ₹${remainingBalance.toFixed(2)}     ${status}`;
          doc.text(rowText, 10, y);
          y += 6;
        });
      }

      y += 10;
      // Summary section with proper formatting
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Amount of Product: ₹${receipt.totalProductAmount?.toFixed(2) || '0.00'}`, 10, y);
      y += 6;
      doc.text(`Total Amount Paid: ₹${receipt.totalPaidAmount?.toFixed(2) || '0.00'}`, 10, y);
      y += 6;
      doc.text(`Amount to Pay: ₹${receipt.remainingBalance?.toFixed(2) || '0.00'}`, 10, y);
      y += 6;
      doc.text(`Remaining Balance: ₹${receipt.remainingBalance?.toFixed(2) || '0.00'}`, 10, y);
      y += 8;
      
      // Add green "All outstanding bills settled" message when fully paid
      if (receipt.remainingBalance <= 0) {
        doc.setTextColor(0, 128, 0); // Green color
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('✓ All outstanding bills have been settled', 10, y);
        y += 8;
        doc.setTextColor(0, 0, 0); // Reset to black
      }
      
      // Thank You Message
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Thank You for Your Business!', 105, y, { align: 'center' });
      y += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('We appreciate your trust and look forward to serving you again.', 105, y, { align: 'center' });
      y += 20;

      // Check if we need a page break for signature
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      
      // Signature Section - matching print format
      y += 20;
      
      // Draw a line above signature
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(150, y, 190, y);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Authorized Signatory', 190, y + 12, { align: 'right' });
      y += 12;
      
      // Add signature line
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.line(140, y + 5, 190, y + 5);
      
      doc.setFontSize(14);
      doc.text(selectedCompanyDetails?.name || companyDetails?.name || selectedCompany?.name || 'WYENFOS BILLS', 190, y + 15, { align: 'right' });
      y += 15;
      return doc;
    } catch (error) {
      console.error('Error generating print format PDF:', error);
      throw error;
    }
  };

  const downloadPDF = async (receipt = {
    receiptNo: form.receiptNumber,
    date: form.date,
    customer: selectedCustomer,
    creditBills,
    debitNotes,
    totalProductAmount: selectedDebitNoteId && selectedDebitNoteDetails 
      ? (selectedDebitNoteDetails.totalAmount || selectedDebitNoteDetails.grandTotal || 0)
      : totalProductAmount,
    totalPaidAmount: selectedDebitNoteId && selectedDebitNoteDetails
      ? (selectedDebitNoteDetails.amountPaid || 0)
      : totalPaidAmount,
    remainingBalance: selectedDebitNoteId && selectedDebitNoteDetails
      ? ((selectedDebitNoteDetails.totalAmount || selectedDebitNoteDetails.grandTotal || 0) - (selectedDebitNoteDetails.amountPaid || 0))
      : remainingBalance,
    remarks: form.remarks,
    selectedDebitNoteDetails
  }) => {
    try {
      const doc = await generatePrintFormatPDF(receipt);
      doc.save(`Payment_Receipt_${receipt.receiptNo}.pdf`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError('Failed to generate PDF.');
    }
  };

  const printReceipt = () => {
    // Create a print-friendly version with date and signature
    const printContent = document.querySelector('.receipt-container').innerHTML;
    
    // Add date and signature to print content
    const dateSignatureHTML = `
      <div style="text-align: center; margin: 20px 0; padding: 15px; border: 1px solid #ddd; background-color: #f9f9f9;">
        <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">
          Date: ${form.date ? new Date(form.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}
        </div>
      </div>
      <div style="text-align: right; margin-top: 40px; padding: 20px; border-top: 1px solid #000;">
        <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Authorized Signatory</div>
        <div style="border-bottom: 1px solid #000; width: 150px; margin: 10px 0;"></div>
        <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">${selectedCompanyDetails?.name || companyDetails?.name || selectedCompany?.name || 'WYENFOS BILLS'}</div>
        <div style="font-size: 12px; font-style: italic;">(Company Stamp)</div>
      </div>
    `;
    
    const fullPrintContent = printContent + dateSignatureHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = fullPrintContent;
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
    setSuccessMessage('🔄 Generating PDF and preparing email...');
    
    try {
      const token = localStorage.getItem('token');
      
      // Define tempReceipt in the proper scope
      let tempReceipt;
      
      if (highlightedReceiptId) {
        // For existing receipts, get the receipt data
        const receipt = receipts.find(r => r._id === highlightedReceiptId);
        if (!receipt) {
          setError('Selected receipt not found. Please refresh and try again.');
          setLoading(false);
          return;
        }
        
        // Create tempReceipt for existing receipts
        tempReceipt = {
          receiptNo: receipt.receiptNo,
          receiptNumber: receipt.receiptNo,
          customerId: receipt.customerId,
          customerName: receipt.customerName,
          amount: receipt.amount,
          date: new Date(receipt.date),
          metadata: receipt.metadata || {}
        };
      } else {
        // For new receipts, generate PDF on frontend first
        setSuccessMessage('📄 Generating PDF...');
        
        tempReceipt = {
          receiptNo: form.receiptNumber,
          receiptNumber: form.receiptNumber,
          customerId: selectedCustomer._id,
          customerName: selectedCustomer.name,
          amount: selectedDebitNoteDetails?.amountPaid || totalPaidAmount,
          date: new Date(form.date),
          metadata: {
            totalProductAmount: selectedDebitNoteDetails?.totalAmount || totalProductAmount,
            totalPaidAmount: selectedDebitNoteDetails?.amountPaid || totalPaidAmount,
            remarks: form.remarks
          }
        };

        // Generate PDF using the same function as download/print
        const receiptForPDF = {
          receiptNo: form.receiptNumber,
          date: form.date,
          customer: selectedCustomer,
          creditBills,
          debitNotes,
          totalProductAmount: selectedDebitNoteId && selectedDebitNoteDetails 
            ? (selectedDebitNoteDetails.totalAmount || selectedDebitNoteDetails.grandTotal || 0)
            : totalProductAmount,
          totalPaidAmount: selectedDebitNoteId && selectedDebitNoteDetails
            ? (selectedDebitNoteDetails.amountPaid || 0)
            : totalPaidAmount,
          remainingBalance: selectedDebitNoteId && selectedDebitNoteDetails
            ? ((selectedDebitNoteDetails.totalAmount || selectedDebitNoteDetails.grandTotal || 0) - (selectedDebitNoteDetails.amountPaid || 0))
            : remainingBalance,
          remarks: form.remarks,
          selectedDebitNoteDetails
        };

        // Generate PDF with timeout
        const pdfPromise = generatePrintFormatPDF(receiptForPDF);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PDF generation timed out')), 10000)
        );
        
        const doc = await Promise.race([pdfPromise, timeoutPromise]);
        
        // Compress PDF and check size
        const pdfBase64 = doc.output('datauristring').split(',')[1]; // Get base64 without data URI prefix
        
        // Check PDF size before sending
        const pdfSizeMB = (pdfBase64.length * 3) / 4 / (1024 * 1024); // Approximate size in MB
        console.log('PDF Size:', pdfSizeMB.toFixed(2), 'MB');
        
        if (pdfSizeMB > 20) { // Warn if over 20MB
          console.warn('PDF is large:', pdfSizeMB.toFixed(2), 'MB. Consider optimizing.');
          
          // Ask user if they want to send email without PDF attachment
          const sendWithoutPDF = window.confirm(
            `PDF file is large (${pdfSizeMB.toFixed(2)}MB) and may cause email delivery issues. Would you like to send the email without PDF attachment? You can download the PDF separately.`
          );
          
          if (sendWithoutPDF) {
            setSuccessMessage('📧 Sending email without PDF attachment...');
            
            // Send email without PDF attachment
            const emailPromise = axios.post(
              `/api/payment-receipts/send-email-without-pdf`,
              {
                emailTo: selectedCustomer.email,
                subject: `Payment Receipt ${form.receiptNumber} - ${selectedCompanyDetails?.name || selectedCompany?.name || 'WYENFOS'}`,
                body: `Dear ${selectedCustomer.name || 'Customer'},\n\nYour payment receipt ${form.receiptNumber} has been generated.\n\nDue to file size limitations, the PDF attachment could not be included in this email.\n\nPlease download your receipt from the application or contact us for assistance.\n\nThank you for your business!`,
                receiptData: tempReceipt
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                timeout: 30000
              }
            );
            
            const emailTimeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Email request timed out')), 30000)
            );
            
            await Promise.race([emailPromise, emailTimeoutPromise]);
            
            setSuccessMessage(`✅ Email sent successfully to ${selectedCustomer.email}! (PDF not attached due to size)`);
            
            setTimeout(() => {
              setSuccessMessage(null);
            }, 5000);
            
            setLoading(false);
            return;
          }
        }
        
        // Send email with PDF attachment for new receipts
        setSuccessMessage('📧 Sending email...');
        
        const emailPromise = axios.post(
          `/api/payment-receipts/send-email-with-pdf`,
          {
            emailTo: selectedCustomer.email,
            subject: `Payment Receipt ${form.receiptNumber} - ${selectedCompanyDetails?.name || selectedCompany?.name || 'WYENFOS'}`,
            body: `Dear ${selectedCustomer.name || 'Customer'},\n\nPlease find attached your payment receipt from ${selectedCompanyDetails?.name || selectedCompany?.name || 'WYENFOS'}.\n\nThank you for your business!`,
            pdfBase64: pdfBase64,
            receiptData: tempReceipt
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
          }
        );
        
        const emailTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email request timed out')), 30000)
        );
        
        await Promise.race([emailPromise, emailTimeoutPromise]);
        
        setSuccessMessage(`✅ Email sent successfully to ${selectedCustomer.email}!`);
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
        
        setLoading(false);
        return;
      }
      
      // For existing receipts, send email without PDF (since we don't have pdfBase64)
      setSuccessMessage('📧 Sending email...');
      
      const emailPromise = axios.post(
        `/api/payment-receipts/send-email-without-pdf`,
        {
          emailTo: selectedCustomer.email,
          subject: `Payment Receipt ${tempReceipt.receiptNo} - ${selectedCompanyDetails?.name || selectedCompany?.name || 'WYENFOS'}`,
          body: `Dear ${selectedCustomer.name || 'Customer'},\n\nPlease find attached your payment receipt from ${selectedCompanyDetails?.name || selectedCompany?.name || 'WYENFOS'}.\n\nThank you for your business!`,
          receiptData: tempReceipt
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );
      
      const emailTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email request timed out')), 30000)
      );
      
      await Promise.race([emailPromise, emailTimeoutPromise]);
      
      setSuccessMessage(`✅ Email sent successfully to ${selectedCustomer.email}!`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
      setLoading(false);
      return;
    } catch (error) {
      console.error('Email error:', error.response?.data || error.message);
      
      if (error.message.includes('timed out')) {
        setError(`Email process timed out. Please try again. If the problem persists, try downloading the PDF and sending it manually.`);
      } else if (error.response?.data?.message?.includes('PDF file too large')) {
        setError(`PDF file is too large (${error.response?.data?.fileSize || 'unknown size'}). Please try downloading the PDF and sending it manually, or contact support for assistance.`);
      } else {
        setError(error.response?.data?.message || 'Failed to send email. Please try again.');
      }
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
    if (!highlightedReceiptId) {
      setError('Please select a receipt to edit.');
      return;
    }
    
    if (!selectedCustomer) {
      setError('Please select a customer.');
      return;
    }
    
    if (!selectedCustomer._id) {
      setError('Customer ID is required.');
      return;
    }
    
    // More flexible ID validation - allow both MongoDB ObjectId (24 chars) and Firestore IDs (20 chars)
    const idRegex = /^[0-9a-zA-Z]{20,24}$/;
    if (!idRegex.test(selectedCustomer._id)) {
      console.log('Customer ID validation failed:', selectedCustomer._id);
      console.log('Customer ID length:', selectedCustomer._id.length);
      setError('Invalid customer ID format.');
      return;
    }

    // Calculate amounts based on whether a debit note is selected
    const finalTotalProductAmount = selectedDebitNoteId && selectedDebitNoteDetails 
      ? (selectedDebitNoteDetails.totalAmount || selectedDebitNoteDetails.grandTotal || 0)
      : totalProductAmount;
    
    const finalTotalPaidAmount = selectedDebitNoteId && selectedDebitNoteDetails
      ? (selectedDebitNoteDetails.amountPaid || 0)
      : totalPaidAmount;

    if (!finalTotalPaidAmount || finalTotalPaidAmount <= 0) {
      setError('Total paid amount must be greater than zero.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const updateData = {
        receiptNo: form.receiptNumber,
        receiptNumber: form.receiptNumber,
        customerId: selectedCustomer._id,
        customerName: form.customer.name || selectedCustomer.name || 'N/A',
        amount: finalTotalPaidAmount,
        date: new Date(form.date),
        type: 'payment',
        creditBillId: creditBills.length > 0 ? creditBills[0]._id : undefined,
        debitNoteId: selectedDebitNoteId || undefined,
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
          selectedDebitNote: selectedDebitNoteId ? availableDebitNotes.find(note => note._id === selectedDebitNoteId) : null,
          totalProductAmount: finalTotalProductAmount,
          totalPaidAmount: finalTotalPaidAmount,
          remainingBalance: finalTotalProductAmount - finalTotalPaidAmount,
          remarks: form.remarks,
          address: form.customer.address,
          phone: form.customer.phone,
          email: form.customer.email,
          gstin: form.customer.gstin,
          receiptDelivery: {
            email: selectedCustomer.email || form.customer.email,
            mobile: selectedCustomer.phone || form.customer.phone,
            deliveryMethod: 'email_and_sms'
          }
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
      setSuccessMessage('✅ Receipt updated successfully!');
      fetchReceipts();
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (error) {
      console.error('Edit error:', error);
      setError(error.response?.data?.message || 'Failed to update receipt');
    }
  };

  const handleDelete = async () => {
    if (!highlightedReceiptId) {
      setError('Please select a receipt to delete.');
      return;
    }

    const receipt = receipts.find(r => r._id === highlightedReceiptId);
    const receiptInfo = receipt ? `${receipt.receiptNumber} - ${receipt.customerName}` : 'this receipt';
    
    if (!window.confirm(`Are you sure you want to delete ${receiptInfo}? This action cannot be undone.`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/payment-receipts/${highlightedReceiptId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setSuccessMessage(`✅ Receipt ${receiptInfo} deleted successfully!`);
      fetchReceipts();
      setHighlightedReceiptId(null);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
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

        {successMessage && (
          <div className="success-banner">
            <div style={{ whiteSpace: 'pre-line' }}>{successMessage}</div>
            <button onClick={() => setSuccessMessage(null)}>Dismiss</button>
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
            <CompanyHeader 
              selectedCompany={{
                name: selectedCompanyDetails?.name || selectedCompany?.name || 'WYENFOS',
                address: selectedCompanyDetails?.address || selectedCompany?.address || 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
                GSTIN: selectedCompanyDetails?.GSTIN || selectedCompany?.GSTIN || '',
                state: selectedCompanyDetails?.state || selectedCompany?.state || 'Kerala',
                stateCode: selectedCompanyDetails?.stateCode || selectedCompany?.stateCode || '32',
                mobile: selectedCompanyDetails?.mobile || selectedCompany?.mobile || '',
                email: selectedCompanyDetails?.email || selectedCompany?.email || '',
                website: selectedCompanyDetails?.website || selectedCompany?.website || '',
                logo: selectedCompanyDetails?.logo || selectedCompany?.logo || wyenfosLogo,
                prefix: selectedCompanyDetails?.prefix || 'WNF'
              }}
              billType="PAYMENT_RECEIPT"
              billDetails={{
                invoiceNumber: form.receiptNumber,
                date: form.date ? new Date(form.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
                reference: selectedCustomer?.customerId || ''
              }}
              showBankDetails={false}
            />
          <div className="header-left"><strong>Date:</strong> {form.date ? new Date(form.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}
          </div>
          </div>
      
        </div>

        <div className="customer-details">
          <div className="detail-item full-width customer-selector">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label>Select Customer</label>
              <button 
                type="button" 
                onClick={() => {
                  console.log('=== REFRESHING CUSTOMERS ===');
                  console.log('Current customers count:', customers.length);
                  fetchCustomers();
                }}
                style={{ 
                  backgroundColor: '#4caf50', 
                  color: 'white', 
                  padding: '4px 8px', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                🔄 Refresh Customers
              </button>
              
              <button 
                type="button" 
                onClick={() => {
                  if (selectedCompany && selectedCompany.name) {
                    fetchCompanyDetails(selectedCompany.name);
                  } else {
                    console.log('No company selected or company name missing');
                  }
                }}
                style={{ 
                  backgroundColor: '#9c27b0', 
                  color: 'white', 
                  padding: '4px 8px', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  marginLeft: '5px'
                }}
              >
                🏢 Fetch Company
              </button>
            </div>
            <select 
              value={selectedCustomer?._id || selectedCustomer?.id || ''} 
              onChange={handleCustomerSelect}
              onFocus={() => {
                console.log('Dropdown focused - Current customers:', customers.length);
                console.log('Current selected value:', selectedCustomer?._id || selectedCustomer?.id || '');
                console.log('Available options:', customers.map(c => ({ id: c._id || c.id, name: c.name || c.customerName })));
              }}
            >
              <option value="">Select a customer</option>
              {customers.map((customer, index) => {
                const displayId = customer.customerId || `CUST${(customer._id || customer.id)?.slice(-4) || '0000'}`;
                const customerId = customer._id || customer.id;
                return (
                  <option key={customerId || `temp-${displayId}-${index}`} value={customerId}>
                    {customer.name || customer.customerName || 'Unknown'} (ID: {displayId})
                  </option>
                );
              })}
            </select>
          </div>
          {selectedCustomer && (
      <>
      <div className="detail-item full-width email-receipt-banner">
        <div style={{ 
          backgroundColor: '#e8f5e8', 
          border: '1px solid #4caf50', 
          borderRadius: '4px', 
          padding: '8px 12px', 
          marginBottom: '15px',
          fontSize: '14px',
          color: '#2e7d32'
        }}>
          📧 <strong>Email Receipt:</strong> Add customer email and mobile for receipt delivery
        </div>
      </div>
      
      <div className="detail-item">
        <label>Customer Name</label>
        <input
          type="text"
          value={selectedCustomer.name || ''}
          readOnly
          style={{ backgroundColor: '#f5f5f5' }}
        />
      </div>
      
      <div className="detail-item">
        <label>Customer ID</label>
        <input
          type="text"
          value={selectedCustomer.customerId || selectedCustomer._id?.slice(-4) || 'N/A'}
          readOnly
          style={{ backgroundColor: '#f5f5f5' }}
        />
      </div>
      
      <div className="detail-item">
        <label>Email Address *</label>
        <input
          type="email"
          name="email"
          value={selectedCustomer.email || ''}
          onChange={handleCustomerDetailChange}
          placeholder="Enter email for receipt delivery"
          required
        />
      </div>
      
      <div className="detail-item">
        <label>Mobile Number *</label>
        <input
          type="tel"
          name="phone"
          value={selectedCustomer.phone || ''}
          onChange={handleCustomerDetailChange}
          placeholder="Enter mobile number for SMS receipt"
          required
        />
      </div>
      
                {availableDebitNotes.length > 0 && (
            <div className="detail-item full-width debit-note-selector">
              <label>Select Debit Note (Optional)</label>
              <select 
                value={selectedDebitNoteId} 
                onChange={(e) => handleDebitNoteSelect(e.target.value)}
              >
                <option value="">Select a debit note</option>
                {availableDebitNotes.map((note, index) => (
                  <option key={note._id || note.id || `debit-${note.debitNoteNo}-${index}`} value={note._id || note.id || ''}>
                    {note.debitNoteNo} - ₹{note.amountPaid?.toFixed(2)} - {new Date(note.date).toLocaleDateString('en-IN')}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                {availableDebitNotes.length > 0 ? `${availableDebitNotes.length} debit notes available` : 'No debit notes available'}
                              <button 
                type="button" 
                onClick={() => {
                  console.log('=== DEBIT NOTES DEBUG ===');
                  console.log('Current selected customer:', selectedCustomer);
                  console.log('Available debit notes:', availableDebitNotes);
                  console.log('Selected debit note ID:', selectedDebitNoteId);
                  console.log('Selected debit note details:', selectedDebitNoteDetails);
                  console.log('Credit bills:', creditBills);
                  console.log('Debit notes:', debitNotes);
                  
                  // Test if we can find the customer's debit notes
                  if (selectedCustomer && selectedCustomer._id) {
                    console.log('Looking for debit notes for customer ID:', selectedCustomer._id);
                    const customerDebitNotes = debitNotes.filter(note => 
                      note.customerId === selectedCustomer._id || 
                      note.customerId === selectedCustomer.id ||
                      note.customerId === selectedCustomer.customerId
                    );
                    console.log('Customer-specific debit notes:', customerDebitNotes);
                  }
                }}
                  style={{ 
                    backgroundColor: '#ff9800', 
                    color: 'white', 
                    padding: '2px 6px', 
                    border: 'none', 
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    marginLeft: '10px'
                  }}
                                 >
                   Debug Debit Notes
                 </button>
                 
                 <button 
                   type="button" 
                   onClick={() => {
                     console.log('=== TESTING DEBIT NOTE DROPDOWN ===');
                     console.log('Dropdown options:', availableDebitNotes.map(note => ({
                       value: note._id || note.id,
                       text: `${note.debitNoteNo} - ₹${note.amountPaid?.toFixed(2)} - ${new Date(note.date).toLocaleDateString('en-IN')}`
                     })));
                     
                     // Test selecting the first debit note
                     if (availableDebitNotes.length > 0) {
                       const firstNote = availableDebitNotes[0];
                       console.log('Testing selection of first debit note:', firstNote);
                       
                       // Debug the first note structure
                       console.log('First note keys:', Object.keys(firstNote));
                       console.log('First note amount fields:', {
                         totalAmount: firstNote.totalAmount,
                         grandTotal: firstNote.grandTotal,
                         amountPaid: firstNote.amountPaid,
                         paidAmount: firstNote.paidAmount,
                         totalPaid: firstNote.totalPaid,
                         amount: firstNote.amount
                       });
                       handleDebitNoteSelect(firstNote._id || firstNote.id);
                     } else {
                       console.log('No debit notes available to test');
                     }
                   }}
                   style={{ 
                     backgroundColor: '#4caf50', 
                     color: 'white', 
                     padding: '2px 6px', 
                     border: 'none', 
                     borderRadius: '3px',
                     cursor: 'pointer',
                     fontSize: '10px',
                     marginLeft: '5px'
                   }}
                                   >
                    Test Selection
                  </button>
                  
                  <button 
                    type="button" 
                    onClick={() => {
                      console.log('=== FETCHING DEBIT NOTES FOR CUST-14 ===');
                      
                      // Find the customer with CUST-14
                      const cust14Customer = customers.find(c => 
                        c.customerId === 'CUST-14' || 
                        c.customerId === 'CUST-14' ||
                        (c.name && c.name.toLowerCase() === 'aru')
                      );
                      
                      if (cust14Customer) {
                        const customerId = cust14Customer._id || cust14Customer.id;
                        console.log('Found CUST-14 customer:', cust14Customer);
                        console.log('Customer ID for CUST-14:', customerId);
                        console.log('Fetching debit notes for customer ID:', customerId);
                        
                        // Set this customer as selected
                        setSelectedCustomer({
                          _id: customerId,
                          name: cust14Customer.name || cust14Customer.customerName,
                          customerId: cust14Customer.customerId,
                          address: cust14Customer.address || cust14Customer.customerContact?.address || '',
                          phone: cust14Customer.phone || cust14Customer.customerContact?.phone || '',
                          email: cust14Customer.email || cust14Customer.customerContact?.email || '',
                          gstin: cust14Customer.gstin || cust14Customer.customerContact?.gstin || ''
                        });
                        
                        // Fetch bills and debit notes
                        fetchCustomerBills(customerId);
                      } else {
                        console.log('CUST-14 customer not found in customers array');
                        console.log('Available customers:', customers.map(c => ({ 
                          name: c.name || c.customerName, 
                          customerId: c.customerId,
                          id: c._id || c.id 
                        })));
                      }
                    }}
                    style={{ 
                      backgroundColor: '#e91e63', 
                      color: 'white', 
                      padding: '2px 6px', 
                      border: 'none', 
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      marginLeft: '5px'
                    }}
                  >
                    Fetch CUST-14
                  </button>
              </div>
            </div>
          )}
          
          {/* Debug button to manually refresh customer data */}
          {selectedCustomer && (
            <div className="detail-item full-width">
              <button 
                type="button" 
                onClick={() => {
                  console.log('Manual refresh triggered');
                  console.log('Current selectedCustomer:', selectedCustomer);
                  console.log('Current customers array:', customers);
                  if (selectedCustomer._id) {
                    console.log('Fetching bills for customer ID:', selectedCustomer._id);
                    fetchCustomerBills(selectedCustomer._id);
                  } else {
                    console.log('No customer ID available for fetching bills');
                  }
                }}
                style={{ 
                  backgroundColor: '#2196f3', 
                  color: 'white', 
                  padding: '8px 16px', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                🔄 Refresh Customer Data
              </button>
              
              {/* Debug button to check customer data structure */}
              <button 
                type="button" 
                onClick={() => {
                  console.log('=== CUSTOMER DATA STRUCTURE DEBUG ===');
                  const customer = customers.find(c => 
                    (c._id === selectedCustomer._id) || (c.id === selectedCustomer._id) || 
                    (c._id === selectedCustomer.id) || (c.id === selectedCustomer.id)
                  );
                  console.log('Found customer:', customer);
                  console.log('Customer keys:', customer ? Object.keys(customer) : 'No customer found');
                  console.log('Customer full object:', customer ? JSON.stringify(customer, null, 2) : 'No customer found');
                  
                  // Check for any field that might contain address/phone/email/gstin
                  if (customer) {
                    const allKeys = Object.keys(customer);
                    console.log('All customer keys:', allKeys);
                    allKeys.forEach(key => {
                      console.log(`${key}:`, customer[key]);
                    });
                  }
                }}
                style={{ 
                  backgroundColor: '#ff9800', 
                  color: 'white', 
                  padding: '8px 16px', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginLeft: '10px'
                }}
              >
                🔍 Debug Customer Data
              </button>
            </div>
          )}
    </>
          )}
        </div>

    
        {(creditBills.length > 0 || debitNotes.length > 0) && (
          <>
       

            {/* Receipt Summary - Show different content based on debit note selection */}
            <div className="receipt-summary">
              {selectedDebitNoteId && selectedDebitNoteDetails ? (
                <>
                  {/* Summary for Selected Debit Note */}
                  <div className="debit-note-summary">
                    <div className="amount-input-group">
                      <label>Total Amount of Product:</label>
                      <input
                        type="number"
                        value={selectedDebitNoteDetails.totalAmount || selectedDebitNoteDetails.grandTotal || 0}
                        onChange={(e) => {
                          const newValue = parseFloat(e.target.value) || 0;
                          setSelectedDebitNoteDetails(prev => ({
                            ...prev,
                            totalAmount: newValue,
                            grandTotal: newValue
                          }));
                        }}
                        placeholder="Enter total product amount"
                        step="0.01"
                        min="0"
                        style={{
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                          width: '150px'
                        }}
                      />
                      <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>₹</span>
                    </div>
                    
                    <div className="amount-input-group">
                      <label>Total Amount Paid:</label>
                      <input
                        type="number"
                        value={selectedDebitNoteDetails.amountPaid || 0}
                        onChange={(e) => {
                          const newValue = parseFloat(e.target.value) || 0;
                          setSelectedDebitNoteDetails(prev => ({
                            ...prev,
                            amountPaid: newValue
                          }));
                        }}
                        placeholder="Enter amount paid"
                        step="0.01"
                        min="0"
                        style={{
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                          width: '150px'
                        }}
                      />
                      <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>₹</span>
                    </div>
                    
                    {/* Payment Status Warning */}
                    {Math.abs((selectedDebitNoteDetails.amountPaid || 0) - (selectedDebitNoteDetails.totalAmount || selectedDebitNoteDetails.grandTotal || 0)) > 0.01 && (
                      <div style={{ 
                        backgroundColor: '#ffebee', 
                        border: '1px solid #f44336', 
                        borderRadius: '4px', 
                        padding: '8px', 
                        marginTop: '10px',
                        color: '#c62828',
                        fontSize: '14px'
                      }}>
                        ⚠️ <strong>Partial Payment:</strong> Payment receipt can only be generated for full payment. 
                        Amount paid must equal total product amount.
                      </div>
                    )}
                    
                    {/* Full Payment Confirmation */}
                    {Math.abs((selectedDebitNoteDetails.amountPaid || 0) - (selectedDebitNoteDetails.totalAmount || selectedDebitNoteDetails.grandTotal || 0)) <= 0.01 && (
                      <div className="full-payment-message" style={{ 
                        backgroundColor: '#e8f5e8', 
                        border: '1px solid #4caf50', 
                        borderRadius: '4px', 
                        padding: '8px', 
                        marginTop: '10px',
                        color: '#2e7d32',
                        fontSize: '14px'
                      }}>
                        ✅ <strong>Full Payment:</strong> Payment receipt can be generated.
                      </div>
                    )}
                  </div>
                  
                  {/* Selected Debit Note Details */}
                  <div className="selected-debit-note-summary">
                    <h4>Selected Debit Note Details</h4>
                    <div className="debit-note-info">
                      <p><strong>Debit Note No:</strong> <span>{selectedDebitNoteDetails.debitNoteNo || selectedDebitNoteDetails.invoiceNumber || 'N/A'}</span></p>
                      <p><strong>Date:</strong> <span>{selectedDebitNoteDetails.date ? new Date(selectedDebitNoteDetails.date).toLocaleDateString('en-IN') : 'N/A'}</span></p>
                      <p><strong>Amount Paid:</strong> <span>₹{selectedDebitNoteDetails.amountPaid?.toFixed(2) || '0.00'}</span></p>
                      <p><strong>Payment Status:</strong> <span className="payment-status-badge">✅ Paid</span></p>
                      {selectedDebitNoteDetails.remarks && (
                        <p><strong>Remarks:</strong> <span>{selectedDebitNoteDetails.remarks}</span></p>
                      )}
                    </div>
                  </div>
                  

                </>
              ) : (
                <>
                  <p>Total Amount of Product: <span>₹{totalProductAmount.toFixed(2)}</span></p>
                  <p>Total Amount Paid: <span>₹{totalPaidAmount.toFixed(2)}</span></p>
                </>
              )}
              
              {/* Payment Status Summary */}
              <div className="payment-status-summary">
                <p>Fully Paid Bills: <span className="fully-paid-count">
                  {creditBills.filter(bill => {
                    const totalAmount = bill.totalAmount || 0;
                    const totalPaid = bill.totalPaid || 0;
                    return (totalAmount - totalPaid) <= 0;
                  }).length}
                </span></p>
                <p>Partially Paid Bills: <span className="partially-paid-count">
                  {creditBills.filter(bill => {
                    const totalAmount = bill.totalAmount || 0;
                    const totalPaid = bill.totalPaid || 0;
                    return (totalAmount - totalPaid) > 0;
                  }).length}
                </span></p>
                <p>Total Bills: <span>{creditBills.length}</span></p>
              </div>
              
              {remainingBalance === 0 && (
                <div className="verification-note">
                  <p>✓ <strong>FULLY PAID:</strong> Customer has been paid the complete amount as per the date {form.date}</p>
                  <p>✓ All outstanding bills have been settled</p>
                </div>
              )}
              
              {remainingBalance > 0 && (
                <div className="outstanding-note">
                  <p>⚠ <strong>OUTSTANDING:</strong> Customer still has outstanding balance of ₹{remainingBalance.toFixed(2)}</p>
                  <p>Please ensure all payments are completed before marking as fully paid</p>
                </div>
              )}
            </div>
          </>
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
            <strong>{selectedCompany?.name || 'WYENFOS BILLS'}</strong><br />
            <span className="stamp-text">(Company Stamp)</span>
          </div>
        </div>

        <div className="thank-you-section">
          <h3>Thank You for Your Business!</h3>
          <p>We appreciate your trust and look forward to serving you again.</p>
        </div>

        <div className="receipt-actions">
          <button 
            onClick={saveReceipt} 
            className="action-btn save-btn"
            disabled={
              selectedDebitNoteId && selectedDebitNoteDetails && 
              Math.abs((selectedDebitNoteDetails.amountPaid || 0) - (selectedDebitNoteDetails.totalAmount || selectedDebitNoteDetails.grandTotal || 0)) > 0.01
            }
            style={{
              opacity: (
                selectedDebitNoteId && selectedDebitNoteDetails && 
                Math.abs((selectedDebitNoteDetails.amountPaid || 0) - (selectedDebitNoteDetails.totalAmount || selectedDebitNoteDetails.grandTotal || 0)) > 0.01
              ) ? 0.5 : 1,
              cursor: (
                selectedDebitNoteId && selectedDebitNoteDetails && 
                Math.abs((selectedDebitNoteDetails.amountPaid || 0) - (selectedDebitNoteDetails.totalAmount || selectedDebitNoteDetails.grandTotal || 0)) > 0.01
              ) ? 'not-allowed' : 'pointer'
            }}
          >
            {selectedDebitNoteId && selectedDebitNoteDetails && 
             Math.abs((selectedDebitNoteDetails.amountPaid || 0) - (selectedDebitNoteDetails.totalAmount || selectedDebitNoteDetails.grandTotal || 0)) > 0.01
              ? 'Save (Full Payment Required)'
              : 'Save'
            }
          </button>
          <button onClick={printReceipt} className="action-btn print-btn">Print</button>
          <button onClick={() => downloadPDF()} className="action-btn download-btn">Download</button>
          <button 
            onClick={sendEmail} 
            className="action-btn email-btn"
            disabled={!selectedCustomer?.email || loading}
            title={
              !selectedCustomer?.email ? 'No customer email available' :
              loading ? 'Sending email...' :
              'Send receipt via email'
            }
          >
            {loading ? '📧 Sending...' : '📧 Send Email'}
          </button>
          <button onClick={() => setShowSideView(!showSideView)} className="action-btn toggle-btn">
            {showSideView ? 'Hide Receipts' : 'View Receipts'}
          </button>
          <button onClick={() => navigate(-1)} className="action-btn back-btn">Back</button>
          {userRole === 'admin' || userRole === 'super_admin' ? (
            <>
              <button 
                onClick={() => handleEdit()} 
                className="action-btn edit-btn"
                disabled={!highlightedReceiptId}
                title={!highlightedReceiptId ? 'Select a receipt to edit' : 'Edit selected receipt'}
              >
                Edit
              </button>
              <button 
                onClick={() => handleDelete()} 
                className="action-btn delete-btn"
                disabled={!highlightedReceiptId}
                title={!highlightedReceiptId ? 'Select a receipt to delete' : 'Delete selected receipt'}
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setShowRequestModal(true)} 
                className="action-btn request-btn"
                disabled={!highlightedReceiptId}
                title={!highlightedReceiptId ? 'Select a receipt to request changes' : 'Request changes for selected receipt'}
              >
                Request Changes
              </button>

            </>
          )}
        </div>
      </div>

      {showSideView && (
        <div className="side-view">
          <h3 className="side-view-title">
            Saved Payment Receipts 
            <span style={{ fontSize: '14px', color: '#666', marginLeft: '10px' }}>
              ({displayedReceipts.length} of {receipts.length})
            </span>
          </h3>
          <div className="side-view-content">
            {displayedReceipts.length > 0 ? (
              displayedReceipts.map((receipt, index) => (
                <div
                  key={receipt._id || receipt.id || `receipt-${index}`}
                  className={`side-view-item ${highlightedReceiptId === receipt._id ? 'highlighted' : ''}`}
                  onClick={() => handleReceiptClick(receipt._id || receipt.id)}
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
            
            {/* Show More/Less Button */}
            {receipts.length > 10 && (
              <div style={{ 
                textAlign: 'center', 
                marginTop: '15px', 
                padding: '10px',
                borderTop: '1px solid #ddd'
              }}>
                <button
                  onClick={() => setShowAllReceipts(!showAllReceipts)}
                  style={{
                    backgroundColor: '#997a8d',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {showAllReceipts ? 'Show Latest 10' : `Show All ${receipts.length} Receipts`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentReceipt;