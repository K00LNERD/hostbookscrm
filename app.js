// AVP HostBooks Logic Engine

let db = null;
let useFirebase = false;

// Check if firebase is available and configured
if (typeof firebase !== 'undefined' && typeof firebaseConfig !== 'undefined') {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    useFirebase = true;
    console.log("Firebase Firestore initialized successfully.");
  } catch (error) {
    console.error("Firebase initialization failed, falling back to localStorage:", error);
  }
}

// 1. User Database & Credentials
const USERS = {
  "vijay": { name: "Vijay", role: "boss", pass: "vijay123" },
  "srijan": { name: "Srijan", role: "agent", pass: "srijan123" },
  "harshit": { name: "Harshit", role: "agent", pass: "harshit123" },
  "shivam": { name: "Shivam", role: "agent", pass: "shivam123" },
  "vishal": { name: "Vishal", role: "agent", pass: "vishal123" },
  "satya sai": { name: "Satya Sai", role: "agent", pass: "satya123" },
  "sandesh": { name: "Sandesh", role: "agent", pass: "sandesh123" }
};

// 2. Default Seed Data (Empty for fresh CRM start)
const DEFAULT_LEADS = [];

// 3. State Management
let currentUser = null;
let leads = [];
let dragSourceCardId = null;

// Initialize data
function loadState() {
  if (useFirebase) {
    // Set up real-time listener for Firestore database
    db.collection("leads").onSnapshot((snapshot) => {
      leads = [];
      snapshot.forEach(doc => {
        leads.push({ id: doc.id, ...doc.data() });
      });
      // If we are logged in, refresh the display
      if (currentUser) {
        refreshAllData();
      }
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
      showToast("Real-time database sync failed.", "error");
    });
  } else {
    // Wipes any old mock data once to start clean
    if (!localStorage.getItem("crm_leads_fresh_start")) {
      localStorage.removeItem("crm_leads");
      localStorage.setItem("crm_leads_fresh_start", "true");
    }

    const savedLeads = localStorage.getItem("crm_leads");
    if (savedLeads) {
      leads = JSON.parse(savedLeads);
    } else {
      leads = [...DEFAULT_LEADS];
      saveState();
    }
  }
  
  const savedUserKey = sessionStorage.getItem("crm_user_key");
  if (savedUserKey && USERS[savedUserKey]) {
    currentUser = { key: savedUserKey, ...USERS[savedUserKey] };
  }
}

function saveState() {
  if (!useFirebase) {
    localStorage.setItem("crm_leads", JSON.stringify(leads));
  }
}

