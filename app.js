// Tournament Registrar Dashboard - Main Application Logic
// Handles all UI interactions and business logic

class TournamentApp {
  constructor() {
    this.currentFilter = 'all';
    this.qrCode = null;
    this.selectedRank = null;
    this.selectedLocation = null;
    this.selectedGender = null;
    
    this.init();
  }
  
  init() {
    this.loadSchoolName();
    this.setupEventListeners();
    this.updateSyncStatus();
    this.updateStats();
    this.renderStudentList();
    this.renderPendingQueue();
    this.buildWalkInForm();
    
    // Check if tournament host location is set, prompt if not
    this.checkAndSetHostLocation();
    
    // Update UI periodically
    setInterval(() => {
      this.updateSyncStatus();
      this.updateStats();
    }, 5000);
    
    console.log('Tournament App initialized');
  }
  
  // Load school name from config
  loadSchoolName() {
    document.getElementById('school-name').textContent = CONFIG.school.name;
  }
  
  // Setup all event listeners
  setupEventListeners() {
    // Main action buttons
    document.getElementById('btn-search-student').addEventListener('click', () => this.showSearch());
    document.getElementById('btn-walk-in').addEventListener('click', () => this.showWalkInForm());
    document.getElementById('btn-show-qr').addEventListener('click', () => this.showQRCode());
    document.getElementById('btn-import-csv').addEventListener('click', () => this.importCSV());
    
    // Search
    document.getElementById('search-input').addEventListener('input', (e) => this.handleSearch(e.target.value));
    document.getElementById('btn-close-search').addEventListener('click', () => this.hideSearch());
    
    // Division controls
    document.getElementById('toggle-separate-gender').addEventListener('change', (e) => {
      stateManager.updateSettings({ separateByGender: e.target.checked });
    });
    document.getElementById('toggle-separate-rank').addEventListener('change', (e) => {
      stateManager.updateSettings({ separateByRank: e.target.checked });
    });
    document.getElementById('btn-view-divisions').addEventListener('click', () => this.showDivisions());
    document.getElementById('btn-print-lists').addEventListener('click', () => this.printLists());
    
    // Master override
    document.getElementById('master-override-toggle').addEventListener('click', () => this.toggleMasterOverride());
    
    // Filter buttons
    document.querySelectorAll('.btn-filter').forEach(btn => {
      btn.addEventListener('click', (e) => this.filterStudents(e.target.dataset.filter));
    });
    
    // Modal close buttons
    document.getElementById('close-walk-in').addEventListener('click', () => this.hideWalkInForm());
    document.getElementById('cancel-walk-in').addEventListener('click', () => this.hideWalkInForm());
    document.getElementById('close-qr').addEventListener('click', () => this.hideQRCode());
    document.getElementById('close-verify').addEventListener('click', () => this.hideVerifyModal());
    document.getElementById('close-warning').addEventListener('click', () => this.hideWarningModal());
    document.getElementById('btn-close-warning').addEventListener('click', () => this.hideWarningModal());
    document.getElementById('close-divisions').addEventListener('click', () => this.hideDivisions());
    
    // Walk-in form
    document.getElementById('walk-in-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitWalkIn();
    });
    
    // CSV file input
    document.getElementById('csv-file-input').addEventListener('change', (e) => this.handleCSVUpload(e));
    
