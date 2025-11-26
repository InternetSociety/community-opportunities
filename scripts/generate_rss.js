const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const OPPORTUNITIES_JSON = path.join(__dirname, '../data/opportunities.json');
const EVENTS_JSON = path.join(__dirname, '../community-events/data/events.json');
const OPPORTUNITIES_OUTPUT_FILE = path.join(__dirname, '../data/opportunities.rss');
const EVENTS_OUTPUT_FILE = path.join(__dirname, '../community-events/data/events.rss');
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

// Process opportunities data
function processOpportunities(opportunities) {
    return opportunities.map(opp => ({
        title: opp['Outreach Activity [Title]'] || 'Untitled Opportunity',
        description: opp['Opportunity [Description]'] || '',
        link: opp.Link || SITE_URL,
        date: opp.Date,
        type: opp.Type || '',
        region: opp.Region || '',
        creationDate: opp['Creation date'],
        isEvent: false
    }));
}

// Process events data
function processEvents(events) {
    return events.map(event => ({
        title: event.title || 'Untitled Event',
        description: event.description || '',
        link: event.registrationUrl || SITE_URL,
        date: event.startDate,
        type: event.type || '',
        region: event.region || '',
        isEvent: true
    }));
}

// Helper function to check if file content has changed
function hasContentChanged(filePath, newContent) {
    try {
        if (!fs.existsSync(filePath)) {
            return true; // File doesn't exist, so it's a change
        }
        const existingContent = fs.readFileSync(filePath, 'utf-8');
        // Extract fingerprint from existing file
        const existingMatch = existingContent.match(/<!-- DATA_FINGERPRINT:([a-f0-9]+) -->/);
        const newMatch = newContent.match(/<!-- DATA_FINGERPRINT:([a-f0-9]+) -->/);
        
        if (!existingMatch || !newMatch) {
            return true; // If we can't find fingerprints, assume it changed
        }
        
        return existingMatch[1] !== newMatch[1];
    } catch (error) {
        console.error('Error checking content changes:', error);
        return true; // If we can't check, assume it changed
    }
}

// Generate RSS feed for a specific data type
async function generateRSSFeed(items, outputFile, feedTitle, feedDescription, selfLink) {
    try {
        // Filter valid items (include "Ongoing" and future dates)
        const now = new Date();
        const validItems = items.filter(item => {
            if (!item.date) return false;
            
            // Include "Ongoing" opportunities
            if (item.date.toLowerCase() === 'ongoing') return true;
            
            try {
                const itemDate = new Date(item.date);
                return !isNaN(itemDate.getTime()) && itemDate >= now;
            } catch (e) {
                return false;
            }
        });
        
        // Sort by creation date (newest first)
        validItems.sort((a, b) => {
            const aDate = a.creationDate ? new Date(a.creationDate) : new Date(0);
            const bDate = b.creationDate ? new Date(b.creationDate) : new Date(0);
            return bDate - aDate;
        });
        
        // Limit number of items
        const limitedItems = validItems.slice(0, FEED_ITEM_LIMIT);
        
        // Use a stable timestamp for lastBuildDate - only update when content changes
        const stableLastBuildDate = 'Mon, 01 Jan 2024 00:00:00 GMT';
        
        // Generate RSS items
        const rssItems = limitedItems.map(item => {
            // Always use creation date for pubDate, fallback to current date if missing
            const pubDate = item.creationDate ? new Date(item.creationDate).toUTCString() : new Date().toUTCString();
            
            // Create a unique ID based on content and date
            const id = crypto
                .createHash('md5')
                .update(JSON.stringify(item))
                .digest('hex');
                
            return `
                <item>
                    <title>${sanitizeText(item.title)}</title>
                    <link>${sanitizeText(item.link)}</link>
                    <description>${sanitizeText(item.description)}</description>
                    <pubDate>${pubDate}</pubDate>
                    <guid isPermaLink="false">${id}</guid>
                    <category>${sanitizeText(item.isEvent ? 'Event' : 'Opportunity')}</category>
                    <category>${sanitizeText(item.type)}</category>
                    <category>${sanitizeText(item.region)}</category>
                </item>
            `.trim();
        }).join('\n');
        
        // Generate a fingerprint of the current data
        const dataFingerprint = crypto.createHash('md5')
            .update(JSON.stringify(validItems))
            .digest('hex');
            
        // Generate the full RSS feed
        const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<!-- DATA_FINGERPRINT:${dataFingerprint} -->
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>${feedTitle}</title>
        <link>${SITE_URL}</link>
        <description>${feedDescription}</description>
        <language>en-us</language>
        <lastBuildDate>${stableLastBuildDate}</lastBuildDate>
        <atom:link href="${selfLink}" rel="self" type="application/rss+xml" />
        ${rssItems}
    </channel>
</rss>
        `.trim();

        // Write the RSS feed to file only if content changed
        console.log(`Found ${validItems.length} valid items for ${feedTitle}`);
        console.log(`Including ${limitedItems.length} items in the feed`);
        
        if (hasContentChanged(outputFile, rss)) {
            console.log(`Writing RSS feed to ${outputFile}`);
            fs.writeFileSync(outputFile, rss);
            console.log(`RSS feed generated successfully at ${outputFile}`);
        } else {
            console.log(`No changes to RSS feed, skipping update: ${outputFile}`);
        }
        
        return { validItems: validItems.length, includedItems: limitedItems.length };
        
    } catch (error) {
        console.error(`Error generating RSS feed for ${feedTitle}:`, error);
        throw error;
    }
}

// Generate RSS feeds
async function generateRSS() {
    try {
        // Read and process opportunities
        console.log(`Reading opportunities from ${OPPORTUNITIES_JSON}`);
        const opportunities = JSON.parse(fs.readFileSync(OPPORTUNITIES_JSON, 'utf8'));
        const processedOpps = processOpportunities(opportunities);
        
        // Read and process events
        console.log(`Reading events from ${EVENTS_JSON}`);
        const events = JSON.parse(fs.readFileSync(EVENTS_JSON, 'utf8'));
        const processedEvents = processEvents(events);
        
        // Generate opportunities RSS feed
        console.log('\n=== Generating Opportunities RSS Feed ===');
        await generateRSSFeed(
            processedOpps,
            OPPORTUNITIES_OUTPUT_FILE,
            'Internet Society Opportunities',
            'Latest opportunities to get involved with Internet Society initiatives',
            `${SITE_URL}/data/opportunities.rss`
        );
        
        // Generate events RSS feed
        console.log('\n=== Generating Events RSS Feed ===');
        await generateRSSFeed(
            processedEvents,
            EVENTS_OUTPUT_FILE,
            'Internet Society Events',
            'Latest events to get involved with Internet Society initiatives',
            `${SITE_URL}/community-events/data/events.rss`
        );
        
        console.log('\n=== RSS Generation Complete ===');
        console.log(`Generated feeds for ${processedOpps.length} opportunities and ${processedEvents.length} events`);
        
    } catch (error) {
        console.error('Error generating RSS feeds:', error);
        process.exit(1);
    }
}

// Run the generator
generateRSS();