const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

// Configuration
const OPPORTUNITIES_JSON = path.join(__dirname, '../data/opportunities.json');
const OUTPUT_FILE = path.join(__dirname, '../data/opportunities.rss');
const SITE_URL = 'https://opportunities.internetsociety.org';

// Helper function to check if a date is in the past
function isDateInPast(dateString) {
    if (!dateString || typeof dateString !== 'string') return false;
    if (dateString.trim().toLowerCase() === 'ongoing') return false;
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return false;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    } catch (e) {
        console.warn('Error parsing date:', dateString, e);
        return false;
    }
}

// Generate RSS feed
async function generateRSS() {
    try {
        // Read and parse opportunities data
        const data = JSON.parse(fs.readFileSync(OPPORTUNITIES_JSON, 'utf8'));
        
        // Filter and normalize opportunities
        const opportunities = data
            .filter(item => {
                // Skip if no title or archived
                if (!item["Outreach Activity [Title]"]) return false;
                if (item.Archived) return false;
                
                // Skip past dates unless it's "Ongoing"
                const date = item.Date;
                if (date && isDateInPast(date)) return false;
                
                return true;
            })
            .map(item => ({
                title: item["Outreach Activity [Title]"],
                description: item["Opportunity [Description]"],
                link: item.Link,
                date: item.Date,
                type: item.Type,
                region: item.Region,
                issue: item["Internet Issue"],
                who: item["Who Can Get Involved"]
            }))
            .sort((a, b) => {
                // Sort by date (if available), with "Ongoing" at the end
                if (a.date === 'Ongoing') return 1;
                if (b.date === 'Ongoing') return -1;
                if (!a.date) return 1;
                if (!b.date) return -1;
                return new Date(a.date) - new Date(b.date);
            });

        // Generate RSS items
        const items = opportunities.map(opp => {
            const pubDate = opp.date === 'Ongoing' 
                ? new Date().toUTCString() 
                : new Date(opp.date).toUTCString();
                
            const description = `
                <p>${opp.description || 'No description available.'}</p>
                ${opp.type ? `<p><strong>Type:</strong> ${opp.type}</p>` : ''}
                ${opp.region ? `<p><strong>Region:</strong> ${opp.region}</p>` : ''}
                ${opp.issue ? `<p><strong>Internet Issue:</strong> ${opp.issue}</p>` : ''}
                ${opp.who ? `<p><strong>Who can get involved:</strong> ${Array.isArray(opp.who) ? opp.who.join(', ') : opp.who}</p>` : ''}
            `.trim();

            return `
                <item>
                    <title><![CDATA[${opp.title}]]></title>
                    <link>${opp.link}</link>
                    <guid>${opp.link}</guid>
                    <pubDate>${pubDate}</pubDate>
                    <description><![CDATA[${description}]]></description>
                </item>
            `.trim();
        }).join('\n');

        // Generate the full RSS feed
        const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>Internet Society Opportunities</title>
        <link>${SITE_URL}</link>
        <description>Latest opportunities to get involved with Internet Society initiatives</description>
        <language>en-us</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <atom:link href="${SITE_URL}/data/opportunities.rss" rel="self" type="application/rss+xml" />
        ${items}
    </channel>
</rss>
        `.trim();

        // Write the RSS feed to file
        fs.writeFileSync(OUTPUT_FILE, rss);
        console.log(`RSS feed generated successfully at ${OUTPUT_FILE}`);
        
    } catch (error) {
        console.error('Error generating RSS feed:', error);
        process.exit(1);
    }
}

// Run the generator
generateRSS();
