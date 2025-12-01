#!/usr/bin/env node
/**
 * Generate bcrypt hash for admin password
 * Usage: node create-admin-hash.js [password]
 */

const bcrypt = require('bcrypt');

const password = process.argv[2] || 'admin123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }
  
  console.log('\n=================================');
  console.log('🔐 ADMIN PASSWORD HASH GENERATED');
  console.log('=================================');
  console.log('\nPassword:', password);
  console.log('Hash:', hash);
  console.log('\n📋 SQL UPDATE Statement:');
  console.log('------------------------');
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE username = 'admin';`);
  console.log('\n✅ Copy and run the SQL statement above to update the admin password.\n');
});
