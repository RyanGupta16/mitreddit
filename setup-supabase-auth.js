#!/usr/bin/env node

/**
 * Supabase Auth Setup Script
 * This script helps you set up Supabase authentication for your MIT Reddit project
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 MIT Reddit - Supabase Auth Setup');
console.log('=====================================\n');

// Check if required files exist
const requiredFiles = [
    'supabase/config.toml',
    'server/src/config/supabaseClient.js',
    'SUPABASE_AUTH_MIGRATION_PLAN.md'
];

console.log('📋 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING`);
        allFilesExist = false;
    }
});

if (!allFilesExist) {
    console.log('\n❌ Some required files are missing. Please run the setup again.\n');
    process.exit(1);
}

console.log('\n📝 Next Steps to Complete Supabase Auth Setup:');
console.log('===============================================\n');

console.log('1. 🔑 Get your Supabase credentials:');
console.log('   - Go to https://supabase.com/dashboard');
console.log('   - Select your project: MIT REDDIT');
console.log('   - Go to Settings > API');
console.log('   - Copy your "anon/public" key\n');

console.log('2. 📄 Create environment file:');
console.log('   - Create server/.env file with:');
console.log('   ```');
console.log('   SUPABASE_URL=https://kewhwewjdmexpftvngoy.supabase.co');
console.log('   SUPABASE_SERVICE_KEY=your_service_role_key');
console.log('   SUPABASE_ANON_KEY=your_anon_public_key');
console.log('   JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_secure_2024');
console.log('   NODE_ENV=development');
console.log('   PORT=5000');
console.log('   ```\n');

console.log('3. 🗄️ Run database migration:');
console.log('   ```bash');
console.log('   npx supabase db push');
console.log('   ```\n');

console.log('4. 🌐 Enable Authentication in Supabase Dashboard:');
console.log('   - Go to Authentication > Settings');
console.log('   - Enable "Enable email confirmations" (optional)');
console.log('   - Set Site URL to: http://localhost:5000');
console.log('   - Add Redirect URLs: http://localhost:5000, http://127.0.0.1:5000\n');

console.log('5. 🔧 Update your server to use hybrid auth:');
console.log('   - The hybrid auth middleware supports both custom and Supabase auth');
console.log('   - New users will use Supabase auth');
console.log('   - Existing users continue with custom auth\n');

console.log('6. 🎨 Add Supabase client library to your HTML:');
console.log('   Add this before closing </body> tag in client/index.html:');
console.log('   ```html');
console.log('   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
console.log('   <script>');
console.log('     window.supabase = supabase.createClient(');
console.log('       "https://kewhwewjdmexpftvngoy.supabase.co",');
console.log('       "your_anon_key_here"');
console.log('     );');
console.log('   </script>');
console.log('   <script src="js/supabaseAuth.js"></script>');
console.log('   ```\n');

console.log('7. 🧪 Test the setup:');
console.log('   - Start your server: npm start');
console.log('   - Try creating a new account (will use Supabase auth)');
console.log('   - Try logging in with existing account (will use custom auth)');
console.log('   - Check the browser console for auth type logs\n');

console.log('📚 Files Created:');
console.log('=================');
console.log('✅ supabase/config.toml - Supabase configuration');
console.log('✅ supabase/migrations/20250907000001_enable_auth_setup.sql - Database migration');
console.log('✅ server/src/config/supabaseAuthClient.js - Auth client config');
console.log('✅ server/src/middleware/hybridAuth.js - Hybrid auth middleware');
console.log('✅ server/src/routes/authSupabase.js - New Supabase auth routes');
console.log('✅ client/js/supabaseAuth.js - Client-side Supabase auth');
console.log('✅ SUPABASE_AUTH_MIGRATION_PLAN.md - Complete migration guide\n');

console.log('🎯 Benefits After Setup:');
console.log('========================');
console.log('✅ Built-in email verification');
console.log('✅ Password reset functionality');
console.log('✅ Automatic token refresh');
console.log('✅ Better security and session management');
console.log('✅ Support for OAuth providers (future)');
console.log('✅ Row Level Security (RLS) support\n');

console.log('⚠️  Important Notes:');
console.log('====================');
console.log('• Your existing users will continue to work with custom auth');
console.log('• New users will automatically use Supabase auth');
console.log('• You can migrate existing users gradually');
console.log('• Both auth systems run in parallel during transition');
console.log('• Read SUPABASE_AUTH_MIGRATION_PLAN.md for detailed steps\n');

console.log('🆘 Need Help?');
console.log('=============');
console.log('• Check the migration plan: SUPABASE_AUTH_MIGRATION_PLAN.md');
console.log('• Supabase docs: https://supabase.com/docs/guides/auth');
console.log('• Test with the provided auth routes: /api/auth/supabase/*\n');

console.log('🎉 Setup Complete! Follow the steps above to enable Supabase Auth.\n');
