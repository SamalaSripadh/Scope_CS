const User = require('../models/User');
const Profile = require('../models/Profile');

class ScoreAggregator {
  async updateUserTotalScore(userId) {
    try {
      // Get all profiles for the user
      const profiles = await Profile.find({ userId }).lean();
      
      // Calculate total score from all platforms
      const totalScore = profiles.reduce((total, profile) => {
        return total + (profile.score || 0);
      }, 0);

      // Update user's total score
      await User.findByIdAndUpdate(userId, { totalScore });
      
      return totalScore;
    } catch (err) {
      console.error('Error updating total score:', err);
      throw err;
    }
  }

  async updateAllUserScores() {
    try {
      const users = await User.find().select('_id').lean();
      
      // Update scores for all users
      const updates = users.map(user => this.updateUserTotalScore(user._id));
      await Promise.all(updates);
      
      return true;
    } catch (err) {
      console.error('Error updating all user scores:', err);
      throw err;
    }
  }
}

module.exports = new ScoreAggregator();
