import { renderPredictionChart } from '../charts/prediction-chart.js';
import { renderEducationalBackgroundBar } from '../charts/educational-background-chart.js';
import { renderYouthAgeGroupBar } from '../charts/youth-age-group-chart.js';
import { renderYouthClassificationBar } from '../charts/youth-classification-chart.js';
import { renderWorkStatusBar } from '../charts/work-status-chart.js';

// --- Session check on page load ---
(function() {
  const token = sessionStorage.getItem("token"); // <-- Use only sessionStorage
  function sessionExpired() {
    Swal.fire({
      icon: 'warning',
      title: 'Session Expired',
      text: 'Please login again.',
      confirmButtonColor: '#0A2C59',
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then(() => {
      window.location.href = "./admin-log.html";
    });
  }
  if (!token) {
    sessionExpired();
    return;
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      sessionStorage.removeItem("token");
      sessionExpired();
    }
  } catch (e) {
    sessionStorage.removeItem("token");
    sessionExpired();
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  // Filter dropdown logic only
  const yearDropdown = document.getElementById("yearDropdown");
  const yearButton = yearDropdown.querySelector(".dropdown-button");
  const yearContent = yearDropdown.querySelector(".dropdown-content");
  const cycleDropdown = document.getElementById("cycleDropdown");
  const cycleButton = cycleDropdown.querySelector(".dropdown-button");
  const cycleContent = cycleDropdown.querySelector(".dropdown-content");
  const filterBtn = document.getElementById("filterBtn");
  const clearFilterBtn = document.getElementById("clearFilterBtn");

  let yearMap = {};
  let sortedYears = [];
  let currentFilters = {};

  // Fetch cycles and populate year dropdown
  async function fetchCycles() {
    const token = sessionStorage.getItem("token");
    // Remove alert and redirect, session check is now global
    const res = await fetch("http://localhost:5000/api/formcycle/kk", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        // Session check is global, just return
        return [];
      }
      console.error("Failed to fetch cycles:", res.status);
      return [];
    }
    try {
      const cycles = await res.json();
      yearMap = {};
      cycles.forEach((c) => {
        if (!yearMap[c.year]) yearMap[c.year] = [];
        yearMap[c.year].push(c.cycleNumber);
      });
      sortedYears = Object.keys(yearMap).sort((a, b) => b - a);

      // Populate year dropdown
      yearContent.innerHTML = "";
      sortedYears.forEach(year => {
        const yearOption = document.createElement("a");
        yearOption.href = "#";
        yearOption.className = "dropdown-option";
        yearOption.textContent = year;
        yearOption.addEventListener("click", (e) => {
          e.preventDefault();
          yearButton.textContent = year;
          currentFilters.year = year;

          // Reset cycle
          cycleButton.textContent = "Cycle";
          currentFilters.cycle = undefined;
          cycleButton.disabled = false;

          // Populate cycle dropdown for selected year
          populateCycleDropdown(yearMap[year]);
          yearContent.style.display = "none";
        });
        yearContent.appendChild(yearOption);
      });

      // Reset buttons on load
      yearButton.textContent = "Year";
      cycleButton.textContent = "Cycle";
      cycleButton.disabled = true;
    } catch (err) {
      console.error("Error fetching cycles:", err);
    }
  }

  function populateCycleDropdown(cycles) {
    cycleContent.innerHTML = ""; // Clear existing options
    cycles.forEach(cycle => {
      const cycleOption = document.createElement("a");
      cycleOption.href = "#";
      cycleOption.className = "dropdown-option";
      cycleOption.textContent = `Cycle ${cycle}`; // Add "Cycle" prefix
      cycleOption.style.display = "block"; // Ensure options are displayed as blocks
      cycleOption.addEventListener("click", (e) => {
        e.preventDefault();
        cycleButton.textContent = `Cycle ${cycle}`;
        currentFilters.cycle = cycle;
        cycleContent.style.display = "none";
      });
      cycleContent.appendChild(cycleOption);
    });
  }

  // Dropdown open/close logic
  yearButton.addEventListener("click", (e) => {
    e.stopPropagation();
    yearContent.style.display = yearContent.style.display === "block" ? "none" : "block";
    cycleContent.style.display = "none";
  });
  cycleButton.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!cycleButton.disabled) {
      cycleContent.style.display = cycleContent.style.display === "block" ? "none" : "block";
      yearContent.style.display = "none";
    }
  });
  window.addEventListener("click", () => {
    yearContent.style.display = "none";
    cycleContent.style.display = "none";
  });

  // --- Filter button logic ---
  filterBtn.addEventListener("click", () => {
    if (!currentFilters.year || !currentFilters.cycle) {
      alert("Please select both year and cycle before filtering.");
      return;
    }
    // Pass selected year and cycle to all chart renderers
    renderPredictionChart(currentFilters.year, currentFilters.cycle);
    renderCivilStatusDonutFromAPI(currentFilters.year, currentFilters.cycle);
    renderEducationalBackgroundBar(currentFilters.year, currentFilters.cycle);
    renderYouthAgeGroupBar(currentFilters.year, currentFilters.cycle);
    renderYouthClassificationBar(currentFilters.year, currentFilters.cycle);
    renderWorkStatusBar(currentFilters.year, currentFilters.cycle);

    // Fetch filtered KK Profiling summary
    fetchDashboardSummaries(currentFilters.year, currentFilters.cycle);
  });

  // --- Clear filter resets everything ---
  clearFilterBtn.addEventListener("click", () => {
    yearButton.textContent = "Year";
    cycleButton.textContent = "Cycle";
    cycleButton.disabled = true;
    yearContent.style.display = "none";
    cycleContent.style.display = "none";
    currentFilters = {};
    // Render all charts with no filter (all data)
    renderPredictionChart();
    renderCivilStatusDonutFromAPI();
    renderEducationalBackgroundBar();
    renderYouthAgeGroupBar();
    renderYouthClassificationBar();
    renderWorkStatusBar();

    // Fetch unfiltered dashboard summaries
    fetchDashboardSummaries();
  });

  // Initial load: show all data
  fetchCycles();
  renderPredictionChart();
  renderCivilStatusDonutFromAPI();
  renderEducationalBackgroundBar();
  renderYouthAgeGroupBar();
  renderYouthClassificationBar();
  renderWorkStatusBar();
  fetchDashboardSummaries();
});

