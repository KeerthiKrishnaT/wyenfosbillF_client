import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DOMPurify from 'dompurify';
import { applyPlugin } from 'jspdf-autotable';
import { QRCodeCanvas } from 'qrcode.react';
import QRCode from 'qrcode';
import CompanyHeader from '../CompanyHeader/CompanyHeader.js';
import ProductSelector from '../../../Product/ProductSelector.js';
import watermark from '../../../../assets/images/watermark.png';
import cancelledWatermark from '../../../../assets/images/cancelled.png';
import defaultLogo from '../../../../assets/images/Wyenfos_bills_logo.png';
import { showNotification } from '../utils/showNotification.js';
import { getCompanyDetails } from '../utils/companyHelpers.js';
import './CashBill.css';

applyPlugin(jsPDF);

const userEmail = localStorage.getItem('userEmail') || 'unknown@example.com';
const userRole = localStorage.getItem('userRole') || 'staff';
const validCompanies = [
  'WYENFOS INFOTECH',
  'WYENFOS GOLD & DIAMONDS',
  'WYENFOS GOLD AND DIAMONDS',
  'WYENFOS ADS',
  'WYENFOS CASH VAPASE',
  'AYUR FOR HERBALS INDIA',
  'WYENFOS',
  'WYENFOS PURE DROPS',
];

const companyPrefixes = {
  'WYENFOS INFOTECH': 'WIT',
  'WYENFOS GOLD AND DIAMONDS': 'WGD',
  'WYENFOS ADS': 'WAD',
  'WYENFOS CASH VAPASE': 'WCV',
  'AYUR FOR HERBALS INDIA': 'ALH',
  'WYENFOS': 'WNF',
  'WYENFOS PURE DROPS': 'WPD',
};





class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h1>Something went wrong.</h1>
          <p>{this.state.error?.message || 'Unknown error'}</p>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

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

const debounce = (func, delay = 500) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

const sanitizeInput = (input) => DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

