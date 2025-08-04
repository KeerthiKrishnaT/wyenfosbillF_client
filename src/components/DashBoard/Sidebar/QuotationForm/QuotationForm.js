import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CompanyHeader from '../CompanyHeader/CompanyHeader';
import cancelledWatermark from '../../../../assets/images/cancelled.png';
import './QuotationForm.css';

const QuotationForm = () => {
  const [quotation, setQuotation] = useState({
    refNo: '',
    date: '',
    to: '',
    from: '',
    attn: '',
    subject: '',
    items: [{ srNo: '', description: '', quantity: '', rate: '', amount: 0 }],
    dieCost: '',
    notes: '',
    contactName: '',
    contactMobile: '',
    contactEmail: '',
    isCancelled: false,
    _id: null, // Changed from id to _id for Mongoose
    createdBy: 'userIdPlaceholder', // Replace with actual user ID
  });
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedCompany, setSelectedCompany] = useState('WYENFOS BILLS');
  const [savedQuotations, setSavedQuotations] = useState([]);

  useEffect(() => {
    if (location.state?.selectedCompany) {
      setSelectedCompany(location.state.selectedCompany);
    }
    fetchQuotations();
  }, [location.state?.selectedCompany]);

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...quotation.items];
    updatedItems[index][field] = value;
    if (field === 'quantity' || field === 'rate') {
      updatedItems[index].amount = (
        parseFloat(updatedItems[index].quantity || 0) * parseFloat(updatedItems[index].rate || 0)
      ).toFixed(2);
    }
    setQuotation({ ...quotation, items: updatedItems });
  };

  const addItem = () => {
    setQuotation({
      ...quotation,
      items: [...quotation.items, { srNo: '', description: '', quantity: '', rate: '', amount: 0 }],
    });
  };

  const removeItem = (index) => {
    if (quotation.items.length > 1) {
      const updatedItems = quotation.items.filter((_, i) => i !== index);
      setQuotation({ ...quotation, items: updatedItems });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const total = quotation.items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const payload = { ...quotation, total, selectedCompany };
    try {
      if (quotation._id) {
        await axios.put(`http://localhost:5000/api/quotations/${quotation._id}`, payload);
      } else {
        const response = await axios.post('http://localhost:5000/api/quotations', payload);
        setQuotation({ ...quotation, _id: response.data._id });
      }
      alert(quotation._id ? 'Quotation updated successfully!' : 'Quotation saved successfully!');
      fetchQuotations();
    } catch (error) {
      alert('Error saving/updating quotation.');
    }
  };

  const handleEdit = async (_id) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/quotations/${_id}`);
      setQuotation(response.data);
    } catch (error) {
      alert('Error fetching quotation for edit.');
    }
  };

  const handleDelete = async (_id) => {
    if (window.confirm('Are you sure you want to delete this quotation?')) {
      try {
        await axios.delete(`http://localhost:5000/api/quotations/${_id}`);
        alert('Quotation deleted successfully!');
        fetchQuotations();
      } catch (error) {
        alert('Error deleting quotation.');
      }
    }
  };

  const fetchQuotations = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/quotations');
      setSavedQuotations(response.data);
    } catch (error) {
      alert('Error fetching quotations.');
    }
  };

  return (
    <div className="quotation-container max-w-4xl mx-auto p-8 bg-white border border-gray-200 rounded-lg shadow-md relative">
      {quotation.isCancelled && (
        <div className="quotation-cancelled-watermark">
          <img src={cancelledWatermark} alt="Cancelled" className="max-w-md w-full" />
        </div>
      )}

      <div className="quotation-header mb-8">
        <CompanyHeader selectedCompany={selectedCompany} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Ref. No.</label>
            <input
              type="text"
              value={quotation.refNo}
              onChange={(e) => setQuotation({ ...quotation, refNo: e.target.value })}
              className="mt-1 p-2 w-full border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={quotation.date}
              onChange={(e) => setQuotation({ ...quotation, date: e.target.value })}
              className="mt-1 p-2 w-full border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">To</label>
            <textarea
              value={quotation.to}
              onChange={(e) => setQuotation({ ...quotation, to: e.target.value })}
              className="mt-1 p-2 w-full border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              rows="3"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">From</label>
            <textarea
              value={quotation.from}
              onChange={(e) => setQuotation({ ...quotation, from: e.target.value })}
              className="mt-1 p-2 w-full border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              rows="3"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Attn</label>
          <input
            type="text"
            value={quotation.attn}
            onChange={(e) => setQuotation({ ...quotation, attn: e.target.value })}
            className="mt-1 p-2 w-full border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Subject</label>
          <input
            type="text"
            value={quotation.subject}
            onChange={(e) => setQuotation({ ...quotation, subject: e.target.value })}
            className="mt-1 p-2 w-full border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div className="mt-4">
          <p className="text-sm text-gray-700">
            Dear Sir,<br />
            With reference to the above-mentioned subject, we are hereby pleased to quote you our best prices as follows:
          </p>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 border text-left text-sm font-medium text-gray-700">Sr. No.</th>
                  <th className="px-4 py-2 border text-left text-sm font-medium text-gray-700">Description</th>
                  <th className="px-4 py-2 border text-left text-sm font-medium text-gray-700">Quantity</th>
                  <th className="px-4 py-2 border text-left text-sm font-medium text-gray-700">Rate</th>
                  <th className="px-4 py-2 border text-left text-sm font-medium text-gray-700">Amount</th>
                  <th className="px-4 py-2 border text-left text-sm font-medium text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-2 border">
                      <input
                        type="text"
                        value={item.srNo}
                        onChange={(e) => handleItemChange(index, 'srNo', e.target.value)}
                        className="p-1 w-full border border-gray-300 rounded focus:ring-blue-500"
                        required
                      />
                    </td>
                    <td className="px-4 py-2 border">
                      <textarea
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="p-1 w-full border border-gray-300 rounded focus:ring-blue-500"
                        rows="3"
                        required
                      />
                    </td>
                    <td className="px-4 py-2 border">
                      <input
                        type="text"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="p-1 w-full border border-gray-300 rounded focus:ring-blue-500"
                        required
                      />
                    </td>
                    <td className="px-4 py-2 border">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                        className="p-1 w-full border border-gray-300 rounded focus:ring-blue-500"
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                    <td className="px-4 py-2 border">Rs. {item.amount}</td>
                    <td className="px-4 py-2 border">
                      {quotation.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-2 p-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Add Item
          </button>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Notes</h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-700">Extra GST 18% + Transportation</p>
            <div>
              <label className="block text-sm font-medium text-gray-700">One-time Die Cost (per size)</label>
              <input
                type="number"
                value={quotation.dieCost}
                onChange={(e) => setQuotation({ ...quotation, dieCost: e.target.value })}
                className="mt-1 p-2 w-full border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                min="0"
                step="0.01"
                placeholder="Enter die cost (Rs.)"
              />
            </div>
            <p className="text-sm text-gray-700">Payment: 50% in advance once we confirm the order.</p>
            <p className="text-sm text-gray-700">Delivery: 15 to 20 days from the confirmation.</p>
            <p className="text-sm text-gray-700">This quotation is valid for 30 DAYS from the date of issue.</p>
            <textarea
              value={quotation.notes}
              onChange={(e) => setQuotation({ ...quotation, notes: e.target.value })}
              className="mt-1 p-2 w-full border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              rows="4"
              placeholder="Additional notes"
            />
            <p className="text-sm text-gray-700">
              We hope the above quotation is in line with your requirement. If you have any further queries, please feel free to contact the undersigned.
            </p>
            <p className="text-sm text-gray-700">Thanking you,<br />Best regards,</p>
            <div>
              <label className="block text-sm font-medium text-gray-700">Undersigned Name</label>
              <input
                type="text"
                value={quotation.contactName}
                onChange={(e) => setQuotation({ ...quotation, contactName: e.target.value })}
                className="mt-1 p-2 w-full border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Mobile</label>
              <input
                type="tel"
                value={quotation.contactMobile}
                onChange={(e) => setQuotation({ ...quotation, contactMobile: e.target.value })}
                className="mt-1 p-2 w-full border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={quotation.contactEmail}
                onChange={(e) => setQuotation({ ...quotation, contactEmail: e.target.value })}
                className="mt-1 p-2 w-full border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="custom-button p-2 text-white rounded"
          >
            Back
          </button>
          <div>
            <button
              type="submit"
              className="custom-button p-2 text-white rounded mr-2"
            >
              {quotation._id ? 'Update' : 'Save'}
            </button>
            {quotation._id && (
              <button
                type="button"
                onClick={() => handleDelete(quotation._id)}
                className="custom-button p-2 text-white rounded"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Saved Quotations</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead className="bg-997a8d-50">
              <tr>
                <th className="px-4 py-2 border text-left text-sm font-medium text-gray-700">ID</th>
                <th className="px-4 py-2 border text-left text-sm font-medium text-gray-700">Ref. No.</th>
                <th className="px-4 py-2 border text-left text-sm font-medium text-gray-700">Date</th>
                <th className="px-4 py-2 border text-left text-sm font-medium text-gray-700">Total</th>
                <th className="px-4 py-2 border text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {savedQuotations.map((q) => (
                <tr key={q._id} className="border-t">
                  <td className="px-4 py-2 border">{q._id}</td>
                  <td className="px-4 py-2 border">{q.refNo}</td>
                  <td className="px-4 py-2 border">{q.date}</td>
                  <td className="px-4 py-2 border">Rs. {q.total}</td>
                  <td className="px-4 py-2 border">
                    <button
                      type="button"
                      onClick={() => handleEdit(q._id)}
                      className="custom-button p-1 text-white rounded"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QuotationForm;