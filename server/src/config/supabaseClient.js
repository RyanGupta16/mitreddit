const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and service key are required.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // It's recommended to disable auto-refreshing tokens on the server
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('Supabase client initialized.');

module.exports = supabase;
