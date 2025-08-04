import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import { useWindowSize } from '@react-hook/window-size';
import { jsPDF } from 'jspdf';
import './DigitalMarketingAdminPanel.css';

const DigitalMarketingAdminPanel = () => {
  const [showPettyVouchers, setShowPettyVouchers] = useState(true);
  const [pettyVouchers, setPettyVouchers] = useState([]);
  const [pettyCashVouchers, setPettyCashVouchers] = useState([]);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState('');
  const [confettiActive, setConfettiActive] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Unified loading state for create/save
  const [newVoucher, setNewVoucher] = useState({
    date: '',
    amount: '',
    purpose: '',
    cashStatus: 'pending',
    paidTo: '',
    receivedBy: '',
    paidBy: '',
    account: '',
    voucherType: 'pettyCashVoucher',
    relatedPettyVoucherId: '',
  });
  const [currentDate, setCurrentDate] = useState('');
  const [pettyVoucherFilterDate, setPettyVoucherFilterDate] = useState('');
  const [pettyCashVoucherFilterDate, setPettyCashVoucherFilterDate] = useState('');
  const [width, height] = useWindowSize();
  const navigate = useNavigate();

  const API_BASE_URL = 'http://localhost:5000/api/digital-marketing';

  useEffect(() => {
    const today = new Date();
    setCurrentDate(today.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }));

    const token = localStorage.getItem('token');
    console.log('Initial token check:', token);
    if (!token) {
      setError('Please log in to access the admin panel');
      navigate('/login');
      return;
    }

    const fetchData = async (url, setData) => {
      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch data');
        setData(data);
      } catch (err) {
        console.error('Fetch error:', err.message);
        setError(`Failed to fetch vouchers: ${err.message}`);
      }
    };

    fetchData(`${API_BASE_URL}/petty-vouchers`, setPettyVouchers);
    fetchData(`${API_BASE_URL}/petty-cash-vouchers`, setPettyCashVouchers);
  }, [navigate]);

  const handleCreateVoucher = async () => {
    setIsLoading(true);
    try {
      if (!newVoucher.date || !newVoucher.amount || !newVoucher.purpose) {
        setError('Date, amount, and purpose are required');
        return;
      }
      if (parseFloat(newVoucher.amount) <= 0) {
        setError('Amount must be positive');
        return;
      }

      const token = localStorage.getItem('token');
      console.log('Create voucher token:', token);
      if (!token) {
        setError('Please log in to create a voucher');
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      const isPettyVoucher = newVoucher.voucherType === 'pettyVoucher';
      const url = isPettyVoucher ? `${API_BASE_URL}/petty-vouchers` : `${API_BASE_URL}/petty-cash-vouchers`;

      const payload = isPettyVoucher
  ? {
      voucherId: editingVoucher.voucherId || `VCH${Date.now()}`,
      date: new Date(editingVoucher.date).toISOString(),
      amount: parseFloat(editingVoucher.amount),
      purpose: editingVoucher.purpose,
      paidTo: editingVoucher.paidTo || undefined,
      account: editingVoucher.account || undefined,
      receivedBy: editingVoucher.receivedBy || undefined,
      paidBy: editingVoucher.paidBy || undefined,
    }
        : {
            date: new Date(newVoucher.date).toISOString(),
            amount: parseFloat(newVoucher.amount),
            purpose: newVoucher.purpose,
            cashStatus: newVoucher.cashStatus,
            relatedPettyVoucherId: newVoucher.relatedPettyVoucherId || undefined,
          };

      console.log('Creating voucher with payload:', payload, 'URL:', url, 'Headers:', {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Create voucher response:', errorData);
        throw new Error(errorData.error || 'Failed to create voucher');
      }

      const audio = new Audio('/success-ding.mp3');
      audio.play();
      setShowSuccess('Voucher Created!');
      setConfettiActive(true);
      setNewVoucher({
        date: '',
        amount: '',
        purpose: '',
        cashStatus: 'pending',
        paidTo: '',
        receivedBy: '',
        paidBy: '',
        account: '',
        voucherType: 'pettyCashVoucher',
        relatedPettyVoucherId: '',
      });

      const fetchData = async (url, setData) => {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setData(data);
      };

      if (isPettyVoucher) {
        fetchData(`${API_BASE_URL}/petty-vouchers`, setPettyVouchers);
      } else {
        fetchData(`${API_BASE_URL}/petty-cash-vouchers`, setPettyCashVouchers);
      }

      setTimeout(() => {
        setShowSuccess('');
        setConfettiActive(false);
      }, 2000);
    } catch (err) {
      console.error('Create voucher error:', err.message);
      setError(`Failed to create voucher: ${err.message}`);
      if (err.message.includes('token')) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditVoucher = (voucher, isPettyVoucher) => {
    setEditingVoucher({
      ...voucher,
      isPettyVoucher,
      date: new Date(voucher.date).toISOString().split('T')[0], // Ensure correct date format
      paidTo: voucher.paidTo || '',
      receivedBy: voucher.receivedBy || '',
      paidBy: voucher.paidBy || '',
      account: voucher.account || '',
      relatedPettyVoucherId: voucher.relatedPettyVoucherId || '',
    });
  };

  const handleSaveVoucher = async () => {
    setIsLoading(true);
    try {
      if (!editingVoucher.date || !editingVoucher.amount || !editingVoucher.purpose) {
        setError('Date, amount, and purpose are required');
        return;
      }
      if (parseFloat(editingVoucher.amount) <= 0) {
        setError('Amount must be positive');
        return;
      }

      const token = localStorage.getItem('token');
      console.log('Save voucher token:', token);
      if (!token) {
        setError('Please log in to update a voucher');
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      // Verify voucher exists
      const isPettyVoucher = editingVoucher.isPettyVoucher;
      const voucherList = isPettyVoucher ? pettyVouchers : pettyCashVouchers;
      const voucherExists = voucherList.some((v) => v._id === editingVoucher._id);
      if (!voucherExists) {
        setError('Voucher not found. Please refresh and try again.');
        return;
      }

      const url = isPettyVoucher
        ? `${API_BASE_URL}/petty-vouchers/${editingVoucher._id}`
        : `${API_BASE_URL}/petty-cash-vouchers/${editingVoucher._id}`;

      const payload = isPettyVoucher
        ? {
            voucherId: editingVoucher.voucherId || `VCH${Date.now()}`, // Fallback voucherId
            date: new Date(editingVoucher.date).toISOString(),
            amount: parseFloat(editingVoucher.amount),
            purpose: editingVoucher.purpose,
          }
        : {
            voucherId: editingVoucher.voucherId || `CASH${Date.now()}`,
            date: new Date(editingVoucher.date).toISOString(),
            amount: parseFloat(editingVoucher.amount),
            purpose: editingVoucher.purpose,
            cashStatus: editingVoucher.cashStatus,
            relatedPettyVoucherId: editingVoucher.relatedPettyVoucherId || undefined,
          };

      console.log('Updating voucher with payload:', payload, 'URL:', url, 'Headers:', {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      });

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Update voucher response:', errorData);
        throw new Error(errorData.error || 'Failed to update voucher');
      }

      const updatedVoucher = await response.json();
      console.log('Updated voucher response:', updatedVoucher);

      // Refetch data to ensure state consistency
      const fetchData = async (url, setData) => {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setData(data);
      };

      if (isPettyVoucher) {
        fetchData(`${API_BASE_URL}/petty-vouchers`, setPettyVouchers);
      } else {
        fetchData(`${API_BASE_URL}/petty-cash-vouchers`, setPettyCashVouchers);
      }

      setEditingVoucher(null);
      setShowSuccess('Voucher Updated!');
      setConfettiActive(true);
      setTimeout(() => {
        setShowSuccess('');
        setConfettiActive(false);
      }, 2000);
    } catch (err) {
      console.error('Update voucher error:', err.message);
      setError(`Failed to update voucher: ${err.message}`);
      if (err.message.includes('token') || err.message.includes('Access denied')) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCashVoucher = async (id) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Delete voucher token:', token);
      if (!token) {
        setError('Please log in to delete a voucher');
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/petty-cash-vouchers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete voucher response:', errorData);
        throw new Error(errorData.error || 'Failed to delete voucher');
      }

      setPettyCashVouchers(pettyCashVouchers.filter((v) => v._id !== id));
      setShowSuccess('Cash Voucher Deleted!');
      setConfettiActive(true);
      setTimeout(() => {
        setShowSuccess('');
        setConfettiActive(false);
      }, 2000);
    } catch (err) {
      console.error('Delete voucher error:', err.message);
      setError(`Failed to delete voucher: ${err.message}`);
      if (err.message.includes('token')) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = (isPettyVoucher) => {
    const vouchersToPrint = isPettyVoucher
      ? filterVouchersByDate(pettyVouchers, pettyVoucherFilterDate)
      : filterVouchersByDate(pettyCashVouchers, pettyCashVoucherFilterDate);

    if (!vouchersToPrint || vouchersToPrint.length === 0) {
      setError('No vouchers available to print');
      return;
    }

    try {
      let printContent;
      if (isPettyVoucher) {
        printContent = `
          <table class="print-table">
            <thead>
              <tr>
                <th>Voucher ID</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Purpose</th>
                <th>Paid To</th>
                <th>Account</th>
                <th>Received By</th>
                <th>Paid By</th>
              </tr>
            </thead>
            <tbody>
              ${vouchersToPrint
                .map(
                  (v) => `
                <tr>
                  <td>${v.voucherId || '-'}</td>
                  <td>${currentDate}</td>
                  <td>₹${v.amount.toFixed(2)}</td>
                  <td>${v.purpose || '-'}</td>
                  <td>${v.paidTo || '-'}</td>
                  <td>${v.account || '-'}</td>
                  <td>${v.receivedBy || '-'}</td>
                  <td>${v.paidBy || '-'}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `;
      } else {
        printContent = `
          <table class="print-table">
            <thead>
              <tr>
                <th>Voucher ID</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Purpose</th>
                <th>Paid To</th>
                <th>Account</th>
                <th>Received By</th>
                <th>Paid By</th>
                <th>Status</th>
                <th>Related Petty Voucher</th>
              </tr>
            </thead>
            <tbody>
              ${vouchersToPrint
                .map(
                  (v) => `
                <tr>
                  <td>${v.voucherId || '-'}</td>
                  <td>${currentDate}</td>
                  <td>₹${v.amount.toFixed(2)}</td>
                  <td>${v.purpose || '-'}</td>
                  <td>${v.paidTo || '-'}</td>
                  <td>${v.account || '-'}</td>
                  <td>${v.receivedBy || '-'}</td>
                  <td>${v.paidBy || '-'}</td>
                  <td>${v.cashStatus || '-'}</td>
                  <td>${
                    v.relatedPettyVoucherId
                      ? pettyVouchers.find((pv) => pv._id === v.relatedPettyVoucherId)?.voucherId || '-'
                      : '-'
                  }</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setError('Unable to open print window. Please allow pop-ups in your browser settings.');
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>${isPettyVoucher ? 'Petty Vouchers' : 'Petty Cash Vouchers'}</title>
            <link rel="stylesheet" href="/DigitalMarketingAdminPanel.css">
          </head>
          <body>
            ${printContent}
            <script>
              window.onload = function() {
                window.print();
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('Print error:', err.message);
      setError(`Error during printing: ${err.message}`);
    }
  };

  const handleDownload = (isPettyVoucher) => {
    const vouchersToDownload = isPettyVoucher
      ? filterVouchersByDate(pettyVouchers, pettyVoucherFilterDate)
      : filterVouchersByDate(pettyCashVouchers, pettyCashVoucherFilterDate);

    if (!vouchersToDownload || vouchersToDownload.length === 0) {
      setError('No vouchers available to download');
      return;
    }

    try {
      const doc = new jsPDF();
      if (isPettyVoucher) {
        let yPos = 20;
        doc.setFontSize(16);
        doc.setTextColor(30, 58, 138);
        doc.text('Petty Vouchers', 10, 10);

        doc.setFontSize(10);
        doc.setTextColor(0);

        const headers = [
          'Voucher ID',
          'Date',
          'Amount',
          'Purpose',
          'Paid To',
          'Account',
          'Received By',
          'Paid By',
        ];
        const colWidths = [20, 20, 20, 20, 20, 20, 20, 20];
        let xPos = 10;

        headers.forEach((header, i) => {
          doc.text(header, xPos, yPos);
          xPos += colWidths[i];
        });

        yPos += 10;

        vouchersToDownload.forEach((v) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
            xPos = 10;
            doc.setFontSize(16);
            doc.setTextColor(30, 58, 138);
            doc.text('Petty Vouchers', 10, 10);
            doc.setFontSize(10);
            doc.setTextColor(0);
            headers.forEach((header, i) => {
              doc.text(header, xPos, yPos);
              xPos += colWidths[i];
            });
            yPos += 10;
          }

          xPos = 10;
          doc.text(v.voucherId || '-', xPos, yPos);
          xPos += colWidths[0];
          doc.text(currentDate, xPos, yPos);
          xPos += colWidths[1];
          doc.text(`₹${v.amount.toFixed(2)}`, xPos, yPos);
          xPos += colWidths[2];
          doc.text(v.purpose || '-', xPos, yPos);
          xPos += colWidths[3];
          doc.text(v.paidTo || '-', xPos, yPos);
          xPos += colWidths[4];
          doc.text(v.account || '-', xPos, yPos);
          xPos += colWidths[5];
          doc.text(v.receivedBy || '-', xPos, yPos);
          xPos += colWidths[6];
          doc.text(v.paidBy || '-', xPos, yPos);
          yPos += 10;
        });
      } else {
        let yPos = 20;
        doc.setFontSize(16);
        doc.setTextColor(30, 58, 138);
        doc.text('Petty Cash Vouchers', 10, 10);

        doc.setFontSize(10);
        doc.setTextColor(0);

        const headers = [
          'Voucher ID',
          'Date',
          'Amount',
          'Purpose',
          'Paid To',
          'Account',
          'Received By',
          'Paid By',
          'Status',
          'Related Petty Voucher',
        ];
        const colWidths = [20, 20, 20, 20, 20, 20, 20, 20, 20, 20];
        let xPos = 10;

        headers.forEach((header, i) => {
          doc.text(header, xPos, yPos);
          xPos += colWidths[i];
        });

        yPos += 10;

        vouchersToDownload.forEach((v) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
            xPos = 10;
            doc.setFontSize(16);
            doc.setTextColor(30, 58, 138);
            doc.text('Petty Cash Vouchers', 10, 10);
            doc.setFontSize(10);
            doc.setTextColor(0);
            headers.forEach((header, i) => {
              doc.text(header, xPos, yPos);
              xPos += colWidths[i];
            });
            yPos += 10;
          }

          xPos = 10;
          doc.text(v.voucherId || '-', xPos, yPos);
          xPos += colWidths[0];
          doc.text(currentDate, xPos, yPos);
          xPos += colWidths[1];
          doc.text(`₹${v.amount.toFixed(2)}`, xPos, yPos);
          xPos += colWidths[2];
          doc.text(v.purpose || '-', xPos, yPos);
          xPos += colWidths[3];
          doc.text(v.paidTo || '-', xPos, yPos);
          xPos += colWidths[4];
          doc.text(v.account || '-', xPos, yPos);
          xPos += colWidths[5];
          doc.text(v.receivedBy || '-', xPos, yPos);
          xPos += colWidths[6];
          doc.text(v.paidBy || '-', xPos, yPos);
          xPos += colWidths[7];
          doc.text(v.cashStatus || '-', xPos, yPos);
          xPos += colWidths[8];
          doc.text(
            v.relatedPettyVoucherId
              ? pettyVouchers.find((pv) => pv._id === v.relatedPettyVoucherId)?.voucherId || '-'
              : '-',
            xPos,
            yPos
          );
          yPos += 10;
        });
      }

      doc.save(`${isPettyVoucher ? 'petty-vouchers' : 'petty-cash-vouchers'}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Download error:', err.message);
      setError(`Error during download: ${err.message}`);
    }
  };

  const filterVouchersByDate = (vouchers, filterDate) => {
    if (!filterDate) return vouchers;
    try {
      const selectedDate = new Date(filterDate);
      return vouchers.filter((voucher) => {
        const voucherDate = new Date(voucher.date);
        return (
          voucherDate.getDate() === selectedDate.getDate() &&
          voucherDate.getMonth() === selectedDate.getMonth() &&
          voucherDate.getFullYear() === selectedDate.getFullYear()
        );
      });
    } catch (err) {
      console.error('Filter vouchers error:', err.message);
      setError('Invalid filter date');
      return vouchers;
    }
  };

  const filteredPettyVouchers = filterVouchersByDate(pettyVouchers, pettyVoucherFilterDate);
  const filteredPettyCashVouchers = filterVouchersByDate(pettyCashVouchers, pettyCashVoucherFilterDate);

  return (
    <div className="digital-marketing-admin-panel">
      <h2 className="text-2xl font-bold mb-4">Digital Marketing Admin Panel</h2>
      {error && <p className="error-message">{error}</p>}
      {showSuccess && <p className="success-message">{showSuccess}</p>}

      <div className="mb-4 flex gap-4">
        <button
          onClick={() => setShowPettyVouchers(true)}
          className={`px-4 py-2 rounded toggle-button ${showPettyVouchers ? 'active' : ''}`}
          disabled={isLoading}
        >
          Petty Vouchers
        </button>
        <button
          onClick={() => setShowPettyVouchers(false)}
          className={`px-4 py-2 rounded toggle-button ${!showPettyVouchers ? 'active' : ''}`}
          disabled={isLoading}
        >
          Petty Cash Vouchers
        </button>
      </div>

      <div className={`book ${showPettyVouchers ? 'book--petty-vouchers' : 'book--petty-cash-vouchers'}`}>
        <div className="petty-vouchers-section">
          <h3 className="text-xl font-semibold mb-2">Petty Vouchers</h3>
          <div className="voucher-entry-box">
            <h4 className="text-lg mb-2">Create New Petty Voucher</h4>
            <div className="voucher-form">
              <input
                type="date"
                value={newVoucher.date}
                onChange={(e) => setNewVoucher({ ...newVoucher, date: e.target.value })}
                placeholder="Date"
                required
                disabled={isLoading}
              />
              <input
                type="number"
                value={newVoucher.amount}
                onChange={(e) => setNewVoucher({ ...newVoucher, amount: e.target.value })}
                placeholder="Amount"
                required
                step="0.01"
                disabled={isLoading}
              />
              <input
                type="text"
                value={newVoucher.purpose}
                onChange={(e) => setNewVoucher({ ...newVoucher, purpose: e.target.value })}
                placeholder="Purpose"
                required
                disabled={isLoading}
              />
              <input
                type="text"
                value={newVoucher.paidTo}
                onChange={(e) => setNewVoucher({ ...newVoucher, paidTo: e.target.value })}
                placeholder="Paid To"
                disabled={isLoading}
              />
              <input
                type="text"
                value={newVoucher.account}
                onChange={(e) => setNewVoucher({ ...newVoucher, account: e.target.value })}
                placeholder="Account"
                disabled={isLoading}
              />
              <input
                type="text"
                value={newVoucher.receivedBy}
                onChange={(e) => setNewVoucher({ ...newVoucher, receivedBy: e.target.value })}
                placeholder="Received By"
                disabled={isLoading}
              />
              <input
                type="text"
                value={newVoucher.paidBy}
                onChange={(e) => setNewVoucher({ ...newVoucher, paidBy: e.target.value })}
                placeholder="Paid By"
                disabled={isLoading}
              />
              <button
                onClick={handleCreateVoucher}
                className="action-button px-4 py-2 rounded"
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Voucher'}
              </button>
            </div>
          </div>
          {editingVoucher && editingVoucher.isPettyVoucher ? (
            <div className="voucher-entry-box">
              <h4 className="text-lg mb-2">Edit Petty Voucher</h4>
              <div className="voucher-form">
                <input
                  type="date"
                  value={editingVoucher.date}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, date: e.target.value })}
                  required
                  disabled={isLoading}
                />
                <input
                  type="number"
                  value={editingVoucher.amount}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, amount: e.target.value })}
                  placeholder="Amount"
                  required
                  step="0.01"
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={editingVoucher.purpose}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, purpose: e.target.value })}
                  placeholder="Purpose"
                  required
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={editingVoucher.paidTo}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, paidTo: e.target.value })}
                  placeholder="Paid To"
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={editingVoucher.account}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, account: e.target.value })}
                  placeholder="Account"
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={editingVoucher.receivedBy}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, receivedBy: e.target.value })}
                  placeholder="Received By"
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={editingVoucher.paidBy}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, paidBy: e.target.value })}
                  placeholder="Paid By"
                  disabled={isLoading}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveVoucher}
                    className="action-button px-4 py-2 rounded"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingVoucher(null)}
                    className="action-button px-4 py-2 rounded"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex gap-4 mb-4">
                <input
                  type="date"
                  value={pettyVoucherFilterDate}
                  onChange={(e) => setPettyVoucherFilterDate(e.target.value)}
                  className="border p-2 rounded"
                  disabled={isLoading}
                />
                <button
                  onClick={() => setPettyVoucherFilterDate('')}
                  className="action-button px-4 py-2 rounded"
                  disabled={isLoading}
                >
                  Clear Filter
                </button>
              </div>
              {filteredPettyVouchers.length > 0 ? (
                <table className="voucher-table">
                  <thead>
                    <tr>
                      <th>Voucher ID</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Purpose</th>
                      <th>Paid To</th>
                      <th>Account</th>
                      <th>Received By</th>
                      <th>Paid By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPettyVouchers.map((v) => (
                      <tr key={v._id}>
                        <td>{v.voucherId || '-'}</td>
                        <td>{currentDate}</td>
                        <td>₹{v.amount.toFixed(2)}</td>
                        <td>{v.purpose || '-'}</td>
                        <td>{v.paidTo || '-'}</td>
                        <td>{v.account || '-'}</td>
                        <td>{v.receivedBy || '-'}</td>
                        <td>{v.paidBy || '-'}</td>
                        <td>
                          <button
                            onClick={() => handleEditVoucher(v, true)}
                            className="action-button px-2 py-1 rounded"
                            disabled={isLoading}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No vouchers found for the selected date.</p>
              )}
              <div className="flex gap-4 mt-4">
                <button
                  onClick={() => handlePrint(true)}
                  className="action-button px-4 py-2 rounded"
                  disabled={isLoading}
                >
                  Print
                </button>
                <button
                  onClick={() => handleDownload(true)}
                  className="action-button px-4 py-2 rounded"
                  disabled={isLoading}
                >
                  Download
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="petty-cash-vouchers-section">
          <h3 className="text-xl font-semibold mb-2">Petty Cash Vouchers</h3>
          <div className="voucher-entry-box">
            <h4 className="text-lg mb-2">Create New Voucher</h4>
            <div className="voucher-form">
              <select
                value={newVoucher.voucherType}
                onChange={(e) =>
                  setNewVoucher({ ...newVoucher, voucherType: e.target.value, relatedPettyVoucherId: '' })
                }
                disabled={isLoading}
              >
                <option value="pettyVoucher">Petty Voucher</option>
                <option value="pettyCashVoucher">Petty Cash Voucher</option>
              </select>
              {newVoucher.voucherType === 'pettyCashVoucher' && (
                <select
                  value={newVoucher.relatedPettyVoucherId}
                  onChange={(e) => setNewVoucher({ ...newVoucher, relatedPettyVoucherId: e.target.value })}
                  disabled={isLoading}
                >
                  <option value="">Select Related Petty Voucher (Optional)</option>
                  {pettyVouchers.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.voucherId} - {v.purpose} (₹{v.amount.toFixed(2)})
                    </option>
                  ))}
                </select>
              )}
              <input
                type="date"
                value={newVoucher.date}
                onChange={(e) => setNewVoucher({ ...newVoucher, date: e.target.value })}
                placeholder="Date"
                required
                disabled={isLoading}
              />
              <input
                type="number"
                value={newVoucher.amount}
                onChange={(e) => setNewVoucher({ ...newVoucher, amount: e.target.value })}
                placeholder="Amount"
                required
                step="0.01"
                disabled={isLoading}
              />
              <input
                type="text"
                value={newVoucher.purpose}
                onChange={(e) => setNewVoucher({ ...newVoucher, purpose: e.target.value })}
                placeholder="Purpose"
                required
                disabled={isLoading}
              />
              <input
                type="text"
                value={newVoucher.paidTo}
                onChange={(e) => setNewVoucher({ ...newVoucher, paidTo: e.target.value })}
                placeholder="Paid To"
                disabled={isLoading}
              />
              <input
                type="text"
                value={newVoucher.account}
                onChange={(e) => setNewVoucher({ ...newVoucher, account: e.target.value })}
                placeholder="Account"
                disabled={isLoading}
              />
              <input
                type="text"
                value={newVoucher.receivedBy}
                onChange={(e) => setNewVoucher({ ...newVoucher, receivedBy: e.target.value })}
                placeholder="Received By"
                disabled={isLoading}
              />
              <input
                type="text"
                value={newVoucher.paidBy}
                onChange={(e) => setNewVoucher({ ...newVoucher, paidBy: e.target.value })}
                placeholder="Paid By"
                disabled={isLoading}
              />
              {newVoucher.voucherType === 'pettyCashVoucher' && (
                <select
                  value={newVoucher.cashStatus}
                  onChange={(e) => setNewVoucher({ ...newVoucher, cashStatus: e.target.value })}
                  disabled={isLoading}
                >
                  <option value="pending">Pending</option>
                  <option value="disbursed">Disbursed</option>
                  <option value="settled">Settled</option>
                </select>
              )}
              <button
                onClick={handleCreateVoucher}
                className="action-button px-4 py-2 rounded"
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : newVoucher.voucherType === 'pettyVoucher' ? 'Create Petty Voucher' : 'Create Petty Cash Voucher'}
              </button>
            </div>
            {editingVoucher && !editingVoucher.isPettyVoucher ? (
              <div className="voucher-form edit-voucher-form mt-4">
                <h4 className="text-lg mb-2">Edit Petty Cash Voucher</h4>
                <select
                  value={editingVoucher.relatedPettyVoucherId}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, relatedPettyVoucherId: e.target.value })}
                  disabled={isLoading}
                >
                  <option value="">Select Related Petty Voucher (Optional)</option>
                  {pettyVouchers.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.voucherId} - {v.purpose} (₹{v.amount.toFixed(2)})
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={editingVoucher.date}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, date: e.target.value })}
                  required
                  disabled={isLoading}
                />
                <input
                  type="number"
                  value={editingVoucher.amount}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, amount: e.target.value })}
                  placeholder="Amount"
                  required
                  step="0.01"
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={editingVoucher.purpose}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, purpose: e.target.value })}
                  placeholder="Purpose"
                  required
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={editingVoucher.paidTo}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, paidTo: e.target.value })}
                  placeholder="Paid To"
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={editingVoucher.account}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, account: e.target.value })}
                  placeholder="Account"
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={editingVoucher.receivedBy}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, receivedBy: e.target.value })}
                  placeholder="Received By"
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={editingVoucher.paidBy}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, paidBy: e.target.value })}
                  placeholder="Paid By"
                  disabled={isLoading}
                />
                <select
                  value={editingVoucher.cashStatus}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, cashStatus: e.target.value })}
                  disabled={isLoading}
                >
                  <option value="pending">Pending</option>
                  <option value="disbursed">Disbursed</option>
                  <option value="settled">Settled</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveVoucher}
                    className="action-button px-4 py-2 rounded"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingVoucher(null)}
                    className="action-button px-4 py-2 rounded"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>

                </div>
              </div>
            ) : (
              <div>
                <div className="flex gap-4 mb-4">
                  <input
                    type="date"
                    value={pettyCashVoucherFilterDate}
                    onChange={(e) => setPettyCashVoucherFilterDate(e.target.value)}
                    className="border p-2 rounded"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => setPettyCashVoucherFilterDate('')}
                    className="action-button px-4 py-2 rounded"
                    disabled={isLoading}
                  >
                    Clear Filter
                  </button>
                </div>
                {filteredPettyCashVouchers.length > 0 ? (
                  <table className="voucher-table">
                    <thead>
                      <tr>
                        <th>Voucher ID</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Purpose</th>
                        <th>Paid To</th>
                        <th>Account</th>
                        <th>Received By</th>
                        <th>Paid By</th>
                        <th>Status</th>
                        <th>Related Petty Voucher</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPettyCashVouchers.map((v) => (
                        <tr key={v._id}>
                          <td>{v.voucherId || '-'}</td>
                          <td>{currentDate}</td>
                          <td>₹{v.amount.toFixed(2)}</td>
                          <td>{v.purpose || '-'}</td>
                          <td>{v.paidTo || '-'}</td>
                          <td>{v.account || '-'}</td>
                          <td>{v.receivedBy || '-'}</td>
                          <td>{v.paidBy || '-'}</td>
                          <td>{v.cashStatus || '-'}</td>
                          <td>
                            {v.relatedPettyVoucherId
                              ? pettyVouchers.find((pv) => pv._id === v.relatedPettyVoucherId)?.voucherId || '-'
                              : '-'}
                          </td>
                          <td>
                            <button
                              onClick={() => handleEditVoucher(v, false)}
                              className="action-button edit-button px-2 py-1 rounded mr-2"
                              disabled={isLoading}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCashVoucher(v._id)}
                              className="action-button delete-button px-2 py-1 rounded"
                              disabled={isLoading}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No vouchers found for the selected date.</p>
                )}
                <div className="flex gap-4 mt-4">
                  <button
                    onClick={() => handlePrint(false)}
                    className="action-button px-4 py-2 rounded"
                    disabled={isLoading}
                  >
                    Print
                  </button>
                  <button
                    onClick={() => handleDownload(false)}
                    className="action-button px-4 py-2 rounded"
                    disabled={isLoading}
                  >
                    Download
                  </button>
                  <button className="back-btn" onClick={() => navigate(-1)}>Back</button>
                </div>
              </div>
            )}
            <button
              onClick={handleCreateVoucher}
              className="tear-button"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : newVoucher.voucherType === 'pettyVoucher' ? 'Submit & Tear (Petty Voucher)' : 'Submit & Tear (Petty Cash Voucher)'}
            </button>
          </div>
        </div>
      </div>

      {confettiActive && <Confetti width={width} height={height} />}
    </div>
  );
};

export default DigitalMarketingAdminPanel;