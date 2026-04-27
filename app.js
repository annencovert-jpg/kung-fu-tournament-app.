// Tournament Registrar Dashboard - Complete Refactoring with Adult/Kids Sessions
// Implements all specification requirements for tournament management

class TournamentApp {
  constructor() {
    this.currentStudent = null;
    this.signaturePad = null;
    this.qrCode = null;
    this.waiverPollInterval = null;
    this.PIN_CODE = '1234';
    this.pendingRingPreferenceCallback = null;
    
    this.init();
  }
  
  init() {
    // Check startup flow: host location -> session type -> dashboard
    if (!stateManager.getTournamentHostLocation()) {
      this.showHostLocationStartup();
    } else if (!stateManager.getSessionType()) {
      this.showSessionTypeSelection();
    } else {
      this.initDashboard();
    }
  }
  
  initDashboard() {
    this.loadHeaderWithLogoAndSession();
    this.setupEventListeners();
    this.updateSyncStatus();
    this.updateStats();
    this.renderPendingQueue();
    
    // Update UI periodically
    setInterval(() => {
      this.updateSyncStatus();
      this.updateStats();
      this.renderPendingQueue();
    }, 5000);
    
    // Auto-retry pending syncs periodically
    setInterval(() => {
      const pendingCount = stateManager.getPendingSyncCount();
      if (pendingCount > 0 && navigator.onLine) {
        stateManager.retryPendingSyncs().then(result => {
          if (result.synced > 0) {
            this.showSuccessMessage(`✅ Synced ${result.synced} pending records`);
          }
        });
      }
    }, 30000);
    
    console.log('Tournament App initialized');
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // SECTION A: STARTUP & SESSION SETUP
  // ═══════════════════════════════════════════════════════════════════
  
  showHostLocationStartup() {
    const modal = document.getElementById('modal-host-selection');
    if (!modal) return;
    
    const content = document.getElementById('host-selection-content');
    content.innerHTML = `
      <h1 style="font-size: 48px; text-align: center; margin-bottom: 32px;">Tournament Host Selection</h1>
      <p style="font-size: 24px; text-align: center; margin-bottom: 32px; opacity: 0.9;">Select which location is hosting today's tournament:</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; max-width: 1000px; margin: 0 auto;">
        <button class="btn-primary" style="padding: 48px; font-size: 32px; height: auto; display: flex; flex-direction: column; align-items: center; gap: 16px;" onclick="app.selectHostLocation('north')">
          <span style="font-size: 64px;">🏫</span>
          <span style="font-size: 28px; font-weight: bold;">NORTH AUSTIN HOST</span>
          <span style="font-size: 16px; opacity: 0.8;">Austin Kung Fu and Tai Chi</span>
        </button>
        <button class="btn-primary" style="padding: 48px; font-size: 32px; height: auto; display: flex; flex-direction: column; align-items: center; gap: 16px;" onclick="app.selectHostLocation('south')">
          <span style="font-size: 64px;">🏫</span>
          <span style="font-size: 28px; font-weight: bold;">SOUTH AUSTIN HOST</span>
          <span style="font-size: 16px; opacity: 0.8;">South Austin Kung Fu and Tai Chi</span>
        </button>
      </div>
    `;
    
    modal.style.display = 'flex';
  }
  
  selectHostLocation(location) {
    const hostConfig = CONFIG.schoolWaivers[location];
    if (!hostConfig) return;
    
    const content = document.getElementById('host-selection-content');
    content.innerHTML = `
      <h2 style="font-size: 32px; margin-bottom: 24px; text-align: center;">Confirmation</h2>
      <div style="background: rgba(255, 215, 0, 0.1); border: 3px solid var(--color-secondary); border-radius: 12px; padding: 32px; margin-bottom: 24px; text-align: center;">
        <p style="font-size: 24px; margin-bottom: 16px;">You selected:</p>
        <h3 style="font-size: 36px; color: var(--color-secondary); margin-bottom: 8px;">${hostConfig.name.toUpperCase()}</h3>
        <p style="font-size: 18px; opacity: 0.8;">${hostConfig.address}</p>
        <p style="font-size: 20px; margin-top: 24px;">as today's tournament host.</p>
        <p style="font-size: 20px; font-weight: bold; color: var(--color-secondary);">Is this correct?</p>
      </div>
      <div style="display: flex; gap: 16px;">
        <button class="btn-secondary btn-large" style="flex: 1;" onclick="app.showHostLocationStartup()">Go Back</button>
        <button class="btn-primary btn-large" style="flex: 2;" onclick="app.confirmHostLocation('${location}')">✓ Yes, Continue</button>
      </div>
    `;
  }
  
  confirmHostLocation(location) {
    stateManager.setTournamentHostLocation(location);
    document.getElementById('modal-host-selection').style.display = 'none';
    
    // After host location, show session type selection
    this.showSessionTypeSelection();
  }
  
  showSessionTypeSelection() {
    const modal = document.getElementById('modal-host-selection');
    const content = document.getElementById('host-selection-content');
    
    content.innerHTML = `
      <h1 style="font-size: 48px; text-align: center; margin-bottom: 32px;">Session Type Selection</h1>
      <p style="font-size: 28px; text-align: center; margin-bottom: 32px; color: var(--color-secondary); font-weight: bold;">What type of session is this?</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; max-width: 1000px; margin: 0 auto;">
        <button class="btn-primary" style="padding: 48px; font-size: 32px; height: auto; display: flex; flex-direction: column; align-items: center; gap: 16px;" onclick="app.selectSessionType('adult')">
          <span style="font-size: 64px;">🥋</span>
          <span style="font-size: 28px; font-weight: bold;">Adult Session</span>
          <span style="font-size: 16px; opacity: 0.8;">Rank-based divisions</span>
        </button>
        <button class="btn-primary" style="padding: 48px; font-size: 32px; height: auto; display: flex; flex-direction: column; align-items: center; gap: 16px;" onclick="app.selectSessionType('kids')">
          <span style="font-size: 64px;">👦</span>
          <span style="font-size: 28px; font-weight: bold;">Kids Session</span>
          <span style="font-size: 16px; opacity: 0.8;">Age-based divisions</span>
        </button>
      </div>
    `;
    
    modal.style.display = 'flex';
  }
  
  selectSessionType(sessionType) {
    const sessionLabel = sessionType === 'adult' ? 'Adult Session' : 'Kids Session';
    const content = document.getElementById('host-selection-content');
    
    content.innerHTML = `
      <h2 style="font-size: 32px; margin-bottom: 24px; text-align: center;">Confirmation</h2>
      <div style="background: rgba(255, 215, 0, 0.1); border: 3px solid var(--color-secondary); border-radius: 12px; padding: 32px; margin-bottom: 24px; text-align: center;">
        <p style="font-size: 24px; margin-bottom: 16px;">You selected:</p>
        <h3 style="font-size: 36px; color: var(--color-secondary); margin-bottom: 8px;">${sessionLabel.toUpperCase()}</h3>
        <p style="font-size: 20px; margin-top: 24px;">Is this correct?</p>
      </div>
      <div style="display: flex; gap: 16px;">
        <button class="btn-secondary btn-large" style="flex: 1;" onclick="app.showSessionTypeSelection()">Go Back</button>
        <button class="btn-primary btn-large" style="flex: 2;" onclick="app.confirmSessionType('${sessionType}')">✓ Yes, Begin Session</button>
      </div>
    `;
  }
  
  confirmSessionType(sessionType) {
    stateManager.setSessionType(sessionType);
    document.getElementById('modal-host-selection').style.display = 'none';
    this.initDashboard();
    this.showSuccessMessage(`${sessionType === 'adult' ? 'Adult' : 'Kids'} Session started!`);
  }
  
  changeHostLocation() {
    const pin = prompt('Enter PIN to change host location:');
    if (pin === this.PIN_CODE) {
      this.showHostLocationStartup();
    } else if (pin !== null) {
      alert('Incorrect PIN');
    }
  }
  
  loadHeaderWithLogoAndSession() {
    const hostLocation = stateManager.getTournamentHostLocation();
    const sessionType = stateManager.getSessionType();
    const hostConfig = hostLocation ? CONFIG.schoolWaivers[hostLocation] : null;
    
    const sessionLabel = sessionType === 'adult' ? 'Adult Session' : sessionType === 'kids' ? 'Kids Session' : '';
    const locationLabel = hostConfig ? hostConfig.name.toUpperCase() : '';
    
    // Create logo element
    let logoHTML = '';
    if (hostLocation === 'north') {
      logoHTML = `<img src="logo-north.png" alt="North Austin Logo" style="height: 60px; margin-right: 16px;" onerror="this.outerHTML='<div style=\\'background: darkred; color: white; padding: 12px; border-radius: 8px; margin-right: 16px; font-size: 14px; font-weight: bold;\\'>AUSTIN KUNG FU & TAI CHI</div>';">`;
    } else if (hostLocation === 'south') {
      logoHTML = `<img src="logo-south.png" alt="South Austin Logo" style="height: 60px; margin-right: 16px;" onerror="this.outerHTML='<div style=\\'background: linear-gradient(135deg, red, yellow); color: white; padding: 12px; border-radius: 8px; margin-right: 16px; font-size: 14px; font-weight: bold;\\'>SOUTH AUSTIN KUNG FU</div>';">`;
    }
    
    const headerContent = document.querySelector('.header-content');
    headerContent.innerHTML = `
      <div style="display: flex; align-items: center;">
        ${logoHTML}
        <div>
          <h1 id="school-name" style="margin: 0;"><span class="font-light">Tournament Manager</span></h1>
          <div style="font-size: 18px; color: #FFA500; margin-top: 4px;">
            ${locationLabel}${sessionLabel ? ' | ' + sessionLabel : ''}
          </div>
        </div>
      </div>
      <div class="header-controls">
        <div class="sync-status" id="sync-status">
          <span class="status-indicator" id="status-indicator"></span>
          <span id="sync-text">Online</span>
        </div>
      </div>
    `;
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // SECTION B: REGISTRATION FORMS
  // ═══════════════════════════════════════════════════════════════════
  
  setupEventListeners() {
    // Main search
    document.getElementById('main-search-input').addEventListener('input', (e) => this.handleMainSearch(e.target.value));
    
    // Menu dropdown toggle
    document.getElementById('btn-menu').addEventListener('click', () => this.toggleMenuDropdown());
    
    // Menu items
    document.getElementById('menu-new-session').addEventListener('click', () => {
      this.toggleMenuDropdown();
      this.startNewSession();
    });
    document.getElementById('menu-import-csv').addEventListener('click', () => {
      this.toggleMenuDropdown();
      this.showImportCSVModal();
    });
    document.getElementById('menu-division-management').addEventListener('click', () => {
      this.toggleMenuDropdown();
      this.showDivisions();
    });
    document.getElementById('menu-export-csv').addEventListener('click', () => {
      this.toggleMenuDropdown();
      this.exportCSV();
    });
    document.getElementById('menu-change-host').addEventListener('click', () => {
      this.toggleMenuDropdown();
      this.changeHostLocation();
    });
    document.getElementById('menu-settings').addEventListener('click', () => {
      this.toggleMenuDropdown();
      this.showSettings();
    });
    
    // Main action buttons
    document.getElementById('btn-search-preregistered').addEventListener('click', () => {
      document.getElementById('main-search-input').focus();
    });
    document.getElementById('btn-walk-in').addEventListener('click', () => this.showWalkInForm());
    document.getElementById('btn-qr-code').addEventListener('click', () => this.showSelfRegistrationQR());
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('menu-dropdown');
      const btnMenu = document.getElementById('btn-menu');
      if (menu && menu.style.display === 'block' && !menu.contains(e.target) && e.target !== btnMenu) {
        menu.style.display = 'none';
      }
    });
    
    // Modal close buttons
    document.getElementById('close-walk-in').addEventListener('click', () => this.hideWalkInForm());
    document.getElementById('cancel-walk-in').addEventListener('click', () => this.hideWalkInForm());
    document.getElementById('close-verify').addEventListener('click', () => this.hideVerifyModal());
    document.getElementById('close-waiver-sign').addEventListener('click', () => this.exitWaiverSignMode());
    document.getElementById('close-qr-waiver').addEventListener('click', () => this.hideQRWaiverModal());
    document.getElementById('close-divisions').addEventListener('click', () => this.hideDivisions());
    
    // Walk-in form
    document.getElementById('walk-in-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitWalkIn();
    });
    
