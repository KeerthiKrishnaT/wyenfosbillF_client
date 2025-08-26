import React, { memo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';
import Wyenfos_bills_logo from '../../assets/images/Wyenfos_bills_logo.png';

const Header = memo(() => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const headerRef = useRef(null);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  return (
    <header className="header-container" role="banner" ref={headerRef}>
      <div className="logo-title-container">
        <img 
          src={Wyenfos_bills_logo} 
          alt="WyenFos Bills - Company Logo" 
          className="logo"
          loading="lazy"
        />
        <h1 className="header-title">WYENFOS BILLS</h1>
      </div>

      <button 
        className="mobile-menu-button"
        onClick={toggleMobileMenu}
        aria-label="Toggle navigation menu"
        aria-expanded={isMobileMenuOpen}
        aria-controls="auth-navigation"
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      <nav 
        id="auth-navigation"
        className={`auth-buttons ${isMobileMenuOpen ? 'mobile-open' : ''}`}
        role="navigation" 
        aria-label="Authentication navigation"
      >
        <Link 
          to="/register" 
          className="auth-button"
          aria-label="Register for a new account"
          onClick={closeMobileMenu}
        >
          Register
        </Link>
        <Link 
          to="/login" 
          className="auth-button"
          aria-label="Login to your account"
          onClick={closeMobileMenu}
        >
          Login
        </Link>
      </nav>
    </header>
  );
});

Header.displayName = 'Header';
export default Header;
