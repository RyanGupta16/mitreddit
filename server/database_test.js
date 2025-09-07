const fetch = require('node-fetch');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

let authToken = null;
let testUserId = null;
let testPostId = null;

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
            ...options.headers
        },
        ...options
    };
    
    try {
        const response = await fetch(url, config);
        const data = await response.text();
        
        let jsonData;
        try {
            jsonData = JSON.parse(data);
        } catch {
            jsonData = { raw: data };
        }
        
        return {
            status: response.status,
            data: jsonData,
            success: response.ok
        };
    } catch (error) {
        return {
            status: 0,
            data: { error: error.message },
            success: false
        };
    }
}

async function runTests() {
    console.log('🚀 Starting comprehensive Supabase database tests...\n');
    
    // Test 1: Server Health Check
    console.log('1. Testing server health...');
    const healthCheck = await apiCall(`${BASE_URL}/health`);
    console.log(`   Status: ${healthCheck.status}`);
    console.log(`   Response: ${JSON.stringify(healthCheck.data)}`);
    
    // Test 2: API Health Check (Database Connection)
    console.log('\n2. Testing database connection...');
    const apiHealth = await apiCall('/health');
    console.log(`   Status: ${apiHealth.status}`);
    console.log(`   Database: ${apiHealth.data.database || 'unknown'}`);
    console.log(`   Response: ${JSON.stringify(apiHealth.data, null, 2)}`);
    
    // Test 3: User Registration (Supabase Insert)
    console.log('\n3. Testing user registration...');
    const registrationData = {
        name: 'Test User',
        email: `test${Date.now()}@learner.manipal.edu`,
        password: 'testpass123',
        branch: 'Computer Science',
        year: '2024'
    };
    
    const registerResult = await apiCall('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(registrationData)
    });
    
    console.log(`   Status: ${registerResult.status}`);
    console.log(`   Success: ${registerResult.data.success}`);
    if (registerResult.success) {
        authToken = registerResult.data.token;
        testUserId = registerResult.data.user?.id;
        console.log(`   ✅ User registered successfully with ID: ${testUserId}`);
    } else {
        console.log(`   ❌ Registration failed: ${registerResult.data.message}`);
    }
    
    // Test 4: User Login (Supabase Query)
    if (!authToken) {
        console.log('\n4. Testing user login...');
        const loginData = {
            email: registrationData.email,
            password: registrationData.password
        };
        
        const loginResult = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify(loginData)
        });
        
        console.log(`   Status: ${loginResult.status}`);
        console.log(`   Success: ${loginResult.data.success}`);
        if (loginResult.success) {
            authToken = loginResult.data.token;
            testUserId = loginResult.data.user?.id;
            console.log(`   ✅ Login successful with token`);
        } else {
            console.log(`   ❌ Login failed: ${loginResult.data.message}`);
        }
    }
    
    // Test 5: Get Posts (Supabase Select with Join)
    console.log('\n5. Testing posts retrieval...');
    const postsResult = await apiCall('/posts?limit=5');
    console.log(`   Status: ${postsResult.status}`);
    console.log(`   Success: ${postsResult.data.success}`);
    if (postsResult.success) {
        const posts = postsResult.data.posts || [];
        console.log(`   ✅ Retrieved ${posts.length} posts`);
        console.log(`   Posts: ${posts.map(p => p.title || 'Untitled').join(', ')}`);
    } else {
        console.log(`   ❌ Posts retrieval failed: ${postsResult.data.message}`);
    }
    
    // Test 6: Create Post (Supabase Insert with Authentication)
    if (authToken) {
        console.log('\n6. Testing post creation...');
        const postData = {
            title: 'Test Post from Supabase Migration',
            content: 'This post was created to test the Supabase database integration.',
            category: 'general',
            type: 'text'
        };
        
        const createPostResult = await apiCall('/posts', {
            method: 'POST',
            body: JSON.stringify(postData)
        });
        
        console.log(`   Status: ${createPostResult.status}`);
        console.log(`   Success: ${createPostResult.data.success}`);
        if (createPostResult.success) {
            testPostId = createPostResult.data.post?.id;
            console.log(`   ✅ Post created successfully with ID: ${testPostId}`);
        } else {
            console.log(`   ❌ Post creation failed: ${createPostResult.data.message}`);
        }
        
        // Test 7: Vote on Post (Supabase Insert/Update)
        if (testPostId) {
            console.log('\n7. Testing post voting...');
            const voteResult = await apiCall(`/posts/${testPostId}/vote`, {
                method: 'POST',
                body: JSON.stringify({ voteType: 'upvote' })
            });
            
            console.log(`   Status: ${voteResult.status}`);
            console.log(`   Success: ${voteResult.data.success}`);
            if (voteResult.success) {
                console.log(`   ✅ Vote submitted successfully`);
                console.log(`   New score: ${voteResult.data.newScore || 'unknown'}`);
            } else {
                console.log(`   ❌ Voting failed: ${voteResult.data.message}`);
            }
        }
    }
    
    // Test 8: User Profile (Supabase Select with Authentication)
    if (authToken) {
        console.log('\n8. Testing user profile retrieval...');
        const profileResult = await apiCall('/auth/profile');
        console.log(`   Status: ${profileResult.status}`);
        console.log(`   Success: ${profileResult.data.success}`);
        if (profileResult.success) {
            const user = profileResult.data.user;
            console.log(`   ✅ Profile retrieved: ${user?.name} (${user?.email})`);
        } else {
            console.log(`   ❌ Profile retrieval failed: ${profileResult.data.message}`);
        }
    }
    
    console.log('\n🎉 Database test suite completed!');
    console.log('\n📊 Summary:');
    console.log(`   - Server is running on port 5000`);
    console.log(`   - Supabase connection: ${apiHealth.data.database === 'connected' ? '✅ Connected' : '❌ Failed'}`);
    console.log(`   - Authentication: ${authToken ? '✅ Working' : '❌ Failed'}`);
    console.log(`   - Posts system: ${testPostId ? '✅ Working' : '⚠️ Partial/Failed'}`);
}

// Wait for server to be ready, then run tests
setTimeout(runTests, 2000);
