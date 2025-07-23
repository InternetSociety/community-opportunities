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
            // Filter out archived or no-title
            .filter(item => item.title && !item.archived);
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
        
        // Generate navigation links using the same slugify function as section IDs
        const navHtml = types.map(type => 
            `<a href="#${slugify(type)}">${type}</a>`
        ).join('');
        
        nav.innerHTML = navHtml;
    }

    // Initialize the application
    async function init() {
        try {
            const opportunities = await fetchOpportunities();
            allOpportunities = opportunities;
            filteredOpportunities = [...allOpportunities];
            renderNavigation(opportunities);
            renderFilters(opportunities);
            renderSectionsByType(opportunities);
            
            // Initialize view toggle after sections are rendered
            initializeViewToggle();
            
            // Initialize the filter toggle after everything is rendered
            const toggle = document.getElementById('filter-toggle');
            const filterSection = document.getElementById('filter-section');
            
            if (toggle && filterSection) {
                // Function to position the filter panel
                const positionFilterPanel = () => {
                    const buttonRect = toggle.getBoundingClientRect();
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
                    
                    // Position the panel above the button with some spacing
                    filterSection.style.maxHeight = `${maxHeight}px`;
                    filterSection.style.minHeight = '200px'; // Ensure minimum height
                    filterSection.style.bottom = `${window.innerHeight - buttonRect.top + 10}px`;
                    
                    // Ensure the panel stays within viewport bounds
                    const panelWidth = Math.min(320, viewportWidth - 40);
                    filterSection.style.width = `${panelWidth}px`;
                    const rightPos = Math.max(minPadding, viewportWidth - buttonRect.right - buttonRect.width/2);
                    filterSection.style.right = `${rightPos}px`;
                };
                
                toggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    const isExpanded = filterSection.style.display === 'block';
                    
                    if (!isExpanded) {
                        // Show the panel first to calculate dimensions
                        filterSection.style.display = 'block';
                        positionFilterPanel();
                    } else {
                        filterSection.style.display = 'none';
                    }
                    
                    toggle.classList.toggle('active', !isExpanded);
                });
                
                // Re-position on window resize
                window.addEventListener('resize', () => {
                    if (filterSection.style.display === 'block') {
                        positionFilterPanel();
                    }
                });
                
                // Show the toggle button after initialization
                toggle.style.display = 'flex';
                
                // Close filter when clicking outside
                document.addEventListener('click', (e) => {
                    if (!filterSection.contains(e.target) && !toggle.contains(e.target)) {
                        filterSection.style.display = 'none';
                        toggle.classList.remove('active');
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
        
        ['Title', 'Description', 'Date', 'Action'].forEach(headerText => {
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
            
            // Title column
            const titleCell = document.createElement('td');
            titleCell.className = 'title-column';
            titleCell.textContent = opp.title;
            row.appendChild(titleCell);
            
            // Description column (truncated)
            const descCell = document.createElement('td');
            const description = opp.opportunity_description || '';
            descCell.textContent = description.length > 100 
                ? description.substring(0, 100) + '...' 
                : description;
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
            
            // Action column
            const actionsCell = document.createElement('td');
            if (opp.link) {
                const actionLink = document.createElement('a');
                actionLink.href = opp.link;
                actionLink.className = 'action-link';
                actionLink.textContent = opp.action_text || 'View';
                actionLink.target = '_blank';
                actionLink.rel = 'noopener noreferrer';
                actionsCell.appendChild(actionLink);
            }
            row.appendChild(actionsCell);
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        container.appendChild(table);
        
        return container;
    }

    // Render a single opportunity card with icons, tags, and structure matching the static version
    function renderOpportunityCard(o) {
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
            
        return `
            <div class="action-card">
                <h3>${o.link ? `<a href="${o.link}" target="_blank" rel="noopener noreferrer" class="card-title-link">${o.title}</a>` : o.title}</h3>
                ${tagsHtml}
                <ul>
                    ${date}
                    ${description}
                    ${whyItMatters}
                </ul>
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
});
