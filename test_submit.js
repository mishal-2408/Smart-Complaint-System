const mongoose = require('mongoose');
const Complaint = require('./models/Complaint');
const User = require('./models/User');

async function run() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/project_2_db');
        
        const user = new User({ username: 'testuser' + Date.now(), email: `test${Date.now()}@test.com`, password: 'abc' });
        await user.save();
        
        const complaint = new Complaint({
            title: 'Test',
            description: 'Test description urgent',
            userId: user._id
        });
        
        await complaint.save();
        console.log('Saved successfully');
    } catch (e) {
        console.error('Save failed:', e);
    }
    process.exit(0);
}
run();
