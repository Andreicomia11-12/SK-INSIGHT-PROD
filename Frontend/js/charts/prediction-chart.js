export function renderPredictionChart(year, cycle) {
  // Only show fake/demo data for visual appeal
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const actualData = [65, 78, 82, 75, 85, 92, 88, 95];
  const predictedData = [null, null, null, 79, 88, 95, 98, 102];

  const canvas = document.getElementById('predictionChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (window.predictionChart && typeof window.predictionChart.destroy === 'function') {
    window.predictionChart.destroy();
  }
  window.predictionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Actual Data',
          data: actualData,
          borderColor: '#07B0F2',
          backgroundColor: 'rgba(7,176,242,0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Predicted Trend',
          data: predictedData,
          borderColor: '#FED600',
          backgroundColor: 'rgba(254,214,0,0.1)',
          borderDash: [5, 5],
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(255,255,255,0.9)',
          titleColor: '#0A2C59',
          bodyColor: '#0A2C59',
          borderColor: '#e1e8ff',
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { borderDash: [4, 4] } }
      }
    }
  });
}