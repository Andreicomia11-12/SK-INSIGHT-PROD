Chart.defaults.plugins.legend.display = false;

export function renderYouthClassificationBar(year, cycle) {
  const categories = [
    "In School Youth", "Out of School Youth",
    "Working Youth", "Youth with Specific Needs"
  ];
  const colors = ["#07B0F2", "#FED600", "#0A2C59", "#ef4444"];

  const token = sessionStorage.getItem("token");
  if (!token) return;

  let url = "http://localhost:5000/api/kkprofiling";
  if (year && cycle) url += `?year=${year}&cycle=${cycle}`;

  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.json())
    .then(profiles => {
      const counts = categories.map(
        cat => profiles.filter(p => p.youthClassification === cat).length
      );
      const total = counts.reduce((a, b) => a + b, 0);

      // Sort by value descending
      const summaryPairs = categories.map((cat, i) => ({
        label: cat,
        value: counts[i],
        color: colors[i]
      })).sort((a, b) => b.value - a.value);

      const sortedLabels = summaryPairs.map(p => p.label);
      const sortedCounts = summaryPairs.map(p => p.value);
      const sortedColors = summaryPairs.map(p => p.color);

      document.querySelectorAll('.chartjs-legend, ul.chartjs-legend, div.chartjs-legend').forEach(el => el.remove());
      if (window.youthClassificationChart) window.youthClassificationChart.destroy();

      const canvas = document.getElementById("youthClassificationBar");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      window.youthClassificationChart = new Chart(ctx, {
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
          maintainAspectRatio: true, // <-- set to true
          aspectRatio: 2,            // <-- 2:1 width:height, adjust as needed
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "rgba(255,255,255,0.9)",
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

      // Summary
      const summaryElem = document.getElementById("youthClassificationSummary"); // or youthAgeGroupSummary
      if (summaryElem) {
        const mostCommon = summaryPairs[0]?.label || "—";
        const mostCommonColor = summaryPairs[0]?.color || "#ccc";
        const total = summaryPairs.reduce((sum, pair) => sum + pair.value, 0);

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

      // Remove custom legend for youth classification
      const legendElem = document.querySelector(".youth-classification-legend");
      if (legendElem) {
        legendElem.innerHTML = "";
      }
    })
    .catch(err => console.error("Error rendering youth classification chart:", err));
}