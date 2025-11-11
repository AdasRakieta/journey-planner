# Transport Numbers Feature - Implementation Summary

## Overview
Added support for tracking flight and train identification numbers in the Journey Planner application.

## Changes Made

### 1. Frontend (Client)

#### TypeScript Interface (`client/src/types/journey.ts`)
- Added `flightNumber?: string` - For tracking flight numbers (e.g., "LO123", "FR1234")
- Added `trainNumber?: string` - For tracking train numbers (e.g., "TLK 12345", "IC 5002")

#### UI Components (`client/src/App.tsx`)
- **Add Transport Form**: Conditional fields that show:
  - Flight number input when transport type is "flight"
  - Train number input when transport type is "train"
- **Edit Transport Form**: Same conditional fields for editing existing transports
- **Transport Cards**: Display flight/train numbers in small gray text below transport type
- **State Management**: Added fields to `newTransport` state and reset logic

#### Modal Styling
- Fixed Add Attraction Modal to use `gh-modal-overlay` (semi-transparent background)
- Fixed Edit Attraction Modal to use same overlay system

### 2. Backend (Server)

#### Sequelize Model (`server/src/models/Journey.ts`)
- Added `flightNumber?: string` to Transport class definition
- Added `trainNumber?: string` to Transport class definition
- Updated `TransportAttributes` interface with new fields
- Added Sequelize schema fields:
  ```typescript
  flightNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'flight_number',
  },
  trainNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'train_number',
  }
  ```

### 3. Database

#### Schema Update (`database/init.sql`)
- Added `flight_number VARCHAR(50)` column to transports table
- Added `train_number VARCHAR(50)` column to transports table

#### Migration (`database/migrations/add_flight_train_numbers.sql`)
- Created migration script for existing databases
- Includes verification query to confirm columns were added
- Safe to run multiple times (uses `IF NOT EXISTS`)

## How to Apply Changes

### For New Installations
The updated `init.sql` includes the new columns automatically.

### For Existing Databases
Run the migration script:
```sql
psql -U journey_user -d journey_planner -f database/migrations/add_flight_train_numbers.sql
```

Or using Docker:
```powershell
docker exec -i journey-planner-db psql -U journey_user -d journey_planner < database/migrations/add_flight_train_numbers.sql
```

## Usage

### Adding a Flight with Number
1. Click "Add Transport"
2. Select type: "Flight"
3. Flight number field appears automatically
4. Enter flight number (e.g., "LO123")
5. Fill other details and save
6. Flight number displays on transport card

### Adding a Train with Number
1. Click "Add Transport"
2. Select type: "Train"
3. Train number field appears automatically
4. Enter train number (e.g., "TLK 12345")
5. Fill other details and save
6. Train number displays on transport card

## Field Format Examples

### Flight Numbers
- `LO123` - LOT Polish Airlines
- `FR1234` - Ryanair
- `BA456` - British Airways
- `LH789` - Lufthansa

### Train Numbers
- `TLK 12345` - Tanie Linie Kolejowe
- `IC 5002` - InterCity
- `EC 102` - EuroCity
- `EN 453` - EuroNight

## Future Enhancements

### Potential Auto-Fill Feature
The user requested ability to auto-fill route data from flight/train numbers. This would require:

#### Flight Data APIs
- **FlightRadar24 API** - Real-time flight tracking
- **FlightAware API** - Flight status and schedules
- **Amadeus Travel API** - Comprehensive flight data
- **Skyscanner API** - Flight search and details

#### Train Data APIs
- **PKP Intercity API** (Poland) - Train schedules and routes
- **Rail Europe API** - Pan-European train data
- **National Rail APIs** - Country-specific train information

#### Implementation Steps
1. Add API key configuration to environment variables
2. Create service functions to query APIs
3. Add "Auto-fill from number" button in transport forms
4. Parse API responses to populate:
   - From location (departure city/station)
   - To location (arrival city/station)
   - Departure date/time
   - Arrival date/time
   - Potentially price information
5. Handle errors gracefully (number not found, API down, etc.)

## Testing Checklist

- ✅ TypeScript compilation (no errors)
- ✅ Backend builds successfully
- ⏳ Add transport with flight number
- ⏳ Add transport with train number
- ⏳ Edit existing transport to add/change number
- ⏳ Verify database storage (snake_case columns)
- ⏳ Verify display on transport card
- ⏳ Test form reset after adding transport

## Notes

- Flight and train numbers are optional fields
- Only relevant transport types show the number fields (conditional rendering)
- Field names use camelCase in TypeScript, snake_case in PostgreSQL
- Maximum length: 50 characters for both fields
- Numbers are stored as text to preserve formatting (e.g., "LO 123" vs "LO123")
