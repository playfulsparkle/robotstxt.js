/* global describe, it */

'use strict';

const assert = require('assert'),
    robotstxtjs = require('../src/robotstxt.js'),
    { robotstxt } = robotstxtjs;

describe('Inline comment handling', () => {
    it('should handle comments gracefully', () => {
        const content = `User-Agent: * # Comment after User-Agent directive
            # Comment before Allow directive - using spaces
Allow: /folder/*.html#comment # Inline comment after Allow directive
Disallow: / #Inline comment after Disallow directive - using spaces
     #Comment next line after Disallow directive
Crawl-Delay: 10 #Comment after Crawl-Delay`;
        const r = robotstxt(content);

        assert.strictEqual(r.getGroup('*').getRules().length, 2);
        assert.strictEqual(true, r.isAllowed('/folder/index.html#comment', '*'));
        assert.strictEqual(true, r.isDisallowed('/', '*'));
        assert.strictEqual(r.getGroup('*').getCrawlDelay(), 10);
    });
});

describe('Core Method tests', () => {
    it('should clean params match', () => {
        const content = `User-agent: * #specifies the robots that the directives are set for
Disallow: /bin/ # prohibits links from the Shopping Cart.
Disallow: /search/ #  prohibits page links of the search embedded on the website
Disallow: /admin/ # prohibits links from the admin panel
Sitemap: http://example.com/sitemap # specifies the path to the website's Sitemap file for the robot
Clean-param: ref /some_dir/get_book.php`;
        const r = robotstxt(content);

        assert.deepStrictEqual(r.getCleanParams('*'), ['ref /some_dir/get_book.php']);
    });
});

describe('User Agent Info tests', () => {
    it('should handle return both User-Agent comment', () => {
        const content = `User-agent: vacuumweb
Comment: because you guys try all the time, I'm gonna limit you
Comment: to how many documents you can retrieve.  So there!
Allow: *.html
Disallow: *`;
        const r = robotstxt(content);

        assert.deepStrictEqual(r.getGroup('vacuumweb').getComment(), ['because you guys try all the time, I\'m gonna limit you', 'to how many documents you can retrieve.  So there!']);
    });

    it('should handle return User-Agent Robot-Version', () => {
        const content = `User-agent: vacuumweb
Robot-version: 2.0.0
Allow: *.html
Disallow: *`;
        const r = robotstxt(content);

        assert.strictEqual(r.getGroup('vacuumweb').getRobotVersion(), '2.0.0');
    });

    it('should handle return User-Agent Robot-Version', () => {
        const content = `User-agent: vacuumweb
Robot-version: invalid_version_number
Allow: *.html
Disallow: *`;
        const r = robotstxt(content);
        const reports = r.getReports();

        assert.strictEqual(r.getGroup('vacuumweb').getRobotVersion(), undefined);
        assert(reports.some(report => report.indexOf('Invalid Robot-Version directive value: "invalid_version_number".') !== -1), 'Reports should indicate Robot-version format is invalid');
    });

    it('should handle return User-Agent Request-rate', () => {
        const content = `User-agent: vacuumweb
Request-rate: 1/10m 1300-1659		# 8:00 am to noon EST
Request-rate: 1/20m 1700-0459		# noon to 11:59 pm EST
Request-rate: 5/1m  0500-1259		# midnight to 7:59 am EST
Allow: *.html
Disallow: *`;
        const r = robotstxt(content);

        assert.deepStrictEqual(r.getGroup('vacuumweb').getRequestRates(), ['1/10m 1300-1659', '1/20m 1700-0459', '5/1m  0500-1259']);
    });

    it('should handle return User-Agent Request-rate', () => {
        const content = `User-agent: vacuumweb
Request-rate: 1/10m 1300-1659		# 8:00 am to noon EST
Request-rate: 1/20m 2700-0459		# invalid time 1
Request-rate: 5/1m  0500-3459		# invalid time 2
Request-rate: 5/1m  0500-1259		# midnight to 7:59 am EST
Allow: *.html
Disallow: *`;
        const r = robotstxt(content);
        const group = r.getGroup('vacuumweb');
        const requestRates = group.getRequestRates();
        const reports = r.getReports();

        assert.deepStrictEqual(requestRates.length, 2, 'There should be 2 valid Request-Rate');
        assert(reports.some(report => report.indexOf('Invalid Request-rate directive start-end time format: "2700-0459".') !== -1), 'Reports should indicate Request-rate has invalid time format');
        assert(reports.some(report => report.indexOf('Invalid Request-rate directive start-end time format: "0500-3459".') !== -1), 'Reports should indicate Request-rate has invalid time format');
    });

    it('should handle return User-Agent Visit-time', () => {
        const content = `User-agent: vacuumweb
Robot-version: 2.0.0 2.0
Allow: *.html			# only allow HTML pages
Disallow: *			# and nothing else
Visit-time: 0600-0845		# and then only between 1 am to 3:45 am EST`;
        const r = robotstxt(content);

        assert.strictEqual(r.getGroup('vacuumweb').getVisitTime(), '0600-0845');
    });

    it('should handle User-Agent invalid Visit-time', () => {
        const content = `User-agent: vacuumweb
Robot-version: 2.0.0 2.0
Allow: *.html			# only allow HTML pages
Disallow: *			# and nothing else
Visit-time: 2542-3199		# and then only between xxxxx`;
        const r = robotstxt(content);
        const reports = r.getReports();

        assert.strictEqual(r.getGroup('vacuumweb').getVisitTime(), undefined);
        assert(reports.some(report => report.indexOf('Invalid Visit-time directive start-end time format: "2542-3199".') !== -1), 'Reports should indicate Visit-time time range format is invalid');
    });
});

