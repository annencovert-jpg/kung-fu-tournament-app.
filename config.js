// White-Label Configuration for Tournament Management App
// Modify this file to customize the app for different schools

const CONFIG = {
  school: {
    name: "Master Joe's Kung Fu Academy",
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
  
  ranks: [
    { id: "white", name: "White Belt", color: "#FFFFFF", textColor: "#000000" },
    { id: "yellow", name: "Yellow Belt", color: "#FFD700", textColor: "#000000" },
    { id: "green", name: "Green Belt", color: "#32CD32", textColor: "#000000" },
    { id: "blue", name: "Blue Belt", color: "#1E90FF", textColor: "#FFFFFF" },
    { id: "brown", name: "Brown Belt", color: "#8B4513", textColor: "#FFFFFF" },
    { id: "black", name: "Black Belt", color: "#000000", textColor: "#FFD700" },
    { id: "black-1", name: "1st Degree Black", color: "#000000", textColor: "#FFD700", degree: 1 },
    { id: "black-2", name: "2nd Degree Black", color: "#000000", textColor: "#FFD700", degree: 2 },
    { id: "black-3", name: "3rd Degree Black", color: "#000000", textColor: "#FFD700", degree: 3 }
  ],
  
  genders: [
    { id: "male", name: "Male", icon: "♂" },
    { id: "female", name: "Female", icon: "♀" },
    { id: "neutral", name: "Neutral/Other", icon: "⚥" }
  ],
  
  ageBrackets: {
    children: [
      { min: 4, max: 7, name: "4-7 Years" },
      { min: 8, max: 12, name: "8-12 Years" },
      { min: 13, max: 16, name: "13-16 Years" }
    ],
    adults: { min: 17, max: 120, name: "Adults (17+)" }
  },
  
  waivers: {
    "north-austin": `
      <h2>North Austin Location Waiver</h2>
      <p>I, the undersigned, acknowledge that participation in martial arts training and tournament competition involves risks including but not limited to: physical injury, property damage, and other unforeseen hazards.</p>
      <p>I hereby release Master Joe's Kung Fu Academy - North Austin Location, its instructors, staff, and affiliates from any and all liability for injuries or damages that may occur during participation in this tournament.</p>
      <p><strong>Medical Authorization:</strong> I authorize tournament staff to seek emergency medical treatment if necessary.</p>
      <p><strong>Media Release:</strong> I grant permission for photographs and videos taken during the tournament to be used for promotional purposes.</p>
    `,
    "south-austin": `
      <h2>South Austin Location Waiver</h2>
      <p>I, the undersigned, acknowledge that participation in martial arts training and tournament competition involves risks including but not limited to: physical injury, property damage, and other unforeseen hazards.</p>
      <p>I hereby release Master Joe's Kung Fu Academy - South Austin Location, its instructors, staff, and affiliates from any and all liability for injuries or damages that may occur during participation in this tournament.</p>
      <p><strong>Medical Authorization:</strong> I authorize tournament staff to seek emergency medical treatment if necessary.</p>
      <p><strong>Media Release:</strong> I grant permission for photographs and videos taken during the tournament to be used for promotional purposes.</p>
    `,
    "lakeway": `
      <h2>Lakeway Location Waiver</h2>
      <p>I, the undersigned, acknowledge that participation in martial arts training and tournament competition involves risks including but not limited to: physical injury, property damage, and other unforeseen hazards.</p>
      <p>I hereby release Master Joe's Kung Fu Academy - Lakeway Location, its instructors, staff, and affiliates from any and all liability for injuries or damages that may occur during participation in this tournament.</p>
      <p><strong>Medical Authorization:</strong> I authorize tournament staff to seek emergency medical treatment if necessary.</p>
      <p><strong>Media Release:</strong> I grant permission for photographs and videos taken during the tournament to be used for promotional purposes.</p>
    `,
    "georgetown": `
      <h2>Georgetown Location Waiver</h2>
      <p>I, the undersigned, acknowledge that participation in martial arts training and tournament competition involves risks including but not limited to: physical injury, property damage, and other unforeseen hazards.</p>
      <p>I hereby release Master Joe's Kung Fu Academy - Georgetown Location, its instructors, staff, and affiliates from any and all liability for injuries or damages that may occur during participation in this tournament.</p>
      <p><strong>Medical Authorization:</strong> I authorize tournament staff to seek emergency medical treatment if necessary.</p>
      <p><strong>Media Release:</strong> I grant permission for photographs and videos taken during the tournament to be used for promotional purposes.</p>
    `,
    "san-antonio": `
      <h2>San Antonio Location Waiver</h2>
      <p>I, the undersigned, acknowledge that participation in martial arts training and tournament competition involves risks including but not limited to: physical injury, property damage, and other unforeseen hazards.</p>
      <p>I hereby release Master Joe's Kung Fu Academy - San Antonio Location, its instructors, staff, and affiliates from any and all liability for injuries or damages that may occur during participation in this tournament.</p>
      <p><strong>Medical Authorization:</strong> I authorize tournament staff to seek emergency medical treatment if necessary.</p>
      <p><strong>Media Release:</strong> I grant permission for photographs and videos taken during the tournament to be used for promotional purposes.</p>
    `,
    "new-orleans": `
      <h2>New Orleans Location Waiver</h2>
      <p>I, the undersigned, acknowledge that participation in martial arts training and tournament competition involves risks including but not limited to: physical injury, property damage, and other unforeseen hazards.</p>
      <p>I hereby release Master Joe's Kung Fu Academy - New Orleans Location, its instructors, staff, and affiliates from any and all liability for injuries or damages that may occur during participation in this tournament.</p>
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
