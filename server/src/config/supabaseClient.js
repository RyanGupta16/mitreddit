const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

console.log('Environment check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing'
});

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase URL and service key are required.');
    console.error('Make sure .env file exists in server folder with proper keys');
    throw new Error('Supabase URL and service key are required.');
}

try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        // It's recommended to disable auto-refreshing tokens on the server
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('✅ Supabase client initialized successfully.');
    module.exports = supabase;
} catch (error) {
    console.error('❌ Failed to create Supabase client:', error);
    throw error;
}