describe('EOL handling', () => {
    it('should handle LF (Unix) EOLs', () => {
        const content = 'User-agent: *\nDisallow: /';
        const r = robotstxt(content);

        assert.strictEqual(r.getGroup('*').getRules().length, 1);
    });

    it('should handle CRLF (Windows) EOLs', () => {
        const content = 'User-agent: *\r\nDisallow: /';
        const r = robotstxt(content);

        assert.strictEqual(r.getGroup('*').getRules().length, 1);
    });

    it('should handle CR (Old Mac) EOLs', () => {
        const content = 'User-agent: *\rDisallow: /';
        const r = robotstxt(content);

        assert.strictEqual(r.getGroup('*').getRules().length, 1);
    });

    it('should handle mixed EOLs', () => {
        const content = 'User-agent: *\nAllow: /foo\r\nDisallow: /bar\rCrawl-Delay: 10';
        const r = robotstxt(content);
        const ua = r.getGroup('*');

        assert.strictEqual(ua.getRules().length, 2);
        assert.strictEqual(ua.getCrawlDelay(), 10);
    });
});

describe('Order of precedence for user agents', () => {
    it('should select the most specific user agent group and combine rules correctly', () => {
        const content = `User-Agent: googlebot-news
Disallow: /fish

User-Agent: *
Disallow: /carrots

User-Agent: googlebot-news
Disallow: /shrimp`;

        const r = robotstxt(content);
        const ua = r.getGroup('GoogleBot-News');

        assert.strictEqual(ua.getName(), 'googlebot-news');
        assert.deepStrictEqual(ua.getRules().map(rule => rule.path), ['/fish', '/shrimp']);
    });


    it('should add wildcard User-Agent, not starting with any User-Agent', () => {
        const content = `
Crawl-Delay: 5
Sitemap: https://example.com/sitemap.xml
Allow: /public
Disallow: /private
User-Agent: GoogleBot
Allow: /public-a
Disallow: /private-a`;

        const r = robotstxt(content);
        const uaA = r.getGroup('*');

        assert.strictEqual(uaA.getName(), '*');
        assert.deepStrictEqual(uaA.getRules().map(rule => rule.path), ['/public', '/private']);

        const uaB = r.getGroup('GoogleBot');

        assert.strictEqual(uaB.getName(), 'GoogleBot');
        assert.deepStrictEqual(uaB.getRules().map(rule => rule.path), ['/public-a', '/private-a']);
    });
});

describe('Ignored rules other than allow, disallow, and user-agent', () => {
    it('should treat the ignored rules as one group and apply disallow rule to both user agents', () => {
        const content = `User-Agent: a
Sitemap: https://example.com/sitemap.xml

User-Agent: b
Disallow: /`;

        const r = robotstxt(content);
        const uaA = r.getGroup('a');
        const uaB = r.getGroup('b');

        assert.strictEqual(uaA.getName(), 'a');
        assert.strictEqual(uaB.getName(), 'b');
        assert.deepStrictEqual(uaA.getRules().map(rule => rule.path), ['/']);
        assert.deepStrictEqual(uaB.getRules().map(rule => rule.path), ['/']);
    });
});

