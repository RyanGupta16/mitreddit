const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; // This will be the anon key, not service key

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key not found. Auth client will not be available.');
    module.exports = null;
} else {
    // Server-side Supabase client for authentication (using service key for server operations)
    const supabaseAuth = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    });

    console.log('Supabase Auth client initialized with service key.');
    module.exports = supabaseAuth;
}
