import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerForm from './CustomerForm';
import CustomerList from './CustomerList';
import CustomerSelect from './CustomerSelect';
import './customer.css';

function ManageCustomers() {
  const [currentPage, setCurrentPage] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const totalPages = 3;
  const navigate = useNavigate();

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const goToPage = (pageIndex) => {
    if (pageIndex >= 0 && pageIndex < totalPages) {
      setCurrentPage(pageIndex);
    }
  };

  const handleEditCustomer = (customerId) => {
    setSelectedCustomerId(customerId);
    setIsEditMode(true);
    goToPage(2); // Navigate to customer select page
  };

  const handleCustomerSelect = (customerId) => {
    setSelectedCustomerId(customerId);
    if (isEditMode) {
      // Navigate to edit form or show edit interface
      // You can add navigation to edit form here if needed
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="manage-customers-container">
      <div className="manage-customers-header">
        <button 
          onClick={handleBackToDashboard}
          className="bk-button"
          title="Back to Dashboard"
        >
          ← Back to Dashboard
        </button>
        <div className="manage-customers-title">
          Manage Customers
        </div>
      </div>

      <div className="flip-book-container">
        <div className="flip-book-wrapper">
          <div className="book-page">
            {currentPage === 0 && (
              <>
                <div className="page-header">
                  <h2>📝 Add New Customer</h2>
                  <p>Create a new customer with sequential ID</p>
                </div>
                <CustomerForm onCustomerAdded={triggerRefresh} />
              </>
            )}
            
            {currentPage === 1 && (
              <>
                <div className="page-header">
                  <h2>📋 Customer List</h2>
                  <p>View and manage all customers</p>
                </div>
                <CustomerList 
                  refreshTrigger={refreshTrigger} 
                  onEdit={handleEditCustomer}
                />
             </>
            )}
            
            {currentPage === 2 && (
              <>
                <div className="page-header">
                  <h2>🔍 Select Customer</h2>
                  <p>{isEditMode ? "Select a customer to edit" : "Choose an existing customer"}</p>
                </div>
                <CustomerSelect 
                  selectedId={selectedCustomerId} 
                  onChange={handleCustomerSelect}
                  isEditMode={isEditMode}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="nav-buttons">
        <button 
          onClick={() => {
            if (currentPage > 0) {
              const targetPage = currentPage - 1;
              goToPage(targetPage);
            }
          }} 
          className="nav-button"
          disabled={currentPage === 0}
        >
          ← Previous
        </button>
        

        
        <button 
          onClick={() => {
            if (currentPage < totalPages - 1) {
              const targetPage = currentPage + 1;
              goToPage(targetPage);
            }
          }} 
          className="nav-button"
          disabled={currentPage === totalPages - 1}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default ManageCustomers;