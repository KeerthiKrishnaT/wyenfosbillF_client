import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';
import Wyenfos_bills_logo from '../../assets/images/Wyenfos_bills_logo.png';

const Header = () => {

  return (
    <header className="header-container">
      <div className="logo-title-container">
        <img src={Wyenfos_bills_logo} alt="WyenFos Logo" className="logo" />
        <h1 className="header-title">WYENFOS BILLS</h1>
      </div>

      <div className="auth-buttons">
        <Link to="/register" className="auth-button">Register</Link>
        <Link to="/login" className="auth-button">Login</Link>
      </div>

    </header>
  );
};

export default Header;
