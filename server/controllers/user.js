const User = require('../models/User');
const Task = require('../models/Task');
const { cacheGet, cacheSet, cacheDel } = require('../utils/cache');

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user;
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user;
    const { firstName, lastName } = req.body;
    if (!firstName || !lastName) return res.status(400).json({ message: 'First and last name required' });
    const user = await User.findByIdAndUpdate(userId, { firstName, lastName }, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    await cacheDel('leaderboard');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const cached = await cacheGet('leaderboard');
    if (cached) return res.json(cached);

    // Use aggregation pipeline to avoid N+1 queries
    const leaderboard = await Task.aggregate([
      {
        $addFields: {
          durationParts: { $split: [{ $ifNull: ['$duration', '00:00:00'] }, ':'] }
        }
      },
      {
        $group: {
          _id: '$user',
          totalDuration: {
            $sum: {
              $ifNull: [
                '$durationSeconds',
                {
                  $add: [
                    { $multiply: [{ $toInt: { $arrayElemAt: ['$durationParts', 0] } }, 3600] },
                    { $multiply: [{ $toInt: { $arrayElemAt: ['$durationParts', 1] } }, 60] },
                    { $toInt: { $arrayElemAt: ['$durationParts', 2] } }
                  ]
                }
              ]
            },
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $project: {
          userId: '$_id',
          firstName: '$userInfo.firstName',
          lastName: '$userInfo.lastName',
          totalDuration: 1,
          _id: 0
        }
      },
      {
        $sort: { totalDuration: -1 }
      }
    ]);

    await cacheSet('leaderboard', leaderboard, 120);
    res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateTask = async (req, res) => {
  try {
    // ... update logic ...
    res.json({ message: 'Task updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}; 
