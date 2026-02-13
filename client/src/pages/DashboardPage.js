import React, { useState, useMemo, useRef } from 'react';
import initialTasksData from '../utils/data';
import toast, { Toaster } from 'react-hot-toast';
import './css/dashboard.css';
import { getTasks, createTask, updateTask, deleteTask } from '../api';
import MonthlyChart from '../components/MonthlyChart';
import AverageDurationChart from '../components/AverageDurationChart';
import { Search, X, Filter, Calendar, ChevronDown, Plus, Edit2, Trash2, Check } from 'lucide-react';

const FILTERS = [
  { label: 'All', value: 'All' },
  { label: 'Daily', value: 'Daily' },
  { label: 'Weekly', value: 'Weekly' },
  { label: 'Monthly', value: 'Monthly' },
  { label: '6-Month', value: '6-Month' },
  { label: 'Yearly', value: 'Yearly' },
];

const SORTS = [
  { label: 'Date (Newest)', value: 'date_desc' },
  { label: 'Date (Oldest)', value: 'date_asc' },
  { label: 'Duration (Shortest)', value: 'duration_asc' },
  { label: 'Duration (Longest)', value: 'duration_desc' },
];

const VIEW_MODES = [
  { label: 'List View', value: 'list' },
  { label: 'Card View', value: 'card' },
];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: '2-digit'
  });
}

function formatDateRelative(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const diffTime = today - d;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(dateStr);
}