describe('Sitemap rules', () => {
    it('should return the correct sitemap URL', () => {
        const rules = `User-agent: *
Sitemap: http://example.com/sitemap.xml`;
        const r = robotstxt(rules);
        const sitemaps = r.getSitemaps();

        assert(Array.isArray(sitemaps), 'Should return an array of sitemaps');
        assert.strictEqual(sitemaps.length, 1, 'Should have 1 sitemap');
        assert.strictEqual(sitemaps[0], 'http://example.com/sitemap.xml', 'Sitemap URL should match');
    });

    it('should return multiple sitemap URLs', () => {
        const rules = `User-agent: *
Sitemap: http://example.com/sitemap1.xml
Sitemap: http://example.com/sitemap2.xml`;
        const r = robotstxt(rules);
        const sitemaps = r.getSitemaps();

        assert(Array.isArray(sitemaps), 'Should return an array of sitemaps');
        assert.strictEqual(sitemaps.length, 2, 'Should have 2 sitemaps');
        assert.strictEqual(sitemaps[0], 'http://example.com/sitemap1.xml', 'First sitemap URL should match');
        assert.strictEqual(sitemaps[1], 'http://example.com/sitemap2.xml', 'Second sitemap URL should match');
    });

    it('should return an empty array if no sitemaps are defined', () => {
        const rules = 'User-agent: *';
        const r = robotstxt(rules);
        const sitemaps = r.getSitemaps();

        assert(Array.isArray(sitemaps), 'Should return an array of sitemaps');
        assert.strictEqual(sitemaps.length, 0, 'Should have 0 sitemaps');
    });
});

describe('Cache-delay', () => {
    it('should log an error if Cache-delay is not a number', () => {
        const rules = `User-agent: *
        Cache-delay: invalid`;

        const r = robotstxt(rules);
        const reports = r.getReports();
        const group = r.getGroup('*');

        assert.strictEqual(group.getCacheDelay(), undefined, 'Cache-delay value should be false');
        assert(reports.some(report => report.indexOf('Invalid Cache-delay directive value: "invalid".') !== -1), 'Reports should indicate cache-delay is not a number');
    });

    it('should log an error if Cache-delay is 0 during parsing', () => {
        const rules = `User-agent: *
    Cache-delay: 0`;

        const r = robotstxt(rules);
        const reports = r.getReports();
        const group = r.getGroup('*');

        assert.strictEqual(group.getCacheDelay(), undefined, 'Cache-delay value should be false');
        assert(reports.some(report => report.indexOf('Cache-delay must be a positive number. The provided value is 0.') !== -1), 'Reports should indicate cache-delay is not a positive');
    });

    it('should return the correct cache delay', () => {
        const rules = `User-agent: *
Cache-delay: 10`;
        const r = robotstxt(rules);
        const ua = r.getGroup('*');

        assert.strictEqual(ua.getCacheDelay(), 10, 'Cache delay should be 10');
    });

    it('should return undefined if no cache delay is defined', () => {
        const rules = 'User-agent: *';
        const r = robotstxt(rules);
        const ua = r.getGroup('*');

        assert.strictEqual(ua.getCacheDelay(), undefined, 'Cache delay should be undefined');
    });

    it('should return the correct cache delay for multiple user agents', () => {
        const rules = `User-agent: Googlebot
Cache-delay: 5

User-agent: Bingbot
Cache-delay: 15`;
        const r = robotstxt(rules);
        const googlebot = r.getGroup('Googlebot');
        const bingbot = r.getGroup('Bingbot');

        assert.strictEqual(googlebot.getCacheDelay(), 5, 'Googlebot cache delay should be 5');
        assert.strictEqual(bingbot.getCacheDelay(), 15, 'Bingbot cache delay should be 15');
    });

    it('should return the correct cache delay for wildcard user agent', () => {
        const rules = `User-agent: *
Cache-delay: 20

User-agent: Googlebot
Cache-delay: 5`;
        const r = robotstxt(rules);
        const wildcard = r.getGroup('*');
        const googlebot = r.getGroup('Googlebot');

        assert.strictEqual(wildcard.getCacheDelay(), 20, 'Wildcard cache delay should be 20');
        assert.strictEqual(googlebot.getCacheDelay(), 5, 'Googlebot cache delay should be 5');
    });
});

