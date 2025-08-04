import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VoucherManagement.css'

const VoucherManagement = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    amount: '',
    purpose: '',
    cashStatus: 'pending',
    type: 'Petty Voucher',
  });

  // Fetch all vouchers
  const fetchVouchers = async () => {
    try {
      const token = localStorage.getItem('token');
      const [pettyResponse, cashResponse] = await Promise.all([
        axios.get('http://localhost:5000/petty-vouchers', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('http://localhost:5000/petty-cash-vouchers', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const combinedVouchers = [
        ...pettyResponse.data.map((v) => ({ ...v, type: 'Petty Voucher', _id: v._id })),
        ...cashResponse.data.map((v) => ({ ...v, type: 'Petty Cash Voucher', _id: v._id })),
      ];

      setVouchers(combinedVouchers);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch vouchers: ' + (err.response?.data?.error || err.message));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Create voucher
  const handleCreateVoucher = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const endpoint = formData.type === 'Petty Voucher' ? '/petty-vouchers' : '/petty-cash-vouchers';
      const payload = {
        date: formData.date,
        amount: parseFloat(formData.amount),
        purpose: formData.purpose,
        ...(formData.type === 'Petty Cash Voucher' && { cashStatus: formData.cashStatus }),
      };

      await axios.post(`http://localhost:5000${endpoint}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setIsCreateModalOpen(false);
      setFormData({ date: '', amount: '', purpose: '', cashStatus: 'pending', type: 'Petty Voucher' });
      fetchVouchers();
    } catch (err) {
      setError('Failed to create voucher: ' + (err.response?.data?.error || err.message));
    }
  };

  // Update voucher
  const handleUpdateVoucher = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const endpoint =
        selectedVoucher.type === 'Petty Voucher'
          ? `/petty-vouchers/${selectedVoucher._id}`
          : `/petty-cash-vouchers/${selectedVoucher._id}`;
      const payload = {
        voucherId: selectedVoucher.voucherId,
        date: formData.date,
        amount: parseFloat(formData.amount),
        purpose: formData.purpose,
        ...(selectedVoucher.type === 'Petty Cash Voucher' && { cashStatus: formData.cashStatus }),
      };

      await axios.put(`http://localhost:5000${endpoint}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setIsUpdateModalOpen(false);
      setFormData({ date: '', amount: '', purpose: '', cashStatus: 'pending', type: 'Petty Voucher' });
      setSelectedVoucher(null);
      fetchVouchers();
    } catch (err) {
      setError('Failed to update voucher: ' + (err.response?.data?.error || err.message));
    }
  };

  // Delete voucher (only for Petty Cash Vouchers)
  const handleDeleteVoucher = async (voucher) => {
    if (voucher.type !== 'Petty Cash Voucher') return; // Only allow deletion for Petty Cash Vouchers
    if (!window.confirm('Are you sure you want to delete this voucher?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/petty-cash-vouchers/${voucher._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchVouchers();
    } catch (err) {
      setError('Failed to delete voucher: ' + (err.response?.data?.error || err.message));
    }
  };

  // Open update modal with selected voucher data
  const openUpdateModal = (voucher) => {
    setSelectedVoucher(voucher);
    setFormData({
      date: voucher.date.split('T')[0], // Format for input type="date"
      amount: voucher.amount,
      purpose: voucher.purpose,
      cashStatus: voucher.cashStatus || 'pending',
      type: voucher.type,
    });
    setIsUpdateModalOpen(true);
  };

  if (loading) return <div className="text-center py-4">Loading...</div>;
  if (error) return <div className="text-center text-red-500 py-4">{error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Voucher Management</h2>
      <button
        className="mb-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        onClick={() => setIsCreateModalOpen(true)}
      >
        Create Voucher
      </button>

      {/* Vouchers Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border-b text-left">Voucher ID</th>
              <th className="py-2 px-4 border-b text-left">Type</th>
              <th className="py-2 px-4 border-b text-left">Date</th>
              <th className="py-2 px-4 border-b text-left">Amount</th>
              <th className="py-2 px-4 border-b text-left">Purpose</th>
              <th className="py-2 px-4 border-b text-left">Cash Status</th>
              <th className="py-2 px-4 border-b text-left">Created At</th>
              <th className="py-2 px-4 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((voucher, index) => (
              <tr key={voucher._id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="py-2 px-4 border-b">{voucher.voucherId}</td>
                <td className="py-2 px-4 border-b">{voucher.type}</td>
                <td className="py-2 px-4 border-b">{new Date(voucher.date).toLocaleDateString()}</td>
                <td className="py-2 px-4 border-b">${voucher.amount.toFixed(2)}</td>
                <td className="py-2 px-4 border-b">{voucher.purpose}</td>
                <td className="py-2 px-4 border-b">{voucher.cashStatus || 'N/A'}</td>
                <td className="py-2 px-4 border-b">{new Date(voucher.createdAt).toLocaleString()}</td>
                <td className="py-2 px-4 border-b">
                  <button
                    className="text-blue-500 hover:underline mr-2"
                    onClick={() => openUpdateModal(voucher)}
                  >
                    Edit
                  </button>
                  {voucher.type === 'Petty Cash Voucher' && (
                    <button
                      className="text-red-500 hover:underline"
                      onClick={() => handleDeleteVoucher(voucher)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Voucher Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Create Voucher</h3>
            <form onSubmit={handleCreateVoucher}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Voucher Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="Petty Voucher">Petty Voucher</option>
                  <option value="Petty Cash Voucher">Petty Cash Voucher</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  required
                  step="0.01"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Purpose</label>
                <input
                  type="text"
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              {formData.type === 'Petty Cash Voucher' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Cash Status</label>
                  <select
                    name="cashStatus"
                    value={formData.cashStatus}
                    onChange={handleInputChange}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="pending">Pending</option>
                    <option value="disbursed">Disbursed</option>
                    <option value="settled">Settled</option>
                  </select>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="mr-2 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Voucher Modal */}
      {isUpdateModalOpen && selectedVoucher && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Update Voucher</h3>
            <form onSubmit={handleUpdateVoucher}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Voucher Type</label>
                <input
                  type="text"
                  value={formData.type}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  required
                  step="0.01"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Purpose</label>
                <input
                  type="text"
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              {formData.type === 'Petty Cash Voucher' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Cash Status</label>
                  <select
                    name="cashStatus"
                    value={formData.cashStatus}
                    onChange={handleInputChange}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="pending">Pending</option>
                    <option value="disbursed">Disbursed</option>
                    <option value="settled">Settled</option>
                  </select>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="mr-2 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  onClick={() => setIsUpdateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoucherManagement;