const User = require('../models/User');
const Task = require('../models/Task');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.0-flash";

// Helper function to convert duration string (HH:MM:SS) to hours
const durationToHours = (duration) => {
  if (!duration) return 0;
  const [h, m, s] = duration.split(':').map(Number);
  return h + m / 60 + s / 3600;
};

// Helper function to calculate average study hours
const calculateAverageStudyHours = (tasks) => {
  if (!tasks || tasks.length === 0) return 0;
  const totalHours = tasks.reduce((sum, task) => sum + durationToHours(task.duration), 0);
  return (totalHours / tasks.length).toFixed(2);
};

// Helper function to analyze study patterns
const analyzeStudyPatterns = (tasks) => {
  if (!tasks || tasks.length === 0) return { pattern: 'No data', recommendation: 'Start tracking your study sessions' };

  const avgHours = calculateAverageStudyHours(tasks);
  let pattern = '';
  let recommendation = '';

  if (avgHours > 5) {
    pattern = 'Very High Intensity Study';
    recommendation = 'You are a dedicated student! Make sure to take regular breaks every 50 minutes to avoid burnout.';
  } else if (avgHours > 3) {
    pattern = 'High Intensity Study';
    recommendation = 'Great consistency! Consider studying in focused 45-50 minute blocks with 10-minute breaks.';
  } else if (avgHours > 1.5) {
    pattern = 'Moderate Study';
    recommendation = 'Good effort! Try gradually increasing your study duration by 15 minutes each week.';
  } else if (avgHours > 0.5) {
    pattern = 'Light Study';
    recommendation = 'Start with small sessions. Aim for at least 30-60 minutes daily for better retention.';
  } else {
    pattern = 'Minimal Study';
    recommendation = 'Consider scheduling dedicated study time blocks in your calendar.';
  }

  return { pattern, recommendation, avgHours };
};

exports.chatWithBot = async (req, res) => {
  try {
    const { message } = req.body;

    // Validate message
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    let prompt = '';
    let userContext = {};

    if (req.user) {
      try {
        // Fetch comprehensive user data
        const user = await User.findById(req.user).select('firstName lastName email createdAt');
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Fetch all user tasks for deep analysis
        const allTasks = await Task.find({ user: req.user }).select('date tasks duration createdAt').lean();

        // Calculate comprehensive stats
        const totalStudyDays = allTasks.length;
        const totalDuration = allTasks.reduce((sum, task) => sum + durationToHours(task.duration), 0);
        const avgDailyHours = totalStudyDays > 0 ? (totalDuration / totalStudyDays).toFixed(2) : 0;
        const recentTasks = allTasks.slice(-7); // Last 7 days
        const recentAvgHours = calculateAverageStudyHours(recentTasks);

        // Analyze patterns
        const { pattern, recommendation, avgHours } = analyzeStudyPatterns(allTasks);

        // Get subject/task names from recent tasks
        const recentSubjects = [];
        recentTasks.forEach(task => {
          if (task.tasks && Array.isArray(task.tasks)) {
            recentSubjects.push(...task.tasks);
          }
        });
        const uniqueSubjects = [...new Set(recentSubjects)].slice(0, 5);

        userContext = {
          name: `${user.firstName || 'Student'} ${user.lastName || ''}`,
          totalStudyDays,
          totalDurationHours: totalDuration.toFixed(2),
          avgDailyHours,
          recentWeekAvgHours: recentAvgHours,
          studyPattern: pattern,
          recentSubjects: uniqueSubjects,
          accountAge: user.createdAt
        };

        prompt = `You are an expert, personalized study assistant AI for a study tracking application. Your goal is to provide highly relevant, actionable, and motivational study advice tailored to this specific student's profile and needs.

=== STUDENT PROFILE ===
Name: ${userContext.name}
Total Study Days Recorded: ${userContext.totalStudyDays}
Total Study Time: ${userContext.totalDurationHours} hours
Daily Average Study Time: ${userContext.avgDailyHours} hours
Last 7 Days Average: ${userContext.recentWeekAvgHours} hours
Current Study Pattern: ${userContext.studyPattern}
${userContext.recentSubjects.length > 0 ? `Recent Subjects: ${userContext.recentSubjects.join(', ')}` : 'No subjects recorded yet'}

=== PERSONALIZED RECOMMENDATION ===
${recommendation}

=== INSTRUCTIONS ===
1. Acknowledge their current study pattern and effort level
2. Provide specific, actionable advice tailored to their data
3. Use their recent subjects if available to give subject-specific tips
4. Motivate them based on their progress
5. Suggest next steps to improve their study routine
6. Keep responses concise but helpful (2-3 paragraphs max)
7. Be encouraging and positive

=== STUDENT'S QUESTION ===
"${message}"

Please provide a personalized response that addresses their question while considering their study profile above.`;
      } catch (dbError) {
        console.error('Database error while fetching user data:', dbError);
        // Fallback to generic mode
        prompt = `You are a study assistant AI. Provide helpful study advice. User message: "${message}"`;
      }
    } else {
      // For unauthenticated users, provide general study advice
      prompt = `You are a friendly study assistant AI for a study tracking application. Provide helpful, motivational study tips and general academic advice.

User question: "${message}"

Please provide practical study advice that would help any student.`;
    }

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const botResponse = response.text();

    res.json({ response: botResponse });
  } catch (error) {
    console.error('Chatbot error:', error);

    // Handle quota exceeded errors
    if (error.status === 429) {
      return res.status(429).json({
        error: 'Chatbot is temporarily unavailable due to high usage. Please try again in a few moments.',
        retryAfter: error.errorDetails?.[2]?.retryDelay || '30s'
      });
    }

    // Handle model not found errors
    if (error.status === 404) {
      return res.status(500).json({
        error: 'Study assistant is currently unavailable. Please contact support.',
        details: 'Model configuration error'
      });
    }

    // Handle authentication errors
    if (error.status === 401 || error.status === 403) {
      return res.status(500).json({
        error: 'Chatbot service configuration error. Please contact support.'
      });
    }

    res.status(500).json({ error: 'Failed to get response from chatbot.' });
  }
};
