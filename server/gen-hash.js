const bcrypt = require('bcrypt');

bcrypt.hash('admin123', 10).then(hash => {
  console.log(hash);
  console.log("UPDATE users SET password_hash = '" + hash + "' WHERE username = 'admin';");
});
