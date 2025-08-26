import React, { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import axios from 'axios';
import './PieChart.css';

const PieChartComponent = () => {
  const [series, setSeries] = useState([]);
  const [labels, setLabels] = useState([]);
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await axios.get('http://localhost:5000/api/piechart');
        const { cash, credit, debit, creditNote } = res.data;
        
        // Convert to numbers and ensure they're valid
        const cashCount = Number(cash) || 0;
        const creditCount = Number(credit) || 0;
        const debitCount = Number(debit) || 0;
        const creditNoteCount = Number(creditNote) || 0;
        
        // Only show categories that have values
        const data = [];
        const labelData = [];
        const colorData = [];
        
        if (cashCount > 0) {
          data.push(cashCount);
          labelData.push('Cash Bill');
          colorData.push('#FF6384');
        }
        
        if (creditCount > 0) {
          data.push(creditCount);
          labelData.push('Credit Bill');
          colorData.push('#36A2EB');
        }
        
        if (debitCount > 0) {
          data.push(debitCount);
          labelData.push('Debit Note');
          colorData.push('#FFCE56');
        }
        
        if (creditNoteCount > 0) {
          data.push(creditNoteCount);
          labelData.push('Credit Note');
          colorData.push('#4BC0C0');
        }
        
        // If no data, show a placeholder
        if (data.length === 0) {
          data.push(1);
          labelData.push('No Data');
          colorData.push('#E0E0E0');
        }
        
        setSeries(data);
        setLabels(labelData);
        setColors(colorData);
      } catch (err) {
        console.error('Error fetching pie chart data:', err);
        // Set default data on error
        setSeries([1]);
        setLabels(['No Data']);
        setColors(['#E0E0E0']);
      } finally {
        setLoading(false);
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
        formatter: (val) => `${val} bills`,
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '60%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total Bills',
              formatter: () => {
                const total = series.reduce((sum, val) => sum + val, 0);
                return `${total}`;
              }
            }
          }
        }
      }
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
          {loading ? (
            <p>Loading chart data...</p>
          ) : series.length > 0 ? (
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