import React, { useEffect, useState } from 'react';
import './TotalSpent.css';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const TotalSpent = () => {
  const [amount, setAmount] = useState(0);
  const [cash, setCash] = useState(0);
  const [debit, setDebit] = useState(0);

  useEffect(() => {
    const fetchSpent = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/totalspent', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAmount(res.data.totalSpent);
        setCash(res.data.cash);
        setDebit(res.data.debit);
      } catch (err) {
        console.error('Error fetching total spent:', err);
      }
    };

    fetchSpent();
  }, []);

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Total Spent Report', 14, 20);
    autoTable(doc, {
      head: [['Cash Bill', 'Debit Note', 'Total Spent']],
      body: [[`₹${cash}`, `₹${debit}`, `₹${amount}`]],
      startY: 30,
    });
    doc.save('total-spent-report.pdf');
  };

  const exportToExcel = () => {
    const wsData = [['Cash Bill', 'Debit Note', 'Total Spent'], [cash, debit, amount]];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TotalSpent');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, 'total-spent-report.xlsx');
  };

  return (
    <div className="total-spent animated-widget">
      <div className="total-spent-header">
        <button className="month-button"><span>Month</span></button>
        <button className="icon-button">
          <span className="icon-bar">
            <span className="bar bar1"></span>
            <span className="bar bar2"></span>
            <span className="bar bar3"></span>
          </span>
        </button>
      </div>
      <div className="total-spent-content">
        <p className="text-3xl">₹{amount.toLocaleString()}</p>
        <p>Total Spent (Cash + Debit)</p>
        <div className="change">
          <span className="text-green-500">↑</span>
          <p className="text-green-500">+2.45%</p>
        </div>
        <div className="export-buttons">
          <button onClick={exportToPDF}>Export PDF</button>
          <button onClick={exportToExcel}>Export Excel</button>
        </div>
      </div>
    </div>
  );
};

export default TotalSpent;