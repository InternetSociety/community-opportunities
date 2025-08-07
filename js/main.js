// main.js - Dynamically loads and displays ISOC opportunities
// Author: ISOC Opportunities Dashboard
//
// This script loads data/opportunities.json, filters and displays opportunities
// grouped by Type, and implements filtering by region, internet issue, and who can get involved.

// DOMContentLoaded ensures script runs after HTML is parsed
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const container = document.querySelector('.container');
    const nav = document.querySelector('.top-nav');
    
    // Path to the opportunities data
    const DATA_PATH = 'data/opportunities.json';

    // Store loaded data
    let allOpportunities = [];
    let filteredOpportunities = [];
    let filters = {
        region: null,
        issue: null,
        who: null
    };

    // Load filters from localStorage
    function loadFilters() {
        const savedFilters = localStorage.getItem('opportunityFilters');
        if (savedFilters) {
            try {
                const parsed = JSON.parse(savedFilters);
                // Only load filters that match our expected structure
                if (parsed.region || parsed.issue || parsed.who) {
                    return {
                        region: parsed.region || null,
                        issue: parsed.issue || null,
                        who: parsed.who || null
                    };
                }
            } catch (e) {
                console.warn('Failed to parse saved filters', e);
            }
        }
        return { region: null, issue: null, who: null };
    }

    // Save filters to localStorage
    function saveFilters() {
        try {
            localStorage.setItem('opportunityFilters', JSON.stringify(filters));
        } catch (e) {
            console.warn('Failed to save filters', e);
        }
    }

    // Check if a date string is in the past
    function isDateInPast(dateString) {
        if (!dateString || typeof dateString !== 'string') return false;
        
        // If it's "Ongoing", it's never in the past
        if (dateString.trim().toLowerCase() === 'ongoing') return false;
        
        try {
            // Try to parse the date
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return false; // Invalid date
            
            // Create today's date at midnight for comparison
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            return date < today;
        } catch (e) {
            console.warn('Error parsing date:', dateString, e);
            return false; // If we can't parse it, don't filter it out
        }
    }

    // Fetch opportunities data
    async function fetchOpportunities() {
        try {
            const response = await fetch(DATA_PATH);
            const data = await response.json();
            // Normalize property names for each opportunity
            return data.map(item => ({
                title: item["Outreach Activity [Title]"] || item.title || '',
                action_text: item["Action [CTA]"] || item.action_text || '',
                link: item["Link"] || item.link || '',
                opportunity_description: item["Opportunity [Description]"] || item.opportunity_description || '',
                why_it_matters: item["Why It Matters"] || item.why_it_matters || '',
                who_can_get_involved: (() => {
                    const value = item["Who Can Get Involved"] || item.who_can_get_involved;
                    if (!value) return [];
                    if (Array.isArray(value)) return value;
                    return value.split(',').map(s => s.trim()).filter(Boolean);
                })(),
                internet_issue: item["Internet Issue"] || item.internet_issue || '',
                region: item["Region"] || item.region || '',
                Type: item["Type"] || item.Type || '',
                date: item["Deadline"] || item["Date"] || item.date || null,
                archived: item["Archived"] || item.archived || null
            }))
            // Filter out archived, no-title, or past-dated opportunities (unless marked as "Ongoing")
            .filter(item => {
                if (!item.title || item.archived) return false;
                if (item.date && isDateInPast(item.date)) return false;
                return true;
            });
        } catch (error) {
            console.error('Error fetching opportunities:', error);
            throw error;
        }
    }

    // Render the navigation menu based on opportunity types
    function renderNavigation(opportunities) {
        if (!nav) return;
        
        // Get unique types and sort them with Urgent first and Ongoing last
        const types = [...new Set(opportunities.map(opp => opp.Type).filter(Boolean))];
        types.sort((a, b) => {
            if (a.toLowerCase().includes('urgent')) return -1;
            if (b.toLowerCase().includes('urgent')) return 1;
            if (a.toLowerCase().includes('ongoing')) return 1;
            if (b.toLowerCase().includes('ongoing')) return -1;
            return a.localeCompare(b);
        });
        
        // Create the navigation HTML with hamburger menu
        const navHtml = `
            <a href="/" class="logo-link">
                <img src="img/isoc-logo.png" alt="Internet Society" class="nav-logo">
            </a>
            <button class="hamburger" aria-label="Menu" aria-expanded="false">
                <i class="fas fa-bars"></i>
            </button>
            <div class="nav-overlay"></div>
            <div class="nav-links">
                ${types.map(type => `<a href="#${slugify(type)}">${type}</a>`).join('')}
            </div>
        `;
        
        nav.innerHTML = navHtml;
        
        // Get navigation elements
        const hamburger = nav.querySelector('.hamburger');
        const navLinks = nav.querySelector('.nav-links');
        const overlay = nav.querySelector('.nav-overlay');
        const logoLink = nav.querySelector('.logo-link');
        
        // Add smooth scroll to top when clicking the logo
        if (logoLink) {
            logoLink.addEventListener('click', function(e) {
                e.preventDefault();
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
                // Close mobile menu if open
                closeMenu();
            });
        }
        
        // Function to close the menu
        function closeMenu() {
            hamburger.setAttribute('aria-expanded', 'false');
            hamburger.querySelector('i').className = 'fas fa-bars';
            navLinks.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = ''; // Re-enable scrolling
        }
        
        // Function to open the menu
        function openMenu() {
            hamburger.setAttribute('aria-expanded', 'true');
            hamburger.querySelector('i').className = 'fas fa-times';
            navLinks.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scrolling when menu is open
        }
        
        // Toggle menu on hamburger click
        if (hamburger && navLinks && overlay) {
            hamburger.addEventListener('click', function() {
                const isExpanded = this.getAttribute('aria-expanded') === 'true';
                if (isExpanded) {
                    closeMenu();
                } else {
                    openMenu();
                }
            });
            
            // Close menu when clicking on overlay
            overlay.addEventListener('click', closeMenu);
            
            // Close menu when clicking on a nav link
            navLinks.addEventListener('click', function(e) {
                if (e.target.tagName === 'A' && window.innerWidth <= 1024) {
                    closeMenu();
                }
            });
            
            // Close menu when pressing Escape key
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && navLinks.classList.contains('active')) {
                    closeMenu();
                }
            });
        }
    }

    // Initialize the application
    async function init() {
        try {
            const opportunities = await fetchOpportunities();
            allOpportunities = opportunities;
            filteredOpportunities = [...allOpportunities];
            
            // Load saved filters before rendering
            filters = loadFilters();
            
            renderNavigation(opportunities);
            renderFilters(opportunities);
            
            // Apply any saved filters
            if (filters.region || filters.issue || filters.who) {
                applyFilters();
                // Show filter badge immediately if filters are active
                const filterBadge = document.getElementById('filter-badge');
                if (filterBadge) filterBadge.style.display = 'block';
            } else {
                renderSectionsByType(opportunities);
            }
            
            // Initialize view toggle after sections are rendered
            initializeViewToggle();
            
            // Initialize the filter toggle after everything is rendered
            const toggle = document.getElementById('filter-toggle');
            const headerFilterButton = document.getElementById('header-filter-button');
            const filterSection = document.getElementById('filter-section');
            
            if ((toggle || headerFilterButton) && filterSection) {
                // Function to position the filter panel
                const positionFilterPanel = (referenceElement) => {
                    const buttonRect = referenceElement.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;
                    const viewportWidth = window.innerWidth;
                    
                    // Calculate available space above the button (with minimum padding)
                    const minPadding = 20;
                    const spaceAbove = Math.max(buttonRect.top - minPadding, minPadding);
                    const spaceBelow = viewportHeight - buttonRect.bottom - minPadding;
                    
                    // Set max height to be at least 300px but not more than 80vh
                    const maxHeight = Math.min(
                        Math.max(spaceAbove, 300), // At least 300px or available space above
                        viewportHeight * 0.8,     // But no more than 80% of viewport height
                        600                       // Absolute max of 600px
                    );
                    
                    // Position the panel based on which button was clicked
                    filterSection.style.maxHeight = `${maxHeight}px`;
                    filterSection.style.minHeight = '200px'; // Ensure minimum height
                    
                    if (referenceElement.id === 'header-filter-button') {
                        // Position below the header button, centered
                        filterSection.style.top = `${buttonRect.bottom + 10}px`;
                        filterSection.style.bottom = 'auto';
                        filterSection.style.left = '50%';
                        filterSection.style.right = 'auto';
                        filterSection.style.transform = 'translateX(-50%)';
                    } else {
                        // Position above the floating button (original positioning)
                        filterSection.style.bottom = `${window.innerHeight - buttonRect.top + 10}px`;
                        filterSection.style.top = 'auto';
                        filterSection.style.left = 'auto';
                        filterSection.style.transform = 'none';
                        
                        // Ensure the panel stays within viewport bounds
                        const panelWidth = Math.min(320, viewportWidth - 40);
                        filterSection.style.width = `${panelWidth}px`;
                        const rightPos = Math.max(minPadding, viewportWidth - buttonRect.right - buttonRect.width/2);
                        filterSection.style.right = `${rightPos}px`;
                    }
                };
                
                // Function to handle filter toggle
                const handleFilterToggle = (referenceElement) => {
                    const isExpanded = filterSection.style.display === 'block';
                    
                    if (!isExpanded) {
                        // Show the panel first to calculate dimensions
                        filterSection.style.display = 'block';
                        positionFilterPanel(referenceElement);
                    } else {
                        filterSection.style.display = 'none';
                    }
                    
                    // Update button states
                    if (toggle) toggle.classList.toggle('active', !isExpanded);
                };
                
                // Add event listeners to both buttons
                if (toggle) {
                    toggle.addEventListener('click', (e) => {
                        e.preventDefault();
                        handleFilterToggle(toggle);
                    });
                }
                
                if (headerFilterButton) {
                    headerFilterButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        handleFilterToggle(headerFilterButton);
                    });
                }
                
                // Re-position on window resize
                window.addEventListener('resize', () => {
                    if (filterSection.style.display === 'block') {
                        // Find which button is currently active and reposition accordingly
                        const activeButton = toggle && toggle.classList.contains('active') ? toggle : headerFilterButton;
                        if (activeButton) {
                            positionFilterPanel(activeButton);
                        }
                    }
                });
                
                // Show the toggle button after initialization
                if (toggle) toggle.style.display = 'flex';
                
                // Close filter when clicking outside
                document.addEventListener('click', (e) => {
                    if (!filterSection.contains(e.target) && 
                        (!toggle || !toggle.contains(e.target)) && 
                        (!headerFilterButton || !headerFilterButton.contains(e.target))) {
                        filterSection.style.display = 'none';
                        if (toggle) toggle.classList.remove('active');
                    }
                });
            }
        } catch (error) {
            console.error('Error initializing application:', error);
            container.innerHTML = '<p>Error loading opportunities. Please try again later.</p>';
        }
    }

    // Render the top menu by Type
    function renderMenuByType(opps) {
        const types = Array.from(new Set(opps.map(o => o.Type))).filter(Boolean);
        nav.innerHTML = types.map(type => `<a href="#${slugify(type)}">${type}</a>`).join('');
    }

    // Render modern filter controls
    function renderFilters(opps) {
        // Helper to get unique values
        const unique = (arr, key) => {
            const values = arr.flatMap(x => {
                const val = x[key];
                return Array.isArray(val) ? val : val ? [val] : [];
            });
            return [...new Set(values)].filter(Boolean).sort();
        };
        
        // Select filter options based on saved filters
        function selectSavedFilters() {
            if (filters.region) {
                filters.region.forEach(value => {
                    const option = document.querySelector(`.region-filters .filter-option[data-value="${value}"]`);
                    if (option) option.classList.add('selected');
                });
            }
            if (filters.issue) {
                filters.issue.forEach(value => {
                    const option = document.querySelector(`.issue-filters .filter-option[data-value="${value}"]`);
                    if (option) option.classList.add('selected');
                });
            }
            if (filters.who) {
                filters.who.forEach(value => {
                    const option = document.querySelector(`.role-filters .filter-option[data-value="${value}"]`);
                    if (option) option.classList.add('selected');
                });
            }
            
            // Update the selected arrays to match the UI
            updateActiveFilters();
        }

        // Get all unique values for filters
        const regions = unique(opps, 'region');
        const issues = unique(opps, 'internet_issue');
        const roles = unique(opps, 'who_can_get_involved');
        
        // Store selected filters
        let selectedRegions = [];
        let selectedIssues = [];
        let selectedRoles = [];
        
        // Create filter options
        function createFilterOption(value, type) {
            const option = document.createElement('div');
            option.className = `filter-option ${type}`;
            option.textContent = value;
            option.dataset.value = value;
            option.addEventListener('click', () => {
                option.classList.toggle('selected');
                updateActiveFilters();
            });
            return option;
        }
        
        // Populate filter sections
        const regionContainer = document.querySelector('.region-filters');
        regions.forEach(region => {
            regionContainer.appendChild(createFilterOption(region, 'region'));
        });
        
        const issueContainer = document.querySelector('.issue-filters');
        issues.forEach(issue => {
            issueContainer.appendChild(createFilterOption(issue, 'issue'));
        });
        
        const roleContainer = document.querySelector('.role-filters');
        roles.forEach(role => {
            roleContainer.appendChild(createFilterOption(role, 'role'));
        });
        
        // Select any saved filters after populating the UI
        selectSavedFilters();
        
        // Update active filters
        function updateActiveFilters() {
            selectedRegions = Array.from(document.querySelectorAll('.region-filters .selected'))
                .map(el => el.dataset.value);
            selectedIssues = Array.from(document.querySelectorAll('.issue-filters .selected'))
                .map(el => el.dataset.value);
            selectedRoles = Array.from(document.querySelectorAll('.role-filters .selected'))
                .map(el => el.dataset.value);
        }
        
        // Get references to UI elements
        const filterToggle = document.getElementById('filter-toggle');
        const filterSection = document.getElementById('filter-section');
        const activeFiltersIndicator = document.getElementById('active-filters-indicator');
        
        // Function to show active filters indicator
        function showActiveFiltersIndicator() {
            activeFiltersIndicator.classList.add('visible');
            setTimeout(() => {
                activeFiltersIndicator.classList.remove('visible');
            }, 3000); // Hide after 3 seconds
        }
        
        // Function to update active filters count
        function updateActiveFiltersCount() {
            const activeFilterCount = [filters.region, filters.issue, filters.who]
                .filter(Boolean).length;
                
            const indicatorText = activeFilterCount > 0 
                ? `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} applied`
                : 'All filters cleared';
                
            activeFiltersIndicator.querySelector('span').textContent = indicatorText;
        }
        
        // Apply filters
        document.getElementById('apply-filters').addEventListener('click', () => {
            filters.region = selectedRegions.length ? selectedRegions : null;
            filters.issue = selectedIssues.length ? selectedIssues : null;
            filters.who = selectedRoles.length ? selectedRoles : null;
            
            // Save filters to localStorage
            saveFilters();
            
            // Close the filter dialog
            filterSection.style.display = 'none';
            filterToggle.classList.remove('active');
            
            // Apply filters and show visual feedback
            applyFilters();
            updateActiveFiltersCount();
            showActiveFiltersIndicator();
        });
        
        // Reset filters
        document.getElementById('reset-filters').addEventListener('click', () => {
            document.querySelectorAll('.filter-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            selectedRegions = [];
            selectedIssues = [];
            selectedRoles = [];
            filters.region = null;
            filters.issue = null;
            filters.who = null;
            
            // Clear saved filters
            localStorage.removeItem('opportunityFilters');
            
            // Close the filter dialog
            filterSection.style.display = 'none';
            filterToggle.classList.remove('active');
            
            // Apply filters and show visual feedback
            applyFilters();
            updateActiveFiltersCount();
            showActiveFiltersIndicator();
        });
    }

    // Apply filters and re-render sections
    function applyFilters() {
        filteredOpportunities = allOpportunities.filter(o => {
            // Check region filter
            const regionMatch = !filters.region || 
                (Array.isArray(o.region) 
                    ? o.region.some(r => filters.region.includes(r))
                    : filters.region.includes(o.region));
            
            // Check issue filter
            const issueMatch = !filters.issue ||
                (Array.isArray(o.internet_issue)
                    ? o.internet_issue.some(i => filters.issue.includes(i))
                    : filters.issue.includes(o.internet_issue));
            
            // Check who can get involved filter - now always an array
            const whoMatch = !filters.who || 
                o.who_can_get_involved.some(w => filters.who.includes(w));
            
            return regionMatch && issueMatch && whoMatch;
        });
        
        // Show/hide filter badge based on active filters
        const filterBadge = document.getElementById('filter-badge');
        const hasActiveFilters = filters.region || filters.issue || filters.who;
        
        if (filterBadge) {
            if (hasActiveFilters) {
                filterBadge.style.display = 'block';
            } else {
                filterBadge.style.display = 'none';
            }
        }
        
        renderSectionsByType(filteredOpportunities);
    }
    
    // Initialize the application when DOM is loaded
    init();
    
    // Add event delegation for calendar links
    document.addEventListener('click', function(e) {
        if (e.target.closest('.add-to-calendar')) {
            e.preventDefault();
            const link = e.target.closest('.add-to-calendar');
            const title = link.getAttribute('data-title');
            const dateStr = link.getAttribute('data-date');
            const description = link.getAttribute('data-description');
            const whyItMatters = link.getAttribute('data-why-it-matters') || '';
            const eventLink = link.getAttribute('data-link') || window.location.href;
            
            // Check if the date string includes a time component
            const hasTime = /\d{1,2}:\d{2}/.test(dateStr);
            
            // Create .ics file content
            const startDate = new Date(dateStr);
            let icsDateFields = [];
            
            if (hasTime) {
                // For events with specific time, set start and end times
                const endDate = new Date(startDate);
                endDate.setHours(startDate.getHours() + 1); // 1 hour event by default
                
                // Format dates with time for .ics
                const formatDateTimeForICS = (date) => {
                    return date.toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', 'T') + 'Z';
                };
                
                icsDateFields = [
                    `DTSTART:${formatDateTimeForICS(startDate)}`,
                    `DTEND:${formatDateTimeForICS(endDate)}`
                ];
            } else {
                // For all-day events, use DATE only (without time)
                const formatDateOnlyForICS = (date) => {
                    return date.toISOString().split('T')[0].replace(/-/g, '');
                };
                
                icsDateFields = [
                    'DTSTART;VALUE=DATE:' + formatDateOnlyForICS(startDate),
                    'DTEND;VALUE=DATE:' + formatDateOnlyForICS(new Date(startDate.getTime() + 24 * 60 * 60 * 1000)) // Next day
                ];
            }
            
            const icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Internet Society//Opportunities//EN',
                'BEGIN:VEVENT',
                `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', 'T')}Z`,
                ...icsDateFields,
                `SUMMARY:${title}`,
                `DESCRIPTION:${description}${whyItMatters ? '\n\nWhy it matters: ' + whyItMatters : ''}\n\nMore info: ${eventLink}`,
                `URL:${eventLink}`,
                'END:VEVENT',
                'END:VCALENDAR'
            ].join('\r\n');
            
            // Create and trigger download
            const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const linkEl = document.createElement('a');
            linkEl.href = url;
            linkEl.download = `event-${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
            document.body.appendChild(linkEl);
            linkEl.click();
            document.body.removeChild(linkEl);
            URL.revokeObjectURL(url);
        }
    });
    
    function initializeViewToggle() {
        const viewToggle = document.getElementById('view-toggle');
        if (!viewToggle) return;
        
        // Function to update all sections based on view mode
        const updateAllSections = (viewMode) => {
            console.log('Updating view to:', viewMode);
            
            // Update sections visibility
            const sections = document.querySelectorAll('.dynamic-section');
            sections.forEach(section => {
                if (viewMode === 'table') {
                    section.classList.add('view-table');
                    // Ensure table container is visible
                    const tableContainer = section.querySelector('.table-container');
                    if (tableContainer) {
                        tableContainer.style.display = 'block';
                    }
                } else {
                    section.classList.remove('view-table');
                    // Ensure card grid is visible
                    const cardGrid = section.querySelector('.card-grid');
                    if (cardGrid) {
                        cardGrid.style.display = 'grid';
                    }
                }
            });
            
            // Update toggle button states
            document.querySelectorAll('.view-option').forEach(opt => {
                if (opt.dataset.view === viewMode) {
                    opt.classList.add('active');
                } else {
                    opt.classList.remove('active');
                }
            });
            
            // Save preference to localStorage
            localStorage.setItem('opportunitiesViewMode', viewMode);
        };
        
        // Handle toggle clicks
        viewToggle.addEventListener('click', function(e) {
            const viewOption = e.target.closest('.view-option');
            if (!viewOption) return;
            
            const viewMode = viewOption.dataset.view;
            console.log('Toggle clicked, setting view to:', viewMode);
            updateAllSections(viewMode);
        });
        
        // Initialize with saved preference or default to 'cards'
        const savedViewMode = localStorage.getItem('opportunitiesViewMode') || 'cards';
        console.log('Initializing view with:', savedViewMode);
        
        // Force update to ensure consistent state
        requestAnimationFrame(() => {
            updateAllSections(savedViewMode);
        });
    }

    // Render sections grouped by Type with support for both card and table views
    function renderSectionsByType(opps) {
        // Get current view mode before removing anything
        const currentViewMode = localStorage.getItem('opportunitiesViewMode') || 'cards';
        
        // Remove old sections
        container.querySelectorAll('section.dynamic-section').forEach(e => e.remove());
        
        // Check if there are no opportunities to display
        if (opps.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.innerHTML = `
                <div class="no-results-content">
                    <h3>No opportunities match your current preferences</h3>
                    <button id="reset-filters-btn" class="btn btn-primary">
                        <i class="fas fa-filter"></i> Reset filters
                    </button>
                </div>
            `;
            container.appendChild(noResults);
            
            // Add event listener to the reset button
            const resetBtn = document.getElementById('reset-filters-btn');
            if (resetBtn) {
                resetBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    // Remove the no-results message
                    const noResults = document.querySelector('.no-results');
                    if (noResults) {
                        noResults.remove();
                    }
                    
                    // Find and click the actual reset button in the filter panel
                    const resetButton = document.getElementById('reset-filters');
                    if (resetButton) {
                        resetButton.click();
                    } else {
                        // Fallback: manually reset filters if button not found
                        document.querySelectorAll('.filter-option.selected').forEach(opt => opt.classList.remove('selected'));
                        filters.region = null;
                        filters.issue = null;
                        filters.who = null;
                        localStorage.removeItem('opportunityFilters');
                        // Re-render all opportunities
                        filteredOpportunities = [...allOpportunities];
                        renderSectionsByType(filteredOpportunities);
                    }
                });
            }
            
            // Show the filter badge to indicate active filters are causing no results
            const filterBadge = document.getElementById('filter-badge');
            if (filterBadge) {
                filterBadge.style.display = 'block';
                // Update the badge count to show number of active filters
                const activeFilterCount = [filters.region, filters.issue, filters.who].filter(Boolean).length;
                if (filterBadge.querySelector('span')) {
                    filterBadge.querySelector('span').textContent = activeFilterCount;
                }
            }
            
            return; // Exit early since there are no opportunities to display
        }
        
        // Get unique types and sort them with Urgent first and Ongoing last
        const types = Array.from(new Set(opps.map(o => o.Type))).filter(Boolean);
        types.sort((a, b) => {
            if (a.toLowerCase().includes('urgent')) return -1;
            if (b.toLowerCase().includes('urgent')) return 1;
            if (a.toLowerCase().includes('ongoing')) return 1;
            if (b.toLowerCase().includes('ongoing')) return -1;
            return a.localeCompare(b);
        });
        
        types.forEach(type => {
            const section = document.createElement('section');
            section.className = `dynamic-section ${currentViewMode === 'table' ? 'view-table' : ''}`;
            section.id = slugify(type);
            
            // Get opportunities for this type
            const typeOpportunities = opps.filter(o => o.Type === type);
            const isEventsSection = type.toLowerCase().includes('event');
            
            // Determine icon based on section type
            const typeIcon = type.toLowerCase().includes('urgent') ? 'fa-triangle-exclamation' :
                           type.toLowerCase().includes('event') ? 'fa-calendar-day' :
                           type.toLowerCase().includes('survey') ? 'fa-clipboard-question' : 'fa-rocket';
            
            // Create section header
            section.innerHTML = `
                <div class="section-header-container">
                    <h2 class="section-header"><i class="icon fa-solid ${typeIcon}"></i>${type}</h2>
                </div>
                <div class="section-content">
                    <div class="card-grid" style="${currentViewMode === 'table' ? 'display: none;' : 'display: grid;'}">
                        ${typeOpportunities.map(renderOpportunityCard).join('')}
                    </div>
                    <div class="table-container" style="${currentViewMode === 'table' ? 'display: block;' : 'display: none;'}"></div>
                    ${isEventsSection ? `
                    <div class="discover-all-container">
                        <a href="https://www.internetsociety.org/events/upcoming/" class="discover-all-button" target="_blank" rel="noopener noreferrer">
                            <i class="fas fa-calendar-alt"></i>
                            Discover all upcoming events
                        </a>
                    </div>
                    ` : ''}
                </div>
            `;
            
            // Append the section first
            container.appendChild(section);
            
            // Then render and append the table to its container
            const tableContainer = section.querySelector('.table-container');
            if (tableContainer) {
                const table = renderOpportunityTable(typeOpportunities);
                tableContainer.appendChild(table);
            }
        });
        
        // Re-initialize the view toggle to ensure proper state
        initializeViewToggle();
    }
    
    // Format a date string into a human-readable format
    function formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString; // Return original if invalid date
            
            return date.toLocaleDateString('en-US', { 
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateString; // Return original if any error
        }
    }
    
    // Render a table view for a list of opportunities
    function renderOpportunityTable(opportunities) {
        // Create container for the table with horizontal scrolling
        const container = document.createElement('div');
        container.className = 'table-container';
        
        const table = document.createElement('table');
        table.className = 'opportunity-table';
        
        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        ['Title', 'Description', 'Date'].forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        
        opportunities.forEach(opp => {
            const row = document.createElement('tr');
            
            // Title column with link and categories
            const titleCell = document.createElement('td');
            titleCell.className = 'title-column';
            
            // Create title container
            const titleContainer = document.createElement('div');
            titleContainer.className = 'title-container';
            
            // Add title link
            if (opp.link) {
                const titleLink = document.createElement('a');
                titleLink.href = opp.link;
                titleLink.target = '_blank';
                titleLink.rel = 'noopener noreferrer';
                titleLink.textContent = opp.title;
                titleLink.className = 'title-link';
                titleContainer.appendChild(titleLink);
            } else {
                const titleSpan = document.createElement('span');
                titleSpan.className = 'title-text';
                titleSpan.textContent = opp.title;
                titleContainer.appendChild(titleSpan);
            }
            
            // Add categories container
            const categoriesContainer = document.createElement('div');
            categoriesContainer.className = 'table-categories';
            
            // Add region if available
            if (opp.region) {
                const regionPill = document.createElement('span');
                regionPill.className = 'table-category region';
                regionPill.textContent = opp.region;
                categoriesContainer.appendChild(regionPill);
            }
            
            // Add internet issue if available
            if (opp.internet_issue) {
                const issuePill = document.createElement('span');
                issuePill.className = 'table-category issue';
                issuePill.textContent = opp.internet_issue;
                categoriesContainer.appendChild(issuePill);
            }
            
            // Removed who can get involved pills as per user request
            
            // Add categories container to title container
            if (categoriesContainer.children.length > 0) {
                titleContainer.appendChild(categoriesContainer);
            }
            
            // Add title container to cell
            titleCell.appendChild(titleContainer);
            row.appendChild(titleCell);
            
            // Description column (full text)
            const descCell = document.createElement('td');
            descCell.textContent = opp.opportunity_description || '';
            row.appendChild(descCell);
            
            // Date column
            const dateCell = document.createElement('td');
            if (opp.date) {
                dateCell.textContent = formatDate(opp.date) || 'No date';
                if (new Date(opp.date) < new Date()) {
                    dateCell.innerHTML += ' <span class="date-past">(Expired)</span>';
                }
            } else {
                dateCell.textContent = 'Ongoing';
            }
            row.appendChild(dateCell);
            
            // Action link is now part of the title
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        container.appendChild(table);
        
        return container;
    }

    // Render a single opportunity card with icons, tags, and structure matching the static version
    function renderOpportunityCard(o) {
        // Generate a unique ID for the modal
        const modalId = `audience-modal-${Math.random().toString(36).substr(2, 9)}`;
        
        // Format tags for region and internet issue
        const tags = [];
        if (o.region) tags.push(`<span class="tag tag-region"><i class="fa-solid fa-map-marker-alt"></i> ${o.region}</span>`);
        if (o.internet_issue) tags.push(`<span class="tag tag-issue"><i class="fa-solid fa-globe"></i> ${o.internet_issue}</span>`);
        
        const tagsHtml = tags.length ? `<div class="card-tags">${tags.join('')}</div>` : '';
        
        const date = o.date ? 
            `<li class="date">
                <i class="icon fa-regular fa-calendar"></i>
                <div>
                    <strong>Date:</strong>
                    <span class="date-date">${formatDate(o.date)}</span>
                </div>
            </li>` : '';
            
        // Format opportunity description
        const description = o.opportunity_description ? 
            `<li><i class="icon fa-solid fa-bullseye"></i><strong>Opportunity:</strong> ${o.opportunity_description}</li>` : '';
            
        // Format why it matters
        const whyItMatters = o.why_it_matters ? 
            `<li><i class="icon fa-solid fa-lightbulb"></i><strong>Why It Matters:</strong> ${o.why_it_matters}</li>` : '';
            
        // Add calendar icon only for event-type opportunities
        const calendarIcon = (o.Type && o.Type.toLowerCase().includes('event') && o.date && o.date !== 'Ongoing') ? 
            `<a href="#" class="add-to-calendar" 
                data-title="${o.title}" 
                data-date="${o.date}" 
                data-description="${o.opportunity_description || ''}"
                data-why-it-matters="${o.why_it_matters || ''}"
                data-link="${o.link || ''}">
                <i class="fas fa-calendar-plus" title="Add to calendar"></i>
            </a>` : '';

        return `
            <div class="action-card">
                <div class="card-header">
                    <h3>${o.link ? `<a href="${o.link}" target="_blank" rel="noopener noreferrer" class="card-title-link">${o.title}</a>` : o.title}</h3>
                    ${calendarIcon}
                </div>
                ${tagsHtml}
                <ul>
                    ${date}
                    ${description}
                    ${whyItMatters}
                </ul>
                <div class="card-footer">
                    ${o.link ? `<a href="${o.link}" target="_blank" rel="noopener noreferrer" class="cta-button">
                        <i class="icon fa-solid ${o.action_text.toLowerCase().includes('sign') ? 'fa-pen-to-square' : 
                                         o.action_text.toLowerCase().includes('submit') ? 'fa-file-lines' : 
                                         o.action_text.toLowerCase().includes('apply') ? 'fa-user-plus' : 
                                         o.action_text.toLowerCase().includes('register') ? 'fa-right-to-bracket' : 
                                         o.action_text.toLowerCase().includes('learn') ? 'fa-circle-info' : 
                                         o.action_text.toLowerCase().includes('express') ? 'fa-handshake-angle' : 
                                         o.action_text.toLowerCase().includes('nominate') ? 'fa-award' : 
                                         'fa-arrow-right'}"></i>${o.action_text || 'Learn More'}
                    </a>` : ''}
                    ${o.who_can_get_involved && o.who_can_get_involved.length > 0 ? `
                        <div class="audience-link-container">
                            <button class="audience-link" data-modal="${modalId}">
                                <i class="fa-solid fa-users"></i> Who can participate?
                            </button>
                        </div>` : ''}
                    ${o.who_can_get_involved && o.who_can_get_involved.length > 0 ? `
                        <div id="${modalId}" class="audience-modal" style="display: none;">
                            <div class="audience-modal-content">
                                <span class="audience-modal-close">&times;</span>
                                <h3>This opportunity is for</h3>
                                <ul class="audience-list">
                                    ${o.who_can_get_involved.map(audience => `<li>${audience}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Helper to slugify Type for IDs/anchors
    function slugify(text) {
        // First encode the text to handle special characters like colons
        let encoded = encodeURIComponent(text.toString().toLowerCase());
        // Replace %20 with hyphens and remove any other percent-encoded sequences
        return encoded.replace(/%20/g, '-').replace(/%[0-9A-F]{2}/gi, '').replace(/[^\w-]+/g, '');
    }

    // Handle audience modal functionality
    document.addEventListener('click', function handleModalClicks(e) {
        // Only handle left mouse button clicks
        if (e.button !== 0) return;
        
        const target = e.target;
        
        // Open modal when clicking on audience link
        const audienceLink = target.closest('.audience-link');
        if (audienceLink) {
            e.preventDefault();
            const modalId = audienceLink.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            if (modal) {
                // Close any open modals first
                document.querySelectorAll('.audience-modal.show').forEach(m => {
                    closeModal(m);
                });
                
                // Move modal to body to ensure proper positioning
                if (modal.parentNode !== document.body) {
                    document.body.appendChild(modal);
                }
                
                // Show the modal
                modal.style.display = 'flex';
                // Small delay to allow display to update before adding show class
                requestAnimationFrame(() => {
                    modal.classList.add('show');
                    document.body.style.overflow = 'hidden';
                });
            }
            return;
        }
        
        // Close modal when clicking on close button
        if (target.closest('.audience-modal-close')) {
            e.preventDefault();
            const modal = target.closest('.audience-modal');
            if (modal) {
                closeModal(modal);
            }
            return;
        }
        
        // Close modal when clicking on the overlay (outside content)
        if (target.classList.contains('audience-modal')) {
            const modalContent = target.querySelector('.audience-modal-content');
            if (modalContent && !modalContent.contains(target)) {
                closeModal(target);
            }
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.audience-modal.show');
            if (openModal) {
                closeModal(openModal);
            }
        }
    });
    
    // Function to handle modal closing with proper cleanup
    function closeModal(modal) {
        if (!modal) return;
        
        modal.classList.remove('show');
        // Wait for the transition to complete before hiding
        setTimeout(() => {
            modal.style.display = 'none';
            // Only re-enable scrolling if no other modals are open
            if (!document.querySelector('.audience-modal.show')) {
                document.body.style.overflow = '';
            }
        }, 200);
    }
});
