/**
 * @typedef {Object} Opportunity
 * @property {string} title
 * @property {string} action_text
 * @property {string} link
 * @property {string} opportunity_description
 * @property {string} why_it_matters
 * @property {string[]} who_can_get_involved
 * @property {string[]} internet_issue
 * @property {string} region
 * @property {string} Type
 * @property {string|null} date
 * @property {boolean|null} archived
 * @property {string|null} creation_date
 */

/**
 * @typedef {Object} CommunityEvent
 * @property {string} title
 * @property {string} description
 * @property {string} startDate - YYYY-MM-DD
 * @property {string} [endDate] - YYYY-MM-DD
 * @property {string} [startTime] - HH:MM
 * @property {string} [endTime] - HH:MM
 * @property {string} [timeZone]
 * @property {string} region
 * @property {string} type
 * @property {string} category
 * @property {string} format
 * @property {string} language
 * @property {string} organizer
 * @property {string} registrationUrl
 */

// Namespace for ISOC Utilities
window.ISOC = window.ISOC || {};

window.ISOC.Utils = {
    /**
     * Check if a date string is in the past
     * @param {string} dateString 
     * @returns {boolean}
     */
    isDateInPast: function (dateString) {
        if (!dateString || typeof dateString !== 'string') return false;
        if (dateString.trim().toLowerCase() === 'ongoing') return false;

        try {
            let date;
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                const [year, month, day] = dateString.split('-').map(Number);
                date = new Date(year, month - 1, day);
            } else {
                date = new Date(dateString);
            }

            if (isNaN(date.getTime())) return false;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return date < today;
        } catch (e) {
            console.warn('Error parsing date:', dateString, e);
            return false;
        }
    },

    /**
     * Format a date string into a human-readable format
     * @param {string} dateString 
     * @returns {string}
     */
    formatDate: function (dateString) {
        if (!dateString) return '';
        try {
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                const [year, month, day] = dateString.split('-').map(Number);
                return new Date(year, month - 1, day).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    },

    /**
     * Slugify a string
     * @param {string} text 
     * @returns {string}
     */
    slugify: function (text) {
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    },

    /**
     * Generate ICS content for an event
     * @param {Object} event
     * @param {string} event.title
     * @param {string} event.description
     * @param {string} event.startDate
     * @param {string} [event.startTime]
     * @param {string} [event.url]
     * @returns {string}
     */
    generateICS: function (event) {
        const { title, description, startDate: dateStr, startTime: timeStr, url } = event;

        // Parse date
        let startDate;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-').map(Number);
            startDate = new Date(year, month - 1, day);
        } else {
            startDate = new Date(dateStr);
        }

        if (timeStr) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            startDate.setHours(hours, minutes);
        }

        let icsDateFields = [];
        const formatDateTimeForICS = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', 'T') + 'Z';
        const formatDateOnlyForICS = (date) => date.toISOString().split('T')[0].replace(/-/g, '');

        if (timeStr) {
            const endDate = new Date(startDate);
            endDate.setHours(startDate.getHours() + 1);
            icsDateFields = [
                `DTSTART:${formatDateTimeForICS(startDate)}`,
                `DTEND:${formatDateTimeForICS(endDate)}`
            ];
        } else {
            icsDateFields = [
                'DTSTART;VALUE=DATE:' + formatDateOnlyForICS(startDate),
                'DTEND;VALUE=DATE:' + formatDateOnlyForICS(new Date(startDate.getTime() + 24 * 60 * 60 * 1000))
            ];
        }

        return [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Internet Society//Opportunities//EN',
            'BEGIN:VEVENT',
            `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', 'T')}Z`,
            ...icsDateFields,
            `SUMMARY:${title}`,
            `DESCRIPTION:${description}\\n\\nMore info: ${url}`,
            `URL:${url}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');
    },

    /**
     * Trigger a file download
     * @param {string} content 
     * @param {string} filename 
     * @param {string} type 
     */
    downloadFile: function (content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};
// Test change Fri Nov 28 14:38:07 CET 2025
// Another test Fri Nov 28 14:38:31 CET 2025
// Final test Fri Nov 28 14:39:40 CET 2025
// Final test of recursive staging Fri Nov 28 14:49:35 CET 2025
