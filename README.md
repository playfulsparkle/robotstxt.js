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
- Small footprint (< 4 KB minified+gzipped)

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

# API Documentation

## Core Methods

- `robotstxt(content: string): RobotsTxtParser` - Creates a new parser instance with the provided `robots.txt` content.
- `isAllowed(url: string, userAgent: string): boolean` - Check if a URL is allowed for the specified user agent (throws if parameters are missing).
- `isDisallowed(url: string, userAgent: string): boolean` - Check if a URL is disallowed for the specified user agent (throws if parameters are missing).
- `getGroup(userAgent: string): Group | undefined` - Get the rules group for a specific user agent (case-insensitive match).
- `getSitemaps(): string[]` - Get an array of discovered sitemap URLs from Sitemap directives.
- `getCleanParams(): string[]` - Retrieve Clean-param directives for URL parameter sanitization.
- `getHost(): string | undefined` - Get canonical host declaration for domain normalization.

## Group Methods (via `getGroup()` result)

### User Agent Info
- `getName(): string` - User agent name for this group.
- `getComment(): string[]` - Associated comment from the Comment directive.
- `getRobotVersion(): string | undefined` - Robots.txt specification version.
- `getVisitTime(): string | undefined` - Recommended crawl time window.

### Crawl Management
- `getCacheDelay(): number | undefined` - Cache delay in seconds.
- `getCrawlDelay(): number | undefined` - Crawl delay in seconds.
- `getRequestRates(): string[]` - Request rate limitations.

### Rule Access
- `getRules(): Rule[]` - All rules (allow/disallow/noindex) for this group.
- `addRule(type: string, path: string): void` - Add rule (throws if type missing, throws if path missing).

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

`robotstxt.js` runs in all active Node versions (6.x+).

### Browser Support

This library is written using modern JavaScript ES2015 (ES6) features. It is expected to work in the following browser versions and later:

| Browser                  | Minimum Supported Version |
|--------------------------|---------------------------|
| **Desktop Browsers**     |                           |
| Chrome                   | 19                        |
| Edge                     | 12                        |
| Firefox                  | 26                        |
| Opera                    | 15                        |
| Safari                   | 14.1                      |
| **Mobile Browsers**      |                           |
| Chrome Android           | 25                        |
| Firefox for Android      | 26                        |
| Opera Android            | 14                        |
| Safari on iOS            | 14.5                      |
| Samsung Internet         | 1.5                       |
| WebView Android          | 4.4                       |
| WebView on iOS           | 14.5                      |
| **Other**                |                           |
| Node.js                  | 6.13.0                    |


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
