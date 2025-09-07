const mongoose = require('mongoose');

const studyBuddySchema = new mongoose.Schema({
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    helper: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    subject: {
        type: String,
        required: true,
        enum: [
            'Mathematics', 'Physics', 'Chemistry', 'Computer Science', 
            'Data Structures', 'Algorithms', 'Database Systems', 'Web Development',
            'Machine Learning', 'Artificial Intelligence', 'Software Engineering',
            'Electronics', 'Digital Circuits', 'Signal Processing', 'Communication Systems',
            'Thermodynamics', 'Fluid Mechanics', 'Manufacturing', 'Design Engineering',
            'Structural Engineering', 'Environmental Engineering', 'Transportation',
            'Electrical Machines', 'Power Systems', 'Control Systems',
            'Statistics', 'Probability', 'Linear Algebra', 'Calculus',
            'English', 'Technical Writing', 'Research Methodology', 'Other'
        ]
    },
    topic: {
        type: String,
        required: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        maxlength: 1000
    },
    urgency: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    helpType: {
        type: String,
        enum: ['assignment', 'concept-clarification', 'project-help', 'exam-prep', 'lab-work', 'other'],
        required: true
    },
    preferredTime: {
        type: String,
        enum: ['morning', 'afternoon', 'evening', 'night', 'flexible'],
        default: 'flexible'
    },
    meetingType: {
        type: String,
        enum: ['online', 'offline', 'both'],
        default: 'both'
    },
    status: {
        type: String,
        enum: ['open', 'matched', 'in-progress', 'completed', 'cancelled'],
        default: 'open'
    },
    responses: [{
        helper: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        message: {
            type: String,
            maxlength: 500
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    completedAt: Date,
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    feedback: {
        type: String,
        maxlength: 500
    }
}, {
    timestamps: true
});

// Index for efficient queries
studyBuddySchema.index({ subject: 1, status: 1 });
studyBuddySchema.index({ requester: 1 });
studyBuddySchema.index({ helper: 1 });
studyBuddySchema.index({ createdAt: -1 });

module.exports = mongoose.model('StudyBuddy', studyBuddySchema);
