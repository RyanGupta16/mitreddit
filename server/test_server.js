const https = require('https');
const http = require('http');

async function testServer() {
    console.log('Testing server endpoints...');
    
    // Test basic health endpoint
    try {
        const response = await fetch('http://localhost:5000/health');
        const data = await response.text();
        console.log('✅ Health endpoint:', response.status, data);
    } catch (error) {
        console.log('❌ Health endpoint failed:', error.message);
    }
    
    // Test API health endpoint
    try {
        const response = await fetch('http://localhost:5000/api/health');
        const data = await response.json();
        console.log('✅ API Health endpoint:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.log('❌ API Health endpoint failed:', error.message);
    }
    
    // Test posts endpoint (should work with Supabase)
    try {
        const response = await fetch('http://localhost:5000/api/posts');
        const data = await response.json();
        console.log('✅ Posts endpoint:', response.status, data.success ? 'Success' : 'Failed');
        if (data.posts) {
            console.log(`   Found ${data.posts.length} posts`);
        }
    } catch (error) {
        console.log('❌ Posts endpoint failed:', error.message);
    }
    
    console.log('Server test completed!');
}

// Give server a moment to start
setTimeout(testServer, 3000);
