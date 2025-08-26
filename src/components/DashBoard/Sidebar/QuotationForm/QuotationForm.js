import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CompanyHeader from '../CompanyHeader/CompanyHeader';
import cancelledWatermark from '../../../../assets/images/cancelled.png';
import './QuotationForm.css';

// Create authenticated axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('No token found in localStorage, request may fail due to authentication.');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const QuotationForm = () => {
  const [quotation, setQuotation] = useState({
    refNo: 'QUT-1',
    date: new Date().toISOString().split('T')[0],
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
  const [isDownloading, setIsDownloading] = useState(false);

  // Function to generate next quotation number
  const generateNextQuotationNumber = useCallback(() => {
    if (savedQuotations.length === 0) {
      return 'QUT-1';
    }
    
    // Extract numbers from existing quotation numbers
    const numbers = savedQuotations
      .map(q => {
        const match = q.refNo?.match(/QUT-(\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => num > 0);
    
    if (numbers.length === 0) {
      return 'QUT-1';
    }
    
    const nextNumber = Math.max(...numbers) + 1;
    return `QUT-${nextNumber}`;
  }, [savedQuotations]);

  useEffect(() => {
    if (location.state?.selectedCompany) {
      setSelectedCompany(location.state.selectedCompany);
    }
    fetchQuotations();
  }, [location.state?.selectedCompany]);

  // Auto-generate quotation number when savedQuotations changes
  useEffect(() => {
    if (savedQuotations.length > 0 && !quotation.refNo && !quotation._id) {
      const nextNumber = generateNextQuotationNumber();
      setQuotation(prev => ({ ...prev, refNo: nextNumber }));
    }
  }, [savedQuotations, quotation.refNo, quotation._id, generateNextQuotationNumber]);

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
    
    // Ensure quotation number is set
    if (!quotation.refNo) {
      const nextNumber = generateNextQuotationNumber();
      setQuotation(prev => ({ ...prev, refNo: nextNumber }));
      alert('Quotation number has been auto-generated. Please submit again.');
      return;
    }
    
    const total = quotation.items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    
    try {
      if (quotation._id) {
        // Check if the quotation actually exists in the database
        try {
          await api.get(`/quotations/${quotation._id}`);
        } catch (checkError) {
          alert('Quotation not found in database. Please refresh and try again.');
          return;
        }
        
        // For updates, exclude id fields from payload
        const { id, _id, ...updatePayload } = quotation;
        const payload = { ...updatePayload, total, selectedCompany };
        
        await api.put(`/quotations/${quotation._id}`, payload);
        alert('Quotation updated successfully!');
      } else {
        // For creates, use the full quotation object
        const payload = { ...quotation, total, selectedCompany };
        
        const response = await api.post('/quotations', payload);
        setQuotation({ ...quotation, _id: response.data._id });
        alert('Quotation saved successfully!');
      }
      fetchQuotations();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error saving/updating quotation.';
      alert(errorMessage);
    }
  };

  const handleEdit = async (_id) => {
    if (!_id) {
      alert('Error: Invalid quotation ID');
      return;
    }
    
    try {
      const response = await api.get(`/quotations/${_id}`);
      
      // Ensure the response has _id field
      const quotationData = {
        ...response.data,
        _id: response.data._id || response.data.id || _id
      };
      
      setQuotation(quotationData);
    } catch (error) {
      alert('Error fetching quotation for edit.');
    }
  };

  const createNewQuotation = () => {
    const nextNumber = generateNextQuotationNumber();
    setQuotation({
      refNo: nextNumber,
      date: new Date().toISOString().split('T')[0],
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
      _id: null,
      createdBy: 'userIdPlaceholder',
    });
  };

  const handleDelete = async (_id) => {
    if (!_id) {
      console.error('handleDelete called with undefined _id');
      alert('Error: Invalid quotation ID');
      return;
    }
    
    console.log('🔍 handleDelete called with ID:', _id);
    
    if (window.confirm('Are you sure you want to delete this quotation?')) {
      try {
        console.log('🗑️ Deleting quotation with ID:', _id);
        
        const response = await api.delete(`/quotations/${_id}`);
        console.log('✅ Delete response:', response);
        
        alert('Quotation deleted successfully!');
        
        // Immediately update local state by removing the deleted item
        setSavedQuotations(prev => prev.filter(q => {
          const quotationId = q.id || q._id || q.quotationId;
          return quotationId !== _id;
        }));
        
        // Also refresh from server to ensure consistency
        console.log('🔄 Refreshing quotations from server...');
        await fetchQuotations();
        
      } catch (error) {
        console.error('❌ Error deleting quotation:', error);
        console.error('📋 Error response:', error.response?.data);
        
        const errorMessage = error.response?.data?.message || error.message || 'Error deleting quotation.';
        alert(errorMessage);
      }
    }
  };

  const fetchQuotations = async () => {
    try {
      const response = await api.get('/quotations');
      
      // Handle both 'id' and '_id' fields from API
      const validQuotations = response.data.map(q => ({
        ...q,
        _id: q._id || q.id // Use _id if available, otherwise use id
      })).filter(q => q._id);
      
      setSavedQuotations(validQuotations);
      
    } catch (error) {
      alert('Error fetching quotations.');
    }
  };

  const downloadPDF = async (quotationData) => {
    if (isDownloading) return; // Prevent multiple clicks
    
    setIsDownloading(true);
    try {
      // Check if quotation data is valid
      if (!quotationData || !quotationData.refNo) {
        alert('Please fill in the quotation details before downloading');
        return;
      }
      
      // Add selectedCompany to the quotation data
      const enhancedQuotationData = {
        ...quotationData,
        selectedCompany: selectedCompany
      };
      
      // Add timeout to prevent browser freezing
      const response = await Promise.race([
        api.post('/quotations-pdf', { quotationData: enhancedQuotationData }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout - PDF generation took too long')), 30000)
        )
      ]);
      
      // Check if the response has the expected structure
      if (!response.data || !response.data.data || !response.data.data.pdf) {
        alert('Error: Invalid response from server');
        return;
      }
      
      const pdfBase64 = response.data.data.pdf;
      
      // Validate base64 string
      if (!pdfBase64 || typeof pdfBase64 !== 'string') {
        alert('Error: Invalid PDF data received');
        return;
      }
      
      console.log('🔄 Converting base64 to blob...');
      // Convert base64 to blob
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });
      
      // Create download link
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Quotation_${quotationData.refNo || quotationData._id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      
      alert('PDF downloaded successfully!');
    } catch (error) {
      if (error.message.includes('timeout')) {
        alert('PDF generation timed out. Please try again or contact support.');
      } else {
        alert(`Error downloading PDF: ${error.message}`);
      }
    } finally {
      setIsDownloading(false);
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
        <CompanyHeader 
          selectedCompany={selectedCompany} 
          billType="QUOTATION"
          billDetails={{
            invoiceNumber: quotation.refNo,
            date: quotation.date,
            reference: quotation.refNo
          }}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Quotation No.</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={quotation.refNo}
                onChange={(e) => setQuotation({ ...quotation, refNo: e.target.value })}
                className="mt-1 p-2 flex-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                placeholder="QUT-1"
                required
              />
              <button
                type="button"
                onClick={() => {
                  const nextNumber = generateNextQuotationNumber();
                  setQuotation(prev => ({ ...prev, refNo: nextNumber }));
                }}
                className="mt-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                Generate
              </button>
            </div>
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
          <p className="quotation-p">
            Dear Sir,<br />
            With reference to the above-mentioned subject, we are hereby pleased to quote you our best prices as follows:
          </p>
        </div>

        <div className="mt-6">
          <h3 className="quotation-h3">Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300 shadow-sm">
              <thead className="bg-lavender-100">
                <tr>
                  <th className="px-4 py-3 border border-gray-300 text-left text-sm font-semibold text-gray-800 bg-gray-100">Sr. No.</th>
                  <th className="px-4 py-3 border border-gray-300 text-left text-sm font-semibold text-gray-800 bg-gray-100">Description</th>
                  <th className="px-4 py-3 border border-gray-300 text-left text-sm font-semibold text-gray-800 bg-gray-100">Quantity</th>
                  <th className="px-4 py-3 border border-gray-300 text-left text-sm font-semibold text-gray-800 bg-gray-100">Rate</th>
                  <th className="px-4 py-3 border border-gray-300 text-left text-sm font-semibold text-gray-800 bg-gray-100">Amount</th>
                  <th className="px-4 py-3 border border-gray-300 text-left text-sm font-semibold text-gray-800 bg-gray-100">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {quotation.items.map((item, index) => (
                  <tr key={index} className="border-t border-gray-300 hover:bg-gray-50">
                    <td className="px-4 py-3 border border-gray-300">
                      <input
                        type="text"
                        value={item.srNo}
                        onChange={(e) => handleItemChange(index, 'srNo', e.target.value)}
                        className="p-2 w-full border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                        required
                      />
                    </td>
                    <td className="px-4 py-3 border border-gray-300">
                      <textarea
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="p-2 w-full border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                        rows="3"
                        required
                      />
                    </td>
                    <td className="px-4 py-3 border border-gray-300">
                      <input
                        type="text"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="p-2 w-full border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                        required
                      />
                    </td>
                    <td className="px-4 py-3 border border-gray-300">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                        className="p-2 w-full border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                    <td className="px-4 py-3 border border-gray-300 font-medium text-gray-800">Rs. {item.amount}</td>
                    <td className="px-4 py-3 border border-gray-300">
                      {quotation.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
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
          <h3 className="quotation-h3">Notes</h3>
          <div className="space-y-2">
            <p className="quotation-p">Extra GST 18% + Transportation</p>
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
            <p className="quotation-p">Payment: 50% in advance once we confirm the order.</p>
            <p className="quotation-p">Delivery: 15 to 20 days from the confirmation.</p>
            <p className="quotation-p">This quotation is valid for 30 DAYS from the date of issue.</p>
            <textarea
              value={quotation.notes}
              onChange={(e) => setQuotation({ ...quotation, notes: e.target.value })}
              className="mt-1 p-2 w-full border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              rows="4"
              placeholder="Additional notes"
            />
            {/* Text input area at the top */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
              <textarea
                value={quotation.additionalNotes || ''}
                onChange={(e) => setQuotation({ ...quotation, additionalNotes: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-y"
                rows="4"
                placeholder="Enter additional notes or comments here..."
              />
            </div>
            
            {/* Closing statement below the input area */}
            <div className="mt-4">
              <p className="quotation-p">
                We hope the above quotation is in line with your requirement. If you have any further queries, please feel free to contact the undersigned.
              </p>
            </div>
            
            {/* Signature section */}
            <div className="mt-4 flex justify-end">
              <div className="text-right">
                <p className="quotation-p mb-1">Thanks</p>
                <p className="quotation-p">Best regards,</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700  text-right">Undersigned Name</label>
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
          <h3 className="quotation-h3">Contact Information</h3>
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={createNewQuotation}
              className="bg-green-500 hover:bg-green-600 p-2 text-white rounded"
            >
              New Quotation
            </button>
            <button
              type="submit"
              className="custom-button p-2 text-white rounded"
            >
              {quotation._id ? 'Update' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => downloadPDF(quotation)}
              disabled={isDownloading}
              className={`p-2 text-white rounded ${
                isDownloading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {isDownloading ? 'Generating...' : 'Download PDF'}
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
        <h3 className="quotation-h3">Saved Quotations</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead className="bg-997a8d-50">
              <tr>
                <th className="px-4 py-2 border text-left text-sm font-medium text-gray-700">Quotation ID</th>
                <th className="px-4 py-2 border text-left text-sm font-medium text-gray-700">Quotation No.</th>
                <th className="px-4 py-2 border text-left text-sm font-medium text-gray-700">Date</th>
                <th className="px-4 py-2 border text-left text-sm font-medium text-gray-700">Total</th>
                <th className="px-4 py-2 border text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {savedQuotations.map((q) => {
                // Use the most reliable ID field
                const quotationId = q.id || q._id || q.quotationId;
                if (!quotationId) {
                  return null; // Skip rendering quotations without ID
                }
                return (
                  <tr key={quotationId} className="border-t">
                    <td className="px-4 py-2 border">{q.quotationId || q.refNo}</td>
                    <td className="px-4 py-2 border">{q.refNo}</td>
                    <td className="px-4 py-2 border">{q.date}</td>
                    <td className="px-4 py-2 border">Rs. {q.total}</td>
                    <td className="px-4 py-2 border">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(quotationId)}
                          className="custom-button p-1 text-white rounded text-xs"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(quotationId)}
                          className="bg-red-500 hover:bg-red-600 p-1 text-white rounded text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QuotationForm;