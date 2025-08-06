const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuration
const OPPORTUNITIES_JSON = path.join(__dirname, '../data/opportunities.json');
const OUTPUT_FILE = path.join(__dirname, '../data/opportunities.ics');
const SITE_URL = 'https://opportunities.internetsociety.org';

// Helper function to escape special characters in iCal text and ensure proper line folding
function escapeICalText(text) {
    if (!text) return '';
    
    // First escape special characters
    let escaped = String(text)
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,');
    
    // Split into lines and fold long lines according to iCal spec (75 chars max per line)
    const lines = [];
    while (escaped.length > 0) {
        if (lines.length > 0) {
            // For continuation lines, add a space at the beginning
            lines.push(' ' + escaped.substring(0, 74));
            escaped = escaped.substring(74);
        } else {
            // First line doesn't need leading space
            lines.push(escaped.substring(0, 75));
            escaped = escaped.substring(75);
        }
    }
    
    return lines.join('\r\n');
}

// Helper function to check if a date string has time components
function hasTimeComponent(dateString) {
    if (!dateString) return false;
    // Check if the date string includes a time component (HH:MM or HH:MM:SS)
    return /\d{1,2}:\d{2}(:\d{2})?/.test(dateString);
}

// Helper function to format date for iCal
function formatDateForICal(dateString, isStart = true) {
    if (!dateString || dateString.toLowerCase() === 'ongoing') {
        // For ongoing events, set a date far in the future
        const date = new Date();
        date.setFullYear(date.getFullYear() + 10); // 10 years from now
        return { value: date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z', isAllDay: false };
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
        console.warn('Error formatting date for iCal:', dateString, e);
        return { value: '', isAllDay: false };
    }
}

// Helper function to check if a date is valid and in the future
function isValidFutureDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return false;
    if (dateString.trim().toLowerCase() === 'ongoing') return false;
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return false;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
    } catch (e) {
        console.warn('Error parsing date:', dateString, e);
        return false;
    }
}

// Generate iCal file
async function generateICal() {
    try {
        // Read and parse opportunities data
        const data = JSON.parse(fs.readFileSync(OPPORTUNITIES_JSON, 'utf8'));
        
        // Filter and normalize opportunities
        const opportunities = data
            .filter(item => {
                // Skip if no title or archived
                if (!item["Outreach Activity [Title]"]) return false;
                if (item.Archived) return false;
                
                // Only include opportunities with a valid future date
                return item.Date && isValidFutureDate(item.Date);
            });

        // Generate iCal events
        const events = opportunities.map(opp => {
            const uid = uuidv4();
            const now = new Date();
            const created = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            const startDate = formatDateForICal(opp.Date, true);
            const endDate = formatDateForICal(opp.Date, false); // Same as start date if not specified
            
            // Create event description with additional details
            let description = opp["Opportunity [Description]"] || 'No description available.';
            if (opp.Type) description += `\n\nType: ${opp.Type}`;
            if (opp.Region) description += `\nRegion: ${opp.Region}`;
            if (opp["Internet Issue"]) description += `\nInternet Issue: ${opp["Internet Issue"]}`;
            if (opp["Who Can Get Involved"]) {
                const who = Array.isArray(opp["Who Can Get Involved"]) 
                    ? opp["Who Can Get Involved"].join(', ')
                    : opp["Who Can Get Involved"];
                description += `\nWho Can Get Involved: ${who}`;
            }
            if (opp.Link) description += `\n\nMore info: ${opp.Link}`;
            
            // Format the event with appropriate DTSTART/DTEND based on whether it's an all-day event
            let event = `\r\nBEGIN:VEVENT\r\nUID:${uid}\r\nDTSTAMP:${created}\r\n`;

            // Add DTSTART with or without time based on isAllDay
            if (startDate.isAllDay) {
                event += `DTSTART;VALUE=DATE:${startDate.value}\r\n`;
            } else {
                event += `DTSTART:${startDate.value}\r\n`;
            }

            // Add DTEND with or without time based on isAllDay
            if (endDate.isAllDay) {
                // For all-day events, DTEND is exclusive, so we add one day
                const endDateObj = new Date(opp.Date);
                endDateObj.setDate(endDateObj.getDate() + 1);
                const yyyy = endDateObj.getUTCFullYear();
                const mm = String(endDateObj.getUTCMonth() + 1).padStart(2, '0');
                const dd = String(endDateObj.getUTCDate()).padStart(2, '0');
                event += `DTEND;VALUE=DATE:${yyyy}${mm}${dd}\r\n`;
            } else {
                event += `DTEND:${endDate.value}\r\n`;
            }

            event += `SUMMARY:${escapeICalText(opp["Outreach Activity [Title]"])}\r\nDESCRIPTION:${escapeICalText(description)}\r\nURL:${opp.Link || SITE_URL}\r\nSTATUS:CONFIRMED\r\nTRANSP:OPAQUE\r\nEND:VEVENT`.trim();
            
            return event;
        }).join('\r\n');

        // Generate the full iCal file with proper CRLF line endings
        const ical = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Internet Society//NONSGML Opportunities Calendar//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:Internet Society Opportunities\r\nX-WR-TIMEZONE:UTC\r\nX-WR-CALDESC:Upcoming opportunities from Internet Society\r\n${events}\r\nEND:VCALENDAR`.trim();

        // Write the iCal file
        fs.writeFileSync(OUTPUT_FILE, ical);
        console.log(`iCal file generated successfully at ${OUTPUT_FILE}`);
        
    } catch (error) {
        console.error('Error generating iCal file:', error);
        process.exit(1);
    }
}

// Run the generator
generateICal();
