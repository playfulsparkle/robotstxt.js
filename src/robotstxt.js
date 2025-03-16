/* global window, exports, define */

!function () {
    "use strict"

    class RobotsTxtParser {
        constructor(content) {
            this.parsedData = {
                groups: [],  // Format: { userAgent: string, rules: Array<{ type: 'allow'|'disallow', path: string }> }
                sitemaps: []
            };

            this.parse(content);
        }

        parse(content) {
            const new_content = [];

            for (const line of content.split("\n")) {
                const trimmedLine = line.trim();

                // Ignore comments and empty lines
                if (!trimmedLine || trimmedLine.startsWith("#")) {
                    continue;
                }

                // Find the first colon, which separates the directive and value
                const colonIndex = trimmedLine.indexOf(":");

                // If no colon is found, skip the line
                if (colonIndex === -1) {
                    continue;
                }


                const directive = trimmedLine.slice(0, colonIndex).trim().toLowerCase();
                const value = trimmedLine.slice(colonIndex + 1).trim(); // Everything after the colon is the value

                if (!directive || !value) {
                    continue;
                }

                new_content.push({ directive: directive, value: value });
            }

            let user_agent_list = [];
            let same_ua = false;
            let groups = [];

            // Handle case when robots.txt does not start with User-Agent
            if (new_content[0] && new_content[0].directive !== "user-agent") {
                new_content.unshift({ directive: "user-agent", value: "*" });
            }

            for (let index = 0; index < new_content.length; index++) {
                const current = new_content[index];
                const next = new_content[index + 1];

                if (current.directive === "user-agent") {
                    user_agent_list.push(current.value);

                    if (!groups[current.value]) {
                        groups[current.value] = {
                            userAgent: current.value,
                            crawlDelay: null,
                            rules: []
                        };
                    }
                } else if (current.directive === "allow") {
                    for (const agent of user_agent_list) {
                        groups[agent].rules.push({ type: 'allow', path: current.value });
                    }

                    same_ua = true;
                } else if (current.directive === "disallow") {
                    for (const agent of user_agent_list) {
                        groups[agent].rules.push({ type: 'disallow', path: current.value });
                    }

                    same_ua = true;
                } else if (current.directive === "crawl-delay") {
                    const crawlDelay = parseFloat(current.value);

                    if (!isNaN(crawlDelay)) {
                        for (const agent of user_agent_list) {
                            groups[agent].crawlDelay = crawlDelay;
                        }
                    }

                    same_ua = true;
                } else if (current.directive === "sitemap") {
                    this.parsedData.sitemaps.push(current.value);
                }

                if (next && same_ua === true && next.directive === "user-agent") {
                    same_ua = false;
                    user_agent_list = [];
                }
            }

            this.parsedData.groups = Object.values(groups);
        }

        crawlDelay(userAgent = '*') {
            const exactGroups = this.parsedData.groups.find(
                g => g.userAgent.toLowerCase() === userAgent.toLowerCase()
            );

            return exactGroups?.crawlDelay || null;
        }

        isAllowed(url, userAgent = '*') {
            const rules = this.getApplicableRules(userAgent);
            const urlPath = this.normalizeUrlPath(url);

            for (const rule of rules) {
                if (this.pathMatches(rule.path, urlPath)) {
                    return rule.type === 'allow';
                }
            }

            return true; // Default to allowed
        }

        isDisallowed(url, userAgent = '*') {
            return !this.isAllowed(url, userAgent);
        }

        // Helper methods
        getApplicableGroups(userAgent) {
            const exactGroups = this.parsedData.groups.filter(
                g => g.userAgent.toLowerCase() === userAgent.toLowerCase()
            );

            return exactGroups.length > 0
                ? exactGroups
                : this.parsedData.groups.filter(g => g.userAgent === '*');
        }

        getApplicableRules(userAgent) {
            return this.getApplicableGroups(userAgent)
                .flatMap(g => g.rules);
        }

        normalizeUrlPath(url) {
            try {
                return new URL(url).pathname;
            } catch {
                return url.startsWith('/') ? url : `/${url}`;
            }
        }

        pathMatches(rulePath, urlPath) {
            const normalizedRule = this.normalizePath(rulePath);
            const normalizedUrl = this.normalizePath(urlPath);

            // Handle exact match (ending with $)
            if (normalizedRule.endsWith('$')) {
                const exactPath = normalizedRule.slice(0, -1);
                return normalizedUrl === exactPath;
            }

            // Handle wildcard matching
            const pattern = normalizedRule
                .replace(/\*/g, '.*')       // Convert * to .*
                .replace(/\//g, '\\/')      // Escape slashes
                .replace(/\.\*/g, '.*?');   // Make non-greedy

            return new RegExp(`^${pattern}`).test(normalizedUrl);
        }

        normalizePath(path) {
            return path.startsWith('/') ? path : `/${path}`;
        }

        get sitemaps() {
            return this.parsedData.sitemaps;
        }
    }

    function robotstxt(content) {
        return new RobotsTxtParser(content);
    }

    /**
     * Export to either browser or node.js
     */
    /* eslint-disable quote-props */
    if (typeof exports !== "undefined") {
        exports["robotstxt"] = robotstxt;
    }

    if (typeof window !== "undefined") {
        window["robotstxt"] = robotstxt;

        if (typeof define === "function" && define["amd"]) {
            define(function () {
                return {
                    "robotstxt": robotstxt,
                };
            });
        }
    }
    /* eslint-enable quote-props */
}(); // eslint-disable-line
