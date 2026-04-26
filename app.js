// Tournament Registrar Dashboard - Volunteer-Friendly 5-Step Flow
// Complete rebuild with PIN protection, signature pads, and export features

class TournamentApp {
  constructor() {
    this.currentStudent = null;
    this.signaturePad = null;
    this.qrCode = null;
    this.waiverPollInterval = null;
    this.PIN_CODE = '1234';
    
    this.init();
  }
  
  init() {
    // Check if host location is selected, if not show startup screen
    if (!stateManager.getTournamentHostLocation()) {
      this.showHostLocationStartup();
    } else {
      this.initDashboard();
    }
  }
  
  initDashboard() {
    this.loadSchoolName();
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
    
    console.log('Tournament App initialized');
  }
  
  // 1. HOST LOCATION STARTUP SCREEN
  showHostLocationStartup() {
    const modal = document.getElementById('modal-host-selection');
    if (!modal) return;
    
    modal.style.display = 'flex';
  }
  
  selectHostLocation(location) {
    const hostConfig = CONFIG.schoolWaivers[location];
    if (!hostConfig) return;
    
    // Show confirmation screen
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
        <button class="btn-primary btn-large" style="flex: 2;" onclick="app.confirmHostLocation('${location}')">✓ Yes, Begin Tournament</button>
      </div>
    `;
  }
  
  confirmHostLocation(location) {
    stateManager.setTournamentHostLocation(location);
    document.getElementById('modal-host-selection').style.display = 'none';
    this.initDashboard();
    this.showSuccessMessage(`Tournament host set to: ${CONFIG.schoolWaivers[location].name}`);
  }
  
  changeHostLocation() {
    const pin = prompt('Enter PIN to change host location:');
    if (pin === this.PIN_CODE) {
      this.showHostLocationStartup();
    } else if (pin !== null) {
      alert('Incorrect PIN');
    }
  }
  
  // Load school name and display host location
  loadSchoolName() {
    const hostLocation = stateManager.getTournamentHostLocation();
    const hostConfig = hostLocation ? CONFIG.schoolWaivers[hostLocation] : null;
    const hostText = hostConfig ? ` - <span style="font-size: 24px; color: #FFA500;">Hosted by ${hostConfig.name}</span>` : '';
    
    document.getElementById('school-name').innerHTML = 
      `<span class="font-bold">Kung Fu and Tai Chi</span> <span class="font-light">Tournament Manager</span>${hostText}`;
  }
  
  // Setup all event listeners
  setupEventListeners() {
    // Main search (Step 1)
    document.getElementById('main-search-input').addEventListener('input', (e) => this.handleMainSearch(e.target.value));
    
    // Left panel buttons
    document.getElementById('btn-walk-in').addEventListener('click', () => this.showWalkInForm());
    document.getElementById('btn-new-session').addEventListener('click', () => this.startNewSession());
    document.getElementById('btn-export-csv').addEventListener('click', () => this.exportCSV());
    document.getElementById('btn-change-host').addEventListener('click', () => this.changeHostLocation());
    
    // Division controls
    document.getElementById('btn-view-divisions').addEventListener('click', () => this.showDivisions());
    document.getElementById('btn-print-lists').addEventListener('click', () => this.printLists());
    
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
    
    // Build walk-in form grids
    this.buildWalkInForm();
  }
  
  // Build walk-in form button grids
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
  
  selectRank(rankId) {
    document.getElementById('walkin-rank').value = rankId;
    document.querySelectorAll('#rank-grid .grid-button').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.rankId === rankId);
    });
  }
  
  selectLocation(locationId) {
    document.getElementById('walkin-location').value = locationId;
    document.querySelectorAll('#location-grid .grid-button').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.locationId === locationId);
    });
  }
  
  selectGender(genderId) {
    document.getElementById('walkin-gender').value = genderId;
    document.querySelectorAll('#gender-grid .grid-button').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.genderId === genderId);
    });
  }
  
  // 2. VOLUNTEER-FRIENDLY 5-STEP FLOW
  
  // STEP 1 - SEARCH
  handleMainSearch(query) {
    const results = stateManager.searchStudents(query);
    this.renderSearchResults(results);
  }
  
  renderSearchResults(results) {
    const container = document.getElementById('search-results');
    
    if (results.length === 0) {
      container.innerHTML = '<p style="padding: 16px; text-align: center; opacity: 0.6;">No students found</p>';
      return;
    }
    
    container.innerHTML = results.map(student => `
      <div class="search-result-item" onclick="app.reviewStudent('${student.id}')">
        <strong>${student.name || `${student.first_name} ${student.last_name}`}</strong>
        <div style="font-size: 14px; opacity: 0.8;">
          ${student.rank || 'Unknown Rank'} | ${student.location || 'Unknown Location'}
        </div>
      </div>
    `).join('');
  }
  
  // STEP 2 - REVIEW Student Info
  reviewStudent(studentId) {
    const student = stateManager.getStudent(studentId);
    if (!student) return;
    
    this.currentStudent = student;
    this.show5StepVerificationModal(student);
  }
  
  // Show the 5-Step Verification Modal
  show5StepVerificationModal(student) {
    const modal = document.getElementById('modal-verify');
    const content = document.getElementById('verify-content');
    
    const hasWaiver = student.waiver_signed === true || student.signatureData;
    const hasPayment = student.payment_status === 'paid';
    
    const waiverIcon = hasWaiver ? '✅' : '❌';
    const paymentIcon = hasPayment ? '✅' : '❌';
    const waiverColor = hasWaiver ? '#32CD32' : '#FF0000';
    const paymentColor = hasPayment ? '#32CD32' : '#FF0000';
    
    const age = student.dob ? stateManager.calculateAge(student.dob) : 'Unknown';
    
    content.innerHTML = `
      <div style="background: rgba(255, 215, 0, 0.1); border: 3px solid var(--color-secondary); border-radius: 12px; padding: 24px; margin-bottom: 16px; text-align: center;">
        <p style="font-size: 16px; margin-bottom: 8px; opacity: 0.8;">STEP 2 - REVIEW</p>
        <h3 style="font-size: 32px; margin-bottom: 8px; color: var(--color-secondary);">${student.name || `${student.first_name} ${student.last_name}`}</h3>
        <p style="font-size: 18px; opacity: 0.9;">
          ${student.rank || 'Unknown Rank'} | Age: ${age} | ${student.location || 'Unknown Location'}
        </p>
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
          <button class="btn-secondary" style="margin-top: 8px; padding: 8px 16px; font-size: 14px;" onclick="app.resetWaiver('${student.id}')">🔄 Reset Waiver</button>
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
        ${!hasPayment ? `
          <div style="background: rgba(255, 215, 0, 0.1); border: 2px solid var(--color-secondary); border-radius: 8px; padding: 16px; margin-top: 12px;">
            <p style="font-weight: bold; margin-bottom: 12px;">Choose payment option:</p>
            
            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 2px solid var(--color-secondary); border-radius: 8px; cursor: pointer; margin-bottom: 8px; background: rgba(255, 215, 0, 0.05);">
              <input type="radio" name="payment-option-${student.id}" value="already-paid" style="width: 24px; height: 24px;">
              <div>
                <strong style="font-size: 16px;">Option A — ✅ Already Paid</strong>
                <p style="font-size: 12px; opacity: 0.8; margin-top: 4px;">Check to confirm pre-payment received</p>
              </div>
            </label>
            
            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 2px solid var(--color-secondary); border-radius: 8px; cursor: pointer; margin-bottom: 8px; background: rgba(255, 215, 0, 0.05);">
              <input type="radio" name="payment-option-${student.id}" value="pay-now" style="width: 24px; height: 24px;">
              <div>
                <strong style="font-size: 16px;">Option B — 💳 Pay Now via Mindbody</strong>
                <p style="font-size: 12px; opacity: 0.8; margin-top: 4px;">Opens payment link in new tab</p>
              </div>
            </label>
            
            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 2px solid var(--color-secondary); border-radius: 8px; cursor: pointer; background: rgba(255, 215, 0, 0.05);">
              <input type="radio" name="payment-option-${student.id}" value="cash" style="width: 24px; height: 24px;">
              <div>
                <strong style="font-size: 16px;">Option C — 💵 Cash Payment</strong>
                <p style="font-size: 12px; opacity: 0.8; margin-top: 4px;">Manual override for cash payments</p>
              </div>
            </label>
            
            <button class="btn-primary" style="width: 100%; margin-top: 12px;" onclick="app.processPayment('${student.id}')">Confirm Payment</button>
          </div>
        ` : ''}
      </div>
      
      <!-- STEP 5 - CHECK IN -->
      <div style="text-align: center; margin-top: 24px;">
        <p style="font-size: 14px; opacity: 0.7; margin-bottom: 8px;">STEP 5 - CHECK IN</p>
        <button class="btn-checkin ${hasWaiver && hasPayment ? 'enabled' : 'disabled'}" id="btn-final-checkin" ${hasWaiver && hasPayment ? '' : 'disabled'} onclick="app.finalCheckIn('${student.id}')">
          ✓ CHECK IN STUDENT
        </button>
      </div>
      
      <div style="display: flex; gap: 12px; margin-top: 16px;">
        <button class="btn-secondary" onclick="app.hideVerifyModal()">Cancel</button>
      </div>
    `;
    
    modal.style.display = 'flex';
    
    // Listen for payment option changes
    setTimeout(() => {
      const radios = document.querySelectorAll(`input[name="payment-option-${student.id}"]`);
      radios.forEach(radio => {
        radio.addEventListener('change', () => {
          if (radio.value === 'pay-now') {
            window.open(MINDBODY_PAYMENT_URL, '_blank');
          }
        });
      });
    }, 100);
  }
  
  // STEP 3 - WAIVER (QR Code Option)
  showQRWaiver(studentId) {
    const modal = document.getElementById('modal-qr-waiver');
    const container = document.getElementById('qr-waiver-container');
    const student = stateManager.getStudent(studentId);
    
    // Clear previous QR code
    container.innerHTML = '';
    
    const hostLocation = stateManager.getTournamentHostLocation();
    const waiverURL = `${window.location.origin}${window.location.pathname.replace('index.html', '')}waiver.html?location=${hostLocation}&studentId=${studentId}`;
    
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
    
    // Poll for waiver completion
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
  
  // STEP 3 - WAIVER (Tablet Signing Option)
  enterWaiverSignMode(studentId) {
    const student = stateManager.getStudent(studentId);
    if (!student) return;
    
    // Hide verification modal
    document.getElementById('modal-verify').style.display = 'none';
    
    // Show waiver signing modal
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
    
    // Initialize signature pad
    setTimeout(() => {
      const canvas = document.getElementById('signature-canvas-tablet');
      this.signaturePad = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'black',
        minWidth: 1.5,
        maxWidth: 3
      });
      
      // Resize canvas
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
  
  completeTabletSignature(studentId) {
    if (!this.signaturePad) return;
    
    if (this.signaturePad.isEmpty()) {
      alert('Please sign before continuing');
      return;
    }
    
    // Get signature data URL (Base64)
    const signatureData = this.signaturePad.toDataURL();
    
    // Update student record with signature
    stateManager.updateStudent(studentId, {
      waiver_signed: true,
      signatureData: signatureData,
      waiver_timestamp: new Date().toISOString()
    });
    
    // Exit waiver sign mode and return to verification
    this.exitWaiverSignMode();
    
    const student = stateManager.getStudent(studentId);
    this.show5StepVerificationModal(student);
    this.showSuccessMessage('Signature saved! ✅');
  }
  
  exitWaiverSignMode() {
    document.getElementById('modal-waiver-sign').style.display = 'none';
    this.signaturePad = null;
  }
  
  // Reset Waiver
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
  
  // STEP 4 - PAYMENT Processing
  processPayment(studentId) {
    const selectedOption = document.querySelector(`input[name="payment-option-${studentId}"]:checked`);
    
    if (!selectedOption) {
      alert('Please select a payment option');
      return;
    }
    
    const option = selectedOption.value;
    
    if (option === 'already-paid' || option === 'cash') {
      // Mark as paid immediately
      stateManager.updateStudent(studentId, {
        payment_status: 'paid',
        payment_method: option === 'cash' ? 'cash' : 'pre-paid',
        payment_timestamp: new Date().toISOString()
      });
      
      const student = stateManager.getStudent(studentId);
      this.show5StepVerificationModal(student);
      this.showSuccessMessage('Payment confirmed! ✅');
    } else if (option === 'pay-now') {
      // Option to mark paid after Mindbody payment
      if (confirm('Has the student completed payment in Mindbody?')) {
        stateManager.updateStudent(studentId, {
          payment_status: 'paid',
          payment_method: 'mindbody',
          payment_timestamp: new Date().toISOString()
        });
        
        const student = stateManager.getStudent(studentId);
        this.show5StepVerificationModal(student);
        this.showSuccessMessage('Payment confirmed! ✅');
      }
    }
  }
  
  // STEP 5 - FINAL CHECK IN
  finalCheckIn(studentId) {
    const result = stateManager.checkInStudent(studentId);
    
    if (result.success) {
      this.hideVerifyModal();
      
      // Show success animation
      this.showCheckInSuccess(result.student);
      
      this.updateStats();
      this.renderPendingQueue();
      
      // Clear search
      document.getElementById('main-search-input').value = '';
      document.getElementById('search-results').innerHTML = '';
    } else {
      alert('Unable to check in: ' + result.error);
    }
  }
  
  showCheckInSuccess(student) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 255, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 5000;
      animation: fadeIn 0.3s ease-out;
    `;
    
    const successBox = document.createElement('div');
    successBox.style.cssText = `
      background: #32CD32;
      color: #000;
      padding: 48px;
      border-radius: 24px;
      text-align: center;
      font-size: 48px;
      font-weight: bold;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      animation: scaleIn 0.3s ease-out;
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
  
  // 4. WALK-IN REGISTRATION
  showWalkInForm() {
    document.getElementById('walk-in-form').reset();
    document.querySelectorAll('.grid-button').forEach(btn => btn.classList.remove('selected'));
    document.getElementById('modal-walk-in').style.display = 'flex';
  }
  
  hideWalkInForm() {
    document.getElementById('modal-walk-in').style.display = 'none';
  }
  
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
      waiver_signed: false,
      waiver_location: hostLocation,
      waiver_location_name: hostConfig ? hostConfig.name : 'Unknown',
      payment_status: 'pending',
      type: 'walk-in',
      status: 'pending'
    };
    
    // Split name
    const nameParts = formData.name.split(' ');
    formData.first_name = nameParts[0];
    formData.last_name = nameParts.slice(1).join(' ');
    
    // Add student
    const student = stateManager.addStudent(formData);
    
    this.hideWalkInForm();
    this.showSuccessMessage(`Walk-in student ${formData.name} added!`);
    
    // Immediately enter 5-step flow for this student
    this.show5StepVerificationModal(student);
  }
  
  // 7. PENDING VERIFICATION QUEUE
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
          ${student.waiver_signed ? '✅' : '❌'} Waiver
        </div>
      </div>
    `).join('');
  }
  
  // 8. NEW SESSION BUTTON
  startNewSession() {
    const pin = prompt('Enter PIN to start new session:');
    if (pin !== this.PIN_CODE) {
      if (pin !== null) alert('Incorrect PIN');
      return;
    }
    
    if (confirm('This will clear all morning check-ins. Are you sure?\n\nClick OK to Start Afternoon Session')) {
      // Clear checked-in status but keep student records
      const students = stateManager.getAllStudents();
      students.forEach(student => {
        if (student.status === 'checked-in') {
          stateManager.updateStudent(student.id, {
            status: 'pending',
            check_in_time: null
          });
        }
      });
      
      this.updateStats();
      this.renderPendingQueue();
      this.showSuccessMessage('Afternoon Session Started ✅');
    }
  }
  
  // 9. EXPORT CSV BUTTON
  exportCSV() {
    const students = stateManager.getAllStudents();
    
    const headers = ['Name', 'DOB', 'Rank', 'Gender', 'Location', 'Payment Status', 'Waiver Signed', 'Type'];
    const rows = students.map(s => [
      s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim(),
      s.dob || '',
      s.rank || '',
      s.gender || '',
      s.location || '',
      s.payment_status || 'pending',
      s.waiver_signed ? 'Yes' : 'No',
      s.type === 'walk-in' ? 'Walk-In' : 'Pre-Registered'
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
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
  
  hideDivisions() {
    document.getElementById('modal-divisions').style.display = 'none';
  }
  
  printLists() {
    window.print();
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
  
  // Show success message
  showSuccessMessage(message) {
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

// Add CSS animations
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
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  @keyframes scaleIn {
    from {
      transform: scale(0.5);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
  
  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 20px rgba(50, 205, 50, 0.5);
    }
    50% {
      box-shadow: 0 0 40px rgba(50, 205, 50, 0.8);
    }
  }
  
  .btn-checkin {
    width: 100%;
    padding: 24px;
    font-size: 28px;
    font-weight: bold;
    border-radius: 12px;
    border: 4px solid;
    cursor: pointer;
    transition: all 0.3s;
  }
  
  .btn-checkin.enabled {
    background: #32CD32;
    color: #000;
    border-color: #32CD32;
    animation: pulse-glow 2s infinite;
  }
  
  .btn-checkin.enabled:hover {
    transform: scale(1.05);
  }
  
  .btn-checkin.disabled {
    background: #333;
    color: #666;
    border-color: #666;
    cursor: not-allowed;
    opacity: 0.5;
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