function sumDurations(durations) {
  let totalSeconds = durations.reduce((acc, t) => {
    const [h, m, s] = t.split(':').map(Number);
    return acc + h * 3600 + m * 60 + s;
  }, 0);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function durationToSeconds(duration) {
  const [h, m, s] = duration.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

function secondsToHours(seconds) {
  return (seconds / 3600).toFixed(2);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Color coding utility function based on duration ranges
function getDurationColor(hours) {
  if (hours === 0) return '#9CA3AF'; // Gray - No data
  if (hours <= 4) return '#EF4444';   // Red - Warning/Low
  if (hours <= 8) return '#10B981';   // Green - Success/Optimal
  return '#F59E0B';                   // Orange - Caution/High
}

function getDurationColorScheme(hours) {
  if (hours === 0) {
    return {
      main: '#9CA3AF',
      light: '#D1D5DB',
      bg: 'rgba(156, 163, 175, 0.05)',
      label: 'No Data'
    };
  }
  if (hours <= 4) {
    return {
      main: '#EF4444',
      light: '#FCA5A5',
      bg: 'rgba(239, 68, 68, 0.05)',
      label: 'Low (≤4h)'
    };
  }
  if (hours <= 8) {
    return {
      main: '#10B981',
      light: '#6EE7B7',
      bg: 'rgba(16, 185, 129, 0.05)',
      label: 'Optimal (4-8h)'
    };
  }
  return {
    main: '#F59E0B',
    light: '#FCD34D',
    bg: 'rgba(245, 158, 11, 0.05)',
    label: 'High (>8h)'
  };
}

const showToast = (fn, message) => {
  const id = fn(message);
  setTimeout(() => toast.dismiss(id), 5000);
};

const DashboardPage = () => {
  const [tasks, setTasks] = useState(initialTasksData);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date_desc');
  const [editTaskId, setEditTaskId] = useState(null);
  const [editForm, setEditForm] = useState({ tasks: '', duration: '' });
  const [addForm, setAddForm] = useState({ tasks: '', duration: '', date: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [viewMode, setViewMode] = useState('list');
  const [showFilters, setShowFilters] = useState(false);
  const tasksPerPage = 9;  // Changed from 7 to 9 to fill 3x3 grid in card view

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  React.useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await getTasks();
        setTasks(res.data);
      } catch (err) {
        toast.error('Failed to load tasks');
      }
    }
    fetchTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    let arr = [...tasks];

    // Month/Year filter
    if (selectedMonth && selectedYear) {
      arr = arr.filter(t => {
        const d = new Date(t.date);
        return (
          d.getMonth() + 1 === parseInt(selectedMonth) &&
          d.getFullYear() === parseInt(selectedYear)
        );
      });
    }

    // Date search: check for dd-mm-yy or dd-mm-yyyy
    const dateRegex = /^(\d{2})-(\d{2})-(\d{2,4})$/;
    if (search.trim() && dateRegex.test(search.trim())) {
      const [, dd, mm, y] = search.trim().match(dateRegex);
      const yyyy = y.length === 2 ? '20' + y : y;
      const dateStr = `${yyyy}-${mm}-${dd}`;
      arr = arr.filter(t => t.date === dateStr);
    } else {
      if (filter !== 'All') {
        const fromDate = (days) => addDays(today, -days);
        const dateCheck = (d) => {
          const date = new Date(d);
          return date >= fromDate(
            filter === 'Daily' ? 0 :
            filter === 'Weekly' ? 6 :
            filter === 'Monthly' ? 30 :
            filter === '6-Month' ? 182 :
            filter === 'Yearly' ? 365 : 0
          ) && date <= today;
        };
        arr = arr.filter(t => dateCheck(t.date));
      }
      if (search.trim()) {
        arr = arr.filter(task =>
          task.description?.some(desc =>
            desc.toLowerCase().includes(search.toLowerCase())
          )
        );
      }
    }

    arr.sort((a, b) => {
      if (sort === 'date_asc') return a.date.localeCompare(b.date);
      if (sort === 'date_desc') return b.date.localeCompare(a.date);
      if (sort === 'duration_asc') return durationToSeconds(a.duration) - durationToSeconds(b.duration);
      if (sort === 'duration_desc') return durationToSeconds(b.duration) - durationToSeconds(a.duration);
      return 0;
    });
    return arr;
  }, [tasks, filter, search, sort, selectedMonth, selectedYear, today]);

  // Calculate average durations for different time periods
  const averageDurations = useMemo(() => {
    const calculateAverage = (days) => {
      const fromDate = days !== null ? addDays(today, -days) : null;
      const relevantTasks = fromDate 
        ? tasks.filter(t => new Date(t.date) >= fromDate && new Date(t.date) <= today)
        : tasks;
      
      if (relevantTasks.length === 0) return 0;
      
      const totalSeconds = relevantTasks.reduce((acc, t) => acc + durationToSeconds(t.duration), 0);
      const uniqueDays = new Set(relevantTasks.map(t => t.date)).size || 1;
      return totalSeconds / uniqueDays;
    };

    // Calculate Overall - average across ALL sessions (not daily average)
    const calculateOverall = () => {
      if (tasks.length === 0) return 0;
      const totalSeconds = tasks.reduce((acc, t) => acc + durationToSeconds(t.duration), 0);
      return totalSeconds / tasks.length; // Mean duration per session
    };

    // Debug logging
    console.log('📊 Average Durations Calculation:');
    console.log('Weekly (7 days):', calculateAverage(7) / 3600, 'hours');
    console.log('Monthly (30 days):', calculateAverage(30) / 3600, 'hours');
    console.log('6-Month (182 days):', calculateAverage(182) / 3600, 'hours');
    console.log('Yearly (365 days):', calculateAverage(365) / 3600, 'hours');
    console.log('Overall (all sessions):', calculateOverall() / 3600, 'hours');

    return {
      weekly: calculateAverage(7),
      monthly: calculateAverage(30),
      sixMonth: calculateAverage(182),
      yearly: calculateAverage(365),
      overall: calculateOverall(), // NEW - replaces daily
    };
  }, [tasks, today]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filter, search, sort]);

  const groupedByDate = useMemo(() => {
    if (sort === 'date_asc' || sort === 'date_desc') {
      const byDate = {};
      filteredTasks.forEach(task => {
        if (!byDate[task.date]) byDate[task.date] = [];
        byDate[task.date].push(task);
      });
      const sortedDates = Object.keys(byDate).sort((a, b) =>
        sort === 'date_asc' ? a.localeCompare(b) : b.localeCompare(a)
      );
      return sortedDates.map(date => [date, byDate[date]]);
    } else {
      const sorted = [...filteredTasks].sort((a, b) => {
        if (sort === 'duration_asc') return durationToSeconds(a.duration) - durationToSeconds(b.duration);
        if (sort === 'duration_desc') return durationToSeconds(b.duration) - durationToSeconds(a.duration);
        return 0;
      });
      const byDate = [];
      let lastDate = null;
      let currentGroup = [];
      sorted.forEach(task => {
        if (task.date !== lastDate) {
          if (currentGroup.length) byDate.push([lastDate, currentGroup]);
          lastDate = task.date;
          currentGroup = [task];
        } else {
          currentGroup.push(task);
        }
      });
      if (currentGroup.length) byDate.push([lastDate, currentGroup]);
      return byDate;
    }
  }, [filteredTasks, sort]);

  const allTasks = groupedByDate.flatMap(([date, logs]) => 
    logs.map(task => ({ ...task, date }))
  );
  
  const totalPages = Math.ceil(allTasks.length / tasksPerPage);
  const startIndex = (currentPage - 1) * tasksPerPage;
  const endIndex = startIndex + tasksPerPage;
  const currentTasks = allTasks.slice(startIndex, endIndex);

  const currentPageGrouped = useMemo(() => {
    const byDate = {};
    currentTasks.forEach(task => {
      if (!byDate[task.date]) byDate[task.date] = [];
      byDate[task.date].push(task);
    });
    return Object.entries(byDate);
  }, [currentTasks]);

  const totalDuration = sumDurations(filteredTasks.map(t => t.duration));
  const uniqueDays = new Set(filteredTasks.map(t => t.date)).size || 1;

  const avgPerDay = (() => {
    const totalSeconds = filteredTasks.reduce((acc, t) => acc + durationToSeconds(t.duration), 0);
    const avg = Math.floor(totalSeconds / uniqueDays);
    const h = String(Math.floor(avg / 3600)).padStart(2, '0');
    const m = String(Math.floor((avg % 3600) / 60)).padStart(2, '0');
    const s = String(avg % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  })();

  const handleEdit = (task) => {
    setEditTaskId(task._id);
    setEditForm({
      tasks: (task.tasks || []).join('\n'),
      duration: task.duration
    });
  };

  const handleEditSubmit = async (e, task) => {
    e.preventDefault();
    try {
      const updated = {
        date: task.date,
        tasks: editForm.tasks.split('\n'),
        duration: editForm.duration
      };
      const res = await updateTask(task._id, updated);
      setTasks(prev => prev.map(t => t._id === task._id ? res.data : t));
      setEditTaskId(null);
      showToast(toast.success, 'Log updated!');
    } catch (err) {
      toast.error('Failed to update log');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.tasks.trim() || !addForm.duration.trim() || !addForm.date) return;
    try {
      const payload = {
        date: addForm.date,
        tasks: addForm.tasks.split('\n'),
        duration: addForm.duration
      };
      const res = await createTask(payload);
      setTasks(prev => [...prev, res.data]);
      setAddForm({ tasks: '', duration: '', date: todayStr });
      showToast(toast.success, 'Log created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add log');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTask(id);
      setTasks(prev => prev.filter(t => t._id !== id));
      showToast(toast.success, 'Log deleted!');
    } catch (err) {
      toast.error('Failed to delete log');
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const clearAllFilters = () => {
    setSelectedMonth('');
    setSelectedYear(String(new Date().getFullYear()));
    setFilter('All');
    setSearch('');
    setSort('date_desc');
  };

  const activeFilterCount = [
    selectedMonth,
    filter !== 'All',
    search,
    sort !== 'date_desc',
  ].filter(Boolean).length;

  return (
    <div className="dashboard-page">
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#1f2937',
          color: '#fff',
          borderRadius: '8px',
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: 500,
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }} />
      
      <div className="dashboard-container">
        <h2 className="dashboard-title">
          Study Analytics Dashboard
        </h2>

        {/* Monthly Chart */}
        <MonthlyChart tasks={tasks} />

        {/* Average Duration Chart - HORIZONTAL BAR CHART */}
        <AverageDurationChart averageDurations={averageDurations} />

        {/* Stats Cards */}
        <div className="stats-container">
          <StatCard label="Total Duration" value={totalDuration} icon="⏱️" />
          <StatCard label="Avg/Day" value={avgPerDay} icon="📊" />
          <StatCard label="Total Days" value={uniqueDays} icon="📅" />
        </div>

        {/* Advanced Search & Filter Section */}
        <div className="search-filter-wrapper">
          {/* Search Bar with Icon */}
          <div className="search-container">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Search by task or date (dd-mm-yy)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="modern-search-input"
            />
            {search && (
              <button 
                className="clear-search-btn"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter Toggle Button */}
          <button 
            className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            Filters
            {activeFilterCount > 0 && (
              <span className="filter-badge">{activeFilterCount}</span>
            )}
            <ChevronDown size={16} className={`chevron ${showFilters ? 'rotated' : ''}`} />
          </button>

          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            {VIEW_MODES.map(mode => (
              <button
                key={mode.value}
                className={`view-mode-btn ${viewMode === mode.value ? 'active' : ''}`}
                onClick={() => setViewMode(mode.value)}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Expandable Filter Panel */}
        <div className={`filter-panel ${showFilters ? 'expanded' : ''}`}>
          <div className="filter-grid">
            {/* Year Filter */}
            <div className="filter-item">
              <label className="filter-label">Year</label>
              <select
                value={selectedYear}
                onChange={e => {
                  setSelectedYear(e.target.value);
                  setSelectedMonth('');
                }}
                className="modern-select"
              >
                <option value="">All Years</option>
                {(() => {
                  const years = [];
                  const currentYear = new Date().getFullYear();
                  for (let y = currentYear; y >= currentYear - 10; y--) {
                    years.push(y);
                  }
                  return years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ));
                })()}
              </select>
            </div>

            {/* Month Filter */}
            {selectedYear && (
              <div className="filter-item">
                <label className="filter-label">Month</label>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="modern-select"
                >
                  <option value="">All Months</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Time Range Filter */}
            <div className="filter-item">
              <label className="filter-label">Time Range</label>
              <select 
                value={filter} 
                onChange={e => setFilter(e.target.value)} 
                className="modern-select"
              >
                {FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>

            {/* Sort Filter */}
            <div className="filter-item">
              <label className="filter-label">Sort By</label>
              <select 
                value={sort} 
                onChange={e => setSort(e.target.value)} 
                className="modern-select"
              >
                {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="filter-actions">
            <button 
              className="reset-filters-btn"
              onClick={clearAllFilters}
              disabled={activeFilterCount === 0}
            >
              <X size={16} />
              Reset All Filters
            </button>
          </div>
        </div>

        {/* Add Task Form */}
        <form onSubmit={handleAddSubmit} className="add-form modern-form">
          <div className="form-header">
            <Plus size={20} />
            <span className="form-title">Add New Task</span>
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                value={addForm.date}
                onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))}
                className="modern-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Duration (HH:MM:SS)</label>
              <input
                type="text"
                value={addForm.duration}
                onChange={e => setAddForm(f => ({ ...f, duration: e.target.value }))}
                placeholder="01:30:00"
                className="modern-input"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tasks</label>
            <textarea
              value={addForm.tasks}
              onChange={e => setAddForm(f => ({ ...f, tasks: e.target.value }))}
              rows={3}
              placeholder="1. Task description&#10;2. Task description"
              className="modern-textarea"
              required
            />
          </div>

          <button type="submit" className="submit-btn">
            <Plus size={18} />
            Add Task
          </button>
        </form>

        {/* Task List/Grid */}
        <div className="tasks-section">
          <div className="tasks-header">
            <h3 className="tasks-title">
              Tasks {filter !== 'All' && `(${filter})`}
            </h3>
            <span className="tasks-count">
              Showing {startIndex + 1}-{Math.min(endIndex, allTasks.length)} of {allTasks.length}
            </span>
          </div>

          {currentPageGrouped.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p className="empty-text">No tasks found</p>
              <p className="empty-subtext">Try adjusting your filters or add a new task</p>
            </div>
          ) : (
            <div className={`tasks-container ${viewMode}-view`}>
              {currentPageGrouped.map(([date, logs]) => (
                <div key={date} className="task-group">
                  <div className="task-group-header">
                    <Calendar size={16} />
                    <span className="task-date">{formatDate(date)}</span>
                    <span className="task-date-relative">({formatDateRelative(date)})</span>
                    <span className="task-count-badge">{logs.length}</span>
                  </div>
                  
                  {logs.map(task => (
                    <div key={task._id} className="task-card">
                      {editTaskId === task._id ? (
                        <form onSubmit={e => handleEditSubmit(e, task)} className="edit-form">
                          <textarea
                            value={editForm.tasks}
                            onChange={e => setEditForm(f => ({ ...f, tasks: e.target.value }))}
                            rows={3}
                            className="modern-textarea"
                          />
                          <input
                            type="text"
                            value={editForm.duration}
                            onChange={e => setEditForm(f => ({ ...f, duration: e.target.value }))}
                            className="modern-input"
                            placeholder="Duration"
                          />
                          <div className="edit-actions">
                            <button type="submit" className="save-btn">
                              <Check size={16} />
                              Save
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setEditTaskId(null)} 
                              className="cancel-btn"
                            >
                              <X size={16} />
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="task-content">
                            <div className="task-descriptions">
                              {(task.tasks || []).map((desc, i) => (
                                <div key={`${task._id}-${i}`} className="task-description-item">
                                  <span className="task-bullet">•</span>
                                  {desc}
                                </div>
                              ))}
                            </div>
                            <div className="task-meta">
                              <div className="task-duration">
                                <span className="duration-label">Duration:</span>
                                <span className="duration-value">{task.duration}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="task-actions">
                            <button 
                              onClick={() => handleEdit(task)} 
                              className="action-btn edit-btn"
                              aria-label="Edit task"
                            >
                              <Edit2 size={16} />
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDelete(task._id)} 
                              className="action-btn delete-btn"
                              aria-label="Delete task"
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                Previous
              </button>
              
              <div className="pagination-info">
                Page {currentPage} of {totalPages}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon }) => {
  // Handle both string (HH:MM:SS) and number values
  let hours = 0;
  
  if (typeof value === 'string' && value.includes(':')) {
    // Duration format: "HH:MM:SS"
    hours = parseFloat(value.split(':')[0]);
  } else if (typeof value === 'number') {
    // Number value (e.g., Total Days)
    hours = value;
  } else if (typeof value === 'string') {
    // Try to parse as number
    hours = parseFloat(value) || 0;
  }
  
  const colorScheme = getDurationColorScheme(hours);
  
  return (
    <div 
      className="stat-card"
      style={{
        borderLeft: `4px solid ${colorScheme.main}`,
        background: `linear-gradient(to right, ${colorScheme.bg}, white)`,
      }}
    >
      <div 
        className="stat-icon"
        style={{
          background: `linear-gradient(135deg, ${colorScheme.main} 0%, ${colorScheme.light} 100%)`,
        }}
      >
        {icon}
      </div>
      <div className="stat-content">
        <div className="stat-label">{label}</div>
        <div 
          className="stat-value"
          style={{
            color: colorScheme.main,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;