describe('Crawl-Delay', () => {
    it('should log an error if Crawl-Delay is not a number', () => {
        const rules = `User-agent: *
        Crawl-Delay: invalid`;

        const r = robotstxt(rules);
        const reports = r.getReports();
        const group = r.getGroup('*');

        assert.strictEqual(group.getCrawlDelay(), undefined, 'Crawl-delay value should be false');
        assert(reports.some(report => report.indexOf('Invalid Crawl-Delay directive value: "invalid".') !== -1), 'Reports should indicate cache-delay is not a number');
    });

    it('should log an error if Crawl-Delay is 0 during parsing', () => {
        const rules = `User-agent: *
    Crawl-Delay: 0`;

        const r = robotstxt(rules);
        const reports = r.getReports();
        const group = r.getGroup('*');

        assert.strictEqual(group.getCrawlDelay(), undefined, 'Crawl-delay value should be false');
        assert(reports.some(report => report.indexOf('Crawl-Delay must be a positive number. The provided value is 0.') !== -1), 'Reports should indicate cache-delay is not a positive');
    });

    it('should return the correct crawl delay', () => {
        const rules = `User-agent: *
Crawl-Delay: 10`;
        const r = robotstxt(rules);
        const ua = r.getGroup('*');

        assert.strictEqual(ua.getCrawlDelay(), 10, 'Crawl delay should be 10');
    });

    it('should return undefined if no crawl delay is defined', () => {
        const rules = 'User-agent: *';
        const r = robotstxt(rules);
        const ua = r.getGroup('*');

        assert.strictEqual(ua.getCrawlDelay(), undefined, 'Crawl delay should be undefined');
    });

    it('should return the correct crawl delay for multiple user agents', () => {
        const rules = `User-agent: Googlebot
Crawl-Delay: 5

User-agent: Bingbot
Crawl-Delay: 15`;
        const r = robotstxt(rules);
        const googlebot = r.getGroup('Googlebot');
        const bingbot = r.getGroup('Bingbot');

        assert.strictEqual(googlebot.getCrawlDelay(), 5, 'Googlebot crawl delay should be 5');
        assert.strictEqual(bingbot.getCrawlDelay(), 15, 'Bingbot crawl delay should be 15');
    });

    it('should return the correct crawl delay for wildcard user agent', () => {
        const rules = `User-agent: *
Crawl-Delay: 20

User-agent: Googlebot
Crawl-Delay: 5`;
        const r = robotstxt(rules);
        const wildcard = r.getGroup('*');
        const googlebot = r.getGroup('Googlebot');

        assert.strictEqual(wildcard.getCrawlDelay(), 20, 'Wildcard crawl delay should be 20');
        assert.strictEqual(googlebot.getCrawlDelay(), 5, 'Googlebot crawl delay should be 5');
    });
});

describe('Check rules match', () => {
    class Rule {
        constructor(type, path) {
            this.type = type;
            this.path = path;
            this.regex = this.createRegex(path);
        }

        match(path) {
            return this.regex.test(path);
        }

        createRegex(path) {
            const pattern = path
                .replace(/[.^+?(){}[\]|\\]/gu, '\\$&')
                .replace(/\*/gu, '.*?');

            return new RegExp(`^${pattern}`, 'u');
        }
    }

    class Group {
        constructor(userAgent) {
            this.userAgent = userAgent;
            this.crawlDelay = undefined;
            this.cacheDelay = undefined;
            this.rules = [];
            this.comment = [];
            this.robotVersion = undefined;
            this.visitTime = undefined;
            this.requestRates = [];
        }

        getName() {
            return this.userAgent;
        }

        getComment() {
            return this.comment;
        }

        getRobotVersion() {
            return this.robotVersion;
        }

        getVisitTime() {
            return this.visitTime;
        }

        getRequestRates() {
            return this.requestRates;
        }

        getCacheDelay() {
            return this.cacheDelay;
        }

        getCrawlDelay() {
            return this.crawlDelay;
        }

        getRules() {
            return this.rules;
        }

        addRule(type, path) {
            if (typeof type === 'undefined') throw new Error('The "type" parameter is required.');
            if (typeof path === 'undefined') throw new Error('The "path" parameter is required.');
            this.rules.push(new Rule(type, path));
        }
    }

    it('should return the wildcard group with rules', () => {
        const rules = `User-agent: *
    Allow: /p
    Disallow: /`;

        const r = robotstxt(rules);
        const ua = r.getGroup('*');

        assert(Array.isArray(ua.getRules()), 'Should return an array of rules');
        assert.strictEqual(ua.getRules().length, 2, 'Should have 2 rules');


        const expectedGroup = new Group('*');
        expectedGroup.addRule('allow', '/p');
        expectedGroup.addRule('disallow', '/');

        assert.deepEqual(ua, expectedGroup, 'Wildcard group should match expected structure');
        assert.deepEqual(ua.getRules()[0], new Rule('allow', '/p'), 'First rule should match');
        assert.deepEqual(ua.getRules()[1], new Rule('disallow', '/'), 'Second rule should match');

        assert.strictEqual(r.getGroup('Googlebot'), undefined, 'Should return undefined for non-existent UA');
    });
});

