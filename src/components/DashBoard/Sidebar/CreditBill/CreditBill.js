import React, { useState, useEffect, useCallback, useMemo, useReducer, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import CompanyHeader from '../CompanyHeader/CompanyHeader.js';
import ProductSelector from '../../../Product/ProductSelector.js';
import cancelledWatermark from '../../../../assets/images/cancelled.png';
import './CreditBill.css';
import DOMPurify from 'dompurify';
import { v4 as uuidv4 } from 'uuid';
import debounce from 'lodash.debounce';
import { getCompanyDetails } from '../utils/companyHelpers.js';

const userEmail = localStorage.getItem('userEmail') || 'unknown@example.com';
const userRole = localStorage.getItem('userRole') || 'staff';

const companyPrefixes = {
  'WYENFOS INFOTECH': 'WIT',
  'WYENFOS GOLD AND DIAMONDS': 'WGD',
  'WYENFOS ADS': 'WAD',
  'WYENFOS CASH VAPASE': 'WCV',
  'AYUR FOR HERBALS INDIA': 'ALH',
  'WYENFOS': 'WNF',
  'WYENFOS PURE DROPS': 'WPD',
};

const validCompanies = [
  'WYENFOS INFOTECH',
  'WYENFOS GOLD AND DIAMONDS',
  'WYENFOS ADS',
  'WYENFOS CASH VAPASE',
  'AYUR FOR HERBALS INDIA',
  'WYENFOS',
  'WYENFOS PURE DROPS',
];

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

const ErrorBoundary = ({ children }) => {
  const [error, setError] = useState(null);

  const handleReset = () => setError(null);

  if (error) {
    return (
      <div className="error-boundary">
        <h2>Something went wrong</h2>
        <p>{error.message}</p>
        <button onClick={handleReset}>Try again</button>
      </div>
    );
  }

  return children;
};

const formReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return { ...state, [action.field]: action.value };
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map((item, i) =>
          i === action.index ? { ...item, [action.field]: action.value } : item
        ),
      };
    case 'UPDATE_DUE_DATE':
      return {
        ...state,
        dueDates: state.dueDates.map((due, i) =>
          i === action.index ? { ...due, [action.field]: action.value } : due
        ),
      };
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.newItem] };
    case 'ADD_DUE_DATE':
      return { ...state, dueDates: [...state.dueDates, action.newDueDate] };
    case 'SET_FORM':
      return { ...action.form };
    default:
      return state;
  }
};

