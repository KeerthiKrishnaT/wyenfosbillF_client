import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCrown } from 'react-icons/fa';
import ProfileSummary from '../ProfileSummary/ProfileSummary.js';
import defaultLogo from '../../../assets/images/wyenfos.png';
import './Sidebar.css';
import axios from 'axios';

const Sidebar = ({ isOpen, toggleSidebar, onCompanySelect, selectedCompany }) => {
  const closeTimerRef = useRef(null);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const user = JSON.parse(localStorage.getItem('user')) || { role: 'admin' };
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCompanyNames = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await axios.get('/api/companies/names', {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        if (!response.data || !response.data.success) {
          throw new Error(response.data?.error || 'Invalid response from server');
        }

        setCompanies(response.data.data);
        
        if (!selectedCompany && response.data.data?.length > 0) {
          onCompanySelect(response.data.data[0]);
        }
      } catch (err) {
        console.error('API Error:', err);
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoadingCompanies(false);
      }
    };

    fetchCompanyNames();
  }, [selectedCompany, onCompanySelect]);

 const getLogoUrl = (logoPath) => {
  if (!logoPath) return defaultLogo;
  if (logoPath.startsWith('http')) return logoPath;
  if (logoPath.startsWith('/Uploads')) return `http://localhost:5000${logoPath}`;
  return logoPath;
};

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

  const handleCompanyChange = (companyId) => {
    const selected = companies.find(c => c._id === companyId);
    onCompanySelect(selected);
  };

  const handleClick = () => {
  if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  if (window.innerWidth <= 768) {
    toggleSidebar(); 
  }
};

  const greeting = `Good ${new Date().getHours() < 12 ? 'Morning' : 'Evening'}, ${user.name || 'User'}!`;

  const linkVariants = {
    hover: { scale: 1.05, x: 5, transition: { duration: 0.2 } },
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar} />}
    {error && <div className="alert alert-danger">{error}</div>}
      <div className={`sidebar-container ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-menu">
          <ProfileSummary />
          <div className="greeting">
            {greeting} {user.role === 'admin' && <FaCrown className="crown-icon" />}
          </div>

          <div className="sidebar-company-selector">
            <div className="custom-company-dropdown">
              <button className="dropdown-toggle" onClick={toggleDropdown}>
                <img
                  src={getLogoUrl(selectedCompany?.logoUrl)}
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
                  ) : companies.length === 0 ? (
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
                          src={getLogoUrl(company.logoUrl)}
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
                src={getLogoUrl(selectedCompany.logoUrl)}
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
            {selectedCompany && (
              <>
                <motion.li variants={linkVariants} whileHover="hover">
                  <Link to="/customers" className="sidebar-link" onClick={handleClick}>
                    Manage Customers
                  </Link>
                </motion.li>
                <motion.li variants={linkVariants} whileHover="hover">
                  <Link to="/cash-bill" state={{ selectedCompany }} className="sidebar-link" onClick={handleClick}>
                    Cash Bill
                  </Link>
                </motion.li>
                <motion.li variants={linkVariants} whileHover="hover">
                  <Link to="/credit-bill" state={{ selectedCompany }} className="sidebar-link" onClick={handleClick}>
                    Credit Bill
                  </Link>
                </motion.li>
                <motion.li variants={linkVariants} whileHover="hover">
                  <Link to="/credit-note" state={{ selectedCompany }} className="sidebar-link" onClick={handleClick}>
                    Credit Note
                  </Link>
                </motion.li>
                <motion.li variants={linkVariants} whileHover="hover">
                  <Link to="/debit-note" state={{ selectedCompany }} className="sidebar-link" onClick={handleClick}>
                    Debit Note
                  </Link>
                </motion.li>
                <motion.li variants={linkVariants} whileHover="hover">
                  <Link to="/payment-receipt" state={{ selectedCompany }} className="sidebar-link" onClick={handleClick}>
                    Payment Receipt
                  </Link>
                </motion.li>
                <motion.li variants={linkVariants} whileHover="hover">
                  <Link to="/quotation" state={{ selectedCompany }} className="sidebar-link" onClick={handleClick}>
                    Quotation
                  </Link>
                </motion.li>
                <motion.li variants={linkVariants} whileHover="hover" className="logout-item">
                  <button
                    className="signout-btn"
                    onClick={() => {
                      handleClick();
                      window.location.href = '/signin';
                    }}
                  >
                    Sign Out
                  </button>
                </motion.li>
              </>
            )}
          </ul>
        </div>
      </div>
    </>
  );
};

export default Sidebar;