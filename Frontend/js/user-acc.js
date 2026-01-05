document.addEventListener("DOMContentLoaded", () => {

  (function() {
  const token = sessionStorage.getItem("token"); // Only sessionStorage!
  function sessionExpired() {
    Swal.fire({
      icon: 'warning',
      title: 'Session Expired',
      text: 'Please login again.',
      confirmButtonColor: '#0A2C59',
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then(() => {
      window.location.href = "/Frontend/html/admin/admin-log.html";
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

  const tableBody = document.querySelector(".tables table tbody");
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const searchInput = document.getElementById("userSearch");
  const showPendingCheckbox = document.getElementById("showPendingOnly");
  const tabAllBtn = document.getElementById("tabAll");
  const tabNewBtn = document.getElementById("tabNew");
  const tabPendingBtn = document.getElementById("tabPending");
  const tabApprovedBtn = document.getElementById("tabApproved");
  const tabRejectedBtn = document.getElementById("tabRejected");

  const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
    ? window.API_BASE
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : 'https://sk-insight.online';

  let allUsers = [];
  let currentTab = "all"; // Track which tab is active (all, pending, approved, rejected)
  let showPending = false; // Track if only showing pending
  const USERS_PER_PAGE = 10;
  let currentPage = 1;

  // Fetch all users
  async function fetchUsers() {
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) throw new Error("Failed to fetch users");

      const users = await res.json();
      // Filter non-admins and sort by newest first (by createdAt in descending order)
      allUsers = users
        .filter(u => u.role !== "admin")
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      renderTable(getFilteredUsers());
    } catch (err) {
      console.error("Error:", err);
      tableBody.innerHTML = `<tr><td colspan="5">Error loading users</td></tr>`;
    }
  }

  // Get filtered users based on tab, search, and pending status
  function getFilteredUsers() {
    let filtered = allUsers;

    // Filter by tab (all, pending, approved, rejected)
    if (currentTab === "pending") {
      filtered = filtered.filter(u => u.accStatus === "pending");
    } else if (currentTab === "approved") {
      filtered = filtered.filter(u => u.accStatus === "approved");
    } else if (currentTab === "rejected") {
      filtered = filtered.filter(u => u.accStatus === "rejected");
    }
    // "all" shows everything

    // Filter by search term
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (searchTerm) {
      filtered = filtered.filter(u =>
        (u.username && u.username.toLowerCase().includes(searchTerm)) ||
        (u.email && u.email.toLowerCase().includes(searchTerm))
      );
    }

    return filtered;
  }

  // Render table rows with highlighting for unapproved users
  function renderTable(data) {
    tableBody.innerHTML = "";

    // Update user account counter
    const counter = document.getElementById("userAccCount");
    if (counter) counter.textContent = data.length;

    // Calculate pagination
    const totalPages = Math.ceil(data.length / USERS_PER_PAGE);
    const startIdx = (currentPage - 1) * USERS_PER_PAGE;
    const endIdx = startIdx + USERS_PER_PAGE;
    const pageUsers = data.slice(startIdx, endIdx);

    if (!pageUsers.length) {
      tableBody.innerHTML = `<tr><td colspan="5">No users found</td></tr>`;
      renderPagination(data.length, totalPages);
      return;
    }

    pageUsers.forEach((u, index) => {
      const tr = document.createElement("tr");
      tr.setAttribute("data-id", u._id);
      
      // Add pending class if user is not approved
      if (u.accStatus !== "approved") {
        tr.classList.add("row-pending");
      }

      let statusBadge = '';
      if (u.accStatus === "approved") {
        statusBadge = '<span style="background: #22c55e; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">✓ APPROVED</span>';
      } else if (u.accStatus === "rejected") {
        statusBadge = '<span style="background: #ef4444; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">✗ REJECTED</span>';
      } else {
        statusBadge = '<span style="background: #f59e0b; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">⏱ PENDING</span>';
      }
      
      tr.innerHTML = `
        <td style="width: 8%; text-align: center;">${startIdx + index + 1}</td>
        <td style="width: 22%; text-align: center;">${u.username}</td>
        <td style="width: 25%;">${u.email}</td>
        <td style="width: 13%; text-align: center;">${u.birthday ? new Date(u.birthday).toLocaleDateString() : "-"}</td>
        <td style="width: 12%; text-align: center;">${statusBadge}</td>
        <td style="width: 20%; text-align: center;">
          <button class="view-btn" data-id="${u._id}" title="View">
            <i class="fa-solid fa-eye"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Render pagination controls
    renderPagination(data.length, totalPages);

    // Attach modal openers
    attachUserModalOpeners();
  }

  // Tab switching
  function removeAllActiveTabs() {
    tabAllBtn?.classList.remove("active");
    tabPendingBtn?.classList.remove("active");
    tabApprovedBtn?.classList.remove("active");
    tabRejectedBtn?.classList.remove("active");
  }

  tabAllBtn?.addEventListener("click", () => {
    currentTab = "all";
    currentPage = 1;
    removeAllActiveTabs();
    tabAllBtn.classList.add("active");
    renderTable(getFilteredUsers());
  });

  tabPendingBtn?.addEventListener("click", () => {
    currentTab = "pending";
    currentPage = 1;
    removeAllActiveTabs();
    tabPendingBtn.classList.add("active");
    renderTable(getFilteredUsers());
  });

  tabApprovedBtn?.addEventListener("click", () => {
    currentTab = "approved";
    currentPage = 1;
    removeAllActiveTabs();
    tabApprovedBtn.classList.add("active");
    renderTable(getFilteredUsers());
  });

  tabRejectedBtn?.addEventListener("click", () => {
    currentTab = "rejected";
    currentPage = 1;
    removeAllActiveTabs();
    tabRejectedBtn.classList.add("active");
    renderTable(getFilteredUsers());
  });

  // Pending checkbox filter (deprecated, but kept for backward compatibility)
  if (showPendingCheckbox) {
    showPendingCheckbox.addEventListener("change", () => {
      currentPage = 1; // Reset to first page
      showPending = showPendingCheckbox.checked;
      renderTable(getFilteredUsers());
    });
  }

  // Search filter
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentPage = 1; // Reset to first page
      renderTable(getFilteredUsers());
    });
  }

  // Initial load
  fetchUsers();

  const socket = io(API_BASE, { transports: ["websocket"] });

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

  // Pagination function
  function renderPagination(totalUsers, totalPages) {
    const pagination = document.getElementById("pagination");
    pagination.innerHTML = "";

    if (totalPages <= 1) return;

    // Previous button
    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.textContent = "Prev";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable(getFilteredUsers());
      }
    };
    pagination.appendChild(prevBtn);

    // Page numbers (show max 5 pages at a time)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = "pagination-btn" + (i === currentPage ? " active" : "");
      pageBtn.textContent = i;
      pageBtn.onclick = () => {
        currentPage = i;
        renderTable(getFilteredUsers());
      };
      pagination.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.textContent = "Next";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderTable(getFilteredUsers());
      }
    };
    pagination.appendChild(nextBtn);
  }

  function attachUserModalOpeners() {
    document.querySelectorAll(".view-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const userId = btn.dataset.id;
        showUserModal(userId);
      });
    });
  }

  async function showUserModal(userId) {
    try {
      const response = await fetch(`${API_BASE}/api/users/${encodeURIComponent(userId)}`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
      });
      const payload = await response.json();
      const user = payload.user || payload;
      const profiles = payload.profiles || {};
      console.log("Modal profile IDs:", profiles);

      // Resolve profile IDs (prefer answered-latest id, fallback to any-profile id, keep legacy keys)
      const kkId = profiles.kkAnsweredLatestId || profiles.kkAnyProfileId || profiles.kkProfileId || null;
      const lgbtqId = profiles.lgbtqAnsweredLatestId || profiles.lgbtqAnyProfileId || profiles.lgbtqProfileId || null;
      const educId = profiles.educationalAnsweredLatestId || profiles.educationalAnyProfileId || profiles.educationalProfileId || null;
    
    Swal.fire({
      showCloseButton: true,
      showConfirmButton: false,
      width: '900px',
      customClass: {
        popup: 'modern-modal',
        closeButton: 'modern-modal-close'
      },
      html: `
        <div class="modern-modal-header" style="background: linear-gradient(135deg, #0A2C59 0%, #1a3f6f 100%); padding: 32px 48px 20px 48px; display: flex; align-items: center; flex-direction: column; position: relative; gap: 8px; border-radius: 28px 28px 0 0;">
          <div style="display:flex; flex-direction:column; align-items: center; text-align: center;">
            <div style="font-size:20px; font-weight:700; color:#fff; line-height:1;">${user.username || user.email || '-'}</div>
            <div style="opacity:0.9; font-size:13px; color:#fff; margin-top:6px;">${user.email || '-'}</div>
          </div>
        </div>

        <div class="modern-modal-container" style="display: flex; flex-direction: column; height: 650px; background: #f8fafc;">
          
          <!-- Scrollable Content Area -->
          <div class="modern-modal-body" style="padding: 28px 32px; background: #f8fafc; color: #223; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif; overflow-y: auto; flex: 1; border-radius: 0;">
            
            <!-- Section 1: Approval Status -->
            <div style="margin-bottom: 24px;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <h2 style="margin: 0; font-size: 14px; font-weight: 700; color: #0A2C59; text-transform: uppercase; letter-spacing: 0.8px;">Verification Status</h2>
                <div style="padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; ${user.accStatus === "approved" ? "background: #d1fae5; color: #065f46;" : user.accStatus === "rejected" ? "background: #fee2e2; color: #991b1b;" : "background: #fed7aa; color: #92400e;"}">${user.accStatus === "approved" ? "✓ APPROVED" : user.accStatus === "rejected" ? "✗ REJECTED" : "⏱ PENDING"}</div>
              </div>
              ${user.rejectionReason ? `
                <div style="padding: 12px 14px; background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 8px;">
                  <div style="font-weight: 700; color: #b91c1c; font-size: 11px; text-transform: uppercase; margin-bottom: 6px;">Rejection Reason</div>
                  <div style="color: #7f1d1d; font-size: 13px; line-height: 1.5;">${user.rejectionReason}</div>
                </div>
              ` : ''}
            </div>

            <!-- Section 2: User Info (Horizontal Layout) -->
            <div style="margin-bottom: 24px;">
              <h2 style="margin: 0 0 14px 0; font-size: 14px; font-weight: 700; color: #0A2C59; text-transform: uppercase; letter-spacing: 0.8px;">Account Information</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;">
                
                <!-- Birthday -->
                <div style="background: #fff; padding: 14px 16px; border-radius: 10px; border: 1px solid #f0f4fa; box-shadow: 0 1px 3px rgba(10,44,89,0.04);">
                  <div style="font-weight: 600; color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">Birthday</div>
                  <div style="font-weight: 700; color: #0A2C59; font-size: 15px;">${user.birthday ? new Date(user.birthday).toLocaleDateString() : '-'}</div>
                </div>

                <!-- Age -->
                <div style="background: #fff; padding: 14px 16px; border-radius: 10px; border: 1px solid #f0f4fa; box-shadow: 0 1px 3px rgba(10,44,89,0.04);">
                  <div style="font-weight: 600; color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">Age</div>
                  <div style="font-weight: 700; color: #0A2C59; font-size: 15px;">${user.age ?? '-'}</div>
                </div>

                <!-- Account Created -->
                <div style="background: #fff; padding: 14px 16px; border-radius: 10px; border: 1px solid #f0f4fa; box-shadow: 0 1px 3px rgba(10,44,89,0.04);">
                  <div style="font-weight: 600; color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">Created</div>
                  <div style="font-weight: 700; color: #0A2C59; font-size: 13px;">${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</div>
                </div>
              </div>
            </div>

            <!-- Section 3: Submitted Forms -->
            <div style="margin-bottom: 24px;">
              <h2 style="margin: 0 0 14px 0; font-size: 14px; font-weight: 700; color: #0A2C59; text-transform: uppercase; letter-spacing: 0.8px;">Submitted Forms</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                
                <!-- KK Profiling -->
                <div style="background: #fff; padding: 14px; border-radius: 10px; border: 1px solid #f0f4fa; box-shadow: 0 1px 3px rgba(10,44,89,0.04); display: flex; flex-direction: column; gap: 10px;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                    <div style="width: 4px; height: 18px; background: #07B0F2; border-radius: 2px;"></div>
                    <div style="font-weight: 700; color: #0A2C59; font-size: 13px;">KK Profile</div>
                  </div>
                  ${kkId ? `<a href="#" onclick="window.openProfileTabWithToken('/Frontend/html/admin/KK-Profile.html', '${kkId}'); return false;" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 12px; background: #07B0F2; color: #fff; border: none; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 12px; cursor: pointer; transition: all 0.2s;">
                    <i class="fas fa-external-link-alt"></i> View
                  </a>` : `<div style="color: #aaa; font-size: 12px; font-weight: 500; text-align: center; padding: 8px 0;">Not submitted</div>`}
                </div>

                <!-- LGBTQIA+ Profiling -->
                <div style="background: #fff; padding: 14px; border-radius: 10px; border: 1px solid #f0f4fa; box-shadow: 0 1px 3px rgba(10,44,89,0.04); display: flex; flex-direction: column; gap: 10px;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                    <div style="width: 4px; height: 18px; background: #8b5cf6; border-radius: 2px;"></div>
                    <div style="font-weight: 700; color: #0A2C59; font-size: 13px;">LGBTQ+ Profile</div>
                  </div>
                  ${lgbtqId ? `<a href="#" onclick="window.openProfileTabWithToken('/Frontend/html/admin/LGBTQ-Profile.html', '${lgbtqId}'); return false;" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 12px; background: #8b5cf6; color: #fff; border: none; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 12px; cursor: pointer; transition: all 0.2s;">
                    <i class="fas fa-external-link-alt"></i> View
                  </a>` : `<div style="color: #aaa; font-size: 12px; font-weight: 500; text-align: center; padding: 8px 0;">Not submitted</div>`}
                </div>

                <!-- Educational Assistance -->
                <div style="background: #fff; padding: 14px; border-radius: 10px; border: 1px solid #f0f4fa; box-shadow: 0 1px 3px rgba(10,44,89,0.04); display: flex; flex-direction: column; gap: 10px;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                    <div style="width: 4px; height: 18px; background: #06b6d4; border-radius: 2px;"></div>
                    <div style="font-weight: 700; color: #0A2C59; font-size: 13px;">Education Asst.</div>
                  </div>
                  ${educId ? `<a href="#" onclick="window.openProfileTabWithToken('/Frontend/html/admin/Educational-Assistance-admin.html', '${educId}'); return false;" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 12px; background: #06b6d4; color: #fff; border: none; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 12px; cursor: pointer; transition: all 0.2s;">
                    <i class="fas fa-external-link-alt"></i> View
                  </a>` : `<div style="color: #aaa; font-size: 12px; font-weight: 500; text-align: center; padding: 8px 0;">Not submitted</div>`}
                </div>
              </div>
            </div>

            <!-- Section 4: ID Document -->
            <div>
              <h2 style="margin: 0 0 14px 0; font-size: 14px; font-weight: 700; color: #0A2C59; text-transform: uppercase; letter-spacing: 0.8px;">ID Document</h2>
              <div style="background: #fff; padding: 16px; border-radius: 10px; border: 1px solid #f0f4fa; box-shadow: 0 1px 3px rgba(10,44,89,0.04);">
                ${user.idImage ? `
                  <img src="${API_BASE}/${user.idImage}" alt="User ID" style="width: 100%; max-height: 280px; border-radius: 8px; border: 1px solid #e5e7eb; object-fit: contain;" />
                ` : `<div style="color: #999; font-size: 13px; padding: 32px 20px; text-align: center; background: #f8fafc; border-radius: 8px; border: 1px dashed #d0d0d0;">📋 No ID document uploaded</div>`}
              </div>
            </div>

          </div>

          <!-- Fixed Footer with Action Buttons -->
          ${user.accStatus !== "approved" ? `
            <div class="modern-modal-footer" style="padding: 14px 32px; background: #fff; border-top: 1px solid #e5e7eb; display: flex; gap: 10px; border-radius: 0 0 28px 28px; align-items: center;">
              <button id="rejectBtn" data-user-id="${user._id}" style="flex: 1; padding: 11px 16px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 13px;">
                <i class="fas fa-times"></i> Reject
              </button>
              <button id="approveBtn" data-user-id="${user._id}" style="flex: 1; padding: 11px 16px; background: #10b981; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 13px;">
                <i class="fas fa-check"></i> Approve
              </button>
            </div>
          ` : `
            <div class="modern-modal-footer" style="padding: 14px 32px; background: #fff; border-top: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; border-radius: 0 0 28px 28px;">
              <div style="color: #059669; font-size: 13px; font-weight: 600; letter-spacing: 0.3px;">✓ Approved • User can now login</div>
            </div>
          `}

        </div>
      `
    });

    // Add event listeners for approve/reject buttons
    setTimeout(() => {
      const approveBtn = document.getElementById('approveBtn');
      const rejectBtn = document.getElementById('rejectBtn');

      if (approveBtn) {
        approveBtn.addEventListener('click', async () => {
          const confirmed = await Swal.fire({
            icon: 'question',
            title: 'Approve ID?',
            text: 'Are you sure you want to approve this user\'s ID? They will be able to login.',
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            showCancelButton: true,
            confirmButtonText: 'Yes, Approve'
          });

          if (confirmed.isConfirmed) {
            try {
              const response = await fetch(`${API_BASE}/api/users/${userId}/approve-id`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${sessionStorage.getItem("token")}`,
                  'Content-Type': 'application/json'
                }
              });

              if (response.ok) {
                Swal.fire({
                  icon: 'success',
                  title: 'Approved!',
                  text: 'User ID has been approved.',
                  timer: 2000,
                  showConfirmButton: false
                });
                fetchUsers();
              } else {
                Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: 'Failed to approve user'
                });
              }
            } catch (error) {
              console.error('Error:', error);
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'An error occurred while approving the user'
              });
            }
          }
        });
      }

      if (rejectBtn) {
        rejectBtn.addEventListener('click', async () => {
          const { value: reason, isConfirmed } = await Swal.fire({
            icon: 'warning',
            title: 'Reject ID?',
            input: 'textarea',
            inputLabel: 'Rejection Reason *',
            inputPlaceholder: 'Enter reason for rejection',
            inputAttributes: {
              rows: 4,
              style: 'min-height: 100px;',
              required: 'required'
            },
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            showCancelButton: true,
            confirmButtonText: 'Yes, Reject',
            inputValidator: (value) => {
              if (!value || value.trim() === '') {
                return 'Rejection reason is required!';
              }
            }
          });

          if (isConfirmed && reason && reason.trim() !== '') {
            try {
              const response = await fetch(`${API_BASE}/api/users/${userId}/reject-id`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${sessionStorage.getItem("token")}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: reason.trim() })
              });

              if (response.ok) {
                Swal.fire({
                  icon: 'success',
                  title: 'Rejected!',
                  text: 'User ID has been rejected.',
                  timer: 2000,
                  showConfirmButton: false
                });
                fetchUsers();
              } else {
                Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: 'Failed to reject user'
                });
              }
            } catch (error) {
              console.error('Error:', error);
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'An error occurred while rejecting the user'
              });
            }
          }
        });
      }
    }, 100);
  } catch (error) {
    console.error('Error fetching user details:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to load user details'
    });
  }
}

});

// Helper to open profile tab and transfer session token via BroadcastChannel
function openProfileTabWithToken(url, profileId) {
  const tab = window.open(`${url}?id=${encodeURIComponent(profileId)}`, '_blank');
  const token = sessionStorage.getItem("token");
  if (token && tab) {
    const channel = new BroadcastChannel("skinsight-auth");
    setTimeout(() => {
      channel.postMessage({ token });
      channel.close();
    }, 500);
  }
}

// Make helper available globally for modal HTML
window.openProfileTabWithToken = openProfileTabWithToken;
