#!/usr/bin/env node

/**
 * Data Validation Script for ISOC Opportunities
 * Validates JSON data files before deployment
 */

const fs = require('fs');
const path = require('path');

const OPPORTUNITIES_FILE = path.join(__dirname, '../data/opportunities.json');
const EVENTS_FILE = path.join(__dirname, '../community-events/data/events.json');

let hasErrors = false;

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string[]} errors
 */

/**
 * Validate a date string
 * @param {string} dateStr 
 * @returns {boolean}
 */
function isValidDate(dateStr) {
    if (!dateStr) return true; // null dates are allowed
    if (dateStr.toLowerCase() === 'ongoing') return true;

    // Check YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}

/**
 * Validate opportunities.json
 * @param {Array} data 
 * @returns {ValidationResult}
 */
function validateOpportunities(data) {
    const errors = [];

    if (!Array.isArray(data)) {
        return { valid: false, errors: ['Data must be an array'] };
    }

    data.forEach((item, index) => {
        // Require title
        const title = item["Outreach Activity [Title]"] || item.title;
        if (!title || typeof title !== 'string' || title.trim() === '') {
            errors.push(`Item ${index}: Missing or empty title`);
        }

        // Validate date if present
        const date = item["Deadline"] || item["Date"] || item.date;
        if (date && !isValidDate(date)) {
            errors.push(`Item ${index} ("${title}"): Invalid date format "${date}". Expected YYYY-MM-DD or "Ongoing"`);
        }

        // Link should be a valid URL if present
        const link = item["Link"] || item.link;
        if (link && typeof link === 'string' && link.trim() && !link.startsWith('http')) {
            errors.push(`Item ${index} ("${title}"): Link must start with http:// or https://`);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate events.json
 * @param {Array} data 
 * @returns {ValidationResult}
 */
function validateEvents(data) {
    const errors = [];

    if (!Array.isArray(data)) {
        return { valid: false, errors: ['Data must be an array'] };
    }

    data.forEach((item, index) => {
        // Require title
        if (!item.title || typeof item.title !== 'string' || item.title.trim() === '') {
            errors.push(`Item ${index}: Missing or empty title`);
        }

        // Validate start date
        if (item.startDate && !isValidDate(item.startDate)) {
            errors.push(`Item ${index} ("${item.title}"): Invalid startDate format "${item.startDate}". Expected YYYY-MM-DD`);
        }

        // Validate end date
        if (item.endDate && !isValidDate(item.endDate)) {
            errors.push(`Item ${index} ("${item.title}"): Invalid endDate format "${item.endDate}". Expected YYYY-MM-DD`);
        }

        // Registration URL should be valid if present
        if (item.registrationUrl && typeof item.registrationUrl === 'string' && item.registrationUrl.trim() && !item.registrationUrl.startsWith('http')) {
            errors.push(`Item ${index} ("${item.title}"): registrationUrl must start with http:// or https://`);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
}

// Run validation
console.log('🔍 Validating ISOC Opportunities data files...\n');

// Validate opportunities.json
if (fs.existsSync(OPPORTUNITIES_FILE)) {
    try {
        const data = JSON.parse(fs.readFileSync(OPPORTUNITIES_FILE, 'utf8'));
        const result = validateOpportunities(data);

        if (result.valid) {
            console.log(`✅ opportunities.json is valid (${data.length} items)`);
        } else {
            console.error(`❌ opportunities.json has ${result.errors.length} error(s):`);
            result.errors.forEach(err => console.error(`   - ${err}`));
            hasErrors = true;
        }
    } catch (err) {
        console.error(`❌ Failed to parse opportunities.json: ${err.message}`);
        hasErrors = true;
    }
} else {
    console.warn(`⚠️  opportunities.json not found`);
}

// Validate events.json
if (fs.existsSync(EVENTS_FILE)) {
    try {
        const data = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
        const result = validateEvents(data);

        if (result.valid) {
            console.log(`✅ events.json is valid (${data.length} items)`);
        } else {
            console.error(`❌ events.json has ${result.errors.length} error(s):`);
            result.errors.forEach(err => console.error(`   - ${err}`));
            hasErrors = true;
        }
    } catch (err) {
        console.error(`❌ Failed to parse events.json: ${err.message}`);
        hasErrors = true;
    }
} else {
    console.warn(`⚠️  events.json not found`);
}

console.log('\n' + (hasErrors ? '❌ Validation failed' : '✅ All validations passed'));
process.exit(hasErrors ? 1 : 0);
