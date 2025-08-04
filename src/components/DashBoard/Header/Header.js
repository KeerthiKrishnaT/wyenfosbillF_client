import React from 'react';
import FixedPlugin from '../FixedPlugin/FixedPlugin';
import './Header.css';

const Header = () => {
  const metrics = [
    { 
      title: 'Today Orders', 
      value: '32,562', 
      percentage: '10%', 
      comparison: '126 ↗ vs. previous month' 
    },
    { 
      title: 'Today Visitor', 
      value: '26,429', 
      percentage: '23%', 
      comparison: '568 ↗ vs. previous month' 
    },
    { 
      title: 'Total Expense', 
      value: '64,249', 
      percentage: '32%', 
      comparison: '232 ↗ vs. previous month' 
    },
    { 
      title: 'New Users', 
      value: '52,653', 
      percentage: '18%', 
      comparison: '235 ↗ vs. previous month' 
    }
  ];

  return (
    <header className="dashboard-header">
      <div className="header-content">
        <h1 className="dashboard-title">DASHBOARD</h1>
        
        <div className="metrics-grid">
          {metrics.map((metric, index) => (
            <div key={index} className="metric-card">
              <h3 className="metric-title">{metric.title}</h3>
              <div className="metric-main">
                <span className="metric-value">{metric.value}</span>
                <span className="metric-percentage">{metric.percentage}</span>
              </div>
              <p className="metric-comparison">{metric.comparison}</p>
            </div>
          ))}
        </div>
      </div>
      
      <FixedPlugin />
    </header>
  );
};

export default Header;