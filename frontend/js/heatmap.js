/* ============================================
   HABIT RABBIT - Heatmap Rendering
   ============================================ */

const Heatmap = (() => {
  // ============================================
  // Configuration
  // ============================================
  const CONFIG = {
    CELL_SIZE: 14,
    CELL_GAP: 3,
    WEEKS_TO_SHOW: 26, // 6 months
    DAYS_IN_WEEK: 7
  };

  // Colors based on completion intensity
  const COLORS = {
    empty: 'var(--bg-color)',
    level1: 'rgba(252, 211, 77, 0.3)',
    level2: 'rgba(251, 191, 36, 0.5)',
    level3: 'rgba(245, 158, 11, 0.7)',
    level4: 'var(--primary-color)'
  };

  // ============================================
  // Generate Heatmap
  // ============================================
  const render = (containerId, data, options = {}) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const {
      cellSize = CONFIG.CELL_SIZE,
      cellGap = CONFIG.CELL_GAP,
      weeks = CONFIG.WEEKS_TO_SHOW
    } = options;

    // Create completion map from data
    const completionMap = createCompletionMap(data);
    
    // Generate dates for the heatmap
    const dates = generateDates(weeks * 7);
    
    // Create grid
    const grid = createGrid(dates, completionMap, cellSize, cellGap);
    
    // Create legend
    const legend = createLegend();
    
    // Create month labels
    const monthLabels = createMonthLabels(dates, cellSize, cellGap);
    
    // Create day labels
    const dayLabels = createDayLabels(cellSize, cellGap);
    
    // Render HTML
    container.innerHTML = `
      <div class="heatmap-wrapper">
        <div class="heatmap-labels-container">
          ${dayLabels}
          <div class="heatmap-scroll-container">
            ${monthLabels}
            ${grid}
          </div>
        </div>
        ${legend}
      </div>
    `;

    // Add tooltips
    addTooltips(container);
  };

  // ============================================
  // Create Completion Map
  // ============================================
  const createCompletionMap = (data) => {
    const map = {};
    if (!data || !Array.isArray(data)) return map;
    
    data.forEach(item => {
      map[item.date] = item.completed;
    });
    
    return map;
  };

  // ============================================
  // Generate Dates
  // ============================================
  const generateDates = (days) => {
    const dates = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push({
        date: date.toISOString().split('T')[0],
        dayOfWeek: date.getDay(),
        month: date.getMonth(),
        year: date.getFullYear()
      });
    }
    
    return dates;
  };

  // ============================================
  // Create Grid
  // ============================================
  const createGrid = (dates, completionMap, cellSize, cellGap) => {
    // Organize dates into weeks
    const weeks = [];
    let currentWeek = [];
    
    // Pad the first week if necessary
    const firstDayOfWeek = dates[0].dayOfWeek;
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }
    
    dates.forEach((dateObj, index) => {
      currentWeek.push(dateObj);
      
      if (dateObj.dayOfWeek === 6 || index === dates.length - 1) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    // Generate cells HTML
    const cellsHTML = weeks.map((week, weekIndex) => {
      const weekCells = week.map((dateObj, dayIndex) => {
        if (!dateObj) {
          return `<div class="heatmap-cell heatmap-cell-empty" style="width: ${cellSize}px; height: ${cellSize}px;"></div>`;
        }
        
        const isCompleted = completionMap[dateObj.date] || false;
        const level = isCompleted ? 4 : 0;
        const formattedDate = formatDateForTooltip(dateObj.date);
        const statusText = isCompleted ? 'Completed' : 'Not completed';
        
        return `
          <div class="heatmap-cell" 
               data-date="${dateObj.date}"
               data-level="${level}"
               data-tooltip="${formattedDate}: ${statusText}"
               style="width: ${cellSize}px; height: ${cellSize}px;">
          </div>
        `;
      }).join('');
      
      return `<div class="heatmap-week" style="display: flex; flex-direction: column; gap: ${cellGap}px;">${weekCells}</div>`;
    }).join('');
    
    return `
      <div class="heatmap-grid" style="display: flex; gap: ${cellGap}px;">
        ${cellsHTML}
      </div>
    `;
  };

  // ============================================
  // Create Month Labels
  // ============================================
  const createMonthLabels = (dates, cellSize, cellGap) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const labels = [];
    let currentMonth = null;
    let weekCount = 0;
    
    dates.forEach((dateObj, index) => {
      if (dateObj.dayOfWeek === 0) weekCount++;
      
      if (dateObj.month !== currentMonth) {
        currentMonth = dateObj.month;
        const leftPosition = weekCount * (cellSize + cellGap);
        labels.push({
          text: months[dateObj.month],
          position: leftPosition
        });
      }
    });
    
    const labelsHTML = labels.map(label => 
      `<span class="heatmap-month-label" style="position: absolute; left: ${label.position}px;">${label.text}</span>`
    ).join('');
    
    return `<div class="heatmap-months" style="position: relative; height: 20px; margin-bottom: 4px;">${labelsHTML}</div>`;
  };

  // ============================================
  // Create Day Labels
  // ============================================
  const createDayLabels = (cellSize, cellGap) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Only show Mon, Wed, Fri
    const visibleDays = [1, 3, 5];
    
    const labelsHTML = days.map((day, index) => {
      const isVisible = visibleDays.includes(index);
      return `
        <span class="heatmap-day-label" 
              style="height: ${cellSize}px; line-height: ${cellSize}px; visibility: ${isVisible ? 'visible' : 'hidden'}">
          ${day}
        </span>
      `;
    }).join('');
    
    return `
      <div class="heatmap-days" style="display: flex; flex-direction: column; gap: ${cellGap}px; margin-right: 8px; margin-top: 24px;">
        ${labelsHTML}
      </div>
    `;
  };

  // ============================================
  // Create Legend
  // ============================================
  const createLegend = () => {
    return `
      <div class="heatmap-legend">
        <span>Less</span>
        <div class="heatmap-legend-cells">
          <div class="heatmap-legend-cell" style="background: ${COLORS.empty}; width: 14px; height: 14px; border-radius: 3px;"></div>
          <div class="heatmap-legend-cell" style="background: ${COLORS.level2}; width: 14px; height: 14px; border-radius: 3px;"></div>
          <div class="heatmap-legend-cell" style="background: ${COLORS.level4}; width: 14px; height: 14px; border-radius: 3px;"></div>
        </div>
        <span>More</span>
      </div>
    `;
  };

  // ============================================
  // Add Tooltips
  // ============================================
  const addTooltips = (container) => {
    const cells = container.querySelectorAll('.heatmap-cell[data-tooltip]');
    
    cells.forEach(cell => {
      cell.addEventListener('mouseenter', (e) => {
        const tooltip = document.createElement('div');
        tooltip.className = 'heatmap-tooltip';
        tooltip.textContent = cell.dataset.tooltip;
        tooltip.style.cssText = `
          position: absolute;
          background: #1e293b;
          color: #f8fafc;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 12px;
          white-space: nowrap;
          z-index: 1000;
          transform: translateY(-100%);
          margin-top: -8px;
          pointer-events: none;
        `;
        
        const rect = cell.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = rect.top + window.scrollY + 'px';
        
        document.body.appendChild(tooltip);
        
        cell.addEventListener('mouseleave', () => {
          tooltip.remove();
        }, { once: true });
      });
    });
  };

  // ============================================
  // Utility Functions
  // ============================================
  const formatDateForTooltip = (dateStr) => {
    const date = new Date(dateStr);
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // ============================================
  // Public API
  // ============================================
  return {
    render
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Heatmap;
}
