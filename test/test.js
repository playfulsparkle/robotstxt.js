/* global describe, it */

"use strict"

const assert = require("assert"),
    robotstxtjs = require("../src/robotstxt.js"),
    robotstxt = robotstxtjs.robotstxt

describe("Order of precedence for user agents", function () {
    it("should select the most specific user agent group and combine rules correctly", function () {
        const content = `User-Agent: googlebot-news
Disallow: /fish

User-Agent: *
Disallow: /carrots

User-Agent: googlebot-news
Disallow: /shrimp`

        const r = robotstxt(content)
        const ua = r.getUserAgent("GoogleBot-News")

        assert.strictEqual(ua.getName(), "googlebot-news")
        assert.deepStrictEqual(ua.getRules().map(rule => rule.path), ["/fish", "/shrimp"])
    })
})

describe("Ignored rules other than allow, disallow, and user-agent", function () {
    it("should treat the ignored rules as one group and apply disallow rule to both user agents", function () {
        const content = `User-Agent: a
Sitemap: https://example.com/sitemap.xml

User-Agent: b
Disallow: /`

        const r = robotstxt(content)
        const uaA = r.getUserAgent("a")
        const uaB = r.getUserAgent("b")

        assert.strictEqual(uaA.getName(), "a")
        assert.strictEqual(uaB.getName(), "b")
        assert.deepStrictEqual(uaA.getRules().map(rule => rule.path), ["/"])
        assert.deepStrictEqual(uaB.getRules().map(rule => rule.path), ["/"])
    })
})

describe("Sitemap rules", function () {
    it("should return the correct sitemap URL", function () {
        const rules = `User-agent: *
Sitemap: http://example.com/sitemap.xml`
        const r = robotstxt(rules)
        const sitemaps = r.getSitemaps()

        assert(Array.isArray(sitemaps), "Should return an array of sitemaps")
        assert.strictEqual(sitemaps.length, 1, "Should have 1 sitemap")
        assert.strictEqual(sitemaps[0], "http://example.com/sitemap.xml", "Sitemap URL should match")
    })

    it("should return multiple sitemap URLs", function () {
        const rules = `User-agent: *
Sitemap: http://example.com/sitemap1.xml
Sitemap: http://example.com/sitemap2.xml`
        const r = robotstxt(rules)
        const sitemaps = r.getSitemaps()

        assert(Array.isArray(sitemaps), "Should return an array of sitemaps")
        assert.strictEqual(sitemaps.length, 2, "Should have 2 sitemaps")
        assert.strictEqual(sitemaps[0], "http://example.com/sitemap1.xml", "First sitemap URL should match")
        assert.strictEqual(sitemaps[1], "http://example.com/sitemap2.xml", "Second sitemap URL should match")
    })

    it("should return an empty array if no sitemaps are defined", function () {
        const rules = `User-agent: *`
        const r = robotstxt(rules)
        const sitemaps = r.getSitemaps()

        assert(Array.isArray(sitemaps), "Should return an array of sitemaps")
        assert.strictEqual(sitemaps.length, 0, "Should have 0 sitemaps")
    })
})

describe("Crawl-Delay", function () {
    it("should return the correct crawl delay", function () {
        const rules = `User-agent: *
Crawl-Delay: 10`
        const r = robotstxt(rules)
        const ua = r.getUserAgent("*")

        assert.strictEqual(ua.getCrawlDelay(), 10, "Crawl delay should be 10")
    })

    it("should return null if no crawl delay is defined", function () {
        const rules = `User-agent: *`
        const r = robotstxt(rules)
        const ua = r.getUserAgent("*")

        assert.strictEqual(ua.getCrawlDelay(), null, "Crawl delay should be null")
    })

    it("should return the correct crawl delay for multiple user agents", function () {
        const rules = `User-agent: Googlebot
Crawl-Delay: 5

User-agent: Bingbot
Crawl-Delay: 15`
        const r = robotstxt(rules)
        const googlebot = r.getUserAgent("Googlebot")
        const bingbot = r.getUserAgent("Bingbot")

        assert.strictEqual(googlebot.getCrawlDelay(), 5, "Googlebot crawl delay should be 5")
        assert.strictEqual(bingbot.getCrawlDelay(), 15, "Bingbot crawl delay should be 15")
    })

    it("should return the correct crawl delay for wildcard user agent", function () {
        const rules = `User-agent: *
Crawl-Delay: 20

User-agent: Googlebot
Crawl-Delay: 5`
        const r = robotstxt(rules)
        const wildcard = r.getUserAgent("*")
        const googlebot = r.getUserAgent("Googlebot")

        assert.strictEqual(wildcard.getCrawlDelay(), 20, "Wildcard crawl delay should be 20")
        assert.strictEqual(googlebot.getCrawlDelay(), 5, "Googlebot crawl delay should be 5")
    })
})

