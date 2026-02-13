import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import StreakGraph from '../components/StreakGraph.jsx';
import './css/tracking.css';

const TrackingPage = () => {
  const { 
    loading, 
    error, 
    aiInsights,
    averages,
    totalDuration,
    totalTasks,
    uniqueDays,
    lastTaskDate,
    currentStreak,
    fetchTasks,
  } = useApp();
  
  const [activeTab, setActiveTab] = useState('insights');

  if (loading) {
    return (
      <div className="tracking-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your study insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tracking-page">
        <div className="error-state">
          <h2>Unable to load data</h2>
          <p>Please try again later</p>
          <button onClick={fetchTasks} className="retry-btn">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tracking-page">
      {/* Header */}
      <div className="tracking-header">
        <h1>Study Insights</h1>
        <p>Data-driven analysis of your learning patterns</p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          Insights
        </button>
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Statistics
        </button>
        <button
          className={`tab-btn ${activeTab === 'streak' ? 'active' : ''}`}
          onClick={() => setActiveTab('streak')}
        >
          Streak
        </button>
      </div>

      {/* INSIGHTS TAB */}
      {activeTab === 'insights' && (
        <div className="insights-content">
          {/* Key Metrics Row */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon">📊</div>
              <div className="metric-content">
                <p className="metric-label">Current Streak</p>
                <p className="metric-value">{currentStreak} days</p>
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-icon">⏱️</div>
              <div className="metric-content">
                <p className="metric-label">Total Study Time</p>
                <p className="metric-value">{totalDuration}</p>
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-icon">📅</div>
              <div className="metric-content">
                <p className="metric-label">Active Days</p>
                <p className="metric-value">{uniqueDays}</p>
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-icon">✅</div>
              <div className="metric-content">
                <p className="metric-label">Total Sessions</p>
                <p className="metric-value">{totalTasks}</p>
              </div>
            </div>
          </div>

          {/* Performance Overview */}
          <div className="section-card">
            <h2 className="section-title">Performance Overview</h2>
            <div className="data-grid">
              <div className="data-item">
                <span className="data-label">Weekly Average</span>
                <span className="data-value">{aiInsights.performance.weeklyAverage}</span>
              </div>
              <div className="data-item">
                <span className="data-label">Monthly Average</span>
                <span className="data-value">{aiInsights.performance.monthlyAverage}</span>
              </div>
              <div className="data-item">
                <span className="data-label">6-Month Average</span>
                <span className="data-value">{aiInsights.performance.sixMonthAverage}</span>
              </div>
              <div className="data-item">
                <span className="data-label">Yearly Average</span>
                <span className="data-value">{aiInsights.performance.yearlyAverage}</span>
              </div>
              <div className="data-item highlight">
                <span className="data-label">Best Period</span>
                <span className="data-value">{aiInsights.performance.bestPeriod}</span>
              </div>
              <div className="data-item highlight">
                <span className="data-label">Best Average</span>
                <span className="data-value">{aiInsights.performance.bestAverage}</span>
              </div>
            </div>
          </div>

          {/* Consistency Metrics */}
          <div className="section-card">
            <h2 className="section-title">Consistency Metrics</h2>
            <div className="consistency-content">
              <div className="consistency-item">
                <div className="consistency-stat">
                  <span className="stat-number">{currentStreak}</span>
                  <span className="stat-unit">day streak</span>
                </div>
                <p className="stat-description">Keep it up! Consistency is key to success.</p>
              </div>
              
              <div className="consistency-item">
                <div className="consistency-stat">
                  <span className="stat-number">{aiInsights.consistency.averageSessionsPerDay}</span>
                  <span className="stat-unit">sessions/day</span>
                </div>
                <p className="stat-description">Your average study sessions per active day.</p>
              </div>
              
              <div className="consistency-item">
                <div className="consistency-stat">
                  <span className="stat-number">{aiInsights.productivity.consistencyScore}</span>
                  <span className="stat-unit">score</span>
                </div>
                <p className="stat-description">
                  {aiInsights.productivity.consistencyScore === 'Excellent' && 'Outstanding consistency! Keep going.'}
                  {aiInsights.productivity.consistencyScore === 'Good' && 'Good progress. Try to study daily.'}
                  {aiInsights.productivity.consistencyScore === 'Needs Improvement' && 'Build a daily study habit.'}
                </p>
              </div>
            </div>
          </div>

          {/* Study Patterns */}
          <div className="section-card">
            <h2 className="section-title">Study Patterns</h2>
            <div className="patterns-grid">
              <div className="pattern-card">
                <div className="pattern-header">
                  <span className="pattern-icon">📈</span>
                  <span className="pattern-title">Trend</span>
                </div>
                <p className="pattern-value">{aiInsights.productivity.monthlyTrend}</p>
                <p className="pattern-desc">
                  {aiInsights.productivity.monthlyTrend === 'Improving' 
                    ? 'Your study duration is increasing over time.'
                    : 'Focus on maintaining consistent study sessions.'}
                </p>
              </div>
              
              <div className="pattern-card">
                <div className="pattern-header">
                  <span className="pattern-icon">⚡</span>
                  <span className="pattern-title">Activity</span>
                </div>
                <p className="pattern-value">{aiInsights.productivity.weeklyProductivity}</p>
                <p className="pattern-desc">
                  {aiInsights.productivity.weeklyProductivity === 'Active'
                    ? 'You have been actively studying this week.'
                    : 'Start building your study routine.'}
                </p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="section-card recommendations">
            <h2 className="section-title">Recommendations</h2>
            <div className="recommendations-list">
              {currentStreak < 7 && (
                <div className="recommendation-item">
                  <span className="rec-icon">🎯</span>
                  <div className="rec-content">
                    <p className="rec-title">Build a Streak</p>
                    <p className="rec-desc">Try to study every day to build a strong habit. Current streak: {currentStreak} days.</p>
                  </div>
                </div>
              )}
              
              {currentStreak >= 7 && (
                <div className="recommendation-item">
                  <span className="rec-icon">🔥</span>
                  <div className="rec-content">
                    <p className="rec-title">Great Streak!</p>
                    <p className="rec-desc">You've studied {currentStreak} days in a row. Keep maintaining this excellent habit!</p>
                  </div>
                </div>
              )}
              
              {parseFloat(aiInsights.consistency.averageSessionsPerDay) < 2 && (
                <div className="recommendation-item">
                  <span className="rec-icon">📚</span>
                  <div className="rec-content">
                    <p className="rec-title">Increase Study Frequency</p>
                    <p className="rec-desc">Consider multiple study sessions per day for better retention and focus.</p>
                  </div>
                </div>
              )}
              
              <div className="recommendation-item">
                <span className="rec-icon">💡</span>
                <div className="rec-content">
                  <p className="rec-title">Optimize Study Time</p>
                  <p className="rec-desc">Your best performing period is {aiInsights.performance.bestPeriod}. Try to replicate that pattern.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATISTICS TAB */}
      {activeTab === 'stats' && (
        <div className="stats-content">
          <div className="stats-grid-page">
            <div className="stat-box">
              <p className="stat-box-label">Total Sessions</p>
              <p className="stat-box-value">{totalTasks}</p>
              <p className="stat-box-desc">Study sessions completed</p>
            </div>
            
            <div className="stat-box">
              <p className="stat-box-label">Total Time</p>
              <p className="stat-box-value">{totalDuration}</p>
              <p className="stat-box-desc">Hours spent studying</p>
            </div>
            
            <div className="stat-box">
              <p className="stat-box-label">Active Days</p>
              <p className="stat-box-value">{uniqueDays}</p>
              <p className="stat-box-desc">Days with study activity</p>
            </div>
            
            <div className="stat-box">
              <p className="stat-box-label">Last Activity</p>
              <p className="stat-box-value">
                {lastTaskDate ? new Date(lastTaskDate).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                }) : 'N/A'}
              </p>
              <p className="stat-box-desc">Most recent session</p>
            </div>
          </div>

          {/* Average Durations */}
          <div className="section-card">
            <h2 className="section-title">Average Study Durations</h2>
            <div className="averages-list">
              <div className="average-row">
                <span className="avg-period">Weekly</span>
                <span className="avg-value">{averages.weekly}</span>
              </div>
              <div className="average-row">
                <span className="avg-period">Monthly</span>
                <span className="avg-value">{averages.monthly}</span>
              </div>
              <div className="average-row">
                <span className="avg-period">6-Month</span>
                <span className="avg-value">{averages.sixMonthly}</span>
              </div>
              <div className="average-row">
                <span className="avg-period">Yearly</span>
                <span className="avg-value">{averages.yearly}</span>
              </div>
              <div className="average-row highlight">
                <span className="avg-period">Overall</span>
                <span className="avg-value">{averages.overall}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STREAK TAB */}
      {activeTab === 'streak' && <StreakGraph />}
    </div>
  );
};

export default TrackingPage;