document.addEventListener("DOMContentLoaded", () => {
    console.log("lgbtqProfile.js loaded");

    const tableBody = document.querySelector(".tables tbody");
    let allProfiles = [];

    // Filter classifications (from your dropdown in HTML)
    const filterOptions = [
        "Lesbian", "Gay", "Bisexual", "Transgender",
        "Queer", "Intersex", "Asexual"
    ];

    let selectedClassification = "";

    // ================= FETCH PROFILES =================
    async function fetchProfiles(cycleNumber = "", year = "") {
        try {
            let url = "http://localhost:5000/api/lgbtqprofiling/all";

            // If filtering by cycle
            if (cycleNumber && year) {
                url = `http://localhost:5000/api/lgbtqprofiling/filter?cycleNumber=${cycleNumber}&year=${year}`;
            }

            const res = await fetch(url, {
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

    // ================= RENDER PROFILES =================
    function renderProfiles(profiles) {
        tableBody.innerHTML = "";

        if (!profiles || profiles.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6">No LGBTQ profiles found.</td></tr>`;
            return;
        }

        profiles.forEach((profile, index) => {
            const kk = profile.kkInfo || {}; // Attached KK info
            const suffix = kk.suffix && kk.suffix.toLowerCase() !== "n/a" ? kk.suffix : "";
            const middleInitial = kk.middlename ? kk.middlename.charAt(0).toUpperCase() + "." : "";
            const fullName = kk.lastname
                ? `${kk.lastname}, ${kk.firstname || ""} ${middleInitial} ${suffix}`.trim()
                : "N/A";

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${fullName}</td>
                <td>${kk.age || "-"}</td>
                <td>${kk.purok || "-"}</td>
                <td>${kk.gender || "-"}</td>
                <td><button class="view-btn" data-id="${profile._id}">View Full Details</button></td>
            `;
            tableBody.appendChild(row);
        });

        // Attach modal buttons
        document.querySelectorAll(".view-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const id = e.target.dataset.id;
                const res = await fetch(`http://localhost:5000/api/lgbtqprofiling/${id}`, {
                    headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
                });
                const profile = await res.json();
                showProfileModal(profile);
            });
        });
    }

    // ================= CYCLE + YEAR FILTER =================
    const yearSelect = document.getElementById("cycleNumber");
    const cycleSelect = document.getElementById("year");
    const yearFilterBtn = document.getElementById("yearFilterBtn");

    yearFilterBtn.addEventListener("click", () => {
        const selectedYear = yearSelect.value;
        const selectedCycle = cycleSelect.value;
        fetchProfiles(selectedCycle, selectedYear);
    });


    // ================= SEARCH BAR =================
    const searchInput = document.querySelector(".search-input");

    searchInput.addEventListener("keyup", function () {
        const filter = searchInput.value.toLowerCase();
        const rows = tableBody.querySelectorAll("tr");

        rows.forEach(row => {
            const cells = row.querySelectorAll("td");
            let match = false;

            cells.forEach(cell => {
                if (cell.textContent.toLowerCase().includes(filter)) {
                    match = true;
                }
            });

            row.style.display = match ? "" : "none";
        });

    await newProfile.save();
    res
      .status(201)
      .json({ message: "LGBTQIA+ Profile submitted successfully" });
  } catch (error) {
    console.error("LGBTQ submit error:", error);
    res.status(500).json({ error: "Server error while submitting form" });
  }
};

// Helper to enrich profile with KK info
const attachKKInfo = async (profile) => {
  const kk = await KKProfile.findOne({ user: profile.user });
  const profileObj = profile.toObject();
  profileObj.kkInfo = kk
    ? {
        lastname: kk.lastname,
        firstname: kk.firstname,
        middlename: kk.middlename,
        birthday: kk.birthday,
        age: kk.age,
        gender: kk.gender,
        region: kk.region,
        province: kk.province,
        municipality: kk.municipality,
        barangay: kk.barangay,
        purok: kk.purok,
      }
    : null;
  return profileObj;
};

// Get all profiles (optionally filter by cycleId)
exports.getAllProfiles = async (req, res) => {
  try {
    const {
      year,
      cycle,
      all,
      sexAssignedAtBirth,
      lgbtqClassification,
      purok, // if you want to allow filtering by purok from KK info
    } = req.query;
    let cycleDoc = null;
    let filter = {};

    // 1. If all=true, return all cycles (optionally filter by fields)
    if (all === "true") {
      if (sexAssignedAtBirth) filter.sexAssignedAtBirth = sexAssignedAtBirth;
      if (lgbtqClassification) filter.lgbtqClassification = lgbtqClassification;
      const profiles = await LGBTQProfile.find(filter)
        .populate("formCycle")
        .populate("user", "username email");
      // Optionally filter by purok from KK info
      if (purok) {
        const attachKKInfo = async (profile) => {
          const kk = await KKProfile.findOne({ user: profile.user });
          return { ...profile.toObject(), kkInfo: kk };
        };
        const enriched = await Promise.all(profiles.map(attachKKInfo));
        return res.json(
          enriched.filter((p) => p.kkInfo && p.kkInfo.purok === purok)
        );
      }
      return res.json(profiles);
    }

    // 2. If year & cycle specified, use that cycle
    if (year && cycle) {
      cycleDoc = await FormCycle.findOne({
        formName: "LGBTQIA+ Profiling",
        year: Number(year),
        cycleNumber: Number(cycle),
      });
      if (!cycleDoc) {
        return res.status(404).json({ error: "Specified cycle not found" });
      }
    } else {
      // 3. Otherwise, use present (open) cycle
      try {
        cycleDoc = await getPresentCycle("LGBTQIA+ Profiling");
      } catch (err) {
        return res.status(404).json({ error: err.message });
      }
    }

    filter.formCycle = cycleDoc._id;
    if (sexAssignedAtBirth) filter.sexAssignedAtBirth = sexAssignedAtBirth;
    if (lgbtqClassification) filter.lgbtqClassification = lgbtqClassification;

    const profiles = await LGBTQProfile.find(filter)
      .populate("formCycle")
      .populate("user", "username email");

    // Optionally filter by purok from KK info
    if (purok) {
      const attachKKInfo = async (profile) => {
        const kk = await KKProfile.findOne({ user: profile.user });
        return { ...profile.toObject(), kkInfo: kk };
      };
      const enriched = await Promise.all(profiles.map(attachKKInfo));
      return res.json(
        enriched.filter((p) => p.kkInfo && p.kkInfo.purok === purok)
      );
    }

    res.json(profiles);
  } catch (err) {
    console.error("getAllProfiles error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get single profile by ID
exports.getProfileById = async (req, res) => {
  try {
    const profile = await LGBTQProfile.findById(req.params.id).populate(
      "user",
      "username email"
    );
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    const enriched = await attachKKInfo(profile);
    res.status(200).json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Get my profile for current cycle
exports.getMyProfile = async (req, res) => {
  try {
    const formStatus = await FormStatus.findOne({
      formName: "LGBTQIA+ Profiling",

    });

    // ================= CLASSIFICATION DROPDOWN =================
    const classificationDropdown = document.querySelector(".dropdown");
    const classificationButton = classificationDropdown.querySelector(".dropdown-button");
    const classificationContent = classificationDropdown.querySelector(".dropdown-content");

    classificationButton.addEventListener("click", () => {
        classificationContent.style.display =
            classificationContent.style.display === "block" ? "none" : "block";
    });

    classificationContent.querySelectorAll("a").forEach(a => {
        a.addEventListener("click", () => {
            selectedClassification = a.textContent.trim();
            classificationButton.textContent = selectedClassification;
            classificationContent.style.display = "none";

            applyClassificationFilter();
        });
    });

    function applyClassificationFilter() {
        if (!selectedClassification) {
            renderProfiles(allProfiles);
            return;
        }

        const filtered = allProfiles.filter(
            profile => profile.lgbtqClassification === selectedClassification
        );
        renderProfiles(filtered);
    }

    // ================= MODAL =================
    function showProfileModal(profile) {
        const modal = document.getElementById("profileModal");
        const details = document.getElementById("profileDetails");
        const kk = profile.kkInfo || {};

        let formattedBirthday = "-";
        if (kk.birthday) {
            const date = new Date(kk.birthday);
            formattedBirthday = date.toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "2-digit"
            });
        }

        details.innerHTML = `
          <div style="text-align:center; margin-bottom:15px;">
            <img src="${profile.idImage || 'default.png'}" alt="Profile Image" width="150" style="border-radius:8px;"/>
          </div>
          <div>
            <p><strong>Name:</strong> ${kk.firstname || ""} ${kk.middlename || ""} ${kk.lastname || ""}</p>
            <hr><p><strong>Age:</strong> ${kk.age || "-"} &nbsp;&nbsp; <strong>Gender:</strong> ${kk.gender || "-"}</p>
            <hr><p><strong>Birthday:</strong> ${formattedBirthday}</p>
            <hr><p><strong>Purok:</strong> ${kk.purok || "-"}</p>
            <hr><p><strong>Sex Assigned at Birth:</strong> ${profile.sexAssignedAtBirth || "-"}</p>
            <hr><p><strong>LGBTQ Classification:</strong> ${profile.lgbtqClassification || "-"}</p>
            <hr><p><strong>Email:</strong> ${profile.user?.email || "-"}</p>
          </div>
        `;

        modal.style.display = "flex";
        document.querySelector(".close-btn").onclick = () => modal.style.display = "none";
        window.onclick = (event) => { if (event.target === modal) modal.style.display = "none"; };

        // Print button
        document.getElementById("printBtn").onclick = () => {
            const w = window.open('', '', 'height=600,width=800');
            w.document.write('<html><head><title>Print Profile</title></head><body>');
            w.document.write(details.innerHTML);
            w.document.write('</body></html>');
            w.document.close();
            w.print();
        };
    }


    // ================= LOAD ON PAGE START =================
    fetchProfiles();
});

    // Find all profiles that match the cycle
    const profiles = await LGBTQProfile.find({ formCycle: cycle._id }).populate(
      "user",
      "username email"
    );

    // Enrich with KK Info
    const enriched = await Promise.all(profiles.map(attachKKInfo));

    res.status(200).json(enriched);
  } catch (error) {
    console.error("Error filtering profiles by cycle:", error);
    res.status(500).json({ error: "Server error while filtering profiles" });
  }
};

async function getPresentCycle(formName) {
  const status = await FormStatus.findOne({ formName, isOpen: true }).populate(
    "cycleId"
  );
  if (!status || !status.cycleId) {
    throw new Error("No active form cycle");
  }
  return status.cycleId;
}