describe("Check rules match", function () {
    class Rule {
        constructor(type, path) {
            this.type = type
            this.path = path
        }
    }

    class Group {
        constructor(userAgent) {
            this.userAgent = userAgent
            this.crawlDelay = null
            this.rules = []
        }

        getName() {
            return this.userAgent
        }

        getCrawlDelay() {
            return this.crawlDelay
        }

        getRules() {
            return this.rules
        }

        allow(path) {
            this.addRule("allow", path)
        }

        disallow(path) {
            this.addRule("disallow", path)
        }

        addRule(type, path) {
            this.rules.push(new Rule(type, path))
        }
    }

    it("should return the wildcard group with rules", function () {
        const rules = `User-agent: *
    Allow: /p
    Disallow: /`

        const r = robotstxt(rules)
        const ua = r.getUserAgent("*")

        assert(Array.isArray(ua.getRules()), "Should return an array of rules")
        assert.strictEqual(ua.getRules().length, 2, "Should have 2 rules")


        const expectedGroup = new Group("*")
        expectedGroup.allow("/p")
        expectedGroup.disallow("/")

        assert.deepEqual(ua, expectedGroup, "Wildcard group should match expected structure")
        assert.deepEqual(ua.getRules()[0], new Rule("allow", "/p"), "First rule should match")
        assert.deepEqual(ua.getRules()[1], new Rule("disallow", "/"), "Second rule should match")

        assert.strictEqual(r.getUserAgent("Googlebot"), null, "Should return undefined for non-existent UA")
    })
})