    // Warning modal actions
    document.getElementById('btn-to-waiver').addEventListener('click', () => {
      alert('Direct student to waiver station');
      this.hideWarningModal();
    });
    document.getElementById('btn-to-payment').addEventListener('click', () => {
      alert('Direct student to payment desk');
      this.hideWarningModal();
    });
  }
  
  // Build walk-in form button grids from config
  buildWalkInForm() {
    // Build rank buttons
    const rankGrid = document.getElementById('rank-grid');
    rankGrid.innerHTML = '';
    CONFIG.ranks.forEach(rank => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'grid-button';
      btn.textContent = rank.name;
      btn.style.backgroundColor = rank.color;
      btn.style.color = rank.textColor;
      btn.dataset.rankId = rank.id;
      btn.addEventListener('click', () => this.selectRank(rank.id));
      rankGrid.appendChild(btn);
    });
    
    // Build location buttons
    const locationGrid = document.getElementById('location-grid');
    locationGrid.innerHTML = '';
    CONFIG.school.locations.forEach(location => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'grid-button';
      btn.textContent = location.name;
      btn.dataset.locationId = location.id;
      btn.addEventListener('click', () => this.selectLocation(location.id));
      locationGrid.appendChild(btn);
    });
    
    // Build gender buttons
    const genderGrid = document.getElementById('gender-grid');
    genderGrid.innerHTML = '';
    CONFIG.genders.forEach(gender => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'grid-button';
      btn.innerHTML = `${gender.icon} ${gender.name}`;
      btn.dataset.genderId = gender.id;
      btn.addEventListener('click', () => this.selectGender(gender.id));
      genderGrid.appendChild(btn);
    });
  }
  
  // Select rank button
  selectRank(rankId) {
    this.selectedRank = rankId;
    document.getElementById('walkin-rank').value = rankId;
    
    // Update button states
    document.querySelectorAll('#rank-grid .grid-button').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.rankId === rankId);
    });
  }
  
  // Select location button (student's home location)
  selectLocation(locationId) {
    this.selectedLocation = locationId;
    document.getElementById('walkin-location').value = locationId;
    
    // Update button states
    document.querySelectorAll('#location-grid .grid-button').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.locationId === locationId);
    });
    
    // Show waiver based on TOURNAMENT HOST location, not student location
    this.showHostLocationWaiver();
  }
  
  // Select gender button
  selectGender(genderId) {
    this.selectedGender = genderId;
    document.getElementById('walkin-gender').value = genderId;
    
    // Update button states
    document.querySelectorAll('#gender-grid .grid-button').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.genderId === genderId);
    });
  }
  
  // Check and set tournament host location on app load
  checkAndSetHostLocation() {
    const currentHost = stateManager.getTournamentHostLocation();
    
    if (!currentHost) {
      // Prompt user to select tournament host location
      this.promptHostLocation();
    } else {
      console.log(`Tournament hosted by: ${currentHost}`);
    }
  }
  
  // Prompt user to select tournament host location
  promptHostLocation() {
    const hostOptions = Object.keys(CONFIG.schoolWaivers);
    const hostNames = hostOptions.map(key => CONFIG.schoolWaivers[key].name);
    
    const message = `Welcome! Please select the TOURNAMENT HOST LOCATION:\n\n` +
                   hostOptions.map((key, i) => `${i + 1}. ${CONFIG.schoolWaivers[key].name}\n   ${CONFIG.schoolWaivers[key].address}`).join('\n\n');
    
    const selection = prompt(message + '\n\nEnter 1 or 2:');
    
    if (selection === '1' || selection === '2') {
      const hostKey = hostOptions[parseInt(selection) - 1];
      stateManager.setTournamentHostLocation(hostKey);
      this.showSuccessMessage(`Tournament host set to: ${CONFIG.schoolWaivers[hostKey].name}`);
    } else if (selection !== null) {
      // Invalid selection, prompt again
      alert('Invalid selection. Please try again.');
      this.promptHostLocation();
    }
  }
  
  // Show waiver based on tournament host location (not student's home location)
  showHostLocationWaiver() {
    const waiverSection = document.getElementById('waiver-section');
    const waiverContent = document.getElementById('waiver-content');
    
    const hostLocation = stateManager.getTournamentHostLocation();
    
    if (!hostLocation) {
      waiverContent.innerHTML = '<p style="color: #FF0000;">⚠️ Tournament host location not set. Please reload the app.</p>';
      waiverSection.style.display = 'block';
      return;
    }
    
    const hostConfig = CONFIG.schoolWaivers[hostLocation];
    if (hostConfig && hostConfig.waiverText) {
      waiverContent.innerHTML = hostConfig.waiverText;
      waiverSection.style.display = 'block';
    } else {
      waiverContent.innerHTML = '<p style="color: #FF0000;">⚠️ Waiver not found for host location.</p>';
      waiverSection.style.display = 'block';
    }
  }
  
  // Show search section
  showSearch() {
    document.getElementById('search-section').style.display = 'block';
    document.getElementById('search-input').focus();
  }
  
  // Hide search section
  hideSearch() {
    document.getElementById('search-section').style.display = 'none';
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').innerHTML = '';
  }
  
  // Handle search input
  handleSearch(query) {
    const results = stateManager.searchStudents(query);
    this.renderSearchResults(results);
  }
  
  // Render search results
  renderSearchResults(results) {
    const container = document.getElementById('search-results');
    
    if (results.length === 0) {
      container.innerHTML = '<p style="padding: 16px; text-align: center;">No students found</p>';
      return;
    }
    
    container.innerHTML = results.map(student => `
      <div class="search-result-item" onclick="app.selectStudent('${student.id}')">
        <strong>${student.name || `${student.first_name} ${student.last_name}`}</strong>
        <div style="font-size: 14px; opacity: 0.8;">
          ${student.rank || 'Unknown Rank'} | ${student.location || 'Unknown Location'}
          <br>Status: ${student.status || 'Pending'}
        </div>
      </div>
    `).join('');
  }
  
  // Select student from search
  selectStudent(studentId) {
    const student = stateManager.getStudent(studentId);
    if (student) {
      this.hideSearch();
      this.verifyStudent(student);
    }
  }
  
  // Verify and check-in student
  verifyStudent(student) {
    const result = stateManager.checkInStudent(student.id);
    
    if (result.success) {
      this.showSuccessMessage(`${student.name} checked in successfully!`);
      this.updateStats();
      this.renderStudentList();
      this.renderPendingQueue();
    } else {
      this.showWarning(result);
    }
  }
  
  // Show warning modal
  showWarning(result) {
    const modal = document.getElementById('modal-warning');
    const content = document.getElementById('warning-content');
    
    let message = `<h3>${result.student.name}</h3>`;
    message += `<p style="font-size: 18px; margin: 16px 0;">`;
    
    if (result.needsPayment) {
      message += `<strong style="color: #FF0000;">❌ Payment Not Received</strong><br>`;
    }
    
    if (result.needsWaiver) {
      message += `<strong style="color: #FF0000;">❌ Waiver Not Signed</strong><br>`;
    }
    
    message += `</p>`;
    message += `<p>Student must complete the following before check-in:</p>`;
    
    content.innerHTML = message;
    modal.style.display = 'flex';
  }
  
  // Hide warning modal
  hideWarningModal() {
    document.getElementById('modal-warning').style.display = 'none';
  }
  
  // Show walk-in form
  showWalkInForm() {
    // Check if host location is set
    if (!stateManager.getTournamentHostLocation()) {
      this.promptHostLocation();
      if (!stateManager.getTournamentHostLocation()) {
        // User cancelled, don't show form
        return;
      }
    }
    
    // Reset form
    document.getElementById('walk-in-form').reset();
    this.selectedRank = null;
    this.selectedLocation = null;
    this.selectedGender = null;
    
    document.querySelectorAll('.grid-button').forEach(btn => {
      btn.classList.remove('selected');
    });
    
    // Always show waiver for the host location immediately
    this.showHostLocationWaiver();
    
    document.getElementById('modal-walk-in').style.display = 'flex';
  }
  
  // Hide walk-in form
  hideWalkInForm() {
    document.getElementById('modal-walk-in').style.display = 'none';
  }
  
  // Submit walk-in registration
  submitWalkIn() {
    const hostLocation = stateManager.getTournamentHostLocation();
    const hostConfig = CONFIG.schoolWaivers[hostLocation];
    
    const formData = {
      name: document.getElementById('walkin-name').value,
      dob: document.getElementById('walkin-dob').value,
      email: document.getElementById('walkin-email').value,
      phone: document.getElementById('walkin-phone').value,
      rank: document.getElementById('walkin-rank').value,
      location: document.getElementById('walkin-location').value,
      gender: document.getElementById('walkin-gender').value,
      waiver_signed: document.getElementById('walkin-waiver').checked,
      waiver_location: hostLocation,  // Track which waiver was signed
      waiver_location_name: hostConfig ? hostConfig.name : 'Unknown',
      payment_status: document.getElementById('walkin-payment').checked ? 'paid' : 'pending',
      type: 'walk-in',
      status: 'pending'
    };
    
    // Split name into first and last
    const nameParts = formData.name.split(' ');
    formData.first_name = nameParts[0];
    formData.last_name = nameParts.slice(1).join(' ');
    
    // Add student
    const student = stateManager.addStudent(formData);
    
    // Attempt check-in
    const result = stateManager.checkInStudent(student.id);
    
    if (result.success) {
      this.showSuccessMessage(`Walk-in registration complete for ${formData.name}!`);
      this.hideWalkInForm();
      this.updateStats();
      this.renderStudentList();
      this.renderPendingQueue();
    } else {
      // Student added but not checked in
      this.hideWalkInForm();
      this.showWarning(result);
      this.renderPendingQueue();
    }
  }
  
  // Show QR code for self-registration
  showQRCode() {
    const modal = document.getElementById('modal-qr');
    const container = document.getElementById('qr-code-container');
    
    // Clear previous QR code
    container.innerHTML = '';
    
    // Generate QR code pointing to local or public URL
    const registrationURL = window.location.origin + window.location.pathname + '?mode=self-register';
    
    this.qrCode = new QRCode(container, {
      text: registrationURL,
      width: 300,
      height: 300,
      colorDark: '#000000',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.H
    });
    
    modal.style.display = 'flex';
  }
  
  // Hide QR code modal
  hideQRCode() {
    document.getElementById('modal-qr').style.display = 'none';
  }
  
  // Import CSV
  importCSV() {
    document.getElementById('csv-file-input').click();
  }
  
  // Handle CSV file upload
  handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvData = e.target.result;
      const result = stateManager.importFromCSV(csvData);
      
      this.showSuccessMessage(`Imported ${result.imported} of ${result.total} students from CSV`);
      this.updateStats();
      this.renderStudentList();
      this.renderPendingQueue();
    };
    
    reader.readAsText(file);
  }
  
  // Toggle master override
  toggleMasterOverride() {
    const isEnabled = stateManager.toggleMasterOverride();
    const btn = document.getElementById('master-override-toggle');
    const text = document.getElementById('override-text');
    
    if (isEnabled) {
      text.textContent = '🔓 Master Override: ON';
      btn.style.backgroundColor = '#FF0000';
      btn.style.color = '#FFFFFF';
      btn.style.borderColor = '#FF0000';
      this.showSuccessMessage('Master Override ENABLED - All validation checks bypassed');
    } else {
      text.textContent = '🔒 Enable Master Override';
      btn.style.backgroundColor = '';
      btn.style.color = '';
      btn.style.borderColor = '';
      this.showSuccessMessage('Master Override DISABLED - Validation checks restored');
    }
  }
  
  // Filter students
  filterStudents(filter) {
    this.currentFilter = filter;
    
    // Update button states
    document.querySelectorAll('.btn-filter').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    this.renderStudentList();
  }
  
  // Update sync status
  updateSyncStatus() {
    const indicator = document.getElementById('status-indicator');
    const text = document.getElementById('sync-text');
    
    if (navigator.onLine) {
      indicator.classList.remove('offline');
      text.textContent = 'Online';
    } else {
      indicator.classList.add('offline');
      text.textContent = 'Offline';
    }
  }
  
  // Update statistics
  updateStats() {
    const stats = stateManager.getStats();
    
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-pending').textContent = stats.pending;
    document.getElementById('stat-walkin').textContent = stats.walkIns;
  }
  
  // Render student list
  renderStudentList() {
    const container = document.getElementById('student-list');
    let students = [];
    
    switch (this.currentFilter) {
      case 'verified':
        students = stateManager.getCheckedInStudents();
        break;
      case 'pending':
        students = stateManager.getPendingStudents();
        break;
      default:
        students = stateManager.getAllStudents();
    }
    
    if (students.length === 0) {
      container.innerHTML = '<p style="padding: 24px; text-align: center;">No students to display</p>';
      return;
    }
    
    container.innerHTML = students.map(student => {
      const statusClass = student.status === 'checked-in' ? 'verified' : 'pending';
      const statusText = student.status === 'checked-in' ? '✓ Checked In' : '⏳ Pending';
      
      return `
        <div class="student-card ${statusClass}">
          <div class="student-info">
            <div class="student-name">${student.name || `${student.first_name} ${student.last_name}`}</div>
            <div class="student-details">
              ${student.rank || 'Unknown Rank'} | ${student.location || 'Unknown'} | ${student.gender || 'N/A'}
              <br>${statusText} ${student.type === 'walk-in' ? '| Walk-In' : ''}
            </div>
          </div>
          <div class="student-actions">
            ${student.status !== 'checked-in' ? 
              `<button class="btn-small" onclick="app.checkInFromList('${student.id}')">Check In</button>` : 
              `<button class="btn-small" onclick="app.markAsAbsent('${student.id}')">Mark Absent</button>`
            }
          </div>
        </div>
      `;
    }).join('');
  }
  
  // Render pending queue
  renderPendingQueue() {
    const container = document.getElementById('pending-queue');
    const pending = stateManager.getPendingStudents();
    
    if (pending.length === 0) {
      container.innerHTML = '<p style="padding: 16px; text-align: center; opacity: 0.6;">No pending students</p>';
      return;
    }
    
    container.innerHTML = pending.map(student => `
      <div class="pending-item" onclick="app.selectStudent('${student.id}')">
        <strong>${student.name || `${student.first_name} ${student.last_name}`}</strong>
        <div style="font-size: 12px;">
          ${student.payment_status !== 'paid' ? '❌ Payment' : '✓ Payment'}
          ${!student.waiver_signed ? ' | ❌ Waiver' : ' | ✓ Waiver'}
        </div>
      </div>
    `).join('');
  }
  
  // Check in from list
  checkInFromList(studentId) {
    const student = stateManager.getStudent(studentId);
    if (student) {
      this.verifyStudent(student);
    }
  }
  
  // Mark student as absent
  markAsAbsent(studentId) {
    if (confirm('Mark this student as absent?')) {
      stateManager.markAbsent(studentId);
      this.updateStats();
      this.renderStudentList();
      this.renderPendingQueue();
      this.showSuccessMessage('Student marked as absent');
    }
  }
  
  // Show divisions modal
  showDivisions() {
    const divisions = stateManager.generateDivisions();
    const container = document.getElementById('divisions-content');
    
    const divisionKeys = Object.keys(divisions);
    
    if (divisionKeys.length === 0) {
      container.innerHTML = '<p style="padding: 24px; text-align: center;">No divisions yet. Check in students to generate divisions.</p>';
    } else {
      container.innerHTML = divisionKeys.map(divisionKey => {
        const students = divisions[divisionKey];
        return `
          <div class="division-card">
            <div class="division-header">
              ${divisionKey}
              <span style="font-size: 18px; font-weight: normal;">(${students.length})</span>
            </div>
            <div class="division-students">
              ${students.map(s => `
                <div class="division-student">
                  ${s.name || `${s.first_name} ${s.last_name}`}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('');
    }
    
    document.getElementById('modal-divisions').style.display = 'flex';
  }
  
  // Hide divisions modal
  hideDivisions() {
    document.getElementById('modal-divisions').style.display = 'none';
  }
  
  // Hide verify modal
  hideVerifyModal() {
    document.getElementById('modal-verify').style.display = 'none';
  }
  
  // Print lists
  printLists() {
    const csv = stateManager.exportToCSV();
    
    // Create downloadable CSV file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tournament-checkin-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    this.showSuccessMessage('Check-in list exported to CSV');
  }
  
  // Show success message
  showSuccessMessage(message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      background: #32CD32;
      color: #000;
      padding: 16px 24px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 18px;
      z-index: 3000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Add CSS animations for toast
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Initialize app when DOM is ready
let app;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app = new TournamentApp();
  });
} else {
  app = new TournamentApp();
}

// Handle self-registration mode (from QR code)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('mode') === 'self-register') {
  // Automatically show walk-in form for self-registration
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (app) {
        app.showWalkInForm();
      }
    }, 500);
  });
}
