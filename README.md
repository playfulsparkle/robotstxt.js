# robotstxt.js

**robotstxt.js** is a **lightweight JavaScript library** for **parsing robots.txt files**. It provides a **compliant** solution in both **browser** and **Node.js** environments.

# Directives

- **Clean-param**
- **Host**
- **Sitemap**
- **User-agent**
  - Allow
  - Disallow
  - Crawl-delay
  - Cache-delay
  - Comment
  - NoIndex
  - Request-rate
  - Robot-version
  - Visit-time

## Benefits

- Accurately parse and interpret `robots.txt` rules.
- Ensure compliance with **robots.txt standards** to avoid accidental blocking of legitimate bots.
- Easily check URL permissions for different **user agents** programmatically.
- Simplify the process of working with `robots.txt` in **JavaScript applications**.

## Usage

Here's how to use `robotstxt.js` to **analyze robots.txt content** and check **crawler permissions**.

### Node.js

```javascript
const { robotstxt } = require("@playfulsparkle/robotstxt-js")
...

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
console.log(parser.isAllowed("/public/data", "GoogleBot"));   // true
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
- `getReports(): string[]` - Get an array of parsing error, warning etc.
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

# Specification Support

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

# Support

### Node.js

`robotstxt.js` runs in all active Node versions (6.x+).

### Browser Support

This library is written using modern JavaScript ES2015 (ES6) features. It is expected to work in the following browser versions and later:

| Browser                  | Minimum Supported Version |
|--------------------------|---------------------------|
| **Desktop Browsers**     |                           |
| Chrome                   | 49                        |
| Edge                     | 13                        |
| Firefox                  | 45                        |
| Opera                    | 36                        |
| Safari                   | 14.1                      |
| **Mobile Browsers**      |                           |
| Chrome Android           | 49                        |
| Firefox for Android      | 45                        |
| Opera Android            | 36                        |
| Safari on iOS            | 14.5                      |
| Samsung Internet         | 5.0                       |
| WebView Android          | 49                        |
| WebView on iOS           | 14.5                      |
| **Other**                |                           |
| Node.js                  | 6.13.0                    |

## Specifications
- [Google robots.txt specifications](https://developers.google.com/webmasters/control-crawl-index/docs/robots_txt)
- [Yandex robots.txt specifications](https://yandex.com/support/webmaster/controlling-robot/robots-txt.xml)
- [Sean Conner: _"An Extended Standard for Robot Exclusion"_](http://www.conman.org/people/spc/robots2.html)
- [Martijn Koster: _"A Method for Web Robots Control"_](http://www.robotstxt.org/norobots-rfc.txt)
- [Martijn Koster: _"A Standard for Robot Exclusion"_](http://www.robotstxt.org/orig.html)
- [RFC 7231](https://tools.ietf.org/html/rfc7231), [~~2616~~](https://tools.ietf.org/html/rfc2616)
- [RFC 7230](https://tools.ietf.org/html/rfc7230), [~~2616~~](https://tools.ietf.org/html/rfc2616)
- [RFC 5322](https://tools.ietf.org/html/rfc5322), [~~2822~~](https://tools.ietf.org/html/rfc2822), [~~822~~](https://tools.ietf.org/html/rfc822)
- [RFC 3986](https://tools.ietf.org/html/rfc3986), [~~1808~~](https://tools.ietf.org/html/rfc3986)
- [RFC 1945](https://tools.ietf.org/html/rfc1945)
- [RFC 1738](https://tools.ietf.org/html/rfc1738)
- [RFC 952](https://tools.ietf.org/html/rfc952)

## License

**robotstxt.js** is licensed under the terms of the BSD 3-Clause License.

