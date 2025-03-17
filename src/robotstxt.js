/* global window, exports, define */

!function () {
    "use strict"

    /**
     * Single robots.txt rule (allow/disallow directive)
     */
    class Rule {
        /**
         * Create a new rule instance
         * @param {string} type - Rule type ('allow' or 'disallow')
         * @param {string} path - URL path pattern the rule applies to
         */
        constructor(type, path) {
            /** @member {string} */
            this.type = type
            /** @member {string} */
            this.path = path
        }
    }

    /**
     * Group of rules for a specific user agent
     */
    class Group {
        /**
         * Create a new user agent group
         * @param {string} userAgent - User agent string this group applies to
         */
        constructor(userAgent) {
            /** @member {string} */
            this.userAgent = userAgent
            /** @member {number|null} */
            this.crawlDelay = null
            /** @member {Rule[]} */
            this.rules = []
        }

        /**
         * Get the user agent name for this group
         * @return {string}
         */
        getName() {
            return this.userAgent
        }

        /**
         * Get crawl delay setting for this group
         * @return {number|null}
         */
        getCrawlDelay() {
            return this.crawlDelay
        }

        /**
         * Get all rules for this group
         * @return {Rule[]}
         */
        getRules() {
            return this.rules
        }

        /**
         * Add an allow rule to the group
         * @param {string} path - URL path pattern to allow
         */
        allow(path) {
            this.addRule("allow", path)
        }

        /**
         * Add a disallow rule to the group
         * @param {string} path - URL path pattern to disallow
         */
        disallow(path) {
            this.addRule("disallow", path)
        }

        /**
         * Internal method to add a rule
         * @param {string} type - Rule type ('allow' or 'disallow')
         * @param {string} path - URL path pattern
         */
        addRule(type, path) {
            this.rules.push(new Rule(type, path))
        }
    }

    /**
     * The robots.txt parser class
     */
    class RobotsTxtParser {
        /**
         * Create a new robots.txt parser
         * @param {string} content - Raw robots.txt content to parse
         */
        constructor(content) {
            /**
             * @private
             * @member {Object}
             */
            this.parsedData = {
                groups: [],
                sitemaps: []
            }

            this.parse(content)
        }

        /**
         * Parse raw robots.txt content into structured format
         * @private
         * @param {string} content - Raw robots.txt content
         */
        parse(content) {
            const new_content = []

            // Preprocess lines: trim, remove comments, and split directives
            for (const line of content.split("\n")) {
                let processedLine = line.trim()
                const commentIndex = processedLine.indexOf("#")

                if (commentIndex !== -1) {
                    processedLine = processedLine.slice(0, commentIndex).trim()
                }

                if (!processedLine) continue

                const colonIndex = processedLine.indexOf(":")
                if (colonIndex === -1) continue

                const directive = processedLine.slice(0, colonIndex).trim().toLowerCase()
                const value = processedLine.slice(colonIndex + 1).trim()

                if (directive && value) {
                    new_content.push({ directive, value })
                }
            }

            // Handle missing initial User-Agent
            if (new_content[0] && new_content[0].directive !== "user-agent") {
                new_content.unshift({ directive: "user-agent", value: "*" })
            }

            let user_agent_list = []
            let same_ua = false
            /** @type {Object.<string, Group>} */
            const groups = {}

            // Process each directive and build rule groups
            for (let index = 0; index < new_content.length; index++) {
                const current = new_content[index]
                const next = new_content[index + 1]

                if (current.directive === "user-agent") {
                    user_agent_list.push(current.value)
                    if (!groups[current.value]) {
                        groups[current.value] = new Group(current.value)
                    }
                }
                else if (current.directive === "allow") {
                    user_agent_list.forEach(agent => groups[agent].allow(current.value))
                    same_ua = true
                }
                else if (current.directive === "disallow") {
                    user_agent_list.forEach(agent => groups[agent].disallow(current.value))
                    same_ua = true
                }
                else if (current.directive === "crawl-delay") {
                    const crawlDelay = parseFloat(current.value)
                    if (!isNaN(crawlDelay)) {
                        user_agent_list.forEach(agent => {
                            if (!groups[agent].crawlDelay) {
                                groups[agent].crawlDelay = crawlDelay
                            }
                        })
                    }
                    same_ua = true
                }
                else if (current.directive === "sitemap") {
                    this.parsedData.sitemaps.push(current.value)
                }

                // Reset user agent list on new group
                if (next && same_ua && next.directive === "user-agent") {
                    same_ua = false
                    user_agent_list = []
                }
            }

            this.parsedData.groups = Object.values(groups)
        }

        /**
         * Check if a URL is allowed for specified user agent
         * @param {string} url - URL to check
         * @param {string} [userAgent="*"] - User agent to check rules for
         * @return {boolean} - True if allowed, false if disallowed
         */
        isAllowed(url, userAgent = "*") {
            const rules = this.getApplicableRules(userAgent)
            const urlPath = this.normalizeUrlPath(url)
            const matchingRules = []

            for (const rule of rules) {
                if (this.pathMatches(rule.path, urlPath)) {
                    matchingRules.push(rule)
                }
            }

            if (matchingRules.length === 0) return true

            // Find most specific rule based on path length and special characters
            let mostSpecific = matchingRules[0]
            for (const rule of matchingRules) {
                const currentSpecificity = this.getRuleSpecificity(rule.path)
                const mostSpecificSpecificity = this.getRuleSpecificity(mostSpecific.path)

                if (currentSpecificity > mostSpecificSpecificity) {
                    mostSpecific = rule
                }
            }

            return mostSpecific.type === "allow"
        }

        /**
         * Check if a URL is disallowed for specified user agent
         * @param {string} url - URL to check
         * @param {string} [userAgent="*"] - User agent to check rules for
         * @return {boolean} - True if disallowed, false if allowed
         */
        isDisallowed(url, userAgent = "*") {
            return !this.isAllowed(url, userAgent)
        }

        /**
         * Get sitemap URLs found in robots.txt
         * @return {string[]} - Array of sitemap URLs
         */
        getSitemaps() {
            return this.parsedData.sitemaps
        }

        /**
         * Get group for specific user agent
         * @private
         * @param {string} userAgent - User agent to search for
         * @return {Group|null} - Matching group or null
         */
        getUserAgent(userAgent = "*") {
            return this.parsedData.groups.find(
                g => g.userAgent.toLowerCase() === userAgent.toLowerCase()
            ) || null
        }

        /**
         * Calculate rule specificity score for path comparison
         * @private
         * @param {string} path - URL path pattern
         * @return {number} - Specificity score (higher = more specific)
         */
        getRuleSpecificity(path) {
            let specificity = path.length
            if (path.includes("*")) specificity -= 0.5
            else if (path.endsWith("$")) specificity += 0.5
            return specificity
        }

        /**
         * Get groups applicable to specified user agent
         * @private
         * @param {string} userAgent - User agent to check
         * @return {Group[]} - Array of matching groups
         */
        getApplicableGroups(userAgent) {
            const exactGroups = this.parsedData.groups.filter(
                g => g.userAgent.toLowerCase() === userAgent.toLowerCase()
            )
            return exactGroups.length > 0 ? exactGroups :
                this.parsedData.groups.filter(g => g.userAgent === "*")
        }

        /**
         * Get all rules applicable to specified user agent
         * @private
         * @param {string} userAgent - User agent to check
         * @return {Rule[]} - Array of applicable rules
         */
        getApplicableRules(userAgent) {
            return this.getApplicableGroups(userAgent).flatMap(g => g.getRules())
        }

        /**
         * Normalize URL path for comparison
         * @private
         * @param {string} url - URL or path to normalize
         * @return {string} - Normalized path
         */
        normalizeUrlPath(url) {
            try {
                return this.normalizePath(new URL(url).pathname)
            } catch {
                return this.normalizePath(url)
            }
        }

        /**
         * Check if URL path matches rule pattern
         * @private
         * @param {string} rulePath - Rule path pattern
         * @param {string} urlPath - Normalized URL path
         * @return {boolean} - True if path matches pattern
         */
        pathMatches(rulePath, urlPath) {
            const normalizedRule = this.normalizePath(rulePath)
            let regexPattern = normalizedRule
                .replace(/[.^+?(){}[\]|\\]/gu, "\\$&")
                .replace(/\*/gu, ".*")

            return new RegExp(`^${regexPattern}`, "u").test(urlPath)
        }

        /**
         * Normalize path string for consistent comparisons
         * @private
         * @param {string} path - URL path to normalize
         * @return {string} - Normalized path
         */
        normalizePath(path) {
            const decoded = decodeURIComponent(path)
            const singleSlash = decoded.replace(/\/+/g, "/")
            return singleSlash.startsWith("/") ? singleSlash : `/${singleSlash}`
        }
    }

    /**
     * Create a new robots.txt parser instance
     * @param {string} content - Raw robots.txt content
     * @return {RobotsTxtParser} - Configured parser instance
     */
    function robotstxt(content) {
        return new RobotsTxtParser(content)
    }

    // Universal module exports
    /* eslint-disable quote-props */
    if (typeof exports !== "undefined") {
        exports.robotstxt = robotstxt
    }
    if (typeof window !== "undefined") {
        window.robotstxt = robotstxt
        if (typeof define === "function" && define.amd) {
            define(() => ({ robotstxt }))
        }
    }
    /* eslint-enable quote-props */
}();
