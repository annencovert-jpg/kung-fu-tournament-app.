# 🥋 Kung Fu Tournament Management Application

A robust, offline-capable web application for tournament registration and check-in, optimized for use on Chromebooks and tablets in gymnasium environments with unstable internet connectivity.

## ✨ Features

### Core Functionality
- **Offline-First Architecture**: Fully functional without internet connection using IndexedDB and localStorage
- **Dual Registration Workflows**:
  - Pre-registered student search with fuzzy matching
  - Walk-in registration with fast-tap button interface
  - QR code self-registration for parents
- **Validation Gates**: Strict payment and waiver verification before check-in
- **Master Override System**: Emergency bypass for last-minute situations
- **Dynamic Division Management**: Flexible bracket generation with drag-and-drop
- **CSV Import/Export**: Seamless integration with Mindbody exports

### User Interface
- **High-Contrast Design**: Black and yellow theme for maximum visibility in gym lighting
- **Tablet-Optimized**: Large touch targets and responsive layout
- **Real-Time Statistics**: Live dashboard with check-in counts
- **Pending Queue**: Visual tracking of students needing verification

### White-Label Support
- Configurable school names, locations, and waiver text
- Easy customization via `config.js` file
- No code changes required for different schools

## 🚀 Quick Start

### Installation

1. **Clone or download this repository**:
```bash
git clone https://github.com/yourusername/kung-fu-tournament-app.git
cd kung-fu-tournament-app
```

2. **Open in a web browser**:
```bash
# Simply open index.html in your browser
# Or use a local server (recommended):
python -m http.server 8000
# Then visit: http://localhost:8000
```

3. **For Chromebook deployment**:
   - Copy all files to a USB drive or cloud storage
   - Open `index.html` directly from the file system
   - Or host on a local network server for multi-device access

### First Time Setup

1. **Configure Your School** - Edit `config.js`:
```javascript
const CONFIG = {
  school: {
    name: "Your School Name",
    locations: [
      { id: "location-1", name: "Your Location 1", color: "#FFD700" },
      // Add your locations...
    ]
  }
  // Update waivers, ranks, etc.
};
```

2. **Import Student Roster**:
   - Click "📂 Import CSV Roster"
   - Select your Mindbody export CSV file
   - Students will be loaded into the system

3. **Test the System**:
   - Try searching for a pre-registered student
   - Create a test walk-in registration
   - Verify the validation gates work properly

## 📖 User Guide

### For Registrars (Sheryl)

#### Checking In Pre-Registered Students
1. Click **"🔍 Search Pre-Registered"**
2. Type student's first or last name (fuzzy matching enabled)
3. Click on the student from search results
4. System validates payment and waiver status
5. If valid, student is checked in automatically

#### Walk-In Registration
1. Click **"➕ New Walk-In Student"**
2. Enter student information:
   - Full name, date of birth, email, phone
3. Select rank by tapping the color-coded button
4. Select school location
5. Select gender
6. Review the location-specific waiver
7. Check "Waiver Agreement" if signed
8. Check "💰 Payment Received" if paid
9. Click "✓ Complete Registration"

#### QR Code Self-Registration
1. Click **"📱 Show Self-Registration QR"**
2. Display QR code for parents to scan
3. Parents complete registration on their own devices
4. Check Pending Queue for newly submitted forms
5. Verify and check in from the queue

#### Using Master Override
- Click **"🔒 Enable Master Override"** (turns red when active)
- Bypasses all payment and waiver validation
- Use only for emergency situations
- Click again to disable

### Division Management

#### Viewing Divisions
1. Click **"📊 View Division Summary"**
2. See automatically generated brackets based on:
   - Age groups (4-7, 8-12, 13-16, Adults)
   - Rank/belt level
   - Gender (if separation enabled)

#### Adjusting Division Settings
- Toggle **"Separate by Gender"** on/off
- Toggle **"Strict Rank Separation"** for fluid grouping
- Ideal for low turnout events where merging is needed

#### Exporting Data
1. Click **"🖨️ Print Ring Lists"**
2. CSV file downloads automatically
3. Contains all checked-in students with details
4. Ready for ring masters

## 🔧 Technical Details

### System Architecture

**Frontend Stack**:
- Pure HTML5, CSS3, JavaScript (ES6+)
- No framework dependencies for maximum performance
- CDN libraries: QRCode.js, Fuse.js (fuzzy search)

**State Management**:
- IndexedDB (primary storage)
- localStorage (fallback)
- In-memory state for performance
- Automatic sync queue for offline changes

