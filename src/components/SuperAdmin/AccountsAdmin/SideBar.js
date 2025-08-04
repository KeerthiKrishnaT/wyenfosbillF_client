import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { evaluate } from 'mathjs';
import './SideBar.css';

const AccountsSidebar = ({ user = {}, isSidebarOpen, setIsSidebarOpen, setShowProfile, handleLogout }) => {
  const navigate = useNavigate();
  const [showCalculator, setShowCalculator] = useState(false);
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(user.profilePhoto || null);
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
          </div>

          <div className="accounts-menu-label">Billing</div>
          <ul>
            <li
              onClick={() => navigate('/billing-details')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/billing-details')}
              aria-label="Navigate to Billing Details"
            >
              Billing Details
            </li>
            <li
              onClick={() => navigate('/cash-bill')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/cash-bill')}
              aria-label="Navigate to Cash Bill"
            >
              Cash Bill
            </li>
            <li
              onClick={() => navigate('/credit-bill')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/credit-bill')}
              aria-label="Navigate to Credit Bill"
            >
              Credit Bill
            </li>
            <li
              onClick={() => navigate('/credit-note')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/credit-note')}
              aria-label="Navigate to Credit Note"
            >
              Credit Note
            </li>
            <li
              onClick={() => navigate('/debit-note')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/debit-note')}
              aria-label="Navigate to Debit Note"
            >
              Debit Note
            </li>
            <li
              onClick={() => navigate('/payment-history')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/payment-history')}
              aria-label="Navigate to Payment History"
            >
              Payment History
            </li>
            <li
              onClick={() => navigate('/bill-distribution')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/bill-distribution')}
              aria-label="Navigate to Bill Distribution"
            >
              Bill Distribution
            </li>
          </ul>

          <div className="accounts-menu-label">Reports</div>
          <ul>
            <li
              onClick={() => navigate('/order-summary')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/order-summary')}
              aria-label="Navigate to Order Summary"
            >
              Order Summary
            </li>
          </ul>

          <div className="accounts-menu-label">Management</div>
          <ul>
            <li
              onClick={() => navigate('/staff-list')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/staff-list')}
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
    </>
  );
};

export default AccountsSidebar;