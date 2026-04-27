// State Manager - Offline-First State Management with localStorage/IndexedDB
// Handles all data persistence and synchronization

class StateManager {
  constructor() {
    this.DB_NAME = 'TournamentDB';
    this.DB_VERSION = 1;
    this.STORAGE_KEY = 'tournament_data';
    this.SYNC_QUEUE_KEY = 'sync_queue';
    this.db = null;
    this.isOnline = navigator.onLine;
    this.masterOverride = false;
    
    // In-memory state
    this.state = {
      students: [],
      checkedIn: [],
      pending: [],
      divisions: {},
      settings: {
        separateByGender: false,
        separateByRank: false,
        tournamentHostLocation: null,  // Tracks which location is hosting the tournament
        sessionType: null,  // 'adult' or 'kids'
        googleSheetsUrl: GOOGLE_SHEET_WEBAPP_URL || ''
      },
      lastSync: null,
      syncQueue: []  // Records pending Google Sheets sync
    };
    
    this.init();
  }
  
  // Initialize IndexedDB and load state
  async init() {
    try {
      await this.initIndexedDB();
      await this.loadState();
      this.setupSyncListeners();
      console.log('StateManager initialized successfully');
    } catch (error) {
      console.warn('IndexedDB not available, falling back to localStorage', error);
      this.loadFromLocalStorage();
    }
  }
  
