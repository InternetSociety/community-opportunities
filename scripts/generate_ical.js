const fs = require('fs');
const path = require('path');
const { v5: uuidv5 } = require('uuid');

// Configuration
const OPPORTUNITIES_JSON = path.join(__dirname, '../data/opportunities.json');
const EVENTS_JSON = path.join(__dirname, '../community-events/data/events.json');
const OPPORTUNITIES_ICAL = path.join(__dirname, '../data/opportunities.ics');
const EVENTS_ICAL = path.join(__dirname, '../community-events/data/events.ics');
const SITE_URL = 'https://opportunities.internetsociety.org';

// A unique, stable namespace for generating UUIDs. This should never change.
const UUID_NAMESPACE = 'a3b7e5dc-cd5a-43b9-a563-71c1f43c3f8f';

// Minimal timezone definitions for common abbreviations used by events
const TIMEZONE_DEFINITIONS = {
    CET: [
        'BEGIN:VTIMEZONE',
        'TZID:CET',
        'X-LIC-LOCATION:CET',
        'BEGIN:DAYLIGHT',
        'TZOFFSETFROM:+0100',
        'TZOFFSETTO:+0200',
        'TZNAME:CEST',
        'DTSTART:19810329T020000',
        'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
        'END:DAYLIGHT',
        'BEGIN:STANDARD',
        'TZOFFSETFROM:+0200',
        'TZOFFSETTO:+0100',
        'TZNAME:CET',
        'DTSTART:19801026T030000',
        'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
        'END:STANDARD',
        'END:VTIMEZONE'
    ].join('\r\n') + '\r\n',
    UTC: [
        'BEGIN:VTIMEZONE',
        'TZID:UTC',
        'X-LIC-LOCATION:UTC',
        'BEGIN:STANDARD',
        'TZOFFSETFROM:+0000',
        'TZOFFSETTO:+0000',
        'TZNAME:UTC',
        'DTSTART:19700101T000000',
        'END:STANDARD',
        'END:VTIMEZONE'
    ].join('\r\n') + '\r\n'
};

function getTimezoneBlock(tzid) {
    if (!tzid) return null;
    const upper = tzid.toUpperCase();
    return TIMEZONE_DEFINITIONS[upper] ? { id: upper, block: TIMEZONE_DEFINITIONS[upper] } : null;
}

function formatLocalDateTime(dateStr, timeStr) {
    if (!dateStr) return '';
    const datePart = dateStr.replace(/-/g, '');
    if (!timeStr) return `${datePart}`;
    const [h = '00', m = '00', s = '00'] = timeStr.split(':').map(part => part.padStart(2, '0'));
    return `${datePart}T${h}${m}${s}`;
}

// Helper function to escape special characters and fold long lines
function escapeICalText(text) {
    if (!text) return '';
    let escaped = String(text)
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,');
    return escaped.match(/.{1,72}/g)?.join('\r\n ') || '';
}

// Helper function to check if a date string has time components
function hasTimeComponent(dateString) {
    if (!dateString) return false;
    return /\d{1,2}:\d{2}(:\d{2})?/.test(dateString);
}

// Helper function to format date for iCal
function formatDateForICal(dateString) {
    if (!dateString || dateString.toLowerCase() === 'ongoing') {
        return { value: '', isAllDay: false };
    }
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return { value: '', isAllDay: false };

        // If the date string doesn't have time components, treat as all-day event
        if (!hasTimeComponent(dateString)) {
            // Format as YYYYMMDD for all-day events
            const yyyy = date.getUTCFullYear();
            const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(date.getUTCDate()).padStart(2, '0');
            return { value: `${yyyy}${mm}${dd}`, isAllDay: true };
        }
        
        // Format as YYYYMMDDTHHmmssZ (UTC) for timed events
        return { value: date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z', isAllDay: false };
    } catch (e) {
        return { value: '', isAllDay: false };
    }
}

