/**
 * Format a date/timestamp to Vietnamese relative time string
 * @param {string|number} dateOrTimestamp - Date string or timestamp in milliseconds
 * @returns {string} Formatted relative time string in Vietnamese
 */
export function formatTimeAgo(dateOrTimestamp) {
    if (!dateOrTimestamp) return '';

    if (!dateOrTimestamp) return '';

    let date;
    if (typeof dateOrTimestamp === 'number') {
        date = new Date(dateOrTimestamp);
    } else {
        // Assume server sends UTC strings like "2024-03-20 15:30:00"
        // If it doesn't have 'Z' or timezone info, append 'Z' so browser treats it as UTC
        let dateStr = String(dateOrTimestamp);
        if (dateStr.includes(' ') && !dateStr.includes('T') && !dateStr.includes('Z')) {
            // Convert "YYYY-MM-DD HH:MM:SS" to "YYYY-MM-DDTHH:MM:SSZ"
            dateStr = dateStr.replace(' ', 'T') + 'Z';
        } else if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
            // For purely ISO-like strings without timezone
            dateStr += 'Z';
        }
        date = new Date(dateStr);
    }

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 30) return `${diffDays} ngày trước`;
    if (diffMonths < 12) return `${diffMonths} tháng trước`;
    return date.toLocaleDateString('vi-VN');
}

/**
 * Format a date string to Vietnamese locale date
 * @param {string} dateString - Date string
 * @returns {string} Formatted date string
 */
export function formatDate(dateString) {
    if (!dateString) return '';

    // Same UTC handling logic
    let formattedStr = String(dateString);
    if (formattedStr.includes(' ') && !formattedStr.includes('T') && !formattedStr.includes('Z')) {
        formattedStr = formattedStr.replace(' ', 'T') + 'Z';
    } else if (typeof dateString === 'string' && !formattedStr.endsWith('Z') && !formattedStr.includes('+')) {
        formattedStr += 'Z';
    }

    const date = new Date(formattedStr);
    return date.toLocaleDateString('vi-VN');
}

/**
 * Format view count to human readable string (K, M)
 * @param {number} views - Number of views
 * @returns {string} Formatted view count
 */
export function formatViews(views) {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views?.toString() || '0';
}
