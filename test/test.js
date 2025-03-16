/* global describe, it */

"use strict"

var assert = require("assert"),
    robotstxtjs = require("../src/robotstxt.js"),
    robotstxt = robotstxtjs.robotstxt

describe("robotstxtjs", function () {
    const ruleset = "User-agent: *\n \
Allow: /\n \
Disallow: /secret-folder/\n \
Allow: /secret-folder/sub-folder/\n \
Disallow: /secret-folder/sub-folder/another-secret-folder/\n \
Allow: /secret-folder/sub-folder/another-secret-folder/this-is-allowed/\n \
Crawl-Delay: 12\n \
User-agent: GoogleBot\n \
Allow: /for-googlebot/\n \
Disallow: /for-googlebot/but-not-this-one/\n \
Crawl-Delay: 15\n \
Sitemap: https://playfulsparkle.com/sitemap.xml";

    it("should return true wildcard user agent", function () {
        assert.equal(true, robotstxt(ruleset).isAllowed("/", "*"))
        assert.equal(true, robotstxt(ruleset).isAllowed("/secret-folder/sub-folder/", "*"))
        assert.equal(true, robotstxt(ruleset).isAllowed("/secret-folder/sub-folder/another-secret-folder/this-is-allowed/", "*"))
    });

    it("should return false wildcard user agent", function () {
        assert.equal(false, robotstxt(ruleset).isAllowed("/secret-folder/", "*"))
        assert.equal(false, robotstxt(ruleset).isAllowed("/secret-folder/sub-folder/another-secret-folder/", "*"))
    });

    it("should return 12 wildcard user agent", function () {
        assert.equal(12, robotstxt(ruleset).crawlDelay("*"))
    });

    it("should return true GoogleBot user agent", function () {
        assert.equal(true, robotstxt(ruleset).isAllowed("/for-googlebot/", "GoogleBot"))
    });

    it("should return false GoogleBot user agent", function () {
        assert.equal(false, robotstxt(ruleset).isAllowed("/for-googlebot/but-not-this-one/", "GoogleBot"))
    });

    it("should return 15 GoogleBot user agent", function () {
        assert.equal(15, robotstxt(ruleset).crawlDelay("GoogleBot"))
    });

    it("should have correct sitemaps", function () {
        assert.deepStrictEqual(
            robotstxt(ruleset).sitemaps,
            ["https://playfulsparkle.com/sitemap.xml"]
        );
    });

    it("should handle empty robots.txt", function () {
        const emptyRobot = robotstxt("");
        assert.equal(true, emptyRobot.isAllowed("/any-path", "*"));
        assert.equal(null, emptyRobot.crawlDelay("*"));
        assert.deepStrictEqual(emptyRobot.sitemaps, []);
    });

    it("should handle case-insensitive user-agent matching", function () {
        const r = robotstxt("User-agent: GoogleBot\nDisallow: /");
        assert.equal(false, r.isAllowed("/", "googlebot"));
    });

    it("should prioritize specific user-agent over wildcard", function () {
        const rules = `User-agent: *\nDisallow: /\nUser-agent: SpecialBot\nAllow: /`;
        const r = robotstxt(rules);
        assert.equal(true, r.isAllowed("/", "SpecialBot"));
        assert.equal(false, r.isAllowed("/", "OtherBot"));
    });

    it("should handle wildcard patterns in paths", function () {
        const rules = `User-agent: *\nDisallow: /temp/*\nAllow: /temp/readme.txt`;
        const r = robotstxt(rules);
        assert.equal(false, r.isAllowed("/temp/files", "*"));
        assert.equal(true, r.isAllowed("/temp/readme.txt", "*"));
    });

    it("should handle dollar sign exact matching", function () {
        const rules = `User-agent: *\nDisallow: /secret$\nAllow: /secret/`;
        const r = robotstxt(rules);
        assert.equal(false, r.isAllowed("/secret", "*"));
        assert.equal(true, r.isAllowed("/secret/", "*"));
        assert.equal(true, r.isAllowed("/secret/page", "*"));
    });

    it("should handle multiple crawl-delay directives", function () {
        const rules = `User-agent: *\nCrawl-delay: 10\nCrawl-delay: 20`;
        const r = robotstxt(rules);
        assert.equal(10, r.crawlDelay("*")); // Should take first valid value
    });

    it("should handle invalid crawl-delay values", function () {
        const rules = `User-agent: *\nCrawl-delay: abc\nCrawl-delay: 5`;
        const r = robotstxt(rules);
        assert.equal(5, r.crawlDelay("*"));
    });

    it("should handle query parameters in URLs", function() {
        const rules = `User-agent: *\nDisallow: /search?*q=`;
        const r = robotstxt(rules);
        assert.equal(false, r.isAllowed("/search?q=test", "*"));
        assert.equal(true, r.isAllowed("/search", "*"));
    });

    it("should handle UTF-8 paths", function () {
        const rules = `User-agent: *\nDisallow: /über-secret/`;
        const r = robotstxt(rules);
        assert.equal(false, r.isAllowed("/über-secret/", "*"));
        assert.equal(true, r.isAllowed("/uber-secret/", "*"));
    });

    it("should handle line continuation comments", function () {
        const rules = `User-agent: * # Main group\n\
            Disallow: /admin # Admin section\n\
            Allow: /admin/login # Login page`;
        const r = robotstxt(rules);
        assert.equal(false, r.isAllowed("/admin", "*"));
        assert.equal(true, r.isAllowed("/admin/login", "*"));
    });

    it("should handle multiple sitemap entries", function () {
        const rules = `Sitemap: https://site.com/sitemap1.xml\n\
            Sitemap: https://site.com/sitemap2.xml`;
        const r = robotstxt(rules);
        assert.deepStrictEqual(r.sitemaps, [
            "https://site.com/sitemap1.xml",
            "https://site.com/sitemap2.xml"
        ]);
    });

    it("should handle empty disallow (allow all)", function () {
        const rules = `User-agent: *\nDisallow:\nDisallow: /block`;
        const r = robotstxt(rules);
        assert.equal(true, r.isAllowed("/anywhere", "*"));
        assert.equal(false, r.isAllowed("/block", "*"));
    });

    it("should handle order precedence with equal specificity", function () {
        const rules = `User-agent: *\n\
            Allow: /page\n\
            Disallow: /page`;
        const r = robotstxt(rules);
        // Should respect first matching rule
        assert.equal(true, r.isAllowed("/page", "*"));
    });

    it("should handle malformed directives", function () {
        const rules = `User-agent *\nDisallow /test\nAllow: /test/sub\nBadDirective: 123`;
        const r = robotstxt(rules);
        assert.equal(true, r.isAllowed("/test", "*")); // Malformed line should be ignored
        assert.equal(true, r.isAllowed("/test/sub", "*"));
    });
});
