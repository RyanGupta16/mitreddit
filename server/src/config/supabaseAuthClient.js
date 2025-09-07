const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; // This will be the anon key, not service key

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key not found. Auth client will not be available.');
    module.exports = null;
} else {
    // Client-side Supabase client for authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: false, // Server-side should not persist sessions
            detectSessionInUrl: false // Server-side doesn't need URL detection
        }
    });

    console.log('Supabase Auth client initialized.');
    module.exports = supabaseAuth;
}
