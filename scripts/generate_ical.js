const fs = require('fs');
const path = require('path');
const { v5: uuidv5 } = require('uuid');

// Configuration
const OPPORTUNITIES_JSON = path.join(__dirname, '../data/opportunities.json');
const OUTPUT_FILE = path.join(__dirname, '../data/opportunities.ics');
const SITE_URL = 'https://opportunities.internetsociety.org';

// A unique, stable namespace for generating UUIDs. This should never change.
const UUID_NAMESPACE = 'a3b7e5dc-cd5a-43b9-a563-71c1f43c3f8f';

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
        return false;
    }
}

// Generate iCal file
async function generateICal() {
    try {
        // Read and parse opportunities data
        const data = JSON.parse(fs.readFileSync(OPPORTUNITIES_JSON, 'utf8'));
        const opportunities = data.filter(item => {
            if (!item["Outreach Activity [Title]"] || item.Archived) return false;
            return item.Date && isValidFutureDate(item.Date);
        });

        const events = opportunities.map(opp => {
            // Generate a stable UID based on a unique property (like the Link)
            const stableIdentifier = opp.Link || opp["Outreach Activity [Title]"];
            const uid = uuidv5(stableIdentifier, UUID_NAMESPACE);

            // Use the opportunity's creation date for DTSTAMP, not the current time
            const createdTimestamp = new Date(opp["Creation date"]).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

            const startDate = formatDateForICal(opp.Date);
            
            let description = opp["Opportunity [Description]"] || 'No description available.';
            if (opp.Type) description += `\\n\\nType: ${opp.Type}`;
            if (opp.Region) description += `\\nRegion: ${opp.Region}`;
            if (opp["Internet Issue"]) description += `\\nInternet Issue: ${opp["Internet Issue"]}`;
            if (opp["Who Can Get Involved"]) {
                const who = Array.isArray(opp["Who Can Get Involved"]) 
                    ? opp["Who Can Get Involved"].join(', ')
                    : opp["Who Can Get Involved"];
                description += `\\nWho Can Get Involved: ${who}`;
            }
            if (opp.Link) description += `\\n\\nMore info: ${opp.Link}`;
            
            let event = `BEGIN:VEVENT\r\nUID:${uid}\r\nDTSTAMP:${createdTimestamp}\r\n`;

            if (startDate.isAllDay) {
                event += `DTSTART;VALUE=DATE:${startDate.value}\r\n`;
                const endDateObj = new Date(opp.Date);
                endDateObj.setUTCDate(endDateObj.getUTCDate() + 1);
                const yyyy = endDateObj.getUTCFullYear();
                const mm = String(endDateObj.getUTCMonth() + 1).padStart(2, '0');
                const dd = String(endDateObj.getUTCDate()).padStart(2, '0');
                event += `DTEND;VALUE=DATE:${yyyy}${mm}${dd}\r\n`;
            } else {
                event += `DTSTART:${startDate.value}\r\n`;
                event += `DTEND:${startDate.value}\r\n`;
            }

            event += `SUMMARY:${escapeICalText(opp["Outreach Activity [Title]"])}\r\nDESCRIPTION:${escapeICalText(description)}\r\nURL:${opp.Link || SITE_URL}\r\nSTATUS:CONFIRMED\r\nTRANSP:OPAQUE\r\nEND:VEVENT`;
            
            return event;
        }).join('\r\n');

        const ical = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Internet Society//NONSGML Opportunities Calendar//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:Internet Society Opportunities\r\nX-WR-TIMEZONE:UTC\r\nX-WR-CALDESC:Upcoming opportunities from Internet Society\r\n${events ? events + '\r\n' : ''}END:VCALENDAR`;

        fs.writeFileSync(OUTPUT_FILE, ical, { encoding: 'utf-8' });
        console.log(`iCal file generated successfully at ${OUTPUT_FILE}`);
        
    } catch (error) {
        console.error('Error generating iCal file:', error);
        process.exit(1);
    }
}

// Run the generator
generateICal();