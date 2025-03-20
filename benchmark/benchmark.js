'use strict';

const Benchmark = require('benchmark');
const suite = new Benchmark.Suite;
const robotstxtjs = require('../src/robotstxt.js');
const { robotstxt } = robotstxtjs;

// Generate test content
const largeContent = Array(10000).fill().map((_, i) =>
    `User-agent: Bot${i}\nDisallow: /path${i}\nAllow: /public\n`
).join('\n');

const complexContent = `
User-agent: *
Disallow: /private
Allow: /public
Crawl-delay: 10

${Array(500).fill().map((_, i) => `User-agent: SpecialBot${i}\nDisallow: /special/${i}\n`).join('\n')}

Sitemap: https://example.com/sitemap.xml`.trim();

// Benchmark scenarios
suite
    .add('Large robots.txt (10k rules)', () => {
        robotstxt(largeContent);
    })
    .add('Complex robots.txt (500 UAs)', () => {
        robotstxt(complexContent);
    })
    .add('Simple robots.txt', () => {
        robotstxt('User-agent: *\nDisallow: /admin\nAllow: /');
    })
    .add('Empty robots.txt', () => {
        robotstxt('');
    })
    .on('cycle', (event) => {
        /* eslint-disable no-console */
        console.log(String(event.target));
        /* eslint-enable no-console */
    })
    .on('complete', function () {
        /* eslint-disable no-console */
        console.log(`\nFastest is ${  this.filter('fastest').map('name')}`);
        /* eslint-enable no-console */
    })
    .run({ async: true });

module.exports = suite;
