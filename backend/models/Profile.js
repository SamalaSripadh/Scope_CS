const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['geeksforgeeks', 'codechef', 'codeforces', 'leetcode', 'hackerrank']
  },
  username: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    default: 0
  },
  problemsSolved: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0
  },
  stars: {
    type: Number,
    default: 1
  },
  contestCount: {
    type: Number,
    default: 0
  },
  rank: {
    type: String,
    default: 'unrated'
  },
  maxRating: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  lastUpdateStatus: {
    type: String,
    enum: ['success', 'error', 'pending'],
    default: 'pending'
  },
  lastUpdateError: {
    type: String,
    default: null
  },
  updateAttempts: {
    type: Number,
    default: 0
  }
});

// Add index for faster queries
profileSchema.index({ userId: 1, platform: 1 }, { unique: true });

// Update user's total score when profile score changes
profileSchema.post('save', async function(doc) {
  try {
    const scoreAggregator = require('../services/scoreAggregator');
    await scoreAggregator.updateUserTotalScore(doc.userId);
  } catch (err) {
    console.error('Error updating total score after profile save:', err);
  }
});

profileSchema.post('findOneAndUpdate', async function(doc) {
  if (doc) {
    try {
      const scoreAggregator = require('../services/scoreAggregator');
      await scoreAggregator.updateUserTotalScore(doc.userId);
    } catch (err) {
      console.error('Error updating total score after profile update:', err);
    }
  }
});

module.exports = mongoose.model('Profile', profileSchema);
