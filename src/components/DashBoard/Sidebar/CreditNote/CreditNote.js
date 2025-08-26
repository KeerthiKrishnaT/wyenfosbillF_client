import React, { useMemo,useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { QRCodeCanvas } from 'qrcode.react';
import CompanyHeader from '../CompanyHeader/CompanyHeader';
import ProductSelector from '../../../Product/ProductSelector.js';
import cancelledWatermark from '../../../../assets/images/cancelled.png';
import './CreditNote.css';
import axios from 'axios';
import { showNotification } from '../utils/showNotification.js';
import debounce from 'lodash.debounce';
import { getCompanyDetails } from '../utils/companyHelpers.js';

const validCompanies = [
  'WYENFOS INFOTECH',
  'WYENFOS GOLD & DIAMONDS',
  'WYENFOS ADS',
  'WYENFOS CASH VAPASE',
  'AYUR FOR HERBALS INDIA',
  'WYENFOS',
  'WYENFOS PURE DROPS',
];

const getCompanyPrefix = (company) => {
    const prefixes = {
      'WYENFOS INFOTECH': 'WIT',
      'WYENFOS GOLD & DIAMONDS': 'WGD',
      'WYENFOS ADS': 'WAD',
      'WYENFOS CASH VAPASE': 'WCV',
      'AYUR FOR HERBALS INDIA': 'ALH',
      'WYENFOS': 'WNF',
      'WYENFOS PURE DROPS': 'WPD',
    };
    return prefixes[company] || 'WB';
  };

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
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

const CreditNote = () => {
  const { state } = useLocation();
  let selectedCompany = 'WYENFOS';
  
  // Handle company selection from state
  if (state?.selectedCompany) {
    if (typeof state.selectedCompany === 'object' && state.selectedCompany.name) {
      selectedCompany = state.selectedCompany.name;
    } else if (typeof state.selectedCompany === 'string') {
      selectedCompany = state.selectedCompany;
    }
  }
  
  // Handle company name mapping for backward compatibility
  if (selectedCompany === 'AYUR 4 LIFE HERBALS India') {
    selectedCompany = 'AYUR FOR HERBALS INDIA';
  }
  
  // Ensure selectedCompany is always a string
  if (typeof selectedCompany !== 'string') {
    console.warn('selectedCompany is not a string:', selectedCompany);
    selectedCompany = 'WYENFOS';
  }
  const navigate = useNavigate();
  const { id } = useParams();
  const noteRef = useRef();
  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    customerAddress: '',
    customerEmail: '',
    customerPhone: '',
    reason: '',
    date: new Date().toISOString().slice(0, 10),
    items: [{ name: '', itemCode: '', hsnCode: '', quantity: 1, rate: 0, returnQty: 0 }],
    paymentMode: 'Cash',
    returnedAmount: '0',
    company: {
      ...getCompanyDetails(selectedCompany),
    },
    createdBy: localStorage.getItem('userEmail') || 'unknown',
    lastUpdatedBy: localStorage.getItem('userEmail') || 'unknown',
  });
  const [notes, setNotes] = useState('');
  const [isCancelled, setIsCancelled] = useState(false);
  const [taxType, setTaxType] = useState('cgst_sgst');
  const [loading, setLoading] = useState(false);
  const [creditNoteNumber, setCreditNoteNumber] = useState('');
  const [savedCreditNotes, setSavedCreditNotes] = useState([]);
  const [editPermissions, setEditPermissions] = useState({});
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [pendingEditNote, setPendingEditNote] = useState(null);
  const [billType, setBillType] = useState('CashBill');
  const [invoiceId, setInvoiceId] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  // ProductList is now handled by ProductSelector component
  const [isCustomerLoading, setIsCustomerLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({
    customerId: '',
    customerName: '',
    customerAddress: '',
    customerEmail: '',
    customerPhone: '',
    reason: '',
    notes: '',
    items: [{ name: '', itemCode: '', hsnCode: '', quantity: '', rate: '', returnQty: '' }],
    general: '',
  });
  const userRole = localStorage.getItem('userRole') || 'Guest';
  const userEmail = localStorage.getItem('userEmail') || 'unknown@example.com';

  const selectedCompanyDetails = useMemo(() => {
    // Company details mapping
    const companyDetails = {
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
        qrCode: '/uploads/bank-qr-codes/WYENFOS_QR_1755336487474.png',
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
        qrCode: '/uploads/bank-qr-codes/WYENFOS_QR_1755336487474.png',
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
        qrCode: '/uploads/bank-qr-codes/AYUR_QR_1755336487474.png',
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
    };

    return companyDetails[selectedCompany] || {
      name: selectedCompany,
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
  }, [selectedCompany]);

  // Update company details based on selected company
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      company: selectedCompanyDetails
    }));
  }, [selectedCompany, selectedCompanyDetails]);

  const sanitizeInput = useCallback((input) => DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }), []);




  const fetchCustomers = async () => {
  try {
    const response = await api.get('/customers');
    setCustomers(response.data || []);
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    setErrors((prev) => ({ ...prev, general: 'Failed to fetch customers' }));
  }
};

  const getCreditNoteById = useCallback(async (noteId) => {
    setLoading(true);
    try {
      const response = await api.get(`/creditnotes/${noteId}`);
      const note = response.data;
      setForm({
        customerId: note.customerId || '',
        customerName: note.customerName || '',
        customerAddress: note.customerAddress || '',
        customerEmail: note.customerEmail || '',
        customerPhone: note.customerPhone || '',
        reason: note.reason || '',
        items: note.items.length > 0
          ? note.items.map((item) => ({
              name: item.name,
              itemCode: item.itemCode,
              hsnCode: item.hsnCode,
              quantity: item.qty,
              rate: item.rate,
              returnQty: item.returnQty || 0,
            }))
          : [{ name: '', itemCode: '', hsnCode: '', quantity: 1, rate: 0, returnQty: 0 }],
        paymentMode: note.paymentMode || 'Cash',
        company: note.company || {
          name: selectedCompany,
          address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
          GSTIN: '32AAFCW8945G1ZQ',
          state: 'Kerala',
          stateCode: '32',
        },
        createdBy: note.createdBy || userEmail,
        lastUpdatedBy: userEmail,
      });
      setNotes(note.notes || '');
      setIsCancelled(note.isCancelled || false);
      setTaxType(note.taxType || 'cgst_sgst');
      setCreditNoteNumber(note.invoiceNumber || `${getCompanyPrefix(selectedCompany)}-1`);
    } catch (error) {
      console.error('Error fetching credit note:', error);
      setErrors((prev) => ({ ...prev, general: `Failed to load credit note with ID ${noteId}.` }));
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, userEmail]);

  const fetchAllCreditNotes = useCallback(async () => {
    try {
      const response = await api.get('/creditnotes');
      // Limit to latest 10 credit notes
      const latestNotes = response.data.slice(0, 10);
      setSavedCreditNotes(latestNotes);
    } catch (error) {
      console.error('Error fetching all credit notes:', error);
      setErrors((prev) => ({ ...prev, general: 'Failed to fetch saved credit notes.' }));
    }
  }, []);

  const checkUserRole = useCallback(async () => {
    console.log('Checking user role...');
    setLoading(true);
    try {
      const response = await api.get('/auth/user-role');
      console.log('User role response:', response.data);
      const { EditPermission: editPermissions } = response.data;
      setEditPermissions(editPermissions);
    } catch (error) {
      console.error('Error checking user role:', error.response?.data || error.message);
      
      // If token expired, redirect to login
      if (error.response?.status === 401) {
        setMessage({
          type: 'error',
          text: 'Session expired. Please log in again.',
        });
        setTimeout(() => {
          localStorage.removeItem('token');
          navigate('/login');
        }, 2000);
        return;
      }
      
      setMessage({
        type: 'error',
        text: `Failed to verify user role: ${error.response?.data?.error || 'Please try again.'}`,
      });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (!validCompanies.includes(selectedCompany)) {
        throw new Error(`Invalid company: ${selectedCompany}`);
      }
      
      // Fetch latest credit note number
      const companyPrefix = getCompanyPrefix(selectedCompany);
      try {
        const response = await api.get('/creditnotes/latest-invoice', {
          params: {
            company: selectedCompany,
            prefix: companyPrefix,
          },
        });
        const latestNumber = response.data?.invoiceNumber;
        console.log(`Credit Note Number Generation - Backend returned: ${latestNumber}`);
        
        // The backend returns the next invoice number, so we can use it directly
        if (latestNumber && latestNumber.startsWith(companyPrefix)) {
          setCreditNoteNumber(latestNumber);
        } else {
          // Fallback to starting from 1
          setCreditNoteNumber(`${companyPrefix}-1`);
        }
      } catch (error) {
        console.error('Error fetching latest credit note number:', error);
        const fallback = `${getCompanyPrefix(selectedCompany)}-1`;
        setCreditNoteNumber(fallback);
      }
      
      await fetchCustomers();
      await fetchAllCreditNotes();
      await checkUserRole();
      if (id) {
        await getCreditNoteById(id);
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, general: `Failed to load data: ${err.message}` }));
    } finally {
      setLoading(false);
    }
  }, [id, selectedCompany, fetchAllCreditNotes, checkUserRole, getCreditNoteById]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const searchCustomers = async (query) => {
  if (!query.trim()) {
    setSearchResults([]);
    return;
  }
  setIsCustomerLoading(true);
  try {
    const response = await api.get('/customers/find', {
      params: { query: sanitizeInput(query) },
    });
    setSearchResults(response.data || []);
  } catch (error) {
    console.error('Failed to search customers:', error);
    setErrors((prev) => ({ ...prev, general: 'Failed to search customers' }));
  } finally {
    setIsCustomerLoading(false);
  }
};

