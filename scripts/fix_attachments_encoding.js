const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '..', 'server', 'data', 'attachments.json');

function maybeFix(s) {
  if (!s || typeof s !== 'string') return s;
  if (/Ã|Â|Å/.test(s)) {
    try {
      return Buffer.from(s, 'latin1').toString('utf8');
    } catch (e) {
      return s;
    }
  }
  return s;
}

function run() {
  if (!fs.existsSync(dataFile)) {
    console.error('attachments.json not found at', dataFile);
    process.exit(1);
  }
  const txt = fs.readFileSync(dataFile, 'utf8');
  const data = JSON.parse(txt || '[]');
  let changed = 0;
  for (const row of data) {
    if (row.original_filename) {
      const fixed = maybeFix(row.original_filename);
      if (fixed !== row.original_filename) {
        console.log(`Fixing id=${row.id}: '${row.original_filename}' -> '${fixed}'`);
        row.original_filename = fixed;
        changed++;
      }
    }
  }
  if (changed) {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Wrote ${changed} changes to ${dataFile}`);
  } else {
    console.log('No changes needed');
  }
}

run();