const CreditBill = () => {
  const { state: locationState } = useLocation();
  // Handle company selection from location state
  let selectedCompanyFromState = 'WYENFOS';
  
  if (locationState?.selectedCompany) {
    // If selectedCompany is an object, extract the name
    if (typeof locationState.selectedCompany === 'object' && locationState.selectedCompany.name) {
      selectedCompanyFromState = locationState.selectedCompany.name;
    } else if (typeof locationState.selectedCompany === 'string') {
      selectedCompanyFromState = locationState.selectedCompany;
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [savedBills, setSavedBills] = useState([]);
  const [editPermissions, setEditPermissions] = useState({});
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingDueDateIndex, setEditingDueDateIndex] = useState(null);
  const [currentBillId, setCurrentBillId] = useState(null);
  const [pendingEditBill, setPendingEditBill] = useState(null);
  const [products, setProducts] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const [isCustomerLoading, setIsCustomerLoading] = useState(false);

  const sanitizeInput = useCallback((input) => DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }), []);

  const selectedCompanyDetails = useMemo(() => {
    return getCompanyDetails(selectedCompanyFromState);
  }, [selectedCompanyFromState]);

  const initialFormState = useMemo(
    () => ({
      customerId: '',
      customerName: '',
      customerAddress: 'N/A',
      customerPhone: '',
      customerEmail: '',
      customerGSTIN: '',
      customerContact: {},
      invoiceNo: '',
      date: new Date().toISOString().slice(0, 10),
      dueDates: [
        { id: uuidv4(), date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().slice(0, 10), reminder: false },
      ],
      items: [
        {
          id: uuidv4(),
          code: '',
          description: '',
          hsnSac: '',
          quantity: '1',
          unit: '',
          rate: '',
          gstRate: '18',
          cgstRate: '0',
          cgstAmount: '0',
          sgstRate: '0',
          sgstAmount: '0',
          igstRate: '0',
          igstAmount: '0',
          taxableValue: '0',
          total: '0',
          amountToPay: '0',
          balanceAmount: '0',
        },
      ],
      paymentTerms: 'Cash',
      isOtherState: false,
      applyRoundOff: false,
      cancelled: false,
      remarks: '',
      company: {
        name: selectedCompanyDetails.name || selectedCompanyFromState,
        address: selectedCompanyDetails.address || 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
        GSTIN: selectedCompanyDetails.GSTIN || '32AAECW1234B1Z0',
        state: selectedCompanyDetails.state || 'Kerala',
        stateCode: selectedCompanyDetails.stateCode || '32',
        mobile: selectedCompanyDetails.mobile || '',
        email: selectedCompanyDetails.email || '',
        website: selectedCompanyDetails.website || '',
        logo: selectedCompanyDetails.logo || '/uploads/wyenfos.png',
      },
      createdBy: userEmail,
      lastUpdatedBy: userEmail,
      paymentDetails: {
        mode: 'Cash',
        status: 'Paid',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().slice(0, 10),
      },
      overallAmountToPay: '0',
      overallRemainingBalance: '0',
    }),
    [selectedCompanyFromState, selectedCompanyDetails]
  );

  const [form, dispatch] = useReducer(formReducer, initialFormState);
  const [errors, setErrors] = useState({
    customerId: '',
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    customerEmail: '',
    customerGSTIN: '',
    invoiceNo: '',
    date: '',
    paymentTerms: '',
    dueDates: [],
    items: [],
  });

  const createNewCustomer = useCallback(async (name, additionalDetails = {}) => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Customer name is required to create a new customer.' });
      setTimeout(() => setMessage(null), 3000);
      return '';
    }
    
    // Check if customer details are provided
    const hasDetails = additionalDetails.address || additionalDetails.phone || additionalDetails.email || additionalDetails.gstin;
    if (!hasDetails) {
      setMessage({ type: 'warning', text: 'Creating customer with name only. Please fill in address, phone, email, or GSTIN for complete customer information.' });
      setTimeout(() => setMessage(null), 5000);
    }
    setLoading(true);
    try {
      const payload = {
        customerName: sanitizeInput(name),
        customerContact: {
          address: additionalDetails.address || form.customerAddress || '',
          phone: additionalDetails.phone || form.customerPhone || '',
          email: additionalDetails.email || form.customerEmail || '',
          gstin: additionalDetails.gstin || form.customerGSTIN || '',
        },
        company: selectedCompanyFromState,
        createdBy: userEmail,
        lastUpdatedBy: userEmail,
      };
      const response = await api.post('/customers', payload);
      const newCustomer = response.data;
      dispatch({
        type: 'SET_FORM',
        form: {
          ...form,
          customerId: newCustomer.customerId || '',
          customerName: newCustomer.customerName || '',
          customerAddress: newCustomer.customerContact?.address || form.customerAddress || '',
          customerGSTIN: newCustomer.customerContact?.gstin || form.customerGSTIN || '',
          customerEmail: newCustomer.customerContact?.email || form.customerEmail || '',
          customerPhone: newCustomer.customerContact?.phone || form.customerPhone || '',
        }
      });
      setMessage({ type: 'success', text: `Customer created: ${newCustomer.customerName} (${newCustomer.customerId})` });
      setTimeout(() => setMessage(null), 3000);
      
      // If customer was created with minimal details, suggest updating
      if (!hasDetails) {
        setTimeout(() => {
          setMessage({ type: 'info', text: 'Tip: You can update customer details later by editing the customer information.' });
          setTimeout(() => setMessage(null), 4000);
        }, 3000);
      }
      
      return newCustomer.customerId || '';
    } catch (err) {
      console.error('createNewCustomer Error:', err);
      setMessage({ type: 'error', text: `Failed to create customer: ${err.response?.data?.message || err.message}` });
      setTimeout(() => setMessage(null), 3000);
      return '';
    } finally {
      setLoading(false);
    }
  }, [sanitizeInput, selectedCompanyFromState, form]);

  const searchCustomers = useCallback(async (query) => {
    if (!query || query.trim().length === 0) {
      setSearchResults([]);
      setMessage({ type: 'warning', text: 'Please enter a customer name to search' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    
    setIsCustomerLoading(true);
    try {
  
      const response = await api.get('/customers/find', {
        params: { query: sanitizeInput(query.trim()), company: selectedCompanyFromState },
      });
      const customers = Array.isArray(response.data) ? response.data : [];
      
      setSearchResults(customers);
      
      // If no customers found, offer to create new customer
      if (customers.length === 0) {
        setMessage({ type: 'info', text: `No customer found with name "${query}". Click "Create New Customer" to add them.` });
        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage({ type: 'success', text: `Found ${customers.length} customer(s) matching "${query}"` });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('Failed to search customers:', error);
      setSearchResults([]);
      setMessage({ type: 'error', text: 'Failed to search customers. Please try again.' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsCustomerLoading(false);
    }
  }, [selectedCompanyFromState, sanitizeInput]);

  // Manual search only - no debouncing
  const handleManualSearch = () => {
    if (customerSearch.trim()) {
      searchCustomers(customerSearch);
    } else {
      setMessage({ type: 'warning', text: 'Please enter a customer name to search' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const selectCustomer = useCallback((customer) => {
    dispatch({
      type: 'SET_FORM',
      form: {
        ...form,
        customerId: customer.customerId || '',
        customerName: customer.customerName || '',
        customerAddress: customer.customerContact?.address || 'N/A',
        customerPhone: customer.customerContact?.phone || '',
        customerEmail: customer.customerContact?.email || '',
        customerGSTIN: customer.customerContact?.gstin || '',
        customerContact: customer.customerContact || {}
      }
    });
    setCustomerSearch('');
    setSearchResults([]);
  }, [form]);

  const getOrGenerateCustomerId = useCallback(async (name) => {
    if (!name.trim()) {
      setErrors((prev) => ({ ...prev, customerName: 'Customer name is required' }));
      return '';
    }
    const sanitizedName = sanitizeInput(name);
    let customer = null;
    try {
      const response = await api.get(`/customers/find`, {
        params: { query: sanitizedName, company: selectedCompanyFromState }
      });
      const customers = response.data;
      customer = customers && customers.length > 0 ? customers[0] : null;
      dispatch({
        type: 'SET_FORM',
        form: {
          ...form,
          customerId: customer.customerId || '',
          customerName: customer.customerName || sanitizedName,
          customerAddress: customer.customerContact?.address || 'N/A',
          customerGSTIN: customer.customerContact?.gstin || '',
          customerEmail: customer.customerContact?.email || '',
          customerContact: customer.customerContact || {}
        }
      });
      return customer ? customer.customerId || '' : '';
    } catch (err) {
      if (err.response?.status === 404 || !customer) {
        // No customer found - automatically create new customer with continuous ID
        setMessage({ type: 'info', text: 'Customer not found. Creating new customer automatically...' });
        setTimeout(() => setMessage(null), 3000);
        
        const newCustomerId = await createNewCustomer(sanitizedName, {
          address: form.customerAddress || '',
          phone: form.customerPhone || '',
          email: form.customerEmail || '',
          gstin: form.customerGSTIN || '',
        });
        if (newCustomerId) {
          setMessage({ type: 'success', text: `New customer created automatically: ${name} (${newCustomerId})` });
          setTimeout(() => setMessage(null), 3000);
        }
        return newCustomerId;
      }
      setMessage({ type: 'error', text: `Error fetching customer: ${err.response?.data?.message || err.message}` });
      setTimeout(() => setMessage(null), 3000);
      return '';
    }
  }, [sanitizeInput, createNewCustomer, selectedCompanyFromState, form]);

  // Debounced customer ID generation to avoid creating customers for each character
  const debouncedCustomerIdGeneration = useRef(debounce(async (customerName) => {
    if (customerName && customerName.trim().length >= 3 && !form.customerId) {
      await getOrGenerateCustomerId(customerName);
    }
  }, 1000)).current;

  useEffect(() => {
    if (form.customerName && form.customerName.trim().length >= 3 && !form.customerId) {
      debouncedCustomerIdGeneration(form.customerName);
    }
    return () => debouncedCustomerIdGeneration.cancel();
  }, [form.customerName, form.customerId, debouncedCustomerIdGeneration]);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await api.get('/products', {
        params: { company: selectedCompanyFromState }
      });
      setProducts(
        (response.data || []).map(p => ({
          _id: p._id || p.itemCode,
          itemCode: p.itemCode || '',
          itemName: p.itemName || '',
          hsn: p.hsn || '',
          gst: p.gst || '',
          unitPrice: p.unitPrice || 0,
        }))
      );
    } catch (err) {
      console.error('Error fetching products:', err);
      setProducts([]);
      setMessage({ type: 'error', text: 'Failed to fetch products' });
      setTimeout(() => setMessage(null), 3000);
    }
  }, [selectedCompanyFromState]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const fetchSavedBills = useCallback(async () => {
    try {
      const response = await api.get('/creditbills', {
        params: { company: selectedCompanyFromState }
      });

      // Limit to latest 10 bills
      const latestBills = (response.data?.data || []).slice(0, 10);
      setSavedBills(latestBills);
    } catch (err) {
      console.error('Error fetching saved bills:', err);
      setSavedBills([]);
      setMessage({ type: 'error', text: 'Failed to fetch saved bills' });
      setTimeout(() => setMessage(null), 3000);
    }
  }, [selectedCompanyFromState]);

  useEffect(() => {
    fetchSavedBills();
  }, [fetchSavedBills, selectedCompanyFromState]);

  const generateInvoiceNumber = useCallback(async () => {
    if (!validCompanies.includes(selectedCompanyFromState)) {
      setMessage({ type: 'error', text: `Invalid company: ${selectedCompanyFromState}. Using fallback invoice number.` });
      setTimeout(() => setMessage(null), 3000);
      return `${companyPrefixes[selectedCompanyFromState] || 'WNF'}-1`;
    }
    try {
      const response = await api.get('/creditbills/latest-invoice', {
        params: { company: selectedCompanyFromState }
      });
      const latestInvoice = response.data?.data?.invoiceNo;
      if (!latestInvoice) {
        return `${companyPrefixes[selectedCompanyFromState]}-1`; // Start with -1 if no bills exist
      }
      
      // The server already returns the correct next invoice number
      // No need to increment it again on the client side
      
      return latestInvoice;
    } catch (err) {
      console.error('Error generating invoice number:', err);
      return `${companyPrefixes[selectedCompanyFromState]}-1`; // Fallback to -1 on error
    }
  }, [selectedCompanyFromState]);

  useEffect(() => {
    const initializeForm = async () => {
      setLoading(true);
      try {
        const invoiceNo = await generateInvoiceNumber();
        dispatch({ type: 'UPDATE_FIELD', field: 'invoiceNo', value: invoiceNo });
      } catch (err) {
        const fallbackInvoiceNo = `${companyPrefixes[selectedCompanyFromState] || 'WNF'}-1`;
        dispatch({ type: 'UPDATE_FIELD', field: 'invoiceNo', value: fallbackInvoiceNo });
        setMessage({ type: 'error', text: `Failed to generate invoice number: ${err.message}` });
        setTimeout(() => setMessage(null), 3000);
      } finally {
        setLoading(false);
      }
    };
    initializeForm();
  }, [generateInvoiceNumber, selectedCompanyFromState]);

  // Ensure invoice number is set when form is reset
  useEffect(() => {
    if (!form.invoiceNo || form.invoiceNo === '') {
      const fallbackInvoiceNo = `${companyPrefixes[selectedCompanyFromState] || 'WNF'}-1`;
      dispatch({ type: 'UPDATE_FIELD', field: 'invoiceNo', value: fallbackInvoiceNo });
    }
  }, [form.invoiceNo, selectedCompanyFromState]);

  const handleProductSelect = useCallback((product, itemIndex) => {
    if (!product) return;
    dispatch({
      type: 'UPDATE_ITEM',
      index: itemIndex,
      field: 'code',
      value: product.itemCode || ''
    });
    dispatch({
      type: 'UPDATE_ITEM',
      index: itemIndex,
      field: 'description',
      value: product.itemName || ''
    });
    dispatch({
      type: 'UPDATE_ITEM',
      index: itemIndex,
      field: 'hsnSac',
      value: product.hsn || ''
    });
    dispatch({
      type: 'UPDATE_ITEM',
      index: itemIndex,
      field: 'gstRate',
      value: product.gst ? product.gst.toString() : '18'
    });
    dispatch({
      type: 'UPDATE_ITEM',
      index: itemIndex,
      field: 'rate',
      value: product.unitPrice ? product.unitPrice.toString() : '0'
    });
    // setShowProductDropdown(false);
    // setProductSearchTerm('');
  }, []);

  const calculateTotals = useCallback(() => {
    const result = {
      totalTaxableValue: 0,
      totalCGST: 0,
      totalSGST: 0,
      totalIGST: 0,
      grandTotal: 0,
      roundOff: 0,
    };

    if (!form.items || !Array.isArray(form.items)) {
      return result;
    }

    form.items.forEach((item) => {
      const quantity = Number(parseFloat(item.quantity)) || 0;
      const rate = Number(parseFloat(item.rate)) || 0;
      const gstRate = Number(parseFloat(item.gstRate)) || 0;

      const taxableValue = quantity * rate;
      const gstAmount = (taxableValue * gstRate) / 100;

      if (form.isOtherState) {
        item.igstRate = gstRate.toString();
        item.igstAmount = gstAmount.toString();
        item.cgstRate = '0';
        item.cgstAmount = '0';
        item.sgstRate = '0';
        item.sgstAmount = '0';
      } else {
        item.cgstRate = (gstRate / 2).toString();
        item.cgstAmount = (gstAmount / 2).toString();
        item.sgstRate = (gstRate / 2).toString();
        item.sgstAmount = (gstAmount / 2).toString();
        item.igstRate = '0';
        item.igstAmount = '0';
      }

      item.taxableValue = taxableValue.toFixed(2);
      item.total = (taxableValue + gstAmount).toFixed(2);

      result.totalTaxableValue += taxableValue;
      result.totalCGST += Number(parseFloat(item.cgstAmount)) || 0;
      result.totalSGST += Number(parseFloat(item.sgstAmount)) || 0;
      result.totalIGST += Number(parseFloat(item.igstAmount)) || 0;
      result.grandTotal += Number(parseFloat(item.total)) || 0;
    });

    result.grandTotal = form.applyRoundOff ? Math.round(result.grandTotal) : result.grandTotal;
    result.roundOff = result.grandTotal - (result.totalTaxableValue + result.totalCGST + result.totalSGST + result.totalIGST);

    Object.keys(result).forEach((key) => {
      result[key] = Number(result[key]);
      if (isNaN(result[key])) result[key] = 0;
    });

    return result;
  }, [form.items, form.isOtherState, form.applyRoundOff]);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      setMessage({ type: 'error', text: 'Notifications not supported' });
      setTimeout(() => setMessage(null), 3000);
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (err) {
      setMessage({ type: 'error', text: 'Notification permission failed' });
      setTimeout(() => setMessage(null), 3000);
      return false;
    }
  }, []);

  const scheduleReminder = useCallback((dueDate, index) => {
    if (!('Notification' in window)) {
      setMessage({ type: 'error', text: 'Notifications not supported by your browser.' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    const dueDateTime = new Date(dueDate).getTime();
    const now = new Date().getTime();
    const timeUntilDue = dueDateTime - now;

    if (timeUntilDue <= 0) {
      setMessage({ type: 'error', text: `Due date ${index + 1} is in the past.` });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (Notification.permission === 'granted') {
      setTimeout(() => {
        if (form.dueDates[index]?.reminder) {
          new Notification(`Credit Bill Reminder`, {
            body: `Due date ${index + 1} for bill ${form.invoiceNo} is today!`,
          });
        }
      }, timeUntilDue);
      setMessage({ type: 'success', text: `Reminder set for due date ${index + 1}` });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: 'Notification permission not granted.' });
      setTimeout(() => setMessage(null), 3000);
    }
  }, [form.dueDates, form.invoiceNo]);

  const toggleReminder = useCallback(async (index, dueDate) => {
    if (!form.dueDates[index].reminder) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
      scheduleReminder(dueDate, index);
    }
    dispatch({
      type: 'UPDATE_DUE_DATE',
      index,
      field: 'reminder',
      value: !form.dueDates[index].reminder
    });
  }, [requestNotificationPermission, scheduleReminder, form]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const sanitizedValue = sanitizeInput(value);

    if (name === 'customerId') {
      dispatch({ type: 'UPDATE_FIELD', field: name, value: sanitizedValue });
      setErrors((prev) => ({
        ...prev,
        customerId: sanitizedValue.trim() ? '' : 'Customer ID is required',
      }));
      // Cancel any pending customer ID generation when user manually enters Customer ID
      if (debouncedCustomerIdGeneration.cancel) {
        debouncedCustomerIdGeneration.cancel();
      }
    } else if (name === 'customerName') {
      dispatch({ type: 'UPDATE_FIELD', field: name, value: sanitizedValue });
      setErrors((prev) => ({
        ...prev,
        customerName: sanitizedValue.trim() ? '' : 'Customer name is required',
      }));
    } else if (name === 'customerAddress') {
      dispatch({ type: 'UPDATE_FIELD', field: name, value: sanitizedValue });
      setErrors((prev) => ({
        ...prev,
        customerAddress: sanitizedValue.trim() ? '' : 'Customer address is required',
      }));
    } else if (name === 'customerPhone') {
      dispatch({ type: 'UPDATE_FIELD', field: name, value: sanitizedValue });
      setErrors((prev) => ({
        ...prev,
        customerPhone: sanitizedValue && !/^[0-9]{10}$/.test(sanitizedValue.replace(/\s/g, ''))
          ? 'Invalid phone number format (10 digits required)'
          : '',
      }));
    } else if (name === 'customerEmail') {
      dispatch({ type: 'UPDATE_FIELD', field: name, value: sanitizedValue });
      setErrors((prev) => ({
        ...prev,
        customerEmail: sanitizedValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedValue)
          ? 'Invalid email format'
          : '',
      }));
    } else if (name === 'customerGSTIN') {
      dispatch({ type: 'UPDATE_FIELD', field: name, value: sanitizedValue });
      setErrors((prev) => ({
        ...prev,
        customerGSTIN: sanitizedValue && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(sanitizedValue)
          ? 'Invalid GSTIN format'
          : '',
      }));
    } else if (name === 'date') {
      dispatch({ type: 'UPDATE_FIELD', field: name, value: sanitizedValue });
      setErrors((prev) => ({
        ...prev,
        date: sanitizedValue ? '' : 'Date is required',
      }));
    } else if (name === 'paymentTerms') {
      dispatch({
        type: 'UPDATE_FIELD',
        field: name,
        value: sanitizedValue
      });
      dispatch({
        type: 'UPDATE_FIELD',
        field: 'paymentDetails.mode',
        value: sanitizedValue
      });
      setErrors((prev) => ({
        ...prev,
        paymentTerms: sanitizedValue ? '' : 'Payment terms are required',
      }));
    } else if (name === 'overallAmountToPay') {
      const amountToPay = parseFloat(sanitizedValue) || 0;
      const currentTotals = calculateTotals();
      const grandTotal = currentTotals.grandTotal || 0;
      let remainingBalance = Math.max(0, grandTotal - amountToPay);
      
      // Apply round-off to remaining balance if round-off is enabled
      if (form.applyRoundOff) {
        remainingBalance = Math.round(remainingBalance);
      }
      
      // Update the overall amount to pay and remaining balance
      dispatch({ type: 'UPDATE_FIELD', field: 'overallAmountToPay', value: sanitizedValue });
      dispatch({ type: 'UPDATE_FIELD', field: 'overallRemainingBalance', value: remainingBalance.toFixed(2) });
      
      // Update all items to reflect the overall amount distribution
      form.items.forEach((item, index) => {
        const itemTotal = parseFloat(item.total) || 0;
        const itemRatio = grandTotal > 0 ? itemTotal / grandTotal : 0;
        const itemAmountToPay = amountToPay * itemRatio;
        let itemBalance = Math.max(0, itemTotal - itemAmountToPay);
        
        // Apply round-off to item balance if round-off is enabled
        if (form.applyRoundOff) {
          itemBalance = Math.round(itemBalance);
        }
        
        dispatch({ 
          type: 'UPDATE_ITEM', 
          index, 
          field: 'amountToPay', 
          value: itemAmountToPay.toFixed(2) 
        });
        dispatch({ 
          type: 'UPDATE_ITEM', 
          index, 
          field: 'balanceAmount', 
          value: itemBalance.toFixed(2) 
        });
      });
    } else {
      dispatch({ type: 'UPDATE_FIELD', field: name, value: type === 'checkbox' ? checked : sanitizedValue });
    }
  }, [sanitizeInput, debouncedCustomerIdGeneration, calculateTotals, form]);

  const handleItemChange = useCallback((index, e) => {
    const { name, value } = e.target;
    const fieldName = name.split('.')[1];
    const sanitizedValue = sanitizeInput(value);

    dispatch({ type: 'UPDATE_ITEM', index, field: fieldName, value: sanitizedValue });

    const rate = parseFloat(form.items[index].rate) || 0;
    const quantity = parseFloat(form.items[index].quantity) || 0;
    const gstRate = parseFloat(form.items[index].gstRate) || 0;

    const taxableValue = rate * quantity;
    const tax = taxableValue * (gstRate / 100);
    const total = taxableValue + tax;

    if (form.isOtherState) {
      dispatch({ type: 'UPDATE_ITEM', index, field: 'igstRate', value: gstRate.toString() });
      dispatch({ type: 'UPDATE_ITEM', index, field: 'igstAmount', value: tax.toFixed(2) });
      dispatch({ type: 'UPDATE_ITEM', index, field: 'cgstRate', value: '0' });
      dispatch({ type: 'UPDATE_ITEM', index, field: 'cgstAmount', value: '0' });
      dispatch({ type: 'UPDATE_ITEM', index, field: 'sgstRate', value: '0' });
      dispatch({ type: 'UPDATE_ITEM', index, field: 'sgstAmount', value: '0' });
    } else {
      dispatch({ type: 'UPDATE_ITEM', index, field: 'cgstRate', value: (gstRate / 2).toString() });
      dispatch({ type: 'UPDATE_ITEM', index, field: 'cgstAmount', value: (tax / 2).toFixed(2) });
      dispatch({ type: 'UPDATE_ITEM', index, field: 'sgstRate', value: (gstRate / 2).toString() });
      dispatch({ type: 'UPDATE_ITEM', index, field: 'sgstAmount', value: (tax / 2).toFixed(2) });
      dispatch({ type: 'UPDATE_ITEM', index, field: 'igstRate', value: '0' });
      dispatch({ type: 'UPDATE_ITEM', index, field: 'igstAmount', value: '0' });
    }

    dispatch({ type: 'UPDATE_ITEM', index, field: 'taxableValue', value: taxableValue.toFixed(2) });
    dispatch({ type: 'UPDATE_ITEM', index, field: 'total', value: total.toFixed(2) });

    const totalAmount = parseFloat(form.items[index].total || 0);
    if (fieldName === 'amountToPay') {
      const amountToPay = parseFloat(sanitizedValue) || 0;
      dispatch({ type: 'UPDATE_ITEM', index, field: 'amountToPay', value: amountToPay.toFixed(2) });
      dispatch({ type: 'UPDATE_ITEM', index, field: 'balanceAmount', value: (totalAmount - amountToPay).toFixed(2) });
    } else {
      dispatch({ type: 'UPDATE_ITEM', index, field: 'amountToPay', value: totalAmount.toFixed(2) });
      dispatch({ type: 'UPDATE_ITEM', index, field: 'balanceAmount', value: '0.00' });
    }

    setErrors((prev) => {
      const newItemErrors = [...prev.items];
      newItemErrors[index] = {
        id: form.items[index].id,
        code: form.items[index].code.trim() ? '' : 'Item code is required',
        description: form.items[index].description.trim() ? '' : 'Description required',
        hsnSac: form.items[index].hsnSac.trim() ? '' : 'HSN/SAC required',
        rate: isNaN(parseFloat(form.items[index].rate)) || parseFloat(form.items[index].rate) <= 0 ? 'Rate must be > 0' : '',
        quantity: isNaN(parseFloat(form.items[index].quantity)) || parseFloat(form.items[index].quantity) <= 0 ? 'Qty must be > 0' : '',
        gstRate: isNaN(parseFloat(form.items[index].gstRate)) || parseFloat(form.items[index].gstRate) < 0 ? 'GST must be ≥ 0' : '',
        amountToPay:
          isNaN(parseFloat(form.items[index].amountToPay)) || parseFloat(form.items[index].amountToPay) < 0
            ? 'Amt must be ≥ 0'
            : parseFloat(form.items[index].amountToPay) > parseFloat(form.items[index].total)
            ? 'Amt exceeds total'
            : '',
      };
      return { ...prev, items: newItemErrors };
    });
  }, [form.items, form.isOtherState, sanitizeInput]);

  const addItem = useCallback(() => {
    const newItem = {
      id: uuidv4(),
      code: '',
      description: '',
      hsnSac: '',
      quantity: '1',
      unit: 'NOS',
      rate: '',
      gstRate: '',
      cgstRate: '0',
      cgstAmount: '0',
      sgstRate: '0',
      sgstAmount: '0',
      igstRate: '0',
      igstAmount: '0',
      taxableValue: '0.00',
      total: '0.00',
      amountToPay: '0.00',
      balanceAmount: '0.00',
    };
    dispatch({ type: 'ADD_ITEM', newItem });
    setErrors((prev) => ({
      ...prev,
      items: [...prev.items, { id: uuidv4(), code: '', description: '', hsnSac: '', quantity: '', rate: '', gstRate: '', amountToPay: '' }],
    }));
  }, []);

  const deleteItem = useCallback((index) => {
    if (form.items.length === 1) {
      setMessage({ type: 'error', text: 'At least one item is required.' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (window.confirm('Delete this item?')) {
      const newItems = form.items.filter((_, i) => i !== index);
      dispatch({ type: 'SET_FORM', form: { ...form, items: newItems } });
      setErrors((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    }
  }, [form]);

  const handleDueDateChange = useCallback((index, value) => {
    dispatch({ type: 'UPDATE_DUE_DATE', index, field: 'date', value: value });
    const newDueDateErrors = form.dueDates.map((due, i) => ({ id: due.id, date: '' }));
    const today = new Date().toISOString().slice(0, 10);
    form.dueDates.forEach((due, i) => {
      if (!due.date) newDueDateErrors[i].date = `Due date ${i + 1} is required`;
      else if (due.date < today) newDueDateErrors[i].date = `Due date ${i + 1} must be today or later`;
      else if (i > 0 && due.date <= form.dueDates[i - 1].date) newDueDateErrors[i].date = `Due date ${i + 1} must be after due date ${i}`;
    });
    setErrors((prev) => ({ ...prev, dueDates: newDueDateErrors }));
  }, [form.dueDates]);

  const confirmDueDate = useCallback((index) => {
    if (!form.dueDates[index]?.date) {
      setErrors((prev) => {
        const newErrors = [...prev.dueDates];
        newErrors[index] = { ...newErrors[index], date: `Due date ${index + 1} is required` };
        return { ...prev, dueDates: newErrors };
      });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (form.dueDates[index].date < today) {
      setErrors((prev) => {
        const newErrors = [...prev.dueDates];
        newErrors[index] = { ...newErrors[index], date: `Due date ${index + 1} must be today or later` };
        return { ...prev, dueDates: newErrors };
      });
      return;
    }
    if (index > 0 && form.dueDates[index].date <= form.dueDates[index - 1].date) {
      setErrors((prev) => {
        const newErrors = [...prev.dueDates];
        return { ...prev, dueDates: newErrors };
      });
      return;
    }
    setEditingDueDateIndex(null);
  }, [form.dueDates]);

  const startEditingDueDate = useCallback((index) => setEditingDueDateIndex(index), []);
  const cancelEditingDueDate = useCallback(() => setEditingDueDateIndex(null), []);

  const addDueDate = useCallback(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const newDueDate = { id: uuidv4(), date: tomorrow.toISOString().slice(0, 10), reminder: false };
    dispatch({ type: 'ADD_DUE_DATE', newDueDate });
    setErrors((prev) => ({
      ...prev,
      dueDates: [...prev.dueDates, { id: uuidv4(), date: '' }],
    }));
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {
      customerId: '',
      customerName: '',
      customerAddress: '',
      customerGSTIN: '',
      invoiceNo: '',
      date: '',
      paymentTerms: '',
      dueDates: form.dueDates.map(() => ({ id: uuidv4(), date: '' })),
      items: form.items.map(() => ({
        id: uuidv4(),
        code: '',
        description: '',
        hsnSac: '',
        rate: '',
        quantity: '',
        gstRate: '',
        amountToPay: '',
      })),
    };

    let hasErrors = false;

    if (!form.customerId) {
      newErrors.customerId = 'Customer ID is required';
      hasErrors = true;
    }
    if (!form.customerName?.trim()) {
      newErrors.customerName = 'Customer name is required';
      hasErrors = true;
    }
    if (!form.customerAddress?.trim()) {
      newErrors.customerAddress = 'Customer address is required';
      hasErrors = true;
    }
    if (
      form.customerGSTIN &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.customerGSTIN)
    ) {
      newErrors.customerGSTIN = 'Invalid GSTIN format';
      hasErrors = true;
    }
    if (!form.invoiceNo?.trim()) {
      newErrors.invoiceNo = 'Invoice number is required';
      hasErrors = true;
    }
    if (!form.date) {
      newErrors.date = 'Date is required';
      hasErrors = true;
    }
    if (!form.paymentTerms) {
      newErrors.paymentTerms = 'Payment terms are required';
      hasErrors = true;
    }

    const today = new Date().toISOString().slice(0, 10);
    form.dueDates.forEach((due, i) => {
      if (!due.date) {
        newErrors.dueDates[i].date = `Due date ${i + 1} is required`;
        hasErrors = true;
      } else if (due.date < today) {
        newErrors.dueDates[i].date = `Due date ${i + 1} must be today or later`;
        hasErrors = true;
      } else if (i > 0 && due.date <= form.dueDates[i - 1].date) {
        newErrors.dueDates[i].date = `Due date ${i + 1} must be after due date ${i}`;
        hasErrors = true;
      }
    });

    form.items.forEach((item, index) => {
      if (!item.code?.trim()) {
        newErrors.items[index].code = 'Item code is required';
        hasErrors = true;
      }
      if (!item.description?.trim()) {
        newErrors.items[index].description = 'Description required';
        hasErrors = true;
      }
      if (!item.hsnSac?.trim()) {
        newErrors.items[index].hsnSac = 'HSN/SAC required';
        hasErrors = true;
      }
      const rate = parseFloat(item.rate);
      if (isNaN(rate) || rate <= 0) {
        newErrors.items[index].rate = 'Rate must be > 0';
        hasErrors = true;
      }
      const qty = parseFloat(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        newErrors.items[index].quantity = 'Qty must be > 0';
        hasErrors = true;
      }
      const gst = parseFloat(item.gstRate);
      if (isNaN(gst) || gst < 0) {
        newErrors.items[index].gstRate = 'GST must be ≥ 0';
        hasErrors = true;
      }
      const amt = parseFloat(item.amountToPay || 0);
      const total = parseFloat(item.total || 0);
      if (isNaN(amt) || amt < 0) {
        newErrors.items[index].amountToPay = 'Amt must be ≥ 0';
        hasErrors = true;
      } else if (amt > total) {
        newErrors.items[index].amountToPay = 'Amt exceeds total';
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    if (hasErrors) {
      setMessage({ type: 'error', text: 'Please correct the highlighted errors' });
      return false;
    }
    setMessage(null);
    return true;
  }, [form]);

  const handleProductInput = (value, index) => {
  const selectedProduct = products.find(p => p.itemName ===  value.trim());
  if (selectedProduct) {
    handleProductSelect(selectedProduct, index);
  } else {
    handleItemChange(index, { target: { name: 'description', value } });
  }
};

const saveBill = useCallback(async () => {
  if (!validateForm()) return;
  setLoading(true);
  try {

    const totals = calculateTotals();

    // 🔒 Fix for Customer ID validation
    let finalCustomerId = form.customerId;

    // Updated regex to accept CUST-1, CUST-2, etc. format
    if (!/^CUST-\d+$/.test(finalCustomerId)) {
      const newCustomerId = await getOrGenerateCustomerId(form.customerName);
      if (!/^CUST-\d+$/.test(newCustomerId)) {
        setMessage({ type: 'error', text: 'Customer ID creation failed. Cannot save bill.' });
        setLoading(false);
        return;
      }
      finalCustomerId = newCustomerId;
    }

    // Get fresh invoice number from server before saving
    
    const invoiceResponse = await api.get('/creditbills/latest-invoice', {
      params: { company: selectedCompanyFromState }
    });
    const freshInvoiceNo = invoiceResponse.data?.data?.invoiceNo;
    

    const payload = {
      ...form,
      invoiceNo: freshInvoiceNo, // Use fresh invoice number from server
      customerId: finalCustomerId,
      totals: {
        totalTaxableValue: totals.totalTaxableValue,
        totalCGST: totals.totalCGST,
        totalSGST: totals.totalSGST,
        totalIGST: totals.totalIGST,
        grandTotal: totals.grandTotal,
        roundOff: totals.roundOff,
        amountToPay: parseFloat(form.overallAmountToPay) || 0,
        remainingBalance: parseFloat(form.overallRemainingBalance) || 0,
        totalItemAmount: totals.totalTaxableValue,
        subtotal: totals.totalTaxableValue,
      },
      company: {
        name: form.company.name || selectedCompanyFromState,
        address: form.company.address || selectedCompanyDetails.address,
        GSTIN: form.company.GSTIN || selectedCompanyDetails.GSTIN,
        state: form.company.state || selectedCompanyDetails.state,
        stateCode: form.company.stateCode || selectedCompanyDetails.stateCode,
      },
      createdBy: userEmail,
      lastUpdatedBy: userEmail,
    };

    

    await api.post('/creditbills', payload);

    setMessage({ type: 'success', text: 'Bill saved successfully!' });
    setTimeout(() => setMessage(null), 3000);
    dispatch({ type: 'SET_FORM', form: initialFormState });
    setErrors({
      customerId: '',
      customerName: '',
      customerAddress: '',
      customerPhone: '',
      customerEmail: '',
      customerGSTIN: '',
      invoiceNo: '',
      date: '',
      paymentTerms: '',
      dueDates: [],
      items: [],
      overallAmountToPay: '',
      overallRemainingBalance: '',
    });
    fetchSavedBills();
  } catch (err) {
    console.error("Full error response:", err.response?.data);
    const message = err.response?.data?.message || err.message;
    const validationErrors = err.response?.data?.validationErrors;
    if (validationErrors) {
      console.error("Validation Errors:", validationErrors);
      alert("Validation Errors:\n" + validationErrors.join('\n'));
    }
    setMessage({ type: 'error', text: `Error saving bill: ${message}` });
    setTimeout(() => setMessage(null), 3000);
  } finally {
    setLoading(false);
  }
}, [form, selectedCompanyFromState, selectedCompanyDetails, validateForm, initialFormState, fetchSavedBills, calculateTotals, getOrGenerateCustomerId]);




  const sendEmail = useCallback(async () => {

    
    if (!form.customerEmail) {
      setMessage({ type: 'error', text: 'Customer email required' });
      return;
    }
    if (!form.items.length) {
      setMessage({ type: 'error', text: 'Add at least one item' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (!validateForm()) return;

    
    setLoading(true);
    
    // Add timeout for the entire email process
    const emailTimeout = setTimeout(() => {
      setLoading(false);
      setMessage({
        type: 'error',
        text: 'Email request timed out. Please try again.',
      });
      setTimeout(() => setMessage(null), 5000);
    }, 30000); // 30 second timeout
    
    try {

      
      // Prepare bill data without saving
      const billData = {
        ...form,
        totals: calculateTotals(),
        company: {
          name: selectedCompanyFromState,
          logo: selectedCompanyDetails?.logo,
          qrCode: selectedCompanyDetails?.qrCode
        }
      };
      
      const pdfResponse = await Promise.race([
        api.post('/creditbills/generate-pdf-unsaved', { billData }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PDF generation timed out')), 15000)
        )
      ]);
      
      const pdfBase64 = pdfResponse.data.data.pdf;
      const emailData = {
        invoiceNo: form.invoiceNo,
        customerEmail: form.customerEmail,
        email: form.customerEmail,
        emailTo: form.customerEmail,
        subject: `Credit Bill #${form.invoiceNo} - ${selectedCompanyFromState || ''}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #b39eb5; border-bottom: 2px solid #b39eb5; padding-bottom: 10px;">
              Credit Bill from ${selectedCompanyFromState || ''}
            </h2>
            
            <p>Dear ${form.customerName},</p>
            
            <p>Please find attached your credit bill for the purchased items.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Bill Details:</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li><strong>Bill Number:</strong> ${form.invoiceNo}</li>
                <li><strong>Customer ID:</strong> ${form.customerId}</li>
                <li><strong>Customer Name:</strong> ${form.customerName}</li>
                <li><strong>Date:</strong> ${form.date}</li>
                <li><strong>Payment Terms:</strong> ${form.paymentTerms}</li>
                <li><strong>Subtotal:</strong> ₹${calculateTotals().totalTaxableValue.toFixed(2)}</li>
                <li><strong>CGST:</strong> ₹${calculateTotals().totalCGST.toFixed(2)}</li>
                <li><strong>SGST:</strong> ₹${calculateTotals().totalSGST.toFixed(2)}</li>
                <li><strong>Grand Total:</strong> ₹${calculateTotals().grandTotal.toFixed(2)}</li>
                <li><strong>Status:</strong> ${form.cancelled ? 'Cancelled' : 'Active'}</li>
              </ul>
            </div>
            
            ${form.dueDates && form.dueDates.length > 0 ? `
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #28a745;">Payment Due Dates:</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                ${form.dueDates.map((due, index) => 
                  `<li><strong>Due Date ${index + 1}:</strong> ${due.date}</li>`
                ).join('')}
              </ul>
            </div>
            ` : ''}
            
            <p><strong>Payment Instructions:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Please make payment by the due dates mentioned above</li>
              <li>Payment can be made through bank transfer or other agreed methods</li>
              <li>For any queries regarding payment, please contact us immediately</li>
            </ul>
            
            <p>If you have any questions, please don't hesitate to contact us.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="margin: 0;"><strong>Best regards,</strong><br>
              ${selectedCompanyFromState || ''}<br>
              Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001<br>
              Mobile: 8547014116 | Email: wyenfos@gmail.com<br>
              Website: www.wyenfos.com</p>
            </div>
          </div>
        `,
        pdfBase64: pdfBase64,
      };
      

      
      // Add timeout for the API request
      await Promise.race([
        api.post('/creditbills/send-email-unsaved', emailData),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email request timed out')), 15000)
        )
      ]);
      

      clearTimeout(emailTimeout);
      setMessage({ type: 'success', text: 'Credit bill emailed successfully!' });
    } catch (error) {
      console.error('Failed to send email:', error);
      clearTimeout(emailTimeout);
      
      // Get the actual error message from the server response
      const errorMessage = error.response?.data?.message || error.message;
      setMessage({
        type: 'error',
        text: `Failed to send email: ${errorMessage}`,
      });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  }, [form, selectedCompanyFromState, selectedCompanyDetails?.logo, selectedCompanyDetails?.qrCode, validateForm, calculateTotals]);

  const printBill = useCallback(async () => {

    try {
      if (!form.items.length) {
        setMessage({ type: 'error', text: 'Add at least one item' });
        setTimeout(() => setMessage(null), 3000);
        return;
      }
      if (!validateForm()) return;

      
      setLoading(true);
      
      // Prepare bill data without saving
      const billData = {
        ...form,
        totals: calculateTotals(),
        company: {
          name: selectedCompanyFromState,
          logo: selectedCompanyDetails?.logo,
          qrCode: selectedCompanyDetails?.qrCode
        }
      };
      
      
      const pdfResponse = await Promise.race([
        api.post('/creditbills/generate-pdf-unsaved', { billData }),
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
  }, [form, selectedCompanyFromState, selectedCompanyDetails?.logo, selectedCompanyDetails?.qrCode, validateForm, calculateTotals]);

  const downloadPDF = useCallback(async () => {
    if (!form.items.length) {
      setMessage({ type: 'error', text: 'Add at least one item' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (!validateForm()) return;


    setLoading(true);
    
    try {

      
      // Prepare bill data without saving
      const billData = {
        ...form,
        totals: calculateTotals(),
        company: {
          name: selectedCompanyFromState,
          logo: selectedCompanyDetails?.logo,
          qrCode: selectedCompanyDetails?.qrCode
        }
      };
      
      
      const pdfResponse = await Promise.race([
        api.post('/creditbills/generate-pdf-unsaved', { billData }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PDF generation timed out')), 30000)
        )
      ]);
      
      const pdfBase64 = pdfResponse.data.data.pdf;
      

      // Download the PDF
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${pdfBase64}`;
      link.download = `CreditBill_${form.invoiceNo || 'Draft'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
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
  }, [form, selectedCompanyFromState, selectedCompanyDetails?.logo, selectedCompanyDetails?.qrCode, validateForm, calculateTotals]);

  const resetForm = useCallback(async () => {
    try {
      const newInvoiceNo = await generateInvoiceNumber();
      dispatch({ type: 'SET_FORM', form: { ...initialFormState, invoiceNo: newInvoiceNo } });
      setErrors({
        customerId: '',
        customerName: '',
        customerAddress: '',
        customerPhone: '',
        customerEmail: '',
        customerGSTIN: '',
        invoiceNo: '',
        date: '',
        paymentTerms: '',
        dueDates: [{ id: uuidv4(), date: '' }],
        items: [{ id: uuidv4(), code: '', description: '', hsnSac: '', quantity: '', rate: '', gstRate: '', amountToPay: '' }],
        overallAmountToPay: '',
        overallRemainingBalance: '',
      });
      setCurrentBillId(null);
    } catch (err) {
      setMessage({ type: 'error', text: 'Reset failed' });
      setTimeout(() => setMessage(null), 3000);
    }
  }, [initialFormState, generateInvoiceNumber]);

  const handleEdit = useCallback((bill) => {
    if (!bill) {
      setMessage({ type: 'error', text: 'No bill data provided' });
      return;
    }
    if (!editPermissions[bill._id]) {
      setMessage({ type: 'error', text: 'Admin permission required' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const updatedForm = {
      ...form,
      customerId: bill.customerId || '',
      customerName: bill.customerName || '',
      customerAddress: bill.customerAddress || '',
      customerPhone: bill.customerPhone || '',
      customerEmail: bill.customerEmail || '',
      customerGSTIN: bill.customerGSTIN || '',
      invoiceNo: bill.invoiceNo || '',
      date: bill.date ? new Date(bill.date).toISOString().slice(0, 10) : '',
      dueDates: (bill.dueDates || []).map((d) => ({
        id: d.id || uuidv4(),
        date: d.date ? new Date(d.date).toISOString().slice(0, 10) : '',
        reminder: d.reminder || false,
      })),
      items: (bill.items || []).map((item) => ({
        id: item.id || uuidv4(),
        code: item.code || '',
        description: item.description || '',
        hsnSac: item.hsnSac || '',
        quantity: item.quantity?.toString() || '',
        unit: item.unit || 'NOS',
        rate: item.rate?.toString() || '',
        gstRate: item.gstRate?.toString() || '0',
        cgstRate: item.cgstRate?.toString() || '0',
        cgstAmount: item.cgstAmount?.toString() || '0',
        sgstRate: item.sgstRate?.toString() || '0',
        sgstAmount: item.sgstAmount?.toString() || '0',
        igstRate: item.igstRate?.toString() || '0',
        igstAmount: item.igstAmount?.toString() || '0',
        taxableValue: item.taxableValue?.toString() || '',
        total: item.total?.toString() || '',
        amountToPay: item.amountToPay?.toString() || '',
        balanceAmount: item.balanceAmount?.toString() || '',
      })),
      paymentTerms: bill.paymentDetails?.mode || 'Cash',
      isOtherState: bill.isOtherState || false,
      applyRoundOff: bill.applyRoundOff || false,
      cancelled: bill.cancelled || false,
      remarks: bill.remarks || '',
      company: bill.company || form.company,
      createdBy: userEmail,
      lastUpdatedBy: userEmail,
      paymentDetails: {
        mode: bill.paymentDetails?.mode || 'Cash',
        status: bill.paymentDetails?.status || 'Paid',
        dueDate: bill.paymentDetails?.dueDate || '',
      },
      overallAmountToPay: bill.totals?.amountToPay?.toString() || '0',
      overallRemainingBalance: bill.totals?.remainingBalance?.toString() || '0',
    };

    dispatch({ type: 'SET_FORM', form: updatedForm });
    setCurrentBillId(bill._id);

    setErrors({
      customerId: '',
      customerName: '',
      customerAddress: '',
      customerPhone: '',
      customerEmail: '',
      customerGSTIN: '',
      invoiceNo: '',
      date: '',
      paymentTerms: '',
      dueDates: updatedForm.dueDates.map((d) => ({ id: d.id, date: '' })),
      items: updatedForm.items.map((item) => ({
        id: item.id,
        code: '',
        description: '',
        hsnSac: '',
        rate: '',
        quantity: '',
        gstRate: '',
        amountToPay: '',
      })),
      overallAmountToPay: '',
      overallRemainingBalance: '',
    });
  }, [form, editPermissions]);

  const requestEditBill = useCallback((billId) => {
    const bill = savedBills.find((b) => b._id === billId);
    if (bill) {
      if (editPermissions[bill._id]) handleEdit(bill);
      else {
        setPendingEditBill(bill);
        setShowPermissionModal(true);
      }
    }
  }, [savedBills, editPermissions, handleEdit]);

const requestEditPermission = useCallback(async () => {
  if (!pendingEditBill) return false;
  
  try {
    setLoading(true);
    const response = await api.post('/notifications/request-permission', {
      type: 'edit_request',
      billType: 'creditbill',
      billId: pendingEditBill._id,
      billData: pendingEditBill,
      requestedBy: userEmail,
      requestedByRole: userRole,
      reason: 'Staff requested permission to edit credit bill',
      status: 'pending'
    });

    if (response.data.success) {
      setMessage({ 
        type: 'success', 
        text: `Edit request sent to admin for bill ${pendingEditBill.invoiceNo}. You will be notified once approved.` 
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
}, [pendingEditBill]);

const requestDeletePermission = useCallback(async () => {
  if (!pendingEditBill) return false;
  
  try {
    setLoading(true);
    const response = await api.post('/notifications/request-permission', {
      type: 'delete_request',
      billType: 'creditbill',
      billId: pendingEditBill._id,
      billData: pendingEditBill,
      requestedBy: userEmail,
      requestedByRole: userRole,
      reason: 'Staff requested permission to delete credit bill',
      status: 'pending'
    });

    if (response.data.success) {
      setMessage({ 
        type: 'success', 
        text: `Delete request sent to admin for bill ${pendingEditBill.invoiceNo}. You will be notified once approved.` 
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
}, [pendingEditBill]);

  const handlePermissionResponse = useCallback((approved) => {
    if (approved && pendingEditBill) {
      setEditPermissions((prev) => ({ ...prev, [pendingEditBill._id]: true }));
      handleEdit(pendingEditBill);
    } else {
      setMessage({ type: 'error', text: 'Permission denied' });
    }
    setShowPermissionModal(false);
    setPendingEditBill(null);
  }, [pendingEditBill, handleEdit]);

  const totals = calculateTotals();

  // Debug logging to identify the issue


  return (
    <ErrorBoundary>
      <div className="creditbill-page-wrapper">
        {form.cancelled && (
          <div className="cancelled-watermark">
            <img src={cancelledWatermark} alt="Cancelled" />
          </div>
        )}
        <div className="invoice-container">
          {message && (
            <div className={`message ${message.type}`}>
              <p>{message.text}</p>
              <button type="button" onClick={() => setMessage(null)} aria-label="Close">
                ✕
              </button>
            </div>
          )}

          {showPermissionModal && pendingEditBill && (
            <div className="modal">
              <div className="modal-content">
                <h3>Edit Permission Request</h3>
                <p>Approve editing bill {pendingEditBill.invoiceNo}?</p>
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

          <div className="bill-header">
            <CompanyHeader 
              billType="CREDIT_BILL"
              billDetails={{
                invoiceNumber: form.invoiceNo,
                date: form.date,
                isCancelled: form.cancelled
              }}
              selectedCompany={{
                name: selectedCompanyFromState,
                address: selectedCompanyDetails.address,
                GSTIN: selectedCompanyDetails.GSTIN,
                state: selectedCompanyDetails.state,
                stateCode: selectedCompanyDetails.stateCode,
                mobile: selectedCompanyDetails.mobile,
                email: selectedCompanyDetails.email,
                website: selectedCompanyDetails.website,
                logo: selectedCompanyDetails.logo,
                prefix: companyPrefixes[selectedCompanyFromState] || 'WNF'
              }}
              showBankDetails={true}
            />
          </div>

          <hr className="invoice-divider" />
          <div className="customer-search no-print">
            <div className="search-input-group">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Enter full customer name to search"
                className="form-control credit-bill-input"
                disabled={form.cancelled || loading}
              />
              <button
                className="search-button no-print"
                onClick={handleManualSearch}
                disabled={!customerSearch.trim() || loading}
              >
                🔍 Search
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((customer, index) => (
                  <div
                    key={customer._id || customer.customerId || `customer-${index}`}
                    onClick={() => selectCustomer(customer)}
                    className="search-result-item"
                  >
                    {customer.customerId} - {customer.customerName}
                    {customer.customerContact?.phone && ` - ${customer.customerContact.phone}`}
                    {customer.customerContact?.email && ` - ${customer.customerContact.email}`}
                  </div>
                ))}
              </div>
            )}
            {customerSearch.trim() && searchResults.length === 0 && (
              <div className="create-customer-section">
                <p className="no-customer-found">
                  No customer found with name: <strong>{customerSearch}</strong>
                </p>
              <button
                className="btn-create-customer no-print"
                onClick={() => createNewCustomer(customerSearch, {
                  address: form.customerAddress || '',
                  phone: form.customerPhone || '',
                  email: form.customerEmail || '',
                  gstin: form.customerGSTIN || '',
                })}
                disabled={loading}
              >
                  ➕ Create New Customer: {customerSearch}
              </button>
              </div>
            )}
            {isCustomerLoading && <div className="loading-message">Loading customers...</div>}
          </div>
          <div className="section-title">Customer Information</div>
          <div className="customer-details">
            <div className="customer-form">
              <div className="credit-bill-input-group">
                <label>Customer ID:</label>
                <input
                  type="text"
                  name="customerId"
                  value={form.customerId}
                  onChange={handleChange}
                  placeholder="Customer ID (e.g., CUST-1, CUST-2)"
                  className={`credit-bill-input ${errors.customerId ? 'error-field' : ''}`}
                  disabled={form.cancelled || loading || isCustomerLoading}
                />
                {errors.customerId && <div className="error-message">{errors.customerId}</div>}
              </div>

              <div className="credit-bill-input-group">
                <label>Customer Name:</label>
                <input
                  type="text"
                  name="customerName"
                  value={form.customerName}
                  onChange={handleChange}
                  placeholder="Customer Name"
                  className={`credit-bill-input ${errors.customerName ? 'error-field' : ''}`}
                  disabled={form.cancelled || loading || isCustomerLoading}
                />
                {errors.customerName && <div className="error-message">{errors.customerName}</div>}
              </div>

              <div className="credit-bill-input-group">
                <label>Date:</label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  className={`credit-bill-input ${errors.date ? 'error-border' : ''}`}
                  disabled={form.cancelled || loading}
                />
                {errors.date && <div className="error">{errors.date}</div>}
              </div>

              <div className="credit-bill-input-group">
                <label>Address:</label>
                <input
                  type="text"
                  name="customerAddress"
                  value={form.customerAddress}
                  onChange={handleChange}
                  placeholder="Address"
                  className={`credit-bill-input ${errors.customerAddress ? 'error-border' : ''}`}
                  disabled={form.cancelled || loading}
                />
                {errors.customerAddress && <div className="error">{errors.customerAddress}</div>}
              </div>

              <div className="credit-bill-input-group">
                <label>Phone:</label>
                <input
                  type="tel"
                  name="customerPhone"
                  value={form.customerPhone}
                  onChange={handleChange}
                  placeholder="Phone Number"
                  className={`credit-bill-input ${errors.customerPhone ? 'error-border' : ''}`}
                  disabled={form.cancelled || loading}
                />
                {errors.customerPhone && <div className="error">{errors.customerPhone}</div>}
              </div>

              <div className="credit-bill-input-group">
                <label>Email:</label>
                <input
                  type="email"
                  name="customerEmail"
                  value={form.customerEmail}
                  onChange={handleChange}
                  placeholder="Email Address"
                  className={`credit-bill-input ${errors.customerEmail ? 'error-border' : ''}`}
                  disabled={form.cancelled || loading}
                />
                {errors.customerEmail && <div className="error">{errors.customerEmail}</div>}
              </div>

              <div className="credit-bill-input-group">
                <label>GSTIN:</label>
                <input
                  type="text"
                  name="customerGSTIN"
                  value={form.customerGSTIN}
                  onChange={handleChange}
                  placeholder="GSTIN"
                  className={`credit-bill-input ${errors.customerGSTIN ? 'error-border' : ''}`}
                  disabled={form.cancelled || loading}
                />
                {errors.customerGSTIN && <div className="error">{errors.customerGSTIN}</div>}
              </div>

              <div className="credit-bill-input-group">
                <label>Payment Terms:</label>
                <select
                  name="paymentTerms"
                  value={form.paymentTerms}
                  onChange={handleChange}
                  className={`credit-bill-input ${errors.paymentTerms ? 'error-border' : ''}`}
                  disabled={form.cancelled || loading}
                >
                  <option value="Cash">Cash</option>
                  <option value="Credit">Credit</option>
                  <option value="UPI">UPI</option>
                </select>
                {errors.paymentTerms && <div className="error">{errors.paymentTerms}</div>}
              </div>
            </div>
          </div>

          {/* Print-specific Due Dates Section */}
          <div className="due-dates-section no-print">
            <h3>Due Dates:</h3>
            <div className="due-dates-list">
              {form.dueDates.map((dueDate, index) => (
                <div key={dueDate.id} className="due-date-item">
                  <span>Due Date {index + 1}:</span>
                  <span>{dueDate.date ? new Date(dueDate.date).toLocaleDateString('en-IN') : 'Not Set'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="section-title">Installment Due Dates</div>
          <div className="due-dates-group">
            {form.dueDates.map((dueDate, index) => (
              <div key={dueDate.id} className="due-date-row">
                <label>
                  Due Date {index + 1}:
                  {editingDueDateIndex === index ? (
                    <div className="due-date-edit-container">
                      <input
                        type="date"
                        name={`dueDates[${index}].date`}
                        value={dueDate.date || ''}
                        onChange={(e) => handleDueDateChange(index, e.target.value)}
                        className={`credit-bill-input ${errors.dueDates[index]?.date ? 'error-border' : ''}`}
                        disabled={form.cancelled || loading}
                        autoFocus
                      />
                      <div className="due-date-buttons">
                        <button
                          type="button"
                          onClick={() => confirmDueDate(index)}
                          className="ok-due-date-btn"
                          disabled={loading}
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditingDueDate}
                          className="cancel-due-date-btn"
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span
                      className={`editable-date ${errors.dueDates[index]?.date ? 'error-border' : ''}`}
                      onClick={() => startEditingDueDate(index)}
                      onKeyDown={(e) => e.key === 'Enter' && startEditingDueDate(index)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Edit due date ${index + 1}`}
                    >
                      {dueDate.date ? new Date(dueDate.date).toLocaleDateString('en-IN') : 'Set due date'}
                    </span>
                  )}
                  {errors.dueDates[index]?.date && <div className="error">{errors.dueDates[index].date}</div>}
                </label>
                {dueDate.date && editingDueDateIndex !== index && (
                  <button
                    type="button"
                    onClick={() => toggleReminder(index, dueDate.date)}
                    className={`reminder-btn ${dueDate.reminder ? 'active' : ''}`}
                    disabled={form.cancelled || loading}
                  >
                    {dueDate.reminder ? '✅ Reminder Set' : '⏰ Set Reminder'}
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addDueDate}
              className="add-due-date-btn"
              disabled={form.cancelled || loading}
            >
              + Add Due Date
            </button>
          </div>

          <div className="tax-options">
            <label>
              <input
                type="checkbox"
                name="isOtherState"
                checked={form.isOtherState}
                onChange={handleChange}
                disabled={form.cancelled || loading}
              />
              Apply inter-state tax (IGST)
            </label>
            <label>
              <input
                type="checkbox"
                name="applyRoundOff"
                checked={form.applyRoundOff}
                onChange={handleChange}
                disabled={form.cancelled || loading}
              />
              Apply round-off
            </label>
            <label>
              <input
                type="checkbox"
                name="cancelled"
                checked={form.cancelled}
                onChange={handleChange}
                disabled={loading}
              />
              Mark as cancelled
            </label>
          </div>

        <div className="credit-bill-items">
          <div className="items-header">
  <h3>ITEMS</h3>
            <div className="items-instructions">
              <span className="instruction-text">
                💡 <strong>Product Edit Instructions:</strong> Use the search icon (🔍) to find products, or click the edit icon (✏️) to manually enter product details. 
                Click the settings icon (⚙️) to open field editors for price, GST, HSN, and quantity. All fields in the table below are also directly editable to correct any purchase admin errors.
              </span>
            </div>
          </div>
  <div className="billitems-section">
    <div className="col-sno">SI No</div>
    <div className="col-code">Item Code</div>
    <div className="col-name">Item Name</div>
    <div className="col-hsn">HSN/SAC</div>
    <div className="col-qty">Quantity</div>
    <div className="col-rate">Rate</div>
    <div className="col-total">Total</div>
    <div className="col-tax">Tax Rate (%)</div>
    <div className="col-action">Action</div>
  </div>

  {form.items.map((item, index) => (
    <div key={item.id || `item-${index}`} className="itemm-row">
      <div className="col-sno">{index + 1}</div>
      <div className="col-code">
        <input
          type="text"
          value={item.code}
          onChange={(e) => handleItemChange(index, { target: { name: 'code', value: e.target.value } })}
          className={errors.items[index]?.code ? 'error-border' : ''}
          disabled={form.cancelled || loading}
        />
        {errors.items[index]?.code && <div className="error">{errors.items[index].code}</div>}
      </div>
      
      <div className="col-name">
        <ProductSelector
  value={item.description}
          onChange={(value) => handleProductInput(value, index)}
          onProductSelect={(product) => handleProductSelect(product, index)}
          placeholder="Search products..."
  disabled={form.cancelled || loading}
          showEditMode={true}
          showFieldEditors={true}
        />
        {errors.items[index]?.description && <div className="error">{errors.items[index].description}</div>}
      </div>

      <div className="col-hsn">
        <input
          type="text"
          value={item.hsnSac}
          onChange={(e) => handleItemChange(index, { target: { name: 'hsnSac', value: e.target.value } })}
          className={errors.items[index]?.hsnSac ? 'error-border' : ''}
          disabled={form.cancelled || loading}
        />
        {errors.items[index]?.hsnSac && <div className="error">{errors.items[index].hsnSac}</div>}
      </div>

      <div className="col-qty">
        <input
          type="number"
          value={item.quantity}
          onChange={(e) => handleItemChange(index, { target: { name: 'quantity', value: e.target.value } })}
          className={errors.items[index]?.quantity ? 'error-border' : ''}
          disabled={form.cancelled || loading}
        />
        {errors.items[index]?.quantity && <div className="error">{errors.items[index].quantity}</div>}
      </div>

      <div className="col-rate">
        <input
          type="number"
          value={item.rate}
          onChange={(e) => handleItemChange(index, { target: { name: 'rate', value: e.target.value } })}
          className={errors.items[index]?.rate ? 'error-border' : ''}
          disabled={form.cancelled || loading}
        />
        {errors.items[index]?.rate && <div className="error">{errors.items[index].rate}</div>}
      </div>

      <div className="col-total">
        <input
          type="text"
          value={item.total}
          readOnly
          className="read-only"
        />
      </div>

      <div className="col-tax">
        <input
          type="number"
          value={item.gstRate}
          onChange={(e) => handleItemChange(index, { target: { name: 'gstRate', value: e.target.value } })}
          className={errors.items[index]?.gstRate ? 'error-border' : ''}
          disabled={form.cancelled || loading}
        />
        {errors.items[index]?.gstRate && <div className="error">{errors.items[index].gstRate}</div>}
      </div>

      <div className="col-action">
        <button
          onClick={() => deleteItem(index)}
          disabled={form.cancelled || loading}
          aria-label={`Delete item ${index + 1}`}
        >
          🗑️
        </button>
      </div>
    </div>
  ))}

  <button 
    className="add-itemm-btn no-print" 
    onClick={addItem} 
    disabled={form.cancelled || loading}
  >
    + Add Item
  </button>
</div>

          <div className="totals-section">
            <h3>Totals</h3>
            <div className="totals-grid">
              <div className="totals-row">
                <span>Subtotal:</span>
                <span>₹{(totals.totalTaxableValue ?? 0).toFixed(2)}</span>
              </div>
              {form.isOtherState ? (
                <div className="totals-row">
                  <span>IGST:</span>
                  <span>₹{(totals.totalIGST ?? 0).toFixed(2)}</span>
                </div>
              ) : (
                <>
                  <div className="totals-row">
                    <span>CGST:</span>
                    <span>₹{(totals.totalCGST ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="totals-row">
                    <span>SGST:</span>
                    <span>₹{(totals.totalSGST ?? 0).toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="totals-row">
                <span>Total + Tax:</span>
                <span>₹{(totals.grandTotal - (totals.roundOff ?? 0)).toFixed(2)}</span>
              </div>
              {form.applyRoundOff && (
                <div className="totals-row">
                  <span>Round Off:</span>
                  <span>₹{(totals.roundOff ?? 0).toFixed(2)}</span>
                </div>
              )}
              <div className="totals-row highlight">
                <span>Grand Total:</span>
                <span>₹{(totals.grandTotal ?? 0).toFixed(2)}</span>
              </div>
              <div className="totals-row">
                <span>Amount to Pay:</span>
                <input
                  type="number"
                  name="overallAmountToPay"
                  value={form.overallAmountToPay || ''}
                  onChange={handleChange}
                  placeholder="Enter amount to pay"
                  className="amount-to-pay-input"
                  disabled={form.cancelled || loading}
                  step="0.01"
                  min="0"
                  max={totals.grandTotal}
                />
              </div>
              <div className="totals-row">
                <span>Remaining Balance:</span>
                <span>
                  ₹{form.overallRemainingBalance}
                </span>
              </div>
            </div>
          </div>

          <div className="remarks-section">
            <label>
              Remarks:
              <textarea
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                disabled={form.cancelled || loading}
              />
            </label>
          </div>

          <div className="action-buttons no-print">
            <button className="btn primary no-print" onClick={saveBill} disabled={loading}>
              {loading ? 'Saving...' : 'Save Bill'}
            </button>
            <button className="btn success no-print" onClick={downloadPDF} disabled={loading}>
              {loading ? 'Generating...' : 'Download PDF'}
            </button>
            <button className="btn success no-print" onClick={sendEmail} disabled={loading || !form.customerEmail}>
              {loading ? 'Sending...' : '📧 Email'}
            </button>
            <button className="btn secondary no-print" onClick={printBill} disabled={loading}>
            🖨️ Print
            </button>
            <button className="btn warning no-print" onClick={resetForm} disabled={loading}>
              Reset Form
            </button>
            <button className="btn no-print" onClick={() => navigate(-1)} disabled={loading}>
              Back
            </button>
          </div>

          <div className="futerr">
            <div className="futer-content">
              <div className="left-section">
                <div className="terms-section">
            <h4>Terms & Conditions</h4>
                  <div className="terms-content">
            <p>
              1. This credit bill is issued as per agreed terms.<br />
              2. Contact us within 7 days for discrepancies.<br />
              3. Amount credited can be adjusted against future invoices.
            </p>
            </div>
                </div>
                
                <div className="bank-details-section">
              <h4>Bank Details</h4>
                  <div className="bank-container">
                    <div className="bank-contentcashbill">
                      <p><strong>Company name:</strong> {selectedCompanyFromState || 'WYENFOS INFOTECH PRIVATE LIMITED'}</p>
                      <p><strong>Account number:</strong> 10192468394</p>
                      <p><strong>IFSC:</strong> IDFB0080732</p>
                      <p><strong>SWIFT code:</strong> IDFBINBBMUM</p>
                      <p><strong>Bank name:</strong> IDFC FIRST</p>
                      <p><strong>Branch:</strong> THRISSUR - EAST FORT THRISSUR BRANCH</p>
                    </div>
                    <div className="qr-code-section">
                      <div className="qr-code-container">
                        <img 
                          src={selectedCompanyDetails.qrCode || '/uploads/bank-qr-codes/WYENFOS_QR_1755336487474.png'} 
                          alt="QR Code for Payment" 
                          className="qr-code-image"
                          onError={(e) => {
                            if (e.target) {
                              e.target.style.display = 'none';
                            }
                            if (e.target && e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'block';
                            }
                          }}
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
              <strong>{selectedCompanyFromState || ''}</strong>
            </div>
          </div>

          <div className="saved-bills">
            {message && <div className={`message ${message.type}`}>{message.text}</div>}
            <h3>Saved Credit Bills</h3>
            {savedBills.length > 0 ? (
              <div className="bills-table-container">
                <table className="saved-bills-table">
                  <thead>
                    <tr>
                      <th>Bill No</th>
                      <th>Customer</th>
                      <th>Customer ID</th>
                      <th>Date</th>
                      <th>Due Dates</th>
                      <th>Total</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedBills.map((bill, index) => (
                      <tr key={bill._id || `bill-${index}`} className={currentBillId === bill._id ? 'current-bill' : ''}>
                        <td>{bill.invoiceNo}</td>
                        <td>{bill.customerName}</td>
                        <td>{bill.customerId || 'N/A'}</td>
                        <td>{bill.date ? new Date(bill.date).toLocaleDateString('en-IN') : 'N/A'}</td>
                        <td>
                          {bill.dueDates && bill.dueDates.length > 0 ? (
                            <div className="due-dates-display">
                              {bill.dueDates.map((dueDate, idx) => (
                                <div key={idx} className="due-date-display-item">
                                  {dueDate.date ? new Date(dueDate.date).toLocaleDateString('en-IN') : 'Not Set'}
                                </div>
                              ))}
                            </div>
                          ) : (
                            'No Due Dates'
                          )}
                        </td>
                        <td>{bill.totals?.grandTotal ? '₹' + parseFloat(bill.totals.grandTotal).toFixed(2) : 'N/A'}</td>
                        <td>
                          {editPermissions[bill._id] ? (
                            <button className="select-btn no-print" onClick={() => requestEditBill(bill._id)}>
                              Edit
                            </button>
                          ) : (
                            <button className="select-btn no-print" onClick={() => { setPendingEditBill(bill); requestEditPermission(); }}>
                              Request Edit
                            </button>
                          )}
                          <button
                            className="btn-danger no-print"
                            onClick={() => { setPendingEditBill(bill); requestDeletePermission(); }}
                          >
                            Request Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No saved bills found</p>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default CreditBill;