// --- Prediction chart now fetches filtered data ---


// --- Civil status donut already uses year/cycle ---
function renderCivilStatusDonutFromAPI(year, cycle) {
  const civilStatusCategories = [
    "Single", "Live-in", "Married", "Unknown", "Separated",
    "Annulled", "Divorced", "Widowed"
  ];
  const colors = [
    "#07B0F2", "#FED600", "#0A2C59", "#ef4444",
    "#22c55e", "#6366f1", "#f59e42", "#f472b6"
  ];

  const token = sessionStorage.getItem("token");
  if (!token) return;
  let url = "http://localhost:5000/api/kkprofiling";
  if (year && cycle) url += `?year=${year}&cycle=${cycle}`;
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.json())
    .then(profiles => {
      // Count civil status
      const counts = civilStatusCategories.map(
        status => profiles.filter(p => p.civilStatus === status).length
      );
      const total = counts.reduce((a, b) => a + b, 0);
      const percentages = counts.map(v => total ? ((v / total) * 100).toFixed(1) : "0.0");

      // --- SORT civil status by count descending ---
      const summaryPairs = civilStatusCategories.map((label, i) => ({
        label,
        count: counts[i],
        percent: percentages[i],
        color: colors[i]
      })).sort((a, b) => b.count - a.count);

      // Find most common after sorting
      const mostCommon = summaryPairs[0]?.label || "—";

      // Chart.js donut with center text for total respondents
      const canvas = document.getElementById("civilStatusDonut");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (window.civilStatusChart) window.civilStatusChart.destroy();
      window.civilStatusChart = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: civilStatusCategories,
          datasets: [{
            data: counts,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: "#fff"
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 1,
          cutout: "70%",
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const idx = context.dataIndex;
                  return `${civilStatusCategories[idx]}: ${counts[idx]} (${percentages[idx]}%)`;
                }
              }
            },
            doughnutCenter: {
              display: true,
              text1: "Total",
              text2: total
            }
          }
        },
        plugins: [{
          id: 'doughnutCenter',
          afterDraw: function(chart) {
            const opts = chart.options.plugins.doughnutCenter;
            if (!opts || !opts.display) return;
            const { ctx, chartArea: area } = chart;
            ctx.save();
            ctx.font = "bold 0.75rem Poppins, sans-serif"; // smaller
            ctx.fillStyle = "#0A2C59";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(opts.text1, (area.left + area.right) / 2, (area.top + area.bottom) / 2 - 10);
            ctx.font = "bold 1.1rem Poppins, sans-serif"; // smaller
            ctx.fillStyle = "#07B0F2";
            ctx.fillText(opts.text2, (area.left + area.right) / 2, (area.top + area.bottom) / 2 + 12);
            ctx.restore();
          }
        }]
      });

      // Legend
      const legend = document.querySelector(".civil-status-legend");
      if (legend) {
        legend.innerHTML = civilStatusCategories.map((label, i) =>
          `<span class="legend-item">
            <span class="legend-dot" style="background:${colors[i]}"></span>
            ${label}
          </span>`
        ).join("");
      }

      // Remove any Chart.js-generated HTML legend from previous renders (ul or div)
      document.querySelectorAll('.chartjs-legend, ul.chartjs-legend, div.chartjs-legend').forEach(el => el.remove());

      // Info summary (no total respondents here)
      const mostElem = document.getElementById("civilStatusMost");
      if (mostElem) mostElem.textContent = mostCommon;
      const percElem = document.getElementById("civilStatusPercentages");
      if (percElem) {
        // Build two columns, sorted by count
        const items = summaryPairs
          .filter(pair => pair.count > 0)
          .map(pair =>
            `<span><strong>${pair.label}:</strong> ${pair.percent}%</span>`
          );

        // Split into two columns
        const mid = Math.ceil(items.length / 2);
        const col1 = items.slice(0, mid);
        const col2 = items.slice(mid);

        percElem.innerHTML = `
          <div style="display: flex; gap: 1rem;">
            <div style="display: flex; flex-direction: column; gap: 0.2rem;">
              ${col1.join("")}
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.2rem;">
              ${col2.join("")}
            </div>
          </div>
        `;
      }
    });
}