const debouncedSearch = useRef(debounce(searchCustomers, 500)).current;

useEffect(() => {
  if (customerSearch.length >= 3) {
    debouncedSearch(customerSearch);
  } else {
    setSearchResults([]);
  }
}, [customerSearch, debouncedSearch]);

const selectCustomer = (customer) => {
  setForm({
    ...form,
    customerId: customer.customerId || '',
    customerName: customer.customerName || '',
    customerAddress: customer.customerContact?.address || '',
    customerEmail: customer.customerContact?.email || '',
    customerPhone: customer.customerContact?.phone || '',
  });
  setCustomerSearch('');
  };

  const createNewCustomer = useCallback(
    async (name) => {
      if (!name.trim()) {
        setErrors((prev) => ({ ...prev, general: 'Customer name is required to create a new customer.' }));
        return '';
      }
      const token = localStorage.getItem('token');
      if (!token || !userEmail) {
        showNotification({ type: 'error', text: 'Please log in to create a customer.', duration: 3000 });
        return '';
      }
      if (!validCompanies.includes(selectedCompany)) {
        showNotification({ type: 'error', text: `Invalid company: ${selectedCompany}`, duration: 3000 });
        return '';
      }
      try {
        const payload = {
          customerName: sanitizeInput(name),
          customerContact: {
            address: form.customerAddress || '',
            email: form.customerEmail || '',
            phone: form.customerPhone || '',
          },
          company: selectedCompany,
          createdBy: userEmail,
          lastUpdatedBy: userEmail,
        };
        const response = await api.post('/customers', payload);
        const newCustomer = response.data;
        setCustomers((prev) => [...prev, newCustomer]);
        setForm((prev) => ({
          ...prev,
          customerId: newCustomer.customerId || '',
          customerName: newCustomer.customerName || '',
          customerAddress: newCustomer.customerContact?.address || '',
          customerEmail: newCustomer.customerContact?.email || '',
          customerPhone: newCustomer.customerContact?.phone || '',
        }));
        setErrors((prev) => ({ ...prev, general: `Customer created: ${newCustomer.customerName}` }));
        return newCustomer.customerId || '';
      } catch (err) {
        console.error('createNewCustomer Error:', err);
        setErrors((prev) => ({
          ...prev,
          general: `Failed to create customer: ${err.response?.data?.message || err.message}`,
        }));
        return '';
      }
    },
    [sanitizeInput, selectedCompany, userEmail, form.customerAddress, form.customerEmail, form.customerPhone]
  );

  const handleCustomerChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      const sanitizedValue = sanitizeInput(value);

      if (name === 'customerName') {
        const selectedCustomer = customers.find((c) => c.customerName.toLowerCase() === sanitizedValue.toLowerCase());
        if (selectedCustomer) {
          setForm((prev) => ({
            ...prev,
            customerId: selectedCustomer.customerId || '',
            customerName: selectedCustomer.customerName || '',
            customerAddress: selectedCustomer.customerContact?.address || '',
            customerEmail: selectedCustomer.customerContact?.email || '',
            customerPhone: selectedCustomer.customerContact?.phone || '',
          }));
          setErrors((prev) => ({
            ...prev,
            customerId: '',
            customerName: '',
            customerAddress: '',
            customerEmail: '',
            customerPhone: '',
          }));
        } else {
          setForm((prev) => ({
            ...prev,
            customerName: sanitizedValue,
            customerId: '',
            customerAddress: '',
            customerEmail: '',
            customerPhone: '',
          }));
          setErrors((prev) => ({
            ...prev,
            customerName: sanitizedValue.trim() ? '' : 'Customer name is required',
          }));
        }
      } else if (name === 'customerAddress') {
        setForm((prev) => ({ ...prev, [name]: sanitizedValue }));
        setErrors((prev) => ({
          ...prev,
          customerAddress: sanitizedValue.trim() ? '' : 'Customer address is required',
        }));
      } else if (name === 'customerEmail') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        setForm((prev) => ({ ...prev, [name]: sanitizedValue }));
        setErrors((prev) => ({
          ...prev,
          customerEmail: sanitizedValue && !emailRegex.test(sanitizedValue) ? 'Invalid email format' : '',
        }));
      } else if (name === 'customerPhone') {
        const phoneRegex = /^\+?[\d\s-]{10,15}$/;
        setForm((prev) => ({ ...prev, [name]: sanitizedValue }));
        setErrors((prev) => ({
          ...prev,
          customerPhone: sanitizedValue && !phoneRegex.test(sanitizedValue) ? 'Invalid phone number' : '',
        }));
      } else if (name === 'reason') {
        setForm((prev) => ({ ...prev, [name]: sanitizedValue }));
        setErrors((prev) => ({
          ...prev,
          reason: sanitizedValue ? '' : 'Reason is required',
        }));
      } else if (name === 'returnedAmount') {
        const amount = parseFloat(sanitizedValue) || 0;
        setForm((prev) => ({ ...prev, [name]: sanitizedValue }));
        setErrors((prev) => ({
          ...prev,
          returnedAmount: amount < 0 ? 'Returned amount cannot be negative' : '',
        }));
      }
    },
    [sanitizeInput, customers]
  );

  const handleNotesChange = (value) => {
    const sanitizedValue = sanitizeInput(value);
    setNotes(sanitizedValue);
    setErrors((prev) => ({
      ...prev,
      notes: sanitizedValue.length <= 500 ? '' : 'Notes cannot exceed 500 characters',
    }));
  };

  const handleCustomerSearch = useCallback(async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      setErrors((prev) => ({ ...prev, general: '' }));
      return;
    }
    setIsCustomerLoading(true);
    setErrors((prev) => ({ ...prev, general: '' }));
    try {
      const response = await api.get('/customers/find', {
        params: { query: sanitizeInput(query), company: selectedCompany },
      });
      const customers = Array.isArray(response.data) ? response.data : [];
      setSearchResults(customers);
      
      if (customers.length === 0) {
        setErrors((prev) => ({ ...prev, general: `No customers found for "${query}". You can create a new customer below.` }));
      }
    } catch (error) {
      console.error('Failed to search customers:', error);
      setSearchResults([]);
      setErrors((prev) => ({ 
        ...prev, 
        general: `Failed to search customers: ${error.response?.data?.message || error.message}. Please try again.` 
      }));
    } finally {
      setIsCustomerLoading(false);
    }
  }, [selectedCompany, sanitizeInput]);

  // Products are now fetched by ProductSelector component

  const handleItemChange = (index, field, value) => {
  const sanitizedValue = field === 'quantity' || field === 'rate' || field === 'returnQty' ? value : sanitizeInput(value);
  const updatedItems = [...form.items];
  
  if (field === 'name') {
    updatedItems[index] = { ...updatedItems[index], [field]: sanitizedValue };
  } else {
    updatedItems[index] = {
      ...updatedItems[index],
      [field]:
        field === 'quantity'
          ? Math.max(1, parseInt(value) || 1)
          : field === 'rate'
          ? Math.max(0, parseFloat(value) || 0)
          : field === 'returnQty'
          ? Math.max(0, parseInt(value) || 0)
          : sanitizedValue,
    };
  }

  // Validate return quantity doesn't exceed original quantity
  if (field === 'returnQty') {
    const returnQty = parseInt(value) || 0;
    const originalQty = parseInt(updatedItems[index].quantity) || 0;
    
    if (returnQty > originalQty) {
      setErrors((prev) => ({ 
        ...prev, 
        general: `⚠️ Return quantity (${returnQty}) cannot exceed original quantity (${originalQty}) for item "${updatedItems[index].name}"` 
      }));
      return;
    }
    
    // Clear error if validation passes
    if (errors.general && errors.general.includes('Return quantity')) {
      setErrors((prev) => ({ ...prev, general: '' }));
    }
  }

  setForm((prev) => ({ ...prev, items: updatedItems }));

  setErrors((prev) => {
    const newItemErrors = [...prev.items];
    newItemErrors[index] = {
      ...newItemErrors[index],
      [field]:
        field === 'name' && !sanitizedValue.trim() ? 'Item name is required' :
        field === 'itemCode' && !sanitizedValue.trim() ? 'Item code is required' :
        field === 'hsnCode' && !sanitizedValue.trim() ? 'HSN code is required' :
        field === 'quantity' && (parseInt(value) < 1 || isNaN(parseInt(value))) ? 'Quantity must be at least 1' :
        field === 'rate' && (parseFloat(value) < 0 || isNaN(parseFloat(value))) ? 'Rate must be non-negative' :
        field === 'returnQty' && (parseInt(value) < 0 || isNaN(parseInt(value))) ? 'Return quantity must be non-negative' : '',
    };
    return { ...prev, items: newItemErrors };
  });
  };

  const handleProductSelect = (index, product) => {

    const updatedItems = [...form.items];
    updatedItems[index] = {
      ...updatedItems[index],
      name: product.itemName || '',
      itemCode: product.itemCode || '',
      hsnCode: product.hsn || '',
      rate: product.unitPrice || 0,
    };
    setForm((prev) => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { name: '', itemCode: '', hsnCode: '', quantity: 1, rate: 0, returnQty: 0 }],
    }));
    setErrors((prev) => ({
      ...prev,
      items: [...prev.items, { name: '', itemCode: '', hsnCode: '', quantity: '', rate: '', returnQty: '' }],
    }));
  };

  const handleDeleteItem = (index) => {
    if (form.items.length === 1) {
      setErrors((prev) => ({ ...prev, general: 'At least one item is required.' }));
      return;
    }
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    setErrors((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
      general: '',
    }));
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter' && index === form.items.length - 1) {
      e.preventDefault();
      addItem();
    }
  };

  const validateForm = useCallback(() => {
    let isValid = true;
    const newErrors = {
      customerId: form.customerId.trim() ? '' : 'Customer ID is required',
      customerName: form.customerName.trim() ? '' : 'Customer name is required',
      customerAddress: form.customerAddress.trim() ? '' : 'Customer address is required',
      customerEmail: '',
      customerPhone: '',
      reason: form.reason ? '' : 'Reason is required',
      notes: notes.length <= 500 ? '' : 'Notes cannot exceed 500 characters',
      items: form.items.map((item) => ({
        name: item.name.trim() ? '' : 'Item name is required',
        itemCode: item.itemCode.trim() ? '' : 'Item code is required',
        hsnCode: item.hsnCode.trim() ? '' : 'HSN code is required',
        quantity: item.quantity >= 1 ? '' : 'Quantity must be at least 1',
        rate: item.rate >= 0 ? '' : 'Rate must be non-negative',
        returnQty: item.returnQty >= 0 ? '' : 'Return quantity must be non-negative',
      })),
      general: '',
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.customerEmail && !emailRegex.test(form.customerEmail)) {
      newErrors.customerEmail = 'Invalid email format';
      isValid = false;
    }

    const phoneRegex = /^\+?[\d\s-]{10,15}$/;
    if (form.customerPhone && !phoneRegex.test(form.customerPhone)) {
      newErrors.customerPhone = 'Invalid phone number';
      isValid = false;
    }

    form.items.forEach((item, index) => {
      if (!item.name.trim() || !item.itemCode.trim() || !item.hsnCode.trim() || item.quantity < 1 || item.rate < 0 || item.returnQty < 0) {
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [form, notes]);

  const getAmount = (item) => item.returnQty * item.rate;
  const subtotal = form.items.reduce((sum, item) => sum + getAmount(item), 0);
  
  // Use the returned amount from form, or calculate from subtotal if not set
  const returnedAmount = parseFloat(form.returnedAmount) || subtotal;
  const total = returnedAmount;
  const rounded = Math.round(total);
  const roundOff = rounded - total;

  const saveNote = async () => {
    if (!validateForm()) {
      setErrors((prev) => ({ ...prev, general: 'Please correct the form errors before saving.' }));
      return;
    }
    setLoading(true);
    try {
      let customerId = form.customerId;
      if (!customerId) {
        customerId = await createNewCustomer(form.customerName);
        if (!customerId) {
          throw new Error('Failed to create customer');
        }
        setForm((prev) => ({ ...prev, customerId }));
      }

      const noteData = {
        customerId: form.customerId.trim(),
        customerName: form.customerName.trim(),
        customerAddress: form.customerAddress.trim(),
        customerEmail: form.customerEmail.trim(),
        customerPhone: form.customerPhone.trim(),
        reason: form.reason,
        notes: notes.trim(),
        items: form.items.map((item) => ({
          name: item.name.trim(),
          itemCode: item.itemCode.trim(),
          hsnCode: item.hsnCode.trim(),
          qty: item.quantity,
          rate: item.rate,
          returnQty: item.returnQty,
        })),
        taxType,
        subtotal,
        returnedAmount: parseFloat(form.returnedAmount) || subtotal,
        total,
        rounded,
        roundOff,
        isCancelled,
        invoiceNumber: creditNoteNumber,
        company: form.company,
        createdBy: userEmail,
        lastUpdatedBy: userEmail,
      };

      let response;
      if (id) {
        response = await api.put(`/creditnotes/${id}`, noteData);
      } else {
        response = await api.post('/creditnotes', noteData);
      }
      setCreditNoteNumber(response.data.invoiceNumber || creditNoteNumber);
      await fetchAllCreditNotes();
      showNotification('Credit Note Created', `Credit Note ${creditNoteNumber} saved successfully.`);
      resetForm();
    } catch (error) {
      console.error('Failed to save credit note:', error);
      setErrors((prev) => ({ ...prev, general: error.response?.data?.message || 'Failed to save credit note.' }));
    } finally {
      setLoading(false);
    }
  };

  const requestEditPermission = async () => {
    if (!pendingEditNote) return false;
    
    try {
      setLoading(true);
      const response = await api.post('/notifications/request-permission', {
        type: 'edit_request',
        billType: 'creditnote',
        billId: pendingEditNote.id || pendingEditNote._id,
        billData: pendingEditNote,
        requestedBy: userEmail,
        requestedByRole: userRole,
        reason: 'Staff requested permission to edit credit note',
        status: 'pending'
      });

      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: `Edit request sent to admin for credit note ${pendingEditNote.invoiceNumber}. You will be notified once approved.` 
        });
        return true;
      } else {
        setMessage({ 
          type: 'error', 
          text: response.data.message || 'Failed to send edit request' 
        });
        return false;
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: `Error: ${error.response?.data?.message || error.message}` 
      });
      return false;
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const requestDeletePermission = async () => {
    if (!pendingEditNote) return false;
    
    try {
      setLoading(true);
      const response = await api.post('/notifications/request-permission', {
        type: 'delete_request',
        billType: 'creditnote',
        billId: pendingEditNote.id || pendingEditNote._id,
        billData: pendingEditNote,
        requestedBy: userEmail,
        requestedByRole: userRole,
        reason: 'Staff requested permission to delete credit note',
        status: 'pending'
      });

      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: `Delete request sent to admin for credit note ${pendingEditNote.invoiceNumber}. You will be notified once approved.` 
        });
        return true;
      } else {
        setMessage({ 
          type: 'error', 
          text: response.data.message || 'Failed to send delete request' 
        });
        return false;
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: `Error: ${error.response?.data?.message || error.message}` 
      });
      return false;
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const editCreditNote = async (noteId) => {
    const note = savedCreditNotes.find((n) => n.id === noteId || n._id === noteId);
    if (note) {
      if (editPermissions[note.id || note._id]) {
        // User has permission, proceed with edit
        navigate(`/creditnote/${noteId}`, { state: { selectedCompany } });
      } else {
        // User doesn't have permission, request it
        setPendingEditNote(note);
        setShowPermissionModal(true);
      }
    }
  };

  const deleteCreditNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this credit note?')) return;
    
    const note = savedCreditNotes.find((n) => n.id === noteId || n._id === noteId);
    if (note) {
      if (editPermissions[note.id || note._id]) {
        // User has permission, proceed with delete
        setLoading(true);
        try {
          await api.delete(`/creditnotes/${noteId}`);
          await fetchAllCreditNotes();
          setMessage({ type: 'success', text: 'Credit note deleted successfully!' });
          setTimeout(() => setMessage(null), 3000);
        } catch (error) {
          console.error('Error deleting credit note:', error);
          setErrors((prev) => ({ ...prev, general: error.response?.data?.message || 'Failed to delete credit note.' }));
        } finally {
          setLoading(false);
        }
      } else {
        // User doesn't have permission, request it
        setPendingEditNote(note);
        await requestDeletePermission();
      }
    }
  };

  const handlePermissionResponse = (approved) => {
    if (approved && pendingEditNote) {
      setEditPermissions((prev) => ({ ...prev, [pendingEditNote._id]: true }));
      editCreditNote(pendingEditNote._id);
    } else {
      setMessage({ type: 'error', text: 'Permission denied' });
    }
    setShowPermissionModal(false);
    setPendingEditNote(null);
  };

  const downloadPDF = useCallback(async () => {
    if (!form.items.length) {
      setMessage({ type: 'error', text: 'Add at least one item' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (!validateForm()) return;

    // Store current form state for debugging
    const currentFormState = JSON.parse(JSON.stringify(form));
    console.log('Form state before PDF generation:', currentFormState);

    setLoading(true);
    
    try {
      // Prepare credit note data without saving
      const creditNoteData = {
        ...form,
        invoiceNumber: creditNoteNumber,
        date: form.date || new Date().toISOString().slice(0, 10),
        totals: {
          subtotal: subtotal,
          returnedAmount: parseFloat(form.returnedAmount) || subtotal,
          roundOff: roundOff,
          grandTotal: rounded
        },
        company: {
          name: selectedCompany,
          address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
          mobile: '8547014116',
          email: 'wyenfos@gmail.com',
          website: 'www.wyenfos.com',
          gstin: 'WYENFOS-GST123456789',
          state: 'Kerala (Code: KL)'
        }
      };
      
      console.log('Credit note data being sent to PDF generation:', creditNoteData);
      
      const pdfResponse = await Promise.race([
        api.post('/creditnotes/generate-pdf-unsaved', { creditNoteData }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PDF generation timed out')), 30000)
        )
      ]);
      
      const pdfBase64 = pdfResponse.data.data.pdf;
      
      // Download the PDF
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${pdfBase64}`;
      link.download = `CreditNote_${form.invoiceNumber || 'Draft'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Check if form state changed after PDF generation
      console.log('Form state after PDF generation:', form);
      if (JSON.stringify(form) !== JSON.stringify(currentFormState)) {
        console.warn('Form state changed during PDF generation!');
      }
      
      setMessage({ type: 'success', text: 'PDF downloaded successfully!' });
    } catch (error) {
      console.error('Failed to download PDF:', error);
      setMessage({
        type: 'error',
        text: `Failed to download PDF: ${error.message}`,
      });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  }, [form, selectedCompany, validateForm, subtotal, roundOff, rounded, creditNoteNumber]);

  const printNote = useCallback(async () => {

    try {
      if (!form.items.length) {
        setMessage({ type: 'error', text: 'Add at least one item' });
        setTimeout(() => setMessage(null), 3000);
        return;
      }
      if (!validateForm()) return;

      // Store current form state for debugging
      const currentFormState = JSON.parse(JSON.stringify(form));
      console.log('Form state before print generation:', currentFormState);

      setLoading(true);
      
      // Prepare credit note data without saving
      const creditNoteData = {
        ...form,
        invoiceNumber: creditNoteNumber,
        date: form.date || new Date().toISOString().slice(0, 10),
        totals: {
          subtotal: subtotal,
          returnedAmount: parseFloat(form.returnedAmount) || subtotal,
          roundOff: roundOff,
          grandTotal: rounded
        },
        company: {
          name: selectedCompany,
          address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
          mobile: '8547014116',
          email: 'wyenfos@gmail.com',
          website: 'www.wyenfos.com',
          gstin: 'WYENFOS-GST123456789',
          state: 'Kerala (Code: KL)'
        }
      };
      
      console.log('Credit note data being sent to print generation:', creditNoteData);
      
      const pdfResponse = await Promise.race([
        api.post('/creditnotes/generate-pdf-unsaved', { creditNoteData }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PDF generation timed out')), 30000)
        )
      ]);
      
      const pdfBase64 = pdfResponse.data.data.pdf;
      

      // Convert base64 to blob and create URL
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });
      const pdfBlobUrl = URL.createObjectURL(pdfBlob);
      
      // Open PDF in new tab
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
      
      // Check if form state changed after print generation
      console.log('Form state after print generation:', form);
      if (JSON.stringify(form) !== JSON.stringify(currentFormState)) {
        console.warn('Form state changed during print generation!');
      }
      
      setMessage({ type: 'success', text: 'Print dialog opened!' });
    } catch (error) {
      console.error('Print error:', error);
      setMessage({
        type: 'error',
        text: `Failed to generate print view: ${error.message}`,
      });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  }, [form, selectedCompany, validateForm, subtotal, roundOff, rounded, creditNoteNumber]);

  const sendEmail = async () => {
    if (!validateForm()) {
      setErrors((prev) => ({ ...prev, general: 'Please correct the form errors before sending email.' }));
      return;
    }
    if (!form.customerEmail) {
      setErrors((prev) => ({ ...prev, customerEmail: 'Please provide a customer email address.', general: 'Email address is required.' }));
      return;
    }
    setLoading(true);
    try {
      // Prepare credit note data without saving
      const creditNoteData = {
        ...form,
        invoiceNumber: creditNoteNumber,
        date: form.date || new Date().toISOString().slice(0, 10),
        totals: {
          subtotal: subtotal,
          returnedAmount: parseFloat(form.returnedAmount) || subtotal,
          roundOff: roundOff,
          grandTotal: rounded
        },
        company: {
          name: selectedCompany,
          address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
          mobile: '8547014116',
          email: 'wyenfos@gmail.com',
          website: 'www.wyenfos.com',
          gstin: 'WYENFOS-GST123456789',
          state: 'Kerala (Code: KL)'
        }
      };

      // Generate PDF using server
      const pdfResponse = await Promise.race([
        api.post('/creditnotes/generate-pdf-unsaved', { creditNoteData }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PDF generation timed out')), 30000)
        )
      ]);
      
      const pdfBase64 = pdfResponse.data.data.pdf;

      // Send email with the generated PDF
      await api.post('/creditnotes/send-email', {
        emailTo: form.customerEmail,
        subject: `Credit Note ${creditNoteNumber} - ${selectedCompany}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #b39eb5; border-bottom: 2px solid #b39eb5; padding-bottom: 10px;">
              Credit Note from ${selectedCompany}
            </h2>
            
            <p>Dear ${form.customerName},</p>
            
            <p>Please find attached your credit note for the returned items.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Credit Note Details:</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li><strong>Credit Note Number:</strong> ${creditNoteNumber}</li>
                <li><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</li>
                <li><strong>Customer ID:</strong> ${form.customerId}</li>
                <li><strong>Customer Name:</strong> ${form.customerName}</li>
                <li><strong>Total Amount:</strong> ₹${rounded.toFixed(2)}</li>
                <li><strong>Status:</strong> ${isCancelled ? 'Cancelled' : 'Active'}</li>
              </ul>
            </div>
            
            <p><strong>Important Notes:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>This credit note can be adjusted against future invoices</li>
              <li>Please contact us within 7 days for any discrepancies</li>
              <li>Refund or adjustment will be processed as per agreed terms</li>
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
        pdfBase64,
      });
      setMessage({ type: 'success', text: 'Credit note emailed successfully!' });
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('Error sending email:', error);
      setErrors((prev) => ({ ...prev, general: error.response?.data?.message || 'Failed to send email.' }));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      customerId: '',
      customerName: '',
      customerAddress: '',
      customerEmail: '',
      customerPhone: '',
      reason: '',
      date: new Date().toISOString().slice(0, 10),
      items: [{ name: '', itemCode: '', hsnCode: '', quantity: 1, rate: 0, returnQty: 0 }],
      paymentMode: 'Cash',
      company: {
        name: selectedCompany,
        address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
        GSTIN: '32AAFCW8945G1ZQ',
        state: 'Kerala',
        stateCode: '32',
      },
      createdBy: userEmail,
      lastUpdatedBy: userEmail,
    });
    setNotes('');
    setIsCancelled(false);
    setTaxType('cgst_sgst');
    setErrors({
      customerId: '',
      customerName: '',
      customerAddress: '',
      customerEmail: '',
      customerPhone: '',
      reason: '',
      notes: '',
      items: [{ name: '', itemCode: '', hsnCode: '', quantity: '', rate: '', returnQty: '' }],
      general: '',
    });
    if (!id) {
      // Always start from 1 for new credit notes
      setCreditNoteNumber(`${getCompanyPrefix(selectedCompany)}-1`);
    }
  };

  const loadAllItems = () => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => ({
        ...item,
        returnQty: item.quantity, // Set return quantity to original quantity
      })),
    }));
    setErrors((prev) => ({ 
      ...prev, 
      general: `✅ All return quantities reset to original quantities. You can adjust individual quantities as needed.` 
    }));
  };

  const handleBillSearch = async () => {
    if (!billType || !invoiceId) {
      setErrors((prev) => ({ ...prev, general: 'Please select bill type and enter bill number.' }));
      return;
    }

    setLoading(true);
    setErrors((prev) => ({ ...prev, general: '' }));
    
    try {
  
      const res = await api.get(`/creditnotes/find-bill/${invoiceId}?billType=${billType}&date=${searchDate}`);
      const bill = res.data.data; // The new API returns { success: true, data: bill }
      
      console.log('Loaded bill data:', bill);
      console.log('Bill items:', bill?.items);
      if (bill?.items && bill.items.length > 0) {
        console.log('First item structure:', bill.items[0]);
        console.log('Available fields in first item:', Object.keys(bill.items[0]));
      }
      
      if (!bill) {
        setErrors((prev) => ({ 
          ...prev, 
          general: `❌ No ${billType} found with bill number "${invoiceId}". Please verify the bill number and try again.` 
        }));
        return;
      }

      

      // Validate that the bill has items
      if (!bill.items || bill.items.length === 0) {
        setErrors((prev) => ({ 
          ...prev, 
          general: `⚠️ ${billType} ${invoiceId} found but contains no items. Cannot create credit note for empty bill.` 
        }));
        return;
      }

      // Populate form with bill data
      setForm((prev) => ({
        ...prev,
        customerName: bill.customerName || bill.customer?.customerName || '',
        customerId: bill.customerId || bill.customer?.customerId || '',
        customerAddress: bill.customerAddress || bill.customer?.customerAddress || '',
        customerEmail: bill.customerEmail || bill.customer?.customerEmail || '',
        customerPhone: bill.customerPhone || bill.customer?.customerPhone || '',
        items: bill.items.map((item, index) => {
          const mappedItem = {
            name: item.name || item.description || item.productName || item.itemName || item.product?.name || item.productName || `Item ${index + 1}`,
            itemCode: item.itemCode || item.code || item.productCode || item.product?.itemCode || '',
            hsnCode: item.hsnCode || item.hsnSac || item.hsn || item.product?.hsn || '',
            quantity: parseFloat(item.quantity || item.qty || 1),
            rate: parseFloat(item.rate || item.price || 0),
            returnQty: parseFloat(item.quantity || item.qty || 1), // Default to original quantity
          };
          console.log(`Mapped item ${index + 1}:`, mappedItem);
          console.log(`Original item ${index + 1} data:`, item);
          return mappedItem;
        }),
        paymentMode: bill.paymentMode || bill.paymentTerms || 'Cash',
        returnedAmount: (bill.totals?.grandTotal || bill.grandTotal || subtotal).toString(),
      }));
      
      // Show success message with item count
      const itemCount = bill.items.length;
      setErrors((prev) => ({ 
        ...prev, 
        general: `✅ Successfully loaded ${billType} ${invoiceId} with ${itemCount} item${itemCount > 1 ? 's' : ''}. Return quantities are set to original quantities by default. You can adjust them as needed.` 
      }));

      // Auto-focus on the first item's return quantity field
      setTimeout(() => {
        const firstReturnQtyInput = document.querySelector('input[name="returnQty"]');
        if (firstReturnQtyInput) {
          firstReturnQtyInput.focus();
        }
      }, 100);

    } catch (err) {
      console.error('Error searching for bill:', err);
      let errorMessage = `Failed to find ${billType} with bill number ${invoiceId}.`;
      
      if (err.response?.status === 404) {
        errorMessage = `❌ ${billType} with bill number "${invoiceId}" not found. Please check the bill number and try again.`;
      } else if (err.response?.status === 500) {
        errorMessage = `❌ Server error while searching for ${billType}. Please try again later.`;
      } else if (err.code === 'NETWORK_ERROR') {
        errorMessage = `❌ Network error. Please check your connection and try again.`;
      }
      
      setErrors((prev) => ({ ...prev, general: errorMessage }));
    } finally {
      setLoading(false);
    }
  };

  // Monitor form state changes for debugging
  useEffect(() => {
    console.log('Form state changed:', {
      customerName: form.customerName,
      itemsCount: form.items.length,
      hasItems: form.items.some(item => item.name || item.itemCode)
    });
  }, [form]);

  return (
    <div className="creditnote-page-wrapper">
      <div className="watermark"></div>
      {isCancelled && (
        <div className="notecancelled-watermark">
          <img src={cancelledWatermark} alt="Cancelled Watermark" />
        </div>
      )}
      <div className="creditnote-content-container" ref={noteRef}>
        <div className="note-header">
          <CompanyHeader 
            selectedCompany={{
              ...getCompanyDetails(selectedCompany),
              prefix: getCompanyPrefix(selectedCompany)
            }}
            billType="CREDIT_NOTE"
            billDetails={{
              invoiceNumber: creditNoteNumber,
              date: new Date().toISOString().slice(0, 10),
              isCancelled: isCancelled
            }}
            showBankDetails={false}
          />
        </div>
        <hr className="invoice-divider" />
        {errors.general && <div className="error message">{errors.general}</div>}
        {message && (
          <div className={`message ${message.type === 'success' ? 'success' : 'error'}`}>
            {message.text}
          </div>
        )}
        
        {showPermissionModal && pendingEditNote && (
          <div className="modal">
            <div className="modal-content">
              <h3>Edit Permission Request</h3>
              <p>Approve editing credit note {pendingEditNote.invoiceNumber}?</p>
              <div className="modal-buttons">
                <button type="button" onClick={() => handlePermissionResponse(true)}>
                  Approve
                </button>
                <button type="button" onClick={() => handlePermissionResponse(false)}>
                  Deny
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Customer Search Section */}
        <div className="customer-search-section">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search customers by ID, name, phone, or email"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="customer-search-input"
              disabled={isCancelled || loading}
            />
            <button
              type="button"
              className="search-button no-print"
              onClick={() => {
                if (customerSearch.trim()) {
                  handleCustomerSearch(customerSearch);
                }
              }}
              disabled={isCancelled || loading || isCustomerLoading}
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
              disabled={loading}
            >
              Create New Customer: {customerSearch}
            </button>
          )}
        </div>

        <div className="section-title">Customer Information</div>
        <div className="customer-details">
          <div className="customer-form">
            <div className="credit-bill-input-group">
              <label>Customer Name:</label>
              <input
                value={form.customerName}
                onChange={handleCustomerChange}
                name="customerName"
                list="customer-options"
                placeholder="Customer Name"
                className={`credit-bill-input ${errors.customerName ? 'error-field' : ''}`}
                disabled={isCancelled || loading || isCustomerLoading}
                aria-required="true"
                onSelect={(e) => {
                  const selectedCustomer = customers.find((c) => c.customerName === e.target.value);
                  if (selectedCustomer) {
                    selectCustomer(selectedCustomer);
                  }
                }}
              />
              <datalist id="customer-options">
                {customers.map((c, index) => (
                  <option key={c._id || c.customerId || `customer-${index}`} value={c.customerName} />
                ))}
              </datalist>
              {form.customerId && (
                <div className="customer-id-display">
                  Customer ID: {form.customerId}
                </div>
              )}
              {isCustomerLoading && <div className="loading-message">Loading customers...</div>}
              {errors.customerName && <div className="error-message">{errors.customerName}</div>}
            </div>
            <div className="credit-bill-input-group">
              <label>Customer ID:</label>
              <input
                type="text"
                name="customerId"
                value={form.customerId || ''}
                onChange={handleCustomerChange}
                placeholder="Customer ID"
                className={`credit-bill-input ${errors.customerId ? 'error-border' : ''}`}
                disabled={isCancelled || loading}
              />
              {errors.customerId && <div className="error">{errors.customerId}</div>}
            </div>
            <div className="credit-bill-input-group">
              <label>Date:</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleCustomerChange}
                className={`credit-bill-input ${errors.date ? 'error-border' : ''}`}
                disabled={isCancelled || loading}
              />
              {errors.date && <div className="error">{errors.date}</div>}
            </div>
            <div className="credit-bill-input-group">
              <label>Address:</label>
              <input
                type="text"
                name="customerAddress"
                value={form.customerAddress}
                onChange={handleCustomerChange}
                placeholder="Address"
                className={`credit-bill-input ${errors.customerAddress ? 'error-border' : ''}`}
                disabled={isCancelled || loading}
                aria-required="true"
              />
              {errors.customerAddress && <div className="error">{errors.customerAddress}</div>}
            </div>
            <div className="credit-bill-input-group">
              <label>Email:</label>
              <input
                type="email"
                name="customerEmail"
                value={form.customerEmail}
                onChange={handleCustomerChange}
                placeholder="Enter email"
                className={`credit-bill-input ${errors.customerEmail ? 'error-border' : ''}`}
                disabled={isCancelled || loading}
              />
              {errors.customerEmail && <div className="error">{errors.customerEmail}</div>}
            </div>
            <div className="credit-bill-input-group">
              <label>Phone:</label>
              <input
                name="customerPhone"
                value={form.customerPhone}
                onChange={handleCustomerChange}
                placeholder="Enter phone number"
                className={`credit-bill-input ${errors.customerPhone ? 'error-border' : ''}`}
                disabled={isCancelled || loading}
              />
              {errors.customerPhone && <div className="error">{errors.customerPhone}</div>}
            </div>
            <div className="credit-bill-input-group">
              <label>Reason:</label>
              <select
                name="reason"
                value={form.reason}
                onChange={handleCustomerChange}
                className={`credit-bill-input ${errors.reason ? 'error-border' : ''}`}
                disabled={isCancelled || loading}
                aria-required="true"
              >
                <option key="select-reason" value="">Select Reason</option>
                <option key="damaged-product" value="Damaged Product">Damaged Product</option>
                <option key="wrong-item" value="Wrong Item Delivered">Wrong Item Delivered</option>
                <option key="not-satisfied" value="Customer Not Satisfied">Customer Not Satisfied</option>
                <option key="overcharged" value="Overcharged">Overcharged</option>
                <option key="expired-product" value="Expired Product">Expired Product</option>
                <option key="quality-issues" value="Quality Issues">Quality Issues</option>
                <option key="other" value="Other">Other</option>
              </select>
              {errors.reason && <div className="error">{errors.reason}</div>}
            </div>
          </div>
        </div>
        
        <div className="section-title">Find Original Bill (Required for Credit Note)</div>
        <div className="bill-search-section">
          <div className="bill-search-grid">
            <div className="credit-bill-input-group">
              <label>Bill Type *</label>
              <select 
                value={billType} 
                onChange={(e) => setBillType(e.target.value)} 
                className={`credit-bill-input ${!billType ? 'error-border' : ''}`}
                disabled={isCancelled || loading}
              >
                <option key="select-bill-type" value="">Select Bill Type</option>
                <option key="cashbill" value="cashbill">Cash Bill</option>
                <option key="creditbill" value="creditbill">Credit Bill</option>
              </select>
              {!billType && <div className="error">Please select the original bill type</div>}
            </div>
            <div className="credit-bill-input-group">
              <label>Bill Date</label>
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="credit-bill-input"
                disabled={isCancelled || loading}
              />
            </div>
            <div className="credit-bill-input-group">
              <label>Bill Number *</label>
              <input
                type="text"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                placeholder="Enter original bill number (e.g., ALH-1, WGD-5)"
                className={`credit-bill-input ${!invoiceId ? 'error-border' : ''}`}
                disabled={isCancelled || loading}
              />
              {!invoiceId && <div className="error">Please enter the original bill number</div>}
            </div>
            <div className="credit-bill-input-group">
              <button 
                className="search-button no-print" 
                onClick={handleBillSearch} 
                disabled={isCancelled || loading || !billType || !invoiceId}
              >
                {loading ? 'Searching...' : 'Find Original Bill'}
              </button>
            </div>
          </div>
          <div className="bill-search-info">
            <p><strong>Note:</strong> To create a credit note, you must first find the original bill (Cash Bill or Credit Bill) that contains the items being returned.</p>
            <p><strong>Tip:</strong> After finding the bill, you can adjust the return quantities for each item. The system will automatically populate all item details from the original bill.</p>
            {form.items.length > 0 && form.items[0].name && (
              <div style={{ marginTop: '10px' }}>
                <button 
                  type="button"
                  className="search-button no-print"
                  onClick={loadAllItems}
                  style={{ backgroundColor: '#28a745', marginRight: '10px' }}
                >
                  📦 Load All Items (Full Return)
                </button>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  Click to set return quantity equal to original quantity for all items
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="tax-options">
          <label>
            <input
              type="checkbox"
              checked={isCancelled}
              onChange={(e) => setIsCancelled(e.target.checked)}
              disabled={id && isCancelled}
            />
            Mark as Cancelled
          </label>
        </div>
        {form.items.length > 0 && form.items[0].name && (
          <div style={{ 
            marginBottom: '10px', 
            padding: '8px 12px', 
            backgroundColor: '#e8f5e8', 
            border: '1px solid #28a745', 
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            📋 <strong>Items loaded from {billType} {invoiceId}</strong> - Adjust return quantities as needed
          </div>
        )}
        <table className="item-table">
          <thead>
            <tr key="item-table-header">
              <th>#</th>
              <th>Item Code</th>
              <th>HSN Code</th>
              <th>Description</th>
              <th>Original Qty</th>
              <th>Rate</th>
              <th>Return Qty</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {form.items.map((item, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>
                  <input
                    value={item.itemCode}
                    onChange={(e) => handleItemChange(index, 'itemCode', e.target.value)}
                    placeholder="Item code"
                    disabled={isCancelled || loading}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                  />
                  {errors.items[index]?.itemCode && <div key={`itemCode-error-${index}`} className="error">{errors.items[index].itemCode}</div>}
                </td>
                <td>
                  <input
                    value={item.hsnCode}
                    onChange={(e) => handleItemChange(index, 'hsnCode', e.target.value)}
                    placeholder="HSN code"
                    disabled={isCancelled || loading}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                  />
                  {errors.items[index]?.hsnCode && <div key={`hsnCode-error-${index}`} className="error">{errors.items[index].hsnCode}</div>}
                </td>
                <td>
                  <ProductSelector
                    value={item.name}
                    onChange={(value) => handleItemChange(index, 'name', value)}
                    onProductSelect={(product) => handleProductSelect(index, product)}
                    placeholder="Search products..."
                    disabled={isCancelled || loading}
                    showEditMode={true}
                    showFieldEditors={true}
                  />
                  {errors.items[index]?.name && <div key={`name-error-${index}`} className="error">{errors.items[index].name}</div>}
                </td>
                <td>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    min="1"
                    disabled={isCancelled || loading}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                  />
                  {errors.items[index]?.quantity && <div key={`quantity-error-${index}`} className="error">{errors.items[index].quantity}</div>}
                </td>
                <td>
                  <input
                    type="number"
                    value={item.rate}
                    onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                    min="0"
                    step="0.01"
                    disabled={isCancelled || loading}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                  />
                  {errors.items[index]?.rate && <div key={`rate-error-${index}`} className="error">{errors.items[index].rate}</div>}
                </td>
                <td>
                  <input
                    type="number"
                    value={item.returnQty}
                    onChange={(e) => handleItemChange(index, 'returnQty', e.target.value)}
                    min="0"
                    disabled={isCancelled || loading}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                  />
                  {errors.items[index]?.returnQty && <div key={`returnQty-error-${index}`} className="error">{errors.items[index].returnQty}</div>}
                </td>
                <td>₹{getAmount(item).toFixed(2)}</td>
                <td>
                  <button
                    className="creditnote-delete-btn"
                    onClick={() => handleDeleteItem(index)}
                    disabled={isCancelled || loading}
                  >
               🗑️               
                 </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          className="creditnote-add-item-btn"
          onClick={addItem}
          disabled={isCancelled || loading}
        >
          Add Item
        </button>
        <div className="notes-group">
          <label>Notes:</label>
          <textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Enter additional notes"
            rows="4"
            disabled={isCancelled || loading}
            aria-label="Additional notes"
          />
          {errors.notes && <div className="error">{errors.notes}</div>}
        </div>
        <div className="totals">
          <div className="amount-details">
            <div className="amount-row">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="amount-row">
              <span>Returned Amount:</span>
              <input
                type="number"
                name="returnedAmount"
                value={form.returnedAmount || ''}
                onChange={handleCustomerChange}
                placeholder="Enter returned amount"
                className="returned-amount-input"
                disabled={isCancelled || loading}
                step="0.01"
                min="0"
                max={subtotal * 2}
              />
            </div>
            <div className="amount-row">
              <span>Round Off:</span>
              <span>₹{roundOff.toFixed(2)}</span>
            </div>
            <div className="total-amount">
              <span>Total:</span>
              <span>₹{rounded.toFixed(2)}</span>
            </div>
            {isCancelled && (
              <div className="amount-row">
                <span>Status:</span>
                <span>Cancelled</span>
              </div>
            )}
          </div>
        </div>
        <div className="futerr">
          <div className="futer-content">
            <div className="left-section">
              <div className="terms-section">
                <h4>Terms & Conditions</h4>
                <div className="terms-content">
                  <p>
                    1. This credit note is issued as per agreed terms.<br />
                    2. Refund or adjustment to be processed within 7 days.<br />
                    3. Contact us for any discrepancies.
                  </p>
                </div>
              </div>
              
              <div className="bank-details-section">
                <h4>Bank Details</h4>
                <div className="bank-container">
                  <div className="bank-contentcashbill">
                    <p><strong>Company name:</strong> {selectedCompany}</p>
                    <p><strong>Account number:</strong> 10192468394</p>
                    <p><strong>IFSC:</strong> IDFB0080732</p>
                    <p><strong>SWIFT code:</strong> IDFBINBBMUM</p>
                    <p><strong>Bank name:</strong> IDFC FIRST</p>
                    <p><strong>Branch:</strong> THRISSUR - EAST FORT THRISSUR BRANCH</p>
                  </div>
                  <div className="qr-code-section">
                    <div className="qr-code-container">
                      <QRCodeCanvas 
                        value={`Company: ${selectedCompany}\nAccount: 10192468394\nIFSC: IDFB0080732\nBank: IDFC FIRST\nBranch: THRISSUR - EAST FORT THRISSUR BRANCH`}
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

          <div className="signaturee">
            <strong>Authorized Signatory</strong><br />
            <strong>{selectedCompany || ''}</strong>
          </div>
        </div>
        <div className="creditnote-button-group no-print">
          <button
            className="creditnote-save-btn no-print"
            onClick={saveNote}
            disabled={loading }
          >
            Save
          </button>
          <button
            className="creditnote-download-btn no-print"
            onClick={downloadPDF}
            disabled={loading}
          >
            <i className="fa-solid fa-file-pdf"></i>
          </button>
          <button
            className="creditnote-print-btn no-print"
            onClick={printNote}
            disabled={loading}
          >
            🖨️ Print
          </button>
          <button
            className="creditnote-email-btn no-print"
            onClick={sendEmail}
            disabled={loading || !form.customerEmail}
          >
            📧 Email
          </button>
          <button
            className="creditnote-back-btn no-print"
            onClick={() => navigate(-1)}
            disabled={loading}
          >
            <i className="fa-solid fa-backward"></i>
          </button>
        </div>
        <div className="saved-creditnotes-section">
          <h3>Saved Credit Notes</h3>
          <table className="saved-creditnotes-table">
            <thead>
              <tr key="saved-notes-table-header">
                <th>Note No</th>
                <th>Customer Name</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {savedCreditNotes.map((note, index) => (
                <tr key={note._id || note.id || `note-${index}`}>
                  <td>{note.invoiceNumber}</td>
                  <td>{note.customerName}</td>
                  <td>{new Date(note.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>₹{note.rounded.toFixed(2)}</td>
                  <td>{note.isCancelled ? 'Cancelled' : 'Active'}</td>
                  <td>
                    {editPermissions[note._id] ? (
                      <button
                        className="action-btn no-print"
                        onClick={() => editCreditNote(note._id)}
                        disabled={loading}
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                    ) : (
                      <button
                        className="action-btn request-edit no-print"
                        onClick={() => { setPendingEditNote(note); requestEditPermission(); }}
                        disabled={loading}
                      >
                        Request Edit
                      </button>
                    )}
                    {editPermissions[note._id] ? (
                      <button
                        className="action-btn delete no-print"
                        onClick={() => deleteCreditNote(note._id)}
                        disabled={loading}
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    ) : (
                      <button
                        className="action-btn request-delete no-print"
                        onClick={() => { setPendingEditNote(note); requestDeletePermission(); }}
                        disabled={loading}
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
    </div>
  )
};

export default CreditNote;