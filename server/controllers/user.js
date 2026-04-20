const User = require('../models/User');
const Task = require('../models/Task');
const redisClient = require('../config/redis');

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
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const cached = await redisClient.get('leaderboard');
    if (cached) return res.json(JSON.parse(cached));

    // Use aggregation pipeline to avoid N+1 queries
    const leaderboard = await Task.aggregate([
      {
        $group: {
          _id: '$user',
          totalDuration: {
            $sum: {
              $cond: [
                { $ne: ['$duration', null] },
                {
                  $let: {
                    vars: {
                      parts: { $split: ['$duration', ':'] }
                    },
                    in: {
                      $add: [
                        { $multiply: [{ $toInt: { $arrayElemAt: ['$$parts', 0] } }, 3600] },
                        { $multiply: [{ $toInt: { $arrayElemAt: ['$$parts', 1] } }, 60] },
                        { $toInt: { $arrayElemAt: ['$$parts', 2] } }
                      ]
                    }
                  }
                },
                0
              ]
            }
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

    await redisClient.set('leaderboard', JSON.stringify(leaderboard), { EX: 300 });
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