describe('Order of precedence for rules', () => {
    it('Allow: /p, because it"s more specific', () => {
        const rules = `User-agent: *
Allow: /p
Disallow: /`;
        const robots = robotstxt(rules);

        assert.strictEqual(true, robots.isAllowed('/page', '*'));
    });

    it('Allow: /folder, because in case of conflicting rules, Google uses the least restrictive rule', () => {
        const rules = `User-agent: *
Allow: /folder
Disallow: /folder`;
        const robots = robotstxt(rules);

        assert.strictEqual(true, robots.isAllowed('/folder/page', '*'));
    });

    it('Disallow: /*.htm, because the rule path is longer and it matches more characters in the URL, so it"s more specific', () => {
        const rules = `User-agent: *
Allow: /page
Disallow: /*.htm`;
        const robots = robotstxt(rules);

        assert.strictEqual(false, robots.isAllowed('/page.htm', '*'));
    });

    it('Allow: /page, because in case of conflicting rules, Google uses the least restrictive rule', () => {
        const rules = `User-agent: *
Allow: /page
Disallow: /*.ph`;
        const robots = robotstxt(rules);

        assert.strictEqual(true, robots.isAllowed('/page.php5', '*'));
    });

    it('Allow: /$, because it"s more specific', () => {
        const rules = `User-agent: *
Allow: /$
Disallow: /`;
        const robots = robotstxt(rules);

        assert.strictEqual(true, robots.isAllowed('/', '*'));
        assert.strictEqual(false, robots.isAllowed('/page', '*'));
    });

    it('Disallow: /, because the allow rule only applies on the root URL', () => {
        const rules = `User-agent: *
Allow: /$
Disallow: /`;
        const robots = robotstxt(rules);

        assert.strictEqual(true, robots.isAllowed('/', '*'));
        assert.strictEqual(false, robots.isAllowed('/page.htm', '*'));
    });
});

