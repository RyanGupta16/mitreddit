// Test Authentication Endpoints
async function testAuth() {
    console.log('🧪 Testing Authentication Endpoints...\n');
    
    // Test 1: Health Check
    try {
        const healthResponse = await fetch('http://localhost:5000/api/health');
        const health = await healthResponse.json();
        console.log('✅ Health Check:', health.status, '| Database:', health.database);
    } catch (error) {
        console.log('❌ Health Check Failed:', error.message);
        return;
    }
    
    // Test 2: Signup
    const testUser = {
        name: 'Test User',
        email: `test${Date.now()}@learner.manipal.edu`,
        password: 'testpass123',
        branch: 'Computer Science',
        year: '2024'
    };
    
    let authToken = null;
    
    try {
        const signupResponse = await fetch('http://localhost:5000/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });
        
        if (signupResponse.ok) {
            const signupData = await signupResponse.json();
            console.log('✅ Signup Success:', signupData.user.name, '| ID:', signupData.user.id);
            authToken = signupData.token;
        } else {
            const error = await signupResponse.json();
            console.log('❌ Signup Failed:', error.message);
            return;
        }
    } catch (error) {
        console.log('❌ Signup Error:', error.message);
        return;
    }
    
    // Test 3: Login
    try {
        const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testUser.email,
                password: testUser.password
            })
        });
        
        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('✅ Login Success:', loginData.user.name);
            authToken = loginData.token;
        } else {
            const error = await loginResponse.json();
            console.log('❌ Login Failed:', error.message);
        }
    } catch (error) {
        console.log('❌ Login Error:', error.message);
    }
    
    // Test 4: Profile Access
    if (authToken) {
        try {
            const profileResponse = await fetch('http://localhost:5000/api/auth/profile', {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (profileResponse.ok) {
                const profile = await profileResponse.json();
                console.log('✅ Profile Access:', profile.user.name, '| Email:', profile.user.email);
            } else {
                const error = await profileResponse.json();
                console.log('❌ Profile Access Failed:', error.message);
            }
        } catch (error) {
            console.log('❌ Profile Error:', error.message);
        }
    }
    
    console.log('\n🎯 Authentication Test Complete!');
}

// Run the test
testAuth().catch(console.error);
