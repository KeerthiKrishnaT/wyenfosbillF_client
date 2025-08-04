import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import DOMPurify from 'dompurify';
import CompanyHeader from '../CompanyHeader/CompanyHeader';
import cancelledWatermark from '../../../../assets/images/cancelled.png';
import './CreditNote.css';
import axios from 'axios';
import { showNotification } from '../utils/showNotification.js';
import debounce from 'lodash.debounce';

const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAgAB/1TK5vYAAAAASUVORK5CYII=';

const validCompanies = [
  'WYENFOS INFOTECH',
  'WYENFOS GOLD & DIAMONDS',
  'WYENFOS ADS',
  'WYENFOS CASH VAPASE',
  'WYENFOS',
];

const getCompanyPrefix = (company) => {
    const prefixes = {
      'WYENFOS INFOTECH': 'WIT',
      'WYENFOS GOLD & DIAMONDS': 'WGD',
      'WYENFOS ADS': 'WAD',
      'WYENFOS CASH VAPASE': 'WCV',
      'WYENFOS': 'WNF',
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
  const selectedCompany = state?.selectedCompany || 'WYENFOS';
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
    items: [{ name: '', itemCode: '', hsnCode: '', quantity: 1, rate: 0, returnQty: 0 }],
    paymentMode: 'Cash',
    company: {
      name: selectedCompany,
      address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
      GSTIN: '32AAFCW8945G1ZQ',
      state: 'Kerala',
      stateCode: '32',
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
  const [billType, setBillType] = useState('CashBill');
  const [invoiceId, setInvoiceId] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [, setSearchResults] = useState([]);
  const [productList, setProductList] = useState([]);
  const [isCustomerLoading, setIsCustomerLoading] = useState(false);  const [errors, setErrors] = useState({
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

  const sanitizeInput = useCallback((input) => DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }), []);

const fetchLatestCreditNoteNumber = useCallback(async () => {
  setLoading(true);
  try {
    const companyPrefix = getCompanyPrefix(selectedCompany);

    const response = await api.get('/creditnotes/latest-invoice', {
      params: {
        company: selectedCompany,
        prefix: companyPrefix,
      },
    });

    const latestNumber = response.data?.invoiceNumber;

    // If backend sends something like "WIT-5", we increment it to "WIT-6"
    let nextInvoiceNumber;
    if (latestNumber && latestNumber.startsWith(companyPrefix)) {
      const lastNumber = parseInt(latestNumber.split('-')[1]) || 0;
      nextInvoiceNumber = `${companyPrefix}-${lastNumber + 1}`;
    } else {
      nextInvoiceNumber = `${companyPrefix}-1`;
    }

    setCreditNoteNumber(nextInvoiceNumber);
  } catch (error) {
    console.error('Error fetching latest credit note number:', error);
    const fallback = `${getCompanyPrefix(selectedCompany)}-1`;
    setCreditNoteNumber(fallback);
  } finally {
    setLoading(false);
  }
}, [selectedCompany]);


  const fetchCustomers = async () => {
  try {
    const response = await api.get('/customers');
    setCustomers(response.data || []);
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    setErrors((prev) => ({ ...prev, general: 'Failed to fetch customers' }));
  }
};

useEffect(() => {
  const getCreditNoteById = async (noteId) => {
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
      setCreditNoteNumber(note.invoiceNumber || fetchLatestCreditNoteNumber());
    } catch (error) {
      console.error('Error fetching credit note:', error);
      setErrors((prev) => ({ ...prev, general: `Failed to load credit note with ID ${noteId}.` }));
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      if (!validCompanies.includes(selectedCompany)) {
        throw new Error(`Invalid company: ${selectedCompany}`);
      }
      await fetchLatestCreditNoteNumber();
      await fetchCustomers();
      await fetchAllCreditNotes();
      if (id) {
        await getCreditNoteById(id);
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, general: `Failed to load data: ${err.message}` }));
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, [id, selectedCompany, fetchLatestCreditNoteNumber, userEmail]); 


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
}, [customerSearch, debouncedSearch, setSearchResults]);

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

  const fetchAllCreditNotes = async () => {
  try {
    const response = await api.get('/creditnotes');
    setSavedCreditNotes(response.data);
  } catch (error) {
    console.error('Error fetching all credit notes:', error);
    setErrors((prev) => ({ ...prev, general: 'Failed to fetch saved credit notes.' }));
  }
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

  useEffect(() => {
  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProductList(response.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setErrors((prev) => ({ ...prev, general: 'Failed to fetch products' }));
    }
  };
  fetchProducts();
}, []);

  const handleItemChange = (index, field, value) => {
  const sanitizedValue = field === 'quantity' || field === 'rate' || field === 'returnQty' ? value : sanitizeInput(value);
  const updatedItems = [...form.items];
  
  if (field === 'name') {
    const selectedProduct = productList.find((p) => p.itemName === value);
    if (selectedProduct) {
      updatedItems[index] = {
        ...updatedItems[index],
        name: selectedProduct.itemName,
        itemCode: selectedProduct.itemCode || '',
        hsnCode: selectedProduct.hsn || '',
        rate: selectedProduct.unitPrice || 0,
      };
    } else {
      updatedItems[index] = { ...updatedItems[index], [field]: sanitizedValue };
    }
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

  const validateForm = () => {
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
  };

  const getAmount = (item) => item.quantity * item.rate;
  const subtotal = form.items.reduce((sum, item) => sum + getAmount(item), 0);
  const taxRate = 0.18;
  const cgst = taxType === 'cgst_sgst' ? subtotal * (taxRate / 2) : 0;
  const sgst = taxType === 'cgst_sgst' ? subtotal * (taxRate / 2) : 0;
  const igst = taxType === 'igst' ? subtotal * taxRate : 0;
  const totalTax = cgst + sgst + igst;
  const total = subtotal + totalTax;
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
        cgst,
        sgst,
        igst,
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

  const deleteCreditNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this credit note?')) return;
    setLoading(true);
    try {
      if (!['Accounts Admin', 'Super Admin'].includes(userRole)) {
        showNotification('You do not have permission to perform this action.', 'error');
        return;
      }
      await api.delete(`/creditnotes/${noteId}`);
      await fetchAllCreditNotes();
      showNotification('Success', 'Credit note deleted successfully!');
    } catch (error) {
      console.error('Error deleting credit note:', error);
      setErrors((prev) => ({ ...prev, general: error.response?.data?.message || 'Failed to delete credit note.' }));
    } finally {
      setLoading(false);
    }
  };

  const editCreditNote = (noteId) => {
    if (!['Accounts Admin', 'Super Admin'].includes(userRole)) {
      showNotification('You do not have permission to perform this action.', 'error');
      return;
    }
    navigate(`/creditnote/${noteId}`, { state: { selectedCompany } });
  };

  const generatePDF = () => {
    if (!validateForm()) {
      setErrors((prev) => ({ ...prev, general: 'Please correct the form errors before generating PDF.' }));
      return;
    }
    setLoading(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      try {
        doc.addImage(logoBase64, 'PNG', 10, 10, 25, 0);
      } catch (imgError) {
        console.error('Failed to add logo to PDF:', imgError);
        setErrors((prev) => ({ ...prev, general: 'Failed to add logo to PDF.' }));
      }

      doc.setFontSize(40);
      doc.setTextColor(200, 200, 200);
      doc.text('Wyenfos Bills', 105, 148, { align: 'center' });
      if (isCancelled) {
        doc.setFontSize(50);
        doc.setTextColor(255, 0, 0, 0.5);
        doc.text('CANCELLED', 105, 148, { align: 'center', angle: 45 });
      }

      doc.setFontSize(16);
      doc.setTextColor(179, 158, 181);
      doc.text(`CREDIT NOTE${isCancelled ? ' (CANCELLED)' : ''}`, 190, 15, { align: 'right' });
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Note No: ${creditNoteNumber}`, 190, 25, { align: 'right' });
      doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 190, 30, { align: 'right' });

      doc.setFontSize(12);
      doc.text(selectedCompany, 40, 15);
      doc.setFontSize(10);
      doc.text('Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001', 40, 20);
      doc.text('Mobile: 8547014116 | Email: wyenfos@gmail.com', 40, 25);
      doc.text('Website: www.wyenfos.com', 40, 30);

      doc.setFontSize(10);
      doc.text('Customer Details:', 10, 50);
      doc.text(`Customer ID: ${form.customerId}`, 10, 55);
      doc.text(`Name: ${form.customerName}`, 10, 60);
      if (form.customerEmail) doc.text(`Email: ${form.customerEmail}`, 10, 65);
      if (form.customerPhone) doc.text(`Phone: ${form.customerPhone}`, 10, 70);
      doc.text(`Reason: ${form.reason}`, 10, 75);

      doc.setFontSize(10);
      doc.setFillColor(179, 158, 181);
      doc.rect(10, 90, 190, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('#', 12, 95);
      doc.text('Item Code', 20, 95);
      doc.text('HSN Code', 40, 95);
      doc.text('Description', 60, 95);
      doc.text('Quantity', 120, 95);
      doc.text('Rate', 150, 95);
      doc.text('Amount', 180, 95);
      doc.setTextColor(0, 0, 0);
      let y = 103;
      form.items.forEach((item, index) => {
        doc.text(`${index + 1}`, 12, y);
        doc.text(item.itemCode, 20, y);
        doc.text(item.hsnCode, 40, y);
        doc.text(item.name, 60, y);
        doc.text(`${item.quantity}`, 120, y);
        doc.text(`₹${item.rate.toFixed(2)}`, 150, y);
        doc.text(`₹${getAmount(item).toFixed(2)}`, 180, y);
        y += 8;
      });

      if (notes) {
        y += 10;
        doc.text('Notes:', 10, y);
        y += 5;
        const wrappedNotes = doc.splitTextToSize(notes, 180);
        doc.text(wrappedNotes, 10, y);
        y += wrappedNotes.length * 5;
      }

      y += 10;
      doc.text(`Subtotal: ₹${subtotal.toFixed(2)}`, 180, y);
      y += 5;
      if (taxType === 'cgst_sgst') {
        doc.text(`CGST (9%): ₹${cgst.toFixed(2)}`, 180, y);
        y += 5;
        doc.text(`SGST (9%): ₹${sgst.toFixed(2)}`, 180, y);
        y += 5;
      } else {
        doc.text(`IGST (18%): ₹${igst.toFixed(2)}`, 180, y);
        y += 5;
      }
      doc.text(`Round Off: ₹${roundOff.toFixed(2)}`, 180, y);
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.text(`Total: ₹${rounded.toFixed(2)}`, 180, y);
      doc.setFont('helvetica', 'normal');
      if (isCancelled) {
        y += 5;
        doc.text('Status: Cancelled', 180, y);
      }

      y += 20;
      doc.setTextColor(179, 158, 181);
      doc.text('Terms & Conditions', 10, y);
      doc.setTextColor(0, 0, 0);
      y += 5;
      doc.text('1. This credit note is issued as per agreed terms.', 10, y);
      y += 5;
      doc.text('2. Refund or adjustment to be processed within 7 days.', 10, y);
      y += 5;
      doc.text('3. Contact us for any discrepancies.', 10, y);
      y += 10;
      doc.setTextColor(179, 158, 181);
      doc.text('Bank Details', 10, y);
      doc.setTextColor(0, 0, 0);
      y += 5;
      doc.text('Company name: WYENFOS INFOTECH PRIVATE LIMITED', 10, y);
      y += 5;
      doc.text('Account number: 10192468394', 10, y);
      y += 5;
      doc.text('IFSC: IDFB0080732', 10, y);
      y += 5;
      doc.text('SWIFT code: IDFBINBBMUM', 10, y);
      y += 5;
      doc.text('Bank name: IDFC FIRST', 10, y);
      y += 5;
      doc.text('Branch: THRISSUR - EAST FORT THRISSUR BRANCH', 10, y);
      doc.text('Authorized Signatory', 150, y - 30);
      doc.text(selectedCompany, 150, y - 25);

      doc.save(`credit_note_${creditNoteNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setErrors((prev) => ({ ...prev, general: 'Failed to generate PDF.' }));
    } finally {
      setLoading(false);
    }
  };

  const printNote = () => {
    if (!validateForm()) {
      setErrors((prev) => ({ ...prev, general: 'Please correct the form errors before printing.' }));
      return;
    }
    setLoading(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      try {
        doc.addImage(logoBase64, 'PNG', 10, 10, 21, 0);
      } catch (imgError) {
        console.error('Failed to add logo to PDF:', imgError);
        setErrors((prev) => ({ ...prev, general: 'Failed to add logo to PDF.' }));
      }

      doc.setFontSize(40);
      doc.setTextColor(200, 200, 200);
      doc.text('Wyenfos Bills', 105, 148, { align: 'center' });
      if (isCancelled) {
        doc.setFontSize(50);
        doc.setTextColor(255, 0, 0, 0.5);
        doc.text('CANCELLED', 105, 148, { align: 'center', angle: 45 });
      }

      doc.setFontSize(16);
      doc.setTextColor(179, 158, 181);
      doc.text(`CREDIT NOTE${isCancelled ? ' (CANCELLED)' : ''}`, 105, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Note No: ${creditNoteNumber}`, 190, 30, { align: 'right' });
      doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 190, 35, { align: 'right' });

      doc.setFontSize(12);
      doc.text(selectedCompany, 35, 20);
      doc.setFontSize(10);
      doc.text('Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001', 35, 25);
      doc.text('Mobile: 8547014116 | Email: wyenfos@gmail.com', 35, 30);
      doc.text('Website: www.wyenfos.com', 35, 35);

      doc.setFontSize(10);
      doc.text('Customer Details:', 10, 50);
      doc.text(`Customer ID: ${form.customerId}`, 10, 55);
      doc.text(`Name: ${form.customerName}`, 10, 60);
      if (form.customerEmail) doc.text(`Email: ${form.customerEmail}`, 10, 65);
      if (form.customerPhone) doc.text(`Phone: ${form.customerPhone}`, 10, 70);
      doc.text(`Reason: ${form.reason}`, 10, 75);

      doc.setFontSize(10);
      doc.setFillColor(179, 158, 181);
      doc.rect(10, 90, 190, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('#', 12, 95);
      doc.text('Item Code', 20, 95);
      doc.text('HSN Code', 40, 95);
      doc.text('Description', 60, 95);
      doc.text('Quantity', 120, 95);
      doc.text('Rate', 150, 95);
      doc.text('Amount', 180, 95);
      doc.setTextColor(0, 0, 0);
      let y = 103;
      form.items.forEach((item, index) => {
        doc.text(`${index + 1}`, 12, y);
        doc.text(item.itemCode, 20, y);
        doc.text(item.hsnCode, 40, y);
        doc.text(item.name, 60, y);
        doc.text(`${item.quantity}`, 120, y);
        doc.text(`₹${item.rate.toFixed(2)}`, 150, y);
        doc.text(`₹${getAmount(item).toFixed(2)}`, 180, y);
        y += 8;
      });

      if (notes) {
        y += 10;
        doc.text('Notes:', 10, y);
        y += 5;
        const wrappedNotes = doc.splitTextToSize(notes, 180);
        doc.text(wrappedNotes, 10, y);
        y += wrappedNotes.length * 5;
      }

      y += 10;
      doc.text(`Subtotal: ₹${subtotal.toFixed(2)}`, 180, y);
      y += 5;
      if (taxType === 'cgst_sgst') {
        doc.text(`CGST (9%): ₹${cgst.toFixed(2)}`, 180, y);
        y += 5;
        doc.text(`SGST (9%): ₹${sgst.toFixed(2)}`, 180, y);
        y += 5;
      } else {
        doc.text(`IGST (18%): ₹${igst.toFixed(2)}`, 180, y);
        y += 5;
      }
      doc.text(`Round Off: ₹${roundOff.toFixed(2)}`, 180, y);
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.text(`Total: ₹${rounded.toFixed(2)}`, 180, y);
      doc.setFont('helvetica', 'normal');
      if (isCancelled) {
        y += 5;
        doc.text('Status: Cancelled', 180, y);
      }

      y += 20;
      doc.setTextColor(179, 158, 181);
      doc.text('Terms & Conditions', 10, y);
      doc.setTextColor(0, 0, 0);
      y += 5;
      doc.text('1. This credit note is issued as per agreed terms.', 10, y);
      y += 5;
      doc.text('2. Refund or adjustment to be processed within 7 days.', 10, y);
      y += 5;
      doc.text('3. Contact us for any discrepancies.', 10, y);
      y += 10;
      doc.setTextColor(179, 158, 181);
      doc.text('Bank Details', 10, y);
      doc.setTextColor(0, 0, 0);
      y += 5;
      doc.text('Company name: WYENFOS INFOTECH PRIVATE LIMITED', 10, y);
      y += 5;
      doc.text('Account number: 10192468394', 10, y);
      y += 5;
      doc.text('IFSC: IDFB0080732', 10, y);
      y += 5;
      doc.text('SWIFT code: IDFBINBBMUM', 10, y);
      y += 5;
      doc.text('Bank name: IDFC FIRST', 10, y);
      y += 5;
      doc.text('Branch: THRISSUR - EAST FORT THRISSUR BRANCH', 10, y);
      doc.text('Authorized Signatory', 150, y - 30);
      doc.text(selectedCompany, 150, y - 25);

      const pdfBlob = doc.output('blob');
      const url = window.URL.createObjectURL(pdfBlob);
      const pdfWindow = window.open(url);
      if (pdfWindow) {
        pdfWindow.onload = () => {
          pdfWindow.print();
          setTimeout(() => window.URL.revokeObjectURL(url), 100);
        };
      } else {
        setErrors((prev) => ({ ...prev, general: 'Failed to open print window.' }));
      }
    } catch (error) {
      console.error('Error printing credit note:', error);
      setErrors((prev) => ({ ...prev, general: 'Failed to print credit note.' }));
    } finally {
      setLoading(false);
    }
  };

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
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      try {
        doc.addImage(logoBase64, 'PNG', 10, 10, 21, 0);
      } catch (imgError) {
        console.error('Failed to add logo to PDF:', imgError);
        setErrors((prev) => ({ ...prev, general: 'Failed to add logo to PDF.' }));
      }

      doc.setFontSize(40);
      doc.setTextColor(200, 200, 200);
      doc.text('Wyenfos Bills', 105, 148, { align: 'center' });
      if (isCancelled) {
        doc.setFontSize(50);
        doc.setTextColor(255, 0, 0, 0.5);
        doc.text('CANCELLED', 105, 148, { align: 'center', angle: 45 });
      }

      doc.setFontSize(16);
      doc.setTextColor(179, 158, 181);
      doc.text(`CREDIT NOTE${isCancelled ? ' (CANCELLED)' : ''}`, 105, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Note No: ${creditNoteNumber}`, 190, 30, { align: 'right' });
      doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 190, 35, { align: 'right' });

      doc.setFontSize(12);
      doc.text(selectedCompany, 35, 20);
      doc.setFontSize(10);
      doc.text('Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001', 35, 25);
      doc.text('Mobile: 8547014116 | Email: wyenfos@gmail.com', 35, 30);
      doc.text('Website: www.wyenfos.com', 35, 35);

      doc.setFontSize(10);
      doc.text('Customer Details:', 10, 50);
      doc.text(`Customer ID: ${form.customerId}`, 10, 55);
      doc.text(`Name: ${form.customerName}`, 10, 60);
      if (form.customerEmail) doc.text(`Email: ${form.customerEmail}`, 10, 65);
      if (form.customerPhone) doc.text(`Phone: ${form.customerPhone}`, 10, 70);
      doc.text(`Reason: ${form.reason}`, 10, 75);

      doc.setFontSize(10);
      doc.setFillColor(179, 158, 181);
      doc.rect(10, 90, 190, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('#', 12, 95);
      doc.text('Item Code', 20, 95);
      doc.text('HSN Code', 40, 95);
      doc.text('Description', 60, 95);
      doc.text('Quantity', 120, 95);
      doc.text('Rate', 150, 95);
      doc.text('Amount', 180, 95);
      doc.setTextColor(0, 0, 0);
      let y = 103;
      form.items.forEach((item, index) => {
        doc.text(`${index + 1}`, 12, y);
        doc.text(item.itemCode, 20, y);
        doc.text(item.hsnCode, 40, y);
        doc.text(item.name, 60, y);
        doc.text(`${item.quantity}`, 120, y);
        doc.text(`₹${item.rate.toFixed(2)}`, 150, y);
        doc.text(`₹${getAmount(item).toFixed(2)}`, 180, y);
        y += 8;
      });

      if (notes) {
        y += 10;
        doc.text('Notes:', 10, y);
        y += 5;
        const wrappedNotes = doc.splitTextToSize(notes, 180);
        doc.text(wrappedNotes, 10, y);
        y += wrappedNotes.length * 5;
      }

      y += 10;
      doc.text(`Subtotal: ₹${subtotal.toFixed(2)}`, 180, y);
      y += 5;
      if (taxType === 'cgst_sgst') {
        doc.text(`CGST (9%): ₹${cgst.toFixed(2)}`, 180, y);
        y += 5;
        doc.text(`SGST (9%): ₹${sgst.toFixed(2)}`, 180, y);
        y += 5;
      } else {
        doc.text(`IGST (18%): ₹${igst.toFixed(2)}`, 180, y);
        y += 5;
      }
      doc.text(`Round Off: ₹${roundOff.toFixed(2)}`, 180, y);
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.text(`Total: ₹${rounded.toFixed(2)}`, 180, y);
      doc.setFont('helvetica', 'normal');
      if (isCancelled) {
        y += 5;
        doc.text('Status: Cancelled', 180, y);
      }

      y += 20;
      doc.setTextColor(179, 158, 181);
      doc.text('Terms & Conditions', 10, y);
      doc.setTextColor(0, 0, 0);
      y += 5;
      doc.text('1. This credit note is issued as per agreed terms.', 10, y);
      y += 5;
      doc.text('2. Refund or adjustment to be processed within 7 days.', 10, y);
      y += 5;
      doc.text('3. Contact us for any discrepancies.', 10, y);
      y += 10;
      doc.setTextColor(179, 158, 181);
      doc.text('Bank Details', 10, y);
      doc.setTextColor(0, 0, 0);
      y += 5;
      doc.text('Company name: WYENFOS INFOTECH PRIVATE LIMITED', 10, y);
      y += 5;
      doc.text('Account number: 10192468394', 10, y);
      y += 5;
      doc.text('IFSC: IDFB0080732', 10, y);
      y += 5;
      doc.text('SWIFT code: IDFBINBBMUM', 10, y);
      y += 5;
      doc.text('Bank name: IDFC FIRST', 10, y);
      y += 5;
      doc.text('Branch: THRISSUR - EAST FORT THRISSUR BRANCH', 10, y);
      doc.text('Authorized Signatory', 150, y - 30);
      doc.text(selectedCompany, 150, y - 25);

      const pdfBase64 = doc.output('datauristring').split(',')[1];
      await api.post('/creditnotes/send-email', {
        emailTo: form.customerEmail,
        subject: `Credit Note ${creditNoteNumber}`,
        body: `<p>Please find the attached credit note.</p>`,
        pdfBase64,
      });
      showNotification('Success', 'Email sent successfully!');
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
      setCreditNoteNumber(fetchLatestCreditNoteNumber());
    }
  };

  const handleBillSearch = async () => {
    try {
      const res = await api.get(`/${billType}/${invoiceId}?date=${searchDate}`);
      const bill = res.data;
      setForm((prev) => ({
        ...prev,
        customerName: bill.customerName,
        customerId: bill.customerId,
        customerAddress: bill.customerAddress,
        items: bill.items.map((item) => ({
          ...item,
          returnQty: 0,
        })),
        paymentMode: bill.paymentMode,
      }));
    } catch (err) {
      console.error('Bill not found:', err);
      setErrors((prev) => ({ ...prev, general: 'Bill not found.' }));
    }
  };

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
          <CompanyHeader selectedCompany={selectedCompany} />
          <div className="note-infoo">
            <h1>CREDIT NOTE{isCancelled ? ' (CANCELLED)' : ''}</h1>
            <div className="bill-meta">
              <div>Customer ID: {form.customerId}</div>
              <div>Note No: <strong>{creditNoteNumber}</strong></div>
              <div>Date: <strong>{new Date().toLocaleDateString('en-IN')}</strong></div>
            </div>
          </div>
        </div>
        <hr className="invoice-divider" />
        {errors.general && <div className="error message">{errors.general}</div>}
        <div className="form-grid">
          <div className="input-group">
            <label>Customer Name:</label>
          <input
  value={form.customerName}
  onChange={handleCustomerChange}
  name="customerName"
  list="customer-options"
  placeholder="Customer Name"
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
              {customers.map((c) => (
                <option key={c._id} value={c.customerName} />
              ))}
            </datalist>
            {form.customerId && (
              <div className="customer-id-display">
                Customer ID: {form.customerId}
              </div>
            )}
            {isCustomerLoading && <div className="loading-message">Loading customers...</div>}
            {errors.customerName && <div className="error">{errors.customerName}</div>}
          </div>
          <div className="input-group">
            <label>Address:</label>
            <input
              type="text"
              name="customerAddress"
              value={form.customerAddress}
              onChange={handleCustomerChange}
              placeholder="Address"
              disabled={isCancelled || loading}
              aria-required="true"
            />
            {errors.customerAddress && <div className="error">{errors.customerAddress}</div>}
          </div>
          <div className="input-group">
            <label>Email:</label>
            <input
              type="email"
              name="customerEmail"
              value={form.customerEmail}
              onChange={handleCustomerChange}
              placeholder="Enter email"
              disabled={isCancelled || loading}
            />
            {errors.customerEmail && <div className="error">{errors.customerEmail}</div>}
          </div>
          <div className="input-group">
            <label>Phone:</label>
            <input
              name="customerPhone"
              value={form.customerPhone}
              onChange={handleCustomerChange}
              placeholder="Enter phone number"
              disabled={isCancelled || loading}
            />
            {errors.customerPhone && <div className="error">{errors.customerPhone}</div>}
          </div>
          <div className="input-group">
            <label>Reason:</label>
            <select
              name="reason"
              value={form.reason}
              onChange={handleCustomerChange}
              disabled={isCancelled || loading}
              aria-required="true"
            >
              <option value="">Select Reason</option>
              <option value="Damaged Product">Damaged Product</option>
              <option value="Wrong Item Delivered">Wrong Item Delivered</option>
              <option value="Customer Not Satisfied">Customer Not Satisfied</option>
              <option value="Overcharged">Overcharged</option>
              <option value="Expired Product">Expired Product</option>
              <option value="Other">Other</option>
            </select>
            {errors.reason && <div className="error">{errors.reason}</div>}
          </div>
        </div>
        <div className="form-grid">
          <div className="input-group">
            <label>Bill Type</label>
            <select value={billType} onChange={(e) => setBillType(e.target.value)} disabled={isCancelled || loading}>
              <option value="">Select</option>
              <option value="cashbill">Cash Bill</option>
              <option value="creditbill">Credit Bill</option>
            </select>
          </div>
          <div className="input-group">
            <label>Date</label>
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              disabled={isCancelled || loading}
            />
          </div>
          <div className="input-group">
            <label>Invoice ID</label>
            <input
              type="text"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              disabled={isCancelled || loading}
            />
          </div>
          <button  className= 'searchbutton' onClick={handleBillSearch} disabled={isCancelled || loading}>
            Find Bill
          </button>
        </div>
        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isCancelled}
              onChange={(e) => setIsCancelled(e.target.checked)}
              disabled={id && isCancelled}
            />
            <span>Mark as Cancelled</span>
          </label>
          <label className="checkbox-label">
            <input
              type="radio"
              name="taxType"
              value="cgst_sgst"
              checked={taxType === 'cgst_sgst'}
              onChange={(e) => setTaxType(e.target.value)}
              disabled={isCancelled || loading}
            />
            <span>CGST + SGST</span>
          </label>
          <label className="checkbox-label">
            <input
              type="radio"
              name="taxType"
              value="igst"
              checked={taxType === 'igst'}
              onChange={(e) => setTaxType(e.target.value)}
              disabled={isCancelled || loading}
            />
            <span>IGST</span>
          </label>
        </div>
        <table className="item-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item Code</th>
              <th>HSN Code</th>
              <th>Description</th>
              <th>Quantity</th>
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
                  {errors.items[index]?.itemCode && <div className="error">{errors.items[index].itemCode}</div>}
                </td>
                <td>
                  <input
                    value={item.hsnCode}
                    onChange={(e) => handleItemChange(index, 'hsnCode', e.target.value)}
                    placeholder="HSN code"
                    disabled={isCancelled || loading}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                  />
                  {errors.items[index]?.hsnCode && <div className="error">{errors.items[index].hsnCode}</div>}
                </td>
                <td>
                  <input
                    value={item.name}
                    onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                    placeholder="Description"
                    disabled={isCancelled || loading}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                  />
                  {errors.items[index]?.name && <div className="error">{errors.items[index].name}</div>}
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
                  {errors.items[index]?.quantity && <div className="error">{errors.items[index].quantity}</div>}
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
                  {errors.items[index]?.rate && <div className="error">{errors.items[index].rate}</div>}
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
                  {errors.items[index]?.returnQty && <div className="error">{errors.items[index].returnQty}</div>}
                </td>
                <td>₹{getAmount(item).toFixed(2)}</td>
                <td>
                  <button
                    className="creditnote-delete-btn"
                    onClick={() => handleDeleteItem(index)}
                    disabled={isCancelled || loading}
                  >
                    Delete
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
            {taxType === 'cgst_sgst' ? (
              <>
                <div className="amount-row">
                  <span>CGST (9%):</span>
                  <span>₹{cgst.toFixed(2)}</span>
                </div>
                <div className="amount-row">
                  <span>SGST (9%):</span>
                  <span>₹{sgst.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="amount-row">
                <span>IGST (18%):</span>
                <span>₹{igst.toFixed(2)}</span>
              </div>
            )}
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
        <div className="footer">
          <div className="footer-left">
            <div className="terms-and-conditions">
              <h4>Terms & Conditions</h4>
              <p>1. This credit note is issued as per agreed terms.</p>
              <p>2. Refund or adjustment to be processed within 7 days.</p>
              <p>3. Contact us for any discrepancies.</p>
            </div>
            <div className="bank-details">
              <h4>Bank Details</h4>
              <p>Company name: WYENFOS INFOTECH PRIVATE LIMITED</p>
              <p>Account number: 10192468394</p>
              <p>IFSC: IDFB0080732</p>
              <p>SWIFT code: IDFBINBBMUM</p>
              <p>Bank name: IDFC FIRST</p>
              <p>Branch: THRISSUR - EAST FORT THRISSUR BRANCH</p>
            </div>
          </div>
          <div className="signature">
            <h4>Authorized Signatory</h4>
            <p>{selectedCompany}</p>
          </div>
        </div>
        <div className="creditnote-button-group">
          <button
            className="creditnote-save-btn"
            onClick={saveNote}
            disabled={loading || isCancelled}
          >
            Save
          </button>
          <button
            className="creditnote-download-btn"
            onClick={generatePDF}
            disabled={loading}
          >
            <i className="fa-solid fa-file-pdf"></i>
          </button>
          <button
            className="creditnote-print-btn"
            onClick={printNote}
            disabled={loading}
          >
            🖨️ Print
          </button>
          <button
            className="creditnote-email-btn"
            onClick={sendEmail}
            disabled={loading || !form.customerEmail || isCancelled}
          >
            📧 Email
          </button>
          <button
            className="creditnote-back-btn"
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
              <tr>
                <th>Note No</th>
                <th>Customer Name</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {savedCreditNotes.map((note) => (
                <tr key={note._id}>
                  <td>{note.invoiceNumber}</td>
                  <td>{note.customerName}</td>
                  <td>{new Date(note.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>₹{note.rounded.toFixed(2)}</td>
                  <td>{note.isCancelled ? 'Cancelled' : 'Active'}</td>
                  <td>
                    <button
                      className="action-btn"
                      onClick={() => editCreditNote(note._id)}
                      disabled={loading}
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => deleteCreditNote(note._id)}
                      disabled={loading}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CreditNote;