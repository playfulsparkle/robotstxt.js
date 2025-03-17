/* global describe, it */

"use strict"

var assert = require("assert"),
    robotstxtjs = require("../src/robotstxt.js"),
    robotstxt = robotstxtjs.robotstxt

describe('Check rules match', function () {
    it('should return the wildcard group with rules', function () {
        const rules = `User-agent: *
    Allow: /p
    Disallow: /`

        const r = robotstxt(rules)
        const wildcardRules = r.getRules("*")

        assert(Array.isArray(wildcardRules.rules), 'Should return an array of rules')
        assert.strictEqual(wildcardRules.rules.length, 2, 'Should have 2 rules')
        assert.deepStrictEqual(wildcardRules, {
            userAgent: "*",
            crawlDelay: null,
            rules: [
                { type: "allow", path: "/p" },
                { type: "disallow", path: "/" }
            ]
        }, 'Wildcard group should match expected structure')

        assert.strictEqual(r.getRules('Googlebot'), null, 'Should return undefined for non-existent UA')
    })
})

describe('Order of precedence for rules', function () {
    it('Allow: /p, because it\'s more specific', function () {
        const rules = `User-agent: *
Allow: /p
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed('/page', '*'))
    })

    it('Allow: /folder, because in case of conflicting rules, Google uses the least restrictive rule', function () {
        const rules = `User-agent: *
Allow: /folder
Disallow: /folder`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed('/folder/page', '*'))
    })

    it('Disallow: /*.htm, because the rule path is longer and it matches more characters in the URL, so it\'s more specific', function () {
        const rules = `User-agent: *
Allow: /page
Disallow: /*.htm`
        const robots = robotstxt(rules)

        assert.strictEqual(false, robots.isAllowed('/page.htm', '*'))
    })

    it('Allow: /page, because in case of conflicting rules, Google uses the least restrictive rule', function () {
        const rules = `User-agent: *
Allow: /page
Disallow: /*.ph`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed('/page.php5', '*'))
    })

    it('Allow: /$, because it\'s more specific', function () {
        const rules = `User-agent: *
Allow: /$
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed('/', '*'))
        assert.strictEqual(false, robots.isAllowed('/page', '*'))
    })

    it('Disallow: /, because the allow rule only applies on the root URL', function () {
        const rules = `User-agent: *
Allow: /$
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed('/', '*'))
        assert.strictEqual(false, robots.isAllowed('/page.htm', '*'))
    })
})

describe('URL matching based on path values', function () {
    it('Matches the root and any lower level URL', function () {
        const rules = `User-agent: *
Allow: /
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed('/', '*'))
    })

    it('Equivalent to /. The trailing wildcard is ignored', function () {
        const rules = `User-agent: *
Allow: /
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed('/page', '*'))
    })

    it('Matches only the root. Any lower level URL is allowed for crawling', function () {
        const rules = `User-agent: *
Disallow: /$`
        const robots = robotstxt(rules)

        assert.strictEqual(false, robots.isAllowed('/', '*'))
        assert.strictEqual(true, robots.isAllowed('/page', '*'))
        assert.strictEqual(true, robots.isAllowed('/index.html', '*'))
        assert.strictEqual(true, robots.isAllowed('/?query=123', '*'))
        assert.strictEqual(true, robots.isAllowed('/#hash', '*'))
    })

    it('Matches any path that starts with /fish. Note that the matching is case-sensitive', function () {
        const rules = `User-agent: *
Allow: /fish
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed('/fish', '*'))
        assert.strictEqual(true, robots.isAllowed('/fish.html', '*'))
        assert.strictEqual(true, robots.isAllowed('/fish/salmon.html', '*'))
        assert.strictEqual(true, robots.isAllowed('/fishheads', '*'))
        assert.strictEqual(true, robots.isAllowed('/fishheads/yummy.html', '*'))
        assert.strictEqual(true, robots.isAllowed('/fish.php?id=anything', '*'))

        assert.strictEqual(false, robots.isAllowed('/Fish.asp', '*'))
        assert.strictEqual(false, robots.isAllowed('/catfish', '*'))
        assert.strictEqual(false, robots.isAllowed('/?id=fish', '*'))
        assert.strictEqual(false, robots.isAllowed('/desert/fish', '*'))
    })

    it('Equivalent to /fish. The trailing wildcard is ignored', function () {
        const rules = `User-agent: *
Allow: /fish*
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed('/fish', '*'))
        assert.strictEqual(true, robots.isAllowed('/fish.html', '*'))
        assert.strictEqual(true, robots.isAllowed('/fish/salmon.html', '*'))
        assert.strictEqual(true, robots.isAllowed('/fishheads', '*'))
        assert.strictEqual(true, robots.isAllowed('/fishheads/yummy.html', '*'))
        assert.strictEqual(true, robots.isAllowed('/fish.php?id=anything', '*'))

        assert.strictEqual(false, robots.isAllowed('/Fish.asp', '*'))
        assert.strictEqual(false, robots.isAllowed('/catfish', '*'))
        assert.strictEqual(false, robots.isAllowed('/?id=fish', '*'))
        assert.strictEqual(false, robots.isAllowed('/desert/fish', '*'))
    })

    it('Matches anything in the /fish/ folder', function () {
        const rules = `User-agent: *
Allow: /fish/
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed('/fish/', '*'))
        assert.strictEqual(true, robots.isAllowed('/fish/?id=anything', '*'))
        assert.strictEqual(true, robots.isAllowed('/fish/salmon.htm', '*'))

        assert.strictEqual(false, robots.isAllowed('/fish', '*'))
        assert.strictEqual(false, robots.isAllowed('/fish.html', '*'))
        assert.strictEqual(false, robots.isAllowed('/animals/fish/', '*'))
        assert.strictEqual(false, robots.isAllowed('/Fish/Salmon.asp', '*'))
    })

    it('Matches any path that contains .php', function () {
        const rules = `User-agent: *
Allow: /*.php
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed('/index.php', '*'))
        assert.strictEqual(true, robots.isAllowed('/filename.php', '*'))
        assert.strictEqual(true, robots.isAllowed('/folder/filename.php', '*'))
        assert.strictEqual(true, robots.isAllowed('/folder/filename.php?parameters', '*'))
        assert.strictEqual(true, robots.isAllowed('/folder/any.php.file.html', '*'))
        assert.strictEqual(true, robots.isAllowed('/filename.php/', '*'))

        assert.strictEqual(false, robots.isAllowed('/windows.PHP', '*'))
    })

    it('Matches any path that ends with .php', function () {
        const rules = `User-agent: *
Allow: /*.php$
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed('/filename.php', '*'))
        assert.strictEqual(true, robots.isAllowed('/folder/filename.php', '*'))

        assert.strictEqual(false, robots.isAllowed('/filename.php?parameters', '*'))
        assert.strictEqual(false, robots.isAllowed('/filename.php/', '*'))
        assert.strictEqual(false, robots.isAllowed('/filename.php5', '*'))
        assert.strictEqual(false, robots.isAllowed('/windows.PHP', '*'))
    })

    it('Matches any path that contains /fish and .php, in that order', function () {
        const rules = `User-agent: *
Allow: /fish*.php
Disallow: /`
        const robots = robotstxt(rules)

        assert.strictEqual(true, robots.isAllowed('/fish.php', '*'))
        assert.strictEqual(true, robots.isAllowed('/fishheads/catfish.php?parameters', '*'))

        assert.strictEqual(false, robots.isAllowed('/Fish.PHP', '*'))
    })
})
