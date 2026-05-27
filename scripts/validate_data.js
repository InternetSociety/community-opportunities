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
let warningCount = 0;

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
 * Normalize and validate a web URL.
 * - Accepts URLs with http/https.
 * - Auto-adds https:// when missing and host/path look valid.
 * - Returns null when URL cannot be normalized to a safe web URL.
 * @param {string} rawValue
 * @returns {{ normalizedUrl: string|null, status: 'empty'|'valid'|'autofixed'|'invalid', reason?: string }}
 */
function normalizeWebUrl(rawValue) {
    if (rawValue === null || rawValue === undefined) {
        return { normalizedUrl: null, status: 'empty' };
    }

    const value = String(rawValue).trim();
    if (!value) {
        return { normalizedUrl: null, status: 'empty' };
    }

    const hasScheme = /^https?:\/\//i.test(value);
    const candidate = hasScheme ? value : `https://${value}`;

    try {
        const parsed = new URL(candidate);
        const protocol = parsed.protocol.toLowerCase();
        if (protocol !== 'http:' && protocol !== 'https:') {
            return { normalizedUrl: null, status: 'invalid', reason: 'unsupported protocol' };
        }
        if (!parsed.hostname || /\s/.test(parsed.hostname)) {
            return { normalizedUrl: null, status: 'invalid', reason: 'invalid hostname' };
        }
        return {
            normalizedUrl: parsed.toString(),
            status: hasScheme ? 'valid' : 'autofixed'
        };
    } catch (err) {
        return { normalizedUrl: null, status: 'invalid', reason: 'URL parse failed' };
    }
}

/**
 * Validate opportunities.json
 * @param {Array} data 
 * @returns {ValidationResult}
 */
function validateOpportunities(data) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(data)) {
        return { valid: false, errors: ['Data must be an array'] };
    }

    data.forEach((item, index) => {
        // Smartsheet may occasionally emit an empty placeholder row.
        // Ignore records with no meaningful values instead of failing CI.
        const hasMeaningfulValue = Object.values(item).some(value => {
            if (value === null || value === undefined) return false;
            if (typeof value === 'string') return value.trim() !== '';
            return true;
        });
        if (!hasMeaningfulValue) {
            return;
        }

        // Require title
        const title = item["Outreach Activity [Title]"] || item.title;
        if (!title || typeof title !== 'string' || title.trim() === '') {
            // Treat untitled placeholder rows as ignorable when they only
            // contain metadata fields that Smartsheet may auto-populate.
            const substantiveFields = Object.entries(item).filter(([key, value]) => {
                if (value === null || value === undefined) return false;
                if (typeof value === 'string' && value.trim() === '') return false;
                return !['Archived', 'Creation date'].includes(key);
            });
            if (substantiveFields.length <= 1) {
                return;
            }

            errors.push(`Item ${index}: Missing or empty title`);
        }

        // Validate date if present
        const date = item["Deadline"] || item["Date"] || item.date;
        if (date && !isValidDate(date)) {
            errors.push(`Item ${index} ("${title}"): Invalid date format "${date}". Expected YYYY-MM-DD or "Ongoing"`);
        }

        // Link should be a valid URL if present
        const link = item["Link"] || item.link;
        const normalized = normalizeWebUrl(link);
        if (normalized.status === 'autofixed') {
            warnings.push(`Item ${index} ("${title}"): Link missing protocol, auto-normalized to "${normalized.normalizedUrl}"`);
        } else if (normalized.status === 'invalid') {
            warnings.push(`Item ${index} ("${title}"): Link is invalid and will be ignored ("${String(link).trim()}")`);
        }
    });

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validate events.json
 * @param {Array} data 
 * @returns {ValidationResult}
 */
function validateEvents(data) {
    const errors = [];
    const warnings = [];

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
        const normalized = normalizeWebUrl(item.registrationUrl);
        if (normalized.status === 'autofixed') {
            warnings.push(`Item ${index} ("${item.title}"): registrationUrl missing protocol, auto-normalized to "${normalized.normalizedUrl}"`);
        } else if (normalized.status === 'invalid') {
            warnings.push(`Item ${index} ("${item.title}"): registrationUrl is invalid and will be ignored ("${String(item.registrationUrl).trim()}")`);
        }
    });

    return {
        valid: errors.length === 0,
        errors,
        warnings
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
        if (result.warnings && result.warnings.length > 0) {
            console.warn(`⚠️  opportunities.json has ${result.warnings.length} warning(s):`);
            result.warnings.forEach(warn => console.warn(`   - ${warn}`));
            warningCount += result.warnings.length;
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
        if (result.warnings && result.warnings.length > 0) {
            console.warn(`⚠️  events.json has ${result.warnings.length} warning(s):`);
            result.warnings.forEach(warn => console.warn(`   - ${warn}`));
            warningCount += result.warnings.length;
        }
    } catch (err) {
        console.error(`❌ Failed to parse events.json: ${err.message}`);
        hasErrors = true;
    }
} else {
    console.warn(`⚠️  events.json not found`);
}

console.log(`\nSummary: ${hasErrors ? 'errors present' : 'no blocking errors'}, ${warningCount} warning(s)`);
console.log('\n' + (hasErrors ? '❌ Validation failed' : '✅ All validations passed'));
process.exit(hasErrors ? 1 : 0);
