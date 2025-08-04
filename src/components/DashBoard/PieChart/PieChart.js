import React, { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import axios from 'axios';
import './PieChart.css';

const PieChartComponent = () => {
  const [series, setSeries] = useState([]);
  const [labels, setLabels] = useState([]);
  const [colors, setColors] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/piechart');
        const { cash, credit, debit, creditNote } = res.data;
        setSeries([cash, credit, debit, creditNote]);
        setLabels(['Cash Bill', 'Credit Bill', 'Debit Note', 'Credit Note']);
        setColors(['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']);
      } catch (err) {
        console.error('Error fetching pie chart data:', err);
      }
    };

    fetchData();
  }, []);

  const options = {
    chart: {
      type: 'donut',
    },
    labels,
    colors,
    legend: {
      show: true,
      position: 'bottom',
      fontSize: '14px',
      offsetY: 10,
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '14px',
      },
      formatter: (val) => `${val.toFixed(1)}%`,
    },
    tooltip: {
      y: {
        formatter: (val) => `₹${val.toLocaleString()}`,
      },
    },
    responsive: [
      {
        breakpoint: 600,
        options: {
          chart: {
            width: 340,
          },
          legend: {
            fontSize: '12px',
            offsetY: 5,
          },
        },
      },
    ],
  };

  return (
    <div className="pie-chart-container">
      <div className="pie-chart-card animated-widget">
        <div className="pie-chart-header">
          <h4>Bill Distribution</h4>
        </div>
        <div className="pie-chart-graph">
          {series.length > 0 ? (
            <Chart options={options} series={series} type="donut" width="100%" height="350" />
          ) : (
            <p>No data available for the chart.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PieChartComponent;