# Journey Planner - User Guide

## 🎯 Overview

Journey Planner is a comprehensive travel planning application that helps you organize trips, manage accommodations, track transportation, plan attractions, and estimate costs—all in one place with an interactive map.

## ✨ Features

### 1. Journey Management

**Create a Journey**
1. Click the "New Journey" button in the top-right corner
2. Fill in the journey details:
   - Title: Give your trip a memorable name
   - Description: Add details about your trip (optional)
   - Start Date: When your journey begins
   - End Date: When your journey ends
   - Currency: Choose your preferred currency (USD, EUR, GBP, PLN)
3. Click "Create" to save your journey

**View Journeys**
- All your journeys are listed in the left sidebar
- Click on any journey to view its details
- Each journey card shows:
  - Title
  - Date range
  - Total estimated cost

### 2. Interactive Map

**Add Stops Using the Map**
1. Select a journey from the list
2. Click anywhere on the map to add a new stop at that location
3. A form will appear with the coordinates pre-filled
4. Enter the city name, country, and dates
5. Click "Add Stop" to save

**View Stops on the Map**
- All stops for the selected journey are shown as markers
- Click on any marker to see basic information
- The map automatically centers on your stops

### 3. Managing Stops

**Add Stop Details**
Each stop can include:
- **City and Country**: Where you're staying
- **Dates**: Arrival and departure dates
- **Accommodation**: 
  - Name of hotel/Airbnb
  - Direct link (e.g., from Booking.com)
  - Price per night or total
  - Currency
- **Attractions**: List of things to do (see below)
- **Notes**: Any additional information

**Edit a Stop**
- Click on the stop in the journey details section
- Modify any information
- Changes are saved automatically

### 4. Accommodation Management

**Save Accommodation Links**
1. When adding a stop, enter accommodation details
2. Paste the direct URL from booking sites:
   - Booking.com
   - Airbnb
   - Hotels.com
   - Or any other booking platform
3. Enter the price and currency
4. The link will be clickable for easy access later

**Quick Access**
- Click "View booking" link to open the accommodation page
- Perfect for quick reference or making changes to your booking

### 5. Transportation Tracking

**Add Transportation**
1. Select a journey
2. Click "Add Transport" in the transportation section
3. Choose the type:
   - ✈️ **Flight**: For air travel
   - 🚆 **Train**: For rail journeys
   - 🚌 **Bus**: For bus trips
   - 🚗 **Car**: For road trips
   - 🚶 **Other**: For any other transport
4. Fill in details:
   - From location
   - To location
   - Departure and arrival times
   - Price and currency
   - Booking URL (optional)
   - Notes (optional)

**View Transportation**
- All transports are listed under each journey
- Shows type, route, dates, and price
- Click booking links to manage reservations

### 6. Attraction Planning

**Add Attractions to Stops**
1. When adding or editing a stop
2. Add attractions you want to visit:
   - Name: What you want to see
   - Description: Details about the attraction
   - Estimated Cost: Ticket price or entry fee
   - Duration: How long you plan to spend (in hours)

**Benefits**
- Keep all your planned activities organized
- Track costs for budgeting
- Plan your daily schedule
- Never forget what you wanted to see

### 7. Cost Estimation

**Automatic Cost Calculation**
The app automatically calculates total trip costs including:
- ✅ Accommodation prices
- ✅ Transportation costs
- ✅ Attraction entry fees

**View Total Cost**
1. Navigate to any journey
2. The total estimated cost is displayed on the journey card
3. Click "Calculate Cost" to update totals
4. All prices are shown in the journey's selected currency

**Cost Breakdown**
- See individual costs for each:
  - Stop (accommodation + attractions)
  - Transportation between stops
- Helps you budget and adjust plans

### 8. iOS-Inspired Interface

**Design Features**
- Clean, minimalist interface
- Smooth transitions and animations
- Card-based layouts
- iOS color scheme
- Rounded corners and shadows
- Intuitive navigation

**Mobile-Friendly**
- Responsive design works on all devices
- Touch-friendly buttons and controls
- Optimized for both desktop and mobile

## 🗺️ Map Features

**Interactive Elements**
- **Pan**: Click and drag to move around the map
- **Zoom**: Use scroll wheel or +/- buttons
- **Click**: Click anywhere to add a new stop
- **Markers**: Show all your planned stops
- **Popups**: Click markers for quick info

**Map Data**
- Uses OpenStreetMap for accurate, up-to-date maps
- Shows cities, roads, landmarks, and terrain
- No API key required
- Works offline with cached tiles

## 💡 Tips & Best Practices

### Planning Your Journey

1. **Start with the Route**
   - Use the map to visualize your trip
   - Click on cities you want to visit
   - Add stops in the order you'll travel

2. **Add Accommodations Early**
   - Save booking links as you find them
   - Compare prices across dates
   - Include all costs for accurate budgeting

3. **Research Transportation**
   - Add all transport options you're considering
   - Compare prices between flights, trains, and buses
   - Book early for better prices

4. **List Attractions**
   - Research must-see places before you go
   - Add estimated costs and durations
   - Plan daily itineraries

### Cost Management

1. **Set a Budget**
   - Use the total cost feature to track spending
   - Include buffer for unexpected expenses
   - Update prices as you book

2. **Currency Consistency**
   - Choose one currency per journey
   - Convert prices before entering
   - Makes budgeting easier

3. **Track Everything**
   - Include all costs, even small ones
   - Add notes about what's included
   - Better estimates = fewer surprises

### Organization

1. **Use Descriptive Names**
   - Clear journey titles help you find trips
   - Detailed stop names make planning easier
   - Good notes save time later

2. **Keep Links Updated**
   - Save all booking confirmations
   - Update if you change reservations
   - Have everything in one place

3. **Regular Updates**
   - Update your journey as plans change
   - Add new discoveries
   - Remove cancelled items

## 📱 Keyboard Shortcuts

- **Esc**: Close any open modal/form
- **Enter**: Submit forms
- **Tab**: Navigate between form fields

## 🔄 Data Management

### Editing
- Click on any item to edit it
- Changes are saved automatically
- No manual save button needed

### Deleting
- Delete journeys, stops, or transports as needed
- Confirmation prevents accidental deletions
- Deleting a journey removes all associated data

### Exporting (Coming Soon)
- Export journeys to PDF
- Share trip plans with travel companions
- Print itineraries

## ❓ FAQ

**Q: Can I use this offline?**
A: The map requires an internet connection, but your data is saved locally and synced when online.

**Q: How many journeys can I create?**
A: Unlimited! Create as many journeys as you want.

**Q: Can I share my journey with others?**
A: Currently, journeys are private to your account. Sharing features are planned for future updates.

**Q: What currencies are supported?**
A: USD, EUR, GBP, and PLN are available. More currencies can be added on request.

**Q: Can I add photos?**
A: Photo uploads are planned for a future update. For now, you can add image URLs in the notes section.

**Q: Is my data secure?**
A: Yes! All data is stored securely in a PostgreSQL database with proper authentication.

## 🐛 Known Issues

- Map markers may take a moment to load on slow connections
- Very long journey names may truncate in the sidebar
- Date picker format depends on browser locale

## 🚀 Coming Soon

- Photo uploads for stops and attractions
- Weather integration
- Trip sharing with friends
- Mobile app versions
- Calendar integration
- Budget alerts
- Travel document checklist
- Packing list feature

## 📞 Support

If you encounter any issues or have suggestions:
1. Check this guide first
2. Review the README.md for technical information
3. Open an issue on GitHub
4. Contact the maintainers

---

Happy travels! 🌍✈️🗺️
