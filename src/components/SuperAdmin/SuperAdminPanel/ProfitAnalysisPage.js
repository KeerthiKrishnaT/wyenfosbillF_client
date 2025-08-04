import React, { useEffect, useRef, useState } from 'react';
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
import { useLocation, useNavigate } from 'react-router-dom';
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
  const location = useLocation();
  const { cashBills = [], creditBills = [], creditNotes = [], debitNotes = [] } = location.state || {};

  const filterByMonth = useCallback((bills) => {
    if (selectedMonth === 'all') return bills;
    return bills.filter(bill => {
      const billDate = new Date(bill.date);
      return billDate.getMonth() === parseInt(selectedMonth);
    });
  }, [selectedMonth]);

  useEffect(() => {
    const filteredCash = selectedType === 'all' || selectedType === 'cash' ? filterByMonth(cashBills) : [];
    const filteredCredit = selectedType === 'all' || selectedType === 'credit' ? filterByMonth(creditBills) : [];
    const filteredCreditNotes = selectedType === 'all' || selectedType === 'creditNote' ? filterByMonth(creditNotes) : [];
    const filteredDebitNotes = selectedType === 'all' || selectedType === 'debitNote' ? filterByMonth(debitNotes) : [];

    const totalCash = filteredCash.reduce((sum, bill) => sum + (bill.subtotal || 0), 0);
    const totalCredit = filteredCredit.reduce((sum, bill) => sum + (bill.totals?.subtotal || 0), 0);
    const totalCreditNotes = filteredCreditNotes.reduce((sum, note) => sum + (note.subtotal || 0), 0);
    const totalDebitNotes = filteredDebitNotes.reduce((sum, note) => {
      if (note.subtotal) return sum + note.subtotal;
      if (note.items && note.items[0]?.amount) return sum + note.items[0].amount;
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

    setLoading(false);

  }, [cashBills, creditBills, creditNotes, debitNotes, selectedType, selectedMonth, filterByMonth]);

  const pieChartOptions = {
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
  };

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
    navigate('/super-admin-panel');
  };

  return (
    <div className="profit-analysis-page">
      <h2>Profit Analysis</h2>

      <div className="filter-row">
        <label>Bill Type:</label>
        <select value={selectedType} onChange={e => setSelectedType(e.target.value)}>
          <option value="all">All</option>
          <option value="cash">Cash Bills</option>
          <option value="creditFiles">Credit Bills</option>
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
        <p>Loading profit data...</p>
      ) : (
        <>
          <div className="chart-wrapper">
            <div className="chart-container" ref={chartRef}>
              {chartData && <Pie data={chartData} options={pieChartOptions} />}
            </div>
            <div className="trend-chart-container">
              {trendData && <Line data={trendData} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Profit Trend Overview' } } }} />}
            </div>
          </div>

          <div className="totals-summary">
            <p><strong>Total Sales:</strong> ₹{totals.totalSales}</p>
            <p><strong>Total Returns:</strong> ₹{totals.totalReturns}</p>
            <p><strong>Net Profit:</strong> ₹{totals.profit}</p>
          </div>

          <div className="button-row">
            <button className="back-btn" onClick={handleBack}>Back</button>
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