import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { getTasks, createTask, updateTask, deleteTask } from '../api';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

// Helper functions
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const getStartOfMonth = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

const getStartOf6Months = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() - 5, 1);
};

const getStartOfYear = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), 0, 1);
};

const parseDuration = (durationStr) => {
  if (!durationStr) return 0;
  if (typeof durationStr === 'number') return durationStr;
  const [h = '0', m = '0', s = '0'] = durationStr.split(':');
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
};

const filterTasksByDate = (tasks, startDate) => {
  return tasks.filter(task => {
    const taskDate = new Date(task.date);
    return taskDate >= startDate;
  });
};

const formatSecondsToHMS = (seconds) => {
  if (!isFinite(seconds) || seconds <= 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
};

const calculateAverageDuration = (tasks) => {
  if (!tasks.length) return '00:00:00';
  const total = tasks.reduce((sum, t) => sum + parseDuration(t.duration), 0);
  const avg = total / tasks.length;
  return formatSecondsToHMS(avg);
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const durationToSeconds = (duration) => {
  const [h, m, s] = duration.split(':').map(Number);
  return h * 3600 + m * 60 + s;
};

const sumDurations = (durations) => {
  let totalSeconds = durations.reduce((acc, t) => {
    const [h, m, s] = t.split(':').map(Number);
    return acc + h * 3600 + m * 60 + s;
  }, 0);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

export const AppProvider = ({ children }) => {
  const { isAuthenticated, authLoading } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTasks = useCallback(async () => {
    if (!isAuthenticated) {
      setTasks([]);
      setLoading(false);
      setError(null);
      return [];
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getTasks();
      const nextTasks = res.data.tasks || res.data || [];
      setTasks(nextTasks);
      return nextTasks;
    } catch (err) {
      setError(err);
      console.error('Failed to fetch tasks:', err);
      if (err.response?.status !== 401) {
        toast.error('Failed to load tasks');
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      fetchTasks();
    }
  }, [authLoading, fetchTasks]);

  // CRUD Operations
  const addTask = useCallback(async (taskData) => {
    try {
      const res = await createTask(taskData);
      setTasks(prev => [...prev, res.data]);
      toast.success('Task created successfully!');
      return { success: true, data: res.data };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to add task';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  const modifyTask = useCallback(async (taskId, updatedData) => {
    try {
      const res = await updateTask(taskId, updatedData);
      setTasks(prev => prev.map(t => t._id === taskId ? res.data : t));
      toast.success('Task updated successfully!');
      return { success: true, data: res.data };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update task';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  const removeTask = useCallback(async (taskId) => {
    try {
      await deleteTask(taskId);
      setTasks(prev => prev.filter(t => t._id !== taskId));
      toast.success('Task deleted successfully!');
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete task';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  // Calculate all global statistics using useMemo
  const statistics = useMemo(() => {
    const now = new Date();
    
    // Filter tasks by time periods
    const weeklyTasks = filterTasksByDate(tasks, getStartOfWeek(now));
    const monthlyTasks = filterTasksByDate(tasks, getStartOfMonth(now));
    const sixMonthTasks = filterTasksByDate(tasks, getStartOf6Months(now));
    const yearlyTasks = filterTasksByDate(tasks, getStartOfYear(now));

    // Average durations (per session)
    const averages = {
      weekly: calculateAverageDuration(weeklyTasks),
      monthly: calculateAverageDuration(monthlyTasks),
      sixMonthly: calculateAverageDuration(sixMonthTasks),
      yearly: calculateAverageDuration(yearlyTasks),
      overall: calculateAverageDuration(tasks),
    };

    // Average durations in seconds (for charts and comparisons)
    const averageDurationsInSeconds = {
      weekly: weeklyTasks.length ? weeklyTasks.reduce((sum, t) => sum + parseDuration(t.duration), 0) / weeklyTasks.length : 0,
      monthly: monthlyTasks.length ? monthlyTasks.reduce((sum, t) => sum + parseDuration(t.duration), 0) / monthlyTasks.length : 0,
      sixMonth: sixMonthTasks.length ? sixMonthTasks.reduce((sum, t) => sum + parseDuration(t.duration), 0) / sixMonthTasks.length : 0,
      yearly: yearlyTasks.length ? yearlyTasks.reduce((sum, t) => sum + parseDuration(t.duration), 0) / yearlyTasks.length : 0,
      overall: tasks.length ? tasks.reduce((sum, t) => sum + parseDuration(t.duration), 0) / tasks.length : 0,
    };

    // Daily averages (average per day, not per session)
    const calculateDailyAverage = (filteredTasks) => {
      if (!filteredTasks.length) return 0;
      const totalSeconds = filteredTasks.reduce((sum, t) => sum + parseDuration(t.duration), 0);
      const uniqueDays = new Set(filteredTasks.map(t => t.date)).size || 1;
      return totalSeconds / uniqueDays;
    };

    const dailyAverages = {
      weekly: calculateDailyAverage(weeklyTasks),
      monthly: calculateDailyAverage(monthlyTasks),
      sixMonth: calculateDailyAverage(sixMonthTasks),
      yearly: calculateDailyAverage(yearlyTasks),
      overall: calculateDailyAverage(tasks),
    };

    // Total statistics
    const totalDurationSeconds = tasks.reduce((sum, t) => sum + parseDuration(t.duration), 0);
    const totalDuration = formatSecondsToHMS(totalDurationSeconds);
    const totalTasks = tasks.length;
    const uniqueDays = new Set(tasks.map(t => t.date)).size;

    // Last activity date
    const lastTaskDate = tasks.length > 0 
      ? tasks.reduce((latest, t) => {
          const d = new Date(t.date);
          return d > latest ? d : latest;
        }, new Date(tasks[0].date)).toISOString().split('T')[0]
      : null;

    // Calculate streak
    const calculateStreak = () => {
      if (!tasks.length) return 0;
      const sortedDates = [...new Set(tasks.map(t => t.date))].sort((a, b) => new Date(b) - new Date(a));
      let currentStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < sortedDates.length; i++) {
        const date = new Date(sortedDates[i]);
        date.setHours(0, 0, 0, 0);
        
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - i);
        expectedDate.setHours(0, 0, 0, 0);

        if (date.getTime() === expectedDate.getTime()) {
          currentStreak++;
        } else {
          break;
        }
      }
      return currentStreak;
    };

    const currentStreak = calculateStreak();

    // Best performing period (highest average)
    const bestPeriod = Object.entries(averageDurationsInSeconds)
      .filter(([key]) => key !== 'overall')
      .sort((a, b) => b[1] - a[1])[0];

    // AI Insights data
    const aiInsights = {
      performance: {
        totalStudyHours: totalDuration,
        weeklyAverage: averages.weekly,
        monthlyAverage: averages.monthly,
        sixMonthAverage: averages.sixMonthly,
        yearlyAverage: averages.yearly,
        overallAverage: averages.overall,
        bestPeriod: bestPeriod ? bestPeriod[0] : 'N/A',
        bestAverage: bestPeriod ? formatSecondsToHMS(bestPeriod[1]) : '00:00:00',
      },
      consistency: {
        currentStreak,
        totalActiveDays: uniqueDays,
        totalSessions: totalTasks,
        averageSessionsPerDay: uniqueDays > 0 ? (totalTasks / uniqueDays).toFixed(2) : '0',
      },
      productivity: {
        weeklyProductivity: averageDurationsInSeconds.weekly > 0 ? 'Active' : 'Inactive',
        monthlyTrend: averageDurationsInSeconds.monthly >= averageDurationsInSeconds.yearly ? 'Improving' : 'Declining',
        consistencyScore: currentStreak >= 7 ? 'Excellent' : currentStreak >= 3 ? 'Good' : 'Needs Improvement',
      },
    };

    return {
      averages,
      averageDurationsInSeconds,
      dailyAverages,
      totalDuration,
      totalDurationSeconds,
      totalTasks,
      uniqueDays,
      lastTaskDate,
      currentStreak,
      bestPeriod: bestPeriod ? bestPeriod[0] : null,
      aiInsights,
      weeklyTasks,
      monthlyTasks,
      sixMonthTasks,
      yearlyTasks,
    };
  }, [tasks]);

  const value = {
    // Core data
    tasks,
    loading,
    error,
    
    // Actions
    fetchTasks,
    addTask,
    modifyTask,
    removeTask,
    
    // Statistics (all memoized)
    ...statistics,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Export helper functions for use in components
export { parseDuration, formatSecondsToHMS, durationToSeconds, sumDurations, addDays };
