import React, { useState, useEffect } from 'react';
import './FinancialPage.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode'; 

const FinancialPage = () => {
  const navigate = useNavigate();
  const [cashBills, setCashBills] = useState([]);
  const [creditBills, setCreditBills] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [debitNotes, setDebitNotes] = useState([]);
  const [filter, setFilter] = useState({ customer: '', from: '', to: '' });
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [user, setUser] = useState(null); 
  const [error, setError] = useState(null); 
  
  const currency = (value) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);

   useEffect(() => {
  const token = localStorage.getItem('token');
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  console.log('Token:', token);
  console.log('Stored user:', storedUser);
  if (!token || !storedUser) {
    console.error('Missing auth data, redirecting to login');
    setError('Missing authentication data');
    navigate('/login');
    return;
  }

  try {
    const decoded = jwtDecode(token);
    console.log('Decoded token:', decoded);

    if (!decoded || decoded.exp < Date.now() / 1000) {
      console.warn('Token expired, redirecting to login');
      setError('Token expired');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
      return;
    }

    const storedId = storedUser.id || storedUser._id || storedUser.email;
    const decodedId = decoded.id || decoded._id || decoded.email;

    if (!storedId || !decodedId || storedId !== decodedId) {
      console.warn('User data mismatch, redirecting to login');
      setError('User data mismatch');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
      return;
    }

    if (storedUser.role !== 'super_admin') {
      console.warn('Access denied: User role is', storedUser.role);
      setError('Access denied: Not Super Admin');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
      return;
    }

    setUser(storedUser);

    console.log('Fetching financial data with token:', token);
    axios
      .get('http://localhost:5000/api/finance/all', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const { cashBills, creditBills, creditNotes, debitNotes } = res.data;
        setCashBills(cashBills || []);
        setCreditBills(creditBills || []);
        setCreditNotes(creditNotes || []);
        setDebitNotes(debitNotes || []);
        localStorage.setItem('financialData', JSON.stringify(res.data));
      })
      .catch((err) => {
        console.error('Error fetching financial data:', err.response?.data || err.message);
        setError(err.response?.data?.message || 'Failed to fetch financial data');
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      });
  } catch (err) {
    console.error('Initialization error:', err.message);
    setError('Invalid token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  }
  }, [navigate]);

  const filterData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.filter((item) => {
      const customerMatch =
        item.customerName?.toLowerCase().includes(filter.customer.toLowerCase()) ||
        item.purpose?.toLowerCase().includes(filter.customer.toLowerCase());

      const date = new Date(
        item.date || item.billingDate || item.creditNoteDate || item.debitNoteDate
      );
      const from = filter.from ? new Date(filter.from) : null;
      const to = filter.to ? new Date(filter.to) : null;
      const dateMatch = (!from || date >= from) && (!to || date <= to);
      return customerMatch && dateMatch;
    });
  };

  const handleExportToExcel = () => {
  setDownloadingExcel(true);
    try {
      const wb = XLSX.utils.book_new();
      const addSheet = (name, rawData) => {
        const data = filterData(rawData);
        const rows = data.map((item) => ({
          Invoice:
            item.invoiceNumber ||
            item.invoiceNo ||
            item.debitNoteNo ||
            item.creditNoteNo ||
            '-',
          Customer: item.customerName || item.purpose || '-',
          Items: Array.isArray(item.items)
            ? item.items.map((i) => i.name || i.description).join(', ')
            : item.description || '-',
          Subtotal:
            item.subtotal ||
            item.totals?.subtotal ||
            item.amount ||
            (item.items && item.items[0]?.amount) ||
            0,
          Date: new Date(
            item.date || item.billingDate || item.creditNoteDate || item.debitNoteDate
          ).toLocaleDateString(),
        }));
        const ws = XLSX.utils.json_to_sheet(
          rows.length > 0 ? rows : [{ Message: 'No data found' }]
        );
        XLSX.utils.book_append_sheet(wb, ws, name);
      };

      addSheet('Cash Bills', cashBills);
      addSheet('Credit Bills', creditBills);
      addSheet('Credit Notes', creditNotes);
      addSheet('Debit Notes', debitNotes);

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(
        new Blob([excelBuffer], { type: 'application/octet-stream' }),
        'FinancialDocuments.xlsx'
      );
    } finally {
    setTimeout(() => setDownloadingExcel(false), 1000);
    }
  };

  const handleExportToPDF = async () => {
  setDownloadingPDF(true);
    try {
      const element = document.querySelector('.financial-page');
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('FinancialDocuments.pdf');
    } finally {
    setTimeout(() => setDownloadingPDF(false), 1000);
    }
  };

  const navigateToProfit = () => {
    navigate('/super-admin/profit-analysis', {
      state: {
        cashBills,
        creditBills,
        creditNotes,
        debitNotes,
      },
    });
  };

  const renderTable = (title, data, columns) => {
    const safeData = Array.isArray(data) ? data : [];
    return (
      <div className="bill-section">
        <h3>{title}</h3>
        {safeData.length === 0 ? (
          <p>No {title.toLowerCase()} found.</p>
        ) : (
          <table className="bill-table">
            <thead>
              <tr>
                {columns.map((col, index) => (
                  <th key={index}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {safeData.map((item, index) => (
                <tr key={item._id || item.invoiceNumber || item.invoiceNo || index}>
                  {columns.map((col, colIndex) => (
                    <td key={colIndex}>{col.render(item)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  return (
    <div className="financial-page">
      {error && <div className="error-message">{error}</div>} {/* Display error */}
      <h2>Financial Documents</h2>
      <p>
        You can filter and export <strong>Cash Bills</strong>, <strong>Credit Bills</strong>,{' '}
        <strong>Credit Notes</strong>, and <strong>Debit Notes</strong>.
      </p>

      <div className="filters">
        <input
          type="text"
          placeholder="Search by Customer Name or Purpose"
          value={filter.customer}
          onChange={(e) => setFilter({ ...filter, customer: e.target.value })}
        />
        <input
          type="date"
          value={filter.from}
          onChange={(e) => setFilter({ ...filter, from: e.target.value })}
        />
        <input
          type="date"
          value={filter.to}
          onChange={(e) => setFilter({ ...filter, to: e.target.value })}
        />
        <div className="button-group" style={{ textAlign: 'right', marginBottom: '10px' }}>
        <button className="excel-btn" onClick={handleExportToExcel} disabled={downloadingExcel}>
          {downloadingExcel ? 'Exporting...' : 'Export to Excel'}
        </button>
        <button className="pdf-btn" onClick={handleExportToPDF} disabled={downloadingPDF}>
          {downloadingPDF ? 'Exporting...' : 'Export to PDF'}
        </button>
          <button className="profit-btn" onClick={navigateToProfit}>
            View Profit Analysis
          </button>
          <button className="back-btn" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </div>
      {renderTable('Cash Bills', filterData(cashBills), [
        { label: 'Invoice Number', render: (i) => i.invoiceNumber || '-' },
        { label: 'Customer', render: (i) => i.customerName || 'N/A' },
        { label: 'Item Name(s)', render: (i) => Array.isArray(i.items) ? i.items.map(it => it.name).join(', ') : 'N/A' },
        { label: 'Subtotal', render: (i) => currency(i.subtotal) },
        { label: 'Date', render: (i) => new Date(i.billingDate || i.date).toLocaleDateString() },
      ])}

      {renderTable('Credit Bills', filterData(creditBills), [
        { label: 'Invoice Number', render: (i) => i.invoiceNo || '-' },
        { label: 'Customer', render: (i) => i.customerName || 'N/A' },
        { label: 'Item Name(s)', render: (i) => Array.isArray(i.items) ? i.items.map(it => it.description || it.name).join(', ') : 'N/A' },
        { label: 'Subtotal', render: (i) => currency(i.totals?.subtotal) },
        { label: 'Date', render: (i) => new Date(i.billingDate || i.date).toLocaleDateString() },
      ])}

      {renderTable('Credit Notes', filterData(creditNotes), [
        { label: 'Note Number', render: (i) => i.creditNoteNo || i.invoiceNumber || '-' },
        { label: 'Customer', render: (i) => i.customerName || 'N/A' },
        { label: 'Item Name(s)', render: (i) => Array.isArray(i.items) ? i.items.map(it => it.name).join(', ') : 'N/A' },
        { label: 'Subtotal', render: (i) => currency(i.subtotal) },
        { label: 'Date', render: (i) => new Date(i.creditNoteDate || i.date).toLocaleDateString() },
      ])}

      {renderTable('Debit Notes', filterData(debitNotes), [
        { label: 'Note Number', render: (i) => i.debitNoteNo || '-' },
        { label: 'Customer', render: (i) => i.customerName || 'N/A' },
        { label: 'Item Name(s)', render: (i) => Array.isArray(i.items) ? i.items.map(it => it.description || it.name).join(', ') : 'N/A' },
        { label: 'Subtotal', render: (i) => currency(i.subtotal || (i.items && i.items[0]?.amount)) },
        { label: 'Date', render: (i) => new Date(i.debitNoteDate || i.date).toLocaleDateString() },
      ])}
    </div>
  );
};

export default FinancialPage;