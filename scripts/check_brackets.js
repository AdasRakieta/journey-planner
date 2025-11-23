const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../client/src/App.tsx');
const data = fs.readFileSync(file, 'utf8');
let paren = 0, brace = 0, bracket = 0;
const lines = data.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (ch === '(') paren++;
    if (ch === ')') paren--;
    if (ch === '{') brace++;
    if (ch === '}') brace--;
    if (ch === '[') bracket++;
    if (ch === ']') bracket--;
  }
  if (paren < 0 || brace < 0 || bracket < 0) {
    console.log(`Negative at line ${i+1}: paren=${paren}, brace=${brace}, bracket=${bracket}`);
  }
  // Print any lines where parentheses count changes significantly
  if (paren > 6 || Math.abs(paren - (i>0 ? (lines[i-1].match(/\(/g) || []).length : 0)) > 5) {
    console.log(`Significant paren at line ${i+1}: paren=${paren}`);
  }
  if ((i+1) % 10 === 0) {
    // Periodic snapshot to locate where brackets cross or change unexpectedly
    console.log(`Line ${i+1} snapshot -> paren=${paren}, brace=${brace}, bracket=${bracket}`);
  }
  if (paren !== 0 || brace !== 0 || bracket !== 0) {
    // Not necessarily error, only print when counts change
  }
}
console.log(`Totals: paren=${paren}, brace=${brace}, bracket=${bracket}`);
if (paren !== 0 || brace !== 0 || bracket !== 0) process.exit(2);
process.exit(0);