// Helper function to ensure directory exists
function ensureParent(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Helper function to check if a date is valid and in the future
function isValidFutureDate(dateString) {
    if (!dateString || dateString.toLowerCase() === 'ongoing') {
        return false; // Hide ongoing items from iCal
    }
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return false;
        
        // Get current date in the same timezone as the date being checked
        const now = new Date();
        const timezoneOffset = date.getTimezoneOffset() * 60000; // in milliseconds
        const localDate = new Date(date.getTime() - timezoneOffset);
        const localNow = new Date(now.getTime() - timezoneOffset);
        
        // Reset time components to compare just the dates
        localDate.setHours(0, 0, 0, 0);
        localNow.setHours(0, 0, 0, 0);
        
        return localDate >= localNow;
    } catch (e) {
        console.error('Error validating date:', e);
        return false;
    }
}

// Generate iCal for events only
function generateEventsICal(events) {
    if (!events || events.length === 0) {
        console.log('No events to process for iCal');
        return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Internet Society//Events//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nEND:VCALENDAR';
    }

    // Use a stable timestamp for DTSTAMP - only update when content changes
    const stableTimestamp = '20240101T000000Z'; // Fixed timestamp for stability

    // Get unique timezones from events
    const timezones = new Set();
    events.forEach(event => {
        if (event.timeZone) {
            timezones.add(event.timeZone);
        }
    });

    // Start building the iCal content
    let ical = 'BEGIN:VCALENDAR\r\n' +
              'VERSION:2.0\r\n' +
              'PRODID:-//Internet Society//Events//EN\r\n' +
              'CALSCALE:GREGORIAN\r\n' +
              'METHOD:PUBLISH\r\n';
    
    // Add timezone definitions
    timezones.forEach(tz => {
        ical += `BEGIN:VTIMEZONE\r\n`;
        ical += `TZID:${tz}\r\n`;
        ical += `X-LIC-LOCATION:${tz}\r\n`;
        // Add standard time (CET)
        ical += `BEGIN:STANDARD\r\n`;
        ical += `DTSTART:19701025T030000\r\n`;
        ical += `TZOFFSETFROM:+0200\r\n`;
        ical += `TZOFFSETTO:+0100\r\n`;
        ical += `TZNAME:CET\r\n`;
        ical += `END:STANDARD\r\n`;
        // Add daylight saving time (CEST)
        ical += `BEGIN:DAYLIGHT\r\n`;
        ical += `DTSTART:19700329T020000\r\n`;
        ical += `TZOFFSETFROM:+0100\r\n`;
        ical += `TZOFFSETTO:+0200\r\n`;
        ical += `TZNAME:CEST\r\n`;
        ical += `END:DAYLIGHT\r\n`;
        ical += `END:VTIMEZONE\r\n`;
    });

    let eventCount = 0;

    events.forEach(event => {
        try {
            if (!event.startDate) {
                console.log('Skipping event - no start date:', event.title || 'Untitled Event');
                return;
            }
            
            const uid = uuidv5(`${event.title || ''}${event.startDate}${event.startTime || ''}`, UUID_NAMESPACE);
            const summary = event.title || 'Untitled Event';
            const description = event.description || '';
            const url = event.link ? `\nURL:${event.link}` : '';
            
            // Format start date with timezone
            let startDateStr = event.startDate;
            if (event.startTime) {
                startDateStr = `${event.startDate}T${event.startTime.padStart(5, '0')}:00`;
            }
            
            // Format end date (use start date if not provided)
            let endDateStr = event.endDate || event.startDate;
            if (event.endTime) {
                endDateStr = `${endDateStr}T${event.endTime.padStart(5, '0')}:00`;
            } else if (event.startTime) {
                // If there's a start time but no end time, assume 1 hour duration
                const start = new Date(`${event.startDate}T${event.startTime.padStart(5, '0')}:00`);
                start.setHours(start.getHours() + 1);
                endDateStr = start.toISOString().slice(0, 19);
            }
            
            const startDate = formatDateForICal(startDateStr);
            const endDate = endDateStr ? formatDateForICal(endDateStr) : startDate;
            
            if (!startDate.value) {
                console.log('Skipping event - invalid start date:', event.title || 'Untitled Event', 'Date:', startDateStr);
                return;
            }
            
            ical += 'BEGIN:VEVENT\r\n' +
                   `UID:${uid}\r\n` +
                   `DTSTAMP:${stableTimestamp}\r\n` +
                   `SUMMARY:${escapeICalText(summary)}\r\n`;
            
            if (description || url) {
                ical += `DESCRIPTION:${escapeICalText(description)}${url}\r\n`;
            }
            
            if (event.timeZone && !startDate.isAllDay) {
                // For events with timezone, use TZID and local time format (YYYYMMDDTHHmmss)
                const formatForTZ = (dateStr) => {
                    if (!dateStr) return '';
                    // Convert YYYY-MM-DDTHH:mm:ss to YYYYMMDDTHHmmss format
                    return dateStr.replace(/[-:]/g, '').replace(/T(\d{2})(\d{2})(\d{2})/, 'T$1$2$3');
                };
                
                ical += `DTSTART;TZID=${event.timeZone}:${formatForTZ(startDateStr)}\r\n`;
                ical += `DTEND;TZID=${event.timeZone}:${formatForTZ(endDateStr || startDateStr)}\r\n`;
            } else if (startDate.isAllDay) {
                ical += `DTSTART;VALUE=DATE:${event.startDate.replace(/-/g, '')}\r\n`;
                ical += `DTEND;VALUE=DATE:${(event.endDate || event.startDate).replace(/-/g, '')}\r\n`;
            } else {
                ical += `DTSTART:${startDate.value}\r\n`;
                ical += `DTEND:${endDate.value || startDate.value}\r\n`;
            }
            
            if (event.location) {
                ical += `LOCATION:${escapeICalText(event.location)}\r\n`;
            }
            
            ical += 'END:VEVENT\r\n';
            eventCount++;
            
        } catch (error) {
            console.error('Error processing event:', event.title || 'Untitled Event', error);
        }
    });
    
    ical += 'END:VCALENDAR';
    console.log(`Processed ${eventCount} events for iCal`);
    return ical;
}

