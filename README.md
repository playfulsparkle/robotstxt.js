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
```javascript
const r = robotstxt(`User-Agent: GoogleBot
    Allow: /
    Disallow: /
    Crawl-Delay: 10
    Sitemap: https://mywebsite.com/sitemap.xml`); // Returns RobotsTxtParser
r.isAllowed("/my-path", "GoogleBot"); // Returns true
r.isDisallowed("/my-path", "GoogleBot"); // Returns false
const ua = r.getUserAgent("GoogleBot");
ua.getName(); // Returns GoogleBot
ua.getCrawlDelay(); // Returns 10
ua.getRules(); // Returns Rule[]
r.getSitemaps(); // Returns array of sitemap URLs
```

## Installation

### NPM
```bash
npm install robotstxt.js
```

### Bower
```bash
bower install robotstxt.js
```

## API

`robotstxt(content: string): RobotsTxtParser`

Creates a new parser instance with the provided robots.txt content

`isAllowed(url: string, userAgent?: string): boolean`

Check if a URL is allowed for given user-agent

`isDisallowed(url: string, userAgent?: string): boolean`

Check if a URL is disallowed for given user-agent

`crawlDelay(userAgent?: string): number | null`

Get crawl delay in seconds for specified user-agent

`getSitemaps(): string[]`

Get array of discovered sitemap URLs

## Specification Support

* User-agent groups and inheritance
* Allow/Disallow directives
* Wildcard pattern matching (`*`)
* End-of-pattern matching (`$`)
* Crawl-delay directives
* Sitemap discovery
* Case-insensitive matching
* Default user-agent (`*`) handling

## Support

### Node.js

`robotstxt.js` runs in all active Node versions (4.x+).

### Browser

`robotstxt.js` should work in all modern browsers.

| Browser       | Version |
|---------------|---------|
| Chrome        | 58+     |
| Firefox       | 54+     |
| Safari        | 10.1+   |
| Edge          | 16+     |
| Mobile Chrome | 64+     |
| iOS Safari    | 10.3+   |

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
