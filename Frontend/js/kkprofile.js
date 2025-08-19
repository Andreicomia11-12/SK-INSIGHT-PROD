document.addEventListener("DOMContentLoaded", () => {
    console.log("kkprofile.js loaded");

    const tableBody = document.querySelector(".tables tbody");

    // 🔹 Store all profiles globally so we can filter client-side
    let allProfiles = [];

    // 🔹 Filter mapping
    const filterOptions = {
        "Work Status": ["Employed", "Unemployed", "Self-Employed", "Currently looking for a Job", "Not interested in looking for a Job"],
        "Youth Age Group": ["Child Youth", "Core Youth", "Young Youth"],
        "Educational Background": [
            "Elementary Undergraduate", "Elementary Graduate",
            "High School Undergraduate", "High School Graduate",
            "Vocational Graduate", "College Undergraduate",
            "College Graduate", "Masters Level", "Masters Graduate",
            "Doctorate Level", "Doctorate Graduate"
        ],
        "Civil Status": ["Single", "Live-in", "Married", "Unknown", "Separated", "Annulled", "Divorced", "Widowed"],
        "Youth Classification": ["In School Youth", "Out of School Youth", "Working Youth", "Youth with Specific Needs"],
        "Purok": ["1","2","3","4","5","6","7","8","9","10"]
    };

    // Keep track of current filter state
    let selectedClassification = "";
    let selectedGroup = "";

    // 🔹 Fetch all KK Profiles from backend
    async function fetchProfiles() {
        try {
            const res = await fetch("http://localhost:5000/api/kkprofiling/all", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (!res.ok) throw new Error(`Error: ${res.status}`);

            allProfiles = await res.json();
            renderProfiles(allProfiles);

        } catch (error) {
            console.error("Error fetching profiles:", error);
            tableBody.innerHTML = `<tr><td colspan="6">Failed to load profiles.</td></tr>`;
        }
    }

    // 🔹 Render profiles into table
    function renderProfiles(profiles) {
        tableBody.innerHTML = "";

        if (profiles.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6">No profiles found.</td></tr>`;
            return;
        }

        profiles.forEach((profile, index) => {
            const suffix = profile.suffix && profile.suffix.toLowerCase() !== "n/a" ? profile.suffix : "";
            const middleInitial = profile.middlename ? profile.middlename.charAt(0).toUpperCase() + "." : "";
            const fullName = `${profile.lastname}, ${profile.firstname} ${middleInitial} ${suffix}`.trim();

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${fullName}</td>
                <td>${profile.age}</td>
                <td>${profile.purok || "-"}</td>
                <td>${profile.gender}</td>
                <td><button class="view-btn" data-id="${profile._id}">View Full Details</button></td>
            `;
            tableBody.appendChild(row);
        });

        // Attach modal buttons
        document.querySelectorAll(".view-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const id = e.target.dataset.id;
                const res = await fetch(`http://localhost:5000/api/kkprofiling/${id}`, {
                    headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
                });
                const profile = await res.json();
                showProfileModal(profile);
            });
        });
    }


    // ====== CYCLE FILTERS ======

// Grab elements
const yearSelect = document.getElementById("cycleNumber");
const cycleSelect = document.getElementById("year");
const yearFilterBtn = document.getElementById("yearFilterBtn");
const tbody = document.querySelector("table tbody");
const tableRows = tbody.querySelectorAll("tr");

// Store original rows (so we can reset filter later)
const originalRows = Array.from(tableRows).map(row => row.cloneNode(true));

// Function to filter rows based on selected values
function applyFilters() {
    const selectedYear = yearSelect.value;
    const selectedCycle = cycleSelect.value;

    // Reset table first
    tbody.innerHTML = "";
    let filteredRows = originalRows;

    if (selectedYear) {
        filteredRows = filteredRows.filter(row => {
            // Example: assuming Year is in 3rd column (index 2)
            const yearCol = row.cells[2]?.textContent.trim();
            return yearCol === selectedYear;
        });
    }

    if (selectedCycle) {
        filteredRows = filteredRows.filter(row => {
            // Example: assuming Cycle Number is in 4th column (index 3)
            const cycleCol = row.cells[3]?.textContent.trim();
            return cycleCol === selectedCycle;
        });
    }

    // Re-render rows
    filteredRows.forEach(row => tbody.appendChild(row.cloneNode(true)));
}

// Dropdown auto-filter
yearSelect.addEventListener("change", () => {
    applyFilters();
    yearSelect.blur(); // closes dropdown automatically
});

cycleSelect.addEventListener("change", () => {
    applyFilters();
    cycleSelect.blur(); // closes dropdown automatically
});

// Filter button (optional)
yearFilterBtn.addEventListener("click", applyFilters);


    // ===== SEARCH BAR FUNCTION =====
const searchInput = document.querySelector(".search-input");
const table = document.querySelector("table tbody");