describe('URL matching based on path values', () => {
    it('Matches the root and any lower level URL', () => {
        const rules = `User-agent: *
Allow: /
Disallow: /`;
        const robots = robotstxt(rules);

        assert.strictEqual(true, robots.isAllowed('/', '*'));
    });

    it('Equivalent to /. The trailing wildcard is ignored', () => {
        const rules = `User-agent: *
Allow: /
Disallow: /`;
        const robots = robotstxt(rules);

        assert.strictEqual(true, robots.isAllowed('/page', '*'));
    });

    it('Matches only the root. Any lower level URL is allowed for crawling', () => {
        const rules = `User-agent: *
Disallow: /$`;
        const robots = robotstxt(rules);

        assert.strictEqual(false, robots.isAllowed('/', '*'));
        assert.strictEqual(true, robots.isAllowed('/page', '*'));
        assert.strictEqual(true, robots.isAllowed('/index.html', '*'));
        assert.strictEqual(true, robots.isAllowed('/?query=123', '*'));
        assert.strictEqual(true, robots.isAllowed('/#hash', '*'));
    });

    it('Matches any path that starts with /fish. Note that the matching is case-sensitive', () => {
        const rules = `User-agent: *
Allow: /fish
Disallow: /`;
        const robots = robotstxt(rules);

        assert.strictEqual(true, robots.isAllowed('/fish', '*'));
        assert.strictEqual(true, robots.isAllowed('/fish.html', '*'));
        assert.strictEqual(true, robots.isAllowed('/fish/salmon.html', '*'));
        assert.strictEqual(true, robots.isAllowed('/fishheads', '*'));
        assert.strictEqual(true, robots.isAllowed('/fishheads/yummy.html', '*'));
        assert.strictEqual(true, robots.isAllowed('/fish.php?id=anything', '*'));

        assert.strictEqual(false, robots.isAllowed('/Fish.asp', '*'));
        assert.strictEqual(false, robots.isAllowed('/catfish', '*'));
        assert.strictEqual(false, robots.isAllowed('/?id=fish', '*'));
        assert.strictEqual(false, robots.isAllowed('/desert/fish', '*'));
    });

    it('Equivalent to /fish. The trailing wildcard is ignored', () => {
        const rules = `User-agent: *
Allow: /fish*
Disallow: /`;
        const robots = robotstxt(rules);

        assert.strictEqual(true, robots.isAllowed('/fish', '*'));
        assert.strictEqual(true, robots.isAllowed('/fish.html', '*'));
        assert.strictEqual(true, robots.isAllowed('/fish/salmon.html', '*'));
        assert.strictEqual(true, robots.isAllowed('/fishheads', '*'));
        assert.strictEqual(true, robots.isAllowed('/fishheads/yummy.html', '*'));
        assert.strictEqual(true, robots.isAllowed('/fish.php?id=anything', '*'));

        assert.strictEqual(false, robots.isAllowed('/Fish.asp', '*'));
        assert.strictEqual(false, robots.isAllowed('/catfish', '*'));
        assert.strictEqual(false, robots.isAllowed('/?id=fish', '*'));
        assert.strictEqual(false, robots.isAllowed('/desert/fish', '*'));
    });

    it('Matches anything in the /fish/ folder', () => {
        const rules = `User-agent: *
Allow: /fish/
Disallow: /`;
        const robots = robotstxt(rules);

        assert.strictEqual(true, robots.isAllowed('/fish/', '*'));
        assert.strictEqual(true, robots.isAllowed('/fish/?id=anything', '*'));
        assert.strictEqual(true, robots.isAllowed('/fish/salmon.htm', '*'));

        assert.strictEqual(false, robots.isAllowed('/fish', '*'));
        assert.strictEqual(false, robots.isAllowed('/fish.html', '*'));
        assert.strictEqual(false, robots.isAllowed('/animals/fish/', '*'));
        assert.strictEqual(false, robots.isAllowed('/Fish/Salmon.asp', '*'));
    });

    it('Matches any path that contains .php', () => {
        const rules = `User-agent: *
Allow: /*.php
Disallow: /`;
        const robots = robotstxt(rules);

        assert.strictEqual(true, robots.isAllowed('/index.php', '*'));
        assert.strictEqual(true, robots.isAllowed('/filename.php', '*'));
        assert.strictEqual(true, robots.isAllowed('/folder/filename.php', '*'));
        assert.strictEqual(true, robots.isAllowed('/folder/filename.php?parameters', '*'));
        assert.strictEqual(true, robots.isAllowed('/folder/any.php.file.html', '*'));
        assert.strictEqual(true, robots.isAllowed('/filename.php/', '*'));

        assert.strictEqual(false, robots.isAllowed('/windows.PHP', '*'));
    });

    it('Matches any path that ends with .php', () => {
        const rules = `User-agent: *
Allow: /*.php$
Disallow: /`;
        const robots = robotstxt(rules);

        assert.strictEqual(true, robots.isAllowed('/filename.php', '*'));
        assert.strictEqual(true, robots.isAllowed('/folder/filename.php', '*'));

        assert.strictEqual(false, robots.isAllowed('/filename.php?parameters', '*'));
        assert.strictEqual(false, robots.isAllowed('/filename.php/', '*'));
        assert.strictEqual(false, robots.isAllowed('/filename.php5', '*'));
        assert.strictEqual(false, robots.isAllowed('/windows.PHP', '*'));
    });

    it('Matches any path that contains /fish and .php, in that order', () => {
        const rules = `User-agent: *
Allow: /fish*.php
Disallow: /`;
        const robots = robotstxt(rules);

        assert.strictEqual(true, robots.isAllowed('/fish.php', '*'));
        assert.strictEqual(true, robots.isAllowed('/fishheads/catfish.php?parameters', '*'));

        assert.strictEqual(false, robots.isAllowed('/Fish.PHP', '*'));
    });

    it('Matches Disallowed path', () => {
        const rules = `User-agent: *
Allow: /
Disallow: /protected`;
        const robots = robotstxt(rules);

        assert.strictEqual(true, robots.isAllowed('/', '*'));
        assert.strictEqual(true, robots.isDisallowed('/protected', '*'));
    });
});
