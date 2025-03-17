/* global window, exports, define */

!function () {
    "use strict"

    class RobotsTxtParser {
        constructor(content) {
            this.parsedData = {
                groups: [],  // Format: { userAgent: string, rules: Array<{ type: "allow"|"disallow", path: string }> }
                sitemaps: []
            }

            this.parse(content)
        }

        parse(content) {
            const new_content = []

            for (const line of content.split("\n")) {
                // Trim and remove comments
                let processedLine = line.trim()

                // Remove inline comments (everything after #)
                const commentIndex = processedLine.indexOf("#")

                if (commentIndex !== -1) {
                    processedLine = processedLine.slice(0, commentIndex).trim()
                }

                // Skip empty lines after comment removal
                if (!processedLine) continue

                // Find directive-value separator
                const colonIndex = processedLine.indexOf(":")

                if (colonIndex === -1) continue

                // Extract directive and value
                const directive = processedLine.slice(0, colonIndex).trim().toLowerCase()
                const value = processedLine.slice(colonIndex + 1).trim()

                if (directive && value) {
                    new_content.push({ directive, value })
                }
            }

            // Handle case when robots.txt does not start with User-Agent
            if (new_content[0] && new_content[0].directive !== "user-agent") {
                new_content.unshift({ directive: "user-agent", value: "*" })
            }

            let user_agent_list = []
            let same_ua = false
            let groups = []

            for (let index = 0; index < new_content.length; index++) {
                const current = new_content[index]
                const next = new_content[index + 1]

                if (current.directive === "user-agent") {
                    user_agent_list.push(current.value)

                    if (!groups[current.value]) {
                        groups[current.value] = {
                            userAgent: current.value,
                            crawlDelay: null,
                            rules: []
                        }
                    }
                } else if (current.directive === "allow") {
                    for (const agent of user_agent_list) {
                        groups[agent].rules.push({ type: "allow", path: current.value })
                    }

                    same_ua = true
                } else if (current.directive === "disallow") {
                    for (const agent of user_agent_list) {
                        groups[agent].rules.push({ type: "disallow", path: current.value })
                    }

                    same_ua = true
                } else if (current.directive === "crawl-delay") {
                    const crawlDelay = parseFloat(current.value)

                    if (!isNaN(crawlDelay)) {
                        for (const agent of user_agent_list) {
                            if (groups[agent].crawlDelay) {
                                continue
                            }

                            groups[agent].crawlDelay = crawlDelay
                        }
                    }

                    same_ua = true
                } else if (current.directive === "sitemap") {
                    this.parsedData.sitemaps.push(current.value)
                }

                if (next && same_ua === true && next.directive === "user-agent") {
                    same_ua = false
                    user_agent_list = []
                }
            }

            this.parsedData.groups = Object.values(groups)
        }

        crawlDelay(userAgent = "*") {
            const exact = this.parsedData.groups.find(
                g => g.userAgent.toLowerCase() === userAgent.toLowerCase()
            )

            return (exact && exact.crawlDelay) || null
        }

        getRules(userAgent = "*") {
            return this.parsedData.groups.find(
                g => g.userAgent.toLowerCase() === userAgent.toLowerCase()
            ) || null
        }

        isAllowed(url, userAgent = "*") {
            const rules = this.getApplicableRules(userAgent)
            const urlPath = this.normalizeUrlPath(url)

            // Collect all matching rules
            const matchingRules = []

            for (const rule of rules) {
                if (this.pathMatches(rule.path, urlPath)) {
                    matchingRules.push(rule)
                }
            }

            if (matchingRules.length === 0) return true

            // Find the most specific rule (longest path), considering allow over disallow in ties
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

        getRuleSpecificity(path) {
            let specificity = path.length

            if (path.includes("*")) { // Slightly less specific than exact characters
                specificity -= 0.5
            } else if (path.endsWith("$")) { // Slightly more specific for exact match
                specificity += 0.5
            }

            return specificity
        }

        isDisallowed(url, userAgent = "*") {
            return !this.isAllowed(url, userAgent)
        }

        // Helper methods
        getApplicableGroups(userAgent) {
            const exactGroups = this.parsedData.groups.filter(
                g => g.userAgent.toLowerCase() === userAgent.toLowerCase()
            )

            return exactGroups.length > 0
                ? exactGroups
                : this.parsedData.groups.filter(g => g.userAgent === "*")
        }

        getApplicableRules(userAgent) {
            return this.getApplicableGroups(userAgent)
                .flatMap(g => g.rules)
        }

        normalizeUrlPath(url) {
            try { // Handle full URLs with proper encoding
                return this.normalizePath(new URL(url).pathname)
            } catch (error) { // Handle relative paths and invalid URLs
                return this.normalizePath(url)
            }
        }

        pathMatches(rulePath, urlPath) {
            const normalizedRule = this.normalizePath(rulePath)
            const normalizedUrl = this.normalizePath(urlPath)

            // Escape all regex special characters except *
            let regexPattern = normalizedRule
                .replace(/[.^+?(){}[\]|\\]/gu, "\\$&")  // Escape special chars
                .replace(/\*/gu, ".*")                   // Handle wildcards

            // Create and test regex
            return new RegExp(`^${regexPattern}`, "u").test(normalizedUrl)
        }

        normalizePath(path) {
            // 1. Decode percent-encoded characters
            const decoded = decodeURIComponent(path)

            // 2. Collapse multiple slashes to single slash
            const singleSlash = decoded.replace(/\/+/g, "/")

            // 3. Ensure leading slash
            return singleSlash.startsWith("/") ? singleSlash : `/${singleSlash}`
        }

        get sitemaps() {
            return this.parsedData.sitemaps
        }
    }

    function robotstxt(content) {
        return new RobotsTxtParser(content)
    }

    /**
     * Export to either browser or node.js
     */
    /* eslint-disable quote-props */
    if (typeof exports !== "undefined") {
        exports["robotstxt"] = robotstxt
    }

    if (typeof window !== "undefined") {
        window["robotstxt"] = robotstxt

        if (typeof define === "function" && define["amd"]) {
            define(function () {
                return {
                    "robotstxt": robotstxt,
                }
            })
        }
    }
    /* eslint-enable quote-props */
}(); // eslint-disable-line
