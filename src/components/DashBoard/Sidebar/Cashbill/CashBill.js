import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DOMPurify from 'dompurify';
import { applyPlugin } from 'jspdf-autotable';
import CompanyHeader from '../CompanyHeader/CompanyHeader.js';
import watermark from '../../../../assets/images/watermark.png';
import cancelledWatermark from '../../../../assets/images/cancelled.png';
import { showNotification } from '../utils/showNotification.js';
import './CashBill.css';

applyPlugin(jsPDF);

const userEmail = localStorage.getItem('userEmail') || 'unknown@example.com';
const validCompanies = [
  'WYENFOS INFOTECH',
  'WYENFOS GOLD & DIAMONDS',
  'WYENFOS ADS',
  'WYENFOS CASH VAPASE',
  'WYENFOS AYUR 4 HERBALS India',
  'WYENFOS',
  'WYENFOS PURE DROPS',
];

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

  const [company, setCompany] = useState(location.state?.selectedCompany || {
    name: '',
    address: '',
    GSTIN: '',
    state: '',
    stateCode: '',
    mobile: '',
    email: '',
    website: '',
    logo: null,
    prefix: '',
  });
  const [bankDetails, setBankDetails] = useState({
  bankName: '',
  accountNumber: '',
  ifsc: '',
  swiftCode: '',
  branch: ''
});
  const [billDetails, setBillDetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [savedBills, setSavedBills] = useState([]);
  const [canDelete, setCanDelete] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [editPermissions, setEditPermissions] = useState({});
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingBill, setPendingBill] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [productList, setProductList] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentBillId, setCurrentBillId] = useState(null);
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
  
  try {
    const response = await api.get('/bank-details', {
      params: { companyName: company.name },
    });
    const data = response.data;
    if (data) {
      setBankDetails({
        bankName: data.bankName || '',
        accountNumber: data.accountNumber || '',
        ifsc: data.ifsc || '',
        swiftCode: data.swiftCode || '',
        branch: data.branch || '',
      });
    }
  } catch (error) {
    console.error('Error fetching bank details:', error.response?.data || error.message);
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
          company: company.name,
          prefix,
        },
      });
      console.log('Latest bill number response:', response.data);
      const invoiceNumber = response.data?.invoiceNumber || `${prefix}-1`;
      setForm((prev) => ({
        ...prev,
        invoiceNumber,
      }));
    } catch (error) {
      console.error('Error fetching latest bill number:', error.response?.data, error.message);
      const fallbackInvoice = `${prefix}-1`;
      setForm((prev) => ({
        ...prev,
        invoiceNumber: error.response?.data?.invoiceNumber || fallbackInvoice,
      }));
      setMessage({ type: 'warning', text: 'Failed to fetch latest bill number. Using fallback.' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  }, [company, navigate]);

  const fetchAllBills = async () => {
    setLoading(true);
    try {
      const response = await api.get('/cashbills');
      setSavedBills(response.data.bills || response.data);
    } catch (error) {
      console.error('Error fetching bills:', error);
      setMessage({ type: 'error', text: 'Failed to fetch bills.' });
    } finally {
      setLoading(false);
    }
  };

  const checkUserRole = async () => {
    console.log('Checking user role...');
    setLoading(true);
    try {
      const response = await api.get('/auth/user-role');
      console.log('User role response:', response.data);
      const { isAdmin, EditPermission: editPermissions, canDelete } = response.data;
      setIsAdmin(isAdmin);
      setEditPermissions(editPermissions);
      setCanDelete(canDelete);
    } catch (error) {
      console.error('Error checking user role:', error.response?.data || error.message);
      setMessage({
        type: 'error',
        text: `Failed to verify user role: ${error.response?.data?.error || 'Please try again.'}`,
      });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Initial useEffect: Checking token and permissions');
    const token = localStorage.getItem('token');
    console.log('Token:', token ? 'Present' : 'Missing');
    if (!token) {
      console.error('No token, redirecting to login');
      navigate('/login');
      return;
    }
    fetchAllBills();
    checkUserRole();
    fetchLatestBillNumber();
  }, [fetchLatestBillNumber, navigate]);

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
        const customer = customers[0];
        console.log('getOrGenerateCustomerId: Found customer:', customer);
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

      console.log('getOrGenerateCustomerId: No customer found for:', name);
      setSearchResults([]);
      setMessage({ type: 'info', text: 'No customers found. Click "Create New Customer" to add.' });
      setTimeout(() => setMessage(null), 5000);
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

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/products', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProductList(res.data || []);
      } catch (err) {
        console.error('Error fetching products:', err.response?.data || err);
      }
    };

    fetchProducts();
  }, []);

   useEffect(() => {
    if (!selectedCompany || !selectedCompany.name) {
      console.warn('No company selected, redirecting...');
      navigate('/dashboard');
    }
  }, [selectedCompany, navigate]);

  const requestEditBill = useCallback(
    async (billId) => {
      if (!userEmail) {
        const errorMessage = 'Please log in to request bill edit.';
        setMessage({ type: 'error', text: errorMessage });
        showNotification({ type: 'error', message: errorMessage });
        setTimeout(() => {
          setMessage(null);
          showNotification(null);
        }, 3000);
        return false;
      }

      try {
        const response = await api.get(`/cashbills/${billId}`);
        const bill = response.data;
        if (editPermissions[bill.invoiceNumber] || isAdmin) {
          const updatedForm = {
            ...form,
            customerId: bill.customerId || '',
            customerName: bill.customerName || '',
            customerContact: {
              address: bill.customerAddress || '',
              phone: bill.customerContact?.phone || '',
              email: bill.customerEmail || '',
              gstin: bill.customerGSTIN || '',
            },
            invoiceNumber: bill.invoiceNumber || '',
            date: bill.date ? new Date(bill.date).toISOString().slice(0, 10) : '',
            items: (bill.items || []).map((item) => ({
              code: item.code || '',
              itemname: item.itemname || '',
              hsnSac: item.hsnSac || '',
              quantity: item.quantity?.toString() || '1',
              unit: item.unit || 'Nos',
              rate: item.rate?.toString() || '0',
              taxRate: item.taxRate?.toString() || '18',
            })),
            paymentTerms: bill.paymentDetails?.mode || 'Cash',
            isOtherState: bill.isOtherState || false,
            remarks: bill.remarks || '',
            isCancelled: bill.cancelled || false,
          };

          setForm(updatedForm);
          setCurrentBillId(bill._id);
          setErrors({
            customerId: '',
            customerName: '',
            email: '',
            phone: '',
            gstin: '',
            items: updatedForm.items.map(() => ({
              code: '',
              itemname: '',
              hsnSac: '',
              rate: '',
              taxRate: '',
            })),
          });
          return true;
        }

        showNotification({
          type: 'info',
          message: `Edit request for bill ${bill.invoiceNumber} by ${userEmail} sent to admin for approval.`,
        });
        setPendingAction('edit');
        setPendingBill(bill);
        await api.post('/notifications/edit-request', {
          invoiceNo: bill.invoiceNumber,
          userEmail,
          updatedBillData: bill,
          requestedAt: new Date().toISOString(),
        });

        const successMessage = `Edit request for bill ${bill.invoiceNumber} sent to admin.`;
        setMessage({ type: 'success', text: successMessage });
        showNotification({ type: 'success', message: successMessage });
        setTimeout(() => {
          setMessage(null);
          showNotification(null);
        }, 3000);
        return true;
      } catch (error) {
        console.error('Edit Request Error:', error.response?.data, error.response?.status);
        const errorMessage = `Failed to send edit request: ${error.response?.data?.message || error.message}`;
        setMessage({ type: 'error', text: errorMessage });
        showNotification({ type: 'error', message: errorMessage });
        setTimeout(() => {
          setMessage(null);
          showNotification(null);
        }, 3000);
        return false;
      }
    },
    [editPermissions, isAdmin, form]
  );

  const requestDeleteBill = useCallback(
    async (invoiceNo) => {
      if (!userEmail) {
        const errorMessage = 'Please log in to request bill deletion.';
        setMessage({ type: 'error', text: errorMessage });
        showNotification({ type: 'error', message: errorMessage });
        setTimeout(() => {
          setMessage(null);
          showNotification(null);
        }, 3000);
        return false;
      }

      try {
        showNotification({
          type: 'info',
          message: `Delete request for bill ${invoiceNo} by ${userEmail} sent to admin for approval.`,
        });
        setPendingAction('delete');
        setPendingBill({ invoiceNo });
        await api.post('/notifications/delete-request', {
          invoiceNo,
          userEmail,
          requestedAt: new Date().toISOString(),
        });

        const successMessage = `Delete request for bill ${invoiceNo} sent to admin.`;
        setMessage({ type: 'success', text: successMessage });
        showNotification({ type: 'success', message: successMessage });
        setTimeout(() => {
          setMessage(null);
          showNotification(null);
        }, 3000);
        return true;
      } catch (error) {
        console.error('Delete Request Error:', error.response?.data, error.response?.status);
        const errorMessage = `Failed to send delete request: ${error.response?.data?.message || error.message}`;
        setMessage({ type: 'error', text: errorMessage });
        showNotification({ type: 'error', message: errorMessage });
        setTimeout(() => {
          setMessage(null);
          showNotification(null);
        }, 3000);
        return false;
      }
    },
    []
  );

  const handlePermissionResponse = useCallback(
    (approved) => {
      if (!pendingBill || !pendingAction) return;

      if (approved) {
        if (pendingAction === 'edit') {
          requestEditBill(pendingBill._id);
          setMessage({
            type: 'success',
            text: `Edit permission for bill ${pendingBill.invoiceNo} approved.`,
          });
        } else if (pendingAction === 'delete') {
          requestDeleteBill(pendingBill.invoiceNo);
          setMessage({
            type: 'success',
            text: `Delete permission for bill ${pendingBill.invoiceNo} approved.`,
          });
        }
      } else {
        setMessage({
          type: 'error',
          text: `Permission for ${pendingAction} on bill ${pendingBill.invoiceNo} denied.`,
        });
      }

      setPendingAction(null);
      setPendingBill(null);
      setPermissionStatus(null);
      setTimeout(() => setMessage(null), 3000);
    },
    [pendingBill, pendingAction, requestEditBill, requestDeleteBill]
  );

  useEffect(() => {
    let intervalId;
    if (pendingAction && pendingBill) {
      intervalId = setInterval(async () => {
        try {
          const response = await api.get('/notifications/check-permission', {
            params: { invoiceNo: pendingBill.invoiceNo, userEmail },
          });
          const { status } = response.data;
          setPermissionStatus(status);
          if (status === 'approved') {
            handlePermissionResponse(true);
            clearInterval(intervalId);
          } else if (status === 'denied') {
            handlePermissionResponse(false);
            clearInterval(intervalId);
          }
        } catch (error) {
          console.error('Check Permission Error:', error);
        }
      }, 5000);
    }
    return () => clearInterval(intervalId);
  }, [pendingAction, pendingBill, handlePermissionResponse]);

  const fetchCustomerByContact = async (field, value) => {
    if (!value) return null;
    try {
      const response = await api.get('/customers/find', {
        params: { query: value, company: company.name },
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
    if (!currentBillId && value) {
      const customer = await fetchCustomerByContact('name', value);
      if (customer) {
        console.log('Found customer:', customer);
        setForm((prev) => ({
          ...prev,
          customerId: customer.customerId || '',
        }));
        setErrors((prev) => ({
          ...prev,
          customerId: customer.customerId && typeof customer.customerId === 'string' && customer.customerId.match(/^CUST\d+$/) ? '' : 'Customer ID must be in format CUST{number}',
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
        const selectedProduct = productList.find((p) => p.itemName === value);
        if (selectedProduct) {
          newItems[index] = {
            ...newItems[index],
            itemname: selectedProduct.itemName,
            code: selectedProduct.itemCode || '',
            hsnSac: selectedProduct.hsn || '',
            rate: selectedProduct.unitPrice || 0,
            taxRate: selectedProduct.gst || 18,
          };
        } else {
          newItems[index] = { ...newItems[index], itemname: value };
        }
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
    if (!customerId) {
      console.log('No customerId found, creating new customer:', form.customerName);
      try {
        customerId = await createNewCustomer(form.customerName);
        if (!customerId) {
          throw new Error('Failed to create customer');
        }
        setForm((prev) => ({ ...prev, customerId }));
        console.log('Updated form with new customerId:', customerId);
        await new Promise((resolve) => setTimeout(resolve, 0));
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
      if (!customerId.match(/^CUST\d+$/)) {
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

    setLoading(true);
    try {
      console.log('Preparing bill data with customerId:', customerId);
      const totals = calculateTotal();
      const billData = {
        ...form,
        customerId,
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
      const payload = {
        customerName: sanitizeInput(name),
        customerContact: form.customerContact,
        company,
        createdBy: userEmail,
        lastUpdatedBy: userEmail,
      };
      console.log('createNewCustomer: Sending payload:', JSON.stringify(payload, null, 2));
      const response = await api.post('/customers', payload);
      console.log('createNewCustomer: Created new customer:', response.data);
      const newCustomer = response.data;
      setForm((prev) => ({
        ...prev,
        customerId: newCustomer.customerId || '',
        customerName: newCustomer.customerName || '',
        customerContact: newCustomer.customerContact || { address: '', phone: '', email: '', gstin: '' },
      }));
      setMessage({ type: 'success', text: `Customer created: ${newCustomer.customerName} (${newCustomer.customerId})` });
      setTimeout(() => setMessage(null), 3000);
      setCustomerSearch('');
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

  const updateBill = async () => {
    console.log('Update button clicked, currentBillId:', currentBillId);
    if (!currentBillId) {
      alert('No bill selected for updating.');
      return false;
    }
    if (!isAdmin && !editPermissions) {
      alert('You do not have permission to update bills. Please request admin approval.');
      return false;
    }
    if (!validateForm()) {
      alert('Please fix the validation errors.');
      return false;
    }
    setLoading(true);
    try {
      if (!userEmail) {
        setMessage({ type: 'error', text: 'User email not found. Please log in again.' });
        navigate('/login');
        return false;
      }
      const totals = calculateTotal();
      const billData = {
        ...form,
        customerId: form.customerId,
        customerAddress: form.customerContact.address,
        customerGSTIN: form.customerContact.gstin,
        items: form.items.map((item) => ({
          code: item.code,
          itemname: item.itemname,
          hsnSac: item.hsnSac,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          taxableValue: item.quantity * item.rate,
          taxRate: item.taxRate !== '' ? parseFloat(item.taxRate) : 18,
          cgstRate: !form.isOtherState ? parseFloat(item.taxRate) / 2 : 0,
          cgstAmount: !form.isOtherState ? (item.quantity * item.rate * (parseFloat(item.taxRate) / 100)) / 2 : 0,
          sgstRate: !form.isOtherState ? parseFloat(item.taxRate) / 2 : 0,
          sgstAmount: !form.isOtherState ? (item.quantity * item.rate * (parseFloat(item.taxRate) / 100)) / 2 : 0,
          igstRate: form.isOtherState ? item.taxRate : 0,
          igstAmount: form.isOtherState ? item.quantity * item.rate * (parseFloat(item.taxRate) / 100) : 0,
        })),
        totals: {
          taxableAmount: totals.taxableAmount,
          cgstTotal: totals.cgstTotal,
          sgstTotal: totals.sgstTotal,
          igstTotal: totals.igstTotal,
          grandTotal: totals.grandTotal,
          roundOff: totals.roundOff,
        },
        paymentDetails: {
          mode: form.paymentTerms,
          status: 'Paid',
        },
        date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
        company,
        lastUpdatedBy: userEmail,
        cancelled: form.isCancelled,
        cancellationReason: form.isCancelled ? form.remarks || 'Cancelled' : '',
      };
      console.log('Updating bill with data:', JSON.stringify(billData, null, 2));
      const response = await api.put(`/cashbills/${currentBillId}`, billData);
      console.log('Update bill response:', response.data);
      fetchAllBills();
      setForm((prev) => ({
        ...prev,
        customerId: response.data.customerId || '',
      }));
      setMessage({ type: 'success', text: `Bill updated successfully! Customer ID: ${response.data.customerId || 'N/A'}` });
      alert(`Bill updated successfully! Customer ID: ${response.data.customerId || 'N/A'}`);
      return true;
    } catch (error) {
      console.error('Failed to update bill:', error.response?.data || error.message);
      setMessage({
        type: 'error',
        text: `Failed to update bill: ${error.response?.data?.error || 'Please try again.'}`,
      });
      return false;
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
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

    const logo = company.logo;
    let logoBase64 = null;
    if (logo && typeof logo === 'string') {
      try {
        logoBase64 = await loadImageAsBase64(logo);
      } catch (error) {
        console.error('Failed to load logo:', error);
      }
    }
    const watermarkBase64 = await loadImageAsBase64(watermark);
    const cancelledWatermarkBase64 = await loadImageAsBase64(cancelledWatermark);
    const logoWidth = 30;
    const logoHeight = 28;
    const logoY = y;
    let textX = margin + logoWidth + 5;
    let textY = y;

    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', margin, logoY, logoWidth, logoHeight);
    } else {
      textX = margin;
    }

    if (watermarkBase64) {
      doc.setGState(new doc.GState({ opacity: 0.1 }));
      doc.addImage(watermarkBase64, 'PNG', pageWidth / 2 - 50, pageHeight / 2 - 50, 100, 100);
      doc.setGState(new doc.GState({ opacity: 1 }));
    }

    if (form.isCancelled && cancelledWatermarkBase64) {
      doc.setGState(new doc.GState({ opacity: 0.4 }));
      doc.addImage(cancelledWatermarkBase64, 'PNG', pageWidth / 2 - 50, pageHeight / 2 - 50, 100, 100);
      doc.setGState(new doc.GState({ opacity: 1 }));
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(company.name || 'WYENFOS BILLS', textX, textY);
    textY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Address: ${company.address}`, textX, textY);
    textY += 6;
    doc.text(`Mobile: ${company.mobile}`, textX, textY);
    textY += 6;
    doc.text(`Email: ${company.email}`, textX, textY);
    textY += 6;
    doc.text(`Website: ${company.website}`, textX, textY);
    textY += 6;
    doc.text(`GSTIN: ${company.GSTIN}`, textX, textY);
    textY += 6;
    doc.text(`State: ${company.state} (Code: ${company.stateCode})`, textX, textY);

    y += logoHeight + 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('CASH BILL', pageWidth / 2, y, { align: 'center' });

    y += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Bill No: ${form.invoiceNumber || 'Pending'}`, margin, y);
    doc.text(`Date: ${new Date(form.date).toLocaleDateString('en-IN')}`, pageWidth - margin, y, { align: 'right' });

    y += 8;

    const leftData = [
      ['Customer ID:', form.customerId || 'N/A'],
      ['Name:', form.customerName || 'N/A'],
      ['Date:', new Date(form.date).toLocaleDateString('en-IN')],
      ['Address:', form.customerContact.address || 'N/A'],
    ];

    const rightData = [
      ['Phone:', form.customerContact.phone || 'N/A'],
      ['Email:', form.customerContact.email || 'N/A'],
      ['GSTIN:', form.customerContact.gstin || 'N/A'],
      ['Payment Method:', form.paymentTerms || 'N/A'],
    ];

    for (let i = 0; i < leftData.length; i++) {
      const yLine = y + i * 6;
      doc.setFont('helvetica', 'bold');
      doc.text(leftData[i][0], margin, yLine);
      doc.text(rightData[i][0], pageWidth / 2 + 5, yLine);
      doc.setFont('helvetica', 'normal');
      doc.text(leftData[i][1], margin + 40, yLine);
      doc.text(rightData[i][1], pageWidth / 2 + 45, yLine);
    }

    y += Math.max(leftData.length, rightData.length) * 6 + 4;

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

    doc.setFont('helvetica', 'bold');
    doc.text('Bank Details', margin, yPos);
    doc.setFont('helvetica', 'normal');

    const bankDetails = [
      'Company name: WYENFOS INFOTECH PRIVATE LIMITED',
      'Account number: 10192468394',
      'IFSC: IDFB0080732',
      'SWIFT code: IDFBINBBMUM',
      'Bank name: IDFC FIRST',
      'Branch: THRISSUR - EAST FORT THRISSUR BRANCH',
    ];
    bankDetails.forEach((line, i) => doc.text(line, margin, yPos + 6 + (i + 1) * 6));
    yPos += 6 * bankDetails.length;

    const signatureX = pageWidth - margin;
    doc.setFont('helvetica', 'bold');
    doc.text('Authorized Signatory', signatureX, yPos, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(company.name || '', signatureX, yPos + 6, { align: 'right' });

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
    if (!validateForm()) {
      alert('Please fix validation errors');
      return;
    }
    if (!form.customerContact.email) {
      alert('Customer email required');
      return;
    }
    setLoading(true);
    try {
      const pdfBlob = await generatePDF(true);
      if (!pdfBlob) throw new Error('PDF generation failed');
      const base64Pdf = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read PDF blob'));
        reader.readAsDataURL(pdfBlob);
      });
      await api.post('/cashbills/send-email', {
        emailTo: form.customerContact.email,
        subject: `Cash Bill #${form.invoiceNumber} - ${company.name || ''}`,
        body: `
          <p>Dear ${form.customerName},</p>
          <p>Please find attached your cash bill from ${company.name || ''}.</p>
          <p><strong>Bill Details:</strong></p>
          <ul>
            <li>Bill Number: ${form.invoiceNumber}</li>
            <li>Customer ID: ${form.customerId}</li>
            <li>Date: ${form.date}</li>
            <li>Grand Total: ₹${calculateTotal().rounded.toFixed(2)}</li>
          </ul>
          <p>Thank you for your business!</p>
          <p>Best regards,<br>${company.name || ''}</p>
        `,
        pdfBase64: base64Pdf,
      });
      setMessage({ type: 'success', text: 'Email sent successfully!' });
    } catch (error) {
      console.error('Failed to send email:', error.response?.data || error.message);
      setMessage({
        type: 'error',
        text: `Failed to send email: ${error.response?.data?.error || error.message}`,
      });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const printBill = () => {
    console.log('Print button clicked');
    alert('Ensure "Background graphics" is enabled in the print dialog.');
    setTimeout(() => window.print(), 500);
  };

  const dateObj = form.date ? new Date(form.date) : new Date();
  const formattedDate = dateObj.toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

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
        <div className="cashbillinvoice-container">
          {permissionStatus && (
            <div className="permission-status">
              Permission Status: {permissionStatus}
            </div>
          )}
          <div className="bill-header">
            <CompanyHeader
                 billType="CASH_BILL"
                 billDetails={billDetails}
                 selectedCompany={selectedCompany}
                 showBankDetails={true}
               />
          </div>
          <hr className="invoice-divider" />
          {message && <div className={`message ${message.type}`}>{message.text}</div>}
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
                    {customer.customerId} - {customer.customerName} ({customer.company.join(', ')})
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
                  placeholder: 'Customer ID (e.g., CUST1)',
                  required: true,
                  pattern: '^CUST\\d+$',
                  errorMessage: 'Must be in format CUST followed by numbers',
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
                        updateCustomerName(value);
                      } else if (field === 'date') {
                        setForm((prev) => ({ ...prev, [field]: value }));
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
                    onChange={(e) => updateItem(index, 'code', e.target.value)}
                  />
                </div>
                <div className="col-name">
                  <input
                    type="text"
                    value={item.itemname}
                    onChange={(e) => updateItem(index, 'itemname', e.target.value)}
                    list={`product-options-${index}`}
                    placeholder="Item Name"
                  />
                  <datalist id={`product-options-${index}`}>
                    {productList.map((p) => (
                      <option key={p._id} value={p.itemName} />
                    ))}
                  </datalist>
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
              className="btn-primarycashupdate-btn no-print"
              onClick={updateBill}
              disabled={loading || !currentBillId}
            >
              Update
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
             <div className="footerr">
              <h4>Terms & Conditions</h4>
                     <p>
                        1. This cash bill is issued as per agreed terms.<br />
                        2. Contact us within 7 days for discrepancies.<br />
                        3. Amount credited can be adjusted against future invoices.
                     </p>
  
                  <div className="footer-bottom-section">
                  <div className="bank-details">
                  <h4>Bank Details</h4>
      <p>
        <strong>Company name:</strong> {company.name || 'WYENFOS INFOTECH PRIVATE LIMITED'}<br />
        <strong>Account number:</strong> {bankDetails.accountNumber || '10192468394'}<br />
        <strong>IFSC:</strong> {bankDetails.ifsc || 'IDFB0080732'}<br />
        <strong>SWIFT code:</strong> {bankDetails.swiftCode || 'IDFBINBBMUM'}<br />
        <strong>Bank name:</strong> {bankDetails.bankName || 'IDFC FIRST'}<br />
        <strong>Branch:</strong> {bankDetails.branch || 'THRISSUR - EAST FORT THRISSUR BRANCH'}
      </p>
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
                    <tr key={bill._id || bill.invoiceNumber}>
                      <td>{bill.invoiceNumber}</td>
                      <td>{bill.customerName}</td>
                      <td>{bill.customerId || 'N/A'}</td>
                      <td>{new Date(bill.date).toLocaleDateString('en-IN')}</td>
                      <td>₹{bill.totals?.grandTotal?.toFixed(2) || '0.00'}</td>
                      <td>
                        <button className="select-btn no-print" onClick={() => requestEditBill(bill._id)}>Edit</button>
                        {canDelete && (
                          <button className="btn-danger no-print" onClick={() => requestDeleteBill(bill._id)}>Delete</button>
                        )}
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