  // Initialize IndexedDB
  initIndexedDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }
      
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('students')) {
          const studentStore = db.createObjectStore('students', { keyPath: 'id' });
          studentStore.createIndex('name', 'name', { unique: false });
          studentStore.createIndex('status', 'status', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        }
        
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }
  
  // Load state from IndexedDB
  async loadState() {
    if (!this.db) {
      this.loadFromLocalStorage();
      return;
    }
    
    try {
      const transaction = this.db.transaction(['students', 'settings'], 'readonly');
      const studentStore = transaction.objectStore('students');
      const settingsStore = transaction.objectStore('settings');
      
      // Load students
      const studentsRequest = studentStore.getAll();
      studentsRequest.onsuccess = () => {
        this.state.students = studentsRequest.result || [];
        this.categorizeStudents();
      };
      
      // Load settings
      const settingsRequest = settingsStore.get('app_settings');
      settingsRequest.onsuccess = () => {
        if (settingsRequest.result) {
          this.state.settings = { ...this.state.settings, ...settingsRequest.result.value };
        }
      };
      
    } catch (error) {
      console.error('Error loading from IndexedDB:', error);
      this.loadFromLocalStorage();
    }
  }
  
  // Fallback to localStorage
  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.state = { ...this.state, ...JSON.parse(stored) };
        this.categorizeStudents();
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }
  
  // Save state to storage
  async saveState() {
    // Save to IndexedDB
    if (this.db) {
      try {
        const transaction = this.db.transaction(['students', 'settings'], 'readwrite');
        const studentStore = transaction.objectStore('students');
        const settingsStore = transaction.objectStore('settings');
        
        // Clear and save students
        studentStore.clear();
        this.state.students.forEach(student => {
          studentStore.add(student);
        });
        
        // Save settings
        settingsStore.put({
          key: 'app_settings',
          value: this.state.settings
        });
        
      } catch (error) {
        console.error('Error saving to IndexedDB:', error);
      }
    }
    
    // Always save to localStorage as backup
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }
  
  // Categorize students into checked-in and pending
  categorizeStudents() {
    this.state.checkedIn = this.state.students.filter(s => s.status === 'checked-in');
    this.state.pending = this.state.students.filter(s => s.status === 'pending');
  }
  
  // Add a new student
  addStudent(studentData) {
    const student = {
      id: this.generateId(studentData),
      ...studentData,
      timestamp: Date.now(),
      synced: false,
      syncPending: false
    };
    
    this.state.students.push(student);
    this.categorizeStudents();
    this.saveState();
    
    return student;
  }
  
  // Update student
  updateStudent(studentId, updates) {
    const index = this.state.students.findIndex(s => s.id === studentId);
    if (index !== -1) {
      this.state.students[index] = {
        ...this.state.students[index],
        ...updates,
        synced: false
      };
      this.categorizeStudents();
      this.saveState();
      return this.state.students[index];
    }
    return null;
  }
  
  // Check-in student (verify payment and waiver)
  checkInStudent(studentId) {
    const student = this.state.students.find(s => s.id === studentId);
    if (!student) return { success: false, error: 'Student not found' };
    
    // Validation gates (unless master override is enabled)
    if (!this.masterOverride) {
      const errors = [];
      
      if (student.payment_status !== 'paid') {
        errors.push('Payment not received');
      }
      
      if (!student.waiver_signed && !student.signatureData) {
        errors.push('Waiver not signed');
      }
      
      if (errors.length > 0) {
        return {
          success: false,
          error: errors.join(' and '),
          student: student,
          needsPayment: student.payment_status !== 'paid',
          needsWaiver: !student.waiver_signed && !student.signatureData
        };
      }
    }
    
    // Proceed with check-in
    this.updateStudent(studentId, {
      status: 'checked-in',
      check_in_time: new Date().toISOString()
    });
    
    return { success: true, student: student };
  }
  
  // Mark student as absent
  markAbsent(studentId) {
    return this.updateStudent(studentId, {
      status: 'absent',
      absent_time: new Date().toISOString()
    });
  }
  
  // Generate unique ID
  generateId(studentData) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    
    // Walk-in students get WS- prefix
    if (studentData.type === 'walk-in') {
      return `WS-${timestamp}-${random}`;
    }
    
    // Pre-registered students use their existing ID or generate MB- prefix
    return studentData.id || `MB-${timestamp}-${random}`;
  }
  
  // Import students from CSV
  importFromCSV(csvData) {
    const students = this.parseCSV(csvData);
    let imported = 0;
    
    students.forEach(studentData => {
      // Check if student already exists
      const exists = this.state.students.find(s => 
        s.email === studentData.email || 
        (s.first_name === studentData.first_name && s.last_name === studentData.last_name)
      );
      
      if (!exists) {
        this.addStudent({
          ...studentData,
          type: 'pre-registered',
          status: 'pending'
        });
        imported++;
      }
    });
    
    return { imported, total: students.length };
  }
  
  // Parse CSV data
  parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const students = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const student = {};
      
      headers.forEach((header, index) => {
        // Map common Mindbody CSV headers
        const mapping = {
          'first name': 'first_name',
          'last name': 'last_name',
          'email': 'email',
          'phone': 'phone',
          'date of birth': 'dob',
          'birth date': 'dob',
          'rank': 'rank',
          'belt': 'rank',
          'location': 'location',
          'gender': 'gender',
          'payment status': 'payment_status',
          'waiver': 'waiver_signed'
        };
        
        const key = mapping[header] || header.replace(/ /g, '_');
        let value = values[index] || '';
        
        // Process specific fields
        if (key === 'waiver_signed') {
          value = value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
        } else if (key === 'payment_status') {
          value = value.toLowerCase() === 'paid' ? 'paid' : 'pending';
        }
        
        student[key] = value;
      });
      
      // Combine first and last name if needed
      if (student.first_name && student.last_name) {
        student.name = `${student.first_name} ${student.last_name}`;
      }
      
      students.push(student);
    }
    
    return students;
  }
  
  // Search students with fuzzy matching
  searchStudents(query) {
    if (!query || query.length < 2) return [];
    
    const searchTerm = query.toLowerCase();
    
    return this.state.students.filter(student => {
      const name = (student.name || '').toLowerCase();
      const firstName = (student.first_name || '').toLowerCase();
      const lastName = (student.last_name || '').toLowerCase();
      const email = (student.email || '').toLowerCase();
      
      return name.includes(searchTerm) ||
             firstName.includes(searchTerm) ||
             lastName.includes(searchTerm) ||
             email.includes(searchTerm);
    }).sort((a, b) => {
      // Sort by relevance (exact matches first)
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      
      if (aName.startsWith(searchTerm) && !bName.startsWith(searchTerm)) return -1;
      if (!aName.startsWith(searchTerm) && bName.startsWith(searchTerm)) return 1;
      
      return aName.localeCompare(bName);
    });
  }
  
  // Get student by ID
  getStudent(studentId) {
    return this.state.students.find(s => s.id === studentId);
  }
  
  // Get all students
  getAllStudents() {
    return this.state.students;
  }
  
  // Get checked-in students
  getCheckedInStudents() {
    return this.state.checkedIn;
  }
  
  // Get pending students
  getPendingStudents() {
    return this.state.pending;
  }
  
  // Calculate age from DOB
  calculateAge(dob) {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
  
  // Get suggested division for student based on session type
  getSuggestedDivision(student) {
    const sessionType = this.getSessionType();
    
    if (sessionType === 'kids') {
      // Age-based grouping for kids
      const age = this.calculateAge(student.dob);
      if (!age) return 'Unknown';
      
      if (age >= 4 && age <= 6) return 'Ages 4-6';
      if (age >= 7 && age <= 9) return 'Ages 7-9';
      if (age >= 10 && age <= 12) return 'Ages 10-12';
      if (age >= 13 && age <= 17) return 'Ages 13-17';
      
      return 'Unknown';
    } else {
      // Rank-based grouping for adults
      const rank = student.rank || 'Unknown';
      return rank;
    }
  }
  
  // Generate divisions based on checked-in students
  generateDivisions() {
    const divisions = {};
    const { separateByGender, separateByRank } = this.state.settings;
    const sessionType = this.getSessionType();
    
    this.state.checkedIn.forEach(student => {
      const age = this.calculateAge(student.dob);
      let divisionKey = '';
      
      if (sessionType === 'kids') {
        // Kids session: age-based groups
        const ageBracket = this.getSuggestedDivision(student);
        divisionKey = ageBracket;
      } else {
        // Adult session: rank-based groups
        const rank = student.rank || 'Unknown';
        divisionKey = rank;
        
        if (separateByRank) {
          // Further subdivide by specific rank
          divisionKey = rank;
        }
      }
      
      if (separateByGender && student.ringPreference) {
        divisionKey += ` - ${student.ringPreference.charAt(0).toUpperCase() + student.ringPreference.slice(1)}`;
      }
      
      if (!divisions[divisionKey]) {
        divisions[divisionKey] = [];
      }
      
      divisions[divisionKey].push(student);
    });
    
    this.state.divisions = divisions;
    return divisions;
  }
  
  // Update settings
  updateSettings(settings) {
    this.state.settings = { ...this.state.settings, ...settings };
    this.saveState();
  }
  
  // Set tournament host location
  setTournamentHostLocation(hostLocation) {
    this.state.settings.tournamentHostLocation = hostLocation;
    this.saveState();
    return hostLocation;
  }
  
  // Get tournament host location
  getTournamentHostLocation() {
    return this.state.settings.tournamentHostLocation;
  }
  
  // Set session type (adult or kids)
  setSessionType(sessionType) {
    this.state.settings.sessionType = sessionType;
    this.saveState();
    return sessionType;
  }
  
  // Get session type
  getSessionType() {
    return this.state.settings.sessionType;
  }
  
  // Set Google Sheets URL
  setGoogleSheetsUrl(url) {
    this.state.settings.googleSheetsUrl = url;
    this.saveState();
    return url;
  }
  
  // Get Google Sheets URL
  getGoogleSheetsUrl() {
    return this.state.settings.googleSheetsUrl || GOOGLE_SHEET_WEBAPP_URL || '';
  }
  
  // Sync waiver to Google Sheets
  async syncWaiverToGoogleSheets(student) {
    const sheetsUrl = this.getGoogleSheetsUrl();
    
    if (!sheetsUrl) {
      console.log('No Google Sheets URL configured, skipping sync');
      student.syncPending = true;
      this.updateStudent(student.id, { syncPending: true });
      return { success: false, offline: true };
    }
    
    if (!navigator.onLine) {
      console.log('Offline, queuing waiver for sync');
      student.syncPending = true;
      this.updateStudent(student.id, { syncPending: true });
      this.state.syncQueue.push(student.id);
      this.saveState();
      return { success: false, offline: true };
    }
    
    try {
      const hostLocation = this.getTournamentHostLocation();
      const hostConfig = CONFIG.schoolWaivers[hostLocation];
      const sessionType = this.getSessionType();
      
      const syncData = {
        fullName: student.name || `${student.first_name} ${student.last_name}`,
        email: student.email || '',
        timestamp: student.waiver_timestamp || new Date().toISOString(),
        ipAddress: '', // Could be captured client-side if needed
        signatureData: student.signatureData || '',
        waiverVersion: hostConfig ? hostConfig.waiverText : '',
        hostLocation: hostConfig ? hostConfig.name : '',
        sessionType: sessionType || 'unknown',
        parentGuardianName: student.parentGuardianName || ''
      };
      
      const response = await fetch(sheetsUrl, {
        method: 'POST',
        mode: 'no-cors', // Google Apps Script requires this
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(syncData)
      });
      
      // Note: With no-cors mode, we can't read the response
      // Assume success if no error thrown
      this.updateStudent(student.id, { 
        syncPending: false,
        syncedAt: new Date().toISOString()
      });
      
      // Remove from sync queue if present
      this.state.syncQueue = this.state.syncQueue.filter(id => id !== student.id);
      this.saveState();
      
      return { success: true };
      
    } catch (error) {
      console.error('Google Sheets sync failed:', error);
      this.updateStudent(student.id, { syncPending: true });
      this.state.syncQueue.push(student.id);
      this.saveState();
      return { success: false, error: error.message };
    }
  }
  
  // Retry pending syncs
  async retryPendingSyncs() {
    if (!navigator.onLine) {
      return { success: false, message: 'Still offline' };
    }
    
    const pendingIds = [...this.state.syncQueue];
    let synced = 0;
    let failed = 0;
    
    for (const studentId of pendingIds) {
      const student = this.getStudent(studentId);
      if (student && student.syncPending) {
        const result = await this.syncWaiverToGoogleSheets(student);
        if (result.success) {
          synced++;
        } else {
          failed++;
        }
      }
    }
    
    return { success: true, synced, failed, total: pendingIds.length };
  }
  
  // Get pending sync count
  getPendingSyncCount() {
    return this.state.students.filter(s => s.syncPending === true).length;
  }
  
  // Toggle master override
  toggleMasterOverride() {
    this.masterOverride = !this.masterOverride;
    return this.masterOverride;
  }
  
  // Get master override status
  getMasterOverride() {
    return this.masterOverride;
  }
  
  // Setup sync listeners
  setupSyncListeners() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      // Auto-retry pending syncs when coming back online
      setTimeout(() => {
        this.retryPendingSyncs();
      }, 1000);
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }
  
  // Get statistics
  getStats() {
    return {
      total: this.state.checkedIn.length,
      pending: this.state.pending.length,
      walkIns: this.state.students.filter(s => s.type === 'walk-in').length,
      preRegistered: this.state.students.filter(s => s.type === 'pre-registered').length,
      syncPending: this.getPendingSyncCount()
    };
  }
  
  // Export data as CSV with all legal and operational fields
  exportToCSV() {
    const sessionType = this.getSessionType();
    
    const headers = [
      'Full Name', 'Email', 'DOB', 'Phone', 
      sessionType === 'kids' ? 'Age Group' : 'Rank',
      'Ring Preference', 'School Location', 
      'Payment Status', 'Payment Method',
      'Walk-In or Pre-Registered',
      'Current Group', 'Original Registration Group',
      'Signature Timestamp', 'Waiver Version', 'Host Location',
      'Session Type', 'Parent/Guardian Name',
      'Sync Status', 'IP Address'
    ];
    
    const rows = this.state.students.map(s => [
      s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim(),
      s.email || '',
      s.dob || '',
      s.phone || '',
      sessionType === 'kids' ? (s.ageGroup || '') : (s.rank || ''),
      s.ringPreference || '',
      s.location || '',
      s.payment_status || 'pending',
      s.paymentMethod || '',
      s.type === 'walk-in' ? 'Walk-In' : 'Pre-Registered',
      s.currentGroup || '',
      s.originalRegistrationGroup || '',
      s.waiver_timestamp || '',
      s.waiverVersion || '',
      s.waiver_location_name || '',
      sessionType || '',
      s.parentGuardianName || '',
      s.syncPending ? 'Pending' : (s.syncedAt ? 'Synced' : 'Not Synced'),
      s.ipAddress || ''
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    return csv;
  }
  
  // Clear all data (for testing/reset)
  clearAllData() {
    this.state = {
      students: [],
      checkedIn: [],
      pending: [],
      divisions: {},
      settings: {
        separateByGender: false,
        separateByRank: false,
        tournamentHostLocation: null,
        sessionType: null,
        googleSheetsUrl: GOOGLE_SHEET_WEBAPP_URL || ''
      },
      lastSync: null,
      syncQueue: []
    };
    
    if (this.db) {
      const transaction = this.db.transaction(['students', 'sync_queue', 'settings'], 'readwrite');
      transaction.objectStore('students').clear();
      transaction.objectStore('sync_queue').clear();
      transaction.objectStore('settings').clear();
    }
    
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.SYNC_QUEUE_KEY);
  }
}

// Create global instance
const stateManager = new StateManager();
