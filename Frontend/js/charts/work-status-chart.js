Chart.defaults.plugins.legend.display = false;

export function renderWorkStatusBar(year, cycle) {
  const categories = [
    "Employed",
    "Unemployed",
    "Self-Employed",
    "Currently looking for a Job",
    "Not interested in looking for a Job"
  ];
  const colors = [
    "#07B0F2", // Employed
    "#FED600", // Unemployed
    "#0A2C59", // Self-Employed
    "#ef4444", // Currently looking for a Job
    "#22c55e"  // Not interested in looking for a Job
  ];
  const icons = [
    '<i class="fas fa-user-slash"></i>',
    '<i class="fas fa-user-tie"></i>',
    '<i class="fas fa-search"></i>',
    '<i class="fas fa-user-times"></i>'
  ];

  const token = sessionStorage.getItem("token");
  if (!token) return;

  let url = "http://localhost:5000/api/kkprofiling";
  if (year && cycle) url += `?year=${year}&cycle=${cycle}`;

  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.json())
    .then(profiles => {
      const counts = categories.map(
        cat => profiles.filter(p => p.workStatus === cat).length
      );
      const total = counts.reduce((a, b) => a + b, 0);

      // Sort by value descending for summary
      const summaryPairs = categories.map((cat, i) => ({
        label: cat,
        value: counts[i],
        color: colors[i],
        icon: icons[i]
      })).sort((a, b) => b.value - a.value);

      // For chart: use sorted order
      const sortedLabels = summaryPairs.map(p => p.label);
      const sortedCounts = summaryPairs.map(p => p.value);
      const sortedColors = summaryPairs.map(p => p.color);

      // Remove any Chart.js-generated HTML legend from previous renders
      document.querySelectorAll('.chartjs-legend, ul.chartjs-legend, div.chartjs-legend').forEach(el => el.remove());

      // Destroy any existing chart instance before re-rendering
      if (window.workStatusChart) window.workStatusChart.destroy();

      // Create the new bar chart
      const canvas = document.getElementById("workStatusBar");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      window.workStatusChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: sortedLabels,
          datasets: [{
            label: "Count",
            data: sortedCounts,
            backgroundColor: sortedColors,
            borderRadius: 8,
            maxBarThickness: 60
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false, // <-- Important for full width/height
          aspectRatio: 2,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "rgba(255,255,255,0.95)",
              titleColor: "#0A2C59",
              bodyColor: "#0A2C59",
              borderColor: "#e1e8ff",
              borderWidth: 1,
              padding: 10,
              boxPadding: 6,
              usePointStyle: true,
              callbacks: {
                label: function(context) {
                  return `${sortedLabels[context.dataIndex]}: ${sortedCounts[context.dataIndex]}`;
                }
              }
            }
          },
          scales: {
            x: {
              display: false,
              grid: { display: false }
            },
            y: {
              beginAtZero: true,
              max: total > 0 ? total : undefined,
              ticks: { color: "#0A2C59", font: { weight: "bold", size: 11 } },
              grid: { borderDash: [4, 4] }
            }
          }
        }
      });

      // Modern, compact summary with icons
      const summaryElem = document.getElementById("workStatusSummary");
      if (summaryElem) {
        const mostCommon = summaryPairs[0]?.label || "—";
        const mostCommonColor = summaryPairs[0]?.color || "#ccc";
        const mostCommonIcon = summaryPairs[0]?.icon || "";
        summaryElem.innerHTML = `
          <div class="modern-summary-header">
            <span class="modern-summary-title">Summary</span>
          </div>
          <div class="modern-summary-row modern-summary-total">
            <span class="modern-summary-label">Total</span>
            <span class="modern-summary-value">${total}</span>
          </div>
          <div class="modern-summary-row modern-summary-most">
            <span class="modern-summary-label">Most Common</span>
            <span class="modern-summary-value" style="color:${mostCommonColor};font-weight:700;">
              <span class="legend-dot" style="background:${mostCommonColor};margin-right:6px;"></span>
              ${mostCommon}
            </span>
          </div>
          <div class="modern-summary-breakdown">
            ${summaryPairs.map(pair => `
              <div class="modern-summary-row">
                <span class="modern-summary-label">
                  <span class="legend-dot" style="background:${pair.color};margin-right:6px;"></span>
                  ${pair.label}
                </span>
                <span class="modern-summary-value">${pair.value}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      // Remove custom legend (if any)
      const legendElem = document.querySelector(".work-status-legend");
      if (legendElem) {
        legendElem.innerHTML = "";
      }
    })
    .catch(err => console.error("Error rendering work status chart:", err));
}