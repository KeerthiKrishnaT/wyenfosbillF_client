import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './SuperAdminPanel.css';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const SoldProductsReport = () => {
  const [soldProducts, setSoldProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [totalSummary, setTotalSummary] = useState({ quantity: 0, totalAmount: 0 });
  const [customerSummary, setCustomerSummary] = useState({});

  useEffect(() => {
    const fetchSoldProducts = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/sold-products', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSoldProducts(res.data.data);
        setFilteredProducts(res.data.data);
      } catch (err) {
        console.error('Failed to load sold products:', err);
      }
    };
    fetchSoldProducts();
  }, []);

  useEffect(() => {
    let filtered = soldProducts;
    if (search) {
      filtered = filtered.filter(item =>
        item.itemName.toLowerCase().includes(search.toLowerCase()) ||
        item.itemCode.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (dateFilter) {
      filtered = filtered.filter(item =>
        new Date(item.date).toISOString().slice(0, 10) === dateFilter
      );
    }
    if (typeFilter) {
      filtered = filtered.filter(item => item.source === typeFilter);
    }
    setFilteredProducts(filtered);

    const totalQty = filtered.reduce((sum, i) => sum + i.quantity, 0);
    const totalVal = filtered.reduce((sum, i) => sum + i.totalAmount, 0);
    setTotalSummary({ quantity: totalQty, totalAmount: totalVal });

    const customers = {};
    filtered.forEach(i => {
      const name = i.customerName || 'Unknown';
      customers[name] = (customers[name] || 0) + i.totalAmount;
    });
    setCustomerSummary(customers);
  }, [search, dateFilter, typeFilter, soldProducts]);

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredProducts);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SoldProducts');
    XLSX.writeFile(workbook, 'SoldProducts.xlsx');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Sold Products Report', 14, 15);
    const tableColumn = [
      'Invoice No', 'Date', 'Item Code', 'Item Name', 'HSN', 'GST', 'Unit Rate', 'Qty', 'Total', 'Source'
    ];
    const tableRows = filteredProducts.map(item => [
      item.invoiceNumber,
      new Date(item.date).toLocaleDateString(),
      item.itemCode,
      item.itemName,
      item.hsn,
      item.gst,
      item.unitRate,
      item.quantity,
      item.totalAmount,
      item.source
    ]);
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20 });
    doc.save('SoldProducts.pdf');
  };

  const productLabels = [...new Set(filteredProducts.map(p => p.itemName))];
  const productQuantities = productLabels.map(label =>
    filteredProducts.filter(p => p.itemName === label).reduce((sum, i) => sum + i.quantity, 0)
  );

  const chartData = {
    labels: productLabels,
    datasets: [
      {
        label: 'Quantity Sold',
        data: productQuantities,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
    ],
  };

  const customerChartData = {
    labels: Object.keys(customerSummary),
    datasets: [
      {
        label: 'Total Value',
        data: Object.values(customerSummary),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
        ],
      },
    ],
  };

  return (
    <div className="super-admin-panel">
      <h2>Sold Products Report</h2>
      <div className="filter-bar">
        <input type="text" placeholder="Search by Item Name or Code" value={search} onChange={e => setSearch(e.target.value)} />
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option value="CashBill">Cash Bill</option>
          <option value="CreditBill">Credit Bill</option>
        </select>
        <button onClick={exportToExcel}>Export Excel</button>
        <button onClick={exportToPDF}>Export PDF</button>
      </div>

      <div className="summary-section">
        <p><strong>Total Quantity:</strong> {totalSummary.quantity}</p>
        <p><strong>Total Value:</strong> ₹{totalSummary.totalAmount.toFixed(2)}</p>
      </div>

      <div className="charts">
        <div className="chart-box">
          <h4>Top Selling Products (Bar)</h4>
          <Bar data={chartData} />
        </div>
        <div className="chart-box">
          <h4>Customer-wise Sales (Pie)</h4>
          <Pie data={customerChartData} />
        </div>
      </div>

      <div className="table-container">
        <table className="sold-products-table">
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Date</th>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>HSN</th>
              <th>GST (%)</th>
              <th>Unit Rate</th>
              <th>Quantity</th>
              <th>Total Amount</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((item, index) => (
              <tr key={index}>
                <td>{item.invoiceNumber}</td>
                <td>{new Date(item.date).toLocaleDateString()}</td>
                <td>{item.itemCode}</td>
                <td>{item.itemName}</td>
                <td>{item.hsn}</td>
                <td>{item.gst}</td>
                <td>{item.unitRate}</td>
                <td>{item.quantity}</td>
                <td>{item.totalAmount}</td>
                <td>{item.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SoldProductsReport;
