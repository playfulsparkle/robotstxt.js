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
            /** @member {string} */
            this.regex = this.createRegex(path)
        }

        /**
         * Test if a normalized URL path matches this rule's pattern
         * @param {string} path - Normalized URL path to test against
         * @return {boolean} - True if the path matches the rule's pattern
         */
        match(path) {
            return this.regex.test(path)
        }

        /**
         * Convert robots.txt path pattern to regular expression
         * @private
         * @param {string} path - Normalized URL path pattern to convert
         * @return {RegExp} - Regular expression for path matching
         */
        createRegex(path) {
            const pattern = path
                .replace(/[.^+?(){}[\]|\\]/gu, "\\$&")  // Escape regex special characters
                .replace(/\*/gu, ".*?")                // Replace * with non-greedy wildcard

            return new RegExp(`^${pattern}`, "u")
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
            /** @member {number|undefined} */
            this.crawlDelay = undefined
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
         * @return {number|undefined}
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
            if (typeof path === "undefined") throw new Error("The 'path' parameter is required.")
            this.addRule("allow", path)
        }

        /**
         * Add a disallow rule to the group
         * @param {string} path - URL path pattern to disallow
         */
        disallow(path) {
            if (typeof path === "undefined") throw new Error("The 'path' parameter is required.")
            this.addRule("disallow", path)
        }

        /**
         * Internal method to add a rule
         * @private
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
             * @type {Group[]}
             * @description Collection of user agent groups containing access rules.
             *              Represents all parsed User-agent sections from robots.txt
             */
            this.groups = []

            /**
             * @private
             * @type {string[]}
             * @description Array of absolute URLs to sitemaps specified in robots.txt.
             *              Collected from Sitemap directives across the entire file.
             */
            this.sitemaps = []

            this.parse(content)
        }

        /**
         * Parse raw robots.txt content into structured format
         * @private
         * @param {string} content - Raw robots.txt content
         */
        parse(content) {
            if (typeof content === "undefined") throw new Error("The 'content' parameter is required.")

            /** @type {string[]} */
            const normalizedContent = []

            for (const line of content.split(/\r\n|\r|\n/)) {
                /** @type {string} */
                let processedLine = line.trim()

                if (!processedLine || processedLine.startsWith('#')) continue

                /** @type {number} */
                const colonIndex = processedLine.indexOf(':')
                if (colonIndex === -1) continue

                /** @type {string} */
                const directive = processedLine.slice(0, colonIndex).trim().toLowerCase()
                /** @type {string} */
                let value = processedLine.slice(colonIndex + 1).trim()

                /** @type {number} */
                const commentIndex = value.search(/(?:\s|^)#/)
                if (commentIndex !== -1) {
                    value = value.slice(0, commentIndex).trim()
                }

                if (directive && value) {
                    normalizedContent.push({ directive, value })
                }
            }

            /** @type {string[]} */
            let userAgentList = []
            /** @type {boolean} */
            let sameUserAgent = false
            /** @type {boolean} */
            let userAgentSeen = false
            /** @type {Object.<string, Group>} */
            const tempGroups = {}

            // Process each directive and build rule groups
            for (let index = 0; index < normalizedContent.length; index++) {
                /** @type {Object.<string, string>} */
                const currentLine = normalizedContent[index]

                const needsDefaultUa = ["allow", "disallow", "crawl-delay"].includes(currentLine.directive) && !userAgentSeen

                if (currentLine.directive === "user-agent" || needsDefaultUa) {
                    userAgentSeen = true

                    const uaName = needsDefaultUa ? "*" : currentLine.value

                    if (!userAgentList.includes(uaName)) {
                        userAgentList.push(uaName)
                    }

                    if (!tempGroups[uaName]) {
                        tempGroups[uaName] = new Group(uaName)
                    }
                }

                if (currentLine.directive === "allow") {
                    const normalizedPath = this.normalizePath(currentLine.value)
                    userAgentList.forEach(agent => tempGroups[agent].allow(normalizedPath))
                    sameUserAgent = true
                }
                else if (currentLine.directive === "disallow") {
                    const normalizedPath = this.normalizePath(currentLine.value)
                    userAgentList.forEach(agent => tempGroups[agent].disallow(normalizedPath))
                    sameUserAgent = true
                }
                else if (currentLine.directive === "crawl-delay") {
                    const crawlDelay = currentLine.value * 1

                    if (isNaN(crawlDelay)) continue

                    if (crawlDelay <= 0) {
                        throw new Error(`Crawl-Delay must be a positive number. The provided value is ${crawlDelay}.`)
                    }

                    userAgentList.forEach(agent => {
                        if (!tempGroups[agent].crawlDelay) {
                            tempGroups[agent].crawlDelay = crawlDelay
                        }
                    })
                    sameUserAgent = true
                }
                else if (currentLine.directive === "sitemap") {
                    this.sitemaps.push(currentLine.value)
                }

                /** @type {Object.<string, string>} */
                const nextLine = normalizedContent[index + 1]

                // Reset user agent list on new group
                if (nextLine && sameUserAgent && nextLine.directive === "user-agent") {
                    sameUserAgent = false
                    userAgentList = []
                }
            }

            this.groups = Object.keys(tempGroups).map(key => tempGroups[key])
        }

        /**
         * Check if a URL is allowed for specified user agent
         * @param {string} url - URL to check
         * @param {string} userAgent - User agent to check rules for
         * @return {boolean} - True if allowed, false if disallowed
         */
        isAllowed(url, userAgent) {
            if (typeof url === "undefined") throw new Error("The 'url' parameter is required.")
            if (typeof userAgent === "undefined") throw new Error("The 'userAgent' parameter is required.")

            /** @type {Rule[]} */
            const rules = this.getApplicableRules(userAgent)
            /** @type {string} */
            const urlPath = this.normalizeUrlPath(url)
            /** @type {Rule[]} */
            const matchingRules = []

            for (const rule of rules) {
                if (rule.match(urlPath)) {
                    matchingRules.push(rule)
                }
            }

            if (matchingRules.length === 0) return true

            /** @type {Rule} */
            let mostSpecific = matchingRules[0]

            // Find most specific rule based on path length and special characters
            for (const rule of matchingRules) {
                /** @type {number} */
                const currentSpecificity = this.getRuleSpecificity(rule.path)
                /** @type {number} */
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
         * @param {string} userAgent - User agent to check rules for
         * @return {boolean} - True if disallowed, false if allowed
         */
        isDisallowed(url, userAgent) {
            return !this.isAllowed(url, userAgent)
        }

        /**
         * Get sitemap URLs found in robots.txt
         * @return {string[]} - Array of sitemap URLs
         */
        getSitemaps() {
            return this.sitemaps
        }

        /**
         * Get group for specific user agent
         * @param {string} userAgent - User agent to search for
         * @return {Group|undefined} - Matching group or undefined
         */
        getGroup(userAgent) {
            if (!userAgent) return undefined
            for (let i = 0; i < this.groups.length; i++) {
                const group = this.groups[i]

                if (group.userAgent.toLowerCase() === userAgent.toLowerCase()) {
                    return group
                }
            }
            return undefined
        }

        /**
         * Calculate rule specificity score for path comparison
         * @private
         * @param {string} path - URL path pattern
         * @return {number} - Specificity score (higher = more specific)
         */
        getRuleSpecificity(path) {
            /** @type {number} */
            let specificity = path.length
            if (path.indexOf("*") !== -1) specificity -= 0.5
            else if (path.slice(-1) === "$") specificity += 0.5
            return specificity
        }

        /**
         * Get groups applicable to specified user agent
         * @private
         * @param {string} userAgent - User agent to check
         * @return {Group[]} - Array of matching groups
         */
        getApplicableGroups(userAgent) {
            /** @type {Group[]} */
            const exactGroups = this.groups.filter(group => group.getName().toLowerCase() === userAgent.toLowerCase())
            if (exactGroups.length > 0) return exactGroups
            return this.groups.filter(group => group.getName() === "*")
        }

        /**
         * Get all rules applicable to specified user agent
         * @private
         * @param {string} userAgent - User agent to check
         * @return {Rule[]} - Array of applicable rules
         */
        getApplicableRules(userAgent) {
            /** @type {Rule[]} */
            const rules = this.getApplicableGroups(userAgent)
            return rules.reduce((acc, group) => acc.concat(group.getRules()), [])
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
            } catch (error) {
                return this.normalizePath(url)
            }
        }

        /**
         * Normalize path string for consistent comparisons
         * @private
         * @param {string} path - URL path to normalize
         * @return {string} - Normalized path
         */
        normalizePath(path) {
            /** @type {string} */
            let decodedPath
            try {
                decodedPath = decodeURIComponent(path)
            } catch (error) {
                decodedPath = path
            }
            /** @type {string} */
            const newPath = decodedPath.replace(/\/+/gu, "/")
            if (newPath[0] === "/") return newPath
            return `/${newPath}`
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
}()
