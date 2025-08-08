const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const OPPORTUNITIES_JSON = path.join(__dirname, '../data/opportunities.json');
const OUTPUT_FILE = path.join(__dirname, '../data/opportunities.rss');
const SITE_URL = 'https://opportunities.internetsociety.org';
const FEED_ITEM_LIMIT = 100;

// Helper function to generate a stable string representation of the data
function getDataFingerprint(data) {
    return JSON.stringify(data.map(item => ({
        title: item["Outreach Activity [Title]"],
        description: item["Opportunity [Description]"],
        link: item.Link,
        date: item.Date,
        creationDate: item["Creation date"],
        type: item.Type,
        region: item.Region,
        issue: item["Internet Issue"],
        who: item["Who Can Get Involved"],
        Archived: item.Archived
    })));
}

// Helper function to sanitize text for XML/HTML
function sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Generate RSS feed
async function generateRSS() {
    try {
        // Validate input file exists
        if (!fs.existsSync(OPPORTUNITIES_JSON)) {
            throw new Error(`Opportunities data file not found: ${OPPORTUNITIES_JSON}`);
        }
        
        const data = JSON.parse(fs.readFileSync(OPPORTUNITIES_JSON, 'utf8'));
        
        // Validate data structure
        if (!Array.isArray(data)) {
            throw new Error('Invalid data format: expected array of opportunities');
        }
        
        // Check if the RSS file already exists and get its lastBuildDate
        let lastBuildDate = new Date();
        
        if (fs.existsSync(OUTPUT_FILE)) {
            const rssContent = fs.readFileSync(OUTPUT_FILE, 'utf8');
            const lastBuildMatch = rssContent.match(/<lastBuildDate>([^<]+)<\/lastBuildDate>/i);
            if (lastBuildMatch && lastBuildMatch[1]) {
                lastBuildDate = new Date(lastBuildMatch[1]);
            }
            
            // Check if the data has actually changed
            const currentFingerprint = getDataFingerprint(data);
            const previousFingerprint = rssContent.match(/<!-- DATA_FINGERPRINT:([a-f0-9]+) -->/);
            
            if (previousFingerprint && previousFingerprint[1] === crypto.createHash('md5').update(currentFingerprint).digest('hex')) {
                console.log('No changes in data, keeping existing RSS file');
                return; // Exit if no changes
            }
        }
        
        const opportunities = data
            .filter(item => {
                return item["Outreach Activity [Title]"] && !item.Archived;
            })
            .map(item => ({
                title: item["Outreach Activity [Title]"],
                description: item["Opportunity [Description]"],
                link: item.Link,
                date: item.Date,
                creationDate: item["Creation date"],
                type: item.Type,
                region: item.Region,
                issue: item["Internet Issue"],
                who: item["Who Can Get Involved"]
            }))
            // Sort by creation date in descending order (newest first).
            .sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate))
            // Limit the feed to the most recent items.
            .slice(0, FEED_ITEM_LIMIT);

        // Generate RSS items
        const items = opportunities.map(opp => {
            const pubDate = new Date(opp.creationDate).toUTCString();
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
                    <link>${opp.link.replace(/&/g, '&amp;')}</link>
                    <guid>${opp.link.replace(/&/g, '&amp;')}</guid>
                    <pubDate>${pubDate}</pubDate>
                    <description><![CDATA[${description}]]></description>
                </item>
            `.trim();
        }).join('\n');


        // Generate a fingerprint of the current data
        const dataFingerprint = crypto.createHash('md5')
            .update(getDataFingerprint(data))
            .digest('hex');
            
        // Generate the full RSS feed
        const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<!-- DATA_FINGERPRINT:${dataFingerprint} -->
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>Internet Society Opportunities</title>
        <link>${SITE_URL}</link>
        <description>Latest opportunities to get involved with Internet Society initiatives</description>
        <language>en-us</language>
        <lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>
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