// 4. Toast Notifications
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let iconHtml = "";
  if (type === "success") {
    iconHtml = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (type === "error") {
    iconHtml = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  } else {
    iconHtml = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }
  
  toast.innerHTML = `${iconHtml}<span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 5. Auth Handlers
function handleLogin(e) {
  e.preventDefault();
  const userSelect = document.getElementById("loginUserSelect").value;
  const passInput = document.getElementById("loginPassword").value;
  const loginError = document.getElementById("loginError");
  
  if (!userSelect || !passInput) {
    loginError.style.display = "flex";
    loginError.querySelector("span").textContent = "Please fill in all fields.";
    return;
  }
  
  const userData = USERS[userSelect];
  if (userData && userData.pass === passInput) {
    // Success
    currentUser = { key: userSelect, ...userData };
    sessionStorage.setItem("crm_user_key", userSelect);
    
    // Reset login fields
    document.getElementById("loginPassword").value = "";
    loginError.style.display = "none";
    
    // Switch views
    showAppShell();
    showToast(`Welcome back, ${currentUser.name}!`, "success");
  } else {
    loginError.style.display = "flex";
    loginError.querySelector("span").textContent = "Incorrect password.";
  }
}

function handleLogout() {
  sessionStorage.removeItem("crm_user_key");
  currentUser = null;
  showLoginScreen();
  showToast("Logged out successfully.", "info");
}

function showLoginScreen() {
  document.getElementById("loginContainer").style.display = "flex";
  document.getElementById("appShell").style.display = "none";
}

function showAppShell() {
  document.getElementById("loginContainer").style.display = "none";
  document.getElementById("appShell").style.display = "flex";
  
  // Render user info in header
  document.getElementById("headerUserName").textContent = currentUser.name;
  document.getElementById("headerUserRole").textContent = currentUser.role === "boss" ? "Administrator" : "Sales Representative";
  document.getElementById("headerAvatar").textContent = currentUser.name.split(" ").map(n => n[0]).join("").toUpperCase();
  
  // Configure dropdown/inputs based on role
  configureRoleViews();
  
  // Refresh views
  refreshAllData();
}

function configureRoleViews() {
  const agentFilterGroup = document.getElementById("agentFilterGroup");
  const agentFilter = document.getElementById("agentFilter");
  const exportBtn = document.getElementById("btnExportExcel");
  
  // Clear previous options in filter
  agentFilter.innerHTML = "";
  
  if (currentUser.role === "boss") {
    // Boss can filter by any agent or view all
    agentFilterGroup.style.display = "block";
    exportBtn.style.display = "inline-flex";
    
    const optAll = document.createElement("option");
    optAll.value = "all";
    optAll.textContent = "All Agents";
    agentFilter.appendChild(optAll);
    
    // Add all 6 agents
    Object.keys(USERS).forEach(key => {
      if (USERS[key].role === "agent") {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = USERS[key].name;
        agentFilter.appendChild(opt);
      }
    });
    
    // Show boss metrics progress section
    document.getElementById("bossProgressSection").style.display = "block";
  } else {
    // Agents view is locked to their own leads
    agentFilterGroup.style.display = "none";
    exportBtn.style.display = "none";
    document.getElementById("bossProgressSection").style.display = "none";
  }
}

// 6. Board & Dashboard Rendering
function refreshAllData() {
  const searchQuery = document.getElementById("searchInput").value.toLowerCase();
  
  let activeAgentFilter = "all";
  if (currentUser.role === "boss") {
    activeAgentFilter = document.getElementById("agentFilter").value;
  } else {
    activeAgentFilter = currentUser.key; // Lock agent view to their own
  }
  
  // Filter leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.company.toLowerCase().includes(searchQuery) ||
                          lead.contactName.toLowerCase().includes(searchQuery) ||
                          lead.email.toLowerCase().includes(searchQuery);
    
    const matchesAgent = (activeAgentFilter === "all") || (lead.assignee === activeAgentFilter);
    
    return matchesSearch && matchesAgent;
  });
  
  renderBoard(filteredLeads);
  renderDashboard(filteredLeads);
  if (currentUser.role === "boss") {
    renderBossProgress();
  }
  
  // Re-bind Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function renderBoard(filteredLeads) {
  const columns = ["new", "contacted", "proposal", "negotiation", "won", "lost"];
  
  columns.forEach(col => {
    const colLeads = filteredLeads.filter(l => l.status === col);
    const container = document.getElementById(`col-${col}-cards`);
    container.innerHTML = "";
    
    // Update headers
    const countBadge = document.getElementById(`col-${col}-count`);
    countBadge.textContent = colLeads.length;
    
    const totalBudget = colLeads.reduce((sum, l) => sum + Number(l.budget), 0);
    const totalBadge = document.getElementById(`col-${col}-total`);
    totalBadge.textContent = `$${totalBudget.toLocaleString()}`;
    
    colLeads.forEach(lead => {
      const card = document.createElement("div");
      card.className = `lead-card ${lead.temperature}`;
      card.setAttribute("draggable", "true");
      card.setAttribute("data-lead-id", lead.id);
      
      const assigneeName = USERS[lead.assignee] ? USERS[lead.assignee].name : lead.assignee;
      const initials = assigneeName.split(" ").map(n => n[0]).join("").toUpperCase();
      
      card.innerHTML = `
        <div class="lead-card-header">
          <span class="lead-company">${escapeHtml(lead.company)}</span>
          <span class="lead-temp-badge ${lead.temperature}">${lead.temperature}</span>
        </div>
        <div class="lead-title">${escapeHtml(lead.contactName)}</div>
        <div class="lead-card-body">
          <div class="lead-detail-row">
            <svg data-lucide="mail" width="13" height="13"></svg>
            <span>${escapeHtml(lead.email)}</span>
          </div>
          <div class="lead-detail-row">
            <svg data-lucide="phone" width="13" height="13"></svg>
            <span>${escapeHtml(lead.phone)}</span>
          </div>
        </div>
        <div class="lead-card-footer">
          <span class="lead-budget">$${Number(lead.budget).toLocaleString()}</span>
          <div class="lead-assignee" title="Assigned to ${assigneeName}">
            <div class="lead-assignee-avatar">${initials}</div>
            <span class="lead-assignee-name">${assigneeName}</span>
          </div>
        </div>
      `;
      
      // Events for Detail View
      card.addEventListener("click", () => openLeadDetailDialog(lead.id));
      
      // Drag events
      card.addEventListener("dragstart", handleDragStart);
      card.addEventListener("dragend", handleDragEnd);
      
      container.appendChild(card);
    });
  });
}

function renderDashboard(filteredLeads) {
  // Recalculate KPIs
  const totalLeads = filteredLeads.length;
  const totalPipeline = filteredLeads
    .filter(l => l.status !== "won" && l.status !== "lost")
    .reduce((sum, l) => sum + Number(l.budget), 0);
  
  const closedWonVal = filteredLeads
    .filter(l => l.status === "won")
    .reduce((sum, l) => sum + Number(l.budget), 0);
  
  const hotCount = filteredLeads.filter(l => l.temperature === "hot").length;
  const hotPct = totalLeads > 0 ? Math.round((hotCount / totalLeads) * 100) : 0;
  
  document.getElementById("kpiTotalLeads").textContent = totalLeads;
  document.getElementById("kpiPipelineValue").textContent = `$${totalPipeline.toLocaleString()}`;
  document.getElementById("kpiClosedWon").textContent = `$${closedWonVal.toLocaleString()}`;
  document.getElementById("kpiHotRatio").textContent = `${hotPct}%`;
}

function renderBossProgress() {
  const tableBody = document.getElementById("bossProgressTableBody");
  tableBody.innerHTML = "";
  
  Object.keys(USERS).forEach(agentKey => {
    if (USERS[agentKey].role !== "agent") return;
    
    const agentName = USERS[agentKey].name;
    const agentLeads = leads.filter(l => l.assignee === agentKey);
    
    const activeLeads = agentLeads.filter(l => l.status !== "won" && l.status !== "lost");
    const wonLeads = agentLeads.filter(l => l.status === "won");
    const lostLeads = agentLeads.filter(l => l.status === "lost");
    
    const pipelineVal = activeLeads.reduce((sum, l) => sum + Number(l.budget), 0);
    const wonVal = wonLeads.reduce((sum, l) => sum + Number(l.budget), 0);
    
    // Win rate percentage
    const totalClosed = wonLeads.length + lostLeads.length;
    const winRate = totalClosed > 0 ? Math.round((wonLeads.length / totalClosed) * 100) : 0;
    
    // Temperature breakdown
    const hotCount = agentLeads.filter(l => l.temperature === "hot").length;
    const warmCount = agentLeads.filter(l => l.temperature === "warm").length;
    const coldCount = agentLeads.filter(l => l.temperature === "cold").length;
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <div class="agent-cell">
          <div class="lead-assignee-avatar" style="width:28px; height:28px; font-size:12px;">${agentName.split(" ").map(n => n[0]).join("").toUpperCase()}</div>
          <div>
            <div style="font-weight:700;">${agentName}</div>
            <div style="font-size:11px; color:var(--text-secondary);">${activeLeads.length} active leads</div>
          </div>
        </div>
      </td>
      <td>
        <div style="font-weight:600; color:white;">$${pipelineVal.toLocaleString()}</div>
        <div style="font-size:11px; color:var(--text-secondary);">Pipeline</div>
      </td>
      <td>
        <div style="font-weight:600; color:var(--success);">$${wonVal.toLocaleString()}</div>
        <div style="font-size:11px; color:var(--text-secondary);">${wonLeads.length} won / ${lostLeads.length} lost</div>
      </td>
      <td>
        <div class="progress-bar-container">
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${winRate}%; background: var(--success);"></div>
          </div>
          <span style="font-weight:700; font-size:13px; color: white;">${winRate}%</span>
        </div>
      </td>
      <td>
        <div class="temperature-distribution">
          <span class="distribution-pill hot" title="Hot Leads">${hotCount}H</span>
          <span class="distribution-pill warm" title="Warm Leads">${warmCount}W</span>
          <span class="distribution-pill cold" title="Cold Leads">${coldCount}C</span>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// 7. Drag & Drop Event Handlers
function handleDragStart(e) {
  dragSourceCardId = this.getAttribute("data-lead-id");
  this.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", dragSourceCardId);
}

function handleDragEnd() {
  this.classList.remove("dragging");
  const cols = document.querySelectorAll(".kanban-column");
  cols.forEach(col => col.classList.remove("drag-over"));
  dragSourceCardId = null;
}

function setupDragAndDrop() {
  const columns = document.querySelectorAll(".kanban-column");
  
  columns.forEach(col => {
    col.addEventListener("dragover", function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      this.classList.add("drag-over");
    });
    
    col.addEventListener("dragleave", function() {
      this.classList.remove("drag-over");
    });
    
    col.addEventListener("drop", function(e) {
      e.preventDefault();
      this.classList.remove("drag-over");
      
      const leadId = e.dataTransfer.getData("text/plain");
      const targetColumn = this.id.replace("col-", "");
      
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        // Validation: Agents can only move their OWN cards
        if (currentUser.role !== "boss" && lead.assignee !== currentUser.key) {
          showToast("You can only update leads assigned to you.", "error");
          return;
        }
        
        const oldStatus = lead.status;
        if (oldStatus !== targetColumn) {
          lead.status = targetColumn;
          
          // Log systemic activity note
          const timestamp = new Date().toISOString().replace("T", " ").substring(0, 16);
          lead.notes.unshift({
            id: `sys-${Date.now()}`,
            author: "System",
            date: timestamp,
            text: `Moved stage from ${capitalize(oldStatus)} to ${capitalize(targetColumn)} by ${currentUser.name}`
          });
          
          if (useFirebase) {
            db.collection("leads").doc(leadId).update({
              status: targetColumn,
              notes: lead.notes
            })
              .then(() => {
                showToast(`Moved ${lead.company} to ${capitalize(targetColumn)}`, "success");
              })
              .catch((error) => {
                console.error("Firestore drag-drop error:", error);
                showToast("Failed to move lead in database.", "error");
              });
          } else {
            saveState();
            refreshAllData();
            showToast(`Moved ${lead.company} to ${capitalize(targetColumn)}`, "success");
          }
        }
      }
    });
  });
}

// 8. Lead CRUD Modals
function openAddLeadDialog() {
  const dialog = document.getElementById("addLeadDialog");
  const assigneeSelect = document.getElementById("addAssignee");
  
  // Build assignee dropdown options
  assigneeSelect.innerHTML = "";
  if (currentUser.role === "boss") {
    // Boss can assign to any agent
    Object.keys(USERS).forEach(key => {
      if (USERS[key].role === "agent") {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = USERS[key].name;
        assigneeSelect.appendChild(opt);
      }
    });
  } else {
    // Agents are locked to assign to themselves
    const opt = document.createElement("option");
    opt.value = currentUser.key;
    opt.textContent = currentUser.name;
    assigneeSelect.appendChild(opt);
    assigneeSelect.disabled = true;
  }
  
  // Clear other fields
  document.getElementById("addCompany").value = "";
  document.getElementById("addContact").value = "";
  document.getElementById("addEmail").value = "";
  document.getElementById("addPhone").value = "";
  document.getElementById("addBudget").value = 10000;
  document.getElementById("addTemperature").value = "warm";
  document.getElementById("addStatus").value = "new";
  
  dialog.showModal();
}

function handleAddLeadSubmit(e) {
  e.preventDefault();
  
  const company = document.getElementById("addCompany").value.trim();
  const contactName = document.getElementById("addContact").value.trim();
  const email = document.getElementById("addEmail").value.trim();
  const phone = document.getElementById("addPhone").value.trim();
  const budget = Number(document.getElementById("addBudget").value);
  const temperature = document.getElementById("addTemperature").value;
  const status = document.getElementById("addStatus").value;
  const assignee = document.getElementById("addAssignee").value;
  
  if (!company || !contactName) {
    showToast("Company and Contact Name are required.", "error");
    return;
  }
  
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 16);
  
  const newLead = {
    company,
    contactName,
    email: email || "N/A",
    phone: phone || "N/A",
    budget,
    temperature,
    status,
    assignee,
    notes: [
      { id: `sys-${Date.now()}`, author: "System", date: timestamp, text: `Lead created and assigned to ${USERS[assignee].name} by ${currentUser.name}` }
    ]
  };
  
  if (useFirebase) {
    db.collection("leads").add(newLead)
      .then(() => {
        document.getElementById("addLeadDialog").close();
        showToast(`Added new lead for ${company}`, "success");
      })
      .catch((error) => {
        console.error("Firestore create lead error:", error);
        showToast("Failed to save lead to database.", "error");
      });
  } else {
    // Add local ID for localStorage mode
    newLead.id = `lead-${Date.now()}`;
    leads.push(newLead);
    saveState();
    document.getElementById("addLeadDialog").close();
    refreshAllData();
    showToast(`Added new lead for ${company}`, "success");
  }
}

function openLeadDetailDialog(leadId) {
  const lead = leads.find(l => l.id === leadId);
  if (!lead) return;
  
  const dialog = document.getElementById("leadDetailDialog");
  
  // Save current lead id for modifications
  dialog.setAttribute("data-active-lead-id", leadId);
  
  // Set fields
  document.getElementById("detailTitle").textContent = lead.company;
  document.getElementById("detailCompany").textContent = lead.company;
  document.getElementById("detailContact").textContent = lead.contactName;
  document.getElementById("detailEmail").textContent = lead.email;
  document.getElementById("detailPhone").textContent = lead.phone;
  document.getElementById("detailBudget").textContent = `$${Number(lead.budget).toLocaleString()}`;
  
  const tempBadge = document.getElementById("detailTemperatureBadge");
  tempBadge.className = `detail-value temperature-badge-inline ${lead.temperature}`;
  tempBadge.textContent = lead.temperature;
  
  // Configure Interactive Fields in Edit Mode
  const editStatus = document.getElementById("editStatus");
  const editTemperature = document.getElementById("editTemperature");
  const editAssignee = document.getElementById("editAssignee");
  
  editStatus.value = lead.status;
  editTemperature.value = lead.temperature;
  
  // Set edit assignees selection list
  editAssignee.innerHTML = "";
  Object.keys(USERS).forEach(key => {
    if (USERS[key].role === "agent") {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = USERS[key].name;
      editAssignee.appendChild(opt);
    }
  });
  editAssignee.value = lead.assignee;
  
  // Permissions inside detailed view:
  if (currentUser.role === "boss") {
    // Boss can edit status, temperature, and assignee
    editStatus.disabled = false;
    editTemperature.disabled = false;
    editAssignee.disabled = false;
    document.getElementById("btnDeleteLead").style.display = "inline-flex";
  } else if (lead.assignee === currentUser.key) {
    // Assigned agent can edit status & temp, but NOT assignee
    editStatus.disabled = false;
    editTemperature.disabled = false;
    editAssignee.disabled = true;
    document.getElementById("btnDeleteLead").style.display = "none";
  } else {
    // Other agents cannot edit anything on this lead
    editStatus.disabled = true;
    editTemperature.disabled = true;
    editAssignee.disabled = true;
    document.getElementById("btnDeleteLead").style.display = "none";
  }
  
  // Notes inputs
  document.getElementById("newNoteText").value = "";
  
  // Render Notes history
  renderLeadNotes(lead);
  
  dialog.showModal();
}

function renderLeadNotes(lead) {
  const container = document.getElementById("detailNotesList");
  container.innerHTML = "";
  
  if (lead.notes.length === 0) {
    container.innerHTML = `<p style="font-size:13px; color:var(--text-muted); text-align:center; padding: 12px;">No interaction history logged yet.</p>`;
    return;
  }
  
  lead.notes.forEach(note => {
    const isSystem = note.author === "System";
    const item = document.createElement("div");
    item.className = "note-item";
    if (isSystem) {
      item.style.borderLeft = "2px solid var(--text-muted)";
      item.style.background = "rgba(255, 255, 255, 0.01)";
    }
    
    item.innerHTML = `
      <div class="note-header">
        <span class="note-author" style="${isSystem ? "color: var(--text-secondary);" : ""}">${note.author}</span>
        <span class="note-time">${note.date}</span>
      </div>
      <div class="note-body" style="${isSystem ? "color: var(--text-secondary); font-style: italic;" : ""}">${escapeHtml(note.text)}</div>
    `;
    container.appendChild(item);
  });
}

function handleAddNote() {
  const dialog = document.getElementById("leadDetailDialog");
  const leadId = dialog.getAttribute("data-active-lead-id");
  const lead = leads.find(l => l.id === leadId);
  if (!lead) return;
  
  // Permissions Check
  if (currentUser.role !== "boss" && lead.assignee !== currentUser.key) {
    showToast("You can only add notes to leads assigned to you.", "error");
    return;
  }
  
  const textInput = document.getElementById("newNoteText");
  const text = textInput.value.trim();
  
  if (!text) {
    showToast("Note content cannot be empty.", "error");
    return;
  }
  
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 16);
  const newNote = {
    id: `n-${Date.now()}`,
    author: currentUser.name,
    date: timestamp,
    text: text
  };
  
  lead.notes.unshift(newNote);
  
  if (useFirebase) {
    db.collection("leads").doc(leadId).update({
      notes: lead.notes
    })
      .then(() => {
        textInput.value = "";
        renderLeadNotes(lead);
        showToast("Interaction note saved successfully.", "success");
      })
      .catch((error) => {
        console.error("Firestore add note error:", error);
        showToast("Failed to save note to database.", "error");
      });
  } else {
    saveState();
    textInput.value = "";
    renderLeadNotes(lead);
    refreshAllData();
    showToast("Interaction note saved successfully.", "success");
  }
}

function handleLeadDetailsSave() {
  const dialog = document.getElementById("leadDetailDialog");
  const leadId = dialog.getAttribute("data-active-lead-id");
  const lead = leads.find(l => l.id === leadId);
  if (!lead) return;
  
  // Permissions Check
  if (currentUser.role !== "boss" && lead.assignee !== currentUser.key) {
    showToast("You do not have permission to modify this lead.", "error");
    dialog.close();
    return;
  }
  
  const newStatus = document.getElementById("editStatus").value;
  const newTemp = document.getElementById("editTemperature").value;
  const newAssignee = document.getElementById("editAssignee").value;
  
  let changes = [];
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 16);
  
  if (lead.status !== newStatus) {
    changes.push(`Stage: ${capitalize(lead.status)} ➔ ${capitalize(newStatus)}`);
    lead.status = newStatus;
  }
  if (lead.temperature !== newTemp) {
    changes.push(`Temp: ${capitalize(lead.temperature)} ➔ ${capitalize(newTemp)}`);
    lead.temperature = newTemp;
  }
  if (lead.assignee !== newAssignee && currentUser.role === "boss") {
    const oldName = USERS[lead.assignee] ? USERS[lead.assignee].name : lead.assignee;
    const newName = USERS[newAssignee] ? USERS[newAssignee].name : newAssignee;
    changes.push(`Assignee: ${oldName} ➔ ${newName}`);
    lead.assignee = newAssignee;
  }
  
  if (changes.length > 0) {
    lead.notes.unshift({
      id: `sys-${Date.now()}`,
      author: "System",
      date: timestamp,
      text: `Updated elements: [${changes.join(", ")}] by ${currentUser.name}`
    });
    
    if (useFirebase) {
      db.collection("leads").doc(leadId).update({
        status: lead.status,
        temperature: lead.temperature,
        assignee: lead.assignee,
        notes: lead.notes
      })
        .then(() => {
          showToast("Lead updates saved successfully.", "success");
        })
        .catch((error) => {
          console.error("Firestore update lead error:", error);
          showToast("Failed to save updates to database.", "error");
        });
    } else {
      saveState();
      refreshAllData();
      showToast("Lead updates saved successfully.", "success");
    }
  }
  
  dialog.close();
}

function handleDeleteLead() {
  if (currentUser.role !== "boss") {
    showToast("Only the Administrator (Vijay) can delete leads.", "error");
    return;
  }
  
  if (confirm("Are you sure you want to permanently delete this lead? This cannot be undone.")) {
    const dialog = document.getElementById("leadDetailDialog");
    const leadId = dialog.getAttribute("data-active-lead-id");
    
    if (useFirebase) {
      db.collection("leads").doc(leadId).delete()
        .then(() => {
          dialog.close();
          showToast("Lead deleted from system.", "warning");
        })
        .catch((error) => {
          console.error("Firestore delete lead error:", error);
          showToast("Failed to delete lead from database.", "error");
        });
    } else {
      leads = leads.filter(l => l.id !== leadId);
      saveState();
      dialog.close();
      refreshAllData();
      showToast("Lead deleted from system.", "warning");
    }
  }
}

// 9. Auxiliary Helpers
function exportToExcel() {
  if (currentUser.role !== "boss") {
    showToast("Only the Administrator (Vijay) can export data.", "error");
    return;
  }
  
  if (leads.length === 0) {
    showToast("No leads available to export.", "error");
    return;
  }

  // Define CSV headers
  const headers = [
    "Lead ID", 
    "Company Name", 
    "Contact Name", 
    "Email", 
    "Phone", 
    "Budget", 
    "Temperature", 
    "Stage", 
    "Assignee", 
    "Notes Count",
    "Last Interaction Date",
    "Last Interaction Text",
    "Full Note History"
  ];

  // Convert leads array to CSV rows
  const rows = leads.map(lead => {
    const assigneeName = USERS[lead.assignee] ? USERS[lead.assignee].name : lead.assignee;
    
    // Extract notes information
    const notesCount = lead.notes ? lead.notes.length : 0;
    const lastNote = (lead.notes && lead.notes.length > 0) ? lead.notes[0] : null;
    const lastNoteDate = lastNote ? lastNote.date : "N/A";
    const lastNoteText = lastNote ? lastNote.text.replace(/"/g, '""') : "N/A";
    
    const fullHistoryText = lead.notes 
      ? lead.notes.map(n => `[${n.date} - ${n.author}]: ${n.text}`).join(" | ").replace(/"/g, '""')
      : "";

    return [
      lead.id || "N/A",
      lead.company,
      lead.contactName,
      lead.email,
      lead.phone,
      lead.budget,
      lead.temperature,
      lead.status,
      assigneeName,
      notesCount,
      lastNoteDate,
      lastNoteText,
      fullHistoryText
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(val => `"${String(val).replace(/\n/g, " ")}"`).join(","))
  ].join("\n");

  // Create downloadable blob
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const timestamp = new Date().toISOString().substring(0, 10);
  link.setAttribute("href", url);
  link.setAttribute("download", `AVP_HostBooks_CRM_Export_${timestamp}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast("Excel spreadsheet downloaded successfully.", "success");
}


