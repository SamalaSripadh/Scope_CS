const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Profile = require('../models/Profile');
const User = require('../models/User');
const platformAPI = require('../services/platformAPIs');
const platformLimits = require('../services/rateLimiter');

// Add or update profile
router.post('/:platform', auth, async (req, res) => {
  try {
    const { username } = req.body;
    const { platform } = req.params;

    console.log(`Received profile update request for ${platform}:`, {
      username,
      platform,
      userId: req.user.id
    });

    // Validate input
    if (!username || username.trim() === '') {
      return res.status(400).json({ 
        success: false,
        message: 'Username is required' 
      });
    }

    if (!['codechef', 'codeforces', 'leetcode', 'hackerrank'].includes(platform)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid platform' 
      });
    }

    // Check if user exists
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    console.log('Verifying platform profile...');
    // Verify the username exists on the platform
    let platformData;
    try {
      platformData = await platformAPI.getProfileData(platform, username);
      console.log('Platform data received:', platformData);
    } catch (platformError) {
      console.error(`Platform verification error for ${platform}:`, {
        error: platformError,
        message: platformError.message,
        stack: platformError.stack
      });
      return res.status(400).json({
        success: false,
        message: `Failed to verify ${platform} profile`,
        error: platformError.message
      });
    }

    try {
      let profile = await Profile.findOne({
        userId: req.user.id,
        platform
      });

      if (profile) {
        console.log('Updating existing profile');
        // Update existing profile
        profile.username = username;
        profile.score = platformData.score || 0;
        profile.problemsSolved = platformData.problemsSolved || 0;
        profile.rating = platformData.rating || 0;
        profile.rank = platformData.rank || 0;
        profile.maxRating = platformData.maxRating || 0;
        if (platform === 'codechef') {
          profile.stars = platformData.stars || 1;
          profile.contestCount = platformData.contestCount || 0;
        }
        profile.lastUpdated = Date.now();
        profile.lastUpdateStatus = 'success';
        profile.lastUpdateError = null;
      } else {
        console.log('Creating new profile');
        // Create new profile
        profile = new Profile({
          userId: req.user.id,
          platform,
          username,
          score: platformData.score || 0,
          problemsSolved: platformData.problemsSolved || 0,
          rating: platformData.rating || 0,
          rank: platformData.rank || 0,
          maxRating: platformData.maxRating || 0,
          ...(platform === 'codechef' && {
            stars: platformData.stars || 1,
            contestCount: platformData.contestCount || 0
          }),
          lastUpdateStatus: 'success'
        });
      }

      await profile.save();
      console.log('Profile saved successfully');

      // Update user's profiles
      await User.findByIdAndUpdate(req.user.id, {
        [`profiles.${platform}`]: username
      });

      res.json({
        success: true,
        profile: {
          platform,
          username,
          ...platformData,
          ...(platform === 'codechef' && {
            stars: platformData.stars || 1,
            contestCount: platformData.contestCount || 0
          }),
          lastUpdated: profile.lastUpdated,
          lastUpdateStatus: 'success'
        }
      });
    } catch (dbError) {
      console.error('Database error:', {
        error: dbError,
        message: dbError.message,
        stack: dbError.stack
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to save profile',
        error: dbError.message
      });
    }
  } catch (err) {
    console.error('Profile update error:', {
      error: err,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: err.message 
    });
  }
});

// Get user profiles
router.get('/', auth, async (req, res) => {
  try {
    const profiles = await Profile.find({ userId: req.user.id });
    const user = await User.findById(req.user.id).select('profiles');
    
    res.json({
      success: true,
      profiles: profiles.map(profile => ({
        platform: profile.platform,
        username: profile.username,
        score: profile.score,
        problemsSolved: profile.problemsSolved,
        rating: profile.rating,
        rank: profile.rank,
        maxRating: profile.maxRating,
        ...(profile.platform === 'codechef' && {
          stars: profile.stars,
          contestCount: profile.contestCount
        }),
        lastUpdated: profile.lastUpdated,
        lastUpdateStatus: profile.lastUpdateStatus,
        lastUpdateError: profile.lastUpdateError
      })),
      userProfiles: user.profiles
    });
  } catch (err) {
    console.error('Get profiles error:', {
      error: err,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update profile scores
router.put('/update-scores', auth, platformLimits.leetcode, async (req, res) => {
  try {
    const profiles = await Profile.find({ userId: req.user.id });
    let totalScore = 0;
    const updatedProfiles = [];

    for (let profile of profiles) {
      try {
        profile.updateAttempts += 1;
        
        console.log(`Updating score for ${profile.platform} profile...`);
        const platformData = await platformAPI.getProfileData(
          profile.platform,
          profile.username
        );
        console.log(`Score updated for ${profile.platform} profile:`);

        profile.score = platformData.score;
        profile.problemsSolved = platformData.problemsSolved;
        profile.rating = platformData.rating;
        profile.rank = platformData.rank;
        profile.maxRating = platformData.maxRating;
        if (profile.platform === 'codechef') {
          profile.stars = platformData.stars || 1;
          profile.contestCount = platformData.contestCount || 0;
        }
        profile.lastUpdated = Date.now();
        profile.lastUpdateStatus = 'success';
        profile.lastUpdateError = null;

        await profile.save();
        totalScore += profile.score;

        updatedProfiles.push({
          platform: profile.platform,
          username: profile.username,
          ...platformData,
          ...(profile.platform === 'codechef' && {
            stars: platformData.stars || 1,
            contestCount: platformData.contestCount || 0
          }),
          lastUpdated: profile.lastUpdated,
          lastUpdateStatus: 'success'
        });
      } catch (platformError) {
        console.error(`Error updating score for ${profile.platform} profile:`, {
          error: platformError,
          message: platformError.message,
          stack: platformError.stack
        });
        profile.lastUpdateStatus = 'error';
        profile.lastUpdateError = platformError.message;
        await profile.save();

        updatedProfiles.push({
          platform: profile.platform,
          username: profile.username,
          error: platformError.message,
          lastUpdateStatus: 'error',
          lastUpdated: profile.lastUpdated
        });
      }
    }

    await User.findByIdAndUpdate(req.user.id, { totalScore });

    res.json({
      success: true,
      message: 'Profiles updated',
      profiles: updatedProfiles,
      totalScore
    });
  } catch (err) {
    console.error('Update scores error:', {
      error: err,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