**Data Flow**:
```
CSV Import → IndexedDB → In-Memory State → UI
     ↓           ↓              ↓
  Parse    Persistence    Real-time Updates
     ↓           ↓              ↓
Validation → Sync Queue → Server Sync (when online)
```

### File Structure
```
kung-fu-tournament-app/
├── index.html           # Main HTML structure
├── styles.css           # High-contrast styling
├── config.js            # White-label configuration
├── state-manager.js     # Offline-first state management
├── app.js              # Main application logic
├── manifest.json        # PWA manifest
├── sample-roster.csv    # Example CSV format
└── README.md           # This file
```

### Browser Compatibility
- Chrome/Chromium: ✅ Full support
- Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS 11.3+)
- Opera: ✅ Full support

### Storage Limits
- IndexedDB: ~50MB+ (varies by browser)
- localStorage: 5-10MB (fallback only)
- Sufficient for 1000+ student records

## 📊 CSV Format

### Required Headers (Mindbody Export)
```csv
First Name,Last Name,Email,Phone,Date of Birth,Rank,Location,Gender,Payment Status,Waiver
```

### Example Row
```csv
John,Smith,john@email.com,512-555-0101,2010-03-15,Blue Belt,North Austin,Male,Paid,Yes
```

### Field Mappings
- **Payment Status**: "Paid" or "Pending"
- **Waiver**: "Yes" (true) or "No" (false)
- **Rank**: Must match configured ranks in config.js
- **Location**: Must match configured locations
- **Gender**: "Male", "Female", or other

See `sample-roster.csv` for a complete example.

## 🔒 Security & Privacy

### Data Storage
- All data stored locally on the device
- No automatic cloud sync without configuration
- Optional server sync when API endpoint configured

### Offline Operation
- App functions completely offline
- No data loss during internet outages
- Automatic sync when connection restored

### Best Practices
- Clear browser data after each tournament
- Use Master Override sparingly and log usage
- Backup exported CSV files regularly
- Test offline mode before tournament day

## 🛠️ Customization

### Modifying Colors
Edit `config.js`:
```javascript
ui: {
  theme: {
    primary: "#000000",      // Black
    secondary: "#FFD700",    // Yellow/Gold
    warning: "#FF0000",      // Red
    success: "#32CD32"       // Green
  }
}
```

### Adding Locations
```javascript
locations: [
  { id: "new-location", name: "New Dojo", color: "#FFD700" }
]
```

### Custom Waivers
```javascript
waivers: {
  "new-location": `
    <h2>Your Custom Waiver Title</h2>
    <p>Your waiver text here...</p>
  `
}
```

### Adding Ranks/Belts
```javascript
ranks: [
  { id: "custom-rank", name: "Custom Belt", color: "#CCCCCC", textColor: "#000000" }
]
```

## 🐛 Troubleshooting

### Students Not Appearing After CSV Import
- Verify CSV headers match expected format
- Check browser console for parsing errors
- Ensure no duplicate emails or names

### Offline Mode Not Working
- Check browser storage settings
- Ensure IndexedDB is enabled
- Clear cache and reload application

### QR Code Not Generating
- Verify QRCode.js library loaded
- Check browser console for errors
- Ensure proper network configuration

### Sync Failures
- Configure API endpoint in config.js
- Check network connectivity
- Review sync queue in browser dev tools

## 📱 Mobile/Tablet Optimization

### Recommended Settings
- **Chromebook**: Use full-screen mode (F11)
- **iPad**: Add to Home Screen for standalone mode
- **Android**: Enable "Desktop Site" for best experience

### Performance Tips
- Close unnecessary browser tabs
- Clear cache before tournament
- Disable browser extensions
- Use latest browser version

## 🤝 Contributing

This is a white-label application designed for martial arts schools. To adapt for your school:

1. Fork the repository
2. Update `config.js` with your school's information
3. Customize waivers and branding
4. Test thoroughly before tournament day

## 📄 License

MIT License - Free to use and modify for your school.

## 🆘 Support

For technical support or customization requests:
- Open an issue on GitHub
- Email: support@example.com
- Review documentation in code comments

## 🎯 Roadmap

Future enhancements planned:
- [ ] Drag-and-drop division management
- [ ] Automatic bracket generation
- [ ] Real-time multi-device sync
- [ ] Mobile app versions (iOS/Android)
- [ ] Advanced reporting and analytics
- [ ] Integration with popular martial arts management systems

---

**Built with ❤️ for martial arts schools everywhere.**

*Last Updated: April 2026*
