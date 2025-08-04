import { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import { useSearchParams } from 'react-router-dom';
import React from 'react';
import './PaymentPage.css';

function PaymentPage() {
    const [creditBills, setCreditBills] = useState([]);
    const [form, setForm] = useState({
        billId: '',
        customerName: '',
        customerContact: { address: '', phone: '', email: '' },
        amount: 0,
        paymentMethod: 'razorpay',
        paymentTerms: 'Immediate',
        validUntil: '',
        remarks: ''
    });
    const [payments, setPayments] = useState([]);
    const [showSideView, setShowSideView] = useState(false);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        Promise.all([
            axios.get('http://localhost:5000/api/bills/credit'),
            axios.get('http://localhost:5000/api/bills/cash'),
            axios.get('http://localhost:5000/api/bills/creditNote'),
            axios.get('http://localhost:5000/api/bills/debit')
        ])
            .then(([creditRes, cashRes, creditNoteRes, debitNoteRes]) => {
                const allBills = [
                    ...creditRes.data,
                    ...cashRes.data,
                    ...creditNoteRes.data,
                    ...debitNoteRes.data
                ];
                setCreditBills(allBills);

                const billId = searchParams.get('billId');
                if (billId) {
                    const selectedBill = allBills.find(bill => bill.invoiceNumber === billId);
                    if (selectedBill) {
                        setForm(prev => ({
                            ...prev,
                            billId: selectedBill.invoiceNumber,
                            customerName: selectedBill.customerName,
                            customerContact: selectedBill.customerContact,
                            amount: selectedBill.amount
                        }));
                    }
                }
            })
            .catch(err => console.error(err));

        axios.get('http://localhost:5000/api/bills/payment')
            .then(res => setPayments(res.data))
            .catch(err => console.error(err));
    }, [searchParams]);

    const handleBillSelection = (bill) => {
        setForm({
            ...form,
            billId: bill.invoiceNumber,
            customerName: bill.customerName,
            customerContact: bill.customerContact,
            amount: bill.amount
        });
    };

    const updateCustomerContact = (field, value) => {
        setForm({ ...form, customerContact: { ...form.customerContact, [field]: value } });
    };

    const processPayment = () => {
        if (form.paymentMethod === 'razorpay') {
            alert('Processing payment via Razorpay...');
            savePayment();
        } else if (form.paymentMethod === 'card') {
            alert('Processing payment via Card...');
            savePayment();
        } else if (form.paymentMethod === 'cash') {
            alert('Processing payment via Cash (Vapase)...');
            savePayment();
        }
    };

    const savePayment = () => {
        const payment = {
            type: 'payment',
            ...form,
            date: new Date().toLocaleDateString()
        };
        axios.post('http://localhost:5000/api/bills', payment)
            .then(res => {
                setPayments([...payments, res.data]);
                setForm({
                    billId: '',
                    customerName: '',
                    customerContact: { address: '', phone: '', email: '' },
                    amount: 0,
                    paymentMethod: 'razorpay',
                    paymentTerms: 'Immediate',
                    validUntil: '',
                    remarks: ''
                });
            })
            .catch(err => console.error(err));
    };

    const downloadPDF = (payment) => {
        const doc = new jsPDF();
        let y = 10;
        doc.text(`Payment Receipt - Invoice #${payment.invoiceNumber}`, 10, y);
        y += 10;
        doc.text(`Date of Issue: ${payment.date}`, 10, y);
        y += 10;
        doc.text(`Due Date: ${payment.validUntil}`, 10, y);
        y += 10;
        doc.text(`Seller: ${payment.sellerContact.name}`, 10, y);
        y += 10;
        doc.text(`${payment.sellerContact.address}`, 10, y);
        y += 10;
        doc.text(`Phone: ${payment.sellerContact.phone} | Email: ${payment.sellerContact.email}`, 10, y);
        y += 10;
        doc.text(`Buyer: ${payment.customerName}`, 10, y);
        y += 10;
        doc.text(`${payment.customerContact.address}`, 10, y);
        y += 10;
        doc.text(`Phone: ${payment.customerContact.phone} | Email: ${payment.customerContact.email}`, 10, y);
        y += 10;
        doc.text(`Payment Terms: ${payment.paymentTerms}`, 10, y);
        y += 10;
        doc.text(`Payment Method: ${payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1)}`, 10, y);
        y += 10;
        doc.text(`Bill ID: ${payment.billId}`, 10, y);
        y += 10;
        doc.text(`Amount Paid: ${payment.amount}`, 10, y);
        y += 10;
        doc.text(`Remarks: ${payment.remarks || 'None'}`, 10, y);
        doc.save(`Payment_Receipt_${payment.invoiceNumber}.pdf`);
    };

    return (
        <div className="position-relative min-vh-100 p-4 bg-light payment-page-container">
           
            <div className="position-relative z-1 container">
                <h2 className="payment-page-title mb-4">Process Payment</h2>

                <div className="row">
                    <div className="col-lg-8 col-12 mb-4 mb-lg-0">
                        <div className="card p-4 shadow-sm">
                            <div className="row row-cols-1 row-cols-md-2 g-3 mb-3">
                                <div className="col">
                                    <label className="form-label">Select Bill/Note</label>
                                    <select
                                        value={form.billId}
                                        onChange={(e) => {
                                            const selectedBill = creditBills.find(bill => bill.invoiceNumber === e.target.value);
                                            if (selectedBill) handleBillSelection(selectedBill);
                                        }}
                                        className="form-select"
                                    >
                                        <option value="">Select a bill/note</option>
                                        {creditBills.map(bill => (
                                            <option key={bill._id} value={bill.invoiceNumber}>
                                                {bill.customerName} - #{bill.invoiceNumber} - ₹{bill.amount} ({bill.type})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col">
                                    <label className="form-label">Customer Name</label>
                                    <input
                                        type="text"
                                        placeholder="Customer Name"
                                        value={form.customerName}
                                        onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                                        className="form-control"
                                        disabled
                                    />
                                </div>
                                <div className="col">
                                    <label className="form-label">Customer Address</label>
                                    <input
                                        type="text"
                                        placeholder="Customer Address"
                                        value={form.customerContact.address}
                                        onChange={(e) => updateCustomerContact('address', e.target.value)}
                                        className="form-control"
                                    />
                                </div>
                                <div className="col">
                                    <label className="form-label">Customer Phone</label>
                                    <input
                                        type="text"
                                        placeholder="Customer Phone"
                                        value={form.customerContact.phone}
                                        onChange={(e) => updateCustomerContact('phone', e.target.value)}
                                        className="form-control"
                                    />
                                </div>
                                <div className="col">
                                    <label className="form-label">Customer Email</label>
                                    <input
                                        type="email"
                                        placeholder="Customer Email"
                                        value={form.customerContact.email}
                                        onChange={(e) => updateCustomerContact('email', e.target.value)}
                                        className="form-control"
                                    />
                                </div>
                                <div className="col">
                                    <label className="form-label">Amount</label>
                                    <input
                                        type="number"
                                        placeholder="Amount"
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) })}
                                        className="form-control"
                                        disabled
                                    />
                                </div>
                                <div className="col">
                                    <label className="form-label">Due Date</label>
                                    <input
                                        type="date"
                                        placeholder="Due Date"
                                        value={form.validUntil}
                                        onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                                        className="form-control"
                                    />
                                </div>
                                <div className="col">
                                    <label className="form-label">Payment Terms</label>
                                    <input
                                        type="text"
                                        placeholder="Payment Terms (e.g., Immediate)"
                                        value={form.paymentTerms}
                                        onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                                        className="form-control"
                                    />
                                </div>
                                <div className="col">
                                    <label className="form-label">Payment Method</label>
                                    <select
                                        value={form.paymentMethod}
                                        onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                                        className="form-select"
                                    >
                                        <option value="razorpay">Razorpay</option>
                                        <option value="card">Card</option>
                                        <option value="cash">Cash (Vapase)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Remarks</label>
                                <textarea
                                    placeholder="Remarks"
                                    value={form.remarks}
                                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                                    className="form-control"
                                ></textarea>
                            </div>
                            <div className="card p-3 bg-light">
                                <p className="fw-bold">Amount to Pay: {form.amount}</p>
                            </div>
                            <div className="d-flex flex-wrap gap-2 mt-3">
                                <button onClick={processPayment} className="btn payment-page-btn-process">
                                    Process Payment
                                </button>
                                <button onClick={() => setShowSideView(!showSideView)} className="btn payment-page-btn-toggle">
                                    {showSideView ? 'Hide Payments' : 'View Payments'}
                                </button>
                            </div>
                        </div>
                    </div>
                    {showSideView && (
                        <div className="col-lg-4 col-12">
                            <div className="card p-4 shadow-sm">
                                <h3 className="payment-page-side-title mb-3">Payment History</h3>
                                <div className="payment-page-side-content">
                                    {payments.map(payment => (
                                        <div key={payment._id} className="border-bottom pb-3 mb-3">
                                            <p className="mb-1">{payment.customerName} - {payment.date} - ₹{payment.amount} - #{payment.invoiceNumber}</p>
                                            <button onClick={() => downloadPDF(payment)} className="btn payment-page-btn-download">
                                                Download PDF
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PaymentPage;