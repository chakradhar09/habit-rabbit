/* ============================================
   HABIT RABBIT - Chart.js Integration
   ============================================ */

const Charts = (() => {
  let progressChartInstance = null;

  // ============================================
  // Progress Chart
  // ============================================
  const renderProgressChart = (containerId, data) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // If no data, show empty state
    if (!data || data.length === 0) {
      container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted);">
          <p>No progress data available yet. Complete some habits!</p>
        </div>
      `;
      return;
    }
    
    // Create canvas
    container.innerHTML = '<canvas id="progress-chart-canvas"></canvas>';
    const canvas = document.getElementById('progress-chart-canvas');
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (progressChartInstance) {
      progressChartInstance.destroy();
    }
    
    // Prepare data
    const labels = data.map(d => formatDate(d.date));
    const percentages = data.map(d => d.percentage);
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(251, 191, 36, 0.3)');
    gradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
    
    // Chart configuration
    progressChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Completion Rate',
          data: percentages,
          borderColor: '#f59e0b',
          backgroundColor: gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#f59e0b',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#fbbf24',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#f8fafc',
            bodyColor: '#e2e8f0',
            titleFont: {
              size: 14,
              weight: '600'
            },
            bodyFont: {
              size: 13
            },
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: (context) => {
                const idx = context[0].dataIndex;
                return data[idx].date;
              },
              label: (context) => {
                const idx = context.dataIndex;
                const d = data[idx];
                return [
                  `Completion: ${d.percentage}%`,
                  `Tasks: ${d.completed}/${d.total}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#94a3b8',
              font: {
                size: 11
              },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 7
            },
            border: {
              display: false
            }
          },
          y: {
            min: 0,
            max: 100,
            grid: {
              color: 'rgba(148, 163, 184, 0.1)',
              drawBorder: false
            },
            ticks: {
              color: '#94a3b8',
              font: {
                size: 11
              },
              stepSize: 25,
              callback: (value) => value + '%'
            },
            border: {
              display: false
            }
          }
        }
      }
    });
  };

  // ============================================
  // Utility Functions
  // ============================================
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // ============================================
  // Public API
  // ============================================
  return {
    renderProgressChart,
    destroyCharts: () => {
      if (progressChartInstance) {
        progressChartInstance.destroy();
        progressChartInstance = null;
      }
    }
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Charts;
}