function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Setup light dismiss fallbacks for older browsers
function setupDialogLightDismiss() {
  const dialogs = document.querySelectorAll('dialog');
  dialogs.forEach(dialog => {
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent = (
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width
        );
        if (isDialogContent) return;
        dialog.close();
      });
    }
  });
}

// 10. Initialization on Load
window.addEventListener("DOMContentLoaded", () => {
  loadState();
  
  // Set up events
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("btnLogout").addEventListener("click", handleLogout);
  document.getElementById("searchInput").addEventListener("input", refreshAllData);
  document.getElementById("agentFilter").addEventListener("change", refreshAllData);
  
  document.getElementById("btnExportExcel").addEventListener("click", exportToExcel);
  document.getElementById("btnOpenAddLead").addEventListener("click", openAddLeadDialog);
  document.getElementById("addLeadForm").addEventListener("submit", handleAddLeadSubmit);
  
  document.getElementById("btnAddNote").addEventListener("click", handleAddNote);
  document.getElementById("btnSaveLeadDetails").addEventListener("click", handleLeadDetailsSave);
  document.getElementById("btnDeleteLead").addEventListener("click", handleDeleteLead);
  
  setupDragAndDrop();
  setupDialogLightDismiss();
  
  // Render login screen or direct shell
  if (currentUser) {
    showAppShell();
  } else {
    showLoginScreen();
  }
});
