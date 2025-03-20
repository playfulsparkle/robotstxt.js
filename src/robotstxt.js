/* global window, exports, define */

!function () {
    'use strict';

    /**
     * Single robots.txt rule (allow/disallow directive)
     */
    class Rule {
        /**
         * Create a new rule instance
         * @param {string} type - Rule type ('allow', 'disallow' or 'noindex')
         * @param {string} path - URL path pattern the rule applies to
         */
        constructor(type, path) {
            this.re = {
                specialChars: /[.^+?(){}[\]|\\]/g, // Escapes special chars
                nonGreedyWildcard: /\*/g           // Replaces * with .*?
            };
            /** @member {string} */
            this.type = type;
            /** @member {string} */
            this.path = path;
            /** @member {string} */
            this.regex = this.createRegex(path);
        }

        /**
         * Test if a normalized URL path matches this rule's pattern
         * @param {string} path - Normalized URL path to test against
         * @return {boolean} - True if the path matches the rule's pattern
         */
        match(path) {
            return this.regex.test(path);
        }

        /**
         * Convert robots.txt path pattern to regular expression
         * @private
         * @param {string} path - Normalized URL path pattern to convert
         * @return {RegExp} - Regular expression for path matching
         */
        createRegex(path) {
            const pattern = path
                .replace(this.re.specialChars, '\\$&')      // Escape regex special characters
                .replace(this.re.nonGreedyWildcard, '.*?'); // Replace * with non-greedy wildcard

            return new RegExp(`^${pattern}`);
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
            /** @member {string} - User agent identifier for this group */
            this.userAgent = userAgent;
            /** @member {number|undefined} - Delay between crawler requests in seconds */
            this.crawlDelay = undefined;
            /** @member {number|undefined} - Specifies the minimum interval for a robot to wait after caching one page, before starting to cache another in seconds */
            this.cacheDelay = undefined;
            /** @member {Rule[]} - Collection of rules for this user agent */
            this.rules = [];
            /** @member {string} - Optional comment associated with the group */
            this.comment = [];
            /** @member {string|undefined} - Version of robots.txt specification used */
            this.robotVersion = undefined;
            /** @member {string|undefined} - Recommended visit time from robots.txt */
            this.visitTime = undefined;
            /** @member {string[]} - Request rate limits for this user agent */
            this.requestRates = [];
        }

        /**
         * Get the user agent name for this group
         * @return {string} User agent identifier
         */
        getName() {
            return this.userAgent;
        }

        /**
         * Get the comment associated with this group
         * @return {string[]} Group comment if available
         */
        getComment() {
            return this.comment;
        }

        /**
         * Get the robots.txt specification version
         * @return {string|undefined} Version number of robots.txt specification
         */
        getRobotVersion() {
            return this.robotVersion;
        }

        /**
         * Get the recommended visit time for crawler
         * @return {string|undefined} Suggested crawl time window
         */
        getVisitTime() {
            return this.visitTime;
        }

        /**
         * Get request rate limitations for this group
         * @return {string[]} Array of request rate rules
         */
        getRequestRates() {
            return this.requestRates;
        }

        /**
         * Get crawl delay setting for this group
         * @return {number|undefined} Delay between requests in seconds
         */
        getCacheDelay() {
            return this.cacheDelay;
        }

        /**
         * Get crawl delay setting for this group
         * @return {number|undefined} Delay between requests in seconds
         */
        getCrawlDelay() {
            return this.crawlDelay;
        }

        /**
         * Get all rules for this group
         * @return {Rule[]} Array of rule objects
         */
        getRules() {
            return this.rules;
        }

        /**
         * Internal method to add a rule
         * @param {string} type - Rule type ('allow', 'disallow', 'noindex')
         * @param {string} path - URL path pattern
         */
        addRule(type, path) {
            if (typeof type === 'undefined') throw new Error('The "type" parameter is required.');
            if (typeof path === 'undefined') throw new Error('The "path" parameter is required.');
            this.rules.push(new Rule(type, path));
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
            this.groups = [];

            /**
             * @private
             * @type {string[]}
             * @description Array of absolute URLs to sitemaps specified in robots.txt.
             *              Collected from Sitemap directives across the entire file.
             */
            this.sitemaps = [];

            /**
             * @private
             * @type {string[]}
             * @description Collection of Clean-param directive values specifying
             *              dynamic parameters that should be ignored during URL
             *              canonicalization. These typically include tracking
             *              parameters, session IDs, or other URL-specific values
             *              that don't affect content.
             */
            this.cleanParam = [];

            /**
             * @private
             * @type {string|undefined}
             * @description Preferred canonical host declaration from Host directive, used to:
             *                - Specify the primary domain when multiple mirrors exist
             *                - Handle internationalization/country targeting (ccTLDs)
             *                - Enforce consistent domain (with/without www) for search engines
             */
            this.host = undefined;

            /**
             * @private
             * @type {string[]}
             * @description Parsing error, warning etc. reports
             */
            this.reports = [];

            this.re = {
                robotVersion: /^[12]\.0$/,
                requestRate: /^\d+\/\d+[smh]?\s+(\d{4})-(\d{4})$/,
                visitTime: /^(\d{4})-(\d{4})$/,
                eol: /\r\n|\r|\n/,
                inlineComment: /(?:\s|^)#/,
                pathForwardSlash: /\/+/g
            };

            this.parse(content);
        }

        /**
         * Parse raw robots.txt content into structured format
         * @private
         * @param {string} content - Raw robots.txt content
         */
        parse(content) {
            if (typeof content === 'undefined') throw new Error('The "content" parameter is required.');

            /** @type {string[]} */
            const normalizedContent = [];

            const contentLines = content.split(this.re.eol);

            for (let index = 0; index < contentLines.length; index++) {
                /** @type {string}  - Trimed robots.txt line */
                const processedLine = contentLines[index].trim();

                if (!processedLine || processedLine[0] === '#') continue;

                /** @type {number} - directive:value separated using colon character */
                const colonIndex = processedLine.indexOf(':');

                if (colonIndex === -1) continue;

                /** @type {string} - trimmed, lowercase directive */
                const directive = processedLine.slice(0, colonIndex).trim().toLowerCase();

                /** @type {string} - trimmed directive value */
                let value = processedLine.slice(colonIndex + 1).trim();

                /** @type {number} - directive value comment index */
                const commentIndex = value.search(this.re.inlineComment);

                if (commentIndex !== -1) {
                    // Remove inline comment
                    value = value.slice(0, commentIndex).trim();
                }

                // Make sure that directive and value is set
                if (directive && value) {
                    normalizedContent.push({ index, directive, value });
                }
            }

            /** @type {string[]} */
            let userAgentList = [];
            /** @type {boolean} */
            let sameUserAgent = false;
            /** @type {boolean} */
            let userAgentSeen = false;
            /** @type {Object.<string, Group>} */
            const tempGroups = {};

            /** @type {string} - Array of directives which require at least one User-Agent present. */
            const uaDirectives = [
                'allow',
                'disallow',
                'noindex',
                'comment',
                'robot-version',
                'request-rate',
                'visit-time',
                'cache-delay',
                'crawl-delay'
            ];

            // Process each directive and build rule groups
            for (let index = 0; index < normalizedContent.length; index++) {
                /** @type {Object.<string, string>} */
                const currentLine = normalizedContent[index];

                /** @type {boolean} */
                const needsDefaultUa = uaDirectives.indexOf(currentLine.directive) !== -1 && !userAgentSeen;

                if (currentLine.directive === 'user-agent' || needsDefaultUa) {
                    userAgentSeen = true;

                    const uaName = needsDefaultUa ? '*' : currentLine.value;

                    if (!userAgentList.indexOf(uaName) !== -1) {
                        userAgentList.push(uaName);
                    }

                    if (!tempGroups[uaName]) {
                        tempGroups[uaName] = new Group(uaName);
                    }
                }

                if (currentLine.directive === 'allow') {
                    const normalizedPath = this.normalizePath(currentLine.value);

                    userAgentList.forEach(agent => tempGroups[agent].addRule('allow', normalizedPath));
                    sameUserAgent = true;
                }
                else if (currentLine.directive === 'disallow') {
                    const normalizedPath = this.normalizePath(currentLine.value);

                    userAgentList.forEach(agent => tempGroups[agent].addRule('disallow', normalizedPath));
                    sameUserAgent = true;
                }
                else if (currentLine.directive === 'noindex') {
                    const normalizedPath = this.normalizePath(currentLine.value);

                    userAgentList.forEach(agent => tempGroups[agent].addRule('noindex', normalizedPath));
                    sameUserAgent = true;
                }
                // Cache-delay: 10
                else if (currentLine.directive === 'cache-delay') {
                    const cacheDelay = currentLine.value * 1;

                    if (isNaN(cacheDelay)) {
                        this.reports.push(`Invalid Cache-delay directive value: "${currentLine.value}".`);
                        continue;
                    }

                    if (cacheDelay <= 0) {
                        this.reports.push(`Cache-delay must be a positive number. The provided value is ${cacheDelay}.`);
                        continue;
                    }

                    userAgentList.forEach(agent => {
                        if (!tempGroups[agent].cacheDelay) {
                            tempGroups[agent].cacheDelay = cacheDelay;
                        }
                    });
                    sameUserAgent = true;
                }
                // Crawl-delay: 10
                else if (currentLine.directive === 'crawl-delay') {
                    const crawlDelay = currentLine.value * 1;

                    if (isNaN(crawlDelay)) {
                        this.reports.push(`Invalid Crawl-Delay directive value: "${currentLine.value}".`);
                        continue;
                    }

                    if (crawlDelay <= 0) {
                        this.reports.push(`Crawl-Delay must be a positive number. The provided value is ${crawlDelay}.`);
                        continue;
                    }

                    userAgentList.forEach(agent => {
                        if (!tempGroups[agent].crawlDelay) {
                            tempGroups[agent].crawlDelay = crawlDelay;
                        }
                    });
                    sameUserAgent = true;
                }
                // Comment: [text]
                else if (currentLine.directive === 'comment') {
                    userAgentList.forEach(agent => tempGroups[agent].comment.push(currentLine.value));
                    sameUserAgent = true;
                }
                // Robot-version: 2.0.0
                else if (currentLine.directive === 'robot-version') {
                    if (!this.re.robotVersion.test(currentLine.value)) {
                        this.reports.push(`Invalid Robot-Version directive value: "${currentLine.value}".`);
                        continue;
                    }

                    userAgentList.forEach(agent => tempGroups[agent].robotVersion = currentLine.value);
                    sameUserAgent = true;
                }
                // Request-rate: <rate> # 100/24h
                // Request-rate: <rate> <time> '-' <time> # 100/24h 1300-1659
                else if (currentLine.directive === 'request-rate') {
                    const requestRateMatch = currentLine.value.match(this.re.requestRate);
                    if (!requestRateMatch) {
                        this.reports.push(`Invalid Request-rate directive value: "${currentLine.value}".`);
                        continue;
                    }

                    if (requestRateMatch[1] && requestRateMatch[2]) {
                        const startTime = requestRateMatch[1];
                        const endTime = requestRateMatch[2];

                        if (!this.isValidTime(startTime) || !this.isValidTime(endTime)) {
                            this.reports.push(`Invalid Request-rate directive start-end time format: "${startTime}-${endTime}".`);
                            continue;
                        }
                    }

                    userAgentList.forEach(agent => tempGroups[agent].requestRates.push(currentLine.value));
                    sameUserAgent = true;
                }
                // Visit-time: <time> '-' <time>
                else if (currentLine.directive === 'visit-time') {
                    const visitTimeMatch = currentLine.value.match(this.re.visitTime);
                    if (!visitTimeMatch) {
                        this.reports.push(`Invalid Visit-time directive value: "${currentLine.value}".`);
                        continue;
                    }

                    if (visitTimeMatch[1] && visitTimeMatch[2]) {
                        const startTime = visitTimeMatch[1];
                        const endTime = visitTimeMatch[2];

                        if (!this.isValidTime(startTime) || !this.isValidTime(endTime)) {
                            this.reports.push(`Invalid Visit-time directive start-end time format: "${startTime}-${endTime}".`);
                            continue;
                        }
                    }

                    userAgentList.forEach(agent => tempGroups[agent].visitTime = currentLine.value);
                    sameUserAgent = true;
                }
                else if (currentLine.directive === 'sitemap') {
                    this.sitemaps.push(currentLine.value);
                }
                // Clean-param: [parameter1]&[parameter2]&[...] [path]
                else if (currentLine.directive === 'clean-param') {
                    this.cleanParam.push(currentLine.value);
                }
                else if (currentLine.directive === 'host') {
                    this.host = currentLine.value;
                }

                /** @type {Object.<string, string>} */
                const nextLine = normalizedContent[index + 1];

                // Reset user agent list on new group
                if (nextLine && sameUserAgent && nextLine.directive === 'user-agent') {
                    sameUserAgent = false;
                    userAgentList = [];
                }
            }

            this.groups = Object.keys(tempGroups).map(key => tempGroups[key]);
        }

        /**
         * Returns the reports collected during parsing and validating the robots.txt file
         * @returns {string[]} Parsing error, warning etc. reports
         */
        getReports() {
            return this.reports;
        }

        /**
         * Check if a URL is allowed for specified user agent
         * @param {string} url - URL to check
         * @param {string} userAgent - User agent to check rules for
         * @return {boolean} - True if allowed, false if disallowed
         */
        isAllowed(url, userAgent) {
            if (typeof url === 'undefined') throw new Error('The "url" parameter is required.');
            if (typeof userAgent === 'undefined') throw new Error('The "userAgent" parameter is required.');

            /** @type {Rule[]} */
            const rules = this.getApplicableRules(userAgent);
            /** @type {string} */
            const urlPath = this.normalizeUrlPath(url);
            /** @type {Rule[]} */
            const matchingRules = [];

            for (const rule of rules) {
                if (rule.match(urlPath)) {
                    matchingRules.push(rule);
                }
            }

            if (matchingRules.length === 0) return true;

            /** @type {Rule} */
            let mostSpecific = matchingRules[0];

            // Find most specific rule based on path length and special characters
            for (const rule of matchingRules) {
                /** @type {number} */
                const currentSpecificity = this.getRuleSpecificity(rule.path);
                /** @type {number} */
                const mostSpecificSpecificity = this.getRuleSpecificity(mostSpecific.path);

                if (currentSpecificity > mostSpecificSpecificity) {
                    mostSpecific = rule;
                }
            }

            return mostSpecific.type === 'allow';
        }

        /**
         * Check if a URL is disallowed for specified user agent
         * @param {string} url - URL to check
         * @param {string} userAgent - User agent to check rules for
         * @return {boolean} - True if disallowed, false if allowed
         */
        isDisallowed(url, userAgent) {
            return !this.isAllowed(url, userAgent);
        }

        /**
         * Get sitemap URLs found in robots.txt
         * @return {string[]} - Array of sitemap URLs
         */
        getSitemaps() {
            return this.sitemaps;
        }

        /**
         * Retrieve Clean-param directives for URL parameter sanitization
         * @returns {string[]} Array of parameter patterns in Clean-param format:
         *                         - Each entry follows "param[&param2] [path-prefix]" syntax
         *                         - Path prefix is optional and specifies URL scope
         */
        getCleanParams() {
            return this.cleanParam;
        }

        /**
         * Get canonical host declaration for domain normalization
         * @returns {string|undefined} Preferred hostname in one of these formats:
         *                        - Domain without protocol (e.g., "www.example.com")
         *                        - Domain with port (e.g., "example.com:8080")
         *                        - undefined if no Host directive declared
         */
        getHost() {
            return this.host = undefined;
        }

        /**
         * Get group for specific user agent
         * @param {string} userAgent - User agent to search for
         * @return {Group|undefined} - Matching group or undefined
         */
        getGroup(userAgent) {
            if (!userAgent) return undefined;
            for (let index = 0; index < this.groups.length; index++) {
                const group = this.groups[index];

                if (group.userAgent.toLowerCase() === userAgent.toLowerCase()) {
                    return group;
                }
            }
            return undefined;
        }

        /**
         * Calculate rule specificity score for path comparison
         * @private
         * @param {string} path - URL path pattern
         * @return {number} - Specificity score (higher = more specific)
         */
        getRuleSpecificity(path) {
            /** @type {number} */
            let specificity = path.length;
            if (path.indexOf('*') !== -1) specificity -= 0.5;
            else if (path.slice(-1) === '$') specificity += 0.5;
            return specificity;
        }

        /**
         * Get groups applicable to specified user agent
         * @private
         * @param {string} userAgent - User agent to check
         * @return {Group[]} - Array of matching groups
         */
        getApplicableGroups(userAgent) {
            /** @type {Group[]} */
            const exactGroups = this.groups.filter(group => group.getName().toLowerCase() === userAgent.toLowerCase());
            if (exactGroups.length > 0) return exactGroups;
            return this.groups.filter(group => group.getName() === '*');
        }

        /**
         * Get all rules applicable to specified user agent
         * @private
         * @param {string} userAgent - User agent to check
         * @return {Rule[]} - Array of applicable rules
         */
        getApplicableRules(userAgent) {
            /** @type {Rule[]} */
            const rules = this.getApplicableGroups(userAgent);
            return rules.reduce((acc, group) => acc.concat(group.getRules()), []);
        }

        /**
         * Normalize URL path for comparison
         * @private
         * @param {string} url - URL or path to normalize
         * @return {string} - Normalized path
         */
        normalizeUrlPath(url) {
            try {
                return this.normalizePath(new URL(url).pathname);
            } catch (error) {
                return this.normalizePath(url);
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
            let decodedPath;
            try {
                decodedPath = decodeURIComponent(path);
            } catch (error) {
                decodedPath = path;
            }
            /** @type {string} */
            const newPath = decodedPath.replace(this.re.pathForwardSlash, '/');
            if (newPath[0] === '/') return newPath;
            return `/${newPath}`;
        }

        isValidTime(time) {
            const hours = parseInt(time.substring(0, 2), 10);
            const minutes = parseInt(time.substring(2, 4), 10);

            // Validate hours and minutes
            return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
        }
    }

    /**
     * Create a new robots.txt parser instance
     * @param {string} content - Raw robots.txt content
     * @return {RobotsTxtParser} - Configured parser instance
     */
    function robotstxt(content) {
        return new RobotsTxtParser(content);
    }

    // Universal module exports
    /* eslint-disable quote-props */
    if (typeof exports !== 'undefined') {
        exports.robotstxt = robotstxt;
    }
    if (typeof window !== 'undefined') {
        window.robotstxt = robotstxt;
        if (typeof define === 'function' && define.amd) {
            define(() => ({ robotstxt }));
        }
    }
    /* eslint-enable quote-props */
}();