function CashBill() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedCompany = location.state?.selectedCompany;

  // Handle company selection from location state
  let selectedCompanyFromState = 'WYENFOS';
  
  if (selectedCompany) {
    // If selectedCompany is an object, extract the name
    if (typeof selectedCompany === 'object' && selectedCompany.name) {
      selectedCompanyFromState = selectedCompany.name;
    } else if (typeof selectedCompany === 'string') {
      selectedCompanyFromState = selectedCompany;
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



  const companyDetails = getCompanyDetails(selectedCompanyFromState);

  const [company, setCompany] = useState(companyDetails);
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    ifsc: '',
    swiftCode: '',
    branch: '',
    upiId: '',
    qrCodeUrl: ''
  });
  const [qrCodeData, setQrCodeData] = useState('');
  const [billDetails, setBillDetails] = useState({
    invoiceNumber: '',
    date: new Date().toISOString().slice(0, 10),
    isCancelled: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [savedBills, setSavedBills] = useState([]);
  const [editPermissions, setEditPermissions] = useState({});
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [pendingEditBill, setPendingEditBill] = useState(null);
  // Permission status is now handled via email notifications
  // ProductList is now handled by ProductSelector component
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentBillId, setCurrentBillId] = useState(null);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const debitRef = useRef({});
  const [form, setForm] = useState({
    invoiceNumber: '',
    customerId: '',
    customerName: '',
    customerContact: { address: '', phone: '', email: '', gstin: '' },
    items: [{ code: '', itemname: '', hsnSac: '', quantity: 1, unit: 'Nos', rate: '', taxRate: '' }],
    isOtherState: false,
    paymentTerms: 'Cash',
    remarks: '',
    isCancelled: false,
    date: new Date().toISOString().slice(0, 10),
    company,
  });
  const [errors, setErrors] = useState({
    customerId: '',
    customerName: '',
    email: '',
    phone: '',
    gstin: '',
    items: [{ code: '', itemname: '', hsnSac: '', rate: '', taxRate: '' }],
  });

  const fetchBankDetails = useCallback(async () => {
    if (!company?.name) return;
    
    // Handle company name mapping for backward compatibility
    let companyNameForAPI = company.name;
    if (company.name === 'AYUR 4 LIFE HERBALS India') {
      companyNameForAPI = 'AYUR FOR HERBALS INDIA';
    }
    
    console.log('Fetching bank details for company:', companyNameForAPI);
    
    try {
      const response = await api.get('/bank-details', {
        params: { companyName: companyNameForAPI },
      });
      const data = response.data;
      console.log('Bank details API response:', data);
      
      if (data) {
        const bankData = {
          bankName: data.bankName || '',
          accountNumber: data.accountNumber || '',
          ifsc: data.ifsc || '',
          swiftCode: data.swiftCode || '',
          branch: data.branch || '',
          upiId: data.upiId || '',
          qrCodeUrl: data.qrCodeUrl || ''
        };
        
        console.log('Setting bank details:', bankData);
        setBankDetails(bankData);
        
        // Generate QR code data for UPI or bank account
        if (data.upiId) {
          console.log('Setting QR code data from UPI ID:', data.upiId);
          setQrCodeData(data.upiId);
        } else if (data.accountNumber && data.ifsc) {
          // Generate UPI-like QR code for bank transfer
          const qrData = `upi://pay?pa=${data.accountNumber}@${data.ifsc}&pn=${company.name}&am=&tn=Payment`;
          console.log('Setting QR code data from bank account:', qrData);
          setQrCodeData(qrData);
        } else {
          // Fallback QR code with company name
          const fallbackQrData = `upi://pay?pn=${company.name}&am=&tn=Payment`;
          console.log('Setting fallback QR code data:', fallbackQrData);
          setQrCodeData(fallbackQrData);
        }
      } else {
        console.log('No bank details data received from API');
      }
    } catch (error) {
      console.error('Error fetching bank details:', error.response?.data || error.message);
      // Don't show error message for bank details as it's not critical
    }
  }, [company]);

useEffect(() => {
  fetchBankDetails();
}, [fetchBankDetails]);

  const fetchLatestBillNumber = useCallback(async () => {
    console.log('Fetching latest bill number for company:', company?.name);
    if (!company?.name) {
      console.error('No company details available');
      setMessage({ type: 'error', text: 'No company selected.' });
      setTimeout(() => setMessage(null), 3000);
      navigate('/dashboard');
      return;
    }
    
    // Handle company name mapping for backward compatibility
    let companyNameForAPI = company.name;
    if (company.name === 'AYUR 4 LIFE HERBALS India') {
      companyNameForAPI = 'AYUR FOR HERBALS INDIA';
    }
    
    const prefix = company.prefix || company.name.slice(0, 4).toUpperCase();
    if (!prefix) {
      console.error('No company prefix available');
      setMessage({ type: 'error', text: 'Company prefix not found.' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setLoading(true);
    try {
      const response = await api.get('/cashbills/latest-invoice', {
        params: {
          company: companyNameForAPI,
          prefix,
        },
      });
      console.log('Latest bill number response:', response.data);
      const invoiceNumber = response.data?.invoiceNumber || `${prefix}-1`;
      setForm((prev) => ({
        ...prev,
        invoiceNumber,
      }));
      // Update billDetails with the invoice number
      setBillDetails(prev => ({
        ...prev,
        invoiceNumber,
        date: form.date || new Date().toISOString().slice(0, 10)
      }));
    } catch (error) {
      console.error('Error fetching latest bill number:', error.response?.data, error.message);
      const fallbackInvoice = `${prefix}-1`;
      setForm((prev) => ({
        ...prev,
        invoiceNumber: error.response?.data?.invoiceNumber || fallbackInvoice,
      }));
      setBillDetails(prev => ({
        ...prev,
        invoiceNumber: error.response?.data?.invoiceNumber || fallbackInvoice,
        date: form.date || new Date().toISOString().slice(0, 10)
      }));
      setMessage({ type: 'warning', text: 'Failed to fetch latest bill number. Using fallback.' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  }, [company, navigate, form.date]);

  const fetchAllBills = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/cashbills', {
        params: { company: company?.name }
      });
      // Limit to latest 10 bills
      const latestBills = (response.data.bills || response.data).slice(0, 10);
      setSavedBills(latestBills);
    } catch (error) {
      console.error('Error fetching bills:', error);
      // Don't show error message for bills fetch as it's handled by the interceptor
    } finally {
      setLoading(false);
    }
  }, [company?.name]);

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

  useEffect(() => {
    console.log('Initial useEffect: Checking token and permissions');
    const token = localStorage.getItem('token');
    console.log('Token:', token ? 'Present' : 'Missing');
    if (!token) {
      console.error('No token, redirecting to login');
      navigate('/login');
      return;
    }
    
    // Check if token is expired by trying to decode it
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      if (tokenData.exp && tokenData.exp < currentTime) {
        console.error('Token expired, redirecting to login');
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
    } catch (error) {
      console.error('Invalid token format, redirecting to login');
      localStorage.removeItem('token');
      navigate('/login');
      return;
    }
    
    // Update company state if selectedCompany is available
    if (selectedCompany && selectedCompany.name) {
    // Handle company name mapping for backward compatibility
    let companyToSet = selectedCompany;
    if (selectedCompany.name === 'AYUR 4 LIFE HERBALS India') {
      companyToSet = {
        ...selectedCompany,
        name: 'AYUR FOR HERBALS INDIA',
        prefix: 'ALH'
      };
    }
    setCompany(companyToSet);
    console.log('Company set from location state:', companyToSet);
    } else {
      console.log('No selectedCompany in location state:', location.state);
      // If no company selected, redirect to dashboard
      setMessage({ type: 'error', text: 'No company selected. Please select a company first.' });
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      return;
    }
    
    fetchAllBills();
    checkUserRole();
    fetchLatestBillNumber();
  }, [fetchLatestBillNumber, navigate, selectedCompany, location.state, checkUserRole, fetchAllBills]);

  const getOrGenerateCustomerId = async (name) => {
    if (!name.trim()) {
      console.log('getOrGenerateCustomerId: Empty name provided');
      setSearchResults([]);
      setMessage({ type: 'warning', text: 'Please enter a customer name to search.' });
      setTimeout(() => setMessage(null), 3000);
      return '';
    }
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('getOrGenerateCustomerId: Missing token');
      setMessage({ type: 'error', text: 'Please log in to search for customers.' });
      setTimeout(() => setMessage(null), 3000);
      setSearchResults([]);
      return '';
    }
    try {
      console.log('getOrGenerateCustomerId: Searching for customer with name:', name);
      const response = await api.get('/customers/find', {
        params: { query: sanitizeInput(name) },
      });
      console.log('getOrGenerateCustomerId: API response:', response.data);
      const customers = Array.isArray(response.data) ? response.data : [];
      setSearchResults(customers);

      if (customers.length > 0) {
        // With the improved server-side search, we should only get exact or very close matches
        const customer = customers[0];
        console.log('getOrGenerateCustomerId: Found customer:', customer);
        console.log('getOrGenerateCustomerId: Search term was:', name);
        console.log('getOrGenerateCustomerId: Customer name is:', customer.customerName);
        
        setForm((prev) => ({
          ...prev,
          customerId: customer.customerId || '',
          customerName: customer.customerName || '',
          customerContact: {
            address: customer.customerContact?.address || '',
            phone: customer.customerContact?.phone || '',
            email: customer.customerContact?.email || '',
            gstin: customer.customerContact?.gstin || '',
          },
        }));
        setMessage({ type: 'success', text: `Customer found: ${customer.customerName}` });
        setTimeout(() => setMessage(null), 3000);
        return customer.customerId || '';
      }

      // No customer found - automatically create new customer with continuous ID
      console.log('getOrGenerateCustomerId: No customer found, creating new customer:', name);
      setMessage({ type: 'info', text: 'Customer not found. Creating new customer automatically...' });
      setTimeout(() => setMessage(null), 3000);
      
      // Clear any existing customer data before creating new customer
      console.log('getOrGenerateCustomerId: Clearing form data for new customer');
      setForm((prev) => ({
        ...prev,
        customerId: '',
        customerName: name, // Set the search term as the customer name
        customerContact: { address: '', phone: '', email: '', gstin: '' }
      }));
      
      setIsCreatingCustomer(true);
      const newCustomerId = await createNewCustomer(name);
      setIsCreatingCustomer(false);
      
      if (newCustomerId) {
        setMessage({ type: 'success', text: `New customer created automatically: ${name} (${newCustomerId})` });
        setTimeout(() => setMessage(null), 3000);
        // Clear the search results and customer search after successful creation
      setSearchResults([]);
        setCustomerSearch('');
        return newCustomerId;
      }
      
      return '';
    } catch (err) {
      console.error('getOrGenerateCustomerId: Error:', {
        message: err.message,
        response: err.response?.data,
        stack: err.stack,
      });
      setMessage({
        type: 'error',
        text: `Failed to search for customer: ${err.response?.data?.message || err.message}`,
      });
      setTimeout(() => setMessage(null), 3000);
      setSearchResults([]);
      return '';
    }
  };

  const debouncedSearch = useRef(debounce(getOrGenerateCustomerId, 500)).current;

  useEffect(() => {
    if (customerSearch.length >= 3) {
      debouncedSearch(customerSearch);
    } else {
      setSearchResults([]);
    }
  }, [customerSearch, debouncedSearch]);

  // Update billDetails when form changes
  useEffect(() => {
    setBillDetails(prev => ({
      ...prev,
      invoiceNumber: form.invoiceNumber,
      date: form.date,
      isCancelled: form.isCancelled
    }));
  }, [form.invoiceNumber, form.date, form.isCancelled]);

  // Monitor company state changes
  useEffect(() => {
    console.log('CashBill - Company state updated:', company);
    if (company && company.name) {
      console.log('Company details available:', {
        name: company.name,
        prefix: company.prefix,
        logo: company.logo || company.logoUrl
      });
    }
  }, [company]);

  // Monitor QR code data changes
  useEffect(() => {
    console.log('CashBill - QR Code data updated:', qrCodeData);
  }, [qrCodeData]);

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
    setCustomerSearch('');
    setSearchResults([]);
  };

  // Products are now fetched by ProductSelector component

   useEffect(() => {
    if (!selectedCompany || !selectedCompany.name) {
      console.warn('No company selected, redirecting...');
      navigate('/dashboard');
    }
  }, [selectedCompany, navigate]);





  // Note: Permission checking is now handled via email notifications
  // Staff will receive approval/rejection emails from admins

  const fetchCustomerByContact = async (field, value) => {
    if (!value) return null;
    
    // Handle company name mapping for backward compatibility
    let companyNameForAPI = company.name;
    if (company.name === 'AYUR 4 LIFE HERBALS India') {
      companyNameForAPI = 'AYUR FOR HERBALS INDIA';
    }
    
    try {
      const response = await api.get('/customers/find', {
        params: { query: value, company: companyNameForAPI },
      });
      const customer = response.data?.find((c) =>
        c.customerName === value ||
        c.customerId === value ||
        c.customerContact?.phone === value ||
        c.customerContact?.email === value
      );
      return customer || null;
    } catch (error) {
      console.error(`Error fetching customer by ${field}:`, error);
      return null;
    }
  };

  const updateCustomerId = (value) => {
    setForm((prev) => ({ ...prev, customerId: value || '' }));
    setErrors((prev) => ({
      ...prev,
      customerId: value && typeof value === 'string' && value.match(/^CUST\d+$/) ? '' : 'Customer ID must be in format CUST{number}',
    }));
  };

  const updateCustomerName = async (value) => {
    console.log('Updating customer name:', value);
    setForm((prev) => ({ ...prev, customerName: value }));
    setErrors((prev) => ({
      ...prev,
      customerName: value.trim() ? '' : 'Customer name is required',
    }));
    
    // Only search for existing customers if we're not in the middle of creating a new customer
    // and if the customer ID is empty (indicating we're not editing an existing customer)
    if (!currentBillId && value && !form.customerId && !isCreatingCustomer) {
      const customer = await fetchCustomerByContact('name', value);
      if (customer) {
        console.log('Found existing customer:', customer);
        setForm((prev) => ({
          ...prev,
          customerId: customer.customerId || '',
          customerName: customer.customerName || value,
          customerContact: {
            address: customer.customerContact?.address || '',
            phone: customer.customerContact?.phone || '',
            email: customer.customerContact?.email || '',
            gstin: customer.customerContact?.gstin || '',
          },
        }));
        setErrors((prev) => ({
          ...prev,
          customerId: customer.customerId && typeof customer.customerId === 'string' && customer.customerId.match(/^CUST-\d+$/) ? '' : 'Customer ID must be in format CUST-{number}',
        }));
      }
    }
  };

  const updateCustomerContact = (field, value) => {
    setForm((prev) => ({
      ...prev,
      customerContact: { ...prev.customerContact, [field]: value },
    }));
    setErrors((prev) => ({
      ...prev,
      [field]:
        field === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          ? 'Invalid email format'
          : field === 'phone' && value && !/^\+?[\d\s-]{10,15}$/.test(value)
          ? 'Invalid phone number'
          : '',
    }));
    if ((field === 'email' || field === 'phone') && value && !currentBillId) {
      if (!debitRef.current[field]) {
        debitRef.current[field] = debounce(async (field, value) => {
          const customer = await fetchCustomerByContact(field, value);
          if (customer) {
            setForm((prev) => ({
              ...prev,
              customerId: customer.customerId || '',
            }));
            setErrors((prev) => ({
              ...prev,
              customerId: customer.customerId && typeof customer.customerId === 'string' && customer.customerId.match(/^CUST\d+$/) ? '' : 'Customer ID must be in format CUST{number}',
            }));
          }
        }, 600);
      }
      debitRef.current[field](field, value);
    }
  };

  const updateItem = (index, field, value) => {
    console.log(`Updating item ${index} ${field}: ${value}`);
    setForm((prev) => {
      const newItems = [...prev.items];

      if (field === 'itemname') {
          newItems[index] = { ...newItems[index], itemname: value };
      } else {
        newItems[index] = {
          ...newItems[index],
          [field]:
            field === 'quantity'
              ? Math.max(1, parseInt(value) || 1)
              : field === 'rate'
              ? Math.max(0, parseFloat(value) || 0)
              : field === 'taxRate'
              ? value === ''
                ? ''
                : Math.max(0, parseFloat(value) || 0)
              : value,
        };
      }
      return { ...prev, items: newItems };
    });
    setErrors((prev) => {
      const newItemErrors = [...prev.items];
      newItemErrors[index] = {
        ...newItemErrors[index],
        [field]:
          field === 'itemname' && !value.trim()
            ? 'Item name is required'
            : field === 'hsnSac' && value && !/^\d{4,8}$/.test(value)
            ? 'HSN/SAC must be 4-8 digits'
            : field === 'rate' && (parseFloat(value) <= 0 || isNaN(parseFloat(value)))
            ? 'Rate must be positive'
            : field === 'taxRate' && (value === '' || isNaN(parseFloat(value)) || parseFloat(value) < 0)
            ? 'Tax rate must be a valid non-negative number'
            : field === 'code' && value && !/^[A-Za-z0-9-_ ]+$/.test(value)
            ? 'Item code must be alphanumeric with spaces/dashes'
            : '',
      };
      return { ...prev, items: newItemErrors };
    });
  };

  const handleProductSelect = (index, product) => {
    console.log('Product selected:', product);
    setForm((prev) => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        itemname: product.itemName || '',
        code: product.itemCode || '',
        hsnSac: product.hsn || '',
        rate: product.unitPrice || 0,
        taxRate: product.gst || 18,
      };
      return { ...prev, items: newItems };
    });
  };

  const addNewRow = () => {
    console.log('Adding new item row');
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { code: '', itemname: '', hsnSac: '', quantity: 1, unit: 'Nos', rate: 10, taxRate: 18 }],
    }));
    setErrors((prev) => ({
      ...prev,
      items: [...prev.items, { code: '', itemname: '', hsnSac: '', rate: '', taxRate: '' }],
    }));
  };

  const deleteRow = (index) => {
    console.log('Deleting item row:', index);
    if (form.items.length === 1) {
      alert('At least one item is required.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this item?')) {
      setForm((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
      setErrors((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
    }
  };

  const calculateTotal = () => {
    const items = Array.isArray(form.items) ? form.items : [];
    const taxableAmount = items.reduce((sum, item) => sum + (item.quantity * item.rate || 0), 0);
    let totalTax = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    items.forEach((item) => {
      const itemTotal = item.quantity * item.rate;
      const taxRate = item.taxRate !== '' ? parseFloat(item.taxRate) / 100 : 0.18;
      const itemTax = itemTotal * taxRate;
      totalTax += itemTax;
      if (!form.isOtherState) {
        totalCGST += itemTax / 2;
        totalSGST += itemTax / 2;
      } else {
        totalIGST += itemTax;
      }
    });

    const grandTotal = taxableAmount + totalTax;
    const rounded = Math.round(grandTotal);
    return {
      taxableAmount,
      igstTotal: form.isOtherState ? totalIGST : 0,
      cgstTotal: !form.isOtherState ? totalCGST : 0,
      sgstTotal: !form.isOtherState ? totalSGST : 0,
      grandTotal,
      roundOff: rounded - grandTotal,
      rounded,
    };
  };

  const saveBill = async () => {
    console.log('Save button clicked at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    const token = localStorage.getItem('token');
    if (!token || !userEmail) {
      console.error('Authentication missing:', { token, userEmail });
      setMessage({ type: 'error', text: 'Authentication missing. Please log in again.' });
      navigate('/login');
      return false;
    }

    if (!validCompanies.includes(company.name)) {
      console.error('Invalid company:', company.name);
      setMessage({ type: 'error', text: `Invalid company selected: ${company.name}` });
      setTimeout(() => setMessage(null), 3000);
      return false;
    }

    if (!form.customerName.trim()) {
      console.error('Customer name is empty');
      setMessage({ type: 'error', text: 'Customer name is required.' });
      setTimeout(() => setMessage(null), 3000);
      return false;
    }

    let customerId = form.customerId;
    if (!customerId || customerId === 'undefined') {
      console.log('No customerId found, creating new customer:', form.customerName);
      try {
        customerId = await createNewCustomer(form.customerName);
        if (!customerId) {
          throw new Error('Failed to create customer');
        }
        setForm((prev) => ({ ...prev, customerId }));
        console.log('Updated form with new customerId:', customerId);
        // Wait for state to update
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Error creating customer:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        setMessage({ type: 'error', text: `Failed to create customer: ${error.message}` });
        setTimeout(() => setMessage(null), 3000);
        return false;
      }
    } else {
      if (!customerId.match(/^CUST-\d+$/)) {
        console.error('Invalid customerId format:', customerId);
        setMessage({ type: 'error', text: 'Invalid customer ID format. Please select or create a customer.' });
        setTimeout(() => setMessage(null), 3000);
        return false;
      }
    }

    if (!form.items.every((item) => item.itemname && Number(item.quantity) > 0 && Number(item.rate) >= 0)) {
      setMessage({ type: 'error', text: 'All items must have a name, valid quantity, and rate.' });
      setTimeout(() => setMessage(null), 5000);
      return false;
    }

    // Final validation to ensure customerId is not undefined
    if (!customerId || customerId === 'undefined') {
      console.error('CustomerId is still undefined after creation process');
      setMessage({ type: 'error', text: 'Failed to generate customer ID. Please try again.' });
      setTimeout(() => setMessage(null), 3000);
      return false;
    }

    setLoading(true);
    try {
      console.log('Preparing bill data with customerId:', customerId);
      const totals = calculateTotal();
      const billData = {
        ...form,
        customerId: customerId, // Explicitly set to ensure it's not undefined
        items: form.items.map((item) => ({
          code: item.code || '',
          itemname: item.itemname,
          hsnSac: item.hsnSac || '',
          quantity: Number(item.quantity) || 1,
          rate: Number(item.rate) || 0,
          taxableValue: Number((Number(item.quantity) || 1) * (Number(item.rate) || 0)),
          taxRate: item.taxRate !== '' ? Number(item.taxRate) : 18,
          cgstRate: !form.isOtherState ? Number(item.taxRate) / 2 : 0,
          cgstAmount: !form.isOtherState
            ? Number(((Number(item.quantity) || 1) * (Number(item.rate) || 0) * (Number(item.taxRate) / 100)) / 2)
            : 0,
          sgstRate: !form.isOtherState ? Number(item.taxRate) / 2 : 0,
          sgstAmount: !form.isOtherState
            ? Number(((Number(item.quantity) || 1) * (Number(item.rate) || 0) * (Number(item.taxRate) / 100)) / 2)
            : 0,
          igstRate: form.isOtherState ? Number(item.taxRate) : 0,
          igstAmount: form.isOtherState
            ? Number((Number(item.quantity) || 1) * (Number(item.rate) || 0) * (Number(item.taxRate) / 100))
            : 0,
        })),
        totals: {
          taxableAmount: Number(totals.taxableAmount),
          cgstTotal: Number(totals.cgstTotal),
          sgstTotal: Number(totals.sgstTotal),
          igstTotal: Number(totals.igstTotal),
          grandTotal: Number(totals.grandTotal),
          roundOff: Number(totals.roundOff),
        },
        company,
        paymentDetails: {
          mode: form.paymentTerms,
          status: 'Paid',
        },
        createdBy: userEmail,
        lastUpdatedBy: userEmail,
      };
      billData.invoiceNumber = form.invoiceNumber;
      console.log('Sending billData:', JSON.stringify(billData, null, 2));
      const response = await api.post('/cashbills', billData);
      if (!response.data) throw new Error('No data returned from server');
      console.log('Save bill response:', response.data);
      fetchAllBills();
      setCurrentBillId(response.data._id);
      setMessage({ type: 'success', text: `Bill saved successfully! Invoice #${response.data.invoiceNumber}` });
      showNotification('Cash Bill Created', `Cash bill ${form.invoiceNumber} has been created.`);
      resetForm();
      return true;
    } catch (error) {
      console.error('Failed to save bill:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      if (error.response?.data?.message?.includes('Invoice number')) {
        await fetchLatestBillNumber();
        setMessage({
          type: 'error',
          text: 'Duplicate invoice number. New number generated. Please save again.',
        });
      } else {
        setMessage({
          type: 'error',
          text: `Failed to save bill: ${error.response?.data?.error || error.message}`,
        });
      }
      return false;
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const createNewCustomer = async (name) => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Customer name is required to create a new customer.' });
      setTimeout(() => setMessage(null), 3000);
      return '';
    }
    const token = localStorage.getItem('token');
    if (!token || !userEmail) {
      console.error('createNewCustomer: Missing token or userEmail', { token, userEmail });
      setMessage({ type: 'error', text: 'Please log in to create a customer.' });
      setTimeout(() => setMessage(null), 3000);
      return '';
    }

    if (!validCompanies.includes(company.name)) {
      console.error('createNewCustomer: Invalid company', company.name);
      setMessage({ type: 'error', text: `Invalid company: ${company.name}` });
      setTimeout(() => setMessage(null), 3000);
      return '';
    }
    try {
      console.log('createNewCustomer: Creating new customer with name:', name);
      console.log('createNewCustomer: Current form state before creating customer:', form);
      
      // Always create a new customer with empty contact details
      // The staff can fill in the details after the customer is created
      const payload = {
        customerName: sanitizeInput(name),
        customerContact: {
          address: '',
          phone: '',
          email: '',
          gstin: '',
          associatedWith: null,
        },
        company,
        createdBy: userEmail,
        lastUpdatedBy: userEmail,
      };
      console.log('createNewCustomer: Sending payload:', JSON.stringify(payload, null, 2));
      const response = await api.post('/customers', payload);
      console.log('createNewCustomer: Created new customer:', response.data);
      const newCustomer = response.data;
      
      // Validate that the customer was created with a valid ID
      if (!newCustomer.customerId) {
        throw new Error('Server did not return a valid customer ID');
      }
      
      console.log('createNewCustomer: Valid customer ID received:', newCustomer.customerId);
      
      // Update the form with the new customer information
      const updatedForm = {
        ...form,
        customerId: newCustomer.customerId,
        customerName: newCustomer.customerName || name, // Use the provided name to ensure consistency
        customerContact: {
          address: '',
          phone: '',
          email: '',
          gstin: '',
        },
      };
      console.log('createNewCustomer: Updating form with new customer:', updatedForm);
      setForm(updatedForm);
      setMessage({ type: 'success', text: `Customer created: ${newCustomer.customerName} (${newCustomer.customerId})` });
      setTimeout(() => setMessage(null), 3000);
      
      // Clear search after a small delay to ensure form is updated
      setTimeout(() => {
      setCustomerSearch('');
        setSearchResults([]);
        console.log('createNewCustomer: Form state after update:', updatedForm);
      }, 100);
      
      return newCustomer.customerId || '';
    } catch (err) {
      console.error('createNewCustomer: Error:', {
        message: err.message,
        response: err.response?.data,
        stack: err.stack,
      });
      setMessage({
        type: 'error',
        text: `Failed to create customer: ${err.response?.data?.message || err.message}`,
      });
      setTimeout(() => setMessage(null), 3000);
      return '';
    }
  };

  const validateForm = () => {
    if (currentBillId && !form.customerId) {
      setMessage({ type: 'error', text: 'Customer ID is required for existing bills.' });
      setTimeout(() => setMessage(null), 5000);
      return false;
    }
    if (!form.customerName.trim()) {
      setMessage({ type: 'error', text: 'Customer name is required.' });
      setTimeout(() => setMessage(null), 5000);
      return false;
    }
    if (!form.items.every((item) => item.itemname && Number(item.quantity) > 0 && Number(item.rate) >= 0)) {
      setMessage({ type: 'error', text: 'All items must have a name, valid quantity, and rate.' });
      setTimeout(() => setMessage(null), 5000);
      return false;
    }
    return true;
  };

  const resetForm = () => {
    console.log('Reset button clicked');
    setForm({
      customerId: '',
      customerName: '',
      customerContact: { address: '', phone: '', email: '', gstin: '' },
      items: [{ code: '', itemname: '', hsnSac: '', quantity: 1, unit: 'Nos', rate: 10, taxRate: 18 }],
      isOtherState: false,
      paymentTerms: 'Cash',
      validUntil: '',
      remarks: '',
      isCancelled: false,
      invoiceNumber: '',
      date: new Date().toISOString().slice(0, 10),
      company,
    });
    setErrors({
      customerId: '',
      customerName: '',
      email: '',
      phone: '',
      gstin: '',
      items: [{ code: '', itemname: '', hsnSac: '', rate: '', taxRate: '' }],
    });
    setCurrentBillId(null);
    setBillDetails({
      invoiceNumber: '',
      date: new Date().toISOString().slice(0, 10),
      isCancelled: false
    });
    fetchLatestBillNumber();
  };

  const loadImageAsBase64 = async (url) => {
    console.log('Loading image:', url);
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to load image'));
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error loading image:', error);
      return null;
    }
  };

  const generatePDF = async (forEmail = false) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    let y = margin;

    doc.setFontSize(10);

    // Load logo - try multiple sources
    let logoBase64 = null;
    if (company.logo && typeof company.logo === 'string') {
      try {
        logoBase64 = await loadImageAsBase64(company.logo);
      } catch (error) {
        console.error('Failed to load logo from company.logo:', error);
      }
    }
    
    // Try logoUrl if logo fails
    if (!logoBase64 && company.logoUrl && typeof company.logoUrl === 'string') {
      try {
        logoBase64 = await loadImageAsBase64(company.logoUrl);
      } catch (error) {
        console.error('Failed to load logo from company.logoUrl:', error);
      }
    }
    
    // Try default logo if both fail
    if (!logoBase64) {
      try {
        logoBase64 = await loadImageAsBase64(defaultLogo);
      } catch (error) {
        console.error('Failed to load default logo:', error);
      }
    }
    
    // Load watermarks
    const watermarkBase64 = await loadImageAsBase64(watermark);
    const cancelledWatermarkBase64 = await loadImageAsBase64(cancelledWatermark);
    
    const logoWidth = 35;
    const logoHeight = 35;
    const logoY = y;
    let textX = margin + logoWidth + 8;
    let textY = y;

    // Add logo if available
    if (logoBase64) {
      console.log('Adding logo to PDF');
      doc.addImage(logoBase64, 'PNG', margin, logoY, logoWidth, logoHeight);
    } else {
      console.log('No logo available, using text only layout');
      textX = margin;
    }

    // Add watermark
    if (watermarkBase64) {
      doc.setGState(new doc.GState({ opacity: 0.1 }));
      doc.addImage(watermarkBase64, 'PNG', pageWidth / 2 - 50, pageHeight / 2 - 50, 100, 100);
      doc.setGState(new doc.GState({ opacity: 1 }));
    }

    // Add cancelled watermark if bill is cancelled
    if (form.isCancelled && cancelledWatermarkBase64) {
      doc.setGState(new doc.GState({ opacity: 0.4 }));
      doc.addImage(cancelledWatermarkBase64, 'PNG', pageWidth / 2 - 50, pageHeight / 2 - 50, 100, 100);
      doc.setGState(new doc.GState({ opacity: 1 }));
    }

    // Company header - Left side with logo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(company.name || 'WYENFOS BILLS', textX, textY);
    textY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Address: ${company.address || 'N/A'}`, textX, textY);
    textY += 6;
    doc.text(`Mobile: ${company.mobile || 'N/A'}`, textX, textY);
    textY += 6;
    doc.text(`Email: ${company.email || 'N/A'}`, textX, textY);
    textY += 6;
    doc.text(`Website: ${company.website || 'N/A'}`, textX, textY);
    textY += 6;
    doc.text(`GSTIN: ${company.GSTIN || 'N/A'}`, textX, textY);
    textY += 6;
    doc.text(`State: ${company.state || 'N/A'} (Code: ${company.stateCode || 'N/A'})`, textX, textY);

    // Invoice details - Right side
    const rightX = pageWidth - margin - 30;
    const rightY = y;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Bill No: ${form.invoiceNumber || 'Pending'}`, rightX, rightY);
    doc.text(`Date: ${new Date(form.date).toLocaleDateString('en-IN')}`, rightX, rightY + 6);

    y += logoHeight + 15;

    // Bill title - Moved down more
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('CASH BILL', pageWidth / 2, y, { align: 'center' });

    y += 20;

    // Customer details - Compact layout
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Customer Information:', margin, y);
    y += 8;

    const customerData = [
      ['Customer ID:', form.customerId || 'N/A', 'Phone:', form.customerContact?.phone || 'N/A'],
      ['Name:', form.customerName || 'N/A', 'Email:', form.customerContact?.email || 'N/A'],
      ['Address:', form.customerContact?.address || 'N/A', 'GSTIN:', form.customerContact?.gstin || 'N/A'],
      ['Payment Method:', form.paymentTerms || 'N/A', '', '']
    ];

    for (let i = 0; i < customerData.length; i++) {
      const yLine = y + i * 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(customerData[i][0], margin, yLine);
      doc.text(customerData[i][2], pageWidth / 2 + 5, yLine);
      doc.setFont('helvetica', 'normal');
      doc.text(customerData[i][1], margin + 35, yLine);
      doc.text(customerData[i][3], pageWidth / 2 + 40, yLine);
    }

    y += customerData.length * 5 + 8;

    const itemHead = [['SI No', 'Item Code', 'Item Name', 'HSN/SAC', 'Qty', 'Rate', 'Total', 'Tax %']];
    const itemBody = form.items.map((item, i) => {
      const rate = typeof item.rate === 'number' ? item.rate : (parseFloat(item.rate) || 0);
      const quantity = typeof item.quantity === 'number' ? item.quantity : (parseFloat(item.quantity) || 1);
      const total = quantity * rate;
      return [
        i + 1,
        item.code || '',
        item.itemname || '',
        item.hsnSac || '',
        quantity.toString(),
        `Rs.${rate.toFixed(2)}`,
        `Rs.${total.toFixed(2)}`,
        `${item.taxRate || 18}%`,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: itemHead,
      body: itemBody,
      theme: 'grid',
      headStyles: { fillColor: [155, 119, 142], halign: 'center' },
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 25 },
        2: { cellWidth: 40 },
        3: { cellWidth: 25 },
        4: { cellWidth: 15 },
        5: { cellWidth: 25 },
        6: { cellWidth: 25 },
        7: { cellWidth: 20 },
      },
    });

    const tableY = doc.lastAutoTable.finalY + 6;

    const totals = calculateTotal();
    doc.setFont('helvetica', 'bold');
    let yPos = tableY;

    const rightAlignX = pageWidth - margin - 5;
    doc.text(`Taxable Amount: Rs.${totals.taxableAmount.toFixed(2)}`, rightAlignX, yPos, { align: 'right' }); yPos += 6;

    if (form.isOtherState) {
      doc.text(`IGST: Rs.${totals.igstTotal.toFixed(2)}`, rightAlignX, yPos, { align: 'right' }); yPos += 6;
    } else {
      doc.text(`CGST: Rs.${totals.cgstTotal.toFixed(2)}`, rightAlignX, yPos, { align: 'right' }); yPos += 6;
      doc.text(`SGST: Rs.${totals.sgstTotal.toFixed(2)}`, rightAlignX, yPos, { align: 'right' }); yPos += 6;
    }

    doc.text(`Round Off: Rs.${totals.roundOff.toFixed(2)}`, rightAlignX, yPos, { align: 'right' }); yPos += 6;
    doc.text(`Grand Total: Rs.${totals.rounded.toFixed(2)}`, rightAlignX, yPos, { align: 'right' }); yPos += 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Remarks:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    const remarksLines = doc.splitTextToSize(form.remarks || 'N/A', pageWidth - 2 * margin);
    doc.text(remarksLines, margin, yPos + 6);
    yPos += 6 * remarksLines.length + 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions', margin, yPos);
    doc.setFont('helvetica', 'normal');
    const terms = [
      '1. This cash bill is issued as per agreed terms.',
      '2. Contact us within 7 days for discrepancies.',
      '3. Amount credited can be adjusted against future invoices.',
    ];
    terms.forEach((term, i) => doc.text(term, margin, yPos + 6 + i * 6));
    yPos += 30;

    // Bank Details and QR Code on same line
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Bank Details', margin, yPos);
    yPos += 8;

    // Bank details on left side
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    console.log('Bank details for PDF:', bankDetails);
    console.log('Company details for PDF:', company);
    
    // Use actual bank details from state, with fallbacks
    const bankDetailsText = [
      `Company name: ${company.name || 'N/A'}`,
      `Account number: ${bankDetails.accountNumber || '10192468394'}`,
      `IFSC: ${bankDetails.ifsc || 'IDFB0080732'}`,
      `SWIFT code: ${bankDetails.swiftCode || 'IDFBINBBMUM'}`,
      `Bank name: ${bankDetails.bankName || 'IDFC FIRST'}`,
      `Branch: ${bankDetails.branch || 'THRISSUR - EAST FORT THRISSUR BRANCH'}`,
    ];
    
    // Display bank details on left side
    bankDetailsText.forEach((line, i) => {
      doc.text(line, margin, yPos + (i * 4));
    });

    // Add QR code on right side of bank details
    if (qrCodeData) {
      try {
        // Generate QR code as data URL
        const qrBase64 = await QRCode.toDataURL(qrCodeData, {
          width: 80,
          height: 80,
          color: {
            dark: '#000000',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'H'
        });
        
        // Add QR code to PDF - on same line as bank details
        const qrX = pageWidth - margin - 60;
        const qrY = yPos - 5;
        doc.addImage(qrBase64, 'PNG', qrX, qrY, 40, 40);
        doc.setFontSize(8);
        doc.text('Scan to Pay', qrX + 20, qrY + 45, { align: 'center' });
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    }

    yPos += bankDetailsText.length * 4 + 15;

    // Signature - positioned lower and better aligned
    const signatureX = pageWidth - margin;
    const signatureY = yPos + 10; // move slightly higher
    
    // Add some spacing line for signature
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(12);
    doc.text('____________________', signatureX, signatureY, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Authorized Signatory', signatureX, signatureY + 6, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(company.name || '', signatureX, signatureY + 12, { align: 'right' });

    doc.setFontSize(8);
    doc.text('Page 1/1', pageWidth - margin, pageHeight - 6, { align: 'right' });

    return forEmail ? doc.output('blob') : doc;
  };

  const downloadPDF = async () => {
    console.log('Download PDF button clicked');
    const doc = await generatePDF();
    if (doc) {
      try {
        const safeInvoiceNumber = (form.invoiceNumber || Date.now()).toString().replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `Cash_Bill_${safeInvoiceNumber}.pdf`;
        doc.save(fileName);
      } catch (error) {
        console.error('Download error:', error);
        alert('Failed to download PDF. Please try again.');
      }
    }
  };

  const sendEmail = async () => {
    console.log('Email button clicked');
    
    if (!validateForm()) {
      console.log('Form validation failed');
      alert('Please fix validation errors');
      return;
    }
    if (!form.customerContact.email) {
      console.log('Customer email missing');
      alert('Customer email required');
      return;
    }
    
    console.log('Starting email process...');
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
      console.log('Generating PDF...');
      // Generate PDF first (before saving) with timeout
      const pdfPromise = generatePDF(true);
      const pdfBlob = await Promise.race([
        pdfPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PDF generation timed out')), 15000)
        )
      ]);
      
      if (!pdfBlob) {
        console.log('PDF generation failed');
        throw new Error('PDF generation failed');
      }
      console.log('PDF generated successfully');
      
      console.log('Converting PDF to base64...');
      const base64Pdf = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read PDF blob'));
        reader.readAsDataURL(pdfBlob);
      });
      console.log('PDF converted to base64');

      console.log('Preparing email data...');
      const emailData = {
        billData: {
          invoiceNumber: form.invoiceNumber,
          customerName: form.customerName,
          customerId: form.customerId,
          customerContact: form.customerContact,
          date: form.date,
          paymentTerms: form.paymentTerms,
          items: form.items,
          totals: calculateTotal(),
          company: company,
          isCancelled: form.isCancelled,
          remarks: form.remarks,
          terms: form.terms
        },
        email: form.customerContact.email,
        emailTo: form.customerContact.email,
        subject: `Cash Bill #${form.invoiceNumber} - ${company.name || ''}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #b39eb5; border-bottom: 2px solid #b39eb5; padding-bottom: 10px;">
              Cash Bill from ${company.name || ''}
            </h2>
            
          <p>Dear ${form.customerName},</p>
            
            <p>Please find attached your cash bill for the purchased items.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Bill Details:</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li><strong>Bill Number:</strong> ${form.invoiceNumber}</li>
                <li><strong>Customer ID:</strong> ${form.customerId}</li>
                <li><strong>Date:</strong> ${form.date}</li>
                <li><strong>Payment Method:</strong> ${form.paymentTerms}</li>
                <li><strong>Subtotal:</strong> ₹${(calculateTotal().taxableAmount || 0).toFixed(2)}</li>
                <li><strong>CGST (9%):</strong> ₹${(calculateTotal().cgstTotal || 0).toFixed(2)}</li>
                <li><strong>SGST (9%):</strong> ₹${(calculateTotal().sgstTotal || 0).toFixed(2)}</li>
                <li><strong>Grand Total:</strong> ₹${(calculateTotal().rounded || 0).toFixed(2)}</li>
                <li><strong>Status:</strong> ${form.isCancelled ? 'Cancelled' : 'Active'}</li>
          </ul>
            </div>
            
            <p><strong>Payment Information:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Payment has been received as per the bill</li>
              <li>Please keep this bill for your records</li>
              <li>For any discrepancies, please contact us within 7 days</li>
            </ul>
            
          <p>Thank you for your business!</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="margin: 0;"><strong>Best regards,</strong><br>
              ${company.name || ''}<br>
              Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001<br>
              Mobile: 8547014116 | Email: wyenfos@gmail.com<br>
              Website: www.wyenfos.com</p>
            </div>
          </div>
        `,
        pdfBase64: base64Pdf,
      };
      
      console.log('Sending email request...');
      
      // Add timeout for the API request
      const response = await Promise.race([
        api.post('/cashbills/send-email', emailData),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email request timed out')), 15000)
        )
      ]);
      
      console.log('Email sent successfully:', response.data);
      clearTimeout(emailTimeout);
      setMessage({ type: 'success', text: 'Email sent successfully!' });
    } catch (error) {
      console.error('Failed to send email:', error);
      clearTimeout(emailTimeout);
      setMessage({
        type: 'error',
        text: `Failed to send email: ${error.message}`,
      });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const printBill = async () => {
    console.log('Print button clicked');
    try {
      const doc = await generatePDF(); // already creates your structured PDF
      if (!doc) throw new Error("PDF generation failed");
  
      doc.autoPrint(); // tells browser to open print dialog
      const pdfBlobUrl = doc.output('bloburl'); 
      window.open(pdfBlobUrl); // opens PDF in a new tab, print dialog shows
    } catch (err) {
      console.error("Print error:", err);
      alert("Failed to generate print view. Please try again.");
    }
  };  

  const requestEditPermission = async () => {
    if (!pendingEditBill) return false;
    
    try {
      setLoading(true);
      const response = await api.post('/notifications/request-permission', {
        type: 'edit_request',
        billType: 'cashbill',
        billId: pendingEditBill.id || pendingEditBill._id,
        billData: pendingEditBill,
        requestedBy: userEmail,
        requestedByRole: userRole,
        reason: 'Staff requested permission to edit cash bill',
        status: 'pending'
      });

      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: `Edit request sent to admin for bill ${pendingEditBill.invoiceNumber}. You will be notified once approved.` 
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
    if (!pendingEditBill) return false;
    
    try {
      setLoading(true);
      const response = await api.post('/notifications/request-permission', {
        type: 'delete_request',
        billType: 'cashbill',
        billId: pendingEditBill.id || pendingEditBill._id,
        billData: pendingEditBill,
        requestedBy: userEmail,
        requestedByRole: userRole,
        reason: 'Staff requested permission to delete cash bill',
        status: 'pending'
      });

      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: `Delete request sent to admin for bill ${pendingEditBill.invoiceNumber}. You will be notified once approved.` 
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

  const requestEditBill = (billId) => {
    const bill = savedBills.find((b) => b.id === billId || b._id === billId);
    if (bill) {
      if (editPermissions[bill.id || bill._id]) {
        // User has permission, proceed with edit
        setForm({
          invoiceNumber: bill.invoiceNumber,
          customerId: bill.customerId,
          customerName: bill.customerName,
          customerContact: {
            address: bill.customerAddress || '',
            phone: bill.customerContact?.phone || '',
            email: bill.customerContact?.email || '',
            gstin: bill.customerContact?.gstin || '',
          },
          items: bill.items || [{ code: '', itemname: '', hsnSac: '', quantity: 1, unit: 'Nos', rate: '', taxRate: '' }],
          isOtherState: bill.isOtherState || false,
          paymentTerms: bill.paymentTerms || 'Cash',
          remarks: bill.remarks || '',
          isCancelled: bill.isCancelled || false,
          date: bill.date ? new Date(bill.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          company: bill.company || company,
        });
        setCurrentBillId(bill._id);
        setMessage({ type: 'success', text: 'Bill loaded for editing' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        // User doesn't have permission, request it
        setPendingEditBill(bill);
        setShowPermissionModal(true);
      }
    }
  };

  const handlePermissionResponse = (approved) => {
    if (approved && pendingEditBill) {
      setEditPermissions((prev) => ({ ...prev, [pendingEditBill._id]: true }));
      requestEditBill(pendingEditBill._id);
    } else {
      setMessage({ type: 'error', text: 'Permission denied' });
    }
    setShowPermissionModal(false);
    setPendingEditBill(null);
  };

  if (loading || !Array.isArray(form.items)) {
    return <div>Loading...</div>;
  }

  const totals = calculateTotal();

  return (
    <ErrorBoundary>
      <div className="cashbill-page-wrapper">
        <div className="cashwatermark">
          <img src={watermark} alt="Watermark" />
        </div>
        {form.isCancelled && (
          <div className="cashcancelled-watermark">
            <img src={cancelledWatermark} alt="Cancelled" />
          </div>
        )}
        <div className="cashbillinvoice-container print-content">
          {/* Permission status is now handled via email notifications */}
          <div className="bill-header">
            <CompanyHeader
              billType="CASH_BILL"
              billDetails={{
                ...billDetails,
                invoiceNumber: form.invoiceNumber,
                date: form.date,
                isCancelled: form.isCancelled
              }}
              selectedCompany={{
                name: selectedCompanyFromState,
                address: companyDetails.address,
                GSTIN: companyDetails.GSTIN,
                state: companyDetails.state,
                stateCode: companyDetails.stateCode,
                mobile: companyDetails.mobile,
                email: companyDetails.email,
                website: companyDetails.website,
                logo: companyDetails.logo,
                prefix: companyPrefixes[selectedCompanyFromState] || 'WNF'
              }}
              showBankDetails={true}
            />
          </div>
          <hr className="invoice-divider" />
          {message && <div className={`message ${message.type}`}>{message.text}</div>}

          {showPermissionModal && pendingEditBill && (
            <div className="modal">
              <div className="modal-content">
                <h3>Edit Permission Request</h3>
                <p>Approve editing bill {pendingEditBill.invoiceNumber}?</p>
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
          <div className="customer-search no-print">
            <div className="search-input-group">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customers by ID, name, phone, or email"
                className="form-control cashbill-input"
                disabled={form.isCancelled}
              />
              <button
                className="search-button no-print"
                onClick={() => debouncedSearch(customerSearch)}
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
                    {customer.customerId} - {customer.customerName} ({Array.isArray(customer.company) ? customer.company.join(', ') : customer.company || 'N/A'})
                    {customer.customerContact.phone && ` - ${customer.customerContact.phone}`}
                    {customer.customerContact.email && ` - ${customer.customerContact.email}`}
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
          <div className="customer-details">
            <div className="cashbill-input">
              {[
                {
                  label: 'Customer ID',
                  field: 'customerId',
                  type: 'text',
                  placeholder: 'Customer ID (e.g., CUST-1)',
                  required: true,
                                      pattern: '^CUST-\\d+$',
                                      errorMessage: 'Must be in format CUST- followed by numbers',
                },
                {
                  label: 'Name',
                  field: 'customerName',
                  type: 'text',
                  placeholder: 'Customer Name',
                  required: true,
                  minLength: 2,
                },
                {
                  label: 'Date',
                  field: 'date',
                  type: 'date',
                  required: true,
                },
                {
                  label: 'Address',
                  field: 'address',
                  type: 'text',
                  placeholder: 'Address',
                },
                {
                  label: 'Phone',
                  field: 'phone',
                  type: 'tel',
                  placeholder: 'Phone Number',
                },
                {
                  label: 'Email',
                  field: 'email',
                  type: 'email',
                  placeholder: 'Email',
                  errorMessage: 'Invalid email format',
                },
                {
                  label: 'GSTIN',
                  field: 'gstin',
                  type: 'text',
                  placeholder: '15-digit GSTIN (optional)',
                  pattern: '^([0-9A-Z]{15})?$',
                  maxLength: 15,
                  errorMessage: 'Must be 15 alphanumeric characters',
                  transform: (value) => value.toUpperCase().replace(/\s/g, ''),
                },
              ].map(({ label, field, type, placeholder, required, pattern, maxLength, errorMessage, transform }) => (
                <div key={field} className="input-group">
                  <label>
                    {label}:
                    {required && <span className="required-asterisk">*</span>}
                  </label>
                  <input
                    type={type}
                    value={field === 'customerId' || field === 'customerName' || field === 'date'
                      ? form[field]
                      : form.customerContact[field] || ''}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (transform) value = transform(value);
                      if (field === 'customerId') {
                        updateCustomerId(value);
                      } else if (field === 'customerName') {
                        // Don't call updateCustomerName if we're in the middle of creating a customer
                        if (!isCreatingCustomer) {
                        updateCustomerName(value);
                        } else {
                          // Just update the form directly without searching for existing customers
                          setForm((prev) => ({ ...prev, customerName: value }));
                        }
                      } else if (field === 'date') {
                        setForm((prev) => ({ ...prev, [field]: value }));
                        setBillDetails(prev => ({ ...prev, date: value }));
                      } else {
                        updateCustomerContact(field, value);
                      }
                    }}
                    placeholder={placeholder}
                    className={`form-control cashbill-input ${errors[field] ? 'input-error' : ''}`}
                    disabled={form.isCancelled}
                    required={required}
                    pattern={pattern}
                    maxLength={maxLength}
                  />
                  {errors[field] && (
                    <span className="error">
                      {errorMessage || errors[field]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="input-group">
            <label>Payment Method:</label>
            <select
              value={form.paymentTerms}
              onChange={(e) => setForm((prev) => ({ ...prev, paymentTerms: e.target.value }))}
              className="form-control cashbill-input"
              disabled={form.isCancelled}
            >
              <option value="Cash">Cash</option>
              <option value="Bank">Bank</option>
              <option value="UPI">UPI</option>
              <option value="CARD">CARD</option>
              <option value="Advance">Advance Payment</option>
            </select>
          </div>
          <div className="tax-options">
            <label>
              <input
                type="checkbox"
                checked={form.isOtherState}
                onChange={(e) => setForm((prev) => ({ ...prev, isOtherState: e.target.checked }))}
                disabled={form.isCancelled}
              />
              Other State (IGST)
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.isCancelled}
                onChange={(e) => setForm((prev) => ({ ...prev, isCancelled: e.target.checked }))}
              />
              Cancel
            </label>
          </div>
          <div className="cash-bill-items">
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
              <div key={`item-${index}`} className="itemm-row">
                <div className="col-sno">{index + 1}</div>
                <div className="col-code">
                  <input
                    type="text"
                    value={item.code}
                    onChange={(e) => updateItem(index, 'code', e.target.value)}
                  />
                </div>
                <div className="col-name">
                  <ProductSelector
                    value={item.itemname}
                    onChange={(value) => updateItem(index, 'itemname', value)}
                    onProductSelect={(product) => handleProductSelect(index, product)}
                    placeholder="Search products..."
                    disabled={form.isCancelled}
                    showEditMode={true}
                    showFieldEditors={true}
                  />
                </div>
                <div className="col-hsn">
                  <input
                    type="text"
                    value={item.hsnSac}
                    onChange={(e) => updateItem(index, 'hsnSac', e.target.value)}
                  />
                </div>
                <div className="col-qty">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                  />
                </div>
                <div className="col-rate">
                  <input
                    type="number"
                    value={item.rate}
                    onChange={(e) => updateItem(index, 'rate', e.target.value)}
                  />
                </div>
                <div className="col-total">₹{(item.quantity * item.rate).toFixed(2)}</div>
                <div className="col-tax">
                  <input
                    type="number"
                    value={item.taxRate}
                    onChange={(e) => updateItem(index, 'taxRate', e.target.value)}
                  />
                </div>
                <div className="col-action">
                  <button onClick={() => deleteRow(index)}>🗑️</button>
                </div>
              </div>
            ))}
            <button className="add-itemm-btn no-print" onClick={addNewRow} disabled={form.isCancelled}>
              + Add Item
            </button>
          </div>
          <div className="main-bill-section">
            <div className="bill-content">
              <div className="totals-remarks-wrapper">
                <div className="totals-section">
                  <div className="amount-details">
                    <div className="amount-row">
                      <span>Taxable Amount:</span> <span>₹{totals.taxableAmount.toFixed(2)}</span>
                    </div>
                    {form.isOtherState ? (
                      <div className="amount-row">
                        <span>IGST:</span> <span>₹{totals.igstTotal.toFixed(2)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="amount-row">
                          <span>CGST:</span> <span>₹{totals.cgstTotal.toFixed(2)}</span>
                        </div>
                        <div className="amount-row">
                          <span>SGST:</span> <span>₹{totals.sgstTotal.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    <div className="amount-row">
                      <span>Round Off:</span> <span>₹{totals.roundOff.toFixed(2)}</span>
                    </div>
                    <div className="total-amount-row">
                      <span><strong>Grand Total:</strong></span> <span><strong>₹{totals.rounded.toFixed(2)}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="input-group">
                <label>Remarks:</label>
                <textarea
                  value={form.remarks}
                  onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
                  className="form-control cashbill-input"
                  disabled={form.isCancelled}
                />
              </div>
            </div>
          </div>
          <div className="action-buttons no-print">
            <button
              className="btn-successcashsave-btn no-print"
              onClick={saveBill}
              disabled={loading || currentBillId}
            >
              Save
            </button>
         
            <button
              className="btn-primarycashdownload-btn no-print"
              onClick={downloadPDF}
              disabled={loading}
            >
              <i className="fa-solid fa-file-pdf"></i>
            </button>
            <button
              className="btn-primarycashprint-btn no-print"
              onClick={printBill}
              disabled={loading}
            >
              🖨️ Print
            </button>
            <button
              className="btn-primarycashbill-email-btn no-print"
              onClick={sendEmail}
              disabled={loading}
            >
              📧 Email
            </button>
            <button
              className="btn-secondarycashback-btn no-print"
              onClick={() => {
                console.log('Back button clicked');
                navigate(-1);
              }}
              disabled={loading}
            >
              <i className="fa-solid fa-backward"></i>
            </button>
            <button
              className="btn-secondarycashreset-btn no-print"
              onClick={resetForm}
              disabled={loading}
            >
              Reset
            </button>
          </div>
             <div className="futerr">
              <div className="futer-content">
                <div className="left-section">
                  <div className="terms-section">
                    <h4>Terms & Conditions</h4>
                    <div className="terms-content">
                      <p>
                        1. This cash bill is issued as per agreed terms.<br />
                        2. Contact us within 7 days for discrepancies.<br />
                        3. Amount credited can be adjusted against future invoices.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bank-details-section">
                    <h4>Bank Details</h4>
                    <div className="bank-container">
                      <div className="bank-contentcashbill">
                        <p><strong>Company name:</strong> {company.name || 'WYENFOS INFOTECH PRIVATE LIMITED'}</p>
                        <p><strong>Account number:</strong> {bankDetails.accountNumber || '10192468394'}</p>
                        <p><strong>IFSC:</strong> {bankDetails.ifsc || 'IDFB0080732'}</p>
                        <p><strong>SWIFT code:</strong> {bankDetails.swiftCode || 'IDFBINBBMUM'}</p>
                        <p><strong>Bank name:</strong> {bankDetails.bankName || 'IDFC FIRST'}</p>
                        <p><strong>Branch:</strong> {bankDetails.branch || 'THRISSUR - EAST FORT THRISSUR BRANCH'}</p>
                        {bankDetails.upiId && <p><strong>UPI ID:</strong> {bankDetails.upiId}</p>}
                      </div>
                      <div className="qr-code-section">
                        {qrCodeData ? (
                          <QRCodeCanvas 
                            value={qrCodeData} 
                            size={120} 
                            level="H" 
                            includeMargin 
                            className="qr-code"
                          />
                        ) : (
                          <div className="qr-code-placeholder">
                            <div className="qr-placeholder-box">
                              <span>QR</span>
                            </div>
                          </div>
                        )}
                        <p className="qr-code-label">Scan to Pay</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
  
              <div className="signaturee">
                <strong>Authorized Signatory</strong><br />
                <strong>{company.name || ''}</strong>
              </div>
            </div>
          <div className="saved-bills-section no-print">
            <h3>Saved Bills</h3>
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
                    <tr key={bill.id || bill._id || bill.invoiceNumber}>
                      <td>{bill.invoiceNumber}</td>
                      <td>{bill.customerName}</td>
                      <td>{bill.customerId || 'N/A'}</td>
                      <td>{new Date(bill.date).toLocaleDateString('en-IN')}</td>
                      <td>₹{bill.totals?.grandTotal?.toFixed(2) || '0.00'}</td>
                      <td>
                        {editPermissions[bill.id || bill._id] ? (
                          <button className="select-btn no-print" onClick={() => requestEditBill(bill.id || bill._id)}>
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
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default CashBill;