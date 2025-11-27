#!/usr/bin/env node

/**
 * Simple Smoke Test for ISOC Opportunities
 * Verifies that key pages load and render content
 */

const fs = require('fs');
const path = require('path');

// Very basic smoke test - checks that key files exist and have content
function runSmokeTest() {
    console.log('🧪 Running smoke tests...\n');

    let passed = 0;
    let failed = 0;

    const tests = [
        {
            name: 'index.html exists',
            test: () => fs.existsSync(path.join(__dirname, '../index.html'))
        },
        {
            name: 'main.js exists',
            test: () => fs.existsSync(path.join(__dirname, '../js/main.js'))
        },
        {
            name: 'utils.js exists',
            test: () => fs.existsSync(path.join(__dirname, '../js/utils.js'))
        },
        {
            name: 'styles.css exists',
            test: () => fs.existsSync(path.join(__dirname, '../css/styles.css'))
        },
        {
            name: 'opportunities.json exists and is valid JSON',
            test: () => {
                const file = path.join(__dirname, '../data/opportunities.json');
                if (!fs.existsSync(file)) return false;
                try {
                    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
                    return Array.isArray(data);
                } catch (e) {
                    return false;
                }
            }
        },
        {
            name: 'events.json exists and is valid JSON',
            test: () => {
                const file = path.join(__dirname, '../community-events/data/events.json');
                if (!fs.existsSync(file)) return false;
                try {
                    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
                    return Array.isArray(data);
                } catch (e) {
                    return false;
                }
            }
        },
        {
            name: 'ISOC.Utils namespace is defined in utils.js',
            test: () => {
                const utilsFile = path.join(__dirname, '../js/utils.js');
                const content = fs.readFileSync(utilsFile, 'utf8');
                return content.includes('window.ISOC.Utils');
            }
        },
        {
            name: 'CSS variables are defined in styles.css',
            test: () => {
                const cssFile = path.join(__dirname, '../css/styles.css');
                const content = fs.readFileSync(cssFile, 'utf8');
                return content.includes(':root') && content.includes('--isoc-blue');
            }
        }
    ];

    tests.forEach(({ name, test }) => {
        try {
            if (test()) {
                console.log(`✅ ${name}`);
                passed++;
            } else {
                console.log(`❌ ${name}`);
                failed++;
            }
        } catch (error) {
            console.log(`❌ ${name} - Error: ${error.message}`);
            failed++;
        }
    });

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Passed: ${passed}/${tests.length}`);
    console.log(`Failed: ${failed}/${tests.length}`);
    console.log('='.repeat(50));

    return failed === 0;
}

const success = runSmokeTest();
process.exit(success ? 0 : 1);
