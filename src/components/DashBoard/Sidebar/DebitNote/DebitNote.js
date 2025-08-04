import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CompanyHeader from '../CompanyHeader/CompanyHeader';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';
import { debounce } from 'lodash';
import DOMPurify from 'dompurify';
import logo from '../../../../assets/images/Wyenfos_bills_logo.png';
import watermark from '../../../../assets/images/watermark.png';
import cancelledWatermark from '../../../../assets/images/cancelled.png';
import './DebitNote.css';

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

  const [savedBills, setSavedBills] = useState([]);
  const [filteredCreditBills, setFilteredCreditBills] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [isFinalInstallmentPaid, setIsFinalInstallmentPaid] = useState(false);
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState('');
  const [notificationMessage, setNotificationMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const userEmail = state?.userEmail || '';
  const userRole = state?.userRole || 'staff';
  const fetchInProgressRef = useRef(false);
  const [form, setForm] = useState({
    invoiceNumber: '',
    customerId: '',
    customerName: '',
    customerContact: { address: '', phone: '', email: '', gstin: '' },
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

  const activeRequests = useRef(0);

  const fetchWithRetry = useCallback(async (requestFn, retries = 3, backoff = 300, cancelToken = null) => {
    activeRequests.current++;
    for (let i = 0; i < retries; i++) {
      try {
        const response = await requestFn({ cancelToken });
        if (!response || !response.data) {
          throw new Error('Invalid response from server');
        }
        activeRequests.current--;
        return response;
      } catch (error) {
        if (axios.isCancel(error)) {
          activeRequests.current--;
          throw error;
        }
        if (i === retries - 1) {
          activeRequests.current--;
          throw new Error(`Request failed after ${retries} attempts: ${error.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, backoff * Math.pow(2, i)));
      }
    }
  }, []);

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

      const invoiceNumber = response.data?.data?.invoiceNumber || `${companyPrefix}-1`;
      setForm(prev => ({ ...prev, invoiceNumber }));
    } catch (error) {
      if (!axios.isCancel(error)) {
        setForm(prev => ({ ...prev, invoiceNumber: `${getCompanyPrefix(selectedCompany)-1}` }));
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompany]);

  const fetchSavedBills = useCallback(async ({ cancelToken } = {}) => {
    setIsLoading(true);
    try {
      const response = await api.get('/debitnotes', { cancelToken });
      setSavedBills(response.data.data || []);
    } catch (error) {
      if (!axios.isCancel(error)) {
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
    setIsLoading(true);
    try {
      const response = await api.get(`/debitnotes/${id}`);
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
  }, [userRole]);

  const handleDeleteBill = useCallback(async (id) => {
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      setNotificationMessage({ type: 'error', text: 'Only admins can delete debit notes.' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return;
    }
    setIsLoading(true);
    try {
      await api.delete(`/debitnotes/${id}`);
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
  }, [userRole, fetchLatestDebitNoteNo]);

  useEffect(() => {
    const source = axios.CancelToken.source();
    const fetchData = async () => {
      if (fetchInProgressRef.current) return;
      fetchInProgressRef.current = true;
      console.log('[DebitNote] Initial fetch for:', selectedCompany);
      try {
        await fetchLatestDebitNoteNo({ cancelToken: source.token });
        await fetchSavedBills({ cancelToken: source.token });
      } finally {
        fetchInProgressRef.current = false;
      }
    };

    fetchData();
    return () => {
      source.cancel('Component unmounted');
      fetchInProgressRef.current = false;
    };
  }, [selectedCompany, fetchLatestDebitNoteNo, fetchSavedBills]);

  const totals = useMemo(() => {
    if (!form.selectedCreditBill) {
      return {
        subtotal: 0,
        discount: 0,
        taxableAmount: 0,
        keralaGST: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        roundOff: 0,
        rounded: 0,
        remainingAmountToPay: 0,
        balanceAmount: 0,
      };
    }

    const totalAmount = form.selectedCreditBill.totalAmount || 0;
    const balanceAmount = form.selectedCreditBill.remainingBalance || 0;
    const sumOfInstallments = form.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0);
    const remainingAmountToPay = balanceAmount - sumOfInstallments;

    const subtotal = totalAmount;
    const discount = parseFloat(form.discount || 0);
    const taxableAmount = subtotal - discount;
    const keralaGST = form.isOtherState ? 0 : taxableAmount * 0.18;
    const cgst = form.isOtherState ? 0 : keralaGST / 2;
    const sgst = form.isOtherState ? 0 : keralaGST / 2;
    const igst = form.isOtherState ? taxableAmount * 0.18 : 0;
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
      remainingAmountToPay: Math.max(remainingAmountToPay, 0),
      balanceAmount: Math.max(balanceAmount, 0),
    };
  }, [form.selectedCreditBill, form.installments, form.discount, form.isOtherState]);

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
        console.error('Customer fetch error:', error);
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
          console.error('Failed to fetch customer:', error);
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

  const handleCreditBillChange = async (e) => {
    const invoiceNo = e.target.value;
    if (!invoiceNo) {
      setForm(prev => ({ ...prev, selectedCreditBill: null }));
      return;
    }

    try {
      const response = await api.get(`/creditbills/${encodeURIComponent(invoiceNo)}`);
      const creditBill = response.data;

      const firstItem = creditBill.items?.[0] || {};
      const totals = creditBill.totals || {};
      const paymentDetails = creditBill.paymentDetails || {};

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

      setForm(prev => ({
        ...prev,
        selectedCreditBill: {
          creditBillId: creditBill._id,
          creditBillNo: creditBill.invoiceNo,
          itemName: firstItem.description || 'N/A',
          hsnCode: firstItem.hsnSac || '',
          totalAmount: totals.amountToPay || 0,
          remainingBalance: totals.remainingBalance || paymentDetails.balanceAmount || 0,
          status: paymentDetails.status || 'N/A'
        },
        customerId,
        customerContact
      }));
    } catch (error) {
      console.error('Error fetching credit bill:', error);
      setNotificationMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to fetch credit bill details. Please try again.'
      });
      setTimeout(() => setNotificationMessage(null), 5000);
      setForm(prev => ({ ...prev, selectedCreditBill: null }));
    }
  };

  const handleSearch = debounce(async (term) => {
    const sanitizedTerm = sanitizeInput(term);
    setSearchTerm(sanitizedTerm);
    if (sanitizedTerm.length < 3) {
      setFilteredCreditBills([]);
      return;
    }
    try {
      console.log('Searching with term:', sanitizedTerm);
      const response = await fetchWithRetry(() => 
        api.get('/creditbills', { params: { search: sanitizedTerm.toLowerCase() } })
      );
      console.log('API response:', response.data);
      setFilteredCreditBills(response.data.data || []);
    } catch (error) {
      if (!axios.isCancel(error)) {
        console.error('Search error:', error);
        setNotificationMessage({ type: 'error', text: `Failed to search credit bills: ${error.message}` });
        setFilteredCreditBills([]);
        setTimeout(() => setNotificationMessage(null), 5000);
      }
    }
  }, 300);

  const handleSearchKeyPress = async (e) => {
    if (e.key === 'Enter') {
      await handleSearch(searchTerm);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: sanitizeInput(value) }));
  };

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

  const handleInstallmentChange = async (index, e) => {
    const { name, value } = e.target;
    const amount = parseFloat(value) || 0;
    if (amount < 0) {
      setNotificationMessage({ type: 'error', text: 'Installment amount cannot be negative.' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return;
    }
    const installments = [...form.installments];
    installments[index][name] = amount;
    setForm((prev) => ({ ...prev, installments }));
    setIsFinalInstallmentPaid(totals.remainingAmountToPay === 0);
    if (totals.remainingAmountToPay === 0 && !isFinalInstallmentPaid) {
      const receiptBlob = await generatePaymentReceipt();
      if (receiptBlob) {
        setPaymentReceiptUrl(URL.createObjectURL(receiptBlob));
      }
    }
  };

  const removeInstallment = (index) => {
    const installments = [...form.installments];
    installments.splice(index, 1);
    setForm((prev) => ({ ...prev, installments }));
    setIsFinalInstallmentPaid(totals.remainingAmountToPay === 0);
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
  };

  const generatePDF = async (forEmail = false) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 10;

    try {
      y = await addCommonPDFElements(doc, y, pageWidth, form.isCancelled);

      doc.setFontSize(16);
      doc.text(selectedCompany, 10, y);
      doc.text(`Debit Note #${form.invoiceNumber}`, pageWidth - 10, y, { align: 'right' });
      y += 10;

      doc.text(`Customer: ${form.customerName} (ID: ${form.customerId})`, 10, y);
      y += 10;

      autoTable(doc, {
        startY: y,
        head: [['#', 'Description', 'Amount', 'Paid', 'Balance', 'Bank Details']],
        body: [
          [
            1,
            form.selectedCreditBill?.itemName || 'N/A',
            `₹${form.selectedCreditBill?.totalAmount.toFixed(2)}`,
            `₹${(form.selectedCreditBill?.amountPaid || 0).toFixed(2)}`,
            `₹${form.selectedCreditBill?.remainingBalance.toFixed(2)}`,
            `${form.bankDetails.bankName || 'N/A'}, Acc: ${form.bankDetails.accountNumber || 'N/A'}, IFSC: ${form.bankDetails.ifsc || 'N/A'}`
          ],
          ...form.installments.map((inst, i) => [
            i + 2,
            'Installment',
            '',
            `₹${inst.amountPaid.toFixed(2)}`,
            '',
            ''
          ]),
        ],
      });

      y = doc.lastAutoTable.finalY + 10;
      doc.text(`Total: ₹${totals.rounded.toFixed(2)}`, pageWidth - 10, y, { align: 'right' });

      return forEmail ? doc.output('blob') : doc;
    } catch (error) {
      setNotificationMessage({ type: 'error', text: `Failed to generate PDF: ${error.message}` });
      setTimeout(() => setNotificationMessage(null), 5000);
      return null;
    }
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

  const validateForm = () => {
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
    if (form.installments.some((inst) => inst.amountPaid < 0)) {
      setNotificationMessage({ type: 'error', text: 'Installment amounts cannot be negative.' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return false;
    }
    return true;
  };

  const downloadPDF = async () => {
    setIsLoading(true);
    try {
      const doc = await generatePDF();
      if (doc) {
        doc.save(`DebitNote_${form.invoiceNumber}.pdf`);
        setNotificationMessage({ type: 'success', text: 'PDF downloaded successfully.' });
      }
    } catch (error) {
      setNotificationMessage({ type: 'error', text: `Failed to download PDF: ${error.message}` });
      setTimeout(() => setNotificationMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const sendEmail = async () => {
    if (!form.customerContact.email) {
      setNotificationMessage({ type: 'error', text: 'Customer email is required to send the debit note.' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return;
    }
    setIsLoading(true);
    try {
      const pdfBlob = await generatePDF(true);
      if (!pdfBlob) return;
      const base64Pdf = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(pdfBlob);
      });

      await fetchWithRetry(() => api.post('/debitnotes/send-email', {
        emailTo: form.customerContact.email,
        subject: `Debit Note #${form.invoiceNumber}`,
        body: `Dear ${form.customerName},\n\nAttached is your debit note from ${selectedCompany}.\n\nThank you for your business!`,
        pdfBase64: base64Pdf,
      }));
      setNotificationMessage({ type: 'success', text: 'Debit note emailed successfully.' });
    } catch (error) {
      if (!axios.isCancel(error)) {
        setNotificationMessage({ type: 'error', text: `Failed to send email: ${error.response?.data?.message || error.message}` });
      }
    } finally {
      setTimeout(() => setNotificationMessage(null), 5000);
      setIsLoading(false);
    }
  };

  const printDocument = async () => {
    setIsLoading(true);
    try {
      const doc = await generatePDF();
      if (doc) {
        const pdfUrl = doc.output('bloburl');
        const printWindow = window.open(pdfUrl);
        printWindow.onload = () => printWindow.print();
        setNotificationMessage({ type: 'success', text: 'Document sent to printer.' });
      }
    } catch (error) {
      setNotificationMessage({ type: 'error', text: `Failed to print document: ${error.message}` });
      setTimeout(() => setNotificationMessage(null), 5000);
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
    setIsLoading(true);
    try {
      if (!form.selectedCreditBill) {
        setNotificationMessage({ type: 'error', text: 'Please select a credit bill.' });
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
        customerAddress: form.customerContact.address,
        customerGSTIN: form.customerContact.gstin,
        company: { name: selectedCompany },
        items: [
          {
            description: form.selectedCreditBill.itemName,
            hsnSac: form.selectedCreditBill.hsnCode,
            quantity: 1,
            unit: 'unit',
            rate: form.selectedCreditBill.totalAmount,
            taxableValue: form.selectedCreditBill.totalAmount,
            cgstRate: form.isOtherState ? 0 : 9,
            cgstAmount: totals.cgst,
            sgstRate: form.isOtherState ? 0 : 9,
            sgstAmount: totals.sgst,
            igstRate: form.isOtherState ? 18 : 0,
            igstAmount: totals.igst,
          },
          ...form.installments.map((installment) => ({
            description: 'Installment',
            hsnSac: form.selectedCreditBill.hsnCode,
            quantity: 1,
            unit: 'unit',
            rate: installment.amountPaid,
            taxableValue: installment.amountPaid,
            cgstRate: form.isOtherState ? 0 : 9,
            cgstAmount: 0,
            sgstRate: form.isOtherState ? 0 : 9,
            sgstAmount: 0,
            igstRate: form.isOtherState ? 18 : 0,
            igstAmount: 0,
          })),
        ],
        totals: {
          taxableAmount: totals.taxableAmount,
          cgstTotal: totals.cgst,
          sgstTotal: totals.sgst,
          igstTotal: totals.igst,
          totalAmount: totals.rounded,
        },
        reason: form.remarks || 'Debit note issued',
        isOtherState: form.isOtherState,
        cancelled: form.isCancelled,
        createdBy: userEmail,
        lastUpdatedBy: userEmail,
        bankDetails: form.bankDetails,
        signature: form.signature,
      };
      let response;
      if (selectedId) {
        response = await fetchWithRetry(() => api.put(`/debitnotes/${selectedId}`, updatedForm));
        setNotificationMessage({ type: 'success', text: 'Debit note updated successfully.' });
      } else {
        response = await fetchWithRetry(() => api.post('/debitnotes', updatedForm));
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
        setNotificationMessage({ type: 'error', text: `Failed to save debit note: ${error.response?.data?.message || error.message}` });
        setTimeout(() => setNotificationMessage(null), 5000);
      }
    } finally {
      setIsLoading(false);
    }
  };

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
          </div>
        )}
        <div className="content-container">
          {form.isCancelled && (
            <div className="cancelled-watermark">
              <img src={cancelledWatermark} alt="Cancelled Watermark" />
            </div>
          )}
          <div className="note-header">
            <CompanyHeader selectedCompany={selectedCompany} />
            <div className="note-info">
              <h2>DEBIT NOTE{form.isCancelled ? ' (CANCELLED)' : ''}</h2>
              <div>Debit Note No: <strong>{form.invoiceNumber}</strong></div>
              <div>Date: <strong>{form.date}</strong></div>
              <div>Due Date: <strong>{form.dueDate}</strong></div>
            </div>
          </div>

          <hr className="divider" />
          <h3 className="Debitsection-title">Customer Information</h3>
          <div className="info-row">
            <div className="input-group">
              <label>Customer Name:</label>
              <input
                type="text"
                placeholder="Customer Name (min 4 characters)"
                value={customerName}
                onChange={handleCustomerNameChange}
                className="input-field"
                disabled={form.isCancelled}
                minLength={4}
                required
              />
            </div>
            <div className="input-group">
              <label>Customer ID:</label>
              <input
                type="text"
                value={form.customerDisplayId || ''}
                className="input-field input-disabled"
                disabled
              />
            </div>
            <div className="input-group">
              <label>Address:</label>
              <input
                placeholder="Customer Address"
                value={form.customerContact.address || ''}
                onChange={(e) => updateCustomerContact('address', e.target.value)}
                className="input-field"
                disabled={form.isCancelled}
              />
            </div>
            <div className="input-group">
              <label>Phone:</label>
              <input
                type="text"
                placeholder="Customer Phone (10-15 digits)"
                value={form.customerContact.phone || ''}
                onChange={(e) => updateCustomerContact('phone', e.target.value)}
                className="input-field"
                disabled={form.isCancelled}
              />
            </div>
            <div className="input-group">
              <label>Email:</label>
              <input
                type="email"
                placeholder="Customer Email"
                value={form.customerContact.email || ''}
                onChange={(e) => updateCustomerContact('email', e.target.value)}
                className="input-field"
                disabled={form.isCancelled}
                required
              />
            </div>
            <div className="input-group">
              <label>GSTIN:</label>
              <input
                type="text"
                placeholder="Customer GSTIN (optional)"
                value={form.customerContact.gstin || ''}
                onChange={(e) => updateCustomerContact('gstin', e.target.value)}
                className="input-field"
                disabled={form.isCancelled}
              />
            </div>
            <div className="input-group">
              <label>Due Date:</label>
              <input
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={handleChange}
                className="input-field"
                disabled={form.isCancelled}
                required
              />
            </div>
          </div>
          {form.customerContact.address && (
            <div className="address-display">
              <span>Full Address:</span>
              <p>{form.customerContact.address}</p>
            </div>
          )}

          <div className="tax-options">
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

          <h3 className="Debitsection-title">Items</h3>
          <div className="items-sectionn">
            <div className="item-headerr">
              <div>Invoice No.</div>
              <div>Item Details</div> 
              <div>Total Amount to Pay</div>
              <div>Status</div>
              <div>Installment Paid</div>
              <div>Balance Amount</div>
            </div>
            <div className="item-row">
              <div></div>
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search by Bill No or Customer (min 3 characters)"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="search-input"
                  disabled={form.isCancelled}
                />
                <select
                  value={form.selectedCreditBill?.creditBillNo || ''}
                  onChange={handleCreditBillChange}
                  className="credit-bill-select"
                  disabled={form.isCancelled}
                  required
                >
                  <option value="">Select Credit Bill</option>
                  {Array.isArray(filteredCreditBills) && filteredCreditBills.length > 0 ? (
                    filteredCreditBills.map((bill) => (
                      <option key={bill._id} value={bill.invoiceNo}>
                        {bill.invoiceNo} - {bill.customerName}
                      </option>
                    ))
                  ) : (
                    <option value="">No Credit Bills Available</option>
                  )}
                </select>
              </div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
            </div>
            {form.selectedCreditBill && (
              <div className="credit-bill-row">
                <div>{form.selectedCreditBill.creditBillNo}</div>
                <div>{form.selectedCreditBill.itemName || 'N/A'}</div> 
                <div>₹{form.selectedCreditBill.totalAmount.toFixed(2)}</div>
                <div>{form.selectedCreditBill.status || 'N/A'}</div> 
                <div></div> 
                <div>₹{form.selectedCreditBill.remainingBalance.toFixed(2)}</div> 
              </div>
            )}
            {form.installments.map((installment, index) => (
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
                <div>
                  <button
                    onClick={() => removeInstallment(index)}
                    className="remove-item-btn"
                    disabled={form.isCancelled}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
            <div className="add-installment-btn-container">
              <button
                onClick={addInstallment}
                className="add-item-btn"
                disabled={form.isCancelled || !form.selectedCreditBill}
              >
                + Add Installment
              </button>
            </div>
          </div>

          <h3 className="totals-heading">Totals</h3>
          <div className="totals-section">
            <div className="input-group">
              <label>Discount (₹):</label>
              <input
                type="number"
                name="discount"
                value={form.discount}
                onChange={handleChange}
                className="input-field"
                min="0"
                step="0.01"
                disabled={form.isCancelled}
              />
            </div>
            <div className="amount-details">
              <div className="amount-row">
                <span>Subtotal:</span>
                <span>₹{totals.subtotal.toFixed(2)}</span>
              </div>
              {form.isOtherState ? (
                <div className="amount-row">
                  <span>IGST (18%):</span>
                  <span>₹{totals.igst.toFixed(2)}</span>
                </div>
              ) : (
                <>
                  <div className="amount-row">
                    <span>CGST (9%):</span>
                    <span>₹{(totals.keralaGST / 2).toFixed(2)}</span>
                  </div>
                  <div className="amount-row">
                    <span>SGST (9%):</span>
                    <span>₹{(totals.keralaGST / 2).toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="amount-row">
                <span>Round Off:</span>
                <span>₹{totals.roundOff.toFixed(2)}</span>
              </div>
              <div className="total-amount">
                <span>Total:</span>
                <span>₹{totals.rounded.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <h3 className="remaining-amount-heading">Remaining Amount to Pay</h3>
          <div className="remaining-amount-heading">
            <div className="input-group">
              <input
                type="text"
                value={`₹${totals.remainingAmountToPay.toFixed(2)}`}
                className="input-field input-disabled"
                disabled
              />
            </div>
          </div>

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
                {paymentReceiptUrl && (
                  <div className="payment-receipt-link">
                    <a
                      href={paymentReceiptUrl}
                      download={`PaymentReceipt_${form.invoiceNumber}.pdf`}
                      className="btn-link"
                    >
                      Download Payment Receipt
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="remarks-section">
            <label>Remarks:</label>
            <textarea
              value={form.remarks}
              onChange={(e) => setForm((prev) => ({ ...prev, remarks: sanitizeInput(e.target.value) }))}
              placeholder="Add any remarks"
              className="input-field"
              disabled={form.isCancelled}
            />
          </div>

          <div className="bank-details">
            <h3 className="Debitsection-title">Bank Details</h3>
            <div className="info-row">
              <div className="input-group">
                <label>Account Number:</label>
                <input
                  type="text"
                  value={form.bankDetails.accountNumber || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, accountNumber: sanitizeInput(e.target.value) } }))}
                  className="input-field"
                  disabled={form.isCancelled}
                />
              </div>
              <div className="input-group">
                <label>IFSC:</label>
                <input
                  type="text"
                  value={form.bankDetails.ifsc || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, ifsc: sanitizeInput(e.target.value) } }))}
                  className="input-field"
                  disabled={form.isCancelled}
                />
              </div>
              <div className="input-group">
                <label>Bank Name:</label>
                <input
                  type="text"
                  value={form.bankDetails.bankName || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, bankName: sanitizeInput(e.target.value) } }))}
                  className="input-field"
                  disabled={form.isCancelled}
                />
              </div>
            </div>
          </div>

          <div className="signature-section">
            <h3 className="Debitsection-title">Authorized Signatory</h3>
              <div className="signaturee">
              <strong>Authorized Signatory</strong><br />
              <strong>{selectedCompany}</strong>
            </div>
          </div>

          <div className="button-group">
            <button
              onClick={saveDebitNote}
              className="debitsave-btn"
              disabled={form.isCancelled}
            >
              Save
            </button>
            <button
              onClick={sendEmail}
              className="debitemail-btn"
              disabled={form.isCancelled}
            >
              <i className="fa-solid fa-envelope"></i> Email
            </button>
            <button
              onClick={downloadPDF}
              className="debitdownload-btn"
              disabled={form.isCancelled}
            >
              <i className="fa-solid fa-file-pdf"></i> Download
            </button>
            <button
              onClick={printDocument}
              className="debitprint-btn"
              disabled={form.isCancelled}
            >
              <i className="fa-solid fa-print"></i> Print
            </button>
            <button
              onClick={() => navigate(-1)}
              className="debitback-btn"
            >
              <i className="fa-solid fa-backward"></i> Back
            </button>
            {selectedId && (userRole === 'admin' || userRole === 'super_admin') && (
              <button
                onClick={() => handleDeleteBill(selectedId)}
                className="debitdelete-btn"
              >
                <i className="fa-solid fa-trash"></i> Delete
              </button>
            )}
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
                      <td>₹{bill.totals?.totalAmount?.toFixed(2) || '0.00'}</td>
                      <td>
                        <button
                          className="select-btn no-print"
                          onClick={() => fetchBillById(bill._id)}
                          disabled={userRole !== 'admin' && userRole !== 'super_admin'}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-danger no-print"
                          onClick={() => handleDeleteBill(bill._id)}
                          disabled={userRole !== 'admin' && userRole !== 'super_admin'}
                        >
                          Delete
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

export default DebitNote;