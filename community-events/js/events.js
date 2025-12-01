// events.js - Dynamically loads and displays Community Events
// Author: ISOC Opportunities Dashboard

document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('events-container');
    const DATA_PATH = 'data/events.json';

    let allEvents = [];
    let currentFilters = {
        region: '',
        type: '',
        category: '',
        format: '',
        language: ''
    };



    // Fetch events data
    async function fetchEvents() {
        try {
            const response = await fetch(DATA_PATH);
            const data = await response.json();
            return data;
        } catch (error) {
            container.innerHTML = '<p>Error loading events. Please try again later.</p>';
            return [];
        }
    }

    // Populate filter dropdowns
    function populateFilters(events) {
        const regions = new Set();
        const types = new Set();
        const categories = new Set();
        const formats = new Set();
        const languages = new Set();

        events.forEach(event => {
            if (event.region) regions.add(event.region);
            if (event.type) types.add(event.type);
            if (event.category) categories.add(event.category);
            if (event.format) formats.add(event.format);
            if (event.language) languages.add(event.language);
        });

        // Populate region filter
        const regionFilter = document.getElementById('region-filter');
        Array.from(regions).sort().forEach(region => {
            const option = document.createElement('option');
            option.value = region;
            option.textContent = region;
            regionFilter.appendChild(option);
        });

        // Populate type filter
        const typeFilter = document.getElementById('type-filter');
        Array.from(types).sort().forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeFilter.appendChild(option);
        });

        // Populate category filter
        const categoryFilter = document.getElementById('category-filter');
        Array.from(categories).sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });

        // Populate format filter
        const formatFilter = document.getElementById('format-filter');
        Array.from(formats).sort().forEach(format => {
            const option = document.createElement('option');
            option.value = format;
            option.textContent = format;
            formatFilter.appendChild(option);
        });

        // Populate language filter
        const languageFilter = document.getElementById('language-filter');
        Array.from(languages).sort().forEach(language => {
            const option = document.createElement('option');
            option.value = language;
            option.textContent = language;
            languageFilter.appendChild(option);
        });
    }

    // Filter events based on current filters
    function filterEvents(events) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day for proper comparison
        
        return events.filter(event => {
            // Filter out past events
            if (event.startDate && event.startDate !== 'Ongoing') {
                const eventDate = new Date(event.startDate);
                eventDate.setHours(0, 0, 0, 0);
                if (eventDate < today) return false;
            }
            
            // Apply existing filters
            if (currentFilters.region && event.region !== currentFilters.region) return false;
            if (currentFilters.type && event.type !== currentFilters.type) return false;
            if (currentFilters.category && event.category !== currentFilters.category) return false;
            if (currentFilters.format && event.format !== currentFilters.format) return false;
            if (currentFilters.language && event.language !== currentFilters.language) return false;
            return true;
        });
    }

    // Update event count
    function updateEventCount(count) {
        const eventCountEl = document.getElementById('event-count');
        if (eventCountEl) {
            eventCountEl.textContent = `Showing ${count} upcoming event${count !== 1 ? 's' : ''}`;
        }
    }

    // Initialize filters
    function initializeFilters() {
        const regionFilter = document.getElementById('region-filter');
        const typeFilter = document.getElementById('type-filter');
        const categoryFilter = document.getElementById('category-filter');
        const formatFilter = document.getElementById('format-filter');
        const languageFilter = document.getElementById('language-filter');

        regionFilter.addEventListener('change', (e) => {
            currentFilters.region = e.target.value;
            const filteredEvents = filterEvents(allEvents);
            renderEvents(filteredEvents);
            updateEventCount(filteredEvents.length);
        });

        typeFilter.addEventListener('change', (e) => {
            currentFilters.type = e.target.value;
            const filteredEvents = filterEvents(allEvents);
            renderEvents(filteredEvents);
            updateEventCount(filteredEvents.length);
        });

        categoryFilter.addEventListener('change', (e) => {
            currentFilters.category = e.target.value;
            const filteredEvents = filterEvents(allEvents);
            renderEvents(filteredEvents);
            updateEventCount(filteredEvents.length);
        });

        formatFilter.addEventListener('change', (e) => {
            currentFilters.format = e.target.value;
            const filteredEvents = filterEvents(allEvents);
            renderEvents(filteredEvents);
            updateEventCount(filteredEvents.length);
        });

        languageFilter.addEventListener('change', (e) => {
            currentFilters.language = e.target.value;
            const filteredEvents = filterEvents(allEvents);
            renderEvents(filteredEvents);
            updateEventCount(filteredEvents.length);
        });
    }

    // Get alternating background image for event cards
    let backgroundIndex = 0;
    function getAlternatingBackgroundImage() {
        const backgrounds = [
            '../img/event-bg-white.jpg',
            '../img/event-bg-neutral.jpg'
        ];
        const bg = backgrounds[backgroundIndex % backgrounds.length];
        backgroundIndex++;
        return bg;
    }

    // Render events
    function renderEvents(events) {
        container.innerHTML = '';

        // Reset background index for consistent rendering
        backgroundIndex = 0;

        if (events.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <div class="no-results-content">
                        <h3>No events found</h3>
                        <p>Try adjusting your filters or check back later for upcoming community events.</p>
                    </div>
                </div>
            `;
            return;
        }

        // Sort events chronologically by start date
        const sortedEvents = [...events].sort((a, b) => {
            if (!a.startDate) return 1;
            if (!b.startDate) return -1;
            return new Date(a.startDate) - new Date(b.startDate);
        });

        // Create section for events
        const section = document.createElement('section');
        section.className = 'dynamic-section';
        section.id = 'community-events';

        const sectionContent = document.createElement('div');
        sectionContent.className = 'section-content';

        const header = document.createElement('h2');
        header.className = 'section-header';
        header.innerHTML = '<i class="icon fa-solid fa-calendar-day"></i>Upcoming events';

        const headerContainer = document.createElement('div');
        headerContainer.className = 'section-header-container';
        headerContainer.appendChild(header);

        const viewControls = document.createElement('div');
        viewControls.className = 'view-controls';
        viewControls.innerHTML = `
            <div class="view-toggle" id="view-toggle" title="Toggle view">
                <button class="view-option active" data-view="cards" aria-label="Card View">
                    <i class="fas fa-square"></i>
                </button>
                <button class="view-option" data-view="table" aria-label="Table View">
                    <i class="fas fa-table"></i>
                </button>
            </div>
        `;

        headerContainer.appendChild(viewControls);
        section.appendChild(headerContainer);

        // Card Grid
        const cardGrid = document.createElement('div');
        cardGrid.className = 'card-grid';

        // Table Container
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';

        let lastMonth = '';
        let lastYear = '';

        sortedEvents.forEach(event => {
            // Check if we need to add a month divider
            if (event.startDate) {
                const [year, month] = event.startDate.split('-').map(Number);
                const dateObj = new Date(year, month - 1, 1);
                const currentMonth = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

                if (currentMonth !== lastMonth) {
                    // Add subtle month divider
                    const monthDivider = document.createElement('div');
                    monthDivider.className = 'month-divider';
                    monthDivider.innerHTML = `
                        <div class="month-divider-line"></div>
                        <div class="month-divider-label">${currentMonth}</div>
                        <div class="month-divider-line"></div>
                    `;
                    cardGrid.appendChild(monthDivider);
                    lastMonth = currentMonth;
                }
            }

            // Card View - matching the screenshot style
            const card = document.createElement('div');
            card.className = 'action-card event-card';

            // Set alternating background image
            const backgroundImage = getAlternatingBackgroundImage();

            // Parse and format date
            let dateObj = null;
            let monthStr = '';
            let dayStr = '';
            let dateRangeText = '';
            if (event.startDate) {
                const [year, month, day] = event.startDate.split('-').map(Number);
                dateObj = new Date(year, month - 1, day);
                monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

                if (event.endDate && event.endDate !== event.startDate) {
                    // Multi-day event - show date range
                    const [endYear, endMonth, endDay] = event.endDate.split('-').map(Number);
                    const endDateObj = new Date(endYear, endMonth - 1, endDay);

                    if (year === endYear && month === endMonth) {
                        // Same month and year: "Dec 1-6"
                        dayStr = `${day}-${endDay}`;
                    } else if (year === endYear) {
                        // Same year, different month: "Dec 1 - Jan 6"
                        const endMonthStr = endDateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                        dayStr = `${day} ${monthStr} - ${endDay} ${endMonthStr}`;
                    } else {
                        // Different year: "Dec 1, 2025 - Jan 6, 2026"
                        dayStr = `${day} ${monthStr} ${year} - ${endDay} ${endDateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} ${endYear}`;
                    }
                } else {
                    // Single day event
                    dayStr = dateObj.getDate().toString();
                }
            }

            // Format time
            const timeStr = event.startTime && event.timeZone ?
                `${event.startTime} ${event.timeZone}` :
                event.startTime || '';

            // Build card content matching screenshot style
            const headerTag = event.registrationUrl ? 'a' : 'div';
            const headerAttrs = event.registrationUrl ? ` href="${event.registrationUrl}" target="_blank" rel="noopener noreferrer"` : '';

            card.innerHTML = `
                ${event.startDate && event.startDate !== 'Ongoing' ? `<button class="event-calendar-btn add-to-calendar" data-title="${event.title}" data-date="${event.startDate}" data-time="${event.startTime || ''}" data-timezone="${event.timeZone || ''}" data-description="${event.description || ''}" data-link="${event.registrationUrl || ''}" title="Add to calendar" aria-label="Add to calendar"><i class="fa-solid fa-calendar-plus"></i></button>` : ''}
                <${headerTag} class="event-card-header"${headerAttrs}>
                    <div class="event-cover-image" style="background-image: url('${backgroundImage}');">
                        ${dateObj ? `
                        <div class="event-date-badge">
                            <div class="event-month">${monthStr}</div>
                            <div class="event-day">${dayStr}</div>
                        </div>
                        ` : ''}
                        <div class="event-cover-content">
                            <h3 class="event-title">${event.title}</h3>
                        </div>
                    </div>
                    <div class="event-content">
                        <div class="event-badges">
                            ${event.type ? `<span class="event-type-badge">${event.type.toUpperCase()}</span>` : ''}
                            ${event.category ? `<span class="event-type-badge" style="background-color: #555;">${event.category.toUpperCase()}</span>` : ''}
                            ${event.language ? `<span class="event-type-badge" style="background-color: #6c757d;">${event.language.toUpperCase()}</span>` : ''}
                        </div>
                        <p class="event-description">${event.description || ''}</p>
                        <div class="event-meta-info">
                            ${timeStr ? `<div class="event-meta-item"><i class="fa-regular fa-clock"></i> ${timeStr}</div>` : ''}
                            ${event.region ? `<div class="event-meta-item"><i class="fa-solid fa-location-dot"></i> ${event.region}${event.format === 'Online' ? ' (Online)' : ''}</div>` : ''}
                        </div>
                        ${event.organizer ? `<div class="event-organizer"><i class="fa-solid fa-users"></i> ${event.organizer}</div>` : ''}
                    </div>
                </${headerTag}>
            `;
            cardGrid.appendChild(card);
        });

        // Build table matching main site style
        const table = renderEventTable(events);
        tableContainer.appendChild(table);

        sectionContent.appendChild(cardGrid);
        sectionContent.appendChild(tableContainer);
        section.appendChild(sectionContent);
        container.appendChild(section);
    }

    // Render event table with clean, scannable design
    function renderEventTable(events) {
        const table = document.createElement('table');
        table.className = 'opportunity-table event-table';

        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        ['Event', 'When', 'Where'].forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');

        events.forEach(event => {
            const row = document.createElement('tr');

            // Event column - title and type
            const eventCell = document.createElement('td');
            eventCell.className = 'event-name-cell';

            const eventName = document.createElement('div');
            eventName.className = 'event-name';

            if (event.registrationUrl) {
                const titleLink = document.createElement('a');
                titleLink.href = event.registrationUrl;
                titleLink.target = '_blank';
                titleLink.rel = 'noopener noreferrer';
                titleLink.textContent = event.title;
                eventName.appendChild(titleLink);
            } else {
                eventName.textContent = event.title;
            }

            eventCell.appendChild(eventName);

            // Add type, category, language, and organizer as subtle metadata
            if (event.type || event.category || event.language || event.organizer) {
                const metadata = document.createElement('div');
                metadata.className = 'event-metadata';
                const parts = [];
                if (event.type) parts.push(event.type);
                if (event.category) parts.push(event.category);
                if (event.language) parts.push(event.language);
                if (event.organizer) parts.push(event.organizer);
                metadata.textContent = parts.join(' • ');
                eventCell.appendChild(metadata);
            }

            row.appendChild(eventCell);

            // When column - date and time concisely
            const whenCell = document.createElement('td');
            whenCell.className = 'event-when-cell';

            if (event.startDate) {
                let dateStr = '';

                if (event.endDate && event.endDate !== event.startDate) {
                    // Multi-day event - show date range
                    const startDateObj = new Date(event.startDate);
                    const endDateObj = new Date(event.endDate);

                    const startStr = startDateObj.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                    });

                    const endStr = endDateObj.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });

                    dateStr = `${startStr} - ${endStr}`;
                } else {
                    // Single day event
                    const dateObj = new Date(event.startDate);
                    dateStr = dateObj.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });
                }

                const dateDiv = document.createElement('div');
                dateDiv.textContent = dateStr;
                whenCell.appendChild(dateDiv);

                if (event.startTime) {
                    const timeDiv = document.createElement('div');
                    timeDiv.className = 'event-time';
                    timeDiv.textContent = event.timeZone ? `${event.startTime} ${event.timeZone}` : event.startTime;
                    whenCell.appendChild(timeDiv);
                }
            } else {
                whenCell.textContent = 'TBD';
            }

            row.appendChild(whenCell);

            // Where column - location/format
            const whereCell = document.createElement('td');
            whereCell.className = 'event-where-cell';

            const whereParts = [];
            if (event.region) whereParts.push(event.region);
            if (event.format) whereParts.push(event.format);

            whereCell.textContent = whereParts.join(' • ') || '—';
            row.appendChild(whereCell);

            tbody.appendChild(row);
        });

        table.appendChild(tbody);

        return table;
    }

    // Calendar download functionality
    document.addEventListener('click', function (e) {
        if (e.target.closest('.add-to-calendar')) {
            e.preventDefault();
            e.stopPropagation();
            const button = e.target.closest('.add-to-calendar');
            const title = button.getAttribute('data-title');
            const dateStr = button.getAttribute('data-date');
            const timeStr = button.getAttribute('data-time');
            const timeZone = button.getAttribute('data-timezone');
            const description = button.getAttribute('data-description');
            const eventLink = button.getAttribute('data-link') || window.location.href;

            const icsContent = ISOC.Utils.generateICS({
                title: title,
                description: description,
                startDate: dateStr,
                startTime: timeStr,
                url: eventLink
            });

            ISOC.Utils.downloadFile(icsContent, `event-${ISOC.Utils.slugify(title)}.ics`, 'text/calendar;charset=utf-8');
        }
    });

    // Initialize View Toggle
    function initializeViewToggle() {
        const viewToggle = document.getElementById('view-toggle');
        if (!viewToggle) return;

        const updateView = (viewMode) => {
            const sections = document.querySelectorAll('.dynamic-section');
            sections.forEach(section => {
                if (viewMode === 'table') {
                    section.classList.add('view-table');
                } else {
                    section.classList.remove('view-table');
                }
            });

            document.querySelectorAll('.view-option').forEach(opt => {
                if (opt.dataset.view === viewMode) {
                    opt.classList.add('active');
                } else {
                    opt.classList.remove('active');
                }
            });

            localStorage.setItem('eventsViewMode', viewMode);
        };

        // Use event delegation since the toggle is re-created when filtering
        document.addEventListener('click', function (e) {
            const viewToggle = e.target.closest('.view-toggle');
            if (!viewToggle) return;

            const viewOption = e.target.closest('.view-option');
            if (!viewOption) return;

            // Prevent default button behavior
            e.preventDefault();

            updateView(viewOption.dataset.view);
        });

        const savedViewMode = localStorage.getItem('eventsViewMode') || 'cards';
        updateView(savedViewMode);
    }

    // Init
    async function init() {
        allEvents = await fetchEvents();
        populateFilters(allEvents);
        initializeFilters();
        const filteredEvents = filterEvents(allEvents);
        renderEvents(filteredEvents);
        updateEventCount(filteredEvents.length);
        initializeViewToggle();
    }

    // Subscription dialog functionality
    let lastFocusedElement;

    function trapFocus(modal) {
        const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        modal.addEventListener('keydown', function (e) {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        });

        // Focus the first element
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }

    function showSubscriptionDialog(feedType, feedUrl) {
        // Remove any existing subscription modal
        const existingModal = document.getElementById('subscription-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Store currently focused element
        lastFocusedElement = document.activeElement;

        // Create modal HTML
        const modal = document.createElement('div');
        modal.id = 'subscription-modal';
        modal.className = 'subscription-modal';

        const isRSS = feedType === 'rss';
        const feedTitle = isRSS ? 'RSS Feed' : 'Calendar Feed (iCal)';
        const feedDescription = isRSS
            ? 'Stay updated with the latest Internet Society community events'
            : 'Add upcoming Internet Society community events to your calendar';

        // Popular RSS readers and calendar apps with verified subscription URLs
        const popularApps = isRSS ? [
            { name: 'Feedly', url: `https://feedly.com/i/subscription/feed/${encodeURIComponent(feedUrl)}`, icon: 'fas fa-rss' },
            { name: 'Inoreader', url: `https://www.inoreader.com/feed/${encodeURIComponent(feedUrl)}`, icon: 'fas fa-rss' },
            { name: 'The Old Reader', url: `https://theoldreader.com/feeds/subscribe?url=${encodeURIComponent(feedUrl)}`, icon: 'fas fa-rss' }
        ] : [
            { name: 'Google Calendar', url: `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(feedUrl)}`, icon: 'fab fa-google' },
            { name: 'Apple Calendar', url: `webcal://${feedUrl.replace(/^https?:\/\//, '')}`, icon: 'fab fa-apple' }
        ];

        modal.innerHTML = `
            <div class="subscription-modal-content">
                <span class="subscription-modal-close">&times;</span>
                <div class="subscription-header">
                    <div class="subscription-icon">
                        <i class="${isRSS ? 'fas fa-rss' : 'fas fa-calendar-alt'}"></i>
                    </div>
                    <h3>Subscribe to ${feedTitle}</h3>
                    <p class="subscription-description">${feedDescription}</p>
                </div>
                
                <div class="subscription-section">
                    <h4><i class="fas fa-copy"></i> Copy Feed URL</h4>
                    <div class="url-copy-container">
                        <input type="text" class="feed-url-input" value="${feedUrl}" readonly>
                        <button class="copy-url-btn" data-url="${feedUrl}">
                            <i class="fas fa-copy"></i>
                            <span class="copy-text">Copy</span>
                        </button>
                    </div>
                    <p class="copy-instruction">Copy this URL and paste it into your preferred ${isRSS ? 'RSS reader' : 'calendar app'}.</p>
                </div>
                
                <div class="subscription-section">
                    <h4><i class="fas fa-external-link-alt"></i> Quick Subscribe</h4>
                    <p class="quick-subscribe-description">Click on your preferred app to subscribe directly:</p>
                    <div class="popular-apps">
                        ${popularApps.map(app => `
                            <a href="${app.url}" target="_blank" rel="noopener noreferrer" class="app-link">
                                <i class="${app.icon}"></i>
                                <span>${app.name}</span>
                            </a>
                        `).join('')}
                    </div>
                </div>
                
                <div class="subscription-section manual-instructions">
                    <h4><i class="fas fa-info-circle"></i> Manual Instructions</h4>
                    <div class="instruction-content">
                        ${isRSS ? `
                            <p><strong>For most RSS readers:</strong></p>
                            <ol>
                                <li>Open your RSS reader app</li>
                                <li>Look for "Add feed", "Subscribe", or "+" button</li>
                                <li>Paste the copied URL</li>
                                <li>Confirm the subscription</li>
                            </ol>
                        ` : `
                            <p><strong>For most calendar apps:</strong></p>
                            <ol>
                                <li>Open your calendar application</li>
                                <li>Look for "Add calendar" or "Subscribe to calendar"</li>
                                <li>Paste the copied URL</li>
                                <li>The events will appear in your calendar</li>
                            </ol>
                        `}
                    </div>
                </div>
            </div>
        `;

        // Add modal to body
        document.body.appendChild(modal);

        // Show modal with animation
        requestAnimationFrame(() => {
            modal.style.display = 'flex';
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            trapFocus(modal);
        });

        // Add event listeners for modal
        const closeBtn = modal.querySelector('.subscription-modal-close');
        const copyBtn = modal.querySelector('.copy-url-btn');
        const urlInput = modal.querySelector('.feed-url-input');

        // Close modal handlers
        closeBtn.addEventListener('click', () => closeSubscriptionModal(modal));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeSubscriptionModal(modal);
            }
        });

        // Copy URL functionality
        copyBtn.addEventListener('click', () => {
            urlInput.select();
            urlInput.setSelectionRange(0, 99999); // For mobile devices

            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    // Show success feedback
                    const originalText = copyBtn.querySelector('.copy-text').textContent;
                    const copyIcon = copyBtn.querySelector('i');

                    copyBtn.querySelector('.copy-text').textContent = 'Copied!';
                    copyIcon.className = 'fas fa-check';
                    copyBtn.classList.add('copied');

                    setTimeout(() => {
                        copyBtn.querySelector('.copy-text').textContent = originalText;
                        copyIcon.className = 'fas fa-copy';
                        copyBtn.classList.remove('copied');
                    }, 2000);
                } else {
                    throw new Error('Copy command failed');
                }
            } catch (err) {
                // Fallback for modern browsers
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(feedUrl).then(() => {
                        const originalText = copyBtn.querySelector('.copy-text').textContent;
                        const copyIcon = copyBtn.querySelector('i');

                        copyBtn.querySelector('.copy-text').textContent = 'Copied!';
                        copyIcon.className = 'fas fa-check';
                        copyBtn.classList.add('copied');

                        setTimeout(() => {
                            copyBtn.querySelector('.copy-text').textContent = originalText;
                            copyIcon.className = 'fas fa-copy';
                            copyBtn.classList.remove('copied');
                        }, 2000);
                    }).catch(() => {
                        // Show fallback message
                        alert('Please manually copy the URL from the text field above.');
                    });
                } else {
                    alert('Please manually copy the URL from the text field above.');
                }
            }
        });

        // Allow clicking on input to select all
        urlInput.addEventListener('click', () => {
            urlInput.select();
        });
    }

    function closeSubscriptionModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            if (!document.querySelector('.subscription-modal.show')) {
                document.body.style.overflow = '';
            }
            modal.remove();

            // Restore focus
            if (lastFocusedElement) {
                lastFocusedElement.focus();
            }
        }, 200);
    }

    // Close subscription modal with Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const openSubscriptionModal = document.querySelector('.subscription-modal.show');
            if (openSubscriptionModal) {
                closeSubscriptionModal(openSubscriptionModal);
            }
        }
    });

    // Handle subscription links
    document.addEventListener('click', function (e) {
        if (e.target.closest('.subscription-link')) {
            e.preventDefault();
            const link = e.target.closest('.subscription-link');
            const feedType = link.getAttribute('data-feed-type');
            const feedUrl = link.getAttribute('data-feed-url');

            // Convert relative URL to absolute URL
            const absoluteUrl = feedUrl.startsWith('http') ? feedUrl : new URL(feedUrl, window.location.href).href;

            showSubscriptionDialog(feedType, absoluteUrl);
        }
    });

    // Modal functionality for Add Event button
    const addEventBtn = document.getElementById('add-event-btn');
    const modal = document.getElementById('event-form-modal');
    const closeModalBtn = document.getElementById('close-modal');

    if (addEventBtn && modal) {
        // Open modal when Add Event button is clicked
        addEventBtn.addEventListener('click', function () {
            lastFocusedElement = document.activeElement;
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
            trapFocus(modal);
        });

        // Close modal when close button is clicked
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', function () {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto'; // Restore scrolling
                if (lastFocusedElement) lastFocusedElement.focus();
            });
        }

        // Close modal when clicking outside the modal content
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto'; // Restore scrolling
                if (lastFocusedElement) lastFocusedElement.focus();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto'; // Restore scrolling
                if (lastFocusedElement) lastFocusedElement.focus();
            }
        });
    }

    // Filter toggle functionality
    const filterToggleBtn = document.getElementById('filter-toggle-btn');
    const filtersSection = document.querySelector('.filters-section');

    if (filterToggleBtn && filtersSection) {
        // Set initial state - hidden by default
        filtersSection.classList.remove('show');

        // Handle toggle click
        filterToggleBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (filtersSection.classList.contains('show')) {
                filtersSection.classList.remove('show');
            } else {
                filtersSection.classList.add('show');
            }
        });

        // Close filters when clicking outside
        document.addEventListener('click', function (e) {
            if (!filtersSection.contains(e.target) && e.target !== filterToggleBtn && !filterToggleBtn.contains(e.target)) {
                filtersSection.classList.remove('show');
            }
        });

        // Prevent clicks inside filters from closing it
        filtersSection.addEventListener('click', function (e) {
            e.stopPropagation();
        });
    }

    init();
});