    // Build walk-in form based on session type
    this.buildWalkInForm();
  }
  
  buildWalkInForm() {
    const sessionType = stateManager.getSessionType();
    const form = document.getElementById('walk-in-form');
    
    // Universal fields
    form.innerHTML = `
      <div class="form-group">
        <label>Full Name *</label>
        <input type="text" id="walkin-name" class="input-large" required>
      </div>
      <div class="form-group">
        <label>Email Address *</label>
        <input type="email" id="walkin-email" class="input-large" required>
      </div>
      <div class="form-group">
        <label>Date of Birth *</label>
        <input type="date" id="walkin-dob" class="input-large" required>
      </div>
      <div class="form-group">
        <label>Phone Number</label>
        <input type="tel" id="walkin-phone" class="input-large">
      </div>
      <div class="form-group">
        <label>School Location *</label>
        <div class="button-grid" id="location-grid"></div>
        <input type="hidden" id="walkin-location" required>
      </div>
      <div class="form-group">
        <label>Gender *</label>
        <div class="button-grid gender-grid" id="gender-grid"></div>
        <input type="hidden" id="walkin-gender" required>
      </div>
      <div class="form-group" id="ring-preference-container" style="display: none;">
        <label>For ring placement, compete with:</label>
        <div class="button-grid" id="ring-preference-grid"></div>
        <input type="hidden" id="walkin-ring-preference">
      </div>
      ${sessionType === 'adult' ? `
        <div class="form-group">
          <label>Rank *</label>
          <div class="button-grid" id="rank-grid"></div>
          <input type="hidden" id="walkin-rank" required>
        </div>
      ` : ''}
      ${sessionType === 'kids' ? `
        <div class="form-group">
          <label>Age Group *</label>
          <div class="button-grid" id="age-group-grid"></div>
          <input type="hidden" id="walkin-age-group" required>
        </div>
        <div class="form-group">
          <label>Parent/Guardian Name *</label>
          <input type="text" id="walkin-parent-guardian" class="input-large" required>
        </div>
      ` : ''}
      <div class="form-actions">
        <button type="submit" class="btn-primary btn-large">✓ Add Student</button>
        <button type="button" class="btn-secondary" id="cancel-walk-in">Cancel</button>
      </div>
    `;
    
    // Re-attach cancel listener
    document.getElementById('cancel-walk-in').addEventListener('click', () => this.hideWalkInForm());
    
    // Build button grids
    this.buildLocationButtons();
    this.buildGenderButtons();
    
    if (sessionType === 'adult') {
      this.buildRankButtons();
    } else if (sessionType === 'kids') {
      this.buildAgeGroupButtons();
    }
  }
  
  buildRankButtons() {
    const rankGrid = document.getElementById('rank-grid');
    if (!rankGrid) return;
    
    rankGrid.innerHTML = '';
    CONFIG.ranks.forEach(rank => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'grid-button';
      btn.textContent = rank.name;
      btn.style.backgroundColor = rank.color;
      btn.style.color = rank.textColor;
      btn.dataset.rankId = rank.id;
      btn.dataset.group = rank.group;
      btn.addEventListener('click', () => this.selectRank(rank.id, rank.group));
      rankGrid.appendChild(btn);
    });
  }
  
  buildAgeGroupButtons() {
    const ageGroupGrid = document.getElementById('age-group-grid');
    if (!ageGroupGrid) return;
    
    ageGroupGrid.innerHTML = '';
    CONFIG.ageGroups.forEach(ageGroup => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'grid-button';
      btn.textContent = ageGroup.name;
      btn.dataset.ageGroupId = ageGroup.id;
      btn.dataset.group = ageGroup.group;
      btn.addEventListener('click', () => this.selectAgeGroup(ageGroup.id, ageGroup.group));
      ageGroupGrid.appendChild(btn);
    });
  }
  
  buildLocationButtons() {
    const locationGrid = document.getElementById('location-grid');
    if (!locationGrid) return;
    
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
  }
  
  buildGenderButtons() {
    const genderGrid = document.getElementById('gender-grid');
    if (!genderGrid) return;
    
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
  
  selectRank(rankId, group) {
    document.getElementById('walkin-rank').value = rankId;
    document.getElementById('walkin-rank').dataset.group = group;
    
    const buttons = document.querySelectorAll('#rank-grid .grid-button');
    buttons.forEach(btn => {
      if (btn.dataset.rankId === rankId) {
        btn.classList.add('selected');
        btn.style.border = '3px solid gold';
        btn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.6)';
        btn.style.background = 'rgba(255, 215, 0, 0.2)';
        btn.style.opacity = '1';
      } else {
        btn.classList.remove('selected');
        btn.style.border = '3px solid var(--color-secondary)';
        btn.style.boxShadow = 'none';
        btn.style.background = '';
        btn.style.opacity = '0.5';
      }
    });
  }
  
  selectAgeGroup(ageGroupId, group) {
    document.getElementById('walkin-age-group').value = ageGroupId;
    document.getElementById('walkin-age-group').dataset.group = group;
    
    const buttons = document.querySelectorAll('#age-group-grid .grid-button');
    buttons.forEach(btn => {
      if (btn.dataset.ageGroupId === ageGroupId) {
        btn.classList.add('selected');
        btn.style.border = '3px solid gold';
        btn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.6)';
        btn.style.background = 'rgba(255, 215, 0, 0.2)';
        btn.style.opacity = '1';
      } else {
        btn.classList.remove('selected');
        btn.style.border = '3px solid var(--color-secondary)';
        btn.style.boxShadow = 'none';
        btn.style.background = '';
        btn.style.opacity = '0.5';
      }
    });
  }
  
  selectLocation(locationId) {
    document.getElementById('walkin-location').value = locationId;
    
    const buttons = document.querySelectorAll('#location-grid .grid-button');
    buttons.forEach(btn => {
      if (btn.dataset.locationId === locationId) {
        btn.classList.add('selected');
        btn.style.border = '3px solid gold';
        btn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.6)';
        btn.style.background = 'rgba(255, 215, 0, 0.2)';
        btn.style.opacity = '1';
      } else {
        btn.classList.remove('selected');
        btn.style.border = '3px solid var(--color-secondary)';
        btn.style.boxShadow = 'none';
        btn.style.background = '';
        btn.style.opacity = '0.5';
      }
    });
  }
  
  selectGender(genderId) {
    document.getElementById('walkin-gender').value = genderId;
    
    const buttons = document.querySelectorAll('#gender-grid .grid-button');
    buttons.forEach(btn => {
      if (btn.dataset.genderId === genderId) {
        btn.classList.add('selected');
        btn.style.border = '3px solid gold';
        btn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.6)';
        btn.style.background = 'rgba(255, 215, 0, 0.2)';
        btn.style.opacity = '1';
      } else {
        btn.classList.remove('selected');
        btn.style.border = '3px solid var(--color-secondary)';
        btn.style.boxShadow = 'none';
        btn.style.background = '';
        btn.style.opacity = '0.5';
      }
    });
    
    // Show ring preference if non-binary or prefer not to say
    const ringPrefContainer = document.getElementById('ring-preference-container');
    if (genderId === 'non-binary' || genderId === 'prefer-not-say') {
      ringPrefContainer.style.display = 'block';
      this.buildRingPreferenceButtons();
    } else {
      ringPrefContainer.style.display = 'none';
      // Auto-set ring preference based on gender
      document.getElementById('walkin-ring-preference').value = genderId === 'male' ? 'male' : 'female';
    }
  }
  
  buildRingPreferenceButtons() {
    const grid = document.getElementById('ring-preference-grid');
    if (!grid) return;
    
    grid.innerHTML = `
      <button type="button" class="grid-button" data-preference="male" onclick="app.selectRingPreference('male')">Male Divisions</button>
      <button type="button" class="grid-button" data-preference="female" onclick="app.selectRingPreference('female')">Female Divisions</button>
    `;
  }
  
  selectRingPreference(preference) {
    document.getElementById('walkin-ring-preference').value = preference;
    
    const buttons = document.querySelectorAll('#ring-preference-grid .grid-button');
    buttons.forEach(btn => {
      if (btn.dataset.preference === preference) {
        btn.classList.add('selected');
        btn.style.border = '3px solid gold';
        btn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.6)';
        btn.style.background = 'rgba(255, 215, 0, 0.2)';
        btn.style.opacity = '1';
      } else {
        btn.classList.remove('selected');
        btn.style.border = '3px solid var(--color-secondary)';
        btn.style.boxShadow = 'none';
        btn.style.background = '';
        btn.style.opacity = '0.5';
      }
    });
  }
  
  showWalkInForm() {
    this.buildWalkInForm();
    document.getElementById('walk-in-form').reset();
    document.querySelectorAll('.grid-button').forEach(btn => {
      btn.classList.remove('selected');
      btn.style.border = '3px solid var(--color-secondary)';
      btn.style.boxShadow = 'none';
      btn.style.background = '';
      btn.style.opacity = '1';
    });
    document.getElementById('modal-walk-in').style.display = 'flex';
  }
  
  hideWalkInForm() {
    document.getElementById('modal-walk-in').style.display = 'none';
  }
  
  submitWalkIn() {
    const sessionType = stateManager.getSessionType();
    const hostLocation = stateManager.getTournamentHostLocation();
    const hostConfig = CONFIG.schoolWaivers[hostLocation];
    
    const genderIdentity = document.getElementById('walkin-gender').value;
    let ringPreference = document.getElementById('walkin-ring-preference').value;
    
    // Auto-set ring preference if not manually set
    if (!ringPreference) {
      ringPreference = genderIdentity === 'male' ? 'male' : 'female';
    }
    
    const formData = {
      name: document.getElementById('walkin-name').value,
      email: document.getElementById('walkin-email').value,
      dob: document.getElementById('walkin-dob').value,
      phone: document.getElementById('walkin-phone').value,
      location: document.getElementById('walkin-location').value,
      genderIdentity: genderIdentity,
      ringPreference: ringPreference,
      waiver_signed: false,
      waiver_location: hostLocation,
      waiver_location_name: hostConfig ? hostConfig.name : 'Unknown',
      payment_status: 'pending',
      type: 'walk-in',
      status: 'pending'
    };
    
    // Session-specific fields
    if (sessionType === 'adult') {
      const rankInput = document.getElementById('walkin-rank');
      formData.rank = rankInput.value;
      formData.originalRegistrationGroup = parseInt(rankInput.dataset.group);
      formData.currentGroup = formData.originalRegistrationGroup;
    } else if (sessionType === 'kids') {
      const ageGroupInput = document.getElementById('walkin-age-group');
      formData.ageGroup = ageGroupInput.value;
      formData.parentGuardianName = document.getElementById('walkin-parent-guardian').value;
      formData.originalRegistrationGroup = parseInt(ageGroupInput.dataset.group);
      formData.currentGroup = formData.originalRegistrationGroup;
    }
    
    // Split name
    const nameParts = formData.name.split(' ');
    formData.first_name = nameParts[0];
    formData.last_name = nameParts.slice(1).join(' ');
    
    const student = stateManager.addStudent(formData);
    
    this.hideWalkInForm();
    this.showSuccessMessage(`Walk-in student ${formData.name} added!`);
    this.show5StepVerificationModal(student);
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // STEP 1 - SEARCH & REVIEW
  // ═══════════════════════════════════════════════════════════════════
  
  handleMainSearch(query) {
    const results = stateManager.searchStudents(query);
    this.renderSearchResults(results);
  }
  
  renderSearchResults(results) {
    const container = document.getElementById('search-results');
    const sessionType = stateManager.getSessionType();
    
    if (results.length === 0) {
      container.innerHTML = '<p style="padding: 16px; text-align: center; opacity: 0.6;">No students found</p>';
      return;
    }
    
    container.innerHTML = results.map(student => {
      const displayInfo = sessionType === 'kids' 
        ? `${student.ageGroup || 'Unknown Age'} | ${student.location || 'Unknown Location'}`
        : `${student.rank || 'Unknown Rank'} | ${student.location || 'Unknown Location'}`;
      
      return `
        <div class="search-result-item" onclick="app.reviewStudent('${student.id}')">
          <strong>${student.name || `${student.first_name} ${student.last_name}`}</strong>
          <div style="font-size: 14px; opacity: 0.8;">${displayInfo}</div>
        </div>
      `;
    }).join('');
  }
  
  reviewStudent(studentId) {
    const student = stateManager.getStudent(studentId);
    if (!student) return;
    
    this.currentStudent = student;
    this.show5StepVerificationModal(student);
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // 5-STEP VERIFICATION MODAL WITH PAYMENT CONTROLS
  // ═══════════════════════════════════════════════════════════════════
  
  show7StepVerificationModal(student) {
    const modal = document.getElementById('modal-verify');
    const content = document.getElementById('verify-content');
    const sessionType = stateManager.getSessionType();
    
    const hasWaiver = student.waiver_signed === true || student.signatureData;
    const hasPayment = student.payment_status === 'paid';
    const hasDataEntry = sessionType === 'adult' ? !!student.rank : !!student.ageGroup;
    
    const waiverIcon = hasWaiver ? '✅' : '❌';
    const paymentIcon = hasPayment ? '✅' : '❌';
    const dataEntryIcon = hasDataEntry ? '✅' : '❌';
    const waiverColor = hasWaiver ? '#32CD32' : '#FF0000';
    const paymentColor = hasPayment ? '#32CD32' : '#FF0000';
    const dataEntryColor = hasDataEntry ? '#32CD32' : '#FF0000';
    
    const age = student.dob ? stateManager.calculateAge(student.dob) : 'Unknown';
    const displayInfo = sessionType === 'kids'
      ? `${student.ageGroup || 'Unknown Age'} | Age: ${age}`
      : `${student.rank || 'Unknown Rank'} | ${student.location || 'Unknown Location'}`;
    
    // Payment controls HTML
    const paymentControlsHTML = hasPayment ? `
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;">
        <button class="btn-secondary" style="flex: 1; min-width: 150px; padding: 8px 12px; font-size: 14px;" onclick="app.markPaymentUnpaid('${student.id}')">↩️ Mark as Unpaid</button>
        <button class="btn-secondary" style="flex: 1; min-width: 150px; padding: 8px 12px; font-size: 14px;" onclick="window.open('${MINDBODY_PAYMENT_URL}', '_blank')">📋 View in Mindbody</button>
        <button class="btn-secondary" style="flex: 1; min-width: 150px; padding: 8px 12px; font-size: 14px;" onclick="app.markCashPayment('${student.id}')">💵 Cash Payment Received</button>
      </div>
      <p style="font-size: 12px; opacity: 0.7; margin-top: 8px;">Payment Method: ${student.paymentMethod || 'unknown'}</p>
    ` : `
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;">
        <button class="btn-primary" style="flex: 1; min-width: 150px; padding: 8px 12px; font-size: 14px;" onclick="window.open('${MINDBODY_PAYMENT_URL}', '_blank')">💳 Send to Mindbody Payment</button>
        <button class="btn-primary" style="flex: 1; min-width: 150px; padding: 8px 12px; font-size: 14px;" onclick="app.markCashPayment('${student.id}')">💵 Cash Payment Received</button>
      </div>
    `;
    
    // Data entry buttons HTML
    let dataEntryHTML = '';
    if (sessionType === 'adult') {
      dataEntryHTML = CONFIG.ranks.map(rank => `
        <button class="grid-button rank-button ${student.rank === rank.id ? 'selected' : ''}" 
          style="background-color: ${rank.color}; color: #FFFFFF; font-weight: 800; text-shadow: 2px 2px 0px #000000, -1px -1px 0px #000000, 1px -1px 0px #000000, -1px 1px 0px #000000; padding: 20px; font-size: 18px; border: 3px solid ${student.rank === rank.id ? '#FFD700' : 'var(--color-secondary)'}; ${student.rank === rank.id ? 'box-shadow: 0 0 15px #FFD700;' : ''}" 
          onclick="app.selectVerifyRank('${student.id}', '${rank.id}', ${rank.group})">
          ${rank.name}
        </button>
      `).join('');
    } else {
      dataEntryHTML = CONFIG.ageGroups.map(ageGroup => `
        <button class="grid-button age-button ${student.ageGroup === ageGroup.id ? 'selected' : ''}" 
          style="background-color: var(--color-secondary); color: #FFFFFF; font-weight: 800; text-shadow: 2px 2px 0px #000000, -1px -1px 0px #000000, 1px -1px 0px #000000, -1px 1px 0px #000000; padding: 20px; font-size: 18px; border: 3px solid ${student.ageGroup === ageGroup.id ? '#FFD700' : 'var(--color-secondary)'}; ${student.ageGroup === ageGroup.id ? 'box-shadow: 0 0 15px #FFD700;' : ''}" 
          onclick="app.selectVerifyAgeGroup('${student.id}', '${ageGroup.id}', ${ageGroup.group})">
          ${ageGroup.name}
        </button>
      `).join('');
    }
    
    content.innerHTML = `
      <div style="background: rgba(255, 215, 0, 0.1); border: 3px solid var(--color-secondary); border-radius: 12px; padding: 24px; margin-bottom: 16px; text-align: center;">
        <p style="font-size: 16px; margin-bottom: 8px; opacity: 0.8;">STEP 2 - REVIEW</p>
        <h3 style="font-size: 32px; margin-bottom: 8px; color: var(--color-secondary);">${student.name || `${student.first_name} ${student.last_name}`}</h3>
        <p style="font-size: 18px; opacity: 0.9;">${displayInfo}</p>
        <p style="font-size: 14px; margin-top: 8px; opacity: 0.7;">Review the student's status below</p>
      </div>
      
      <!-- STEP 3 - WAIVER -->
      <div style="background: rgba(255, 215, 0, 0.05); border: 2px solid ${waiverColor}; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
          <span style="font-size: 42px;">${waiverIcon}</span>
          <div style="flex: 1;">
            <p style="font-size: 14px; opacity: 0.7; margin-bottom: 4px;">STEP 3 - WAIVER</p>
            <strong style="font-size: 20px;">Waiver Status</strong>
            <p style="font-size: 14px; opacity: 0.8; margin-top: 4px;">${hasWaiver ? 'Waiver signed and on file' : 'Waiver NOT signed'}</p>
          </div>
        </div>
        ${!hasWaiver ? `
          <div style="background: rgba(255, 165, 0, 0.2); border: 2px solid #FFA500; border-radius: 8px; padding: 16px; margin-top: 12px;">
            <p style="font-weight: bold; margin-bottom: 12px;">⚠️ WAIVER NEEDED — Choose an option:</p>
            <div style="display: flex; gap: 12px;">
              <button class="btn-warning" style="flex: 1;" onclick="app.showQRWaiver('${student.id}')">📱 Send QR Code</button>
              <button class="btn-warning" style="flex: 1;" onclick="app.enterWaiverSignMode('${student.id}')">✍️ Sign on Tablet</button>
            </div>
          </div>
        ` : `
          <div style="display: flex; gap: 8px; margin-top: 8px;">
            <button class="btn-secondary" style="padding: 8px 16px; font-size: 14px;" onclick="app.viewSignedWaiver('${student.id}')">📄 View Signed Waiver</button>
            <button class="btn-secondary" style="padding: 8px 16px; font-size: 14px;" onclick="app.resetWaiver('${student.id}')">🔄 Reset Waiver</button>
          </div>
        `}
      </div>
      
      <!-- STEP 4 - PAYMENT -->
      <div style="background: rgba(255, 215, 0, 0.05); border: 2px solid ${paymentColor}; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
          <span style="font-size: 42px;">${paymentIcon}</span>
          <div style="flex: 1;">
            <p style="font-size: 14px; opacity: 0.7; margin-bottom: 4px;">STEP 4 - PAYMENT</p>
            <strong style="font-size: 20px;">Payment Status</strong>
            <p style="font-size: 14px; opacity: 0.8; margin-top: 4px;">${hasPayment ? 'Payment confirmed' : 'Payment NOT received'}</p>
          </div>
        </div>
        ${paymentControlsHTML}
      </div>
      
      <!-- STEP 5 - DATA ENTRY -->
      <div style="background: rgba(255, 215, 0, 0.05); border: 2px solid ${dataEntryColor}; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
          <span style="font-size: 42px;">${dataEntryIcon}</span>
          <div style="flex: 1;">
            <p style="font-size: 14px; opacity: 0.7; margin-bottom: 4px;">STEP 5 - DATA ENTRY</p>
            <strong style="font-size: 20px;">${sessionType === 'adult' ? 'Select Rank' : 'Select Age Group'}</strong>
            <p style="font-size: 14px; opacity: 0.8; margin-top: 4px;">${hasDataEntry ? 'Selection confirmed' : 'Please select an option'}</p>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-top: 16px;">
          ${dataEntryHTML}
        </div>
      </div>
      
      <!-- STEP 6 - CHECK IN -->
      <div style="text-align: center; margin-top: 24px;">
        <p style="font-size: 14px; opacity: 0.7; margin-bottom: 8px;">STEP 6 - CHECK IN</p>
        <button class="btn-checkin ${hasWaiver && hasPayment && hasDataEntry ? 'enabled' : 'disabled'}" id="btn-final-checkin" ${hasWaiver && hasPayment && hasDataEntry ? '' : 'disabled'} onclick="app.finalCheckIn('${student.id}')">
          ✓ CONFIRM CHECK-IN
        </button>
      </div>
      
      <div style="display: flex; gap: 12px; margin-top: 16px;">
        <button class="btn-secondary" onclick="app.hideVerifyModal()">Cancel</button>
      </div>
    `;
    
    modal.style.display = 'flex';
  }
  
  // Alias for backward compatibility
  show5StepVerificationModal(student) {
    this.show7StepVerificationModal(student);
  }
  
  selectVerifyRank(studentId, rankId, group) {
    stateManager.updateStudent(studentId, {
      rank: rankId,
      originalRegistrationGroup: group,
      currentGroup: group
    });
    const student = stateManager.getStudent(studentId);
    this.show7StepVerificationModal(student);
  }
  
  selectVerifyAgeGroup(studentId, ageGroupId, group) {
    stateManager.updateStudent(studentId, {
      ageGroup: ageGroupId,
      originalRegistrationGroup: group,
      currentGroup: group
    });
    const student = stateManager.getStudent(studentId);
    this.show7StepVerificationModal(student);
  }
  
  markPaymentUnpaid(studentId) {
    if (confirm('Mark this payment as unpaid? This will require re-verification.')) {
      stateManager.updateStudent(studentId, {
        payment_status: 'pending',
        paymentMethod: 'disputed',
        paymentNote: 'Was marked paid in Mindbody - disputed by volunteer'
      });
      
      const student = stateManager.getStudent(studentId);
      this.show5StepVerificationModal(student);
      this.showSuccessMessage('Payment marked as unpaid');
    }
  }
  
  markCashPayment(studentId) {
    stateManager.updateStudent(studentId, {
      payment_status: 'paid',
      paymentMethod: 'cash',
      payment_timestamp: new Date().toISOString()
    });
    
    const student = stateManager.getStudent(studentId);
    this.show5StepVerificationModal(student);
    this.showSuccessMessage('Cash payment confirmed! ✅');
  }
  
  // Waiver functions (keeping existing implementations)
  showQRWaiver(studentId) {
    const modal = document.getElementById('modal-qr-waiver');
    const container = document.getElementById('qr-waiver-container');
    const student = stateManager.getStudent(studentId);
    
    container.innerHTML = '';
    
    const hostLocation = stateManager.getTournamentHostLocation();
    const sessionType = stateManager.getSessionType();
    const waiverURL = `${window.location.origin}${window.location.pathname.replace('index.html', '')}waiver.html?location=${hostLocation}&sessionType=${sessionType}&studentId=${studentId}`;
    
    this.qrCode = new QRCode(container, {
      text: waiverURL,
      width: 350,
      height: 350,
      colorDark: '#000000',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.H
    });
    
    document.getElementById('qr-waiver-instructions').innerHTML = `
      <p style="font-size: 20px; font-weight: bold; margin-bottom: 12px;">Ask ${student.name || student.first_name} to scan this with their phone camera</p>
      <p style="font-size: 16px; opacity: 0.8;">Waiting for waiver completion...</p>
      <div class="loading" style="margin: 16px auto;"></div>
    `;
    
    modal.style.display = 'flex';
    
    this.waiverPollInterval = setInterval(() => {
      const updatedStudent = stateManager.getStudent(studentId);
      if (updatedStudent.waiver_signed || updatedStudent.signatureData) {
        clearInterval(this.waiverPollInterval);
        this.hideQRWaiverModal();
        this.show5StepVerificationModal(updatedStudent);
        this.showSuccessMessage('Waiver completed! ✅');
      }
    }, 3000);
  }
  
  hideQRWaiverModal() {
    if (this.waiverPollInterval) {
      clearInterval(this.waiverPollInterval);
    }
    document.getElementById('modal-qr-waiver').style.display = 'none';
  }
  
  enterWaiverSignMode(studentId) {
    const student = stateManager.getStudent(studentId);
    if (!student) return;
    
    document.getElementById('modal-verify').style.display = 'none';
    
    const modal = document.getElementById('modal-waiver-sign');
    const content = document.getElementById('waiver-sign-content');
    
    const hostLocation = stateManager.getTournamentHostLocation();
    const hostConfig = CONFIG.schoolWaivers[hostLocation];
    
    content.innerHTML = `
      <div style="background: rgba(255, 215, 0, 0.1); border: 3px solid var(--color-secondary); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
        <h2 style="font-size: 28px; margin-bottom: 8px;">Student Waiver</h2>
        <p style="font-size: 20px; color: var(--color-secondary); font-weight: bold;">${student.name || `${student.first_name} ${student.last_name}`}</p>
      </div>
      
      <div style="background: rgba(255, 215, 0, 0.05); border: 2px solid var(--color-secondary); border-radius: 12px; padding: 20px; margin-bottom: 24px; max-height: 300px; overflow-y: auto;">
        ${hostConfig ? hostConfig.waiverText : '<p>Waiver text not available</p>'}
      </div>
      
      <div style="margin-bottom: 16px;">
        <label style="font-size: 18px; font-weight: bold; margin-bottom: 8px; display: block;">Digital Signature Required</label>
        <p style="font-size: 14px; opacity: 0.8; margin-bottom: 12px;">Sign below to agree to the waiver terms</p>
        <div style="border: 3px solid var(--color-secondary); border-radius: 8px; overflow: hidden; background: white;">
          <canvas id="signature-canvas-tablet" style="width: 100%; height: 200px; display: block;"></canvas>
        </div>
      </div>
      
      <div style="display: flex; gap: 12px;">
        <button class="btn-secondary" style="flex: 1;" onclick="app.clearTabletSignature()">Clear Signature</button>
        <button class="btn-primary" style="flex: 2;" onclick="app.completeTabletSignature('${studentId}')">✓ Complete Signature</button>
      </div>
    `;
    
    modal.style.display = 'flex';
    
    setTimeout(() => {
      const canvas = document.getElementById('signature-canvas-tablet');
      this.signaturePad = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'black',
        minWidth: 1.5,
        maxWidth: 3
      });
      
      this.resizeCanvas(canvas);
      window.addEventListener('resize', () => this.resizeCanvas(canvas));
    }, 100);
  }
  
  resizeCanvas(canvas) {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    if (this.signaturePad) {
      this.signaturePad.clear();
    }
  }
  
  clearTabletSignature() {
    if (this.signaturePad) {
      this.signaturePad.clear();
    }
  }
  
  async completeTabletSignature(studentId) {
    if (!this.signaturePad) return;
    
    if (this.signaturePad.isEmpty()) {
      alert('Please sign before continuing');
      return;
    }
    
    const signatureData = this.signaturePad.toDataURL();
    const hostLocation = stateManager.getTournamentHostLocation();
    const hostConfig = CONFIG.schoolWaivers[hostLocation];
    
    stateManager.updateStudent(studentId, {
      waiver_signed: true,
      signatureData: signatureData,
      waiver_timestamp: new Date().toISOString(),
      waiverVersion: hostConfig ? hostConfig.waiverText : ''
    });
    
    // Sync to Google Sheets
    const student = stateManager.getStudent(studentId);
    const syncResult = await stateManager.syncWaiverToGoogleSheets(student);
    
    this.exitWaiverSignMode();
    this.show5StepVerificationModal(student);
    
    if (syncResult.offline) {
      this.showSuccessMessage('Signature saved! ⚠️ Will sync when online');
    } else if (syncResult.success) {
      this.showSuccessMessage('Signature saved and synced! ✅');
    } else {
      this.showSuccessMessage('Signature saved! ⚠️ Sync pending');
    }
  }
  
  exitWaiverSignMode() {
    document.getElementById('modal-waiver-sign').style.display = 'none';
    this.signaturePad = null;
  }
  
  resetWaiver(studentId) {
    if (confirm('Reset waiver for this student? They will need to sign again.')) {
      stateManager.updateStudent(studentId, {
        waiver_signed: false,
        signatureData: null,
        waiver_timestamp: null
      });
      
      const student = stateManager.getStudent(studentId);
      this.show5StepVerificationModal(student);
      this.showSuccessMessage('Waiver reset');
    }
  }
  
  viewSignedWaiver(studentId) {
    const student = stateManager.getStudent(studentId);
    if (!student || !student.signatureData) {
      alert('No waiver signature found');
      return;
    }
    
    const hostLocation = stateManager.getTournamentHostLocation();
    const hostConfig = CONFIG.schoolWaivers[hostLocation];
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Signed Waiver - ${student.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { border-bottom: 3px solid #000; padding-bottom: 10px; }
          .info { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .signature { border: 2px solid #000; padding: 20px; margin: 20px 0; text-align: center; }
          .signature img { max-width: 100%; height: auto; }
          .print-btn { background: #FFD700; color: #000; border: none; padding: 10px 20px; font-size: 16px; cursor: pointer; }
          @media print { .print-btn { display: none; } }
        </style>
      </head>
      <body>
        <h1>Signed Tournament Waiver</h1>
        <div class="info">
          <p><strong>Student Name:</strong> ${student.name || `${student.first_name} ${student.last_name}`}</p>
          <p><strong>Email:</strong> ${student.email || 'N/A'}</p>
          <p><strong>Signed:</strong> ${student.waiver_timestamp ? new Date(student.waiver_timestamp).toLocaleString() : 'N/A'}</p>
          <p><strong>Host Location:</strong> ${hostConfig ? hostConfig.name : 'N/A'}</p>
          <p><strong>Sync Status:</strong> ${student.syncPending ? 'Pending' : (student.syncedAt ? 'Synced' : 'Not Synced')}</p>
        </div>
        <div style="margin: 20px 0;">
          ${student.waiverVersion || (hostConfig ? hostConfig.waiverText : '<p>Waiver text not available</p>')}
        </div>
        <div class="signature">
          <p><strong>Digital Signature:</strong></p>
          <img src="${student.signatureData}" alt="Signature">
        </div>
        <button class="print-btn" onclick="window.print()">🖨️ Print Waiver</button>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
  
  finalCheckIn(studentId) {
    const result = stateManager.checkInStudent(studentId);
    
    if (result.success) {
      this.hideVerifyModal();
      this.showCheckInSuccessWithArmbandReminder(result.student);
      this.updateStats();
      this.renderPendingQueue();
      
      document.getElementById('main-search-input').value = '';
      document.getElementById('search-results').innerHTML = '';
    } else {
      alert('Unable to check in: ' + result.error);
    }
  }
  
  showCheckInSuccessWithArmbandReminder(student) {
    // STEP 7 - ARMBAND REMINDER
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.9); display: flex; align-items: center;
      justify-content: center; z-index: 5000; animation: fadeIn 0.3s ease-out;
    `;
    overlay.id = 'armband-reminder-overlay';
    
    const reminderBox = document.createElement('div');
    reminderBox.style.cssText = `
      background: #FFD700; color: #000; padding: 48px; border-radius: 24px;
      text-align: center; max-width: 600px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5); animation: scaleIn 0.3s ease-out;
    `;
    reminderBox.innerHTML = `
      <div style="font-size: 96px; margin-bottom: 24px;">✅</div>
      <h2 style="font-size: 36px; margin-bottom: 16px; font-weight: bold;">CHECKED IN!</h2>
      <div style="font-size: 28px; margin-bottom: 32px;">${student.name || `${student.first_name} ${student.last_name}`}</div>
      
      <div style="background: rgba(255, 0, 0, 0.1); border: 4px solid #FF0000; border-radius: 16px; padding: 32px; margin: 32px 0;">
        <div style="font-size: 72px; margin-bottom: 16px;">🏷️</div>
        <h3 style="font-size: 32px; margin-bottom: 12px; font-weight: bold; color: #FF0000;">STEP 7 - ARMBAND REMINDER</h3>
        <p style="font-size: 24px; font-weight: bold; line-height: 1.4;">REQUIRED: Give student their armband now.</p>
      </div>
      
      <button class="btn-primary" onclick="app.closeArmbandReminder()" style="padding: 20px 48px; font-size: 24px; font-weight: bold; background: #000; color: #FFD700; border: 3px solid #000; cursor: pointer; border-radius: 12px; margin-top: 16px;">
        ✓ Finish
      </button>
    `;
    
    overlay.appendChild(reminderBox);
    document.body.appendChild(overlay);
  }
  
  closeArmbandReminder() {
    const overlay = document.getElementById('armband-reminder-overlay');
    if (overlay) {
      overlay.style.animation = 'fadeOut 0.3s ease-in';
      setTimeout(() => overlay.remove(), 300);
    }
  }
  
  showCheckInSuccess(student) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 255, 0, 0.2); display: flex; align-items: center;
      justify-content: center; z-index: 5000; animation: fadeIn 0.3s ease-out;
    `;
    
    const successBox = document.createElement('div');
    successBox.style.cssText = `
      background: #32CD32; color: #000; padding: 48px; border-radius: 24px;
      text-align: center; font-size: 48px; font-weight: bold;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5); animation: scaleIn 0.3s ease-out;
    `;
    successBox.innerHTML = `
      <div style="font-size: 72px; margin-bottom: 16px;">✅</div>
      <div>CHECKED IN!</div>
      <div style="font-size: 32px; margin-top: 16px; font-weight: normal;">${student.name || `${student.first_name} ${student.last_name}`}</div>
    `;
    
    overlay.appendChild(successBox);
    document.body.appendChild(overlay);
    
    setTimeout(() => {
      overlay.style.animation = 'fadeOut 0.3s ease-in';
      setTimeout(() => overlay.remove(), 300);
    }, 2000);
  }
  
  hideVerifyModal() {
    document.getElementById('modal-verify').style.display = 'none';
    this.currentStudent = null;
  }
  
  renderPendingQueue() {
    const container = document.getElementById('pending-queue');
    const pending = stateManager.getPendingStudents();
    
    if (pending.length === 0) {
      container.innerHTML = '<p style="padding: 16px; text-align: center; opacity: 0.6;">No pending students</p>';
      return;
    }
    
    container.innerHTML = pending.map(student => `
      <div class="pending-item" onclick="app.reviewStudent('${student.id}')">
        <strong>${student.name || `${student.first_name} ${student.last_name}`}</strong>
        <div style="font-size: 12px; margin-top: 4px;">
          ${student.payment_status === 'paid' ? '✅' : '❌'} Payment | 
          ${student.waiver_signed || student.signatureData ? '✅' : '❌'} Waiver
        </div>
      </div>
    `).join('');
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // MENU & QR CODE FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════
  
  toggleMenuDropdown() {
    const menu = document.getElementById('menu-dropdown');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  }
  
  showSelfRegistrationQR() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('modal-self-reg-qr');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal';
      modal.id = 'modal-self-reg-qr';
      modal.style.display = 'none';
      modal.innerHTML = `
        <div class="modal-content modal-medium">
          <div class="modal-header">
            <h2>📱 Self-Registration QR Code</h2>
            <button class="modal-close" onclick="app.hideSelfRegistrationQR()">&times;</button>
          </div>
          <div class="modal-body modal-center">
            <div id="self-reg-qr-container" class="qr-container"></div>
            <div id="self-reg-qr-instructions" style="margin-top: 24px;"></div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    
    const container = document.getElementById('self-reg-qr-container');
    container.innerHTML = '';
    
    const hostLocation = stateManager.getTournamentHostLocation();
    const sessionType = stateManager.getSessionType();
    
    // Build URL dynamically to work in any environment
    const waiverUrl = window.location.origin + window.location.pathname.replace('index.html', '') + `waiver.html?location=${hostLocation}&sessionType=${sessionType}`;
    
    new QRCode(container, {
      text: waiverUrl,
      width: 350,
      height: 350,
      colorDark: '#000000',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.H
    });
    
    const sessionLabel = sessionType === 'kids' ? 'Kids' : 'Adult';
    const hostConfig = CONFIG.schoolWaivers[hostLocation];
    
    document.getElementById('self-reg-qr-instructions').innerHTML = `
      <h3 style="font-size: 24px; color: var(--color-secondary); margin-bottom: 16px;">${sessionLabel} Session Registration</h3>
      <p style="font-size: 18px; margin-bottom: 12px;">Students can scan this QR code with their phone to:</p>
      <ul style="text-align: left; display: inline-block; font-size: 16px; line-height: 1.8;">
        <li>Fill out registration form</li>
        <li>Sign waiver for ${hostConfig ? hostConfig.name : 'tournament'}</li>
        <li>Submit to pending queue</li>
      </ul>
      <p style="font-size: 14px; opacity: 0.7; margin-top: 16px;">QR code opens registration page on their phone browser</p>
    `;
    
    modal.style.display = 'flex';
  }
  
  hideSelfRegistrationQR() {
    document.getElementById('modal-self-reg-qr').style.display = 'none';
  }
  
  showImportCSVModal() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('modal-import-csv');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal';
      modal.id = 'modal-import-csv';
      modal.style.display = 'none';
      modal.innerHTML = `
        <div class="modal-content modal-large">
          <div class="modal-header">
            <h2>📥 Import CSV from Mindbody</h2>
            <button class="modal-close" onclick="app.hideImportCSVModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div style="background: rgba(255, 215, 0, 0.1); border: 2px solid var(--color-secondary); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h3 style="color: var(--color-secondary); margin-bottom: 12px;">Instructions</h3>
              <ol style="line-height: 1.8; padding-left: 20px;">
                <li>Export student roster from Mindbody as CSV</li>
                <li>Click "Choose File" below and select the CSV file</li>
                <li>Click "Import" to add students to the Pending Verification Queue</li>
                <li>All imported students will appear in the right panel for verification</li>
              </ol>
            </div>
            <div style="margin-bottom: 20px;">
              <label style="display: block; color: var(--color-secondary); font-weight: bold; margin-bottom: 8px;">Select CSV File</label>
              <input type="file" id="csv-file-input" accept=".csv" class="input-large" style="padding: 12px;">
            </div>
            <div style="display: flex; gap: 12px;">
              <button class="btn-secondary" onclick="app.hideImportCSVModal()">Cancel</button>
              <button class="btn-primary" onclick="app.processCSVImport()" style="flex: 1;">📥 Import Students</button>
            </div>
            <div id="import-result" style="margin-top: 16px;"></div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    
    // Reset file input
    const fileInput = document.getElementById('csv-file-input');
    if (fileInput) fileInput.value = '';
    
    document.getElementById('import-result').innerHTML = '';
    modal.style.display = 'flex';
  }
  
  hideImportCSVModal() {
    document.getElementById('modal-import-csv').style.display = 'none';
  }
  
  async processCSVImport() {
    const fileInput = document.getElementById('csv-file-input');
    const resultDiv = document.getElementById('import-result');
    
    if (!fileInput.files || fileInput.files.length === 0) {
      resultDiv.innerHTML = '<p style="color: #FF0000;">Please select a CSV file first.</p>';
      return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const csvText = e.target.result;
      const result = stateManager.importFromCSV(csvText);
      
      if (result.imported > 0) {
        resultDiv.innerHTML = `
          <div style="background: #32CD32; color: #000; padding: 16px; border-radius: 8px; font-weight: bold;">
            ✅ Imported ${result.imported} students successfully.<br>
            They appear in the Pending Verification Queue.
          </div>
        `;
        
        // Update UI
        this.updateStats();
        this.renderPendingQueue();
        
        // Close modal after 2 seconds
        setTimeout(() => {
          this.hideImportCSVModal();
        }, 2000);
      } else {
        resultDiv.innerHTML = `
          <div style="background: rgba(255, 165, 0, 0.2); border: 2px solid #FFA500; padding: 16px; border-radius: 8px;">
            ⚠️ No new students imported. ${result.total} students already exist in the system.
          </div>
        `;
      }
    };
    
    reader.onerror = () => {
      resultDiv.innerHTML = '<p style="color: #FF0000;">Error reading file. Please try again.</p>';
    };
    
    reader.readAsText(file);
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // NEW SESSION BUTTON
  // ═══════════════════════════════════════════════════════════════════
  
  startNewSession() {
    const pin = prompt('Enter PIN to start new session:');
    if (pin !== this.PIN_CODE) {
      if (pin !== null) alert('Incorrect PIN');
      return;
    }
    
    if (confirm('This will start a completely new session. All current data will be cleared.\n\nAre you sure?')) {
      // Preserve hostLocation before clearing data
      const hostLocation = stateManager.getTournamentHostLocation();
      
      // Clear all data except host location
      stateManager.clearAllData();
      
      // Restore hostLocation
      if (hostLocation) {
        stateManager.setTournamentHostLocation(hostLocation);
      }
      
      // Restart the setup flow with session type selection
      this.showSessionTypeSelection();
      
      // Update header to ensure logo remains visible
      this.loadHeaderWithLogoAndSession();
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // DIVISION MANAGEMENT & PRINTING
  // ═══════════════════════════════════════════════════════════════════
  
  showDivisions() {
    const modal = document.getElementById('modal-divisions');
    const content = document.getElementById('divisions-content');
    const sessionType = stateManager.getSessionType();
    const checkedIn = stateManager.getCheckedInStudents();
    
    if (checkedIn.length === 0) {
      content.innerHTML = '<p style="padding: 24px; text-align: center;">No students checked in yet. Check in students to create divisions.</p>';
      modal.style.display = 'flex';
      return;
    }
    
    // Group students by currentGroup
    const groups = {};
    checkedIn.forEach(student => {
      const groupNum = student.currentGroup || 1;
      if (!groups[groupNum]) {
        groups[groupNum] = [];
      }
      groups[groupNum].push(student);
    });
    
    // Separate by gender checkbox
    const separateByGender = stateManager.state.settings.separateByGender || false;
    const separateByRank = stateManager.state.settings.separateByRank || false;
    
    content.innerHTML = `
      <div style="margin-bottom: 24px; background: rgba(255, 215, 0, 0.1); border: 2px solid var(--color-secondary); border-radius: 8px; padding: 16px;">
        <h3 style="color: var(--color-secondary); margin-bottom: 12px;">Division Options</h3>
        <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 8px;">
          <input type="checkbox" id="chk-separate-gender" ${separateByGender ? 'checked' : ''} style="width: 20px; height: 20px;">
          <span style="font-size: 16px;">Separate by Gender</span>
        </label>
        ${sessionType === 'adult' ? `
          <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 8px;">
            <input type="checkbox" id="chk-separate-rank" ${separateByRank ? 'checked' : ''} style="width: 20px; height: 20px;">
            <span style="font-size: 16px;">Separate by Rank</span>
          </label>
        ` : ''}
      </div>
      <div id="groups-container"></div>
      <div style="margin-top: 24px; text-align: center;">
        <button class="btn-primary btn-large" onclick="app.printLists()">🖨️ Print Ring Lists</button>
      </div>
    `;
    
    // Add event listeners for checkboxes
    setTimeout(() => {
      document.getElementById('chk-separate-gender').addEventListener('change', (e) => {
        stateManager.updateSettings({ separateByGender: e.target.checked });
        this.renderDivisionGroups();
      });
      
      if (sessionType === 'adult') {
        document.getElementById('chk-separate-rank').addEventListener('change', (e) => {
          stateManager.updateSettings({ separateByRank: e.target.checked });
          this.renderDivisionGroups();
        });
      }
      
      this.renderDivisionGroups();
    }, 100);
    
    modal.style.display = 'flex';
  }
  
  renderDivisionGroups() {
    const container = document.getElementById('groups-container');
    const sessionType = stateManager.getSessionType();
    const checkedIn = stateManager.getCheckedInStudents();
    const separateByGender = stateManager.state.settings.separateByGender || false;
    
    // Group students by currentGroup
    const groups = {};
    checkedIn.forEach(student => {
      const groupNum = student.currentGroup || 1;
      if (!groups[groupNum]) {
        groups[groupNum] = [];
      }
      groups[groupNum].push(student);
    });
    
    const groupNumbers = Object.keys(groups).sort((a, b) => parseInt(a) - parseInt(b));
    
    container.innerHTML = groupNumbers.map(groupNum => {
      const students = groups[groupNum];
      const groupLabel = this.getGroupLabel(parseInt(groupNum), sessionType);
      
      // Further separate by gender if checkbox is checked
      let studentsHTML = '';
      if (separateByGender) {
        const maleStudents = students.filter(s => s.ringPreference === 'male');
        const femaleStudents = students.filter(s => s.ringPreference === 'female');
        
        if (maleStudents.length > 0) {
          studentsHTML += `<h4 style="color: var(--color-secondary); margin: 12px 0 8px 0;">Male</h4>`;
          studentsHTML += maleStudents.map(s => this.renderStudentCard(s, sessionType)).join('');
        }
        
        if (femaleStudents.length > 0) {
          studentsHTML += `<h4 style="color: var(--color-secondary); margin: 12px 0 8px 0;">Female</h4>`;
          studentsHTML += femaleStudents.map(s => this.renderStudentCard(s, sessionType)).join('');
        }
      } else {
        studentsHTML = students.map(s => this.renderStudentCard(s, sessionType)).join('');
      }
      
      return `
        <div class="division-card" style="margin-bottom: 16px;" data-group="${groupNum}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="color: var(--color-secondary); font-size: 20px;" contenteditable="true" data-group="${groupNum}">${groupLabel}</h3>
            <span style="opacity: 0.7;">(${students.length} students)</span>
          </div>
          <div class="student-cards-container" data-group="${groupNum}">
            ${studentsHTML}
          </div>
        </div>
      `;
    }).join('');
    
    // Setup drag and drop
    this.setupDragAndDrop();
  }
  
  getGroupLabel(groupNum, sessionType) {
    if (sessionType === 'kids') {
      const ageGroups = ['Ages 4-6', 'Ages 7-9', 'Ages 10-12', 'Ages 13-17'];
      return `Group ${groupNum} - ${ageGroups[groupNum - 1] || 'Unknown'} - Ring ${groupNum}`;
    } else {
      const rankGroups = ['White/Yellow Belt', 'Blue/Green Belt', 'Brown Belt', '1st Black', '2nd-3rd Black'];
      return `Group ${groupNum} - ${rankGroups[groupNum - 1] || 'Unknown'} - Ring ${groupNum}`;
    }
  }
  
  renderStudentCard(student, sessionType) {
    const isMoved = student.currentGroup !== student.originalRegistrationGroup;
    const star = isMoved ? '⭐ ' : '';
    const displayInfo = sessionType === 'kids' 
      ? student.ageGroup || 'Unknown Age'
      : student.rank || 'Unknown Rank';
    
    return `
      <div class="student-card-drag" draggable="true" data-student-id="${student.id}" style="background: rgba(255, 215, 0, 0.1); border: 2px solid var(--color-secondary); border-radius: 6px; padding: 12px; margin-bottom: 8px; cursor: move;">
        <strong>${star}${displayInfo} - ${student.name || `${student.first_name} ${student.last_name}`}</strong>
      </div>
    `;
  }
  
  setupDragAndDrop() {
    const cards = document.querySelectorAll('.student-card-drag');
    const containers = document.querySelectorAll('.student-cards-container');
    
    let draggedElement = null;
    
    cards.forEach(card => {
      card.addEventListener('dragstart', (e) => {
        draggedElement = e.target;
        e.target.style.opacity = '0.4';
      });
      
      card.addEventListener('dragend', (e) => {
        e.target.style.opacity = '1';
      });
      
      // Touch support for tablets
      card.addEventListener('touchstart', (e) => {
        draggedElement = e.target;
        e.target.style.opacity = '0.4';
      });
      
      card.addEventListener('touchend', (e) => {
        e.target.style.opacity = '1';
      });
    });
    
    containers.forEach(container => {
      container.addEventListener('dragover', (e) => {
        e.preventDefault();
        container.style.background = 'rgba(255, 215, 0, 0.2)';
      });
      
      container.addEventListener('dragleave', (e) => {
        container.style.background = '';
      });
      
      container.addEventListener('drop', (e) => {
        e.preventDefault();
        container.style.background = '';
        
        if (draggedElement) {
          const studentId = draggedElement.dataset.studentId;
          const newGroup = parseInt(container.dataset.group);
          
          // Update student's currentGroup
          stateManager.updateStudent(studentId, {
            currentGroup: newGroup
          });
          
          // Re-render
          this.renderDivisionGroups();
        }
      });
    });
  }
  
  hideDivisions() {
    document.getElementById('modal-divisions').style.display = 'none';
  }
  
  printLists() {
    const sessionType = stateManager.getSessionType();
    const checkedIn = stateManager.getCheckedInStudents();
    const separateByGender = stateManager.state.settings.separateByGender || false;
    
    if (checkedIn.length === 0) {
      alert('No students checked in yet. Check in students before printing.');
      return;
    }
    
    // Group students by currentGroup
    const groups = {};
    checkedIn.forEach(student => {
      const groupNum = student.currentGroup || 1;
      if (!groups[groupNum]) {
        groups[groupNum] = [];
      }
      groups[groupNum].push(student);
    });
    
    const groupNumbers = Object.keys(groups).sort((a, b) => parseInt(a) - parseInt(b));
    
    // Generate print HTML
    let printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ring Lists - Tournament</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .page-break { page-break-before: always; }
          h1 { font-size: 32px; margin-bottom: 20px; border-bottom: 3px solid #000; padding-bottom: 10px; }
          h2 { font-size: 24px; margin: 16px 0; }
          ol { font-size: 18px; line-height: 1.8; }
          li { margin-bottom: 8px; }
          @media print {
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
    `;
    
    groupNumbers.forEach((groupNum, index) => {
      const students = groups[groupNum];
      const groupLabel = this.getGroupLabel(parseInt(groupNum), sessionType);
      
      if (index > 0) {
        printHTML += '<div class="page-break"></div>';
      }
      
      printHTML += `<h1>${groupLabel}</h1>`;
      
      if (separateByGender) {
        const maleStudents = students.filter(s => s.ringPreference === 'male');
        const femaleStudents = students.filter(s => s.ringPreference === 'female');
        
        if (maleStudents.length > 0) {
          printHTML += '<h2>Male</h2><ol>';
          maleStudents.forEach(s => {
            const star = s.currentGroup !== s.originalRegistrationGroup ? '⭐ ' : '';
            printHTML += `<li>${star}${s.name || `${s.first_name} ${s.last_name}`}</li>`;
          });
          printHTML += '</ol>';
        }
        
        if (femaleStudents.length > 0) {
          printHTML += '<h2>Female</h2><ol>';
          femaleStudents.forEach(s => {
            const star = s.currentGroup !== s.originalRegistrationGroup ? '⭐ ' : '';
            printHTML += `<li>${star}${s.name || `${s.first_name} ${s.last_name}`}</li>`;
          });
          printHTML += '</ol>';
        }
      } else {
        printHTML += '<ol>';
        students.forEach(s => {
          const star = s.currentGroup !== s.originalRegistrationGroup ? '⭐ ' : '';
          printHTML += `<li>${star}${s.name || `${s.first_name} ${s.last_name}`}</li>`;
        });
        printHTML += '</ol>';
      }
    });
    
    printHTML += '</body></html>';
    
    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // SETTINGS PAGE
  // ═══════════════════════════════════════════════════════════════════
  
  showSettings() {
    // Create settings modal if it doesn't exist
    let modal = document.getElementById('modal-settings');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal';
      modal.id = 'modal-settings';
      modal.style.display = 'none';
      modal.innerHTML = `
        <div class="modal-content modal-large">
          <div class="modal-header">
            <h2>⚙️ Settings</h2>
            <button class="modal-close" onclick="app.hideSettings()">&times;</button>
          </div>
          <div class="modal-body" id="settings-content"></div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    
    const currentUrl = stateManager.getGoogleSheetsUrl();
    const content = document.getElementById('settings-content');
    
    content.innerHTML = `
      <div style="margin-bottom: 32px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="color: var(--color-secondary); margin: 0;">Google Sheets Integration</h3>
          <button class="btn-secondary" onclick="app.showGoogleSheetsSetupGuide()" style="padding: 8px 16px; font-size: 14px;">❓ How to set this up</button>
        </div>
        <p style="margin-bottom: 12px;">Paste your Google Apps Script Web App URL below. This is required for legal compliance (Texas UETA).</p>
        <input type="text" id="google-sheets-url-input" class="input-large" placeholder="https://script.google.com/..." value="${currentUrl}" style="margin-bottom: 12px;">
        <div style="display: flex; gap: 12px;">
          <button class="btn-primary" onclick="app.saveGoogleSheetsUrl()">💾 Save URL</button>
          <button class="btn-secondary" onclick="app.testGoogleSheetsConnection()">🧪 Test Connection</button>
        </div>
        <p style="font-size: 12px; opacity: 0.7; margin-top: 12px;">URL must start with https://script.google.com</p>
      </div>
      
      <div style="margin-bottom: 32px;">
        <h3 style="color: var(--color-secondary); margin-bottom: 16px;">Waiver Records</h3>
        <button class="btn-secondary btn-large" onclick="app.viewAllWaivers()">👁️ View All Signed Waivers</button>
      </div>
      
      <div>
        <h3 style="color: var(--color-secondary); margin-bottom: 16px;">Sync Status</h3>
        <p>Pending syncs: ${stateManager.getPendingSyncCount()}</p>
        <button class="btn-primary" onclick="app.retryAllSyncs()" style="margin-top: 12px;">🔄 Retry Pending Syncs</button>
      </div>
    `;
    
    modal.style.display = 'flex';
  }
  
  hideSettings() {
    document.getElementById('modal-settings').style.display = 'none';
  }
  
  saveGoogleSheetsUrl() {
    const url = document.getElementById('google-sheets-url-input').value.trim();
    if (url && !url.startsWith('https://script.google.com')) {
      alert('Invalid URL. Must start with https://script.google.com');
      return;
    }
    
    stateManager.setGoogleSheetsUrl(url);
    this.showSuccessMessage('Google Sheets URL saved! ✅');
  }
  
  async testGoogleSheetsConnection() {
    const url = stateManager.getGoogleSheetsUrl();
    if (!url) {
      alert('Please enter a Google Sheets URL first');
      return;
    }
    
    try {
      // Send test record
      const testData = {
        fullName: 'Test Record',
        email: 'test@example.com',
        timestamp: new Date().toISOString(),
        signatureData: 'TEST',
        waiverVersion: 'Test waiver',
        hostLocation: stateManager.getTournamentHostLocation(),
        sessionType: stateManager.getSessionType()
      };
      
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });
      
      alert('✅ Connected! Test record sent.\n\nCheck your Google Sheet to verify the connection is working.');
    } catch (error) {
      alert('❌ Connection failed: ' + error.message);
    }
  }
  
  viewAllWaivers() {
    const students = stateManager.getAllStudents().filter(s => s.signatureData);
    
    if (students.length === 0) {
      alert('No signed waivers found');
      return;
    }
    
    const content = document.getElementById('settings-content');
    content.innerHTML = `
      <button class="btn-secondary" onclick="app.showSettings()" style="margin-bottom: 16px;">← Back to Settings</button>
      <h3 style="color: var(--color-secondary); margin-bottom: 16px;">All Signed Waivers (${students.length})</h3>
      <div style="max-height: 500px; overflow-y: auto;">
        ${students.map(s => `
          <div style="background: rgba(255, 215, 0, 0.1); border: 2px solid var(--color-secondary); border-radius: 8px; padding: 16px; margin-bottom: 12px; cursor: pointer;" onclick="app.viewSignedWaiver('${s.id}')">
            <strong>${s.name || `${s.first_name} ${s.last_name}`}</strong>
            <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">
              Signed: ${s.waiver_timestamp ? new Date(s.waiver_timestamp).toLocaleString() : 'N/A'}<br>
              Status: ${s.syncPending ? '⏳ Pending' : (s.syncedAt ? '✅ Synced' : '❌ Not Synced')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  async retryAllSyncs() {
    const result = await stateManager.retryPendingSyncs();
    if (result.synced > 0) {
      this.showSuccessMessage(`✅ Synced ${result.synced} of ${result.total} records`);
    } else {
      alert('No records were synced. Check your connection and try again.');
    }
    this.showSettings(); // Refresh
  }
  
  showGoogleSheetsSetupGuide() {
    const scriptCode = `function doPost(e) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("Sheet1");
  const data = JSON.parse(e.postData.contents);
  sheet.appendRow([
    data.fullName,
    data.email,
    data.timestamp,
    data.ipAddress,
    data.signatureData,
    data.waiverVersion,
    data.hostLocation,
    data.sessionType,
    data.parentGuardianName || ""
  ]);
  return ContentService
    .createTextOutput(
      JSON.stringify({"result":"success"})
    )
    .setMimeType(ContentService.MimeType.JSON);
}`;

    const content = document.getElementById('settings-content');
    content.innerHTML = `
      <button class="btn-secondary" onclick="app.showSettings()" style="margin-bottom: 16px;">← Back to Settings</button>
      
      <div style="max-height: 600px; overflow-y: auto; padding-right: 12px;">
        <h2 style="color: var(--color-secondary); margin-bottom: 12px; font-size: 28px;">Google Sheets Setup Guide</h2>
        <p style="font-size: 16px; margin-bottom: 24px; opacity: 0.9;">Follow these steps to connect your Tournament Waiver records to Google Sheets. This is required for legal compliance in Texas.</p>
        
        <hr style="border: none; border-top: 2px solid var(--color-secondary); margin: 24px 0;">
        
        <h3 style="color: var(--color-secondary); font-size: 22px; margin: 24px 0 16px 0;">PHASE 1 — CREATE YOUR GOOGLE SHEET</h3>
        <ol style="line-height: 2; font-size: 15px; padding-left: 24px;">
          <li>Go to <strong>sheets.google.com</strong> and sign in</li>
          <li>Click the <strong>+ button</strong> to create a new blank spreadsheet</li>
          <li>Name it: <strong style="color: var(--color-secondary);">Tournament Waivers 2026</strong> (update the year each tournament)</li>
          <li>In <strong>Row 1</strong> add these column headers exactly as shown, one per column:
            <div style="background: rgba(255, 215, 0, 0.1); border: 2px solid var(--color-secondary); padding: 16px; margin: 12px 0; border-radius: 8px;">
              <div style="font-family: monospace; font-size: 14px; line-height: 1.8;">
                <strong>Column A:</strong> Full Name<br>
                <strong>Column B:</strong> Email<br>
                <strong>Column C:</strong> Timestamp<br>
                <strong>Column D:</strong> IP Address<br>
                <strong>Column E:</strong> Signature Data<br>
                <strong>Column F:</strong> Waiver Version<br>
                <strong>Column G:</strong> Host Location<br>
                <strong>Column H:</strong> Session Type<br>
                <strong>Column I:</strong> Parent Guardian Name
              </div>
            </div>
            <strong style="color: #FFA500;">IMPORTANT:</strong> The columns must be in this exact order or the data will not save correctly.
          </li>
        </ol>
        
        <hr style="border: none; border-top: 2px solid var(--color-secondary); margin: 24px 0;">
        
        <h3 style="color: var(--color-secondary); font-size: 22px; margin: 24px 0 16px 0;">PHASE 2 — ADD THE SCRIPT</h3>
        <ol style="line-height: 2; font-size: 15px; padding-left: 24px;">
          <li>In your Google Sheet click <strong>Extensions</strong> in the top menu bar</li>
          <li>Click <strong>Apps Script</strong></li>
          <li>A new tab opens with a code editor</li>
          <li>Select all existing code and delete it</li>
          <li>Paste the following script exactly:
            <div style="margin: 12px 0;">
              <button class="btn-primary" onclick="app.copyScriptToClipboard()" style="padding: 12px 24px; font-size: 16px;">📋 Copy Script</button>
            </div>
            <div style="background: #1a1a1a; border: 2px solid var(--color-secondary); padding: 16px; margin: 12px 0; border-radius: 8px; overflow-x: auto;">
              <pre style="color: #FFD700; font-family: monospace; font-size: 13px; margin: 0; white-space: pre-wrap;">${scriptCode}</pre>
            </div>
          </li>
          <li>Click the <strong>floppy disk icon</strong> to Save</li>
          <li>Name the project: <strong style="color: var(--color-secondary);">Tournament Waiver Sync</strong></li>
          <li>Click <strong>OK</strong></li>
        </ol>
        
        <hr style="border: none; border-top: 2px solid var(--color-secondary); margin: 24px 0;">
        
        <h3 style="color: var(--color-secondary); font-size: 22px; margin: 24px 0 16px 0;">PHASE 3 — DEPLOY THE SCRIPT</h3>
        <ol style="line-height: 2; font-size: 15px; padding-left: 24px;">
          <li>Click the <strong>Deploy</strong> button (top right)</li>
          <li>Click <strong>New Deployment</strong></li>
          <li>Click the <strong>gear icon</strong> next to Select Type</li>
          <li>Choose <strong>Web App</strong></li>
          <li>Fill in these settings exactly:
            <ul style="margin: 8px 0; padding-left: 24px;">
              <li><strong>Description:</strong> Tournament Waiver Sync</li>
              <li><strong>Execute As:</strong> Me</li>
              <li><strong>Who Has Access:</strong> Anyone</li>
            </ul>
          </li>
          <li>Click <strong>Deploy</strong></li>
          <li>Click <strong>Authorize Access</strong> if prompted and follow the login steps</li>
          <li>After deploying you will see a URL that starts with <strong style="color: var(--color-secondary);">https://script.google.com</strong></li>
          <li>Copy that entire URL</li>
        </ol>
        
        <hr style="border: none; border-top: 2px solid var(--color-secondary); margin: 24px 0;">
        
        <h3 style="color: var(--color-secondary); font-size: 22px; margin: 24px 0 16px 0;">PHASE 4 — CONNECT TO THIS APP</h3>
        <ol style="line-height: 2; font-size: 15px; padding-left: 24px;">
          <li>Come back to this tournament app</li>
          <li>Open Settings from the menu</li>
          <li>Paste the URL you copied into the Google Sheets URL field</li>
          <li>Click <strong>Save</strong></li>
          <li>Click <strong>Test Connection</strong></li>
          <li>You should see: <strong style="color: #32CD32;">✅ Connected! Legal records will sync automatically.</strong></li>
        </ol>
        <div style="background: rgba(255, 165, 0, 0.1); border: 2px solid #FFA500; padding: 16px; margin: 16px 0; border-radius: 8px;">
          <p style="margin: 0;"><strong>⚠️ If the test fails:</strong> Double check that you set <strong>Who Has Access</strong> to <strong>Anyone</strong> in Phase 3.</p>
        </div>
        
        <hr style="border: none; border-top: 2px solid var(--color-secondary); margin: 24px 0;">
        
        <h3 style="color: var(--color-secondary); font-size: 22px; margin: 24px 0 16px 0;">NEED HELP?</h3>
        <p style="font-size: 15px; line-height: 1.8;">Contact your app administrator for assistance with this setup. This only needs to be done once per tournament year.</p>
        
        <div style="margin-top: 32px; text-align: center;">
          <button class="btn-secondary btn-large" onclick="window.print()" style="display: inline-block;">🖨️ Print Instructions</button>
        </div>
      </div>
    `;
  }
  
  copyScriptToClipboard() {
    const scriptCode = `function doPost(e) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("Sheet1");
  const data = JSON.parse(e.postData.contents);
  sheet.appendRow([
    data.fullName,
    data.email,
    data.timestamp,
    data.ipAddress,
    data.signatureData,
    data.waiverVersion,
    data.hostLocation,
    data.sessionType,
    data.parentGuardianName || ""
  ]);
  return ContentService
    .createTextOutput(
      JSON.stringify({"result":"success"})
    )
    .setMimeType(ContentService.MimeType.JSON);
}`;
    
    navigator.clipboard.writeText(scriptCode).then(() => {
      this.showSuccessMessage('📋 Script copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy. Please manually copy the script from the setup guide.');
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // EXPORT & STATS
  // ═══════════════════════════════════════════════════════════════════
  
  exportCSV() {
    const csv = stateManager.exportToCSV();
    const today = new Date().toISOString().split('T')[0];
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checkin-${today}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    this.showSuccessMessage('CSV exported successfully! 📥');
  }
  
  updateSyncStatus() {
    const indicator = document.getElementById('status-indicator');
    const text = document.getElementById('sync-text');
    
    if (navigator.onLine) {
      indicator.classList.remove('offline');
      const pendingCount = stateManager.getPendingSyncCount();
      text.textContent = pendingCount > 0 ? `🔄 Online - ${pendingCount} pending` : '🟢 Online - Syncing';
    } else {
      indicator.classList.add('offline');
      text.textContent = '🔴 Offline - Saving locally';
    }
  }
  
  updateStats() {
    const stats = stateManager.getStats();
    
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-pending').textContent = stats.pending;
    document.getElementById('stat-walkin').textContent = stats.walkIns;
  }
  
  showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; top: 100px; right: 20px; background: #32CD32; color: #000;
      padding: 16px 24px; border-radius: 8px; font-weight: bold; font-size: 18px;
      z-index: 3000; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
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

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  @keyframes scaleIn {
    from { transform: scale(0.5); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(50, 205, 50, 0.5); }
    50% { box-shadow: 0 0 40px rgba(50, 205, 50, 0.8); }
  }
  .btn-checkin {
    width: 100%; padding: 24px; font-size: 28px; font-weight: bold;
    border-radius: 12px; border: 4px solid; cursor: pointer; transition: all 0.3s;
  }
  .btn-checkin.enabled {
    background: #32CD32; color: #000; border-color: #32CD32;
    animation: pulse-glow 2s infinite;
  }
  .btn-checkin.enabled:hover {
    transform: scale(1.05);
  }
  .btn-checkin.disabled {
    background: #333; color: #666; border-color: #666;
    cursor: not-allowed; opacity: 0.5;
  }
  .grid-button.selected {
    border: 3px solid gold !important;
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.6) !important;
    background: rgba(255, 215, 0, 0.2) !important;
    opacity: 1 !important;
    transition: all 0.2s ease;
  }
  .grid-button:not(.selected) {
    opacity: 0.5;
    transition: all 0.2s ease;
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
