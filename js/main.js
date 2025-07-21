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
                deadline: item["Deadline"] || item.deadline || null,
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
            
            // Initialize the filter toggle after everything is rendered
            const toggle = document.getElementById('filter-toggle');
            const filterSection = document.getElementById('filter-section');
            
            if (toggle && filterSection) {
                toggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    const isExpanded = filterSection.style.display === 'block';
                    filterSection.style.display = isExpanded ? 'none' : 'block';
                    toggle.classList.toggle('active', !isExpanded);
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
        
        // Apply filters
        document.getElementById('apply-filters').addEventListener('click', () => {
            filters.region = selectedRegions.length ? selectedRegions : null;
            filters.issue = selectedIssues.length ? selectedIssues : null;
            filters.who = selectedRoles.length ? selectedRoles : null;
            applyFilters();
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
            applyFilters();
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
        renderSectionsByType(filteredOpportunities);
    }
    
    // Initialize the application when DOM is loaded
    init();

    // Render sections grouped by Type
    function renderSectionsByType(opps) {
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
            section.className = 'dynamic-section';
            section.id = slugify(type);
            // Determine icon based on section type
            const typeIcon = type.toLowerCase().includes('urgent') ? 'fa-triangle-exclamation' :
                           type.toLowerCase().includes('event') ? 'fa-calendar-day' :
                           type.toLowerCase().includes('survey') ? 'fa-clipboard-question' : 'fa-rocket';
            
            section.innerHTML = `
                <h2 class="section-header"><i class="icon fa-solid ${typeIcon}"></i>${type}</h2>
                <div class="card-grid">
                    ${opps.filter(o => o.Type === type).map(renderOpportunityCard).join('')}
                </div>
            `;
            container.appendChild(section);
        });
    }

    // Render a single opportunity card with icons, tags, and structure matching the static version
    function renderOpportunityCard(o) {
        // Format tags for region and internet issue
        const tags = [];
        if (o.region) tags.push(`<span class="tag tag-region"><i class="fa-solid fa-map-marker-alt"></i> ${o.region}</span>`);
        if (o.internet_issue) tags.push(`<span class="tag tag-issue"><i class="fa-solid fa-globe"></i> ${o.internet_issue}</span>`);
        
        const tagsHtml = tags.length ? `<div class="card-tags">${tags.join('')}</div>` : '';
        
        // Format deadline if it exists
        const formatDeadline = (dateString) => {
            try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return dateString; // Return original if invalid date
                
                return date.toLocaleDateString('en-US', { 
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric' // Adds the day of the month
                });
            } catch (e) {
                return dateString; // Return original if any error
            }
        };
        
        const deadline = o.deadline ? 
            `<li class="deadline">
                <i class="icon fa-regular fa-calendar"></i>
                <div>
                    <strong>Deadline:</strong>
                    <span class="deadline-date">${formatDeadline(o.deadline)}</span>
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
                <h3>${o.title}</h3>
                ${tagsHtml}
                <ul>
                    ${deadline}
                    ${description}
                    ${whyItMatters}
                </ul>
                ${o.link ? `<a href="${o.link}" target="_blank" rel="noopener noreferrer" class="cta-button">
                    <i class="icon ${o.action_text.toLowerCase().includes('sign') ? 'fa-pen-to-square' : 
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