describe("Order of precedence for rules", function () {
    it("Allow: /p, because it\"s more specific", function () {
        const rules = `User-agent: *
Allow: /p
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed("/page", "*"))
    })

    it("Allow: /folder, because in case of conflicting rules, Google uses the least restrictive rule", function () {
        const rules = `User-agent: *
Allow: /folder
Disallow: /folder`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed("/folder/page", "*"))
    })

    it("Disallow: /*.htm, because the rule path is longer and it matches more characters in the URL, so it\"s more specific", function () {
        const rules = `User-agent: *
Allow: /page
Disallow: /*.htm`
        const robots = robotstxt(rules)

        assert.strictEqual(false, robots.isAllowed("/page.htm", "*"))
    })

    it("Allow: /page, because in case of conflicting rules, Google uses the least restrictive rule", function () {
        const rules = `User-agent: *
Allow: /page
Disallow: /*.ph`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed("/page.php5", "*"))
    })

    it("Allow: /$, because it\"s more specific", function () {
        const rules = `User-agent: *
Allow: /$
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed("/", "*"))
        assert.strictEqual(false, robots.isAllowed("/page", "*"))
    })

    it("Disallow: /, because the allow rule only applies on the root URL", function () {
        const rules = `User-agent: *
Allow: /$
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed("/", "*"))
        assert.strictEqual(false, robots.isAllowed("/page.htm", "*"))
    })
})

describe("URL matching based on path values", function () {
    it("Matches the root and any lower level URL", function () {
        const rules = `User-agent: *
Allow: /
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed("/", "*"))
    })

    it("Equivalent to /. The trailing wildcard is ignored", function () {
        const rules = `User-agent: *
Allow: /
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed("/page", "*"))
    })

    it("Matches only the root. Any lower level URL is allowed for crawling", function () {
        const rules = `User-agent: *
Disallow: /$`
        const robots = robotstxt(rules)

        assert.strictEqual(false, robots.isAllowed("/", "*"))
        assert.strictEqual(true, robots.isAllowed("/page", "*"))
        assert.strictEqual(true, robots.isAllowed("/index.html", "*"))
        assert.strictEqual(true, robots.isAllowed("/?query=123", "*"))
        assert.strictEqual(true, robots.isAllowed("/#hash", "*"))
    })

    it("Matches any path that starts with /fish. Note that the matching is case-sensitive", function () {
        const rules = `User-agent: *
Allow: /fish
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed("/fish", "*"))
        assert.strictEqual(true, robots.isAllowed("/fish.html", "*"))
        assert.strictEqual(true, robots.isAllowed("/fish/salmon.html", "*"))
        assert.strictEqual(true, robots.isAllowed("/fishheads", "*"))
        assert.strictEqual(true, robots.isAllowed("/fishheads/yummy.html", "*"))
        assert.strictEqual(true, robots.isAllowed("/fish.php?id=anything", "*"))

        assert.strictEqual(false, robots.isAllowed("/Fish.asp", "*"))
        assert.strictEqual(false, robots.isAllowed("/catfish", "*"))
        assert.strictEqual(false, robots.isAllowed("/?id=fish", "*"))
        assert.strictEqual(false, robots.isAllowed("/desert/fish", "*"))
    })

    it("Equivalent to /fish. The trailing wildcard is ignored", function () {
        const rules = `User-agent: *
Allow: /fish*
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed("/fish", "*"))
        assert.strictEqual(true, robots.isAllowed("/fish.html", "*"))
        assert.strictEqual(true, robots.isAllowed("/fish/salmon.html", "*"))
        assert.strictEqual(true, robots.isAllowed("/fishheads", "*"))
        assert.strictEqual(true, robots.isAllowed("/fishheads/yummy.html", "*"))
        assert.strictEqual(true, robots.isAllowed("/fish.php?id=anything", "*"))

        assert.strictEqual(false, robots.isAllowed("/Fish.asp", "*"))
        assert.strictEqual(false, robots.isAllowed("/catfish", "*"))
        assert.strictEqual(false, robots.isAllowed("/?id=fish", "*"))
        assert.strictEqual(false, robots.isAllowed("/desert/fish", "*"))
    })

    it("Matches anything in the /fish/ folder", function () {
        const rules = `User-agent: *
Allow: /fish/
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed("/fish/", "*"))
        assert.strictEqual(true, robots.isAllowed("/fish/?id=anything", "*"))
        assert.strictEqual(true, robots.isAllowed("/fish/salmon.htm", "*"))

        assert.strictEqual(false, robots.isAllowed("/fish", "*"))
        assert.strictEqual(false, robots.isAllowed("/fish.html", "*"))
        assert.strictEqual(false, robots.isAllowed("/animals/fish/", "*"))
        assert.strictEqual(false, robots.isAllowed("/Fish/Salmon.asp", "*"))
    })

    it("Matches any path that contains .php", function () {
        const rules = `User-agent: *
Allow: /*.php
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed("/index.php", "*"))
        assert.strictEqual(true, robots.isAllowed("/filename.php", "*"))
        assert.strictEqual(true, robots.isAllowed("/folder/filename.php", "*"))
        assert.strictEqual(true, robots.isAllowed("/folder/filename.php?parameters", "*"))
        assert.strictEqual(true, robots.isAllowed("/folder/any.php.file.html", "*"))
        assert.strictEqual(true, robots.isAllowed("/filename.php/", "*"))

        assert.strictEqual(false, robots.isAllowed("/windows.PHP", "*"))
    })

    it("Matches any path that ends with .php", function () {
        const rules = `User-agent: *
Allow: /*.php$
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed("/filename.php", "*"))
        assert.strictEqual(true, robots.isAllowed("/folder/filename.php", "*"))

        assert.strictEqual(false, robots.isAllowed("/filename.php?parameters", "*"))
        assert.strictEqual(false, robots.isAllowed("/filename.php/", "*"))
        assert.strictEqual(false, robots.isAllowed("/filename.php5", "*"))
        assert.strictEqual(false, robots.isAllowed("/windows.PHP", "*"))
    })

    it("Matches any path that contains /fish and .php, in that order", function () {
        const rules = `User-agent: *
Allow: /fish*.php
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed("/fish.php", "*"))
        assert.strictEqual(true, robots.isAllowed("/fishheads/catfish.php?parameters", "*"))

        assert.strictEqual(false, robots.isAllowed("/Fish.PHP", "*"))
    })
})
