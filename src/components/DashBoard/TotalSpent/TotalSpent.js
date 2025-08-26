import React, { useEffect, useState } from 'react';
import './TotalSpent.css';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const TotalSpent = () => {
  const [todayProfit, setTodayProfit] = useState(0);
  const [cashRevenue, setCashRevenue] = useState(0);
  const [creditRevenue, setCreditRevenue] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayProfit = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.warn('No authentication token found');
          setTodayProfit(0);
          return;
        }
        
        // Get today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Fetch today's revenue and expenses
        const [cashBills, creditBills, debitNotes] = await Promise.all([
          axios.get('http://localhost:5000/api/cashbills/today', {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => ({ data: { total: 0 } })),
          axios.get('http://localhost:5000/api/creditbills/today', {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => ({ data: { total: 0 } })),
          axios.get('http://localhost:5000/api/debitnotes', {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => ({ data: [] }))
        ]);

        // Calculate today's revenue
        const cashRev = cashBills.data?.total || 0;
        const creditRev = creditBills.data?.total || 0;
        const totalRevenue = cashRev + creditRev;
        
        // Calculate today's expenses (debit notes)
        const todayDebitNotes = (debitNotes.data || [])
          .filter(note => {
            const noteDate = new Date(note.createdAt);
            return noteDate >= today;
          })
          .reduce((sum, note) => sum + (note.totalAmount || note.total || 0), 0);
        
        // Calculate profit (Revenue - Expenses)
        const profit = totalRevenue - todayDebitNotes;
        
        setCashRevenue(cashRev);
        setCreditRevenue(creditRev);
        setExpenses(todayDebitNotes);
        setTodayProfit(profit);
      } catch (err) {
        console.error('Error fetching today\'s profit:', err);
        setTodayProfit(0);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayProfit();
  }, []);

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Today\'s Profit Report', 14, 20);
    autoTable(doc, {
      head: [['Cash Revenue', 'Credit Revenue', 'Expenses', 'Total Profit']],
      body: [[`₹${cashRevenue.toLocaleString()}`, `₹${creditRevenue.toLocaleString()}`, `₹${expenses.toLocaleString()}`, `₹${todayProfit.toLocaleString()}`]],
      startY: 30,
    });
    doc.save('today-profit-report.pdf');
  };

  const exportToExcel = () => {
    const wsData = [
      ['Cash Revenue', 'Credit Revenue', 'Expenses', 'Total Profit'], 
      [cashRevenue, creditRevenue, expenses, todayProfit]
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TodayProfit');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, 'today-profit-report.xlsx');
  };

  return (
    <div className="total-spent animated-widget">
      <div className="total-spent-header">
        <button className="month-button"><span>Today</span></button>
        <button className="icon-button">
          <span className="icon-bar">
            <span className="bar bar1"></span>
            <span className="bar bar2"></span>
            <span className="bar bar3"></span>
          </span>
        </button>
      </div>
      <div className="total-spent-content">
        {loading ? (
          <div className="loading">Calculating today's profit...</div>
        ) : (
          <>
            <p className="text-3xl">₹{todayProfit.toLocaleString()}</p>
            <p>Today's Total Profit</p>
            <div className="profit-breakdown">
              <div className="breakdown-item">
                <span>Revenue: ₹{(cashRevenue + creditRevenue).toLocaleString()}</span>
              </div>
              <div className="breakdown-item">
                <span>Expenses: ₹{expenses.toLocaleString()}</span>
              </div>
            </div>
            <div className="change">
              <span className={`text-${todayProfit >= 0 ? 'green' : 'red'}-500`}>
                {todayProfit >= 0 ? '↑' : '↓'}
              </span>
              <p className={`text-${todayProfit >= 0 ? 'green' : 'red'}-500`}>
                {todayProfit >= 0 ? '+' : ''}{((todayProfit / (cashRevenue + creditRevenue)) * 100).toFixed(2)}%
              </p>
            </div>
            <div className="export-buttons">
              <button onClick={exportToPDF}>Export PDF</button>
              <button onClick={exportToExcel}>Export Excel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TotalSpent;