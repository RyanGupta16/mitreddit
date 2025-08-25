// Setup script to create admin user and initialize analytics
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
require('dotenv').config();

async function setupAdmin() {
    try {
        // Connect to MongoDB
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manipal_reddit';
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ role: 'admin' });
        
        if (existingAdmin) {
            console.log('✅ Admin user already exists:', existingAdmin.email);
            process.exit(0);
        }

        // Create admin user
        const adminEmail = 'admin@learner.manipal.edu';
        const adminPassword = 'admin123'; // Change this in production!

        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        
        const adminUser = new User({
            name: 'Administrator',
            username: 'admin',
            email: adminEmail,
            password: hashedPassword,
            branch: 'cse',
            year: 4,
            role: 'admin',
            isVerified: true
        });

        await adminUser.save();
        
        console.log('✅ Admin user created successfully!');
        console.log('📧 Email:', adminEmail);
        console.log('🔑 Password:', adminPassword);
        console.log('⚠️  Please change the password after first login!');
        
        process.exit(0);

    } catch (error) {
        console.error('❌ Error setting up admin:', error);
        process.exit(1);
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    setupAdmin();
}

module.exports = setupAdmin;
