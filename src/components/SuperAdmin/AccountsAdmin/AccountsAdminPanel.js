import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './AccountsAdminPanel.css';
import { Chart, registerables } from 'chart.js';
import SideBar from './SideBar.js';
import BillDistribution from './BillDistribution.js';
import PaymentHistory from './PaymentHistory.js';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';

Chart.register(...registerables);

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].slice(0, 6);

const AccountsAdminPanel = () => {
  const [activeTab, setActiveTab] = useState('profit-analysis');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [billingData, setBillingData] = useState([]);

  const [staffList, setStaffList] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profitData, setProfitData] = useState({
    cashBills: [],
    creditBills: [],
    creditNotes: [],
    debitNotes: [],
    expenses: [],
  });
  const [billDistributionData, setBillDistributionData] = useState({
    cashBills: 0,
    creditBills: 0,
    creditNotes: 0,
    debitNotes: 0,
  });
  const [detailedBillData, setDetailedBillData] = useState({
    cashBills: [],
    creditBills: [],
    creditNotes: [],
    debitNotes: [],
  });
  const [dateRange, setDateRange] = useState({
    start: new Date('2024-01-01'),
    end: new Date('2024-06-30'),
  });
  const [comparisonData, setComparisonData] = useState({
    currentYear: [],
    previousYear: [],
  });
  const [showComparison, setShowComparison] = useState(false);
  const [chartType, setChartType] = useState('line');
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState([]);
  // Removed unused state variables
  const [isLoading, setIsLoading] = useState(false);
  const [permissionRequests, setPermissionRequests] = useState([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'Staff', phone: '', photo: null });
  const [editingStaff, setEditingStaff] = useState(null);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [message, setMessage] = useState('');
  const [previewStaff, setPreviewStaff] = useState(null);
  const [notificationMessage, setNotificationMessage] = useState(null);
  const [hasData, setHasData] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const { currentUser } = useAuth();
  
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
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
  
  const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Removed unused function

  const handlePermissionResponse = async (requestId, status) => {
    try {
      const token = await getAuthToken();
      await api.put(`/permission/request/${requestId}`, {
        status,
        processedBy: localStorage.getItem('email') || 'unknown',
        processedAt: new Date().toISOString(),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPermissionRequests(permissionRequests.filter(req => req._id !== requestId));
      setNotificationMessage({ type: 'success', text: `Permission request ${status}` });
      setTimeout(() => setNotificationMessage(null), 3000);
    } catch (error) {
      setNotificationMessage({ type: 'error', text: `Failed to process request: ${error.response?.data?.message || error.message}` });
      setTimeout(() => setNotificationMessage(null), 3000);
    }
  };

 useEffect(() => {
  const fetchAllData = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    const token = await getAuthToken();

    try {
      const [
        cashBillsRes,
        creditBillsRes,
        creditNotesRes,
        debitNotesRes,
        distributionRes,
        comparisonRes,
        staffRes,
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/api/cashbills`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/creditbills`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/creditnotes`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/debitnotes`, { headers: { Authorization: `Bearer ${token}` } }),

        fetch(`${API_BASE_URL}/api/accounts/bill-distribution`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/accounts/comparison-data`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/accounts/staff/list`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [
        cashBillsData,
        creditBillsData,
        creditNotesData,
        debitNotesData,
        distributionData,
        comparisonData,
        staffData,
      ] = await Promise.all([
        cashBillsRes.ok ? cashBillsRes.json() : Promise.reject(new Error('Failed to fetch cash bills')),
        creditBillsRes.ok ? creditBillsRes.json() : Promise.reject(new Error('Failed to fetch credit bills')),
        creditNotesRes.ok ? creditNotesRes.json() : Promise.reject(new Error('Failed to fetch credit notes')),
        debitNotesRes.ok ? debitNotesRes.json() : Promise.reject(new Error('Failed to fetch debit notes')),

        distributionRes.ok ? distributionRes.json() : Promise.reject(new Error('Failed to fetch bill distribution')),
        comparisonRes.ok ? comparisonRes.json() : Promise.reject(new Error('Failed to fetch comparison data')),
        staffRes.ok ? staffRes.json() : Promise.reject(new Error('Failed to fetch staff list')),
      ]);

      // Combine all billing data
      const allBillingData = [
        ...(cashBillsData || []),
        ...(creditBillsData?.data || []),
        ...(creditNotesData || []),
        ...(debitNotesData || [])
      ];
      
      setBillingData(allBillingData);
      setStaffList(staffData || []);
      

      
      // Calculate profit data from actual bills
      const calculateMonthlyData = (bills, type) => {
        const monthlyData = [0, 0, 0, 0, 0, 0]; // 6 months
        bills.forEach(bill => {
          const date = new Date(bill.date || bill.createdAt);
          const month = date.getMonth();
          if (month < 6) { // Only last 6 months
            let amount = 0;
            if (type === 'cashBills' || type === 'creditBills') {
              amount = bill.totals?.grandTotal || 0;
            } else if (type === 'creditNotes') {
              amount = bill.totals?.rounded || 0;
            } else if (type === 'debitNotes') {
              amount = bill.totals?.totalAmount || 0;
            }
            monthlyData[month] += amount;
          }
        });
        return monthlyData;
      };

      const realProfitData = {
        cashBills: calculateMonthlyData(cashBillsData || [], 'cashBills'),
        creditBills: calculateMonthlyData(creditBillsData?.data || [], 'creditBills'),
        creditNotes: calculateMonthlyData(creditNotesData || [], 'creditNotes'),
        debitNotes: calculateMonthlyData(debitNotesData || [], 'debitNotes'),
        expenses: [0, 0, 0, 0, 0, 0], // Placeholder for expenses
      };

      setProfitData(realProfitData);
      setBillDistributionData(distributionData || {});
      setComparisonData(comparisonData || {});

      const staffWithDetails = await Promise.all(
        (staffData || []).map(async (staff) => {
          try {
            const billDetailsRes = await fetch(`${API_BASE_URL}/api/accounts/staff/${staff._id}/bill-details`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!billDetailsRes.ok) throw new Error(`Failed to fetch bill details for ${staff.name}`);
            const billDetails = await billDetailsRes.json();
            return { ...staff, ...billDetails };
          } catch (err) {
            setNotificationMessage({ type: 'error', text: `Error fetching bill details for ${staff.name}: ${err.message}` });
            setTimeout(() => setNotificationMessage(null), 3000);
            return { ...staff, cashBill: 0, creditBill: 0, creditNote: 0, debitNote: 0 };
          }
        })
      );
      setStaffList(staffWithDetails);

      updateSummaryMetrics(realProfitData, months.map((_, i) =>
        (realProfitData.cashBills?.[i] || 0) +
        (realProfitData.creditBills?.[i] || 0) -
        (realProfitData.creditNotes?.[i] || 0) -
        (realProfitData.expenses?.[i] || 0) +
        (realProfitData.debitNotes?.[i] || 0)
      ));
    } catch (err) {
      setNotificationMessage({ type: 'error', text: `Failed to load data: ${err.message}` });
      setTimeout(() => setNotificationMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  fetchAllData();
}, [navigate, currentUser, getAuthToken, API_BASE_URL]);

  useEffect(() => {
    const profit = months.map((_, i) =>
      (profitData.cashBills?.[i] || 0) +
      (profitData.creditBills?.[i] || 0) -
      (profitData.creditNotes?.[i] || 0) -
      (profitData.expenses?.[i] || 0) +
      (profitData.debitNotes?.[i] || 0)
    );

    const computedHasData =
      (profitData.cashBills?.length && profitData.cashBills.some(val => val !== 0)) ||
      (profitData.creditBills?.length && profitData.creditBills.some(val => val !== 0)) ||
      (profitData.creditNotes?.length && profitData.creditNotes.some(val => val !== 0)) ||
      (profitData.debitNotes?.length && profitData.debitNotes.some(val => val !== 0)) ||
      profit.some(val => val !== 0);

    setHasData(computedHasData);
  }, [profitData]);

  const updateSummaryMetrics = (profitData, profit) => {
    const totalCashBills = (profitData.cashBills || []).reduce((sum, val) => sum + (val || 0), 0);
    const totalCreditBills = (profitData.creditBills || []).reduce((sum, val) => sum + (val || 0), 0);
    const totalCreditNotes = (profitData.creditNotes || []).reduce((sum, val) => sum + (val || 0), 0);
    const totalDebitNotes = (profitData.debitNotes || []).reduce((sum, val) => sum + (val || 0), 0);
    const netProfit = (profit || []).reduce((sum, val) => sum + (val || 0), 0);

    const currentPeriodCash = (profitData.cashBills || []).slice(-3).reduce((a, b) => a + (b || 0), 0);
    const previousPeriodCash = (profitData.cashBills || []).slice(-6, -3).reduce((a, b) => a + (b || 0), 0);
    const cashBillTrend = previousPeriodCash
      ? Math.round(((currentPeriodCash - previousPeriodCash) / previousPeriodCash) * 100)
      : 0;

    const totalCashBillsElement = document.getElementById('totalCashBills');
    const totalCreditBillsElement = document.getElementById('totalCreditBills');
    const totalCreditNotesElement = document.getElementById('totalCreditNotes');
    const totalDebitNotesElement = document.getElementById('totalDebitNotes');
    const netProfitElement = document.getElementById('netProfit');
    const cashBillTrendElement = document.getElementById('cashBillTrend');

    if (totalCashBillsElement) totalCashBillsElement.textContent = `₹${totalCashBills.toLocaleString()}`;
    if (totalCreditBillsElement) totalCreditBillsElement.textContent = `₹${totalCreditBills.toLocaleString()}`;
    if (totalCreditNotesElement) totalCreditNotesElement.textContent = `₹${totalCreditNotes.toLocaleString()}`;
    if (totalDebitNotesElement) totalDebitNotesElement.textContent = `₹${totalDebitNotes.toLocaleString()}`;
    if (netProfitElement) netProfitElement.textContent = `₹${netProfit.toLocaleString()}`;
    if (cashBillTrendElement) cashBillTrendElement.textContent = `${
      cashBillTrend > 0 ? '↑' : cashBillTrend < 0 ? '↓' : '→'
    } ${Math.abs(cashBillTrend)}%`;
  };

  const fetchDetailedBillData = async (type) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/auth/accounts/bill-details/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Failed to fetch ${type} details`);
      const data = await response.json();
      setDetailedBillData((prev) => ({ ...prev, [type]: data }));
    } catch (err) {
      setNotificationMessage({ type: 'error', text: `Error fetching ${type} details: ${err.message}` });
      setTimeout(() => setNotificationMessage(null), 3000);
    }
  };

  const applyDateFilter = async () => {
    const today = new Date('2025-06-20');
    if (dateRange.start > dateRange.end) {
      setNotificationMessage({ type: 'error', text: 'Start date cannot be after end date.' });
      setTimeout(() => setNotificationMessage(null), 3000);
      return;
    }
    if (dateRange.end > today) {
      setNotificationMessage({ type: 'error', text: 'End date cannot be in the future.' });
      setTimeout(() => setNotificationMessage(null), 3000);
      return;
    }
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/auth/accounts/filtered-data`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: dateRange.start,
          endDate: dateRange.end,
        }),
      });
      if (!response.ok) throw new Error('Failed to apply date filter');
      const data = await response.json();

      setProfitData(data.profitData || {});
      setBillDistributionData(data.distributionData || {});
      updateSummaryMetrics(
        data.profitData || {},
        months.map((_, i) =>
          (data.profitData.cashBills?.[i] || 0) +
          (data.profitData.creditBills?.[i] || 0) -
          (data.profitData.creditNotes?.[i] || 0) -
          (data.profitData.expenses?.[i] || 0) +
          (data.profitData.debitNotes?.[i] || 0)
        )
      );
    } catch (err) {
      setNotificationMessage({ type: 'error', text: `Error applying date filter: ${err.message}` });
      setTimeout(() => setNotificationMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (e, type) => {
    const today = new Date('2025-06-20');
    const selectedDate = new Date(e.target.value);
    if (type === 'end' && selectedDate > today) {
      setNotificationMessage({ type: 'error', text: 'End date cannot be in the future.' });
      setTimeout(() => setNotificationMessage(null), 3000);
      return;
    }
    setDateRange({ ...dateRange, [type]: selectedDate });
  };

  const fetchMonthDetails = useCallback(async (month, type) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/auth/accounts/month-details`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ month, type }),
      });
      if (!response.ok) throw new Error(`Failed to fetch details for ${month} ${type}`);
      const data = await response.json();
      setModalData(data);
      setShowModal(true);
    } catch (err) {
      setNotificationMessage({ type: 'error', text: `Error fetching ${month} ${type} details: ${err.message}` });
      setTimeout(() => setNotificationMessage(null), 3000);
    }
  }, [getAuthToken, API_BASE_URL]);

  const exportChartAsImage = () => {
    const canvas = document.getElementById('profitChart');
    if (!canvas) {
      setNotificationMessage({ type: 'error', text: 'Chart not available for export.' });
      setTimeout(() => setNotificationMessage(null), 3000);
      return;
    }
    const link = document.createElement('a');
    link.download = 'profit-analysis.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const exportDataAsCSV = () => {
    let csvContent = 'Month,Cash Bills,Credit Bills,Credit Notes,Debit Notes,Profit\n';

    months.forEach((month, i) => {
      const profit = (profitData.cashBills?.[i] || 0) +
                     (profitData.creditBills?.[i] || 0) -
                     (profitData.creditNotes?.[i] || 0) -
                     (profitData.expenses?.[i] || 0) +
                     (profitData.debitNotes?.[i] || 0);
      csvContent +=
        `${month},${profitData.cashBills?.[i] || 0},${profitData.creditBills?.[i] || 0},` +
        `${profitData.creditNotes?.[i] || 0},${profitData.debitNotes?.[i] || 0},${profit || 0}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'profit-analysis.csv';
    link.click();
  };

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.email || !newStaff.phone) {
      setNotificationMessage({ type: 'error', text: 'Please fill in all required fields.' });
      setTimeout(() => setNotificationMessage(null), 3000);
      return;
    }
    try {
      const token = await getAuthToken();
      const formData = new FormData();
      formData.append('name', newStaff.name);
      formData.append('email', newStaff.email);
      formData.append('role', newStaff.role);
      formData.append('phone', newStaff.phone);
      if (newStaff.photo) formData.append('photo', newStaff.photo);

      const response = await fetch(`${API_BASE_URL}/api/staff/add`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        const billDetailsRes = await fetch(`${API_BASE_URL}/api/staff/${data._id}/bill-details`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!billDetailsRes.ok) throw new Error('Failed to fetch bill details for new staff');
        const billDetails = await billDetailsRes.json();
        const newStaffWithDetails = { ...data, ...billDetails };
        setPreviewStaff(newStaffWithDetails);
        setNewStaff({ name: '', email: '', role: 'Staff', phone: '', photo: null });
        setNotificationMessage({ type: 'success', text: 'Staff added successfully. Please review and save.' });
        setTimeout(() => setNotificationMessage(null), 3000);
      } else {
        throw new Error(data.error || 'Failed to add staff');
      }
    } catch (err) {
      setNotificationMessage({ type: 'error', text: `Error adding staff: ${err.message}` });
      setTimeout(() => setNotificationMessage(null), 3000);
    }
  };

  const handleSaveStaff = () => {
    if (previewStaff) {
      setStaffList([...staffList, previewStaff]);
      setPreviewStaff(null);
      setNotificationMessage({ type: 'success', text: 'Staff saved successfully.' });
      setTimeout(() => setNotificationMessage(null), 3000);
    }
  };

  const handleUpdateStaff = async (staff) => {
    try {
      const token = await getAuthToken();
      const formData = new FormData();
      formData.append('name', staff.name);
      formData.append('email', staff.email);
      formData.append('role', staff.role);
      formData.append('phone', staff.phone);
      if (staff.photo instanceof File) formData.append('photo', staff.photo);

      const response = await fetch(`${API_BASE_URL}/api/staff/${staff._id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to update staff');
      const data = await response.json();
      setStaffList(staffList.map((s) => (s._id === staff._id ? { ...s, ...data } : s)));
      setEditingStaff(null);
      setNotificationMessage({ type: 'success', text: 'Staff updated successfully.' });
      setTimeout(() => setNotificationMessage(null), 3000);
    } catch (err) {
      setNotificationMessage({ type: 'error', text: `Error updating staff: ${err.message}` });
      setTimeout(() => setNotificationMessage(null), 3000);
    }
  };

  const handlePhotoUpload = (e, setStaffFunc, staff) => {
    const file = e.target.files[0];
    if (file) {
      setStaffFunc({ ...staff, photo: file });
    }
  };

  const handleStaffSelection = (staffId) => {
    setSelectedStaff(
      selectedStaff.includes(staffId)
        ? selectedStaff.filter((id) => id !== staffId)
        : [...selectedStaff, staffId]
    );
  };

  const handleSendMessage = async () => {
    if (!message || selectedStaff.length === 0) {
      setNotificationMessage({ type: 'error', text: 'Please select at least one staff member and enter a message.' });
      setTimeout(() => setNotificationMessage(null), 3000);
      return;
    }
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/staff/send-message`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ staffIds: selectedStaff, message }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      await response.json();
      setShowMessageForm(false);
      setSelectedStaff([]);
      setMessage('');
      setNotificationMessage({ type: 'success', text: 'Message sent successfully!' });
      setTimeout(() => setNotificationMessage(null), 3000);
    } catch (err) {
      setNotificationMessage({ type: 'error', text: `Error sending message: ${err.message}` });
      setTimeout(() => setNotificationMessage(null), 3000);
    }
  };

  useEffect(() => {
    const ctx = document.getElementById('profitChart')?.getContext('2d');
    if (!ctx) {
      setNotificationMessage({ type: 'error', text: 'Profit chart canvas not found.' });
      setTimeout(() => setNotificationMessage(null), 3000);
      return;
    }

    const chartData = {
      labels: months,
      datasets: [
        {
          label: 'Profit',
          data: months.map((_, i) =>
            (profitData.cashBills?.[i] || 0) +
            (profitData.creditBills?.[i] || 0) -
            (profitData.creditNotes?.[i] || 0) -
            (profitData.expenses?.[i] || 0) +
            (profitData.debitNotes?.[i] || 0)
          ),
          borderColor: '#2ecc71',
          backgroundColor: 'rgba(46, 204, 113, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Cash Bills',
          data: profitData.cashBills || [],
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          borderWidth: 2,
          fill: false,
          hidden: false,
        },
        {
          label: 'Credit Bills',
          data: profitData.creditBills || [],
          borderColor: '#9b59b6',
          backgroundColor: 'rgba(155, 89, 182, 0.1)',
          borderWidth: 2,
          fill: false,
          hidden: false,
        },
        {
          label: 'Credit Notes',
          data: (profitData.creditNotes || []).map((val) => -val),
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          borderWidth: 2,
          fill: false,
          hidden: false,
        },
        {
          label: 'Debit Notes',
          data: profitData.debitNotes || [],
          borderColor: '#f1c40f',
          backgroundColor: 'rgba(241, 196, 15, 0.1)',
          borderWidth: 2,
          fill: false,
          hidden: false,
        },
      ],
    };

    if (showComparison) {
      chartData.datasets.push({
        label: `${new Date().getFullYear() - 1} Profit`,
        data: comparisonData.previousYear || [],
        borderColor: '#95a5a6',
        borderDash: [5, 5],
        fill: false,
        hidden: false,
      });
    }

    const profitChart = new Chart(ctx, {
      type: chartType,
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          y: {
            type: 'linear',
            beginAtZero: true,
            title: {
              display: true,
              text: 'Amount (₹)',
              font: {
                weight: 'bold',
              },
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
          },
          x: {
            type: 'category',
            title: {
              display: true,
              text: 'Month',
              font: {
                weight: 'bold',
              },
            },
            grid: {
              display: false,
            },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                const sign = value < 0 ? '-' : '';
                return `${label}: ${sign}₹${Math.abs(value).toLocaleString()}`;
              },
            },
          },
          legend: {
            position: 'top',
            labels: {
              boxWidth: 12,
              padding: 20,
              font: {
                size: 12,
              },
              usePointStyle: true,
            },
            onClick: (e, legendItem, legend) => {
              const index = legendItem.datasetIndex;
              const ci = legend.chart;
              ci.toggleDataVisibility(index);
              ci.update();
            },
          },
        },
        onClick: (evt, elements) => {
          if (elements.length > 0) {
            const datasetIndex = elements[0].datasetIndex;
            const dataIndex = elements[0].index;
            const month = months[dataIndex];
            const datasetLabel = chartData.datasets[datasetIndex].label;

            if (!datasetLabel.includes('Profit')) {
              fetchMonthDetails(month, datasetLabel);
            }
          }
        },
      },
    });

    return () => profitChart.destroy();
  }, [profitData, chartType, showComparison, comparisonData, fetchMonthDetails]);

  useEffect(() => {
    const ctx = document.getElementById('billDistributionChart')?.getContext('2d');
    if (!ctx) {
      setNotificationMessage({ type: 'error', text: 'Bill distribution chart canvas not found.' });
      setTimeout(() => setNotificationMessage(null), 3000);
      return;
    }

    const chartData = {
      labels: ['Cash Bills', 'Credit Bills', 'Credit Notes', 'Debit Notes'],
      datasets: [
        {
          data: [
            billDistributionData.cashBills || 0,
            billDistributionData.creditBills || 0,
            billDistributionData.creditNotes || 0,
            billDistributionData.debitNotes || 0,
          ],
          backgroundColor: ['#3498db', '#9b59b6', '#e74c3c', '#f1c40f'],
          borderColor: '#fff',
          borderWidth: 1,
        },
      ],
    };

    const billDistributionChart = new Chart(ctx, {
      type: 'pie',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + (b || 0), 0);
                const percentage = total ? ((value / total) * 100).toFixed(2) : 0;
                return `${label}: ₹${value.toLocaleString()} (${percentage}%)`;
              },
            },
          },
        },
      },
    });

    return () => billDistributionChart.destroy();
  }, [billDistributionData]);

  const handleAddFeature = () => {
    // Check if user is super admin from localStorage or context
    const userRole = localStorage.getItem('role');
    if (userRole !== 'super_admin' && userRole !== 'superadmin') {
      setNotificationMessage({ type: 'error', text: 'Only Super Admins can add new features.' });
      setTimeout(() => setNotificationMessage(null), 3000);
      return;
    }
    setNotificationMessage({ type: 'info', text: 'Feature addition form would open here for Super Admins.' });
    setTimeout(() => setNotificationMessage(null), 3000);
  };

  return (
    <div className={`accounts-admin-panel ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <SideBar
        user={JSON.parse(localStorage.getItem('user') || '{}')}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        setShowProfile={() => {/* Implement profile display logic if needed */}}
        handleLogout={() => {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          navigate('/login');
        }}
        staffList={staffList}
      />
      <div className={`main-content ${isSidebarOpen ? 'with-sidebar' : 'without-sidebar'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="sidebar-toggle-btn"
            onClick={handleSidebarToggle}
            aria-label="Toggle Sidebar"
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>
          <div className="header">
            <h2>Accounts Admin Panel</h2>
          </div>
          <div className="notification-container" ref={dropdownRef}>
            <button 
              className="notification-button"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <i className="fa fa-bell"></i>
              {permissionRequests.length > 0 && (
                <span className="notification-badge">{permissionRequests.length}</span>
              )}
            </button>
            {showNotifications && (
              <div className="notification-dropdown">
                <h4>Permission Requests ({permissionRequests.length})</h4>
                {permissionRequests.length === 0 ? (
                  <p>No pending requests</p>
                ) : (
                  permissionRequests.map(request => (
                    <div key={request._id} className="notification-item">
                      <p>{request.requestedBy} wants to {request.action} bill #{request.resourceId}</p>
                      <div className="notification-actions">
                        <button onClick={() => handlePermissionResponse(request._id, 'approved')}>
                          Approve
                        </button>
                        <button onClick={() => handlePermissionResponse(request._id, 'rejected')}>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {notificationMessage && (
          <div className={`message ${notificationMessage.type}`}>
            <p>{notificationMessage.text}</p>
            <button
              type="button"
              onClick={() => setNotificationMessage(null)}
              aria-label="Close message"
            >
              Close
            </button>
          </div>
        )}

        {isLoading && <div className="loading-overlay">Loading...</div>}

        <div className="tabs">
          <div className="tab-list" role="tablist" aria-label="Accounts Admin Tabs">
            <button
              role="tab"
              id="billing-tab"
              className={activeTab === 'billing' ? 'active-tab' : 'tab'}
              onClick={() => setActiveTab('billing')}
              aria-selected={activeTab === 'billing'}
              aria-controls="billing-panel"
            >
              Billing
            </button>
            <button
              role="tab"
              id="bill-distribution-tab"
              className={activeTab === 'bill-distribution' ? 'active-tab' : 'tab'}
              onClick={() => setActiveTab('bill-distribution')}
              aria-selected={activeTab === 'bill-distribution'}
              aria-controls="bill-distribution-panel"
            >
              Bill Distribution
            </button>
            <button
              role="tab"
              id="payment-history-tab"
              className={activeTab === 'payment-history' ? 'active-tab' : 'tab'}
              onClick={() => setActiveTab('payment-history')}
              aria-selected={activeTab === 'payment-history'}
              aria-controls="payment-history-panel"
            >
              Payment History
            </button>
            <button
              role="tab"
              id="profit-analysis-tab"
              className={activeTab === 'profit-analysis' ? 'active-tab' : 'tab'}
              onClick={() => setActiveTab('profit-analysis')}
              aria-selected={activeTab === 'profit-analysis'}
              aria-controls="profit-analysis-panel"
            >
              Profit Analysis
            </button>
          </div>
        </div>

        <div className="tab-content">
          {activeTab === 'billing' && (
            <div
              className="billing-section"
              role="tabpanel"
              id="billing-panel"
              aria-labelledby="billing-tab"
            >
              <h3>Billing Details</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bill ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {billingData.length > 0 ? (
                    billingData.map((bill) => (
                      <tr key={bill.id}>
                        <td>{bill.id}</td>
                        <td>{bill.customer}</td>
                        <td>₹{bill.amount.toLocaleString()}</td>
                        <td>{new Date(bill.date).toLocaleDateString()}</td>
                        <td>{bill.status}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5">No billing data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'bill-distribution' && (
            <div
              className="bill-distribution-section"
              role="tabpanel"
              id="bill-distribution-panel"
              aria-labelledby="bill-distribution-tab"
            >
              <BillDistribution />
            </div>
          )}

          {activeTab === 'payment-history' && (
            <div
              className="payment-history-section"
              role="tabpanel"
              id="payment-history-panel"
              aria-labelledby="payment-history-tab"
            >
              <PaymentHistory />
            </div>
          )}



          {activeTab === 'profit-analysis' && (
            <div
              className="profit-analysis-section"
              role="tabpanel"
              id="profit-analysis-panel"
              aria-labelledby="profit-analysis-tab"
            >
              <div className="controls-row">
                <div className="date-range-selector">
                  <label>
                    Start Date:
                    <input
                      type="date"
                      value={dateRange.start.toISOString().split('T')[0]}
                      onChange={(e) => handleDateChange(e, 'start')}
                      aria-label="Select start date"
                    />
                  </label>
                  <label>
                    End Date:
                    <input
                      type="date"
                      value={dateRange.end.toISOString().split('T')[0]}
                      onChange={(e) => handleDateChange(e, 'end')}
                      aria-label="Select end date"
                    />
                  </label>
                  <button onClick={applyDateFilter} aria-label="Apply date filter">Apply Filter</button>
                </div>

                <div className="chart-type-toggle">
                  <button
                    className={chartType === 'line' ? 'active' : ''}
                    onClick={() => setChartType('line')}
                    aria-pressed={chartType === 'line'}
                  >
                    Line Chart
                  </button>
                  <button
                    className={chartType === 'bar' ? 'active' : ''}
                    onClick={() => setChartType('bar')}
                    aria-pressed={chartType === 'bar'}
                  >
                    Bar Chart
                  </button>
                </div>

                <div className="comparison-toggle">
                  <label>
                    <input
                      type="checkbox"
                      checked={showComparison}
                      onChange={() => setShowComparison(!showComparison)}
                      aria-label="Toggle year comparison"
                    />
                    Year Comparison
                  </label>
                </div>
              </div>

              <div className="chart-container">
                {hasData ? (
                  <canvas id="profitChart" width="800" height="400" aria-label="Profit analysis chart"></canvas>
                ) : (
                  <p>No profit data available for the selected date range.</p>
                )}
              </div>

              {isLoading ? (
                <p>Loading metrics...</p>
              ) : (
                <div className="summary-metrics">
                  <div className="metric">
                    <h3>Total Cash Bills</h3>
                    <p id="totalCashBills">₹0</p>
                    <div className="trend-indicator" id="cashBillTrend"></div>
                  </div>
                  <div className="metric">
                    <h3>Total Credit Bills</h3>
                    <p id="totalCreditBills">₹0</p>
                  </div>
                  <div className="metric">
                    <h3>Total Credit Notes</h3>
                    <p id="totalCreditNotes">₹0</p>
                  </div>
                  <div className="metric">
                    <h3>Total Debit Notes</h3>
                    <p id="totalDebitNotes">₹0</p>
                  </div>
                  <div className="metric highlight">
                    <h3>Net Profit</h3>
                    <p id="netProfit">₹0</p>
                  </div>
                </div>
              )}

              <div className="export-options">
                <button onClick={exportChartAsImage} aria-label="Export chart as image">Export Chart as Image</button>
                <button onClick={exportDataAsCSV} aria-label="Export data as CSV">Export Data as CSV</button>
              </div>

              <div className="detailed-bill-tables">
                <div className="bill-type-table">
                  <h4>Cash Bills Details</h4>
                  <button onClick={() => fetchDetailedBillData('cashBills')} aria-label="Load cash bills data">Load Data</button>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Invoice #</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedBillData.cashBills.map((bill, i) => (
                        <tr key={i}>
                          <td>{new Date(bill.date).toLocaleDateString()}</td>
                          <td>{bill.customer}</td>
                          <td>₹{bill.amount.toLocaleString()}</td>
                          <td>{bill.invoiceNumber}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bill-type-table">
                  <h4>Credit Bills Details</h4>
                  <button onClick={() => fetchDetailedBillData('creditBills')} aria-label="Load credit bills data">Load Data</button>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedBillData.creditBills.map((bill, i) => (
                        <tr key={i}>
                          <td>{new Date(bill.date).toLocaleDateString()}</td>
                          <td>{bill.customer}</td>
                          <td>₹{bill.amount.toLocaleString()}</td>
                          <td>{new Date(bill.dueDate).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="profit-data-table">
                <h4>Detailed Profit Data</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Cash Bills</th>
                      <th>Credit Bills</th>
                      <th>Credit Notes</th>
                      <th>Debit Notes</th>
                      <th>Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((month, i) => {
                      const profit = (profitData.cashBills?.[i] || 0) +
                                     (profitData.creditBills?.[i] || 0) -
                                     (profitData.creditNotes?.[i] || 0) -
                                     (profitData.expenses?.[i] || 0) +
                                     (profitData.debitNotes?.[i] || 0);
                      return (
                        <tr key={month}>
                          <td>{month}</td>
                          <td>₹{profitData.cashBills?.[i]?.toLocaleString() || 0}</td>
                          <td>₹{profitData.creditBills?.[i]?.toLocaleString() || 0}</td>
                          <td>₹{profitData.creditNotes?.[i]?.toLocaleString() || 0}</td>
                          <td>₹{profitData.debitNotes?.[i]?.toLocaleString() || 0}</td>
                          <td>₹{profit?.toLocaleString() || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'bill-distribution' && (
            <div
              className="bill-distribution-section"
              role="tabpanel"
              id="bill-distribution-panel"
              aria-labelledby="bill-distribution-tab"
            >
              <h3>Bill Distribution</h3>
              <div className="chart-container">
                <canvas id="billDistributionChart" width="400" height="400" aria-label="Bill distribution chart"></canvas>
              </div>
              <div className="distribution-details">
                <div className="distribution-card">
                  <h4>Cash Bills</h4>
                  <p>₹{billDistributionData.cashBills?.toLocaleString() || 0}</p>
                  <p>
                    {(
                      (billDistributionData.cashBills /
                        (billDistributionData.cashBills +
                          billDistributionData.creditBills +
                          billDistributionData.creditNotes +
                          billDistributionData.debitNotes)) *
                      100 || 0
                    ).toFixed(2)}
                    %
                  </p>
                </div>
                <div className="distribution-card">
                  <h4>Credit Bills</h4>
                  <p>₹{billDistributionData.creditBills?.toLocaleString() || 0}</p>
                  <p>
                    {(
                      (billDistributionData.creditBills /
                        (billDistributionData.cashBills +
                          billDistributionData.creditBills +
                          billDistributionData.creditNotes +
                          billDistributionData.debitNotes)) *
                      100 || 0
                    ).toFixed(2)}
                    %
                  </p>
                </div>
                <div className="distribution-card">
                  <h4>Credit Notes</h4>
                  <p>₹{billDistributionData.creditNotes?.toLocaleString() || 0}</p>
                  <p>
                    {(
                      (billDistributionData.creditNotes /
                        (billDistributionData.cashBills +
                          billDistributionData.creditBills +
                          billDistributionData.creditNotes +
                          billDistributionData.debitNotes)) *
                      100 || 0
                    ).toFixed(2)}
                    %
                  </p>
                </div>
                <div className="distribution-card">
                  <h4>Debit Notes</h4>
                  <p>₹{billDistributionData.debitNotes?.toLocaleString() || 0}</p>
                  <p>
                    {(
                      (billDistributionData.debitNotes /
                        (billDistributionData.cashBills +
                          billDistributionData.creditBills +
                          billDistributionData.creditNotes +
                          billDistributionData.debitNotes)) *
                      100 || 0
                    ).toFixed(2)}
                    %
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {localStorage.getItem('role') === 'super_admin' && (
          <div className="super-admin-controls">
            <button className="add-feature-btn" onClick={handleAddFeature} aria-label="Add new feature">
              Add New Feature
            </button>
          </div>
        )}

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content" role="dialog" aria-labelledby="modal-title">
              <button
                className="close-modal"
                onClick={() => setShowModal(false)}
                aria-label="Close modal"
              >
                ×
              </button>
              <h3 id="modal-title">{modalData.length ? `${modalData[0].type} Details` : 'No Data'}</h3>
              <table>
                <thead>
                  <tr>
                    {modalData.length > 0 &&
                      Object.keys(modalData[0])
                        .filter((key) => key !== 'type')
                        .map((key) => (
                          <th key={key}>
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                          </th>
                        ))}
                  </tr>
                </thead>
                <tbody>
                  {modalData.map((item, i) => (
                    <tr key={i}>
                      {Object.entries(item)
                        .filter(([key]) => key !== 'type')
                        .map(([key, value]) => (
                          <td key={key}>
                            {key.toLowerCase().includes('date')
                              ? new Date(value).toLocaleDateString()
                              : key.toLowerCase().includes('amount')
                              ? `₹${value.toLocaleString()}`
                              : value}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showStaffModal && (
          <div className="modal-overlay">
            <div className="modal-content" role="dialog" aria-labelledby="staff-modal-title">
              <button
                className="close-modal"
                onClick={() => setShowStaffModal(false)}
                aria-label="Close staff modal"
              >
                ×
              </button>
              <h3 id="staff-modal-title">Staff Management</h3>

              {showMessageForm && (
                <div className="message-form">
                  <h4>Send Message to Staff</h4>
                  {staffList.length === 0 ? (
                    <p>No staff available to message.</p>
                  ) : (
                    <div className="staff-selection">
                      {staffList.map((staff) => (
                        <label key={staff._id} className="staff-selection-label">
                          <input
                            type="checkbox"
                            checked={selectedStaff.includes(staff._id)}
                            onChange={() => handleStaffSelection(staff._id)}
                            aria-label={`Select ${staff.name} for messaging`}
                          />
                          {staff.name}
                        </label>
                      ))}
                    </div>
                  )}
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message here..."
                    rows="4"
                    aria-label="Message input"
                  />
                  <button onClick={handleSendMessage} aria-label="Send message to selected staff">Send Message</button>
                </div>
              )}

              <div className="staff-list">
                {staffList.map((staff) => (
                  <div key={staff._id} className="staff-card">
                    {editingStaff && editingStaff._id === staff._id ? (
                      <div>
                        <div
                          className="staff-profile-pic"
                          style={{ backgroundImage: staff.photo ? `url(${staff.photo instanceof File ? URL.createObjectURL(staff.photo) : staff.photo})` : 'none' }}
                          onClick={() => document.getElementById(`edit-photo-${staff._id}`).click()}
                          role="button"
                          aria-label="Upload staff photo"
                        >
                          {!staff.photo && <span>Upload Photo</span>}
                        </div>
                        <input
                          type="file"
                          id={`edit-photo-${staff._id}`}
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(e, setEditingStaff, editingStaff)}
                          style={{ display: 'none' }}
                          aria-hidden="true"
                        />
                        <label>
                          Name:
                          <input
                            type="text"
                            value={editingStaff.name}
                            onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                            aria-label="Edit staff name"
                          />
                        </label>
                        <label>
                          Email:
                          <input
                            type="email"
                            value={editingStaff.email}
                            onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                            aria-label="Edit staff email"
                          />
                        </label>
                        <label>
                          Phone:
                          <input
                            type="text"
                            value={editingStaff.phone}
                            onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                            aria-label="Edit staff phone"
                          />
                        </label>
                        <label>
                          Role:
                          <select
                            value={editingStaff.role}
                            onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                            aria-label="Edit staff role"
                          >
                            <option value="Staff">Staff</option>
                            <option value="Admin">Admin</option>
                          </select>
                        </label>
                        <button onClick={() => handleUpdateStaff(editingStaff)} aria-label="Save staff changes">Save</button>
                        <button onClick={() => setEditingStaff(null)} aria-label="Cancel editing">Cancel</button>
                      </div>
                    ) : (
                      <div>
                        <div
                          className="staff-profile-pic"
                          style={{ backgroundImage: staff.photo ? `url(${staff.photo})` : 'none' }}
                          aria-label={`Profile picture for ${staff.name}`}
                        >
                          {!staff.photo && <span>No Photo</span>}
                        </div>
                        <h4>{staff.name}</h4>
                        <p><strong>Email:</strong> {staff.email}</p>
                        <p><strong>Phone:</strong> {staff.phone || 'N/A'}</p>
                        <p><strong>Role:</strong> {staff.role}</p>
                        <p><strong>Cash Bills:</strong> ₹{staff.cashBill?.toLocaleString() || 0}</p>
                        <p><strong>Credit Bills:</strong> ₹{staff.creditBill?.toLocaleString() || 0}</p>
                        <p><strong>Credit Notes:</strong> ₹{staff.creditNote?.toLocaleString() || 0}</p>
                        <p><strong>Debit Notes:</strong> ₹{staff.debitNote?.toLocaleString() || 0}</p>
                        <button onClick={() => setEditingStaff(staff)} aria-label={`Edit ${staff.name}`}>Edit</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="add-staff-form">
                <h4>Add New Staff</h4>
                <div
                  className="staff-profile-pic"
                  style={{ backgroundImage: newStaff.photo ? `url(${URL.createObjectURL(newStaff.photo)})` : 'none' }}
                  onClick={() => document.getElementById('new-staff-photo').click()}
                  role="button"
                  aria-label="Upload new staff photo"
                >
                  {!newStaff.photo && <span>Upload Photo</span>}
                </div>
                <input
                  type="file"
                  id="new-staff-photo"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, setNewStaff, newStaff)}
                  style={{ display: 'none' }}
                  aria-hidden="true"
                />
                <label>
                  Name:
                  <input
                    type="text"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    placeholder="Enter staff name"
                    aria-label="New staff name"
                  />
                </label>
                <label>
                  Email:
                  <input
                    type="email"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    placeholder="Enter staff email"
                    aria-label="New staff email"
                  />
                </label>
                <label>
                  Phone:
                  <input
                    type="text"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    placeholder="Enter staff phone"
                    aria-label="New staff phone"
                  />
                </label>
                <label>
                  Role:
                  <select
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                    aria-label="New staff role"
                  >
                    <option value="Staff">Staff</option>
                    <option value="Admin">Admin</option>
                  </select>
                </label>
                <button onClick={handleAddStaff} aria-label="Add new staff">Add Staff</button>

                {previewStaff && (
                  <div className="preview-card">
                    <h5>Preview of Added Staff</h5>
                    <div
                      className="staff-profile-pic preview-pic"
                      style={{ backgroundImage: previewStaff.photo ? `url(${previewStaff.photo})` : 'none' }}
                      aria-label={`Preview profile picture for ${previewStaff.name}`}
                    >
                      {!previewStaff.photo && <span>No Photo</span>}
                    </div>
                    <p><strong>Name:</strong> {previewStaff.name}</p>
                    <p><strong>Email:</strong> {previewStaff.email}</p>
                    <p><strong>Phone:</strong> {previewStaff.phone}</p>
                    <p><strong>Role:</strong> {previewStaff.role}</p>
                    <div className="preview-buttons">
                      <button onClick={handleSaveStaff} className="save-btn" aria-label="Save new staff">Save</button>
                      <button onClick={() => setPreviewStaff(null)} className="clear-btn" aria-label="Clear staff preview">Clear Preview</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountsAdminPanel;