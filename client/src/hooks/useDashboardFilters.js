import { useState, useMemo, useEffect } from 'react';
import { useApp, durationToSeconds, addDays } from '../context/AppContext';

export const useDashboardFilters = () => {
  const { tasks } = useApp();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date_desc');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState(''); // NEW: Date picker

  const today = new Date();

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search, sort, selectedMonth, selectedYear, selectedDate]);

  // Filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    let arr = [...tasks];

    // Date picker filter (takes priority)
    if (selectedDate) {
      arr = arr.filter(t => t.date === selectedDate);
      // If date picker is active, skip other filters
      arr.sort((a, b) => {
        if (sort === 'date_asc') return a.date.localeCompare(b.date);
        if (sort === 'date_desc') return b.date.localeCompare(a.date);
        if (sort === 'duration_asc') return durationToSeconds(a.duration) - durationToSeconds(b.duration);
        if (sort === 'duration_desc') return durationToSeconds(b.duration) - durationToSeconds(a.duration);
        return 0;
      });
      return arr;
    }

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

    // Date search: check for dd-mm-yy or dd-mm-yyyy or yyyy-mm-dd
    const dateRegexDDMMYY = /^(\d{2})-(\d{2})-(\d{2,4})$/;
    const dateRegexYYYYMMDD = /^(\d{4})-(\d{2})-(\d{2})$/;
    
    if (search.trim() && dateRegexYYYYMMDD.test(search.trim())) {
      // Format: yyyy-mm-dd (matches database format)
      arr = arr.filter(t => t.date === search.trim());
    } else if (search.trim() && dateRegexDDMMYY.test(search.trim())) {
      // Format: dd-mm-yy or dd-mm-yyyy
      const [, dd, mm, y] = search.trim().match(dateRegexDDMMYY);
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
          ) || task.tasks?.some(desc =>
            desc.toLowerCase().includes(search.toLowerCase())
          )
        );
      }
    }

    // Sort
    arr.sort((a, b) => {
      if (sort === 'date_asc') return a.date.localeCompare(b.date);
      if (sort === 'date_desc') return b.date.localeCompare(a.date);
      if (sort === 'duration_asc') return durationToSeconds(a.duration) - durationToSeconds(b.duration);
      if (sort === 'duration_desc') return durationToSeconds(b.duration) - durationToSeconds(a.duration);
      return 0;
    });
    
    return arr;
  }, [tasks, filter, search, sort, selectedMonth, selectedYear, selectedDate, today]);

  // Group tasks by date
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

  // Filter statistics
  const filterStats = useMemo(() => {
    const uniqueDays = new Set(filteredTasks.map(t => t.date)).size || 1;
    const totalSeconds = filteredTasks.reduce((acc, t) => acc + durationToSeconds(t.duration), 0);
    
    const avgPerDay = (() => {
      const avg = Math.floor(totalSeconds / uniqueDays);
      const h = String(Math.floor(avg / 3600)).padStart(2, '0');
      const m = String(Math.floor((avg % 3600) / 60)).padStart(2, '0');
      const s = String(avg % 60).padStart(2, '0');
      return `${h}:${m}:${s}`;
    })();

    const totalDuration = (() => {
      const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const s = String(totalSeconds % 60).padStart(2, '0');
      return `${h}:${m}:${s}`;
    })();

    return {
      totalDuration,
      avgPerDay,
      uniqueDays,
      totalTasks: filteredTasks.length,
    };
  }, [filteredTasks]);

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedMonth('');
    setSelectedYear(String(new Date().getFullYear()));
    setFilter('All');
    setSearch('');
    setSort('date_desc');
    setSelectedDate(''); // Clear date picker
  };

  // Active filter count
  const activeFilterCount = [
    selectedMonth,
    filter !== 'All',
    search,
    sort !== 'date_desc',
    selectedDate, // Include date picker
  ].filter(Boolean).length;

  return {
    // Filter states
    filter,
    setFilter,
    search,
    setSearch,
    sort,
    setSort,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    currentPage,
    setCurrentPage,
    selectedDate,
    setSelectedDate,
    
    // Computed data
    filteredTasks,
    groupedByDate,
    filterStats,
    activeFilterCount,
    
    // Actions
    clearAllFilters,
  };
};