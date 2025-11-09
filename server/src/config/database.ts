import { Sequelize } from 'sequelize';
import { Client } from 'pg';

// Test raw pg connection first (like psycopg2)
const testRawConnection = async () => {
  console.log('🧪 Testing raw pg connection (like Python psycopg2)...');
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('✅ Raw pg connection successful!');
    const result = await client.query('SELECT version()');
    console.log('📊 PostgreSQL version:', result.rows[0].version);
    await client.end();
    return true;
  } catch (error: any) {
    console.error('❌ Raw pg connection failed:', error.message);
    console.error('Error code:', error.code);
    return false;
  }
};

const sequelize = new Sequelize(
  process.env.DB_NAME || 'journey_planner',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

export const connectDB = async () => {
  console.log('🔍 Database connection details:');
  console.log(`   Host: ${process.env.DB_HOST}`);
  console.log(`   Port: ${process.env.DB_PORT}`);
  console.log(`   Database: ${process.env.DB_NAME}`);
  console.log(`   User: ${process.env.DB_USER}`);
  console.log(`   Password: ${process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-3) : 'NOT SET'}`);
  console.log('');
  
  // First test raw connection
  const rawConnectionWorks = await testRawConnection();
  
  if (!rawConnectionWorks) {
    console.error('\n⚠️  Raw pg connection failed - PostgreSQL is not accepting connections');
    console.error('⚠️  This means the issue is with PostgreSQL configuration, not Sequelize');
    console.error('\nPossible causes:');
    console.error('1. pg_hba.conf does not allow connections from your IP');
    console.error('2. PostgreSQL listen_addresses is not set to * or your IP');
    console.error('3. Firewall on the Raspberry Pi is blocking port 5432');
    console.error('4. PostgreSQL is not running or listening on different port');
    return;
  }
  
  console.log('\n⏳ Now testing Sequelize connection...');
  try {
    await sequelize.authenticate();
    console.log('✅ Sequelize connection successful!');
    
    console.log('⏳ Synchronizing database schema...');
    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized!');
  } catch (error: any) {
    console.error('❌ Sequelize connection failed (but raw pg worked!)');
    console.error('Error:', error.message);
  }
};

export default sequelize;
