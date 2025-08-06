const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuration
const OPPORTUNITIES_JSON = path.join(__dirname, '../data/opportunities.json');
const OUTPUT_FILE = path.join(__dirname, '../data/opportunities.ics');
const SITE_URL = 'https://opportunities.internetsociety.org';

// Helper function to escape special characters in iCal text
function escapeICalText(text) {
    if (!text) return '';
    return String(text)
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,');
}

// Helper function to format date for iCal
function formatDateForICal(dateString, isStart = true) {
    if (!dateString || dateString.toLowerCase() === 'ongoing') {
        // For ongoing events, set a date far in the future
        const date = new Date();
        date.setFullYear(date.getFullYear() + 10); // 10 years from now
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        // Format as YYYYMMDDTHHmmssZ (UTC)
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    } catch (e) {
        console.warn('Error formatting date for iCal:', dateString, e);
        return '';
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
            const startDate = opp.Date;
            const endDate = opp.Date; // Same as start date if not specified
            
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
            
            return `
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${created}
DTSTART:${formatDateForICal(startDate)}
DTEND:${formatDateForICal(endDate, false)}
SUMMARY:${escapeICalText(opp["Outreach Activity [Title]"])}
DESCRIPTION:${escapeICalText(description)}
URL:${opp.Link || SITE_URL}
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
            `.trim();
        }).join('\n');

        // Generate the full iCal file
        const ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Internet Society//NONSGML Opportunities Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Internet Society Opportunities
X-WR-TIMEZONE:UTC
X-WR-CALDESC:Upcoming opportunities from Internet Society
${events}
END:VCALENDAR
        `.trim();

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
