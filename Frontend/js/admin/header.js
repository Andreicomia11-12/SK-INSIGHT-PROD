function updateDateTimeHeader() {
  const options = { timeZone: "Asia/Manila" };
  const now = new Date(new Date().toLocaleString("en-US", options));
  const hours = now.getHours();

  let greeting = "Good evening";
  let iconClass = "fa-solid fa-moon";
  let iconColor = "#183153";
  if (hours < 12) {
    iconClass = "fa-solid fa-sun";
    iconColor = "#f7c948";
    greeting = "Good morning";
  } else if (hours < 18) {
    iconClass = "fa-solid fa-cloud-sun";
    iconColor = "#f7c948";
    greeting = "Good afternoon";
  }

  // Format date as "MM/DD/YYYY"
  const dateStr = now.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    timeZone: "Asia/Manila"
  });

  // Format time as hh:mm AM/PM (12-hour)
  let hour = now.getHours();
  const minute = String(now.getMinutes()).padStart(2, "0");
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12; // convert to 12-hour format
  const timeStr = `${hour}:${minute} ${ampm}`;

  const greetingEl = document.getElementById("greeting");
  const headerDateEl = document.getElementById("header-date");
  const datetimeEl = document.getElementById("datetime");
  const icon = document.getElementById("greeting-icon");

  if (greetingEl) greetingEl.textContent = greeting;
  if (headerDateEl) headerDateEl.textContent = `${dateStr} -`;
  if (datetimeEl) datetimeEl.textContent = timeStr;
  if (icon) {
    icon.className = iconClass;
    icon.style.color = iconColor;
  }
}

// Initial call and interval
updateDateTimeHeader();
setInterval(updateDateTimeHeader, 1000);