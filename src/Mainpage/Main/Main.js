import React from 'react';
import Header from '../../Mainpage/Header/Header.js';
import './Main.css';
import { Link } from 'react-router-dom';

const Main = () => {
  return (
    <div className="home-container">
      <Header/>
      <main className="homemain-content">
        <section className="homehero-section">
          <h1>Welcome to WYENFOS BILLS</h1>
          <p>Streamline your billing and payment processes</p>
          <div className="homecta-buttons">
            <Link to="/login" className="homecta-button primary">Login</Link>
            <Link to="/register" className="homecta-button secondary">Register</Link>
          </div>
        </section>
        
        <section className="homefeatures-section">
          <div className="homefeature-card">
            <h3>Easy Invoicing</h3>
            <p>Create professional bills in minutes</p>
          </div>
          <div className="homefeature-card">
            <h3>Payment Tracking</h3>
            <p>Monitor all your transactions</p>
          </div>
          <div className="homefeature-card">
            <h3>Secure Platform</h3>
            <p>Bank-level security for your data</p>
          </div>
          <div className="homefeature-card">
            <h3>Customer Support</h3>
            <p>24/7 support for all your needs</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Main;