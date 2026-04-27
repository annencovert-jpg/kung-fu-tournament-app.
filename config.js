// White-Label Configuration for Tournament Management App
// Modify this file to customize the app for different schools

// ⚠️ LEGAL COMPLIANCE - REQUIRED BEFORE TOURNAMENT DAY
// Paste Google Apps Script URL here.
// Leave empty to use offline mode only.
// UPDATE THIS EVERY TOURNAMENT YEAR
const GOOGLE_SHEET_WEBAPP_URL = "";

// ============================================================================
// MINDBODY PAYMENT URL - SINGLE SOURCE OF TRUTH
// ============================================================================
// ⚠️ UPDATE THIS EVERY TOURNAMENT — Replace with current Mindbody payment link before each tournament day
const MINDBODY_PAYMENT_URL = "https://clients.mindbodyonline.com/classic/ws?studioid=YOUR_STUDIO_ID";
// ============================================================================

const CONFIG = {
  school: {
    name: "Kung Fu and Tai Chi Tournament Manager",
    locations: [
      { id: "north-austin", name: "North Austin", color: "#FFD700" },
      { id: "south-austin", name: "South Austin", color: "#FFA500" },
      { id: "lakeway", name: "Lakeway", color: "#FF8C00" },
      { id: "georgetown", name: "Georgetown", color: "#FF6347" },
      { id: "san-antonio", name: "San Antonio", color: "#FF4500" },
      { id: "new-orleans", name: "New Orleans", color: "#DC143C" }
    ],
    contactEmail: "info@masterjoes.com",
    contactPhone: "(512) 555-1234"
  },
  
  // Adult session ranks with group mapping
  ranks: [
    { id: "white", name: "White Belt", color: "#FFFFFF", textColor: "#000000", group: 1 },
    { id: "yellow", name: "Yellow Belt", color: "#FFD700", textColor: "#000000", group: 1 },
    { id: "blue", name: "Blue Belt", color: "#1E90FF", textColor: "#FFFFFF", group: 2 },
    { id: "green", name: "Green Belt", color: "#32CD32", textColor: "#000000", group: 2 },
    { id: "brown", name: "Brown Belt", color: "#8B4513", textColor: "#FFFFFF", group: 3 },
    { id: "black-1", name: "1st Black", color: "#000000", textColor: "#FFD700", degree: 1, group: 4 },
    { id: "black-2", name: "2nd-3rd Black", color: "#000000", textColor: "#FFD700", degree: 2, group: 5 }
  ],
  
  // Kids session age groups with group mapping
  ageGroups: [
    { id: "ages-4-6", name: "Ages 4-6", min: 4, max: 6, group: 1 },
    { id: "ages-7-9", name: "Ages 7-9", min: 7, max: 9, group: 2 },
    { id: "ages-10-12", name: "Ages 10-12", min: 10, max: 12, group: 3 },
    { id: "ages-13-17", name: "Ages 13-17", min: 13, max: 17, group: 4 }
  ],
  
  // New gender options with ring preference
  genders: [
    { id: "male", name: "Male", icon: "♂" },
    { id: "female", name: "Female", icon: "♀" },
    { id: "non-binary", name: "Non-Binary", icon: "⚥" },
    { id: "prefer-not-say", name: "Prefer Not to Say", icon: "○" }
  ],
  
  ageBrackets: {
    children: [
      { min: 4, max: 7, name: "4-7 Years" },
      { min: 8, max: 12, name: "8-12 Years" },
      { min: 13, max: 16, name: "13-16 Years" }
    ],
    adults: { min: 17, max: 120, name: "Adults (17+)" }
  },
  
  // Host Location Configuration - Defines tournament host locations
  // This determines which waiver is displayed during registration
  schoolWaivers: {
    north: {
      name: "Austin Kung Fu and Tai Chi",
      address: "8910 Research Blvd, Suite E1, Austin, TX 78758",
      waiverText: `
        <h2>Tournament Waiver - Austin Kung Fu and Tai Chi</h2>
        <p><strong>Host Location:</strong> Austin Kung Fu and Tai Chi<br>
        8910 Research Blvd, Suite E1, Austin, TX 78758</p>
        <p>I, the undersigned, acknowledge that participation in martial arts training and tournament competition involves risks including but not limited to: physical injury, property damage, and other unforeseen hazards.</p>
        <p>I hereby release Austin Kung Fu and Tai Chi, its instructors, staff, and affiliates from any and all liability for injuries or damages that may occur during participation in this tournament.</p>
        <p><strong>Medical Authorization:</strong> I authorize tournament staff to seek emergency medical treatment if necessary.</p>
        <p><strong>Media Release:</strong> I grant permission for photographs and videos taken during the tournament to be used for promotional purposes.</p>
      `
    },
    south: {
      name: "South Austin Kung Fu and Tai Chi",
      address: "5214 Burleson Rd, Suite 211, Austin, TX 78744",
      waiverText: `
        <h2>Tournament Waiver - South Austin Kung Fu and Tai Chi</h2>
        <p><strong>Host Location:</strong> South Austin Kung Fu and Tai Chi<br>
        5214 Burleson Rd, Suite 211, Austin, TX 78744</p>
        <p>I, the undersigned, acknowledge that participation in martial arts training and tournament competition involves risks including but not limited to: physical injury, property damage, and other unforeseen hazards.</p>
        <p>I hereby release South Austin Kung Fu and Tai Chi, its instructors, staff, and affiliates from any and all liability for injuries or damages that may occur during participation in this tournament.</p>
        <p><strong>Medical Authorization:</strong> I authorize tournament staff to seek emergency medical treatment if necessary.</p>
        <p><strong>Media Release:</strong> I grant permission for photographs and videos taken during the tournament to be used for promotional purposes.</p>
      `
    }
  },
  
  // Legacy waivers (kept for backward compatibility with student home locations)
  waivers: {
    "north-austin": `
      <h2>North Austin Location Waiver</h2>
      <p>I, the undersigned, acknowledge that participation in martial arts training and tournament competition involves risks including but not limited to: physical injury, property damage, and other unforeseen hazards.</p>
      <p>I hereby release this location's Kung Fu and Tai Chi Academy, its instructors, staff, and affiliates from any and all liability for injuries or damages that may occur during participation in this tournament.</p>
      <p><strong>Medical Authorization:</strong> I authorize tournament staff to seek emergency medical treatment if necessary.</p>
      <p><strong>Media Release:</strong> I grant permission for photographs and videos taken during the tournament to be used for promotional purposes.</p>
    `,
    "south-austin": `
      <h2>South Austin Location Waiver</h2>
      <p>I, the undersigned, acknowledge that participation in martial arts training and tournament competition involves risks including but not limited to: physical injury, property damage, and other unforeseen hazards.</p>
      <p>I hereby release this location's Kung Fu and Tai Chi Academy, its instructors, staff, and affiliates from any and all liability for injuries or damages that may occur during participation in this tournament.</p>
      <p><strong>Medical Authorization:</strong> I authorize tournament staff to seek emergency medical treatment if necessary.</p>
      <p><strong>Media Release:</strong> I grant permission for photographs and videos taken during the tournament to be used for promotional purposes.</p>
    `,
    "lakeway": `
      <h2>Lakeway Location Waiver</h2>
      <p>I, the undersigned, acknowledge that participation in martial arts training and tournament competition involves risks including but not limited to: physical injury, property damage, and other unforeseen hazards.</p>
      <p>I hereby release this location's Kung Fu and Tai Chi Academy, its instructors, staff, and affiliates from any and all liability for injuries or damages that may occur during participation in this tournament.</p>
      <p><strong>Medical Authorization:</strong> I authorize tournament staff to seek emergency medical treatment if necessary.</p>
      <p><strong>Media Release:</strong> I grant permission for photographs and videos taken during the tournament to be used for promotional purposes.</p>
    `,
    "georgetown": `
      <h2>Georgetown Location Waiver</h2>
      <p>I, the undersigned, acknowledge that participation in martial arts training and tournament competition involves risks including but not limited to: physical injury, property damage, and other unforeseen hazards.</p>
      <p>I hereby release this location's Kung Fu and Tai Chi Academy, its instructors, staff, and affiliates from any and all liability for injuries or damages that may occur during participation in this tournament.</p>
      <p><strong>Medical Authorization:</strong> I authorize tournament staff to seek emergency medical treatment if necessary.</p>
      <p><strong>Media Release:</strong> I grant permission for photographs and videos taken during the tournament to be used for promotional purposes.</p>
    `,
    "san-antonio": `
      <h2>San Antonio Location Waiver</h2>
      <p>I, the undersigned, acknowledge that participation in martial arts training and tournament competition involves risks including but not limited to: physical injury, property damage, and other unforeseen hazards.</p>
      <p>I hereby release this location's Kung Fu and Tai Chi Academy, its instructors, staff, and affiliates from any and all liability for injuries or damages that may occur during participation in this tournament.</p>
      <p><strong>Medical Authorization:</strong> I authorize tournament staff to seek emergency medical treatment if necessary.</p>
      <p><strong>Media Release:</strong> I grant permission for photographs and videos taken during the tournament to be used for promotional purposes.</p>
    `,
    "new-orleans": `
      <h2>New Orleans Location Waiver</h2>
      <p>I, the undersigned, acknowledge that participation in martial arts training and tournament competition involves risks including but not limited to: physical injury, property damage, and other unforeseen hazards.</p>
      <p>I hereby release this location's Kung Fu and Tai Chi Academy, its instructors, staff, and affiliates from any and all liability for injuries or damages that may occur during participation in this tournament.</p>
      <p><strong>Medical Authorization:</strong> I authorize tournament staff to seek emergency medical treatment if necessary.</p>
      <p><strong>Media Release:</strong> I grant permission for photographs and videos taken during the tournament to be used for promotional purposes.</p>
    `
  },
  
  ui: {
    theme: {
      primary: "#000000",      // Black
      secondary: "#FFD700",    // Yellow/Gold
      warning: "#FF0000",      // Red for warnings
      success: "#32CD32",      // Green for success
      background: "#000000",
      text: "#FFD700",
      textInverse: "#000000"
    },
    fontSize: {
      small: "14px",
      medium: "18px",
      large: "24px",
      xlarge: "32px"
    }
  },
  
  sync: {
    apiEndpoint: "/api/sync",  // Configure your backend API endpoint
    syncInterval: 30000,        // Sync every 30 seconds when online
    batchSize: 50               // Number of records to sync at once
  }
};

// Export for use in modules (if using ES6 modules)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