searchInput.addEventListener("keyup", function () {
    const filter = searchInput.value.toLowerCase();
    const rows = table.querySelectorAll("tr");

    rows.forEach(row => {
        const cells = row.querySelectorAll("td");
        let match = false;

        cells.forEach(cell => {
            if (cell.textContent.toLowerCase().includes(filter)) {
                match = true;
            }
        });

        if (match) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
});


    // 🔹 Apply filter
    function applyFilter(classification, group) {
        let filtered = [...allProfiles];

        switch (classification) {
            case "Work Status":
                filtered = filtered.filter(profile => profile.workStatus === group);
                break;
            case "Youth Age Group":
                filtered = filtered.filter(profile => profile.youthAgeGroup === group);
                break;
            case "Educational Background":
                filtered = filtered.filter(profile => profile.educationalBackground === group);
                break;
            case "Civil Status":
                filtered = filtered.filter(profile => profile.civilStatus === group);
                break;
            case "Youth Classification":
                filtered = filtered.filter(profile => profile.youthClassification === group);
                break;
            case "Purok":
                filtered = filtered.filter(profile => profile.purok?.toString() === group);
                break;
            default:
                break;
        }

        renderProfiles(filtered);
    }

    // 🔹 Setup dropdown logic
    const classificationDropdown = document.querySelector(".dropdown");
    const groupDropdown = document.querySelector(".dropdowns");

    // ✅ Toggle dropdown function
    function toggleDropdown(dropdownContent) {
        dropdownContent.style.display = dropdownContent.style.display === "block" ? "none" : "block";
    }

    // Handle classification dropdown
    const classificationButton = classificationDropdown.querySelector(".dropdown-button");
    const classificationContent = classificationDropdown.querySelector(".dropdown-content");

    classificationButton.addEventListener("click", () => toggleDropdown(classificationContent));

    classificationContent.querySelectorAll("a").forEach(a => {
        a.addEventListener("click", () => {
            selectedClassification = a.textContent.trim();
            classificationButton.textContent = selectedClassification;

            // Close classification dropdown automatically
            classificationContent.style.display = "none";

            // Reset group dropdown options
            const groupContent = groupDropdown.querySelector(".dropdown-content");
            groupContent.innerHTML = "";

            if (filterOptions[selectedClassification]) {
                filterOptions[selectedClassification].forEach(opt => {
                    const optionEl = document.createElement("a");
                    optionEl.href = "#";
                    optionEl.textContent = opt;

                    optionEl.addEventListener("click", () => {
                        selectedGroup = opt;
                        groupDropdown.querySelector(".dropdown-buttons").textContent = opt;

                        // ✅ Close group dropdown automatically
                        groupContent.style.display = "none";

                        // ✅ Apply filter immediately
                        applyFilter(selectedClassification, selectedGroup);
                    });

                    groupContent.appendChild(optionEl);
                });
            }

            // Reset group dropdown label
            groupDropdown.querySelector(".dropdown-buttons").textContent = "Select Group";
        });
    });

    // Handle group dropdown toggle
    const groupButton = groupDropdown.querySelector(".dropdown-buttons");
    const groupContent = groupDropdown.querySelector(".dropdown-content");

    groupButton.addEventListener("click", () => toggleDropdown(groupContent));

    // 🔹 Show Modal
    function showProfileModal(profile) {
        const modal = document.getElementById("profileModal");
        const details = document.getElementById("profileDetails");

        const suffix = profile.suffix && profile.suffix.toLowerCase() !== "n/a" ? profile.suffix : "";
        const middleInitial = profile.middlename ? profile.middlename.charAt(0).toUpperCase() + "." : "";

        let formattedBirthday = "-";
        if (profile.birthday) {
            const date = new Date(profile.birthday);
            formattedBirthday = date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "2-digit" });
        }

        details.innerHTML = `
          <div style="text-align:center; margin-bottom:15px;">
            <img src="${profile.image || 'default.png'}" alt="Profile Image" width="150" style="border-radius:8px;"/>
          </div>
          <div>
            <p><strong>Name:</strong> ${profile.firstname} ${middleInitial} ${profile.lastname} ${suffix}</p>
            <hr><p><strong>Address:</strong> ${profile.address}</p>
            <hr><p><strong>Age:</strong> ${profile.age} &nbsp;&nbsp; <strong>Gender:</strong> ${profile.gender}</p>
            <hr><p><strong>Birthday:</strong> ${formattedBirthday} &nbsp;&nbsp; <strong>Email:</strong> ${profile.email}</p>
            <hr><p><strong>Contact Number:</strong> ${profile.contactNumber || "-"}</p>
            <hr><p><strong>Civil Status:</strong> ${profile.civilStatus || "-"}</p>
            <hr><p><strong>Youth Age Group:</strong> ${profile.youthAgeGroup || "-"}</p>
            <hr><p><strong>Youth Classification:</strong> ${profile.youthClassification || "-"}</p>
            <hr><p><strong>Educational Background:</strong> ${profile.educationalBackground || "-"}</p>
            <hr><p><strong>Work Status:</strong> ${profile.workStatus || "-"}</p>
            <hr><p><strong>Registered SK Voter:</strong> ${profile.registeredSkVoter || "-"}</p>
            <hr><p><strong>Registered National Voter:</strong> ${profile.registeredNationalVoter || "-"}</p>
            <hr><p><strong>Voted Last SK Election:</strong> ${profile.votedLastSkElection || "-"}</p>
            <hr><p><strong>Already Attended KK Assembly:</strong> ${profile.attendedKkAssembly || "-"}</p>
            <hr><p><strong>If Yes, how many times:</strong> ${profile.howManyTimes || "-"}</p>
            <hr><p><strong>If No, Why:</strong> ${profile.ifNoWhy || "-"}</p>
          </div>
        `;

        modal.style.display = "flex";
        document.querySelector(".close-btn").onclick = () => modal.style.display = "none";
        window.onclick = (event) => { if (event.target === modal) modal.style.display = "none"; };
        document.getElementById("printBtn").onclick = () => {
            const w = window.open('', '', 'height=600,width=800');
            w.document.write('<html><head><title>Print Profile</title></head><body>');
            w.document.write(details.innerHTML);
            w.document.write('</body></html>');
            w.document.close();
            w.print();
        };
    }

    // 🔹 Load profiles on page load
    fetchProfiles();
});
