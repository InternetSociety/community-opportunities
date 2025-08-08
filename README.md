# Internet Society Community Opportunities Dashboard

A web dashboard that displays Internet Society community opportunities, automatically synchronized from Community Team data.

https://opportunities.internetsociety.org

## Overview

This project provides:
- **Responsive web interface** with filtering by region, Internet issues, and participant types
- **Automated data sync** from ISOC data sources
- **RSS and iCal feeds** for opportunity updates
- **Multiple view modes** (cards and table views)
- **Mobile-friendly navigation**

## Project Structure

```
├── index.html              # Main dashboard page
├── css/styles.css          # Styling and responsive design
├── js/main.js              # Client-side functionality
├── data/                   # Generated data files
│   ├── opportunities.json  # Main data source
│   ├── opportunities.csv   # CSV export
│   ├── opportunities.rss   # RSS feed
│   └── opportunities.ics   # iCal calendar feed
├── scripts/                # Data processing scripts
│   ├── generate_rss.js     # RSS feed generator
│   └── generate_ical.js    # iCal feed generator
└── .github/workflows/      # GitHub Actions automation
    ├── smartsheet-import.yml   # Regular data sync
    └── update-feeds.yml        # RSS/iCal generation

```

## Features

- **Smart filtering**: Filter opportunities by region, Internet issues, and who can participate
- **View toggle**: Switch between card and table views
- **Date filtering**: Automatically excludes past-dated opportunities
- **Feed integration**: RSS and iCal feeds for external consumption
- **Mobile responsive**: Optimized for all device sizes

## Setup and development

### Prerequisites
- Node.js (v18+)
- Access to configured Smartsheet API (for data sync)

### Local development
1. Clone the repository
2. Install dependencies: `npm install`
3. Open `index.html` in a web browser
4. For feed generation: `node scripts/generate_rss.js` or `node scripts/generate_ical.js`

### Environment variables
For GitHub Actions automation:
- `SMARTSHEET_TOKEN`: API token for Smartsheet access

## Data flow

1. **Smartsheet** → GitHub Actions (hourly) → `opportunities.json/csv`
2. **JSON data** → Feed generators → `opportunities.rss/ics`
3. **JSON data** → Frontend → Filtered opportunities display

## Contributing

1. Test locally before submitting PRs
2. Follow existing code style and patterns
3. Update documentation for any new features
4. Ensure mobile responsiveness for UI changes
