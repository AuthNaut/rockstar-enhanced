// User Activity Lookup - Okta System Log API Integration
// Part of Rockstar Chrome Extension

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        MAX_RETRIES: 3,
        INITIAL_RETRY_DELAY: 1000, // 1 second
        MAX_RETRY_DELAY: 32000, // 32 seconds
        RATE_LIMIT_BUFFER: 5, // Number of requests to buffer before rate limit
        HEADERS: {
            'X-Okta-User-Agent-Extended': 'rockstar',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    };

    // State management
    let currentResults = [];
    let nextUrl = null;
    let isLoading = false;
    let currentDebugData = null;

    // DOM Elements - Form
    const searchForm = document.getElementById('searchForm');
    const searchButton = document.getElementById('searchButton');
    const userIdentifierInput = document.getElementById('userIdentifier');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    // DOM Elements - Results
    const resultsSection = document.getElementById('resultsSection');
    const statusMessage = document.getElementById('statusMessage');
    const resultsContainer = document.getElementById('resultsContainer');

    // DOM Elements - Modal (initialized after DOM load)
    let debugModal = null;
    let debugModalBody = null;
    let closeDebugModalBtn = null;
    let closeDebugModal = null;
    let copyDebugDataBtn = null;

    // Initialize default dates (last 7 days)
    function initializeDates() {
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);

        endDateInput.valueAsDate = today;
        startDateInput.valueAsDate = sevenDaysAgo;
    }

    // Convert date to ISO 8601 format for Okta API
    function convertDateToISO8601(dateString, isEndDate = false) {
        const date = new Date(dateString);

        if (isNaN(date.getTime())) {
            throw new Error('Invalid date format');
        }

        // For end date, set to end of day (23:59:59.999)
        if (isEndDate) {
            date.setHours(23, 59, 59, 999);
        } else {
            // For start date, set to beginning of day (00:00:00.000)
            date.setHours(0, 0, 0, 0);
        }

        return date.toISOString();
    }

    // Display status message
    function showStatus(message, type = 'loading') {
        statusMessage.innerHTML = message;
        statusMessage.className = `status-message ${type}`;
        resultsSection.classList.add('visible');
    }

    // Display error message
    function showError(message, details = null) {
        let errorHTML = `<strong>Error:</strong> ${message}`;
        if (details) {
            errorHTML += `<br><small>${details}</small>`;
        }
        showStatus(errorHTML, 'error');
    }

    // Sleep utility for retry delays
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Calculate exponential backoff delay
    function calculateBackoffDelay(retryCount) {
        const delay = Math.min(
            CONFIG.INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
            CONFIG.MAX_RETRY_DELAY
        );
        // Add jitter to prevent thundering herd
        return delay + Math.random() * 1000;
    }

    // Parse Link header for pagination
    function parseLinks(linkHeader) {
        if (!linkHeader) return {};

        const links = {};
        const parts = linkHeader.split(',');

        parts.forEach(part => {
            const section = part.split(';');
            if (section.length === 2) {
                const url = section[0].replace(/<(.*)>/, '$1').trim();
                const name = section[1].replace(/rel="(.*)"/, '$1').trim();
                links[name] = url;
            }
        });

        return links;
    }

    // Handle different HTTP error codes
    function handleHttpError(response, retryCount) {
        const status = response.status;
        const errorMessages = {
            401: 'Authentication failed. Please ensure you are logged into Okta.',
            403: 'Access forbidden. You may not have permission to view system logs.',
            404: 'Resource not found. Please check your Okta domain.',
            429: 'Rate limit exceeded. Retrying with exponential backoff...',
            500: 'Okta server error. Retrying...',
            502: 'Bad gateway. Retrying...',
            503: 'Service unavailable. Retrying...',
            504: 'Gateway timeout. Retrying...'
        };

        const shouldRetry = [429, 500, 502, 503, 504].includes(status);
        const message = errorMessages[status] || `HTTP ${status}: ${response.statusText}`;

        return {
            shouldRetry,
            message,
            isClientError: status >= 400 && status < 500 && status !== 429
        };
    }

    // Fetch user activity with retry logic and error handling
    async function fetchUserActivity(userIdentifier, startDate, endDate, retryCount = 0) {
        try {
            // Convert dates to ISO 8601 format
            const sinceISO = convertDateToISO8601(startDate, false);
            const untilISO = convertDateToISO8601(endDate, true);

            // Build the filter query
            const filter = `actor.alternateId eq "${userIdentifier}" or actor.id eq "${userIdentifier}"`;

            // Construct the API URL
            const baseUrl = window.location.origin;
            const apiUrl = `${baseUrl}/api/v1/logs?since=${encodeURIComponent(sinceISO)}&until=${encodeURIComponent(untilISO)}&filter=${encodeURIComponent(filter)}&sortOrder=DESCENDING&limit=100`;

            // Make the API request
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: CONFIG.HEADERS,
                credentials: 'same-origin'
            });

            // Check rate limiting headers
            const rateLimitRemaining = parseInt(response.headers.get('X-Rate-Limit-Remaining') || '0');
            const rateLimitReset = parseInt(response.headers.get('X-Rate-Limit-Reset') || '0');

            // Handle non-200 responses
            if (!response.ok) {
                const errorInfo = handleHttpError(response, retryCount);

                // For client errors (except 429), don't retry
                if (errorInfo.isClientError) {
                    throw new Error(errorInfo.message);
                }

                // For server errors and rate limits, retry with backoff
                if (errorInfo.shouldRetry && retryCount < CONFIG.MAX_RETRIES) {
                    let delay;

                    // For 429, use the rate limit reset time if available
                    if (response.status === 429 && rateLimitReset) {
                        const now = Math.floor(Date.now() / 1000);
                        delay = Math.max((rateLimitReset - now) * 1000, 1000);
                        showStatus(`${errorInfo.message} Waiting ${Math.ceil(delay / 1000)} seconds...`, 'loading');
                    } else {
                        delay = calculateBackoffDelay(retryCount);
                        showStatus(`${errorInfo.message} Retrying in ${Math.ceil(delay / 1000)} seconds... (Attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES})`, 'loading');
                    }

                    await sleep(delay);
                    return fetchUserActivity(userIdentifier, startDate, endDate, retryCount + 1);
                }

                throw new Error(errorInfo.message);
            }

            // Parse response
            const logs = await response.json();

            // Parse pagination links
            const linkHeader = response.headers.get('Link');
            const links = parseLinks(linkHeader);

            // Check if we're approaching rate limit
            if (rateLimitRemaining < CONFIG.RATE_LIMIT_BUFFER && links.next) {
                console.warn(`Approaching rate limit: ${rateLimitRemaining} requests remaining`);
            }

            return {
                logs,
                nextUrl: links.next || null,
                rateLimitRemaining,
                rateLimitReset
            };

        } catch (error) {
            // If we've exhausted retries or it's a non-retryable error
            if (retryCount >= CONFIG.MAX_RETRIES) {
                throw new Error(`Failed after ${CONFIG.MAX_RETRIES} retries: ${error.message}`);
            }
            throw error;
        }
    }

    // Fetch more results (pagination)
    async function fetchMoreResults() {
        if (!nextUrl || isLoading) return;

        isLoading = true;
        showStatus('<div class="loader"></div> Loading more results...', 'loading');

        try {
            const response = await fetch(nextUrl, {
                method: 'GET',
                headers: CONFIG.HEADERS,
                credentials: 'same-origin'
            });

            if (!response.ok) {
                const errorInfo = handleHttpError(response, 0);
                throw new Error(errorInfo.message);
            }

            const logs = await response.json();
            const linkHeader = response.headers.get('Link');
            const links = parseLinks(linkHeader);

            currentResults = currentResults.concat(logs);
            nextUrl = links.next || null;

            displayResults(currentResults, nextUrl);
            showStatus(`Successfully loaded ${currentResults.length} events`, 'success');

        } catch (error) {
            showError('Failed to load more results', error.message);
        } finally {
            isLoading = false;
        }
    }

    // ========== DATA PROCESSING FUNCTIONS ==========

    /**
     * Extract location information from geographicalContext
     * @param {Object} geoContext - The geographicalContext object from log entry
     * @returns {Object} Parsed location information
     */
    function extractLocation(geoContext) {
        if (!geoContext) {
            return {
                city: 'Unknown',
                state: 'Unknown',
                country: 'Unknown',
                formatted: 'Unknown Location',
                coordinates: null
            };
        }

        const city = geoContext.city || 'Unknown';
        const state = geoContext.state || '';
        const country = geoContext.country || 'Unknown';
        const lat = geoContext.geolocation?.lat;
        const lon = geoContext.geolocation?.lon;

        // Format the location string
        let formatted = city;
        if (state) {
            formatted += `, ${state}`;
        }
        if (country && country !== 'Unknown') {
            formatted += `, ${country}`;
        }

        return {
            city,
            state,
            country,
            formatted,
            coordinates: (lat && lon) ? { lat, lon } : null,
            postalCode: geoContext.postalCode || null
        };
    }

    /**
     * Extract client information from userAgent and device
     * @param {Object} client - The client object from log entry
     * @returns {Object} Parsed client information
     */
    function extractClient(client) {
        if (!client) {
            return {
                browser: 'Unknown',
                os: 'Unknown',
                device: 'Unknown',
                rawUserAgent: 'Unknown',
                ipAddress: 'Unknown',
                zone: null
            };
        }

        const userAgent = client.userAgent || {};
        const device = client.device || 'Unknown';
        const ipAddress = client.ipAddress || 'Unknown';
        const zone = client.zone || null;

        // Parse browser info
        const browser = userAgent.browser || 'Unknown';
        const os = userAgent.os || 'Unknown';
        const rawUserAgent = userAgent.rawUserAgent || 'Unknown';

        // Create a friendly display name for the client
        let displayName = browser;
        if (os && os !== 'Unknown') {
            displayName += ` on ${os}`;
        }
        if (device && device !== 'Unknown') {
            displayName += ` (${device})`;
        }

        return {
            browser,
            os,
            device,
            rawUserAgent,
            ipAddress,
            zone,
            displayName
        };
    }

    /**
     * Process raw log data and extract key information
     * @param {Object} log - Raw log entry from Okta API
     * @returns {Object} Processed log data with extracted fields
     */
    function processLogData(log) {
        if (!log) return null;

        // Extract basic event info
        const eventType = log.eventType || 'unknown.event';
        const published = log.published;
        const uuid = log.uuid;
        const version = log.version || '0';
        const severity = log.severity || 'INFO';
        const displayMessage = log.displayMessage || 'No description available';

        // Extract outcome
        const outcome = {
            result: log.outcome?.result || 'UNKNOWN',
            reason: log.outcome?.reason || null
        };

        // Extract actor (user) info
        const actor = {
            id: log.actor?.id || 'unknown',
            type: log.actor?.type || 'User',
            alternateId: log.actor?.alternateId || 'unknown',
            displayName: log.actor?.displayName || log.actor?.alternateId || 'Unknown User',
            detailEntry: log.actor?.detailEntry || null
        };

        // Extract target info (what was acted upon)
        const targets = (log.target || []).map(target => ({
            id: target.id || 'unknown',
            type: target.type || 'Unknown',
            alternateId: target.alternateId || null,
            displayName: target.displayName || target.alternateId || 'Unknown Target',
            detailEntry: target.detailEntry || null
        }));

        // Extract authentication context
        const authenticationContext = log.authenticationContext ? {
            authenticationProvider: log.authenticationContext.authenticationProvider || null,
            authenticationStep: log.authenticationContext.authenticationStep || 0,
            credentialProvider: log.authenticationContext.credentialProvider || null,
            credentialType: log.authenticationContext.credentialType || null,
            externalSessionId: log.authenticationContext.externalSessionId || null,
            interface: log.authenticationContext.interface || null,
            issuer: log.authenticationContext.issuer || null
        } : null;

        // Extract security context
        const securityContext = log.securityContext ? {
            asNumber: log.securityContext.asNumber || null,
            asOrg: log.securityContext.asOrg || null,
            domain: log.securityContext.domain || null,
            isProxy: log.securityContext.isProxy || false,
            isp: log.securityContext.isp || null
        } : null;

        // Extract request info
        const request = log.request ? {
            ipChain: log.request.ipChain || []
        } : null;

        // Extract transaction details
        const transaction = log.transaction ? {
            id: log.transaction.id || null,
            type: log.transaction.type || null,
            detail: log.transaction.detail || {}
        } : null;

        // Extract debug context
        const debugContext = log.debugContext ? {
            debugData: log.debugContext.debugData || {}
        } : null;

        return {
            // Basic info
            eventType,
            published,
            uuid,
            version,
            severity,
            displayMessage,

            // Structured data
            outcome,
            actor,
            targets,

            // Context data
            client: extractClient(log.client),
            location: extractLocation(log.geographicalContext),
            authenticationContext,
            securityContext,
            request,
            transaction,
            debugContext,

            // Keep original for reference
            _original: log
        };
    }

    /**
     * Calculate statistics from processed log data
     * @param {Array} logs - Array of processed log entries
     * @returns {Object} Statistics object
     */
    function calculateStatistics(logs) {
        if (!logs || logs.length === 0) {
            return {
                total: 0,
                success: 0,
                failure: 0,
                unknown: 0,
                successRate: 0,
                failureRate: 0,
                uniqueApps: 0,
                uniqueLocations: 0,
                uniqueIPs: 0,
                eventTypes: {},
                appsList: [],
                locationsList: [],
                ipList: [],
                topEventTypes: []
            };
        }

        const stats = {
            total: logs.length,
            success: 0,
            failure: 0,
            unknown: 0,
            eventTypes: {},
            apps: new Set(),
            locations: new Set(),
            ips: new Set()
        };

        // Process each log entry
        logs.forEach(log => {
            // Count outcomes
            const outcome = log.outcome?.result?.toLowerCase() || 'unknown';
            if (outcome === 'success') {
                stats.success++;
            } else if (outcome === 'failure') {
                stats.failure++;
            } else {
                stats.unknown++;
            }

            // Count event types
            const eventType = log.eventType || 'unknown.event';
            stats.eventTypes[eventType] = (stats.eventTypes[eventType] || 0) + 1;

            // Track unique apps from targets
            if (log.target) {
                log.target.forEach(target => {
                    if (target.type === 'AppInstance' || target.type === 'AppUser') {
                        const appName = target.displayName || target.alternateId;
                        if (appName) stats.apps.add(appName);
                    }
                });
            }

            // Track unique locations
            const location = extractLocation(log.geographicalContext);
            if (location.formatted !== 'Unknown Location') {
                stats.locations.add(location.formatted);
            }

            // Track unique IPs
            const client = extractClient(log.client);
            if (client.ipAddress && client.ipAddress !== 'Unknown') {
                stats.ips.add(client.ipAddress);
            }
        });

        // Calculate rates
        stats.successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : 0;
        stats.failureRate = stats.total > 0 ? ((stats.failure / stats.total) * 100).toFixed(1) : 0;

        // Get top event types (sorted by frequency)
        stats.topEventTypes = Object.entries(stats.eventTypes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([type, count]) => ({ type, count }));

        // Convert sets to arrays and counts
        stats.uniqueApps = stats.apps.size;
        stats.uniqueLocations = stats.locations.size;
        stats.uniqueIPs = stats.ips.size;
        stats.appsList = Array.from(stats.apps);
        stats.locationsList = Array.from(stats.locations);
        stats.ipList = Array.from(stats.ips);

        // Clean up sets
        delete stats.apps;
        delete stats.locations;
        delete stats.ips;

        return stats;
    }

    // ========== DISPLAY HELPER FUNCTIONS ==========

    // Format date for display
    function formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    // Get event type class for styling
    function getEventTypeClass(outcome) {
        if (!outcome) return 'info';

        switch (outcome.toLowerCase()) {
            case 'success':
                return 'success';
            case 'failure':
            case 'error':
                return 'failure';
            default:
                return 'info';
        }
    }

    // ========== UI UPDATE FUNCTIONS ==========

    /**
     * Update statistics cards in the UI
     * @param {Object} stats - Statistics object from calculateStatistics
     * @param {HTMLElement} container - Container element to update
     */
    function updateStatistics(stats, container) {
        if (!stats || stats.total === 0) {
            container.innerHTML = '';
            return;
        }

        const html = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px;">
                <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <div class="stat-value">${stats.total}</div>
                    <div class="stat-label">Total Events</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">
                    <div class="stat-value">${stats.success}</div>
                    <div class="stat-label">Successful (${stats.successRate}%)</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);">
                    <div class="stat-value">${stats.failure}</div>
                    <div class="stat-label">Failed (${stats.failureRate}%)</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                    <div class="stat-value">${stats.uniqueApps}</div>
                    <div class="stat-label">Unique Apps</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                    <div class="stat-value">${stats.uniqueLocations}</div>
                    <div class="stat-label">Locations</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
                    <div class="stat-value">${stats.uniqueIPs}</div>
                    <div class="stat-label">IP Addresses</div>
                </div>
            </div>
            ${stats.topEventTypes.length > 0 ? `
                <details style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                    <summary style="cursor: pointer; font-weight: 600; color: #667eea;">Top Event Types</summary>
                    <ul style="margin-top: 10px; list-style: none; padding: 0;">
                        ${stats.topEventTypes.map(et => `
                            <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">
                                <code style="font-size: 0.9em;">${et.type}</code>
                                <span style="float: right; font-weight: 600;">${et.count}</span>
                            </li>
                        `).join('')}
                    </ul>
                </details>
            ` : ''}
            <div style="margin-bottom: 20px; text-align: right; display: flex; gap: 10px; justify-content: flex-end;">
                <button type="button" id="exportCSVBtn" style="padding: 10px 20px; width: auto; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">
                    📊 Export to CSV
                </button>
                <button type="button" id="exportJSONBtn" style="padding: 10px 20px; width: auto; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                    📋 Export to JSON
                </button>
            </div>
        `;

        container.innerHTML = html;

        // Attach export handlers
        const exportCSVBtn = document.getElementById('exportCSVBtn');
        if (exportCSVBtn) {
            exportCSVBtn.addEventListener('click', () => exportToCSV(currentResults));
        }

        const exportJSONBtn = document.getElementById('exportJSONBtn');
        if (exportJSONBtn) {
            exportJSONBtn.addEventListener('click', () => exportToJSON(currentResults));
        }
    }

    /**
     * Populate the activity table with log data
     * @param {Array} logs - Array of log entries
     * @param {HTMLElement} container - Table container element
     * @param {Boolean} hasMore - Whether there are more results to load
     */
    function populateActivityTable(logs, container, hasMore = false) {
        if (!logs || logs.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No activity found.</p>';
            return;
        }

        let html = `
            <table class="activity-table">
                <thead>
                    <tr>
                        <th style="width: 160px;">Timestamp</th>
                        <th style="width: 200px;">Event Type</th>
                        <th style="width: 100px;">Outcome</th>
                        <th style="width: 180px;">Client</th>
                        <th style="width: 150px;">Location</th>
                        <th style="width: 120px;">IP Address</th>
                        <th>Details</th>
                        <th style="width: 80px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        logs.forEach((log, index) => {
            const processedLog = processLogData(log);

            const eventType = processedLog.eventType || 'Unknown';
            const outcome = processedLog.outcome.result || 'N/A';
            const outcomeClass = getEventTypeClass(outcome);
            const timestamp = formatDate(processedLog.published);
            const client = processedLog.client.displayName;
            const location = processedLog.location.formatted;
            const ipAddress = processedLog.client.ipAddress;
            const displayMessage = processedLog.displayMessage || 'No description available';

            html += `
                <tr data-index="${index}">
                    <td style="white-space: nowrap;">${timestamp}</td>
                    <td><code style="font-size: 0.85em;">${eventType}</code></td>
                    <td><span class="event-type ${outcomeClass}">${outcome}</span></td>
                    <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${processedLog.client.rawUserAgent}">${client}</td>
                    <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${location}">${location}</td>
                    <td><code style="font-size: 0.85em;">${ipAddress}</code></td>
                    <td>${displayMessage}</td>
                    <td style="text-align: center;">
                        <span class="action-icon" onclick="showDebugInfo(${index})" title="View Details">🔍</span>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';

        // Add pagination controls
        if (hasMore) {
            html += `
                <div class="pagination">
                    <span class="result-count">Showing ${logs.length} events</span>
                    <button type="button" id="loadMoreBtn">Load More</button>
                </div>
            `;
        } else {
            html += `
                <div class="pagination">
                    <span class="result-count">Showing all ${logs.length} events</span>
                </div>
            `;
        }

        container.innerHTML = html;

        // Attach event listener for load more button
        if (hasMore) {
            const loadMoreBtn = document.getElementById('loadMoreBtn');
            if (loadMoreBtn) {
                loadMoreBtn.addEventListener('click', fetchMoreResults);
            }
        }
    }

    /**
     * Show debug information modal for a specific log entry
     * @param {Number} index - Index of the log entry in currentResults
     */
    window.showDebugInfo = function(index) {
        if (!currentResults[index]) {
            console.error('Log entry not found at index:', index);
            return;
        }

        const log = currentResults[index];
        const processedLog = processLogData(log);
        currentDebugData = log;

        // Build debug modal content
        const debugContent = `
            <div class="debug-section">
                <h3>Event Information</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 8px; font-weight: 600; width: 200px;">Event Type:</td>
                        <td style="padding: 8px;"><code>${processedLog.eventType}</code></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 8px; font-weight: 600;">UUID:</td>
                        <td style="padding: 8px;"><code>${processedLog.uuid}</code></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 8px; font-weight: 600;">Timestamp:</td>
                        <td style="padding: 8px;">${formatDate(processedLog.published)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 8px; font-weight: 600;">Severity:</td>
                        <td style="padding: 8px;"><span class="event-type ${getEventTypeClass(processedLog.severity)}">${processedLog.severity}</span></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 8px; font-weight: 600;">Outcome:</td>
                        <td style="padding: 8px;"><span class="event-type ${getEventTypeClass(processedLog.outcome.result)}">${processedLog.outcome.result}</span></td>
                    </tr>
                    ${processedLog.outcome.reason ? `
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 8px; font-weight: 600;">Reason:</td>
                        <td style="padding: 8px;">${processedLog.outcome.reason}</td>
                    </tr>
                    ` : ''}
                </table>
            </div>

            <div class="debug-section">
                <h3>Actor (User)</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 8px; font-weight: 600; width: 200px;">Display Name:</td>
                        <td style="padding: 8px;">${processedLog.actor.displayName}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 8px; font-weight: 600;">Alternate ID:</td>
                        <td style="padding: 8px;">${processedLog.actor.alternateId}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 8px; font-weight: 600;">ID:</td>
                        <td style="padding: 8px;"><code>${processedLog.actor.id}</code></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 8px; font-weight: 600;">Type:</td>
                        <td style="padding: 8px;">${processedLog.actor.type}</td>
                    </tr>
                </table>
            </div>

            ${processedLog.targets && processedLog.targets.length > 0 ? `
            <div class="debug-section">
                <h3>Targets</h3>
                ${processedLog.targets.map((target, i) => `
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                        <tr style="background: #f5f5f5;">
                            <td colspan="2" style="padding: 8px; font-weight: 600;">Target ${i + 1}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e0e0e0;">
                            <td style="padding: 8px; font-weight: 600; width: 200px;">Display Name:</td>
                            <td style="padding: 8px;">${target.displayName}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e0e0e0;">
                            <td style="padding: 8px; font-weight: 600;">Type:</td>
                            <td style="padding: 8px;">${target.type}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e0e0e0;">
                            <td style="padding: 8px; font-weight: 600;">ID:</td>
                            <td style="padding: 8px;"><code>${target.id}</code></td>
                        </tr>
                    </table>
                `).join('')}
            </div>
            ` : ''}

            <div class="debug-section">
                <h3>Client Information</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 8px; font-weight: 600; width: 200px;">Browser:</td>
                        <td style="padding: 8px;">${processedLog.client.browser}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 8px; font-weight: 600;">Operating System:</td>
                        <td style="padding: 8px;">${processedLog.client.os}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 8px; font-weight: 600;">Device:</td>
                        <td style="padding: 8px;">${processedLog.client.device}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 8px; font-weight: 600;">IP Address:</td>
                        <td style="padding: 8px;"><code>${processedLog.client.ipAddress}</code></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 8px; font-weight: 600;">User Agent:</td>
                        <td style="padding: 8px; word-break: break-all;"><small>${processedLog.client.rawUserAgent}</small></td>
                    </tr>
                </table>
            </div>

            <div class="debug-section">
                <h3>Location</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 8px; font-weight: 600; width: 200px;">Location:</td>
                        <td style="padding: 8px;">${processedLog.location.formatted}</td>
                    </tr>
                    ${processedLog.location.coordinates ? `
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 8px; font-weight: 600;">Coordinates:</td>
                        <td style="padding: 8px;">${processedLog.location.coordinates.lat}, ${processedLog.location.coordinates.lon}</td>
                    </tr>
                    ` : ''}
                </table>
            </div>

            ${processedLog.authenticationContext ? `
            <div class="debug-section">
                <h3>Authentication Context</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    ${processedLog.authenticationContext.authenticationProvider ? `
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 8px; font-weight: 600; width: 200px;">Provider:</td>
                        <td style="padding: 8px;">${processedLog.authenticationContext.authenticationProvider}</td>
                    </tr>
                    ` : ''}
                    ${processedLog.authenticationContext.credentialType ? `
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 8px; font-weight: 600;">Credential Type:</td>
                        <td style="padding: 8px;">${processedLog.authenticationContext.credentialType}</td>
                    </tr>
                    ` : ''}
                    ${processedLog.authenticationContext.externalSessionId ? `
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 8px; font-weight: 600;">Session ID:</td>
                        <td style="padding: 8px;"><code>${processedLog.authenticationContext.externalSessionId}</code></td>
                    </tr>
                    ` : ''}
                </table>
            </div>
            ` : ''}

            <div class="debug-section">
                <h3>Raw JSON</h3>
                <div class="debug-data">
                    <pre>${JSON.stringify(log, null, 2)}</pre>
                </div>
            </div>
        `;

        debugModalBody.innerHTML = debugContent;
        debugModal.classList.add('active');
    };

    // ========== CSV EXPORT FUNCTIONS ==========

    /**
     * Escape and format a CSV cell value
     * @param {*} value - The value to escape
     * @returns {String} Properly escaped CSV cell value
     */
    function escapeCSVCell(value) {
        // Convert to string and handle null/undefined
        if (value === null || value === undefined) {
            return '';
        }

        let stringValue = String(value);

        // Remove any newlines and replace with spaces
        stringValue = stringValue.replace(/(\r\n|\n|\r)/g, ' ');

        // Escape double quotes by doubling them
        stringValue = stringValue.replace(/"/g, '""');

        // If the value contains comma, quote, or newline, wrap in quotes
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue}"`;
        }

        return `"${stringValue}"`;
    }

    /**
     * Convert array of objects to CSV format
     * @param {Array} headers - Array of header strings
     * @param {Array} rows - Array of row arrays
     * @returns {String} CSV formatted string
     */
    function arrayToCSV(headers, rows) {
        // Build CSV header row
        const csvHeader = headers.map(h => escapeCSVCell(h)).join(',');

        // Build CSV data rows
        const csvRows = rows.map(row =>
            row.map(cell => escapeCSVCell(cell)).join(',')
        );

        // Combine header and rows
        return [csvHeader, ...csvRows].join('\n');
    }

    /**
     * Export current results to CSV with comprehensive data
     * @param {Array} logs - Array of log entries to export
     */
    function exportToCSV(logs) {
        if (!logs || logs.length === 0) {
            alert('No data to export');
            return;
        }

        console.log(`Exporting ${logs.length} events to CSV...`);

        // Define comprehensive CSV headers
        const headers = [
            'Timestamp',
            'Event Type',
            'Outcome',
            'Outcome Reason',
            'Severity',
            'UUID',
            'Actor Name',
            'Actor Email',
            'Actor ID',
            'Actor Type',
            'Target Name',
            'Target Type',
            'Target ID',
            'Browser',
            'OS',
            'Device',
            'IP Address',
            'City',
            'State',
            'Country',
            'Coordinates',
            'Auth Provider',
            'Credential Type',
            'Session ID',
            'ISP',
            'Display Message'
        ];

        // Convert logs to CSV rows
        const rows = logs.map(log => {
            const processed = processLogData(log);
            const target = processed.targets && processed.targets[0];
            const location = processed.location;
            const authContext = processed.authenticationContext;
            const secContext = processed.securityContext;

            return [
                // Timestamp
                processed.published,

                // Event info
                processed.eventType,
                processed.outcome.result,
                processed.outcome.reason || '',
                processed.severity,
                processed.uuid,

                // Actor (User)
                processed.actor.displayName,
                processed.actor.alternateId,
                processed.actor.id,
                processed.actor.type,

                // Target
                target ? target.displayName : '',
                target ? target.type : '',
                target ? target.id : '',

                // Client
                processed.client.browser,
                processed.client.os,
                processed.client.device,
                processed.client.ipAddress,

                // Location
                location.city,
                location.state,
                location.country,
                location.coordinates ? `${location.coordinates.lat}, ${location.coordinates.lon}` : '',

                // Authentication
                authContext ? authContext.authenticationProvider || '' : '',
                authContext ? authContext.credentialType || '' : '',
                authContext ? authContext.externalSessionId || '' : '',

                // Security
                secContext ? secContext.isp || '' : '',

                // Description
                processed.displayMessage
            ];
        });

        // Build CSV content
        const csvContent = arrayToCSV(headers, rows);

        // Create download
        try {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            // Generate filename with user identifier and date range
            const userIdentifier = userIdentifierInput.value.trim().replace(/[^a-zA-Z0-9]/g, '_');
            const startDate = startDateInput.value;
            const endDate = endDateInput.value;
            const filename = `okta_activity_${userIdentifier}_${startDate}_to_${endDate}.csv`;

            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up
            URL.revokeObjectURL(url);

            console.log(`Successfully exported ${rows.length} events to ${filename}`);

            // Show success message
            showStatus(`Successfully exported ${rows.length} events to CSV`, 'success');

        } catch (error) {
            console.error('Failed to export CSV:', error);
            alert('Failed to export CSV. Please try again.');
        }
    }

    /**
     * Export current results to JSON format
     * @param {Array} logs - Array of log entries to export
     */
    function exportToJSON(logs) {
        if (!logs || logs.length === 0) {
            alert('No data to export');
            return;
        }

        console.log(`Exporting ${logs.length} events to JSON...`);

        try {
            // Process all logs
            const processedLogs = logs.map(log => processLogData(log));

            // Create export object
            const exportData = {
                exportDate: new Date().toISOString(),
                userIdentifier: userIdentifierInput.value.trim(),
                dateRange: {
                    start: startDateInput.value,
                    end: endDateInput.value
                },
                statistics: calculateStatistics(logs),
                events: processedLogs
            };

            // Convert to JSON
            const jsonContent = JSON.stringify(exportData, null, 2);

            // Create download
            const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            // Generate filename
            const userIdentifier = userIdentifierInput.value.trim().replace(/[^a-zA-Z0-9]/g, '_');
            const startDate = startDateInput.value;
            const endDate = endDateInput.value;
            const filename = `okta_activity_${userIdentifier}_${startDate}_to_${endDate}.json`;

            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up
            URL.revokeObjectURL(url);

            console.log(`Successfully exported ${logs.length} events to ${filename}`);
            showStatus(`Successfully exported ${logs.length} events to JSON`, 'success');

        } catch (error) {
            console.error('Failed to export JSON:', error);
            alert('Failed to export JSON. Please try again.');
        }
    }

    // Display statistics summary (deprecated - use updateStatistics instead)
    function displayStatistics(stats) {
        const tempDiv = document.createElement('div');
        updateStatistics(stats, tempDiv);
        return tempDiv.innerHTML;
    }

    // Display results in a table (main display function)
    function displayResults(logs, hasMore = false) {
        if (!logs || logs.length === 0) {
            resultsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No activity found for this user in the selected date range.</p>';
            return;
        }

        // Clear container
        resultsContainer.innerHTML = '';

        // Create containers for statistics and table
        const statsDiv = document.createElement('div');
        const tableDiv = document.createElement('div');

        resultsContainer.appendChild(statsDiv);
        resultsContainer.appendChild(tableDiv);

        // Calculate and update statistics
        const stats = calculateStatistics(logs);
        updateStatistics(stats, statsDiv);

        // Populate activity table
        populateActivityTable(logs, tableDiv, hasMore);
    }

    // Handle form submission
    async function handleSearch(event) {
        event.preventDefault();

        if (isLoading) return;

        const userIdentifier = userIdentifierInput.value.trim();
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        // Validation
        if (!userIdentifier) {
            showError('Please enter a user identifier');
            return;
        }

        if (!startDate || !endDate) {
            showError('Please select both start and end dates');
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            showError('Start date must be before end date');
            return;
        }

        // Clear previous results
        currentResults = [];
        nextUrl = null;
        resultsContainer.innerHTML = '';

        // Start search
        isLoading = true;
        searchButton.disabled = true;
        showStatus('<div class="loader"></div> Searching for user activity...', 'loading');

        try {
            const result = await fetchUserActivity(userIdentifier, startDate, endDate);

            currentResults = result.logs;
            nextUrl = result.nextUrl;

            displayResults(currentResults, !!nextUrl);

            if (currentResults.length === 0) {
                showStatus('No activity found', 'info');
            } else {
                showStatus(`Successfully loaded ${currentResults.length} events`, 'success');
            }

        } catch (error) {
            showError('Failed to fetch user activity', error.message);
            console.error('Error fetching user activity:', error);
        } finally {
            isLoading = false;
            searchButton.disabled = false;
        }
    }

    // ========== MODAL INTERACTION HANDLERS ==========

    /**
     * Initialize modal interactions
     */
    function initModalHandlers() {
        // Get modal elements
        debugModal = document.getElementById('debugModal');
        debugModalBody = document.getElementById('debugModalBody');
        closeDebugModalBtn = document.getElementById('closeDebugModalBtn');
        closeDebugModal = document.getElementById('closeDebugModal');
        copyDebugDataBtn = document.getElementById('copyDebugData');

        if (!debugModal) {
            console.warn('Debug modal not found in DOM');
            return;
        }

        // Close button handlers
        const closeModal = () => {
            debugModal.classList.remove('active');
            currentDebugData = null;
        };

        if (closeDebugModalBtn) {
            closeDebugModalBtn.addEventListener('click', closeModal);
        }

        if (closeDebugModal) {
            closeDebugModal.addEventListener('click', closeModal);
        }

        // Close on background click
        debugModal.addEventListener('click', (e) => {
            if (e.target === debugModal) {
                closeModal();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && debugModal.classList.contains('active')) {
                closeModal();
            }
        });

        // Copy debug data handler
        if (copyDebugDataBtn) {
            copyDebugDataBtn.addEventListener('click', async () => {
                if (!currentDebugData) {
                    alert('No debug data available');
                    return;
                }

                try {
                    const jsonString = JSON.stringify(currentDebugData, null, 2);
                    await navigator.clipboard.writeText(jsonString);

                    // Visual feedback
                    const originalText = copyDebugDataBtn.textContent;
                    copyDebugDataBtn.textContent = 'Copied!';
                    copyDebugDataBtn.style.background = '#11998e';

                    setTimeout(() => {
                        copyDebugDataBtn.textContent = originalText;
                        copyDebugDataBtn.style.background = '';
                    }, 2000);
                } catch (error) {
                    console.error('Failed to copy to clipboard:', error);
                    alert('Failed to copy to clipboard. Please try again.');
                }
            });
        }
    }

    // ========== INITIALIZATION ==========

    /**
     * Initialize the application
     */
    function init() {
        // Initialize dates
        initializeDates();

        // Initialize modal handlers
        initModalHandlers();

        // Add form submit handler
        searchForm.addEventListener('submit', handleSearch);

        console.log('User Activity Lookup initialized');
        console.log('- Date range initialized to last 7 days');
        console.log('- Modal handlers initialized');
        console.log('- Ready to search user activity');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
