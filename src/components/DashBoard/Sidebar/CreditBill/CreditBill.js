import React, { useState, useEffect, useCallback, useMemo, useReducer, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import CompanyHeader from '../CompanyHeader/CompanyHeader.js';
import cancelledWatermark from '../../../../assets/images/cancelled.png';
import './CreditBill.css';
import DOMPurify from 'dompurify';
import { v4 as uuidv4 } from 'uuid';
import debounce from 'lodash.debounce';

const userEmail = localStorage.getItem('userEmail') || 'unknown@example.com';

const companyPrefixes = {
  'WYENFOS INFOTECH': 'WIT',
  'WYENFOS GOLD & DIAMONDS': 'WGD',
  'WYENFOS ADS': 'WAD',
  'WYENFOS CASH VAPASE': 'WCV',
  'WYENFOS': 'WNF',
};

const validCompanies = [
  'WYENFOS INFOTECH',
  'WYENFOS GOLD & DIAMONDS',
  'WYENFOS ADS',
  'WYENFOS CASH VAPASE',
  'WYENFOS',
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
  const selectedCompanyFromState = locationState?.selectedCompany || 'WYENFOS';
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
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [isCustomerLoading, setIsCustomerLoading] = useState(false);

  const sanitizeInput = useCallback((input) => DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }), []);

  const selectedCompanyDetails = useMemo(() => {
    return {
      name: selectedCompanyFromState,
      address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
      GSTIN: '32AAECW1234B1Z0',
      state: 'Kerala',
      stateCode: '32',
      mobile: '',
      email: '',
      website: '',
      logo: null,
    };
  }, [selectedCompanyFromState]);

  const initialFormState = useMemo(
    () => ({
      customerId: '',
      customerName: '',
      customerAddress: 'N/A',
      customerGSTIN: '',
      customerEmail: '',
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
        GSTIN: '32AAECW1234B1Z0',
        state: 'Kerala',
        stateCode: '32',
        mobile: selectedCompanyDetails.mobile || '',
        email: selectedCompanyDetails.email || '',
        website: selectedCompanyDetails.website || '',
        logo: selectedCompanyDetails.logo || null,
      },
      createdBy: userEmail,
      lastUpdatedBy: userEmail,
      paymentDetails: {
        mode: 'Cash',
        status: 'Paid',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().slice(0, 10),
      },
    }),
    [selectedCompanyFromState, selectedCompanyDetails]
  );

  const [form, dispatch] = useReducer(formReducer, initialFormState);
  const [errors, setErrors] = useState({
    customerId: '',
    customerName: '',
    customerAddress: '',
    customerGSTIN: '',
    invoiceNo: '',
    date: '',
    paymentTerms: '',
    dueDates: [],
    items: [],
  });
  const searchCustomers = useCallback(async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsCustomerLoading(true);
    try {
      const response = await api.get('/customers/find', {
        params: { query: sanitizeInput(query), company: selectedCompanyFromState },
      });
      setSearchResults(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to search customers:', error);
      setSearchResults([]);
    } finally {
      setIsCustomerLoading(false);
    }
  }, [selectedCompanyFromState, sanitizeInput]);

  const debouncedSearch = useRef(debounce(searchCustomers, 500)).current;

  useEffect(() => {
    if (customerSearch) {
      debouncedSearch(customerSearch);
    } else {
      setSearchResults([]);
    }
    return () => debouncedSearch.cancel();
  }, [customerSearch, debouncedSearch]);

  const selectCustomer = useCallback((customer) => {
    dispatch({
      type: 'SET_FORM',
      form: {
        ...form,
        customerId: customer.customerId || '',
        customerName: customer.customerName || '',
        customerAddress: customer.customerContact?.address || 'N/A',
        customerGSTIN: customer.customerContact?.gstin || '',
        customerEmail: customer.customerContact?.email || '',
        customerContact: customer.customerContact || {}
      }
    });
    setCustomerSearch('');
    setSearchResults([]);
  }, [form]);

  const createNewCustomer = useCallback(async (name) => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Customer name is required to create a new customer.' });
      setTimeout(() => setMessage(null), 3000);
      return '';
    }
    setLoading(true);
    try {
      const payload = {
        customerName: sanitizeInput(name),
        customerContact: form.customerContact,
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
          customerAddress: newCustomer.customerContact?.address || 'N/A',
          customerGSTIN: newCustomer.customerContact?.gstin || '',
          customerEmail: newCustomer.customerContact?.email || '',
        }
      });
      setMessage({ type: 'success', text: `Customer created: ${newCustomer.customerName} (${newCustomer.customerId})` });
      setTimeout(() => setMessage(null), 3000);
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

  const getOrGenerateCustomerId = useCallback(async (name) => {
    if (!name.trim()) {
      setErrors((prev) => ({ ...prev, customerName: 'Customer name is required' }));
      return '';
    }
    const sanitizedName = sanitizeInput(name);
    try {
      const response = await api.get(`/customers/name/${encodeURIComponent(sanitizedName)}`, {
        params: { company: selectedCompanyFromState }
      });
      const customer = response.data;
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
      return customer.customerId || '';
    } catch (err) {
      if (err.response?.status === 404) {
        return createNewCustomer(sanitizedName);
      }
      setMessage({ type: 'error', text: `Error fetching customer: ${err.response?.data?.message || err.message}` });
      setTimeout(() => setMessage(null), 3000);
      return '';
    }
  }, [sanitizeInput, createNewCustomer, selectedCompanyFromState, form]);

  useEffect(() => {
    if (form.customerName && !form.customerId) {
      getOrGenerateCustomerId(form.customerName);
    }
  }, [form, getOrGenerateCustomerId]);

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
      setSavedBills(response.data || []);
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
      const prefix = companyPrefixes[selectedCompanyFromState];
      const numberPart = parseInt(latestInvoice.split('-')[1], 10) || 0;
      return `${prefix}-${(numberPart + 1).toString()}`;
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
    setShowProductDropdown(false);
    setProductSearchTerm('');
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

    if (name === 'customerName') {
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
    } else {
      dispatch({ type: 'UPDATE_FIELD', field: name, value: type === 'checkbox' ? checked : sanitizedValue });
    }
  }, [sanitizeInput]);

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

    if (!/^CUST\d+$/.test(finalCustomerId)) {
      const newCustomerId = await getOrGenerateCustomerId(form.customerName);
      if (!/^CUST\d+$/.test(newCustomerId)) {
        setMessage({ type: 'error', text: 'Customer ID creation failed. Cannot save bill.' });
        setLoading(false);
        return;
      }
      finalCustomerId = newCustomerId;
    }

    const payload = {
      ...form,
      customerId: finalCustomerId,
      totals: {
        totalTaxableValue: totals.totalTaxableValue,
        totalCGST: totals.totalCGST,
        totalSGST: totals.totalSGST,
        totalIGST: totals.totalIGST,
        grandTotal: totals.grandTotal,
        roundOff: totals.roundOff,
        amountToPay: form.items.reduce((sum, item) => sum + (parseFloat(item.amountToPay) || 0), 0),
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

    console.log("✅ Payload to backend:", payload);

    await api.post('/creditbills', payload);

    setMessage({ type: 'success', text: 'Bill saved successfully!' });
    setTimeout(() => setMessage(null), 3000);
    dispatch({ type: 'SET_FORM', form: initialFormState });
    setErrors({
      customerId: '',
      customerName: '',
      customerAddress: '',
      customerGSTIN: '',
      invoiceNo: '',
      date: '',
      paymentTerms: '',
      dueDates: [],
      items: [],
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


  const generatePDF = useCallback(async () => {
    if (!form.items.length) {
      setMessage({ type: 'error', text: 'Add at least one item' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    try {
      await saveBill();
      const response = await api.get(`/creditbills/generate-pdf/${encodeURIComponent(form.invoiceNo)}`);
      const pdfBase64 = response.data.data.pdf;
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${pdfBase64}`;
      link.download = `CreditBill_${sanitizeInput(form.customerName || 'Customer')}_${Date.now()}.pdf`;
      link.click();
      setMessage({ type: 'success', text: 'PDF generated' });
    } catch (error) {
      setMessage({ type: 'error', text: `PDF failed: ${error.response?.data?.message || error.message}` });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }, [form, saveBill, validateForm, sanitizeInput]);

  const sendEmail = useCallback(async () => {
    if (!form.customerEmail) {
      setMessage({ type: 'error', text: 'Customer email required' });
      return;
    }
    try {
      const response = await api.post('/send-email', {
        customerEmail: form.customerEmail,
        invoiceData: { ...form },
      });
      setMessage({ type: 'success', text: response.data.message });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to send email' });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  }, [form]);

  const printBill = useCallback(() => {
    try {
      setTimeout(() => window.print(), 300);
    } catch (err) {
      setMessage({ type: 'error', text: 'Print failed' });
      setTimeout(() => setMessage(null), 3000);
    }
  }, []);

  const resetForm = useCallback(async () => {
    try {
      const newInvoiceNo = await generateInvoiceNumber(selectedCompanyFromState);
      dispatch({ type: 'SET_FORM', form: { ...initialFormState, invoiceNo: newInvoiceNo } });
      setErrors({
        customerId: '',
        customerName: '',
        customerAddress: '',
        customerGSTIN: '',
        invoiceNo: '',
        date: '',
        paymentTerms: '',
        dueDates: [{ id: uuidv4(), date: '' }],
        items: [{ id: uuidv4(), code: '', description: '', hsnSac: '', quantity: '', rate: '', gstRate: '', amountToPay: '' }],
      });
      setCurrentBillId(null);
    } catch (err) {
      setMessage({ type: 'error', text: 'Reset failed' });
      setTimeout(() => setMessage(null), 3000);
    }
  }, [initialFormState, generateInvoiceNumber, selectedCompanyFromState]);

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
      customerGSTIN: bill.customerGSTIN || '',
      customerEmail: bill.customerEmail || '',
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
    };

    dispatch({ type: 'SET_FORM', form: updatedForm });
    setCurrentBillId(bill._id);

    setErrors({
      customerId: '',
      customerName: '',
      customerAddress: '',
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
    const response = await api.post('/permissions/request', {
      type: 'edit',
      billId: pendingEditBill._id,
      billType: 'credit',
      invoiceNo: pendingEditBill.invoiceNo,
      requestedBy: userEmail,
      company: selectedCompanyFromState,
      customerName: pendingEditBill.customerName,
      amount: pendingEditBill.totals?.grandTotal || 0,
      date: new Date().toISOString(),
      status: 'pending'
    });

    if (response.data.success) {
      setMessage({ 
        type: 'success', 
        text: `Edit request sent to admin for bill ${pendingEditBill.invoiceNo}` 
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
}, [pendingEditBill, selectedCompanyFromState]);

const requestDeletePermission = useCallback(async () => {
  if (!pendingEditBill) return false;
  
  try {
    setLoading(true);
    const response = await api.post('/permissions/request', {
      type: 'delete',
      billId: pendingEditBill._id,
      billType: 'credit',
      invoiceNo: pendingEditBill.invoiceNo,
      requestedBy: userEmail,
      company: selectedCompanyFromState,
      customerName: pendingEditBill.customerName,
      amount: pendingEditBill.totals?.grandTotal || 0,
      date: new Date().toISOString(),
      status: 'pending'
    });

    if (response.data.success) {
      setMessage({ 
        type: 'success', 
        text: `Delete request sent to admin for bill ${pendingEditBill.invoiceNo}` 
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
}, [pendingEditBill, selectedCompanyFromState]);

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
            <div className="header-left">
           <CompanyHeader selectedCompany={selectedCompanyFromState} />
         </div>
            <div className="header-right">
              {/* <div className="creditbill-info">
                <h2>CREDIT BILL{form.cancelled ? ' (CANCELLED)' : ''}</h2>
                <div className="creditbill-meta">
                  <div className="bill-details-row">
                    <span>Customer ID:</span>
                    <strong>{form.customerId || 'Pending'}</strong>
                  </div>
                  <div className="bill-details-row">
                    <span>Bill No:</span>
                    <strong>{form.invoiceNo || 'Pending'}</strong>
                  </div>
                  <div className="bill-details-row">
                    <span>Date:</span>
                    <strong>
                      {form.date
                        ? new Date(form.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
                        : 'N/A'}
                    </strong>
                  </div>
                </div>
              </div> */}
            </div>
          </div>

          <hr className="invoice-divider" />
          <div className="customer-search no-print">
            <div className="search-input-group">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customers by ID, name, phone, or email"
                className="form-control credit-bill-input"
                disabled={form.cancelled || loading}
              />
              <button
                className="search-button no-print"
                onClick={() => searchCustomers(customerSearch)}
                disabled={customerSearch.length < 3 || loading}
              >
                🔍
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
                    {customer.customerId} - {customer.customerName}
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
            {isCustomerLoading && <div className="loading-message">Loading customers...</div>}
          </div>
          <div className="section-title">Customer Information</div>
          <div className="customer-details">
            <div className="customer-form">
              <div className="input-group">
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
                {form.customerId && (
                  <div className="customer-id-display">
                    Customer ID: {form.customerId}
                  </div>
                )}
                {errors.customerName && <div className="error-message">{errors.customerName}</div>}
              </div>

              <div className="input-group">
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

              <div className="input-group">
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

              <div className="input-group">
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

              <div className="input-group">
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
  <h3>ITEMS</h3>
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
    <div key={`item-${index}`} className="itemm-row">
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
<input
  type="text"
  value={item.description}
  onChange={(e) => handleProductInput(e.target.value, index)}
  onFocus={() => setShowProductDropdown(index)}
  onBlur={() => setTimeout(() => setShowProductDropdown(null), 200)}
  placeholder="Item Name"
  list={`product-list-${index}`}
  className={errors.items[index]?.description ? 'error-border' : ''}
  disabled={form.cancelled || loading}
/>
<datalist id={`product-list-${index}`}>
  {products.map((product) => (
    <option key={product._id || product.itemCode} value={product.itemName}>
      {product.itemCode} - {product.itemName}
    </option>
  ))}
</datalist>

          {errors.items[index]?.description && <div className="error">{errors.items[index].description}
            </div>}
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
                <span>
                  ₹{form.items.reduce((sum, item) => sum + (parseFloat(item.amountToPay) || 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="totals-row">
                <span>Remaining Balance:</span>
                <span>
                  ₹{form.items.reduce((sum, item) => sum + (parseFloat(item.balanceAmount) || 0), 0).toFixed(2)}
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

          <div className="action-buttons">
            <button className="btn primary" onClick={saveBill} disabled={loading}>
              {loading ? 'Saving...' : 'Save Bill'}
            </button>
            <button className="btn success" onClick={generatePDF} disabled={loading}>
              {loading ? 'Generating...' : 'Download PDF'}
            </button>
            <button className="btn success" onClick={sendEmail} disabled={loading || !form.customerEmail}>
              {loading ? 'Sending...' : 'Email PDF'}
            </button>
            <button className="btn secondary" onClick={printBill} disabled={loading}>
              Print
            </button>
            <button className="btn warning" onClick={resetForm} disabled={loading}>
              Reset Form
            </button>
            <button className="btn" onClick={() => navigate(-1)} disabled={loading}>
              Back
            </button>
          </div>

          <div className="footer">
            <h4>Terms & Conditions</h4>
            <p>
              1. This credit bill is issued as per agreed terms.<br />
              2. Contact us within 7 days for discrepancies.<br />
              3. Amount credited can be adjusted against future invoices.
            </p>
            <div className="signature">
              <strong>Authorized Signatory</strong><br />
              <strong>{selectedCompanyFromState}</strong>
            </div>
            <div className="bank-details">
              <h4>Bank Details</h4>
              <p>
                <strong>Company name:</strong> WYENFOS INFOTECH PRIVATE LIMITED<br />
                <strong>Account number:</strong> 10192468394<br />
                <strong>IFSC:</strong> IDFB0080732<br />
                <strong>SWIFT code:</strong> IDFBINBBMUM<br />
                <strong>Bank name:</strong> IDFC FIRST<br />
                <strong>Branch:</strong> THRISSUR - EAST FORT THRISSUR BRANCH
              </p>
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
                      <th>Total</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedBills.map((bill) => (
                      <tr key={bill._id} className={currentBillId === bill._id ? 'current-bill' : ''}>
                        <td>{bill.invoiceNo}</td>
                        <td>{bill.customerName}</td>
                        <td>{bill.customerId || 'N/A'}</td>
                        <td>{bill.date ? new Date(bill.date).toLocaleDateString('en-IN') : 'N/A'}</td>
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