// Process opportunities data
function processOpportunities(opportunities) {
    return opportunities.map(opp => ({
        title: opp['Outreach Activity [Title]'] || '',
        description: opp['Opportunity [Description]'] || '',
        startDate: opp.Date,
        endDate: opp['End Date'],
        link: opp.Link || '',
        type: opp.Type || '',
        region: opp.Region || '',
        isEvent: false
    }));
}

// Process events data
function processEvents(events) {
    return events.map(event => ({
        title: event.title || '',
        description: event.description || '',
        startDate: event.startDate,
        endDate: event.endDate,
        startTime: event.startTime,
        endTime: event.endTime,
        timeZone: event.timeZone || 'UTC',
        link: event.registrationUrl || '',
        type: event.type || '',
        region: event.region || '',
        isEvent: true
    }));
}

// Helper function to generate hash of content
function generateHash(content) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
}

// Helper function to check if file content has changed
function hasContentChanged(filePath, newContent) {
    try {
        if (!fs.existsSync(filePath)) {
            return true; // File doesn't exist, so it's a change
        }
        const existingContent = fs.readFileSync(filePath, 'utf-8');
        const existingHash = generateHash(existingContent);
        const newHash = generateHash(newContent);
        return existingHash !== newHash;
    } catch (error) {
        console.error('Error checking content changes:', error);
        return true; // If we can't check, assume it changed
    }
}

