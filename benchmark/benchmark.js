const Benchmark = require('benchmark')
const suite = new Benchmark.Suite
const robotstxtjs = require('../src/robotstxt.js')
const robotstxt = robotstxtjs.robotstxt

// Generate test content
const largeContent = Array(10000).fill().map((_, i) =>
    `User-agent: Bot${i}\nDisallow: /path${i}\nAllow: /public\n`
).join('\n')

const complexContent = `
User-agent: *
Disallow: /private
Allow: /public
Crawl-delay: 10

${Array(500).fill().map((_, i) =>
        `User-agent: SpecialBot${i}\nDisallow: /special/${i}\n`
    ).join('\n')}

Sitemap: https://example.com/sitemap.xml
`.trim()

// Benchmark scenarios
suite
    .add('Large robots.txt (10k rules)', function () {
        robotstxt(largeContent)
    })
    .add('Complex robots.txt (500 UAs)', function () {
        robotstxt(complexContent)
    })
    .add('Simple robots.txt', function () {
        robotstxt('User-agent: *\nDisallow: /admin\nAllow: /')
    })
    .add('Empty robots.txt', function () {
        robotstxt('')
    })
    .on('cycle', function (event) {
        console.log(String(event.target))
    })
    .on('complete', function () {
        console.log('\nFastest is ' + this.filter('fastest').map('name'))
    })
    .run({ async: true })

module.exports = suite
