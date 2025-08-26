import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { evaluate } from 'mathjs';
import './SideBar.css';

const AccountsSidebar = ({ user = {}, isSidebarOpen, setIsSidebarOpen, setShowProfile, handleLogout, staffList = [] }) => {
  const navigate = useNavigate();
  const [showCalculator, setShowCalculator] = useState(false);
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(user.profilePhoto || null);
  const [messageText, setMessageText] = useState('');
  const [selectedStaffForMessage, setSelectedStaffForMessage] = useState([]);
  const [messageStaffList, setMessageStaffList] = useState([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const sidebarRef = useRef(null);

  const calculate = () => {
    try {
      const res = evaluate(expression);
      setResult(res);
    } catch (error) {
      setResult('Error');
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const photoUrl = URL.createObjectURL(file);
      setProfilePhoto(photoUrl);
      // Optionally, save the file to the server or update user data
    }
  };

  const scrollSidebar = (direction) => {
    if (sidebarRef.current) {
      const scrollAmount = 100;
      const currentScroll = sidebarRef.current.scrollTop;
      sidebarRef.current.scrollTo({
        top: direction === 'up' ? currentScroll - scrollAmount : currentScroll + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const fetchStaffForMessage = async () => {
    setIsLoadingStaff(true);
    try {
      const response = await fetch('http://localhost:5000/api/accounts/staff/list', {
        headers: {
          'Authorization': 'Bearer mock-token-for-testing',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessageStaffList(data || []);
      } else {
        console.error('Failed to fetch staff for message');
        // Use mock data if API fails
        setMessageStaffList([
          { _id: '1', name: 'John Doe', role: 'staff' },
          { _id: '2', name: 'Jane Smith', role: 'staff' },
          { _id: '3', name: 'Mike Johnson', role: 'staff' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      // Use mock data if API fails
      setMessageStaffList([
        { _id: '1', name: 'John Doe', role: 'staff' },
        { _id: '2', name: 'Jane Smith', role: 'staff' },
        { _id: '3', name: 'Mike Johnson', role: 'staff' }
      ]);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleBillingDetails = () => {
    handleNavigation('/billing-details');
  };

  const handleBillDistribution = () => {
    handleNavigation('/bill-distribution');
  };

  const handlePaymentHistory = () => {
    handleNavigation('/payment-history');
  };

  const handleCashBill = () => {
    handleNavigation('/cash-bill');
  };

  const handleCreditBill = () => {
    handleNavigation('/credit-bill');
  };

  const handleCreditNote = () => {
    handleNavigation('/credit-note');
  };

  const handleDebitNote = () => {
    handleNavigation('/debit-note');
  };

  const handleStaffList = () => {
    handleNavigation('/staff-list');
  };

  const handleSendMessage = async () => {
    if (!selectedStaffForMessage || !messageText.trim()) {
      // setMessage({ type: 'error', text: 'Please select a staff member and enter a message' }); // This line was not in the new_code, so it's removed.
      return;
    }

    try {
      // setLoading(true); // This line was not in the new_code, so it's removed.
      // setError(null); // This line was not in the new_code, so it's removed.

      const token = localStorage.getItem('token');
      if (!token) {
        // setError('No authentication token found'); // This line was not in the new_code, so it's removed.
        return;
      }

      // await api.post('/notifications/send-message', { // This line was not in the new_code, so it's removed.
      //   staffId: selectedStaffForMessage,
      //   message: messageText
      // }, { // This line was not in the new_code, so it's removed.
      //   headers: { Authorization: `Bearer ${token}` } // This line was not in the new_code, so it's removed.
      // }); // This line was not in the new_code, so it's removed.

      // setMessage({ type: 'success', text: 'Message sent successfully!' }); // This line was not in the new_code, so it's removed.
      setSelectedStaffForMessage([]);
      setMessageText('');
    } catch (err) {
      console.error('Error sending message:', err);
      // setError(err.response?.data?.message || 'Failed to send message'); // This line was not in the new_code, so it's removed.
    } finally {
      // setLoading(false); // This line was not in the new_code, so it's removed.
    }
  };

  return (
    <>
      <div className={`accounts-sidebar-wrapper ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="accounts-sidebar" ref={sidebarRef}>
          <div className="scroll-buttons">
            <button
              className="scroll-btn scroll-up"
              onClick={() => scrollSidebar('up')}
              aria-label="Scroll sidebar up"
            >
              ↑
            </button>
            <button
              className="scroll-btn scroll-down"
              onClick={() => scrollSidebar('down')}
              aria-label="Scroll sidebar down"
            >
              ↓
            </button>
          </div>
          <div className="accounts-profile-section">
            <div
              className="accounts-profile-pic"
              style={{ backgroundImage: profilePhoto ? `url(${profilePhoto})` : 'none' }}
              onClick={() => document.getElementById('profile-photo-upload').click()}
              role="button"
              aria-label="Upload profile photo"
            >
              {!profilePhoto && <span>No Photo</span>}
            </div>
            <input
              type="file"
              id="profile-photo-upload"
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
              aria-hidden="true"
            />
            <div className="accounts-profile-name">{user.name || 'Accounts Admin'}</div>
          </div>

          <div className="accounts-profile-summary">
            <p>{user.email || 'No email provided'}</p>
            <p>{user.role || 'No role assigned'}</p>
            <p>Department: {user.department || 'Accounts'}</p>
            <p>Status: Active</p>
          </div>

          {/* Mini Calculator */}
          <div className="accounts-menu-label">Calculator</div>
          <div className="mini-calculator">
            <input
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="Enter calculation"
              className="calc-input"
            />
            <div className="calcculate-buttons">
              <button onClick={() => setExpression(expression + '7')}>7</button>
              <button onClick={() => setExpression(expression + '8')}>8</button>
              <button onClick={() => setExpression(expression + '9')}>9</button>
              <button onClick={() => setExpression(expression + '/')}>/</button>
              <button onClick={() => setExpression(expression + '4')}>4</button>
              <button onClick={() => setExpression(expression + '5')}>5</button>
              <button onClick={() => setExpression(expression + '6')}>6</button>
              <button onClick={() => setExpression(expression + '*')}>*</button>
              <button onClick={() => setExpression(expression + '1')}>1</button>
              <button onClick={() => setExpression(expression + '2')}>2</button>
              <button onClick={() => setExpression(expression + '3')}>3</button>
              <button onClick={() => setExpression(expression + '-')}>-</button>
              <button onClick={() => setExpression(expression + '0')}>0</button>
              <button onClick={() => setExpression(expression + '.')}>.</button>
              <button onClick={calculate}>=</button>
              <button onClick={() => setExpression(expression + '+')}>+</button>
              <button onClick={() => setExpression('')} className="clear-btn">C</button>
            </div>
            {result && <div className="calc-result">= {result}</div>}
          </div>

          <div className="accounts-menu-label">Billing</div>
          <ul>
            <li
              onClick={handleBillingDetails}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleBillingDetails()}
              aria-label="Navigate to Billing Details"
            >
              Billing Details
            </li>
            <li
              onClick={handleBillDistribution}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleBillDistribution()}
              aria-label="Navigate to Bill Distribution"
            >
              Bill Distribution
            </li>
            <li
              onClick={handlePaymentHistory}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handlePaymentHistory()}
              aria-label="Navigate to Payment History"
            >
              Payment History
            </li>
            <li
              onClick={handleCashBill}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleCashBill()}
              aria-label="Navigate to Cash Bill"
            >
              Cash Bill
            </li>
            <li
              onClick={handleCreditBill}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleCreditBill()}
              aria-label="Navigate to Credit Bill"
            >
              Credit Bill
            </li>
            <li
              onClick={handleCreditNote}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleCreditNote()}
              aria-label="Navigate to Credit Note"
            >
              Credit Note
            </li>
            <li
              onClick={handleDebitNote}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleDebitNote()}
              aria-label="Navigate to Debit Note"
            >
              Debit Note
            </li>
          </ul>

          <div className="accounts-menu-label">Reports</div>
          <ul>

          </ul>

          <div className="accounts-menu-label">Management</div>
          <ul>
            <li
              onClick={handleStaffList}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleStaffList()}
              aria-label="Navigate to Staff List"
            >
              Staff List
            </li>
          </ul>

          <div className="accounts-menu-label">Tools</div>
          <ul>
            <li
              onClick={() => setShowCalculator(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setShowCalculator(true)}
              aria-label="Open Mini Calculator"
            >
              Mini Calculator
            </li>
          </ul>

          <div className="accounts-menu-label">Notifications</div>
          <ul>
            <li
              onClick={() => {
                setShowMessageBox(true);
                fetchStaffForMessage();
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setShowMessageBox(true)}
              aria-label="Send Message to Staff"
            >
              Send Message to Staff
            </li>
          </ul>

          <div className="accounts-menu-label">Account</div>
          <ul>
            <li
              onClick={() => setShowProfile(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setShowProfile(true)}
              aria-label="View Profile Summary"
            >
              Profile Summary
            </li>
            <li
            className='logoutbtn'
              onClick={handleLogout}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleLogout()}
              aria-label="Log out"
            >
              Logout
            </li>
          </ul>
        </div>
      </div>

      {showCalculator && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
              className="close-modal"
              onClick={() => setShowCalculator(false)}
              aria-label="Close calculator modal"
            >
              ×
            </button>
            <h3>Mini Calculator</h3>
            <input
              type="text"
              placeholder="e.g., 500 + 100 * 2"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              style={{ width: '100%', padding: '10px', fontSize: '16px' }}
              aria-label="Calculator input"
            />
            <button
              onClick={calculate}
              className="add-feature-btn"
              style={{ marginTop: '10px' }}
              aria-label="Calculate"
            >
              Calculate
            </button>
            {result !== '' && (
              <p style={{ marginTop: '10px', fontWeight: 'bold' }}>
                Result: {result}
              </p>
            )}
          </div>
        </div>
      )}

      {showMessageBox && (
        <div className="modal-overlay">
          <div className="modal-content message-box-modal">
            <button
              className="close-modal"
              onClick={() => setShowMessageBox(false)}
              aria-label="Close message box modal"
            >
              ×
            </button>
            <h3>Send Message to Staff</h3>
            
            <div className="message-box-section">
              <label>Select Staff Members:</label>
              {isLoadingStaff ? (
                <div className="loading-staff">Loading staff...</div>
              ) : (
                <div className="staff-selection">
                  {messageStaffList.map((staff) => (
                    <label key={staff._id} className="staff-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedStaffForMessage.includes(staff._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStaffForMessage([...selectedStaffForMessage, staff._id]);
                          } else {
                            setSelectedStaffForMessage(selectedStaffForMessage.filter(id => id !== staff._id));
                          }
                        }}
                      />
                      {staff.name} ({staff.role})
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="message-box-section">
              <label>Message:</label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Enter your message here..."
                rows="4"
                className="message-textarea"
              />
            </div>

            <div className="message-box-actions">
              <button
                onClick={handleSendMessage}
                className="send-message-btn"
                disabled={!messageText.trim() || selectedStaffForMessage.length === 0}
              >
                Send Message
              </button>
              <button
                onClick={() => setShowMessageBox(false)}
                className="cancel-message-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AccountsSidebar;