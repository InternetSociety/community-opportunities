const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

// Configuration
const OPPORTUNITIES_JSON = path.join(__dirname, '../data/opportunities.json');
const OUTPUT_FILE = path.join(__dirname, '../data/opportunities.rss');
const SITE_URL = 'https://opportunities.internetsociety.org';
const FEED_ITEM_LIMIT = 100;

// Generate RSS feed
async function generateRSS() {
    try {
        // Use the modification time of the source file. This is the only thing
        // that will change the <lastBuildDate> and ensures idempotency.
        const sourceFileStats = fs.statSync(OPPORTUNITIES_JSON);
        const lastBuildDate = sourceFileStats.mtime;

        const data = JSON.parse(fs.readFileSync(OPPORTUNITIES_JSON, 'utf8'));
        
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


        // Generate the full RSS feed
        const rss = `<?xml version="1.0" encoding="UTF-8" ?>
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
        
    } catch (error)
    {
        console.error('Error generating RSS feed:', error);
        process.exit(1);
    }
}

// Run the generator
generateRSS();