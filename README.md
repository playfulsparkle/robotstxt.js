# robotstxt.js

**robotstxt.js** is a lightweight, compliant JavaScript parser for **robots.txt** files, working in both browsers and Node.js environments.

## Features
- Full compliance with Google"s robots.txt specification
- Zero-dependency implementation
- Support for wildcard patterns (`*`) and URL matching
- Crawl-delay handling
- Sitemap discovery
- Case-insensitive user-agent matching
- Efficient path matching algorithms
- Small footprint (< 3 KB minified+gzipped)

## Usage

### Node.js

```javascript
const { robotstxt } = require("@playfulsparkle/robotstxt-js")
...
```

### JavaScript

```javascript
// Parse robots.txt content
const robotsTxtContent = `
User-Agent: GoogleBot
Allow: /public
Disallow: /private
Crawl-Delay: 5
Sitemap: https://example.com/sitemap.xml
`;

const parser = robotstxt(robotsTxtContent);

// Check URL permissions
console.log(parser.isAllowed("/public/data", "GoogleBot"));  // true
console.log(parser.isDisallowed("/private/admin", "GoogleBot")); // true

// Get specific user agent group
const googleBotGroup = parser.getGroup("googlebot"); // Case-insensitive
if (googleBotGroup) {
    console.log("Crawl Delay:", googleBotGroup.getCrawlDelay()); // 5
    console.log("Rules:", googleBotGroup.getRules().map(rule =>
        `${rule.type}: ${rule.path}`
    )); // ["allow: /public", "disallow: /private"]
}

// Get all sitemaps
console.log("Sitemaps:", parser.getSitemaps()); // ["https://example.com/sitemap.xml"]

// Check default rules (wildcard *)
console.log(parser.isAllowed("/protected", "*")); // true (if no wildcard rules exist)
```

## Installation

### NPM
```bash
npm i @playfulsparkle/robotstxt-js
```

### Bower
```bash
bower install playfulsparkle/robotstxt.js
```

## API

### Core Methods

`robotstxt(content: string): RobotsTxtParser`
Creates a new parser instance with the provided robots.txt content

`isAllowed(url: string, userAgent: string): boolean`
Check if a URL is allowed for specified user agent

`isDisallowed(url: string, userAgent: string): boolean`
Check if a URL is disallowed for specified user agent

`getGroup(userAgent: string): Group | undefined`
Get the rules group for specific user agent

`getSitemaps(): string[]`
Get array of discovered sitemap URLs

### Group Methods (via getGroup() result)
`getName(): string` - Get user agent name for this group
`getCrawlDelay(): number | undefined` - Get crawl delay in seconds
`getRules(): Rule[]` - Get all rules for this group

## Specification Support

### Full Support
* User-agent groups and inheritance
* Allow/Disallow directives
* Wildcard pattern matching (`*`)
* End-of-path matching (`$`)
* Crawl-delay directives
* Sitemap discovery
* Case-insensitive matching
* Default user-agent (`*`) handling
* Multiple user-agent declarations
* Rule precedence by specificity

## Support

### Node.js

`robotstxt.js` runs in all active Node versions (4.x+).

### Browser Support

This library is written using modern JavaScript (ES6/ES2015) features. It is expected to work in the following browser versions and later:

| Browser         | Version |
|-----------------|---------|
| Chrome          | 49      |
| Firefox         | 45      |
| Safari          | 9       |
| Edge            | 13      |
| Mobile Chrome   | 49      |
| iOS Safari      | 9       |
| Node.js         | 4.0.0   |

## Performance

Designed for high performance with:

- Optimized parsing routines
- Precompiled matching patterns
- Efficient data structures
- Lazy evaluation where possible

Benchmarks show parsing of 10,000 rules in < 15ms on modern hardware.

## License

**robotstxt.js** is licensed under the terms of the BSD 3-Clause License.

## Contributing

Pull requests and issues welcome! Please follow:

1. Fork repository
2. Create feature branch
3. Add tests for new functionality
4. Submit PR
