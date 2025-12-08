# Attraction Tags Feature - Implementation Summary

## Overview
Added category tags to attractions with emoji icons for better visual organization and filtering.

## Tags Available
1. **🧖🏻‍♀️ Beauty & Spa** (`beauty`) - Spa, wellness centers, beauty treatments
2. **☕️ Café** (`cafe`) - Coffee shops, tea houses
3. **📷 Must See** (`must_see`) - Must-see tourist attractions
4. **💤 Accommodation** (`accommodation`) - Hotels, lodging
5. **🌱 Nature** (`nature`) - Parks, gardens, natural landmarks
6. **✈️ Airport** (`airport`) - Airports, air travel hubs
7. **🍽️ Food & Dining** (`food`) - Restaurants, dining experiences
8. **💸 Attraction** (`attraction`) - Paid attractions, museums, shows
9. **🚄 Train Station** (`train_station`) - Railway stations, train hubs

## Implementation Details

### 1. Database Schema
- **File**: `database/init.sql`
- **Changes**: Added `tag` column to `attractions` table with CHECK constraint
- **Type**: `VARCHAR(20)` with valid values constraint

### 2. Migration
- **File**: `server/src/migrations/add_tags_to_attractions.ts`
- **Purpose**: Database migration to add tag column to existing databases
- **Run**: Execute via migration script to update production databases

### 3. Backend Model
- **File**: `server/src/models/Journey.ts`
- **Changes**:
  - Added `tag` field to `AttractionAttributes` interface
  - Added `tag` property to `Attraction` class
  - Added Sequelize schema definition with validation

### 4. Frontend Types
- **File**: `client/src/types/journey.ts`
- **Changes**: Added `tag` field to `Attraction` interface with type union

### 5. Tag Utilities
- **File**: `client/src/utils/attractionTags.ts`
- **Purpose**: Centralized tag configuration with emoji, labels, and colors
- **Exports**:
  - `AttractionTag` type
  - `ATTRACTION_TAGS` constant with full tag info
  - `getAttractionTagInfo()` helper function
  - `getAvailableAttractionTags()` to get all tags

### 6. Example Data
- **File**: `server/data/example/attractions.json`
- **Purpose**: Sample attractions with various tags for testing and development
- **Content**: 9 sample attractions covering all tag types

## Usage in Frontend

### Display Tag Badge
```typescript
import { getAttractionTagInfo } from '@/utils/attractionTags';

const tagInfo = getAttractionTagInfo(attraction.tag);
if (tagInfo) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${tagInfo.color}`}>
      <span>{tagInfo.emoji}</span>
      <span>{tagInfo.label}</span>
    </span>
  );
}
```

### Tag Selector (Dropdown)
```typescript
import { getAvailableAttractionTags } from '@/utils/attractionTags';

const tags = getAvailableAttractionTags();
return (
  <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)}>
    <option value="">No tag</option>
    {tags.map(tag => (
      <option key={tag.value} value={tag.value}>
        {tag.emoji} {tag.label}
      </option>
    ))}
  </select>
);
```

### Filter by Tag
```typescript
const filteredAttractions = attractions.filter(a => 
  !selectedTag || a.tag === selectedTag
);
```

## Integration with Itinerary/Schedule

The tags help organize attractions in the itinerary view:
- Group attractions by tag type
- Color-code schedule items
- Filter by category (e.g., show only food & café)
- Priority sorting with visual indicators

## Next Steps (Optional UI Enhancements)

1. **Attraction Form**: Add tag dropdown in create/edit attraction modal
2. **Itinerary Page**: Display tag badges next to attraction names
3. **Filter Controls**: Add tag filter buttons/chips to filter attractions
4. **Map View**: Use tag colors for map markers
5. **Statistics**: Show breakdown by tag category in journey summary

## Migration Instructions

To apply to existing database:
```bash
cd server
npm run migrate # or your migration command
```

Or manually run the SQL:
```sql
ALTER TABLE attractions
ADD COLUMN tag VARCHAR(20) CHECK (tag IN (
  'beauty', 'cafe', 'must_see', 'accommodation', 
  'nature', 'airport', 'food', 'attraction', 'train_station'
));
```

## Testing

Use the example data to test the feature:
```bash
# Copy example data
Copy-Item -Path server\data\example\* -Destination server\data\ -Force

# Start server
cd server
npm run dev
```

The example attractions will have various tags assigned for visual testing.