// Minimal prediction chart for demo
function initPredictionChart() {
  const ctx = document.getElementById('predictionChart').getContext('2d');
  const actualData = [65, 78, 82, 75, 85, 92, 88, 95];
  const predictedData = [null, null, null, 79, 88, 95, 98, 102];
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
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

// --- Dashboard summaries fetch logic ---
async function fetchDashboardSummaries(year, cycle) {
  const token = sessionStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // User Accounts (Unfiltered)
  fetch("http://localhost:5000/api/users", { headers })
    .then(res => res.json())
    .then(data => {
      document.getElementById("userAccountCount").textContent = Array.isArray(data) ? data.length : "-";
    })
    .catch(() => {
      document.getElementById("userAccountCount").textContent = "-";
    });

  // KK Profiling (Filtered by year, cycle, and excluding deleted profiles)
  let kkProfilingUrl = "http://localhost:5000/api/kkprofiling";
  if (year && cycle) {
    kkProfilingUrl += `?year=${year}&cycle=${cycle}`;
  }
  fetch(kkProfilingUrl, { headers })
    .then(res => res.json())
    .then(data => {
      // Filter out deleted profiles
      const validProfiles = Array.isArray(data) ? data.filter(profile => !profile.isDeleted) : [];
      document.getElementById("kkProfilingCount").textContent = validProfiles.length;
    })
    .catch(() => {
      document.getElementById("kkProfilingCount").textContent = "-";
    });

  // LGBTQ Profiling (Unfiltered)
  fetch("http://localhost:5000/api/lgbtqprofiling", { headers })
    .then(res => res.json())
    .then(data => {
      document.getElementById("lgbtqProfilingCount").textContent = Array.isArray(data) ? data.length : "-";
    })
    .catch(() => {
      document.getElementById("lgbtqProfilingCount").textContent = "-";
    });

  // Educational Assistance (Unfiltered)
  Promise.all([
    fetch("http://localhost:5000/api/educational-assistance/status?status=pending", { headers }).then(res => res.json()),
    fetch("http://localhost:5000/api/educational-assistance/status?status=accepted", { headers }).then(res => res.json())
  ]).then(([pending, accepted]) => {
    const total = (Array.isArray(pending) ? pending.length : 0) + (Array.isArray(accepted) ? accepted.length : 0);
    document.getElementById("educationalAssistanceCount").textContent = total;
  });
}

const socket = io("http://localhost:5000", { transports: ["websocket"] });

socket.on("educational-assistance:newSubmission", (data) => {
  Swal.fire({
    icon: 'info',
    title: 'New Educational Assistance Application',
    text: 'A new application has arrived!',
    timer: 8000,
    showConfirmButton: false,
    toast: true,
    position: 'top-end'
  });
});