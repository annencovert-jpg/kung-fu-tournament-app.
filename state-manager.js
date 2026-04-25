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
        separateByGender: true,
        separateByRank: true
      },
      lastSync: null
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
          this.state.settings = settingsRequest.result.value;
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
        this.state = JSON.parse(stored);
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
    
    // Add to sync queue if online
    if (this.isOnline) {
      this.scheduleSyncst();
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
      synced: false
    };
    
    this.state.students.push(student);
    this.categorizeStudents();
    this.saveState();
    this.addToSyncQueue('add', student);
    
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
      this.addToSyncQueue('update', this.state.students[index]);
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
      
      if (!student.waiver_signed) {
        errors.push('Waiver not signed');
      }
      
      if (errors.length > 0) {
        return {
          success: false,
          error: errors.join(' and '),
          student: student,
          needsPayment: student.payment_status !== 'paid',
          needsWaiver: !student.waiver_signed
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
  
  // Get suggested division for student
  getSuggestedDivision(student) {
    const age = this.calculateAge(student.dob);
    if (!age) return 'Unknown';
    
    // Age brackets from config
    if (age >= 4 && age <= 7) return '4-7 Years';
    if (age >= 8 && age <= 12) return '8-12 Years';
    if (age >= 13 && age <= 16) return '13-16 Years';
    if (age >= 17) return 'Adults';
    
    return 'Unknown';
  }
  
  // Generate divisions based on checked-in students
  generateDivisions() {
    const divisions = {};
    const { separateByGender, separateByRank } = this.state.settings;
    
    this.state.checkedIn.forEach(student => {
      const age = this.calculateAge(student.dob);
      const ageBracket = this.getSuggestedDivision(student);
      const rank = student.rank || 'Unknown';
      const gender = student.gender || 'neutral';
      
      // Build division key
      let divisionKey = ageBracket;
      
      if (separateByRank && rank !== 'Unknown') {
        divisionKey += ` - ${rank}`;
      }
      
      if (separateByGender && gender !== 'neutral') {
        divisionKey += ` - ${gender.charAt(0).toUpperCase() + gender.slice(1)}`;
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
  
  // Toggle master override
  toggleMasterOverride() {
    this.masterOverride = !this.masterOverride;
    return this.masterOverride;
  }
  
  // Get master override status
  getMasterOverride() {
    return this.masterOverride;
  }
  
  // Add to sync queue
  addToSyncQueue(action, data) {
    if (!this.db) {
      // Use localStorage for sync queue
      try {
        const queue = JSON.parse(localStorage.getItem(this.SYNC_QUEUE_KEY) || '[]');
        queue.push({
          action,
          data,
          timestamp: Date.now()
        });
        localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue));
      } catch (error) {
        console.error('Error adding to sync queue:', error);
      }
      return;
    }
    
    try {
      const transaction = this.db.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      store.add({
        action,
        data,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error adding to sync queue:', error);
    }
  }
  
  // Setup sync listeners
  setupSyncListeners() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.sync();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
    
    // Periodic sync when online
    if (this.isOnline) {
      setInterval(() => {
        if (this.isOnline) {
          this.sync();
        }
      }, CONFIG.sync.syncInterval || 30000);
    }
  }
  
  // Sync with server
  async sync() {
    if (!this.isOnline) return;
    
    try {
      // Get sync queue
      let queue = [];
      if (this.db) {
        const transaction = this.db.transaction(['sync_queue'], 'readonly');
        const store = transaction.objectStore('sync_queue');
        const request = store.getAll();
        request.onsuccess = () => {
          queue = request.result;
        };
      } else {
        queue = JSON.parse(localStorage.getItem(this.SYNC_QUEUE_KEY) || '[]');
      }
      
      if (queue.length === 0) return;
      
      // Send to server (implement your API call here)
      const response = await fetch(CONFIG.sync.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue })
      });
      
      if (response.ok) {
        // Clear sync queue on success
        if (this.db) {
          const transaction = this.db.transaction(['sync_queue'], 'readwrite');
          const store = transaction.objectStore('sync_queue');
          store.clear();
        } else {
          localStorage.removeItem(this.SYNC_QUEUE_KEY);
        }
        
        this.state.lastSync = new Date().toISOString();
        console.log('Sync completed successfully');
      }
      
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
  
  // Get statistics
  getStats() {
    return {
      total: this.state.checkedIn.length,
      pending: this.state.pending.length,
      walkIns: this.state.students.filter(s => s.type === 'walk-in').length,
      preRegistered: this.state.students.filter(s => s.type === 'pre-registered').length
    };
  }
  
  // Export data as CSV
  exportToCSV() {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Rank', 'Location', 'Gender', 'DOB', 'Status', 'Check-In Time'];
    const rows = this.state.checkedIn.map(s => [
      s.id,
      s.name || `${s.first_name} ${s.last_name}`,
      s.email || '',
      s.phone || '',
      s.rank || '',
      s.location || '',
      s.gender || '',
      s.dob || '',
      s.status || '',
      s.check_in_time || ''
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
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
        separateByGender: true,
        separateByRank: true
      },
      lastSync: null
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