// Generate iCal file
function generateICal() {
    try {
        // Read and process opportunities
        console.log(`Reading opportunities from ${OPPORTUNITIES_JSON}`);
        const opportunities = JSON.parse(fs.readFileSync(OPPORTUNITIES_JSON, 'utf-8'));
        const processedOpps = processOpportunities(opportunities);
        
        // Read and process events
        console.log(`Reading events from ${EVENTS_JSON}`);
        const events = JSON.parse(fs.readFileSync(EVENTS_JSON, 'utf-8'));
        const processedEvents = processEvents(events);
        
        // Combine items
        const allItems = [...processedOpps, ...processedEvents];
        
        // Filter valid items with debug logging
        const validItems = allItems.filter(item => {
            if (!item.startDate) {
                console.log(`Skipping item '${item.title}' - no start date`);
                return false;
            }
            const isValid = isValidFutureDate(item.startDate);
            if (!isValid) {
                console.log(`Skipping item '${item.title}' - date ${item.startDate} is in the past`);
            }
            return isValid;
        });

        // Use a stable timestamp for DTSTAMP - only update when content changes
        const stableTimestamp = '20240101T000000Z'; // Fixed timestamp for stability

        let ical = 'BEGIN:VCALENDAR\r\n' +
                  'VERSION:2.0\r\n' +
                  'PRODID:-//Internet Society//Opportunities//EN\r\n' +
                  'CALSCALE:GREGORIAN\r\n' +
                  'METHOD:PUBLISH\r\n';

        validItems.forEach(item => {
            const uid = uuidv5(item.title + item.startDate + (item.isEvent ? 'event' : 'opportunity'), UUID_NAMESPACE);
            const summary = item.title || (item.isEvent ? 'Untitled Event' : 'Untitled Opportunity');
            const description = item.description || '';
            const url = item.link ? `\nURL:${item.link}` : '';
            
            // For events with time, combine date and time
            let startDateStr = item.startDate;
            if (item.isEvent && item.startTime) {
                startDateStr = `${item.startDate}T${item.startTime}:00`;
                if (item.timeZone) {
                    startDateStr += ` ${item.timeZone}`;
                }
            }
            
            let endDateStr = item.endDate || item.startDate;
            if (item.isEvent && item.endTime) {
                endDateStr = `${endDateStr || item.startDate}T${item.endTime}:00`;
                if (item.timeZone) {
                    endDateStr += ` ${item.timeZone}`;
                }
            }
            
            const startDate = formatDateForICal(startDateStr);
            const endDate = endDateStr ? formatDateForICal(endDateStr) : startDate;
            
            // Skip if we couldn't parse the date
            if (!startDate.value) return;
            
            ical += 'BEGIN:VEVENT\r\n' +
                   `UID:${uid}\r\n` +
                   `SUMMARY:${escapeICalText(summary)}\r\n` +
                   `DESCRIPTION:${escapeICalText(description)}${url}\r\n` +
                   `DTSTAMP:${stableTimestamp}\r\n`;
            
            if (startDate.isAllDay) {
                ical += `DTSTART;VALUE=DATE:${startDate.value}\r\n`;
                ical += `DTEND;VALUE=DATE:${endDate.value || startDate.value}\r\n`;
            } else {
                ical += `DTSTART:${startDate.value}\r\n`;
                ical += `DTEND:${endDate.value || startDate.value}\r\n`;
            }
            
            ical += 'END:VEVENT\r\n';
        });

        ical += 'END:VCALENDAR';

        // Write combined iCal with CRLF line endings only if content changed
        const crlfContent = ical.replace(/\r?\n/g, '\r\n');
        if (hasContentChanged(OPPORTUNITIES_ICAL, crlfContent)) {
            fs.writeFileSync(OPPORTUNITIES_ICAL, crlfContent, { encoding: 'utf-8' });
            console.log(`Updated opportunities iCal at ${OPPORTUNITIES_ICAL}`);
        } else {
            console.log(`No changes to opportunities iCal, skipping update`);
        }
        
        // Generate and write events-only iCal
        console.log('Processing events for iCal:', JSON.stringify(processedEvents, null, 2));
        const eventsIcal = generateEventsICal(processedEvents);
        ensureParent(EVENTS_ICAL);
        // Force CRLF line endings
        const eventsCrlfContent = eventsIcal.replace(/\r?\n/g, '\r\n');
        if (hasContentChanged(EVENTS_ICAL, eventsCrlfContent)) {
            fs.writeFileSync(EVENTS_ICAL, eventsCrlfContent, { encoding: 'utf-8' });
            console.log(`Updated events iCal at ${EVENTS_ICAL}`);
        } else {
            console.log(`No changes to events iCal, skipping update`);
        }
        
        console.log(`Found ${validItems.length} valid items (${processedOpps.length} opportunities, ${processedEvents.length} events)`);
        
    } catch (error) {
        console.error('Error generating iCal file:', error);
        process.exit(1);
    }
}

// Run the generator
generateICal();