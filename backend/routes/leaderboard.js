const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Profile = require('../models/Profile');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { 
      department, 
      section, 
      graduatingYear, 
      gender,
      sortBy = 'totalScore',
      order = 'desc',
      limit = 100
    } = req.query;

    console.log('Leaderboard Query:', { department, section, graduatingYear, gender, sortBy, order });

    // Build filter object
    const filter = {};
    if (department && department !== 'ALL') filter.department = department;
    if (section && section !== 'All') filter.section = section;
    if (graduatingYear && graduatingYear !== 'All') filter.graduatingYear = parseInt(graduatingYear);
    if (gender && gender !== 'All') filter.gender = gender;

    console.log('Filter:', filter);

    // Get users with their profiles
    const users = await User.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'profiles',
          localField: '_id',
          foreignField: 'userId',
          as: 'profilesArray'
        }
      },
      {
        $addFields: {
          codechefProfile: {
            $first: {
              $filter: {
                input: '$profilesArray',
                as: 'profile',
                cond: { $eq: ['$$profile.platform', 'codechef'] }
              }
            }
          },
          leetcodeProfile: {
            $first: {
              $filter: {
                input: '$profilesArray',
                as: 'profile',
                cond: { $eq: ['$$profile.platform', 'leetcode'] }
              }
            }
          },
          hackerrankProfile: {
            $first: {
              $filter: {
                input: '$profilesArray',
                as: 'profile',
                cond: { $eq: ['$$profile.platform', 'hackerrank'] }
              }
            }
          },
          codeforcesProfile: {
            $first: {
              $filter: {
                input: '$profilesArray',
                as: 'profile',
                cond: { $eq: ['$$profile.platform', 'codeforces'] }
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          rollNumber: 1,
          email: 1,
          department: 1,
          section: 1,
          graduatingYear: 1,
          gender: 1,
          codechefProfile: 1,
          codechefScore: { $ifNull: ['$codechefProfile.score', 0] },
          codechefRating: { $toInt: { $ifNull: ['$codechefProfile.rating', 0] } },
          codechefStars: {
            $cond: {
              if: { $eq: ['$codechefProfile', null] },
              then: 1,
              else: {
                $switch: {
                  branches: [
                    { case: { $lt: [{ $toInt: { $ifNull: ['$codechefProfile.rating', 0] } }, 1400] }, then: 1 },
                    { case: { $lt: [{ $toInt: { $ifNull: ['$codechefProfile.rating', 0] } }, 1600] }, then: 2 },
                    { case: { $lt: [{ $toInt: { $ifNull: ['$codechefProfile.rating', 0] } }, 1800] }, then: 3 },
                    { case: { $lt: [{ $toInt: { $ifNull: ['$codechefProfile.rating', 0] } }, 2000] }, then: 4 },
                    { case: { $lt: [{ $toInt: { $ifNull: ['$codechefProfile.rating', 0] } }, 2200] }, then: 5 },
                    { case: { $lt: [{ $toInt: { $ifNull: ['$codechefProfile.rating', 0] } }, 2500] }, then: 6 }
                  ],
                  default: 7
                }
              }
            }
          },
          hackerrankScore: { $ifNull: ['$hackerrankProfile.score', 0] },
          leetcodeScore: { $ifNull: ['$leetcodeProfile.score', 0] },
          codeforcesScore: { $ifNull: ['$codeforcesProfile.score', 0] }
        }
      },
      {
        $addFields: {
          totalScore: {
            $add: [
              '$codechefScore',
              '$hackerrankScore',
              '$leetcodeScore',
              '$codeforcesScore'
            ]
          }
        }
      },
      { $sort: { [sortBy]: order === 'desc' ? -1 : 1, _id: 1 } },
      { $limit: parseInt(limit) }
    ]);

    console.log(`Found ${users.length} users`);

    // Add ranks
    const usersWithRanks = users.map((user, index) => ({
      ...user,
      overallRank: index + 1
    }));

    console.log('Users with ranks:', usersWithRanks.map(user => ({
      name: user.name,
      codechefScore: user.codechefScore,
      codechefRating: user.codechefRating,
      codechefStars: user.codechefStars,
      codechefProfile: user.codechefProfile
    })));

    // Calculate department ranks
    const departmentGroups = {};
    usersWithRanks.forEach(user => {
      if (!departmentGroups[user.department]) {
        departmentGroups[user.department] = [];
      }
      departmentGroups[user.department].push(user);
    });

    const usersWithDepartmentRanks = usersWithRanks.map(user => {
      const deptUsers = departmentGroups[user.department];
      const deptRank = deptUsers.findIndex(u => u._id.toString() === user._id.toString()) + 1;
      return {
        ...user,
        departmentRank: deptRank
      };
    });

    console.log('Sending response with department ranks');
    res.json({
      success: true,
      users: usersWithDepartmentRanks,
      total: usersWithDepartmentRanks.length
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch leaderboard',
      error: err.message 
    });
  }
});

module.exports = router;