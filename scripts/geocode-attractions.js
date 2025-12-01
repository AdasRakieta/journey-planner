/**
 * Script to geocode attractions that are missing coordinates
 * Run with: node scripts/geocode-attractions.js
 */

const path = require('path');
const fs = require('fs');

// Nominatim API geocoding function
async function geocodeAddress(street, city, postalCode, country) {
  try {
    const parts = [];
    if (street) parts.push(street);
    if (city) parts.push(city);
    if (postalCode) parts.push(postalCode);
    if (country) parts.push(country);

    if (parts.length === 0) {
      return null;
    }

    const query = parts.join(', ');
    
    const url = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}` +
      `&format=json` +
      `&limit=1` +
      `&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'JourneyPlanner/1.0',
      },
    });

    if (!response.ok) {
      console.error('Geocoding API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      console.warn('No geocoding results found for:', query);
      return null;
    }

    const result = data[0];
    
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Delay function to respect API rate limits (1 request per second)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const attractionsFile = path.join(__dirname, '../server/data/attractions.json');
  
  // Check if file exists
  if (!fs.existsSync(attractionsFile)) {
    console.error('❌ File not found:', attractionsFile);
    console.log('Make sure you are running this from the project root directory.');
    process.exit(1);
  }

  // Load attractions
  const attractions = JSON.parse(fs.readFileSync(attractionsFile, 'utf8'));
  
  console.log(`📍 Found ${attractions.length} attractions total`);
  
  // Filter attractions without coordinates but with address
  const needsGeocode = attractions.filter(a => {
    const hasCoords = a.latitude != null && a.longitude != null;
    const hasAddress = a.address_street || a.address_city || a.address_postal_code || a.address_country;
    return !hasCoords && hasAddress;
  });
  
  console.log(`🔍 Found ${needsGeocode.length} attractions needing geocoding`);
  
  if (needsGeocode.length === 0) {
    console.log('✅ All attractions with addresses already have coordinates!');
    return;
  }
  
  let updated = 0;
  let failed = 0;
  
  // Process each attraction
  for (let i = 0; i < needsGeocode.length; i++) {
    const attraction = needsGeocode[i];
    
    console.log(`\n[${i + 1}/${needsGeocode.length}] Processing: ${attraction.name}`);
    console.log(`   Address: ${[attraction.address_street, attraction.address_city, attraction.address_postal_code, attraction.address_country].filter(Boolean).join(', ')}`);
    
    try {
      const result = await geocodeAddress(
        attraction.address_street,
        attraction.address_city,
        attraction.address_postal_code,
        attraction.address_country
      );
      
      if (result) {
        // Update the attraction in the array
        const index = attractions.findIndex(a => a.id === attraction.id);
        if (index !== -1) {
          attractions[index].latitude = result.latitude;
          attractions[index].longitude = result.longitude;
          if (!attractions[index].address) {
            attractions[index].address = result.displayName;
          }
          updated++;
          console.log(`   ✅ Found: ${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`);
        }
      } else {
        failed++;
        console.log(`   ❌ Not found`);
      }
    } catch (error) {
      failed++;
      console.error(`   ❌ Error:`, error.message);
    }
    
    // Respect API rate limits - wait 1 second between requests
    if (i < needsGeocode.length - 1) {
      await delay(1000);
    }
  }
  
  // Save updated attractions back to file
  if (updated > 0) {
    fs.writeFileSync(attractionsFile, JSON.stringify(attractions, null, 2), 'utf8');
    console.log(`\n✅ Updated ${updated} attractions with coordinates`);
  }
  
  if (failed > 0) {
    console.log(`⚠️  Failed to geocode ${failed} attractions`);
  }
  
  console.log('\n🎉 Done!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
