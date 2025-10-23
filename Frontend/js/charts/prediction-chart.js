
let lastPredictedCycle = null;
let lastPredictedYear = null;
let lastPredictionResult = null;
export async function renderPredictionChart(year, cycle) {
  const token = sessionStorage.getItem("token");

  // Always get the latest cycle/year from the efficient endpoint
  try {
    const res = await fetch("http://localhost:5000/api/formcycle/latest-kk", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const latest = await res.json();
      year = latest.year;
      cycle = latest.cycleNumber;
    }
  } catch (err) {
    console.error("Failed to fetch latest KK cycle:", err);
    return;
  }
  if (!year || !cycle) return;

  // Only fetch new prediction if cycle/year changed
  if (
    lastPredictedCycle === cycle &&
    lastPredictedYear === year &&
    lastPredictionResult
  ) {
    // Use cached result
    renderPredictionChartWithData(lastPredictionResult, year, cycle, token);
    return;
  }

  // Fetch predicted data from backend
  let predicted = {};
  let suggestions = [];
  try {
    const res = await fetch("http://localhost:5000/api/cycle-predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ year, cycle })
    });
    if (res.ok) {
      const data = await res.json();
      predicted = data.predictions || {};
      suggestions = data.suggestions || [];
      // Cache the result
      lastPredictedCycle = cycle;
      lastPredictedYear = year;
      lastPredictionResult = { predicted, suggestions };
    }
  } catch (err) {
    console.error("Prediction fetch error:", err);
  }

  renderPredictionChartWithData({ predicted, suggestions }, year, cycle, token);
}

function renderPredictionChartWithData({ predicted, suggestions }, year, cycle, token) {
  const chartLabels = [
    "In School Youth",
    "Out of School Youth",
    "Working Youth",
    "Youth with Specific Needs"
  ];

  const predictionKeyMap = {
    "In School Youth": "In School Youth",
    "Out of School Youth": "Out of School Youth",
    "Working Youth": "Working Youth",
    "Youth with Specific Needs": "YSN"
  };

  // Fetch actual data from backend
  fetchActualData(year, cycle, token, chartLabels).then(actual => {
    const predictedData = chartLabels.map(label =>
      predicted[predictionKeyMap[label]] || 0
    );
    const actualData = chartLabels.map(label => actual[label] || 0);

    // Chart.js grouped vertical bar chart
    const canvas = document.getElementById("predictionChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (window.predictionChart && typeof window.predictionChart.destroy === "function") {
      window.predictionChart.destroy();
    }
    window.predictionChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: chartLabels, // Chart.js needs this for spacing, but we hide them
        datasets: [
          {
            label: "Actual",
            data: actualData,
            backgroundColor: "#07B0F2",
            borderRadius: 8,
            barPercentage: 0.7,
            categoryPercentage: 0.8
          },
          {
            label: "Predicted",
            data: predictedData,
            backgroundColor: "#FED600",
            borderRadius: 8,
            barPercentage: 0.7,
            categoryPercentage: 0.8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }, // Hide legend inside chart
          title: {
            display: false // Hide title inside chart
          },
          datalabels: { display: false } // If you use datalabels plugin, disable it
        },
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { display: false } // Hide x-axis labels
          },
          y: {
            beginAtZero: true,
            grid: { color: "#e1e8ff", drawBorder: false },
            ticks: { display: false } // Hide y-axis numbers
          }
        }
      }
    });

    // --- External info rendering ---

    // Numbers on the side
    const sideElem = document.querySelector(".prediction-side");
    if (sideElem) {
      sideElem.innerHTML = chartLabels.map((label, idx) => `
        <div class="prediction-value-row">
          <span class="prediction-label">${label}</span>
          <span class="prediction-value actual">
            <span class="legend-dot actual"></span> ${actualData[idx]}
          </span>
          <span class="prediction-value predicted">
            <span class="legend-dot predicted"></span> ${predictedData[idx]}
          </span>
        </div>
      `).join("");
    }

    // Labels below the chart
    const chartArea = document.querySelector(".prediction-chart-area");
    if (chartArea) {
      let labelRow = chartArea.querySelector(".prediction-label-row");
      if (!labelRow) {
        labelRow = document.createElement("div");
        labelRow.className = "prediction-label-row";
        chartArea.appendChild(labelRow);
      }
      labelRow.innerHTML = chartLabels.map(label => `
        <span class="prediction-label-bottom">${label}</span>
      `).join("");
    }

    // Legend at the bottom
    const legendElem = document.querySelector(".prediction-legend");
    if (legendElem) {
      legendElem.innerHTML = `
        <div class="legend-item">
          <span class="legend-dot actual"></span> Actual
        </div>
        <div class="legend-item">
          <span class="legend-dot predicted"></span> Predicted
        </div>
      `;
    }

    // After Chart.js rendering
    const infoGrid = document.querySelector('.prediction-info-grid');
    if (infoGrid) {
      // Arrange info in two columns, two rows
      let html = '';
      for (let i = 0; i < chartLabels.length; i++) {
        html += `
          <div class="prediction-info-item">
            <span>${chartLabels[i]}</span>
            <span class="legend-dot actual"></span>
            <span class="actual">${actualData[i]}</span>
            <span class="legend-dot predicted"></span>
            <span class="predicted">${predictedData[i]}</span>
          </div>
        `;
      }
      infoGrid.innerHTML = html;
    }
  });
}

async function fetchActualData(year, cycle, token, chartLabels) {
  let actual = {};
  try {
    let url = "http://localhost:5000/api/kkprofiling";
    if (year && cycle) url += `?year=${year}&cycle=${cycle}`;
    const resActual = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (resActual.ok) {
      const profiles = await resActual.json();
      actual = chartLabels.reduce((acc, label) => {
        acc[label] = profiles.filter(p => p.youthClassification === label).length;
        return acc;
      }, {});
    }
  } catch (err) {
    console.error("Actual fetch error:", err);
  }
  return actual;
}
