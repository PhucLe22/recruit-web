/**
 * Handlebars helpers for the application
 */

/**
 * Check if value is equal to another value
 */
const eq = (a, b) => a === b;

/**
 * Check if value is greater than another value
 */
const gt = (a, b) => a > b;

/**
 * Subtract two numbers
 */
const subtract = (a, b) => a - b;

/**
 * Add two numbers
 */
const add = (a, b) => a + b;

/**
 * Generate an array of numbers from 1 to n
 */
const times = (n, block) => {
  let accum = '';
  for (let i = 1; i <= n; i++) {
    accum += block.fn(i);
  }
  return accum;
};

/**
 * Truncate text to a specified length
 */
const truncate = (str, len) => {
  if (!str || typeof str !== 'string') return '';
  if (str.length <= len) return str;
  return str.substring(0, len);
};

/**
 * Format date for display
 */
const formatDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Format ISO date for input fields
 */
const formatISODate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Format time in a user-friendly way (time ago format)
 */
const formatTime = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    // For older dates, show the actual date
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
};

/**
 * Generate pagination range array
 */
const paginationRange = (currentPage, totalPages) => {
    const range = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    
    for (let i = start; i <= end; i++) {
        range.push(i);
    }
    
    return range;
};

module.exports = {
    eq,
    gt,
    subtract,
    add,
    times,
    truncate,
    formatDate,
    formatISODate,
    formatTime,
    paginationRange
};
