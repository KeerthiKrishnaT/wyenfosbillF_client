import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCrown, FaUsers, FaFileInvoiceDollar, FaCreditCard, FaStickyNote, FaReceipt, FaFileAlt } from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';

import defaultLogo from '../../../assets/images/wyenfos.png';
import './Sidebar.css';
import axios from 'axios';
import { getLogoUrl } from './utils/companyHelpers.js';

const Sidebar = ({ isOpen, toggleSidebar, onCompanySelect, selectedCompany }) => {
  const closeTimerRef = useRef(null);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const { currentUser, userProfile } = useAuth();
  
  // Use Firebase user data instead of localStorage
  const user = userProfile || { role: 'admin', name: 'User' };
  
  // Ensure user object has all required properties
  const safeUser = {
    role: user?.role || 'admin',
    name: user?.name || 'User',
    ...user
  };

  const fetchCompanyNames = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoadingCompanies(true);
      setError(null);

      const token = await currentUser.getIdToken(true);
      const response = await axios.get('/api/companies/names', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Ensure we get an array from the response
      let fetchedCompanies = [];
      if (response.data) {
        // Handle different possible response structures
        if (Array.isArray(response.data)) {
          fetchedCompanies = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          fetchedCompanies = response.data.data;
        } else if (response.data.companies && Array.isArray(response.data.companies)) {
          fetchedCompanies = response.data.companies;
        }
      }
      
      setCompanies(fetchedCompanies);

      // Set initial company selection if none selected
      if (!selectedCompany && fetchedCompanies.length > 0) {
        onCompanySelect(fetchedCompanies[0]);
      }
    } catch (error) {
      console.error('Sidebar: API Error:', error);
      
      // Fallback to test endpoint if authenticated endpoint fails
      try {
        const testResponse = await axios.get('/api/companies/test');
        let testCompanies = [];
        
        if (testResponse.data) {
          if (Array.isArray(testResponse.data)) {
            testCompanies = testResponse.data;
          } else if (testResponse.data.data && Array.isArray(testResponse.data.data)) {
            testCompanies = testResponse.data.data;
          }
        }
        
        setCompanies(testCompanies);
        
        if (!selectedCompany && testCompanies.length > 0) {
          onCompanySelect(testCompanies[0]);
        }
      } catch (testError) {
        console.error('Sidebar: Test endpoint also failed:', testError);
        setError('Failed to fetch company data');
        setCompanies([]); // Ensure companies is always an array
      }
    } finally {
      setLoadingCompanies(false);
    }
  }, [currentUser, selectedCompany, onCompanySelect]);

  useEffect(() => {
    if (currentUser) {
      fetchCompanyNames();
    } else {
      setLoadingCompanies(false);
    }
  }, [currentUser, fetchCompanyNames]);

  // Separate useEffect to handle initial company selection when companies change
  useEffect(() => {
    if (!selectedCompany && companies.length > 0) {
      onCompanySelect(companies[0]);
    }
  }, [companies, selectedCompany, onCompanySelect]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.custom-company-dropdown')) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => setDropdownOpen((prev) => !prev);
  const closeDropdown = () => setDropdownOpen(false);

  const handleCompanyChange = async (companyId) => {
    const selected = companies.find(c => c._id === companyId);
    
    try {
      // Fetch complete company details
      const idToken = await currentUser.getIdToken(true);
      const response = await axios.get(`/api/companies/details-by-name/${encodeURIComponent(selected.name)}`, {
        headers: { 
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (response.data && response.data.success) {
        console.log('Sidebar: Complete company details fetched:', response.data.company);
        onCompanySelect(response.data.company);
      } else {
        console.warn('Sidebar: Using basic company data as fallback');
        onCompanySelect(selected);
      }
    } catch (error) {
      console.error('Sidebar: Error fetching complete company details:', error);
      console.warn('Sidebar: Using basic company data as fallback');
      onCompanySelect(selected);
    }
  };

  const handleClick = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    // Always toggle sidebar
    toggleSidebar();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const greeting = `${getGreeting()}, ${safeUser.name}!`;
  
  const linkVariants = {
    hover: { scale: 1.05, x: 5, transition: { duration: 0.2 } },
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar} />}
    {error && <div className="alert alert-danger">{error}</div>}
      <div className={`sidebar-container ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-menu">
          <div className="greeting">
            <div className="greeting-text">
              {greeting}
              {safeUser.role === 'admin' && <FaCrown className="crown-icon" />}
            </div>
            <div className="greeting-time">
              {new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })}
            </div>
          </div>

          <div className="sidebar-company-selector">
            <div className="custom-company-dropdown">
              <button className="dropdown-toggle" onClick={toggleDropdown}>
                <img
                  src={getLogoUrl(selectedCompany?.logoUrl, selectedCompany?.name)}
                  alt="Logo"
                  className="dropdown-logo"
                  onError={(e) => {
                    if (e.target.src !== defaultLogo) e.target.src = defaultLogo;
                  }}
                />
                <span>{selectedCompany?.name || 'Select a Company'}</span>
                <i className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="dropdown-options">
                  {loadingCompanies ? (
                    <div className="dropdown-option loading">Loading companies...</div>
                  ) : !companies || companies.length === 0 ? (
                    <div className="dropdown-option empty">No companies available</div>
                  ) : (
                    companies.map((company) => (
                      <div
                        key={company._id}
                        className="dropdown-option"
                        onClick={() => {
                          handleCompanyChange(company._id);
                          closeDropdown();
                        }}
                      >
                        <img
                          src={getLogoUrl(company.logoUrl, company.name)}
                          alt={company.name}
                          className="dropdown-logo"
                          onError={(e) => {
                            if (e.target.src !== defaultLogo) e.target.src = defaultLogo;
                          }}
                        />
                        <div className="company-info">
                        <span className="fw-semibold ps-2">{company.name}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {selectedCompany && (
            <motion.div
              className="company-display"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.img
                src={getLogoUrl(selectedCompany.logoUrl, selectedCompany.name)}
                alt={`${selectedCompany.name} Logo`}
                className="company-logo"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                onError={(e) => {
                  if (e.target.src !== defaultLogo) e.target.src = defaultLogo;
                }}
              />
              <span className="company-name">{selectedCompany.name}</span>
            </motion.div>
          )}

          <ul className="options">
            {selectedCompany ? (
              <>
                <motion.li variants={linkVariants} whileHover="hover">
                  <Link to="/customers" className="sidebar-link" onClick={handleClick}>
                    <FaUsers className="sidebar-icon" />
                    <span>Manage Customers</span>
                  </Link>
                </motion.li>
                <motion.li variants={linkVariants} whileHover="hover">
                  <Link to="/cash-bill" state={{ selectedCompany }} className="sidebar-link" onClick={handleClick}>
                    <FaFileInvoiceDollar className="sidebar-icon" />
                    <span>Cash Bill</span>
                  </Link>
                </motion.li>
                <motion.li variants={linkVariants} whileHover="hover">
                  <Link to="/credit-bill" state={{ selectedCompany }} className="sidebar-link" onClick={handleClick}>
                    <FaCreditCard className="sidebar-icon" />
                    <span>Credit Bill</span>
                  </Link>
                </motion.li>
                <motion.li variants={linkVariants} whileHover="hover">
                  <Link to="/credit-note" state={{ selectedCompany }} className="sidebar-link" onClick={handleClick}>
                    <FaStickyNote className="sidebar-icon" />
                    <span>Credit Note</span>
                  </Link>
                </motion.li>
                <motion.li variants={linkVariants} whileHover="hover">
                  <Link to="/debit-note" state={{ selectedCompany }} className="sidebar-link" onClick={handleClick}>
                    <FaStickyNote className="sidebar-icon" />
                    <span>Debit Note</span>
                  </Link>
                </motion.li>
                <motion.li variants={linkVariants} whileHover="hover">
                  <Link to="/payment-receipt" state={{ selectedCompany }} className="sidebar-link" onClick={handleClick}>
                    <FaReceipt className="sidebar-icon" />
                    <span>Payment Receipt</span>
                  </Link>
                </motion.li>
                <motion.li variants={linkVariants} whileHover="hover">
                  <Link to="/quotation" state={{ selectedCompany }} className="sidebar-link" onClick={handleClick}>
                    <FaFileAlt className="sidebar-icon" />
                    <span>Quotation</span>
                  </Link>
                </motion.li>
              </>
            ) : (
              <motion.li variants={linkVariants} whileHover="hover">
                <div className="sidebar-link disabled">
                  <FaUsers className="sidebar-icon" />
                  <span>Please select a company first</span>
                </div>
              </motion.li>
            )}
            
            <motion.li variants={linkVariants} whileHover="hover" className="logout-item">
              <button
                className="signout-btn"
                onClick={() => {
                  handleClick();
                  window.location.href = '/signin';
                }}
              >
                <FaCrown className="sidebar-icon" />
                <span>Sign Out</span>
              </button>
            </motion.li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default Sidebar;