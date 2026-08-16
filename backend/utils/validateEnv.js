/**
 * Environment Variables Validation
 * Ensures all required environment variables are set at startup.
 */

const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',       // Used for stateless API / mobile clients
  'SESSION_SECRET',   // Used for browser session cookies
  'EMAIL_USER',
  'EMAIL_APP_PASSWORD',
];

const missingVars = requiredEnvVars.filter(key => !process.env[key]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(key => console.error(`   - ${key}`));
  console.error('\nAdd them to backend/.env and restart.');
  process.exit(1);
}

const { getUploadBaseDir } = require("./storagePath");
console.log('✅ All required environment variables are configured');
console.log(`📂 Upload & Storage Directory: ${getUploadBaseDir()}`);
