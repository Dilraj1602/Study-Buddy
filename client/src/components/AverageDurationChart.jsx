import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const AverageDurationChart = ({ averageDurations }) => {
  // Color coding utility function
  const getDurationColor = (hours) => {
    if (hours === 0) return { main: '#9CA3AF', light: '#D1D5DB' }; // Gray - No data
    if (hours <= 4) return { main: '#EF4444', light: '#FCA5A5' };   // Red - Warning/Low
    if (hours <= 8) return { main: '#10B981', light: '#6EE7B7' };   // Green - Success/Optimal
    return { main: '#F59E0B', light: '#FCD34D' };                    // Orange - Caution/High
  };

  // Debug logging
  React.useEffect(() => {
    console.log('🎨 Chart received data:', {
      weekly: averageDurations.weekly / 3600,
      monthly: averageDurations.monthly / 3600,
      sixMonth: averageDurations.sixMonth / 3600,
      yearly: averageDurations.yearly / 3600,
      overall: averageDurations.overall / 3600,
    });
  }, [averageDurations]);

  const chartData = useMemo(() => {
    // NEW ORDER: Weekly, Monthly, 6-Month, Yearly, Overall (Daily removed)
    const data = [
      { 
        label: 'Weekly', 
        value: Math.max(averageDurations.weekly / 3600, 0.1),
        actualValue: averageDurations.weekly / 3600,
      },
      { 
        label: 'Monthly', 
        value: Math.max(averageDurations.monthly / 3600, 0.1),
        actualValue: averageDurations.monthly / 3600,
      },
      { 
        label: '6-Month', 
        value: Math.max(averageDurations.sixMonth / 3600, 0.1),
        actualValue: averageDurations.sixMonth / 3600,
      },
      { 
        label: 'Yearly', 
        value: Math.max(averageDurations.yearly / 3600, 0.1),
        actualValue: averageDurations.yearly / 3600,
      },
      { 
        label: 'Overall', 
        value: Math.max(averageDurations.overall / 3600, 0.1),
        actualValue: averageDurations.overall / 3600,
      },
    ];

    return {
      labels: data.map(d => d.label),
      datasets: [
        {
          label: 'Average Hours per Day',
          data: data.map(d => d.value),
          backgroundColor: data.map(d => {
            const colors = getDurationColor(d.actualValue);
            // Create gradient effect with 80% opacity
            return d.actualValue === 0 ? colors.main + 'CC' : colors.main + 'CC';
          }),
          borderColor: data.map(d => {
            const colors = getDurationColor(d.actualValue);
            return colors.main;
          }),
          borderWidth: 2,
          borderRadius: 8,
          barThickness: 40,
          actualValues: data.map(d => d.actualValue),
          hoverBackgroundColor: data.map(d => {
            const colors = getDurationColor(d.actualValue);
            // Brighten by 10% on hover
            return colors.light + 'DD';
          }),
        },
      ],
    };
  }, [averageDurations]);

  const options = {
    indexAxis: 'y', // This makes it horizontal
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Average Study Duration by Time Period',
        font: {
          size: 18,
          weight: 'bold',
          family: "'Inter', sans-serif",
        },
        color: '#1f2937',
        padding: {
          top: 10,
          bottom: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        titleFont: {
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: function(context) {
            const actualValue = context.dataset.actualValues[context.dataIndex];
            if (actualValue === 0) {
              return 'No data available';
            }
            const hours = Math.floor(actualValue);
            const minutes = Math.round((actualValue - hours) * 60);
            return `Average: ${hours}h ${minutes}m per day`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Hours per Day',
          font: {
            size: 14,
            weight: 'bold',
            family: "'Inter', sans-serif",
          },
          color: '#374151',
        },
        beginAtZero: true,
        max: 12,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          callback: function(value) {
            return value + 'h';
          },
          font: {
            size: 12,
            family: "'Inter', sans-serif",
          },
          color: '#6b7280',
        },
      },
      y: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 14,
            weight: '600',
            family: "'Inter', sans-serif",
          },
          color: '#1f2937',
          padding: 10,
        },
      },
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart',
    },
  };

  return (
    <div className="average-duration-chart-container">
      <div className="chart-wrapper">
        <Bar data={chartData} options={options} />
      </div>
      
      {/* Color Legend - Duration-based color scheme */}
      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#EF4444' }}></div>
          <span>Low (≤4h)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#10B981' }}></div>
          <span>Optimal (4-8h)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#F59E0B' }}></div>
          <span>High (&gt;8h)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#9CA3AF' }}></div>
          <span>No Data</span>
        </div>
      </div>

      {/* Quick Stats Summary - Updated periods */}
      <div className="chart-stats-summary">
        <div className="stat-item">
          <span className="stat-period">This Week</span>
          <span className="stat-hours" style={{ 
            color: averageDurations.weekly / 3600 <= 4 ? '#EF4444' : 
                   averageDurations.weekly / 3600 <= 8 ? '#10B981' : '#F59E0B' 
          }}>
            {(averageDurations.weekly / 3600).toFixed(1)}h
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-period">This Month</span>
          <span className="stat-hours" style={{ 
            color: averageDurations.monthly / 3600 <= 4 ? '#EF4444' : 
                   averageDurations.monthly / 3600 <= 8 ? '#10B981' : '#F59E0B' 
          }}>
            {(averageDurations.monthly / 3600).toFixed(1)}h
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-period">Overall</span>
          <span className="stat-hours" style={{ 
            color: averageDurations.overall / 3600 <= 4 ? '#EF4444' : 
                   averageDurations.overall / 3600 <= 8 ? '#10B981' : '#F59E0B' 
          }}>
            {(averageDurations.overall / 3600).toFixed(1)}h
          </span>
        </div>
      </div>
    </div>
  );
};

export default AverageDurationChart;