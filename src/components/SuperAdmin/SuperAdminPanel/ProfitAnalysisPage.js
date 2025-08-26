import React, { useEffect, useRef, useState, useMemo } from 'react';
import './ProfitAnalysisPage.css';
import { useCallback } from 'react';
import { Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
} from 'chart.js';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useNavigate } from 'react-router-dom';
import { FaSpinner } from 'react-icons/fa';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
);

const ProfitAnalysisPage = () => {
  const navigate = useNavigate();
  const chartRef = useRef();
  const [chartData, setChartData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [totals, setTotals] = useState({
    totalCash: 0,
    totalCredit: 0,
    totalCreditNotes: 0,
    totalDebitNotes: 0,
    totalSales: 0,
    totalReturns: 0,
    profit: 0,
  });
  const [loading, setLoading] = useState(true);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [cashBills, setCashBills] = useState([]);
  const [creditBills, setCreditBills] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
        const [debitNotes, setDebitNotes] = useState([]);
  const [error, setError] = useState(null);

  const filterByMonth = useCallback((bills) => {
    if (selectedMonth === 'all') return bills;
    return bills.filter(bill => {
      const billDate = new Date(bill.date);
      return billDate.getMonth() === parseInt(selectedMonth);
    });
  }, [selectedMonth]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('Request timeout. Please try again.');
    }, 10000); // 10 seconds timeout
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Fetch all data in parallel
      const [cashResponse, creditResponse, creditNotesResponse, debitNotesResponse] = await Promise.all([
        fetch('http://localhost:5000/api/cashbills', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/creditbills', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/creditnotes', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/debitnotes', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      // Check if responses are ok
      if (!cashResponse.ok) {
        throw new Error(`Cash bills API error: ${cashResponse.status} ${cashResponse.statusText}`);
      }
      if (!creditResponse.ok) {
        throw new Error(`Credit bills API error: ${creditResponse.status} ${creditResponse.statusText}`);
      }
      if (!creditNotesResponse.ok) {
        throw new Error(`Credit notes API error: ${creditNotesResponse.status} ${creditNotesResponse.statusText}`);
      }
      if (!debitNotesResponse.ok) {
        throw new Error(`Debit notes API error: ${debitNotesResponse.status} ${debitNotesResponse.statusText}`);
      }
      
      const cashData = await cashResponse.json();
      const creditData = await creditResponse.json();
      const creditNotesData = await creditNotesResponse.json();
      const debitNotesData = await debitNotesResponse.json();
      
      // Handle different response structures
      const safeCashData = Array.isArray(cashData) ? cashData : (cashData?.data ? cashData.data : []);
      const safeCreditData = Array.isArray(creditData) ? creditData : (creditData?.data ? creditData.data : []);
      const safeCreditNotesData = Array.isArray(creditNotesData) ? creditNotesData : (creditNotesData?.data ? creditNotesData.data : []);
      const safeDebitNotesData = Array.isArray(debitNotesData) ? debitNotesData : (debitNotesData?.data ? debitNotesData.data : []);
      
      setCashBills(safeCashData);
      setCreditBills(safeCreditData);
      setCreditNotes(safeCreditNotesData);
      setDebitNotes(safeDebitNotesData);
      
      // Clear timeout and set loading to false after successful data fetch
      clearTimeout(timeoutId);
      setLoading(false);

    } catch (error) {
      clearTimeout(timeoutId);
      setError(`Failed to fetch data: ${error.message}. Please try again.`);
      setLoading(false);
    }
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Check if we have any data to work with
    if (!cashBills.length && !creditBills.length && !creditNotes.length && !debitNotes.length) {
      setLoading(false);
      return;
    }

    try {
      // Ensure all data is arrays before processing
    const safeCashBills = Array.isArray(cashBills) ? cashBills : [];
    const safeCreditBills = Array.isArray(creditBills) ? creditBills : [];
    const safeCreditNotes = Array.isArray(creditNotes) ? creditNotes : [];
    const safeDebitNotes = Array.isArray(debitNotes) ? debitNotes : [];



    const filteredCash = selectedType === 'all' || selectedType === 'cash' ? filterByMonth(safeCashBills) : [];
    const filteredCredit = selectedType === 'all' || selectedType === 'credit' ? filterByMonth(safeCreditBills) : [];
    const filteredCreditNotes = selectedType === 'all' || selectedType === 'creditNote' ? filterByMonth(safeCreditNotes) : [];
    const filteredDebitNotes = selectedType === 'all' || selectedType === 'debitNote' ? filterByMonth(safeDebitNotes) : [];

    // Calculate totals from the actual data structure
    const totalCash = (Array.isArray(filteredCash) ? filteredCash : []).reduce((sum, bill) => {
      // Check for different possible field structures
      if (bill.subtotal) return sum + bill.subtotal;
      if (bill.total) return sum + bill.total;
      if (bill.amount) return sum + bill.amount;
      if (bill.totals && bill.totals.subtotal) return sum + bill.totals.subtotal;
      if (bill.totals && bill.totals.total) return sum + bill.totals.total;
      // Calculate from items array if available
      if (bill.items && Array.isArray(bill.items)) {
        const itemsTotal = bill.items.reduce((itemSum, item) => {
          const itemAmount = item.amount || item.total || (item.quantity * item.rate) || 0;
          return itemSum + itemAmount;
        }, 0);
        return sum + itemsTotal;
      }
      return sum;
    }, 0);

    const totalCredit = (Array.isArray(filteredCredit) ? filteredCredit : []).reduce((sum, bill) => {
      // Check for different possible field structures
      if (bill.subtotal) return sum + bill.subtotal;
      if (bill.total) return sum + bill.total;
      if (bill.amount) return sum + bill.amount;
      if (bill.totals && bill.totals.subtotal) return sum + bill.totals.subtotal;
      if (bill.totals && bill.totals.total) return sum + bill.totals.total;
      // Calculate from items array if available
      if (bill.items && Array.isArray(bill.items)) {
        const itemsTotal = bill.items.reduce((itemSum, item) => {
          const itemAmount = item.amount || item.total || (item.quantity * item.rate) || 0;
          return itemSum + itemAmount;
        }, 0);
        return sum + itemsTotal;
      }
      return sum;
    }, 0);

    const totalCreditNotes = (Array.isArray(filteredCreditNotes) ? filteredCreditNotes : []).reduce((sum, note) => {
      // Check for different possible field structures
      if (note.subtotal) return sum + note.subtotal;
      if (note.total) return sum + note.total;
      if (note.amount) return sum + note.amount;
      if (note.totals && note.totals.subtotal) return sum + note.totals.subtotal;
      if (note.totals && note.totals.total) return sum + note.totals.total;
      // Calculate from items array if available
      if (note.items && Array.isArray(note.items)) {
        const itemsTotal = note.items.reduce((itemSum, item) => {
          const itemAmount = item.amount || item.total || (item.quantity * item.rate) || 0;
          return itemSum + itemAmount;
        }, 0);
        return sum + itemsTotal;
      }
      return sum;
    }, 0);

    const totalDebitNotes = (Array.isArray(filteredDebitNotes) ? filteredDebitNotes : []).reduce((sum, note) => {
      // Check for different possible field structures
      if (note.subtotal) return sum + note.subtotal;
      if (note.total) return sum + note.total;
      if (note.amount) return sum + note.amount;
      if (note.totals && note.totals.subtotal) return sum + note.totals.subtotal;
      if (note.totals && note.totals.total) return sum + note.totals.total;
      // Calculate from items array if available
      if (note.items && Array.isArray(note.items)) {
        const itemsTotal = note.items.reduce((itemSum, item) => {
          const itemAmount = item.amount || item.total || (item.quantity * item.rate) || 0;
          return itemSum + itemAmount;
        }, 0);
        return sum + itemsTotal;
      }
      return sum;
    }, 0);

    const totalSales = totalCash + totalCredit;
    const totalReturns = totalCreditNotes + totalDebitNotes;
    const profit = totalSales - totalReturns;



    setTotals({
      totalCash,
      totalCredit,
      totalCreditNotes,
      totalDebitNotes,
      totalSales,
      totalReturns,
      profit,
    });

    setChartData({
      labels: ['Cash Bills', 'Credit Bills', 'Credit Notes', 'Debit Notes'],
      datasets: [{
        label: 'Amount',
        data: [totalCash, totalCredit, totalCreditNotes, totalDebitNotes],
        backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#F44336'],
      }],
    });

    setTrendData({
      labels: ['Cash', 'Credit', 'Credit Notes', 'Debit Notes'],
      datasets: [
        {
          label: 'Profit Trend',
          data: [totalCash, totalCredit, -totalCreditNotes, -totalDebitNotes],
          fill: false,
          borderColor: '#3f51b5',
          tension: 0.1
        }
      ]
    });

    } catch (error) {
      setError(`Error processing data: ${error.message}`);
    }

    setLoading(false);

  }, [cashBills, creditBills, creditNotes, debitNotes, selectedType, selectedMonth, filterByMonth]);

  const pieChartOptions = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: 'Bill Subtotals Overview',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            return `${label}: ₹${value}`;
          },
        },
      },
    },
  }), []);

  const lineChartOptions = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: 'Profit Trend Overview'
      }
    }
  }), []);

  const exportAsImage = async () => {
    setDownloadingImage(true);
    try {
      const canvas = await html2canvas(chartRef.current);
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = 'ProfitChart.png';
      link.click();
    } finally {
      setTimeout(() => setDownloadingImage(false), 1000);
    }
  };

  const exportAsPDF = async () => {
    setDownloadingPDF(true);
    try {
      const canvas = await html2canvas(chartRef.current);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('ProfitChart.pdf');
    } finally {
      setTimeout(() => setDownloadingPDF(false), 1000);
    }
  };

  const handleBack = () => {
    navigate('/super-admin');
  };

  return (
    <div className="profit-analysis-page">
      <h2>Profit Analysis</h2>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="filter-row">
        <label>Bill Type:</label>
        <select value={selectedType} onChange={e => setSelectedType(e.target.value)}>
          <option value="all">All</option>
          <option value="cash">Cash Bills</option>
          <option value="credit">Credit Bills</option>
          <option value="creditNote">Credit Notes</option>
          <option value="debitNote">Debit Notes</option>
        </select>

        <label>Month:</label>
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
          <option value="all">All</option>
          {[...Array(12)].map((_, i) => {
            const month = (i + 1).toString().padStart(2, '0');
            return <option key={month} value={month}>{month}</option>;
          })}
        </select>
      </div>

      {loading ? (
        <div>
          <p>Loading profit data...</p>
        </div>
      ) : !cashBills.length && !creditBills.length && !creditNotes.length && !debitNotes.length ? (
        <div className="no-data-message">
          <p>No profit data available in the system.</p>
          <button className="back-btn" onClick={handleBack}>Back to Super Admin Panel</button>
        </div>
      ) : (
        <>
          <div className="chart-wrapper">
            <div className="chart-container" ref={chartRef}>
              {chartData && <Pie data={chartData} options={pieChartOptions} />}
            </div>
            <div className="trend-chart-container">
              {trendData && <Line data={trendData} options={lineChartOptions} />}
            </div>
          </div>

          <div className="totals-summary">
            <p><strong>Total Sales:</strong> ₹{totals.totalSales}</p>
            <p><strong>Total Returns:</strong> ₹{totals.totalReturns}</p>
            <p><strong>Net Profit:</strong> ₹{totals.profit}</p>
          </div>

          <div className="data-summary">
            <p><strong>Data Summary:</strong></p>
            <p>Cash Bills: {cashBills.length} | Credit Bills: {creditBills.length} | Credit Notes: {creditNotes.length} | Debit Notes: {debitNotes.length}</p>
          </div>

          <div className="button-row">
            <button className="back-btn" onClick={handleBack}>Back</button>
            <button onClick={fetchData} disabled={loading} className="export-button refresh">
              {loading ? <><FaSpinner className="spinner" /> Loading...</> : 'Refresh Data'}
            </button>
            <button onClick={exportAsImage} disabled={downloadingImage} className="export-button">{downloadingImage ? <><FaSpinner className="spinner" /> Exporting...</> : 'Export as Image'}</button>
            <button onClick={exportAsPDF} disabled={downloadingPDF} className="export-button pdf">{downloadingPDF ? <><FaSpinner className="spinner" /> Exporting...</> : 'Export as PDF'}</button>
            <button className="export-button delete">Delete Report</button>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfitAnalysisPage;