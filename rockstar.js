(function () {
    // What does rockstar do?
    //   Export Objects to CSV: Users, Groups, Group Members, Directory Users, App Users, App Groups, Apps, App Notes, Network Zones, Admins, etc.
    //   User home page: Show SSO (SAML assertion, etc)
    //   People page: enhanced search
    //   Person page: show login/email and AD info, show user detail, enhance menus/title, manage user's admin roles, verify factor
    //   Groups page: search groups
    //   Events: Expand All and Expand Each Row
    //   API: API Explorer, Pretty Print JSON
    //   Many: enhanced menus
    // and more to come...

    var mainPopup;
    $ = window.$ || window.jQueryCourage;
    const headers = { 'X-Okta-User-Agent-Extended': 'rockstar' };

    const logListPopups = {
        deletedUsers: {
            menuTitle: 'Deleted Users',
            title: "Latest deleted users",
            searchPlaceholder: "Search user...",
            oktaFilter: 'eventType eq "user.lifecycle.delete.completed"',
            backuptaFilterBy: 'type:DELETE;component:USERS'
        },
        deletedGroups: {
            menuTitle: 'Deleted Groups',
            title: "Latest deleted groups",
            searchPlaceholder: "Search group...",
            oktaFilter: 'eventType eq "group.lifecycle.delete"',
            backuptaFilterBy: 'type:DELETE;component:GROUPS'
        },
        deletedApps: {
            menuTitle: 'Deleted Apps',
            title: "Latest deleted apps",
            searchPlaceholder: "Search app...",
            oktaFilter: 'eventType eq "application.lifecycle.delete"',
            backuptaFilterBy: 'type:DELETE;component:APPS'
        },
        deletedIdPs: {
            menuTitle: 'Deleted Identity Providers',
            title: "Latest deleted identity providers",
            searchPlaceholder: "Search IdP...",
            oktaFilter: 'eventType eq "system.idp.lifecycle.delete"',
            backuptaFilterBy: 'type:DELETE;component:IDPS'
        },
        deletedAuthenticatorsOIE: {
            menuTitle: 'Deleted Authenticators',
            title: "Latest deleted authenticators",
            searchPlaceholder: "Search authenticator...",
            oktaFilter: 'eventType eq "security.authenticator.lifecycle.deactivate"',
            backuptaFilterBy: 'type:UPDATE;component:AUTHENTICATORS'
        },
        deletedAuthenticatorsClassic: {
            menuTitle: 'Deleted Multifactor Policies',
            title: "Latest deleted multifactor policies",
            searchPlaceholder: "Search multifactor policies...",
            oktaFilter: 'eventType eq "policy.lifecycle.delete" and target.detailEntry.policyType eq "OktaMfaEnroll"',
            backuptaFilterBy: 'type:DELETE;component:MFA_ENROLL_POLICIES'
        },
        deletedAuthenticationPolicies: {
            menuTitle: 'Deleted Authentication Policies',
            title: "Latest deleted authentication policies",
            searchPlaceholder: "Search policy...",
            oktaFilter: 'eventType eq "policy.lifecycle.delete" and target.detailEntry.policyType eq "Okta:SignOn"',
            backuptaFilterBy: 'type:DELETE;component:AUTHENTICATION_POLICIES'
        },
        deletedGlobalSessionPoliciesOIE: {
            menuTitle: 'Deleted Global Session Policies',
            title: "Latest deleted global session policies",
            searchPlaceholder: "Search policy...",
            oktaFilter: 'eventType eq "policy.lifecycle.delete" and target.detailEntry.policyType eq "OktaSignOn"',
            backuptaFilterBy: 'type:DELETE;component:SIGN_ON_POLICIES'
        },
        deletedGlobalSessionPoliciesClassic: {
            menuTitle: 'Deleted Authentication Policies',
            title: "Latest deleted authentication policies",
            searchPlaceholder: "Search policy...",
            oktaFilter: 'eventType eq "policy.lifecycle.delete" and (target.detailEntry.policyType eq "Password" or target.detailEntry.policyType eq "OktaSignOn")',
            backuptaFilterBy: 'type:DELETE;component:PASSWORD_POLICIES,SIGN_ON_POLICIES'
        },
        deletedProfileEnrollments: {
            menuTitle: 'Deleted Profile Enrollments',
            title: "Latest deleted profile enrollments",
            searchPlaceholder: "Search profile enrollments...",
            oktaFilter: 'eventType eq "policy.lifecycle.delete" and target.detailEntry.policyType eq "Okta:ProfileEnrollment"',
            backuptaFilterBy: 'type:DELETE;component:PROFILE_ENROLLMENT_POLICIES'
        },
        deletedNetworks: {
            menuTitle: 'Deleted Networks',
            title: "Latest deleted networks",
            searchPlaceholder: "Search network...",
            oktaFilter: 'eventType eq "zone.delete"',
            backuptaFilterBy: 'type:DELETE;component:NETWORK_ZONES'
        },
        deletedAPIAuthorizationServers: {
            menuTitle: 'Deleted API Authorization Servers',
            title: "Latest deleted API authorization servers",
            searchPlaceholder: "Search server...",
            oktaFilter: 'eventType eq "oauth2.as.deleted"',
            backuptaFilterBy: 'type:DELETE;component:AUTHORIZATION_SERVERS'
        },
        deletedWorkflowInlineHooks: {
            menuTitle: 'Deleted Workflow Inline Hooks',
            title: "Latest deleted workflow inline hooks",
            searchPlaceholder: "Search hook...",
            oktaFilter: 'eventType eq "inline_hook.deleted"',
            backuptaFilterBy: 'type:DELETE;component:INLINE_HOOKS'
        },
        deletedWorkflowEventHooks: {
            menuTitle: 'Deleted Workflow Event Hooks',
            title: "Latest deleted workflow event hooks",
            searchPlaceholder: "Search hook...",
            oktaFilter: 'eventType eq "event_hook.deleted"',
            backuptaFilterBy: 'type:DELETE;component:EVENT_HOOKS'
        }
    };

    if (location.href == "https://gabrielsroka.github.io/rockstar/") {
        alert("To install rockstar, open your bookmark toolbar, then drag and drop it. To use it, login to Okta or Okta Admin, then click rockstar. See the Usage instructions on this page.");
        return;
    }
    if (location.pathname.match("^/(api|oauth2|\\.well-known)/")) {
        formatJSON();
    } else if (location.host.match(/-admin/)) { // Admin pages
        mainPopup = createPopup("rockstar", true);
        quickUpdate();
        if (location.pathname == "/admin/users") {
            directoryPeople();
        } else if (location.pathname.match("/admin/user/")) {
            directoryPerson();
        } else if (location.pathname == "/admin/groups") {
            directoryGroups();
        } else if (location.pathname == "/admin/access/admins") {
            securityAdministrators();
        } else if (location.pathname.match("/report/system_log_2")) {
            systemLog();
        } else if (location.pathname.match("/admin/app/active_directory")) {
            activeDirectory();
        } else if (location.pathname == "/admin/access/identity-providers") {
            identityProviders();
        } else if (location.pathname.match(/\/admin\/app\/[^/]+\/instance\/[^/]+/)) {
            appInstance();
        }

        var count = 0;
        const intervalID = setInterval(() => { // new admin
            if (count++ == 25) clearInterval(intervalID);
            if (!document.querySelector('[data-se=o-side-nav-item-APPLICATIONS] ul')) return;
            $("<li><a class='nav-item--wrapper' href='/admin/groups#rules'><p class='nav-item--label'>Group Rules</p></a>").appendTo('[data-se=o-side-nav-item-DIRECTORY] ul');
            $("<li><a class='nav-item--wrapper' href='/admin/apps/add-app'><p class='nav-item--label'>Integration Network</p></a>").appendTo('[data-se=o-side-nav-item-APPLICATIONS] ul');
            $("<li><a class='nav-item--wrapper' href='/admin/access/api/tokens'><p class='nav-item--label'>API Tokens</p></a>").appendTo('[data-se=o-side-nav-item-SECURITY] ul');
            clearInterval(intervalID);
        }, 200);
        exportObjects();
        //createPrefixA("<li>", "Export Objects", "#nav-admin-reports-2", exportObjects);

        if (location.pathname == "/admin/users") {
            openLogList('deletedUsers');
        } else if (location.pathname == "/admin/groups") {
            openLogList('deletedGroups');
        } else if (location.pathname == "/admin/apps/active") {
            openLogList('deletedApps');
        } else if (location.pathname == "/admin/access/identity-providers") {
            openLogList('deletedIdPs');
        } else if (location.pathname == "/admin/access/multifactor") {
            isOIE().then(isOIE => {
                if (isOIE) {
                    openLogList('deletedAuthenticatorsOIE');
                } else {
                    openLogList('deletedAuthenticatorsClassic');
                }
            })
        } else if (location.pathname == "/admin/authn/authentication-policies") {
            openLogList('deletedAuthenticationPolicies');
        } else if (location.pathname == "/admin/access/policies") {
            isOIE().then(isOIE => {
                if (isOIE) {
                    openLogList('deletedGlobalSessionPoliciesOIE');
                } else {
                    openLogList('deletedGlobalSessionPoliciesClassic');
                }
            })
        } else if (location.pathname == "/admin/authn/policies") {
            openLogList('deletedProfileEnrollments');
        } else if (location.pathname == "/admin/access/networks") {
            openLogList('deletedNetworks');
        } else if (location.pathname == "/admin/oauth2/as") {
            openLogList('deletedAPIAuthorizationServers');
        } else if (location.pathname == "/admin/workflow/inlinehooks") {
            openLogList('deletedWorkflowInlineHooks');
        } else if (location.pathname == "/admin/workflow/eventhooks") {
            openLogList('deletedWorkflowEventHooks');
        }

        apiExplorer();
    } else if (location.pathname == "/app/UserHome") { // User home page (non-admin)
        mainPopup = createPopup("rockstar", true);
        quickUpdate();
        userHome();
        //} else if (location.host == "developer.okta.com" && location.pathname.startsWith("/docs/reference/api/")) {
        //    tryAPI();
    }

    function whatsNew() {
        const newsPopup = createPopup("What's New");
        $(`<h1 style='padding: 5px'>2024-06-11</h1>`).appendTo(newsPopup);
        $(`<div style='padding: 5px'>` +
            `• See Deleted Users, Apps, and Groups.<br/>` +
            `• Restore Deleted Users, Apps, and Groups with Backupta.` +
            `</div>`).appendTo(newsPopup);
    }

    function quickUpdate() {
        $(`<a href='https://www.youtube.com/watch?v=mNTThKVjztc&list=PLZ4_Rj_Aw2Ym-NkC8SFB6wuSfBiBto_6C' target='_blank' rel='noopener'>rockstar overview (youtube)</a><br><br>`).appendTo(mainPopup);

        // Only show user-related features on admin user pages
        if (location.pathname.match("/admin/user")) {
            createDiv("User Activity Lookup", mainPopup, userActivityLookup);
            createDiv("User Comparison", mainPopup, userComparison);
        }
    }

    // User Activity Lookup function
    function userActivityLookup() {
        const popup = createPopup("User Activity Lookup");

        // Request tracking to prevent concurrent requests
        let requestInProgress = false;

        // Create search form
        const searchForm = $(`
            <div style='padding: 10px;'>
                <div style='margin-bottom: 15px;'>
                    <label style='display: block; margin-bottom: 5px; font-weight: 600;'>User Identifier (username, email, or user ID)</label>
                    <input type='text' id='activityUserIdentifier' style='width: 100%; padding: 8px;' placeholder='e.g., john.doe@example.com'>
                </div>
                <div style='display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;'>
                    <div>
                        <label style='display: block; margin-bottom: 5px; font-weight: 600;'>Start Date</label>
                        <input type='date' id='activityStartDate' style='width: 100%; padding: 8px;'>
                    </div>
                    <div>
                        <label style='display: block; margin-bottom: 5px; font-weight: 600;'>End Date</label>
                        <input type='date' id='activityEndDate' style='width: 100%; padding: 8px;'>
                    </div>
                </div>
                <button id='activitySearchBtn' class='button-primary' style='width: 100%; padding: 10px;'>Search Activity</button>
                <div id='activityStatus' style='margin-top: 15px;'></div>
                <div id='activityResults' style='margin-top: 15px;'></div>
            </div>
        `).appendTo(popup);

        // Initialize dates (last 7 days)
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        $('#activityEndDate').val(today.toISOString().split('T')[0]);
        $('#activityStartDate').val(sevenDaysAgo.toISOString().split('T')[0]);

        // Auto-populate user identifier if on a user profile page
        if (location.pathname.match("/admin/user/")) {
            const userId = location.pathname.split("/")[5];
            if (userId) {
                $('#activityStatus').html('<div style="color: #1976d2; padding: 10px; background: #e3f2fd; border-radius: 4px;">Loading user information...</div>');
                getJSON(`/api/v1/users/${userId}`).then(user => {
                    const userIdentifier = user.profile.login || user.profile.email || userId;
                    $('#activityUserIdentifier').val(userIdentifier);
                    $('#activityStatus').html(`<div style="color: #2e7d32; padding: 10px; background: #e8f5e9; border-radius: 4px;">Auto-populated: ${e(user.profile.firstName)} ${e(user.profile.lastName)} (${e(userIdentifier)})</div>`);
                    // Focus on the search button for easy activation
                    $('#activitySearchBtn').focus();
                }).fail(() => {
                    $('#activityStatus').html('');
                });
            }
        }

        // Search button handler
        $('#activitySearchBtn').click(async function () {
            // Prevent concurrent requests
            if (requestInProgress) {
                $('#activityStatus').html('<div style="color: #f57c00; padding: 10px; background: #fff3e0; border-radius: 4px;">Please wait, a request is already in progress...</div>');
                return;
            }

            const userIdentifier = $('#activityUserIdentifier').val().trim();
            const startDate = $('#activityStartDate').val();
            const endDate = $('#activityEndDate').val();

            if (!userIdentifier) {
                $('#activityStatus').html('<div style="color: #c62828; padding: 10px; background: #ffebee; border-radius: 4px;">Please enter a user identifier</div>');
                return;
            }

            if (!startDate || !endDate) {
                $('#activityStatus').html('<div style="color: #c62828; padding: 10px; background: #ffebee; border-radius: 4px;">Please select both start and end dates</div>');
                return;
            }

            if (new Date(startDate) > new Date(endDate)) {
                $('#activityStatus').html('<div style="color: #c62828; padding: 10px; background: #ffebee; border-radius: 4px;">Start date must be before end date</div>');
                return;
            }

            await searchUserActivity(userIdentifier, startDate, endDate);
        });

        async function searchUserActivity(userIdentifier, startDate, endDate) {
            // Set request flag to prevent concurrent requests
            requestInProgress = true;
            $('#activitySearchBtn').prop('disabled', true);
            $('#activityStatus').html('<div style="color: #1976d2; padding: 10px; background: #e3f2fd; border-radius: 4px;">Searching for user activity...</div>');
            $('#activityResults').html('');

            try {
                // Convert dates to ISO 8601
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);

                const sinceISO = start.toISOString();
                const untilISO = end.toISOString();

                // Build filter
                const filter = `actor.alternateId eq "${userIdentifier}" or actor.id eq "${userIdentifier}"`;
                const url = `${location.origin}/api/v1/logs?since=${encodeURIComponent(sinceISO)}&until=${encodeURIComponent(untilISO)}&filter=${encodeURIComponent(filter)}&sortOrder=DESCENDING&limit=100`;

                // Add small delay to prevent rate limiting
                await new Promise(resolve => setTimeout(resolve, 300));

                const response = await fetch(url, {
                    method: 'GET',
                    headers: headers,
                    credentials: 'same-origin'
                });

                if (!response.ok) {
                    // Handle rate limiting specifically
                    if (response.status === 429) {
                        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const logs = await response.json();

                if (logs.length === 0) {
                    $('#activityStatus').html('<div style="color: #666; padding: 10px; background: #f5f5f5; border-radius: 4px;">No activity found for this user in the selected date range.</div>');
                    return;
                }

                displayActivityResults(logs);
                $('#activityStatus').html(`<div style="color: #2e7d32; padding: 10px; background: #e8f5e9; border-radius: 4px;">Successfully loaded ${logs.length} events</div>`);

            } catch (error) {
                $('#activityStatus').html(`<div style="color: #c62828; padding: 10px; background: #ffebee; border-radius: 4px;"><strong>Error:</strong> ${e(error.message)}</div>`);
                console.error('Error fetching user activity:', error);
            } finally {
                // Always reset request flag and re-enable button
                requestInProgress = false;
                $('#activitySearchBtn').prop('disabled', false);
            }
        }

        function displayActivityResults(logs) {
            // Calculate statistics
            let successCount = 0;
            let failureCount = 0;
            const eventTypes = {};
            const apps = new Set();
            const locations = new Set();
            const ips = new Set();

            // Detailed data for clickable stats
            const appDetails = [];
            const locationDetails = [];
            const ipDetails = new Map(); // ip -> {location, timestamps[]}
            const failedDetails = []; // Failed events with details

            logs.forEach(log => {
                const outcome = log.outcome?.result?.toLowerCase();
                if (outcome === 'success') successCount++;
                else if (outcome === 'failure') {
                    failureCount++;

                    // Collect detailed failure information
                    const timestamp = new Date(log.published);
                    const reason = log.outcome?.reason || 'Unknown';
                    const eventType = log.eventType || 'unknown';
                    const displayMessage = log.displayMessage || '';

                    // Extract authenticator or policy info from targets
                    let targetInfo = '';
                    let policyName = '';
                    let authenticatorName = '';

                    if (log.target) {
                        log.target.forEach(target => {
                            if (target.type === 'AuthenticatorEnrollment' || target.type === 'AuthenticatorMethod') {
                                authenticatorName = target.displayName || '';
                                if (target.detailEntry?.methodTypeUsed) {
                                    authenticatorName += ` (${target.detailEntry.methodTypeUsed})`;
                                }
                            } else if (target.type === 'Policy') {
                                policyName = target.displayName || '';
                                if (target.detailEntry?.policyType) {
                                    policyName += ` [${target.detailEntry.policyType}]`;
                                }
                            } else if (target.type === 'AppInstance') {
                                targetInfo = target.displayName || '';
                            }
                        });
                    }

                    // Get factor from debugContext if available
                    const factor = log.debugContext?.debugData?.factor || '';

                    // Build detail string
                    let details = '';
                    if (policyName) {
                        details = `Policy: ${policyName}`;
                    } else if (authenticatorName) {
                        details = authenticatorName;
                    } else if (factor) {
                        details = `Factor: ${factor}`;
                    } else if (targetInfo) {
                        details = `App: ${targetInfo}`;
                    } else if (displayMessage) {
                        details = displayMessage;
                    }

                    failedDetails.push({
                        timestamp: timestamp,
                        date: timestamp.toLocaleDateString(),
                        time: timestamp.toLocaleTimeString(),
                        eventType: eventType,
                        reason: reason,
                        details: details,
                        policyName: policyName,
                        authenticatorName: authenticatorName,
                        factor: factor,
                        displayMessage: displayMessage
                    });
                }

                const eventType = log.eventType || 'unknown';
                eventTypes[eventType] = (eventTypes[eventType] || 0) + 1;

                const timestamp = new Date(log.published);

                if (log.target) {
                    log.target.forEach(target => {
                        // Only count AppInstance (actual applications), not AppUser or User objects
                        if (target.type === 'AppInstance' && target.displayName) {
                            apps.add(target.displayName);
                            appDetails.push({
                                name: target.displayName,
                                appId: target.id, // Store app ID for fetching details later
                                timestamp: timestamp,
                                date: timestamp.toLocaleDateString(),
                                time: timestamp.toLocaleTimeString()
                            });
                        }
                    });
                }

                // Extract location from client.geographicalContext and request.ipChain
                const clientGeo = log.client?.geographicalContext;
                const requestGeo = log.request?.ipChain?.[0]?.geographicalContext;

                if (clientGeo || requestGeo) {
                    const city = clientGeo?.city || requestGeo?.city || 'Unknown';
                    const state = requestGeo?.state || clientGeo?.state || '';
                    const country = clientGeo?.country || requestGeo?.country || '';

                    if (city !== 'Unknown') {
                        const loc = `${city}${state ? ', ' + state : ''}${country ? ', ' + country : ''}`;
                        locations.add(loc);
                        locationDetails.push({
                            location: loc,
                            timestamp: timestamp,
                            date: timestamp.toLocaleDateString(),
                            time: timestamp.toLocaleTimeString()
                        });
                    }
                }

                if (log.client && log.client.ipAddress) {
                    const ip = log.client.ipAddress;
                    ips.add(ip);

                    // Get location for this IP
                    const city = clientGeo?.city || requestGeo?.city || 'Unknown';
                    const state = requestGeo?.state || clientGeo?.state || '';
                    const country = clientGeo?.country || requestGeo?.country || '';
                    const loc = city !== 'Unknown' ? `${city}${state ? ', ' + state : ''}${country ? ', ' + country : ''}` : 'Unknown';

                    if (!ipDetails.has(ip)) {
                        ipDetails.set(ip, {
                            ip: ip,
                            location: loc,
                            timestamps: []
                        });
                    }
                    ipDetails.get(ip).timestamps.push({
                        timestamp: timestamp,
                        date: timestamp.toLocaleDateString(),
                        time: timestamp.toLocaleTimeString()
                    });
                }
            });

            const successRate = logs.length > 0 ? ((successCount / logs.length) * 100).toFixed(1) : 0;
            const failureRate = logs.length > 0 ? ((failureCount / logs.length) * 100).toFixed(1) : 0;

            // Build statistics HTML
            let statsHTML = `
                <div style='display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px;'>
                    <div style='background: #667eea; color: white; padding: 15px; border-radius: 6px; text-align: center;'>
                        <div style='font-size: 1.5em; font-weight: bold;'>${logs.length}</div>
                        <div style='font-size: 0.85em; opacity: 0.9;'>Total Events</div>
                    </div>
                    <div style='background: #2e7d32; color: white; padding: 15px; border-radius: 6px; text-align: center;'>
                        <div style='font-size: 1.5em; font-weight: bold;'>${successCount}</div>
                        <div style='font-size: 0.85em; opacity: 0.9;'>Success (${successRate}%)</div>
                    </div>
                    <div id='failedStatCard' style='background: #d32f2f; color: white; padding: 15px; border-radius: 6px; text-align: center; cursor: pointer; transition: opacity 0.2s;' onmouseover='this.style.opacity=0.85' onmouseout='this.style.opacity=1'>
                        <div style='font-size: 1.5em; font-weight: bold;'>${failureCount}</div>
                        <div style='font-size: 0.85em; opacity: 0.9;'>Failed (${failureRate}%)</div>
                    </div>
                </div>
                <div style='display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px;'>
                    <div id='appsStatCard' style='background: #667eea; color: white; padding: 15px; border-radius: 6px; text-align: center; cursor: pointer; transition: opacity 0.2s;' onmouseover='this.style.opacity=0.85' onmouseout='this.style.opacity=1'>
                        <div style='font-size: 1.5em; font-weight: bold;'>${apps.size}</div>
                        <div style='font-size: 0.85em; opacity: 0.9;'>Unique Apps</div>
                    </div>
                    <div id='locationsStatCard' style='background: #667eea; color: white; padding: 15px; border-radius: 6px; text-align: center; cursor: pointer; transition: opacity 0.2s;' onmouseover='this.style.opacity=0.85' onmouseout='this.style.opacity=1'>
                        <div style='font-size: 1.5em; font-weight: bold;'>${locations.size}</div>
                        <div style='font-size: 0.85em; opacity: 0.9;'>Locations</div>
                    </div>
                    <div id='ipsStatCard' style='background: #667eea; color: white; padding: 15px; border-radius: 6px; text-align: center; cursor: pointer; transition: opacity 0.2s;' onmouseover='this.style.opacity=0.85' onmouseout='this.style.opacity=1'>
                        <div style='font-size: 1.5em; font-weight: bold;'>${ips.size}</div>
                        <div style='font-size: 0.85em; opacity: 0.9;'>IP Addresses</div>
                    </div>
                </div>
            `;

            // Build table HTML
            let tableHTML = `
                <table class='data-list-table' style='border: 1px solid #ddd; width: 100%; font-size: 0.9em;'>
                    <thead>
                        <tr style='background: #667eea; color: white;'>
                            <th style='padding: 8px;'>Timestamp</th>
                            <th style='padding: 8px;'>Event Type</th>
                            <th style='padding: 8px;'>Outcome</th>
                            <th style='padding: 8px;'>IP Address</th>
                            <th style='padding: 8px;'>Location</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            logs.forEach(log => {
                const timestamp = new Date(log.published).toLocaleString();
                const eventType = log.eventType || 'Unknown';
                const outcome = log.outcome?.result || 'N/A';
                const outcomeColor = outcome.toLowerCase() === 'success' ? '#2e7d32' : outcome.toLowerCase() === 'failure' ? '#c62828' : '#666';
                const ipAddress = log.client?.ipAddress || 'Unknown';

                // Extract location from both client and request.ipChain (state is usually in ipChain)
                const clientGeo = log.client?.geographicalContext;
                const requestGeo = log.request?.ipChain?.[0]?.geographicalContext;
                const city = clientGeo?.city || requestGeo?.city || 'Unknown';
                const state = requestGeo?.state || clientGeo?.state || '';
                const country = clientGeo?.country || requestGeo?.country || '';
                const location = `${city}${state ? ', ' + state : ''}${country ? ', ' + country : ''}`;

                tableHTML += `
                    <tr>
                        <td style='padding: 8px; white-space: nowrap;'>${timestamp}</td>
                        <td style='padding: 8px;'><code style='font-size: 0.85em;'>${e(eventType)}</code></td>
                        <td style='padding: 8px;'><span style='color: ${outcomeColor}; font-weight: 600;'>${e(outcome)}</span></td>
                        <td style='padding: 8px;'><code>${e(ipAddress)}</code></td>
                        <td style='padding: 8px;'>${e(location)}</td>
                    </tr>
                `;
            });

            tableHTML += '</tbody></table>';

            $('#activityResults').html(statsHTML + tableHTML);

            // Add click handlers for stat cards
            $('#appsStatCard').click(function () {
                showAppsDetail(appDetails);
            });

            $('#locationsStatCard').click(function () {
                showLocationsDetail(locationDetails);
            });

            $('#ipsStatCard').click(function () {
                showIPsDetail(ipDetails);
            });

            $('#failedStatCard').click(function () {
                showFailedEventsDetail(failedDetails);
            });
        }

        // Show detailed app data
        async function showAppsDetail(appDetails) {
            const detailPopup = createPopup("Applications");

            // Show loading message
            $(detailPopup).append('<div id="appsLoadingMsg" style="padding: 20px; text-align: center; color: #1976d2;">Loading application details...</div>');

            // Fetch app details for unique app IDs
            const uniqueAppIds = [...new Set(appDetails.map(a => a.appId).filter(id => id))];
            const appTypesMap = new Map();

            try {
                // Fetch app details in parallel (but limit to avoid rate limiting)
                const chunkSize = 5;
                for (let i = 0; i < uniqueAppIds.length; i += chunkSize) {
                    const chunk = uniqueAppIds.slice(i, i + chunkSize);
                    await Promise.all(chunk.map(async (appId) => {
                        try {
                            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
                            const response = await fetch(`${location.origin}/api/v1/apps/${appId}`, {
                                method: 'GET',
                                headers: headers,
                                credentials: 'same-origin'
                            });
                            if (response.ok) {
                                const app = await response.json();
                                const signOnMode = app.signOnMode || 'UNKNOWN';
                                const typeMap = {
                                    'SAML_2_0': 'SAML 2.0',
                                    'SAML_1_1': 'SAML 1.1',
                                    'OPENID_CONNECT': 'OIDC',
                                    'SECURE_PASSWORD_STORE': 'SWA',
                                    'AUTO_LOGIN': 'Auto Login',
                                    'BOOKMARK': 'Bookmark',
                                    'BROWSER_PLUGIN': 'Browser Plugin',
                                    'WS_FEDERATION': 'WS-Federation',
                                    'BASIC_AUTH': 'Basic Auth'
                                };
                                appTypesMap.set(appId, typeMap[signOnMode] || signOnMode);
                            }
                        } catch (err) {
                            console.error(`Failed to fetch app ${appId}:`, err);
                        }
                    }));
                }
            } catch (error) {
                console.error('Error fetching app details:', error);
            }

            // Add app types to appDetails
            appDetails.forEach(app => {
                app.type = appTypesMap.get(app.appId) || 'Unknown';
            });

            // Remove loading message
            $('#appsLoadingMsg').remove();

            // Add toggle for unique/all view
            const toggleHTML = `
                <div style='padding: 10px; border-bottom: 1px solid #ddd;'>
                    <label style='display: flex; align-items: center; gap: 8px; cursor: pointer;'>
                        <input type='checkbox' id='appsShowUniqueToggle' style='cursor: pointer;'>
                        <span style='font-weight: 600;'>Show unique applications only</span>
                    </label>
                </div>
            `;
            $(detailPopup).append(toggleHTML);

            // Container for the table
            const tableContainer = $('<div id="appsTableContainer"></div>').appendTo(detailPopup);

            // Function to render the table
            function renderAppsTable(showUniqueOnly) {
                let data;
                let columns;

                if (showUniqueOnly) {
                    // Get unique apps with count and type
                    const appMap = {};
                    appDetails.forEach(app => {
                        if (!appMap[app.name]) {
                            appMap[app.name] = {
                                name: app.name,
                                type: app.type,
                                count: 0
                            };
                        }
                        appMap[app.name].count++;
                    });

                    data = Object.values(appMap).sort((a, b) => a.name.localeCompare(b.name));

                    columns = `
                        <th style='padding: 8px;'>Application Name</th>
                        <th style='padding: 8px;'>Type</th>
                        <th style='padding: 8px; text-align: center;'>Access Count</th>
                    `;
                } else {
                    // Show all activities with timestamps
                    data = appDetails.sort((a, b) => {
                        const nameCompare = a.name.localeCompare(b.name);
                        if (nameCompare !== 0) return nameCompare;
                        return b.timestamp - a.timestamp;
                    });

                    columns = `
                        <th style='padding: 8px;'>Application Name</th>
                        <th style='padding: 8px;'>Type</th>
                        <th style='padding: 8px;'>Date</th>
                        <th style='padding: 8px;'>Time</th>
                    `;
                }

                let tableHTML = `
                    <div style='padding: 10px; max-height: 500px; overflow-y: auto;'>
                        <table class='data-list-table' style='border: 1px solid #ddd; width: 100%; font-size: 0.9em;'>
                            <thead>
                                <tr style='background: #667eea; color: white;'>
                                    ${columns}
                                </tr>
                            </thead>
                            <tbody>
                `;

                if (showUniqueOnly) {
                    data.forEach(app => {
                        tableHTML += `
                            <tr>
                                <td style='padding: 8px;'>${e(app.name)}</td>
                                <td style='padding: 8px;'><span style='background: #e0e0e0; padding: 2px 8px; border-radius: 3px; font-size: 0.85em;'>${e(app.type)}</span></td>
                                <td style='padding: 8px; text-align: center;'>${app.count}</td>
                            </tr>
                        `;
                    });
                } else {
                    data.forEach(app => {
                        tableHTML += `
                            <tr>
                                <td style='padding: 8px;'>${e(app.name)}</td>
                                <td style='padding: 8px;'><span style='background: #e0e0e0; padding: 2px 8px; border-radius: 3px; font-size: 0.85em;'>${e(app.type)}</span></td>
                                <td style='padding: 8px;'>${e(app.date)}</td>
                                <td style='padding: 8px;'>${e(app.time)}</td>
                            </tr>
                        `;
                    });
                }

                tableHTML += `
                            </tbody>
                        </table>
                    </div>
                `;

                tableContainer.html(tableHTML);
            }

            // Initial render (show all)
            renderAppsTable(false);

            // Toggle handler
            $('#appsShowUniqueToggle').change(function () {
                renderAppsTable(this.checked);
            });
        }

        // Show detailed location data
        function showLocationsDetail(locationDetails) {
            const detailPopup = createPopup("Locations");

            // Sort by location and timestamp
            const sortedLocations = locationDetails.sort((a, b) => {
                const locCompare = a.location.localeCompare(b.location);
                if (locCompare !== 0) return locCompare;
                return b.timestamp - a.timestamp;
            });

            let tableHTML = `
                <div style='padding: 10px; max-height: 500px; overflow-y: auto;'>
                    <table class='data-list-table' style='border: 1px solid #ddd; width: 100%; font-size: 0.9em;'>
                        <thead>
                            <tr style='background: #667eea; color: white;'>
                                <th style='padding: 8px;'>Location</th>
                                <th style='padding: 8px;'>Date</th>
                                <th style='padding: 8px;'>Time</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            sortedLocations.forEach(loc => {
                tableHTML += `
                    <tr>
                        <td style='padding: 8px;'>${e(loc.location)}</td>
                        <td style='padding: 8px;'>${e(loc.date)}</td>
                        <td style='padding: 8px;'>${e(loc.time)}</td>
                    </tr>
                `;
            });

            tableHTML += `
                        </tbody>
                    </table>
                </div>
            `;

            $(detailPopup).append(tableHTML);
        }

        // Show detailed IP data
        function showIPsDetail(ipDetails) {
            const detailPopup = createPopup("IP Addresses");

            // Convert Map to array and sort by IP
            const sortedIPs = Array.from(ipDetails.values()).sort((a, b) => {
                return a.ip.localeCompare(b.ip);
            });

            let tableHTML = `
                <div style='padding: 10px; max-height: 500px; overflow-y: auto;'>
                    <table class='data-list-table' style='border: 1px solid #ddd; width: 100%; font-size: 0.9em;'>
                        <thead>
                            <tr style='background: #667eea; color: white;'>
                                <th style='padding: 8px;'>IP Address</th>
                                <th style='padding: 8px;'>Location</th>
                                <th style='padding: 8px;'>Access Count</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            sortedIPs.forEach(ipData => {
                tableHTML += `
                    <tr>
                        <td style='padding: 8px;'><code>${e(ipData.ip)}</code></td>
                        <td style='padding: 8px;'>${e(ipData.location)}</td>
                        <td style='padding: 8px; text-align: center;'>${ipData.timestamps.length}</td>
                    </tr>
                `;
            });

            tableHTML += `
                        </tbody>
                    </table>
                </div>
            `;

            $(detailPopup).append(tableHTML);
        }

        // Show detailed failed events data
        function showFailedEventsDetail(failedDetails) {
            const detailPopup = createPopup("Failed Events");

            if (failedDetails.length === 0) {
                $(detailPopup).append('<div style="padding: 20px; text-align: center; color: #666;">No failed events to display.</div>');
                return;
            }

            // Group failures by reason
            const reasonGroups = {};
            failedDetails.forEach(f => {
                const reason = f.reason || 'Unknown';
                if (!reasonGroups[reason]) {
                    reasonGroups[reason] = [];
                }
                reasonGroups[reason].push(f);
            });

            // Build summary cards
            let summaryHTML = `
                <div style='padding: 10px;'>
                    <h4 style='margin: 0 0 10px 0; color: #d32f2f;'>Failure Summary by Reason</h4>
                    <div style='display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px;'>
            `;

            Object.entries(reasonGroups).sort((a, b) => b[1].length - a[1].length).forEach(([reason, events]) => {
                summaryHTML += `
                    <div style='background: #ffebee; color: #c62828; padding: 8px 12px; border-radius: 4px; font-size: 0.85em;'>
                        <strong>${e(reason)}</strong>: ${events.length}
                    </div>
                `;
            });

            summaryHTML += `
                    </div>
                </div>
            `;

            // Build table HTML
            let tableHTML = `
                <div style='padding: 10px; max-height: 400px; overflow-y: auto;'>
                    <table class='data-list-table' style='border: 1px solid #ddd; width: 100%; font-size: 0.85em;'>
                        <thead>
                            <tr style='background: #d32f2f; color: white;'>
                                <th style='padding: 8px;'>Timestamp</th>
                                <th style='padding: 8px;'>Event Type</th>
                                <th style='padding: 8px;'>Reason</th>
                                <th style='padding: 8px;'>Details</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            // Sort by timestamp descending
            const sortedFailures = failedDetails.sort((a, b) => b.timestamp - a.timestamp);

            sortedFailures.forEach(f => {
                // Format reason for display
                let reasonDisplay = f.reason;
                let reasonColor = '#c62828';

                // Categorize and color-code reasons
                if (f.reason === 'INVALID_CREDENTIALS') {
                    reasonDisplay = 'Invalid Credentials';
                } else if (f.reason.includes('POLICY') || f.reason.includes('DENY')) {
                    reasonDisplay = f.reason;
                    reasonColor = '#e65100'; // Orange for policy issues
                } else if (f.reason.includes('MFA') || f.reason.includes('FACTOR')) {
                    reasonDisplay = f.reason;
                    reasonColor = '#7b1fa2'; // Purple for MFA issues
                }

                tableHTML += `
                    <tr>
                        <td style='padding: 8px; white-space: nowrap;'>${e(f.date)} ${e(f.time)}</td>
                        <td style='padding: 8px;'><code style='font-size: 0.85em;'>${e(f.eventType)}</code></td>
                        <td style='padding: 8px;'><span style='color: ${reasonColor}; font-weight: 600;'>${e(reasonDisplay)}</span></td>
                        <td style='padding: 8px;'>${e(f.details) || '<span style="color: #999;">-</span>'}</td>
                    </tr>
                `;
            });

            tableHTML += `
                        </tbody>
                    </table>
                </div>
            `;

            $(detailPopup).append(summaryHTML + tableHTML);
        }
    }

    // User Comparison function
    function userComparison() {
        const popup = createPopup("User Comparison");

        // Request tracking to prevent concurrent requests
        let requestInProgress = false;

        // Create comparison form
        const comparisonForm = $(`
            <div style='padding: 10px;'>
                <div style='display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;'>
                    <div>
                        <label style='display: block; margin-bottom: 5px; font-weight: 600;'>User 1 (email or username)</label>
                        <input type='text' id='compareUser1' style='width: 100%; padding: 8px;' placeholder='e.g., john.doe@example.com'>
                    </div>
                    <div>
                        <label style='display: block; margin-bottom: 5px; font-weight: 600;'>User 2 (email or username)</label>
                        <input type='text' id='compareUser2' style='width: 100%; padding: 8px;' placeholder='e.g., jane.smith@example.com'>
                    </div>
                </div>
                <button id='compareBtn' class='button-primary' style='width: 100%; padding: 10px;'>Compare Users</button>
                <div id='compareStatus' style='margin-top: 15px;'></div>
                <div id='compareResults' style='margin-top: 15px;'></div>
            </div>
        `).appendTo(popup);

        // Compare button handler
        $('#compareBtn').click(async function () {
            // Prevent concurrent requests
            if (requestInProgress) {
                $('#compareStatus').html('<div style="color: #f57c00; padding: 10px; background: #fff3e0; border-radius: 4px;">Please wait, a comparison is already in progress...</div>');
                return;
            }

            const user1Identifier = $('#compareUser1').val().trim();
            const user2Identifier = $('#compareUser2').val().trim();

            if (!user1Identifier || !user2Identifier) {
                $('#compareStatus').html('<div style="color: #c62828; padding: 10px; background: #ffebee; border-radius: 4px;">Please enter both user identifiers</div>');
                return;
            }

            if (user1Identifier === user2Identifier) {
                $('#compareStatus').html('<div style="color: #c62828; padding: 10px; background: #ffebee; border-radius: 4px;">Please enter two different users</div>');
                return;
            }

            await compareUsers(user1Identifier, user2Identifier);
        });

        async function compareUsers(user1Id, user2Id) {
            requestInProgress = true;
            $('#compareBtn').prop('disabled', true);
            $('#compareStatus').html('<div style="color: #1976d2; padding: 10px; background: #e3f2fd; border-radius: 4px;">Fetching user data...</div>');
            $('#compareResults').html('');

            try {
                // Add delay to prevent rate limiting
                await new Promise(resolve => setTimeout(resolve, 300));

                // Fetch both users
                const [user1Response, user2Response] = await Promise.all([
                    fetch(`${location.origin}/api/v1/users/${encodeURIComponent(user1Id)}`, {
                        method: 'GET',
                        headers: headers,
                        credentials: 'same-origin'
                    }),
                    fetch(`${location.origin}/api/v1/users/${encodeURIComponent(user2Id)}`, {
                        method: 'GET',
                        headers: headers,
                        credentials: 'same-origin'
                    })
                ]);

                if (!user1Response.ok || !user2Response.ok) {
                    if (!user1Response.ok && !user2Response.ok) {
                        throw new Error('Both users not found');
                    } else if (!user1Response.ok) {
                        throw new Error('User 1 not found');
                    } else {
                        throw new Error('User 2 not found');
                    }
                }

                const user1 = await user1Response.json();
                const user2 = await user2Response.json();

                $('#compareStatus').html('<div style="color: #1976d2; padding: 10px; background: #e3f2fd; border-radius: 4px;">Fetching groups and applications...</div>');

                // Fetch groups for both users
                await new Promise(resolve => setTimeout(resolve, 300));
                const [user1GroupsResponse, user2GroupsResponse] = await Promise.all([
                    fetch(`${location.origin}/api/v1/users/${user1.id}/groups`, {
                        method: 'GET',
                        headers: headers,
                        credentials: 'same-origin'
                    }),
                    fetch(`${location.origin}/api/v1/users/${user2.id}/groups`, {
                        method: 'GET',
                        headers: headers,
                        credentials: 'same-origin'
                    })
                ]);

                const user1Groups = await user1GroupsResponse.json();
                const user2Groups = await user2GroupsResponse.json();

                // Fetch app assignments for both users
                await new Promise(resolve => setTimeout(resolve, 300));
                const [user1AppsResponse, user2AppsResponse] = await Promise.all([
                    fetch(`${location.origin}/api/v1/apps?filter=user.id+eq+"${user1.id}"&limit=200`, {
                        method: 'GET',
                        headers: headers,
                        credentials: 'same-origin'
                    }),
                    fetch(`${location.origin}/api/v1/apps?filter=user.id+eq+"${user2.id}"&limit=200`, {
                        method: 'GET',
                        headers: headers,
                        credentials: 'same-origin'
                    })
                ]);

                const user1Apps = await user1AppsResponse.json();
                const user2Apps = await user2AppsResponse.json();

                displayComparison(user1, user2, user1Groups, user2Groups, user1Apps, user2Apps);
                $('#compareStatus').html(`<div style="color: #2e7d32; padding: 10px; background: #e8f5e9; border-radius: 4px;">Comparison complete</div>`);

            } catch (error) {
                $('#compareStatus').html(`<div style="color: #c62828; padding: 10px; background: #ffebee; border-radius: 4px;"><strong>Error:</strong> ${e(error.message)}</div>`);
                console.error('Error comparing users:', error);
            } finally {
                requestInProgress = false;
                $('#compareBtn').prop('disabled', false);
            }
        }

        function displayComparison(user1, user2, user1Groups, user2Groups, user1Apps, user2Apps) {
            // Create tabs
            const tabsHTML = `
                <div style='border-bottom: 2px solid #ddd; margin-bottom: 15px;'>
                    <div style='display: flex; gap: 5px;'>
                        <button class='compareTab' data-tab='attributes' style='padding: 10px 20px; border: none; background: #667eea; color: white; cursor: pointer; border-radius: 4px 4px 0 0;'>Attributes</button>
                        <button class='compareTab' data-tab='groups' style='padding: 10px 20px; border: none; background: #e0e0e0; color: #333; cursor: pointer; border-radius: 4px 4px 0 0;'>Groups</button>
                        <button class='compareTab' data-tab='applications' style='padding: 10px 20px; border: none; background: #e0e0e0; color: #333; cursor: pointer; border-radius: 4px 4px 0 0;'>Applications</button>
                    </div>
                </div>
                <div id='tabContent' style='max-height: 500px; overflow-y: auto;'></div>
            `;

            $('#compareResults').html(tabsHTML);

            // Tab click handlers
            $('.compareTab').click(function () {
                const tab = $(this).data('tab');

                // Update tab styles
                $('.compareTab').css({
                    'background': '#e0e0e0',
                    'color': '#333'
                });
                $(this).css({
                    'background': '#667eea',
                    'color': 'white'
                });

                // Show tab content
                if (tab === 'attributes') {
                    showAttributesComparison(user1, user2);
                } else if (tab === 'groups') {
                    showGroupsComparison(user1, user2, user1Groups, user2Groups);
                } else if (tab === 'applications') {
                    showApplicationsComparison(user1, user2, user1Apps, user2Apps);
                }
            });

            // Show attributes tab by default
            showAttributesComparison(user1, user2);
        }

        function showAttributesComparison(user1, user2) {
            const profile1 = user1.profile;
            const profile2 = user2.profile;

            // Get all unique attribute keys
            const allKeys = new Set([...Object.keys(profile1), ...Object.keys(profile2)]);
            const sortedKeys = Array.from(allKeys).sort();

            let tableHTML = `
                <div style='padding: 10px;'>
                    <div style='display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;'>
                        <div>
                            <strong>User 1:</strong> ${e(profile1.firstName || '')} ${e(profile1.lastName || '')} (${e(profile1.login || profile1.email || user1.id)})
                        </div>
                        <div>
                            <strong>User 2:</strong> ${e(profile2.firstName || '')} ${e(profile2.lastName || '')} (${e(profile2.login || profile2.email || user2.id)})
                        </div>
                    </div>
                    <table class='data-list-table' style='border: 1px solid #ddd; width: 100%; font-size: 0.9em;'>
                        <thead>
                            <tr style='background: #667eea; color: white;'>
                                <th style='padding: 8px;'>Attribute</th>
                                <th style='padding: 8px;'>User 1</th>
                                <th style='padding: 8px;'>User 2</th>
                                <th style='padding: 8px; text-align: center;'>Match</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            sortedKeys.forEach(key => {
                const value1 = profile1[key];
                const value2 = profile2[key];
                const stringValue1 = value1 === null || value1 === undefined ? '' : String(value1);
                const stringValue2 = value2 === null || value2 === undefined ? '' : String(value2);
                const match = stringValue1 === stringValue2;
                const matchIcon = match ? '✓' : '✗';
                const matchColor = match ? '#2e7d32' : '#c62828';
                const rowBg = match ? '#ffffff' : '#fff3e0';

                tableHTML += `
                    <tr style='background: ${rowBg};'>
                        <td style='padding: 8px; font-weight: 600;'>${e(key)}</td>
                        <td style='padding: 8px;'>${e(stringValue1)}</td>
                        <td style='padding: 8px;'>${e(stringValue2)}</td>
                        <td style='padding: 8px; text-align: center; color: ${matchColor}; font-weight: bold;'>${matchIcon}</td>
                    </tr>
                `;
            });

            tableHTML += `
                        </tbody>
                    </table>
                </div>
            `;

            $('#tabContent').html(tableHTML);
        }

        function showGroupsComparison(user1, user2, groups1, groups2) {
            const profile1 = user1.profile;
            const profile2 = user2.profile;

            // Create group maps
            const groups1Map = new Map(groups1.map(g => [g.id, g]));
            const groups2Map = new Map(groups2.map(g => [g.id, g]));

            // Find groups in both, only in user1, only in user2
            const inBoth = [];
            const onlyUser1 = [];
            const onlyUser2 = [];

            groups1.forEach(g => {
                if (groups2Map.has(g.id)) {
                    inBoth.push(g);
                } else {
                    onlyUser1.push(g);
                }
            });

            groups2.forEach(g => {
                if (!groups1Map.has(g.id)) {
                    onlyUser2.push(g);
                }
            });

            let tableHTML = `
                <div style='padding: 10px;'>
                    <div style='display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;'>
                        <div>
                            <strong>User 1:</strong> ${e(profile1.firstName || '')} ${e(profile1.lastName || '')} (${groups1.length} groups)
                        </div>
                        <div>
                            <strong>User 2:</strong> ${e(profile2.firstName || '')} ${e(profile2.lastName || '')} (${groups2.length} groups)
                        </div>
                    </div>
                    <div style='display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px;'>
                        <div style='background: #2e7d32; color: white; padding: 15px; border-radius: 6px; text-align: center;'>
                            <div style='font-size: 1.5em; font-weight: bold;'>${inBoth.length}</div>
                            <div style='font-size: 0.85em; opacity: 0.9;'>Common Groups</div>
                        </div>
                        <div style='background: #1976d2; color: white; padding: 15px; border-radius: 6px; text-align: center;'>
                            <div style='font-size: 1.5em; font-weight: bold;'>${onlyUser1.length}</div>
                            <div style='font-size: 0.85em; opacity: 0.9;'>Only User 1</div>
                        </div>
                        <div style='background: #d32f2f; color: white; padding: 15px; border-radius: 6px; text-align: center;'>
                            <div style='font-size: 1.5em; font-weight: bold;'>${onlyUser2.length}</div>
                            <div style='font-size: 0.85em; opacity: 0.9;'>Only User 2</div>
                        </div>
                    </div>
                    <table class='data-list-table' style='border: 1px solid #ddd; width: 100%; font-size: 0.9em;'>
                        <thead>
                            <tr style='background: #667eea; color: white;'>
                                <th style='padding: 8px;'>Group Name</th>
                                <th style='padding: 8px; text-align: center;'>User 1</th>
                                <th style='padding: 8px; text-align: center;'>User 2</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            // Show common groups first
            inBoth.forEach(g => {
                tableHTML += `
                    <tr style='background: #e8f5e9;'>
                        <td style='padding: 8px;'>${e(g.profile.name)}</td>
                        <td style='padding: 8px; text-align: center; color: #2e7d32;'>✓</td>
                        <td style='padding: 8px; text-align: center; color: #2e7d32;'>✓</td>
                    </tr>
                `;
            });

            // Show user1 only groups
            onlyUser1.forEach(g => {
                tableHTML += `
                    <tr style='background: #e3f2fd;'>
                        <td style='padding: 8px;'>${e(g.profile.name)}</td>
                        <td style='padding: 8px; text-align: center; color: #1976d2;'>✓</td>
                        <td style='padding: 8px; text-align: center; color: #999;'>✗</td>
                    </tr>
                `;
            });

            // Show user2 only groups
            onlyUser2.forEach(g => {
                tableHTML += `
                    <tr style='background: #ffebee;'>
                        <td style='padding: 8px;'>${e(g.profile.name)}</td>
                        <td style='padding: 8px; text-align: center; color: #999;'>✗</td>
                        <td style='padding: 8px; text-align: center; color: #d32f2f;'>✓</td>
                    </tr>
                `;
            });

            tableHTML += `
                        </tbody>
                    </table>
                </div>
            `;

            $('#tabContent').html(tableHTML);
        }

        function showApplicationsComparison(user1, user2, apps1, apps2) {
            const profile1 = user1.profile;
            const profile2 = user2.profile;

            // Helper function to format app type
            function formatAppType(app) {
                const signOnMode = app.signOnMode || 'UNKNOWN';
                const typeMap = {
                    'SAML_2_0': 'SAML 2.0',
                    'SAML_1_1': 'SAML 1.1',
                    'OPENID_CONNECT': 'OIDC',
                    'SECURE_PASSWORD_STORE': 'SWA',
                    'AUTO_LOGIN': 'Auto Login',
                    'BOOKMARK': 'Bookmark',
                    'BROWSER_PLUGIN': 'Browser Plugin',
                    'WS_FEDERATION': 'WS-Federation',
                    'BASIC_AUTH': 'Basic Auth'
                };
                return typeMap[signOnMode] || signOnMode;
            }

            // Create app maps
            const apps1Map = new Map(apps1.map(a => [a.id, a]));
            const apps2Map = new Map(apps2.map(a => [a.id, a]));

            // Find apps in both, only in user1, only in user2
            const inBoth = [];
            const onlyUser1 = [];
            const onlyUser2 = [];

            apps1.forEach(a => {
                if (apps2Map.has(a.id)) {
                    inBoth.push(a);
                } else {
                    onlyUser1.push(a);
                }
            });

            apps2.forEach(a => {
                if (!apps1Map.has(a.id)) {
                    onlyUser2.push(a);
                }
            });

            let tableHTML = `
                <div style='padding: 10px;'>
                    <div style='display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;'>
                        <div>
                            <strong>User 1:</strong> ${e(profile1.firstName || '')} ${e(profile1.lastName || '')} (${apps1.length} applications)
                        </div>
                        <div>
                            <strong>User 2:</strong> ${e(profile2.firstName || '')} ${e(profile2.lastName || '')} (${apps2.length} applications)
                        </div>
                    </div>
                    <div style='display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px;'>
                        <div style='background: #2e7d32; color: white; padding: 15px; border-radius: 6px; text-align: center;'>
                            <div style='font-size: 1.5em; font-weight: bold;'>${inBoth.length}</div>
                            <div style='font-size: 0.85em; opacity: 0.9;'>Common Apps</div>
                        </div>
                        <div style='background: #1976d2; color: white; padding: 15px; border-radius: 6px; text-align: center;'>
                            <div style='font-size: 1.5em; font-weight: bold;'>${onlyUser1.length}</div>
                            <div style='font-size: 0.85em; opacity: 0.9;'>Only User 1</div>
                        </div>
                        <div style='background: #d32f2f; color: white; padding: 15px; border-radius: 6px; text-align: center;'>
                            <div style='font-size: 1.5em; font-weight: bold;'>${onlyUser2.length}</div>
                            <div style='font-size: 0.85em; opacity: 0.9;'>Only User 2</div>
                        </div>
                    </div>
                    <table class='data-list-table' style='border: 1px solid #ddd; width: 100%; font-size: 0.9em;'>
                        <thead>
                            <tr style='background: #667eea; color: white;'>
                                <th style='padding: 8px;'>Application Name</th>
                                <th style='padding: 8px;'>Type</th>
                                <th style='padding: 8px; text-align: center;'>User 1</th>
                                <th style='padding: 8px; text-align: center;'>User 2</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            // Show common apps first
            inBoth.forEach(a => {
                tableHTML += `
                    <tr style='background: #e8f5e9;'>
                        <td style='padding: 8px;'>${e(a.label)}</td>
                        <td style='padding: 8px;'><span style='background: #e0e0e0; padding: 2px 8px; border-radius: 3px; font-size: 0.85em;'>${e(formatAppType(a))}</span></td>
                        <td style='padding: 8px; text-align: center; color: #2e7d32;'>✓</td>
                        <td style='padding: 8px; text-align: center; color: #2e7d32;'>✓</td>
                    </tr>
                `;
            });

            // Show user1 only apps
            onlyUser1.forEach(a => {
                tableHTML += `
                    <tr style='background: #e3f2fd;'>
                        <td style='padding: 8px;'>${e(a.label)}</td>
                        <td style='padding: 8px;'><span style='background: #e0e0e0; padding: 2px 8px; border-radius: 3px; font-size: 0.85em;'>${e(formatAppType(a))}</span></td>
                        <td style='padding: 8px; text-align: center; color: #1976d2;'>✓</td>
                        <td style='padding: 8px; text-align: center; color: #999;'>✗</td>
                    </tr>
                `;
            });

            // Show user2 only apps
            onlyUser2.forEach(a => {
                tableHTML += `
                    <tr style='background: #ffebee;'>
                        <td style='padding: 8px;'>${e(a.label)}</td>
                        <td style='padding: 8px;'><span style='background: #e0e0e0; padding: 2px 8px; border-radius: 3px; font-size: 0.85em;'>${e(formatAppType(a))}</span></td>
                        <td style='padding: 8px; text-align: center; color: #999;'>✗</td>
                        <td style='padding: 8px; text-align: center; color: #d32f2f;'>✓</td>
                    </tr>
                `;
            });

            tableHTML += `
                        </tbody>
                    </table>
                </div>
            `;

            $('#tabContent').html(tableHTML);
        }
    }

    // App Instance page functions
    function appInstance() {
        // Extract app ID from URL: /admin/app/{appName}/instance/{appId}
        const pathParts = location.pathname.split('/');
        const appId = pathParts[5];

        if (!appId) return;

        // Fetch app details
        getJSON(`/api/v1/apps/${appId}`).then(app => {
            const appName = app.label || 'Unknown App';
            const appType = app.signOnMode || app.name || 'Unknown';

            // Show App Details
            createDiv("Show App Details", mainPopup, async function () {
                const detailsPopup = createPopup("App Details: " + appName);
                detailsPopup.html('<div style="padding: 20px; text-align: center;">Loading app details...</div>');

                try {
                    let detailsHTML = `
                        <div style='padding: 15px;'>
                            <h3 style='margin: 0 0 15px 0; color: #667eea;'>${e(appName)}</h3>
                            <div style='margin-bottom: 10px;'>
                                <span style='background: #667eea; color: white; padding: 4px 12px; border-radius: 4px; font-size: 0.85em;'>${e(appType)}</span>
                                <span style='background: ${app.status === 'ACTIVE' ? '#2e7d32' : '#c62828'}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 0.85em; margin-left: 5px;'>${e(app.status)}</span>
                            </div>
                    `;

                    // SAML Application details
                    if (appType.includes('SAML') || app.name?.includes('saml')) {
                        const signOn = app.settings?.signOn || {};
                        const metadataUrl = `${location.origin}/app/${appId}/sso/saml/metadata`;
                        const ssoUrl = signOn.ssoAcsUrl || '-';
                        const entityId = signOn.idpIssuer || signOn.audience || '-';
                        const assertionSigned = signOn.assertionSigned !== undefined ? (signOn.assertionSigned ? 'Yes' : 'No') : '-';
                        const signatureAlgorithm = signOn.signatureAlgorithm || '-';
                        const digestAlgorithm = signOn.digestAlgorithm || '-';
                        const nameIdFormat = signOn.subjectNameIdFormat || '-';

                        detailsHTML += `
                            <h4 style='margin: 20px 0 10px 0; color: #333;'>SAML Configuration</h4>
                            <table style='width: 100%; border-collapse: collapse; font-size: 0.9em;'>
                                <tr style='border-bottom: 1px solid #eee;'>
                                    <td style='padding: 8px; font-weight: 600; width: 200px;'>Metadata URL</td>
                                    <td style='padding: 8px;'><a href="${metadataUrl}" target="_blank" style='color: #667eea; word-break: break-all;'>${e(metadataUrl)}</a></td>
                                </tr>
                                <tr style='border-bottom: 1px solid #eee;'>
                                    <td style='padding: 8px; font-weight: 600;'>SSO URL (ACS)</td>
                                    <td style='padding: 8px; word-break: break-all;'>${e(ssoUrl)}</td>
                                </tr>
                                <tr style='border-bottom: 1px solid #eee;'>
                                    <td style='padding: 8px; font-weight: 600;'>Entity ID / Audience</td>
                                    <td style='padding: 8px; word-break: break-all;'>${e(entityId)}</td>
                                </tr>
                                <tr style='border-bottom: 1px solid #eee;'>
                                    <td style='padding: 8px; font-weight: 600;'>Assertion Signed</td>
                                    <td style='padding: 8px;'>${e(assertionSigned)}</td>
                                </tr>
                                <tr style='border-bottom: 1px solid #eee;'>
                                    <td style='padding: 8px; font-weight: 600;'>Signature Algorithm</td>
                                    <td style='padding: 8px;'>${e(signatureAlgorithm)}</td>
                                </tr>
                                <tr style='border-bottom: 1px solid #eee;'>
                                    <td style='padding: 8px; font-weight: 600;'>Digest Algorithm</td>
                                    <td style='padding: 8px;'>${e(digestAlgorithm)}</td>
                                </tr>
                                <tr style='border-bottom: 1px solid #eee;'>
                                    <td style='padding: 8px; font-weight: 600;'>Name ID Format</td>
                                    <td style='padding: 8px;'>${e(nameIdFormat)}</td>
                                </tr>
                            </table>
                        `;

                        // Attribute Statements
                        const attributeStatements = signOn.attributeStatements || [];
                        if (attributeStatements.length > 0) {
                            detailsHTML += `
                                <h4 style='margin: 20px 0 10px 0; color: #667eea;'>Attribute Statements</h4>
                                <table style='width: 100%; border-collapse: collapse; font-size: 0.9em;'>
                                    <thead>
                                        <tr style='background: #f5f5f5;'>
                                            <th style='padding: 8px; text-align: left; border-bottom: 1px solid #ddd;'>Name</th>
                                            <th style='padding: 8px; text-align: left; border-bottom: 1px solid #ddd;'>Name Format</th>
                                            <th style='padding: 8px; text-align: left; border-bottom: 1px solid #ddd;'>Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                            `;

                            attributeStatements.forEach(attr => {
                                const name = attr.name || '-';
                                const nameFormat = attr.namespace || 'Unspecified';
                                const values = attr.values || [];
                                const valueStr = values.join(', ') || '-';

                                detailsHTML += `
                                    <tr style='border-bottom: 1px solid #eee;'>
                                        <td style='padding: 8px;'><code>${e(name)}</code></td>
                                        <td style='padding: 8px;'>${e(nameFormat)}</td>
                                        <td style='padding: 8px;'><code>${e(valueStr)}</code></td>
                                    </tr>
                                `;
                            });

                            detailsHTML += `
                                    </tbody>
                                </table>
                            `;
                        } else {
                            detailsHTML += `
                                <h4 style='margin: 20px 0 10px 0; color: #667eea;'>Attribute Statements</h4>
                                <p style='color: #999; font-size: 0.9em;'>No attribute statements configured.</p>
                            `;
                        }
                    }

                    // OIDC Application details
                    if (appType.includes('OPENID') || appType.includes('OAUTH') || app.name?.includes('oidc')) {
                        const oauthClient = app.settings?.oauthClient || {};
                        const credentials = app.credentials?.oauthClient || {};
                        const clientId = credentials.client_id || app.id || '-';
                        const redirectUris = oauthClient.redirect_uris || [];
                        const grantTypes = oauthClient.grant_types || [];
                        const responseTypes = oauthClient.response_types || [];
                        const tokenEndpointAuth = credentials.token_endpoint_auth_method || '-';
                        const issuerMode = oauthClient.issuer_mode || 'ORG_URL';

                        // Get scopes from oauthClient if available
                        const appScopes = oauthClient.scope || oauthClient.scopes || [];
                        const scopesStr = Array.isArray(appScopes) ? appScopes.join(' ') : appScopes;

                        detailsHTML += `
                            <h4 style='margin: 20px 0 10px 0; color: #333;'>OIDC Configuration</h4>
                            <table style='width: 100%; border-collapse: collapse; font-size: 0.9em;'>
                                <tr style='border-bottom: 1px solid #eee;'>
                                    <td style='padding: 8px; font-weight: 600; width: 200px;'>Client ID</td>
                                    <td style='padding: 8px;'><code style='background: #f5f5f5; padding: 2px 6px; border-radius: 3px;'>${e(clientId)}</code></td>
                                </tr>
                                <tr style='border-bottom: 1px solid #eee;'>
                                    <td style='padding: 8px; font-weight: 600;'>Redirect URIs</td>
                                    <td style='padding: 8px;'>${redirectUris.length > 0 ? redirectUris.map(uri => `<div style='margin: 2px 0; word-break: break-all;'>${e(uri)}</div>`).join('') : '-'}</td>
                                </tr>
                                <tr style='border-bottom: 1px solid #eee;'>
                                    <td style='padding: 8px; font-weight: 600;'>Grant Types</td>
                                    <td style='padding: 8px;'>${grantTypes.length > 0 ? grantTypes.map(g => `<span style='background: #e3f2fd; padding: 2px 8px; border-radius: 3px; margin-right: 5px; font-size: 0.85em;'>${e(g)}</span>`).join('') : '-'}</td>
                                </tr>
                                <tr style='border-bottom: 1px solid #eee;'>
                                    <td style='padding: 8px; font-weight: 600;'>Response Types</td>
                                    <td style='padding: 8px;'>${responseTypes.length > 0 ? responseTypes.map(r => `<span style='background: #e8f5e9; padding: 2px 8px; border-radius: 3px; margin-right: 5px; font-size: 0.85em;'>${e(r)}</span>`).join('') : '-'}</td>
                                </tr>
                                <tr style='border-bottom: 1px solid #eee;'>
                                    <td style='padding: 8px; font-weight: 600;'>Token Auth Method</td>
                                    <td style='padding: 8px;'>${e(tokenEndpointAuth)}</td>
                                </tr>
                                <tr style='border-bottom: 1px solid #eee;'>
                                    <td style='padding: 8px; font-weight: 600;'>Issuer Mode</td>
                                    <td style='padding: 8px;'>${e(issuerMode)}</td>
                                </tr>
                            </table>
                        `;

                        // Scopes section
                        if (scopesStr) {
                            const scopesList = scopesStr.split(' ').filter(s => s.trim());
                            detailsHTML += `
                                <h4 style='margin: 20px 0 10px 0; color: #667eea;'>Allowed Scopes</h4>
                                <div style='display: flex; flex-wrap: wrap; gap: 6px;'>
                                    ${scopesList.map(scope => `<span style='background: #fff3e0; color: #e65100; padding: 4px 10px; border-radius: 4px; font-size: 0.85em;'>${e(scope)}</span>`).join('')}
                                </div>
                            `;
                        } else {
                            detailsHTML += `
                                <h4 style='margin: 20px 0 10px 0; color: #667eea;'>Allowed Scopes</h4>
                                <p style='color: #999; font-size: 0.9em;'>No scopes configured or using default.</p>
                            `;
                        }

                        // Try to identify authorization server
                        const wellKnownUrl = `${location.origin}/.well-known/openid-configuration`;
                        detailsHTML += `
                            <h4 style='margin: 20px 0 10px 0; color: #667eea;'>Authorization Server</h4>
                            <table style='width: 100%; border-collapse: collapse; font-size: 0.9em;'>
                                <tr style='border-bottom: 1px solid #eee;'>
                                    <td style='padding: 8px; font-weight: 600; width: 200px;'>OpenID Config URL</td>
                                    <td style='padding: 8px;'><a href="${wellKnownUrl}" target="_blank" style='color: #667eea; word-break: break-all;'>${e(wellKnownUrl)}</a></td>
                                </tr>
                            </table>
                        `;
                    }

                    // General info for all apps
                    const embedLink = app._links?.appLinks?.[0]?.href || '-';
                    const created = app.created ? new Date(app.created).toLocaleString() : '-';
                    const lastUpdated = app.lastUpdated ? new Date(app.lastUpdated).toLocaleString() : '-';

                    detailsHTML += `
                        <h4 style='margin: 20px 0 10px 0; color: #333;'>General</h4>
                        <table style='width: 100%; border-collapse: collapse; font-size: 0.9em;'>
                            <tr style='border-bottom: 1px solid #eee;'>
                                <td style='padding: 8px; font-weight: 600; width: 200px;'>App ID</td>
                                <td style='padding: 8px;'><code style='background: #f5f5f5; padding: 2px 6px; border-radius: 3px;'>${e(appId)}</code></td>
                            </tr>
                            <tr style='border-bottom: 1px solid #eee;'>
                                <td style='padding: 8px; font-weight: 600;'>Embed Link</td>
                                <td style='padding: 8px;'>${embedLink !== '-' ? `<a href="${embedLink}" target="_blank" style='color: #667eea; word-break: break-all;'>${e(embedLink)}</a>` : '-'}</td>
                            </tr>
                            <tr style='border-bottom: 1px solid #eee;'>
                                <td style='padding: 8px; font-weight: 600;'>Created</td>
                                <td style='padding: 8px;'>${e(created)}</td>
                            </tr>
                            <tr style='border-bottom: 1px solid #eee;'>
                                <td style='padding: 8px; font-weight: 600;'>Last Updated</td>
                                <td style='padding: 8px;'>${e(lastUpdated)}</td>
                            </tr>
                        </table>
                        </div>
                    `;

                    // Initially show what we have, then add policy
                    detailsPopup.html(detailsHTML + '<div id="policySection" style="padding: 0 15px 15px;"><h4 style="margin: 20px 0 10px 0; color: #667eea;">Sign-On Policy</h4><div style="color: #999;">Loading policy...</div></div>');

                    // Fetch access/sign-on policy
                    try {
                        let policies = [];

                        // Try 1: Check if app has accessPolicy link
                        if (app._links?.accessPolicy?.href) {
                            const policyUrl = app._links.accessPolicy.href;
                            // Extract just the path (e.g., /api/v1/policies/xxx) from the full URL
                            const urlObj = new URL(policyUrl);
                            const policyPath = urlObj.pathname + urlObj.search;
                            console.log('Policy path:', policyPath);
                            const policy = await getJSON(policyPath);
                            if (policy) policies.push(policy);
                        }

                        // Try 2: If no policy from link, try fetching by app
                        if (policies.length === 0) {
                            try {
                                const appPolicies = await getJSON(`/api/v1/apps/${appId}/policies`);
                                if (appPolicies && appPolicies.length > 0) {
                                    policies = appPolicies;
                                }
                            } catch (e) {
                                // API might not be available
                            }
                        }

                        // Try 3: Search for ACCESS_POLICY type policies for this app
                        if (policies.length === 0) {
                            try {
                                const allPolicies = await getJSON('/api/v1/policies?type=ACCESS_POLICY&status=ACTIVE');
                                // Find policies that might be for this app (we can't filter directly)
                                if (allPolicies && allPolicies.length > 0) {
                                    // Just show first few as examples
                                    policies = allPolicies.slice(0, 3);
                                }
                            } catch (e) {
                                // Fallback failed
                            }
                        }
                        let policyHTML = '';

                        // Debug: log what we found
                        console.log('App _links:', app._links);
                        console.log('Policies found:', policies);

                        if (policies && policies.length > 0) {
                            policyHTML = `
                                <h4 style='margin: 20px 0 10px 0; color: #667eea;'>Sign-On Policy</h4>
                                <table style='width: 100%; border-collapse: collapse; font-size: 0.9em;'>
                            `;

                            for (const policy of policies) {
                                const policyName = policy.name || 'Unknown Policy';
                                const policyId = policy.id || '';
                                const policyType = policy.type || '-';
                                const policyStatus = policy.status || '-';
                                const statusColor = policyStatus === 'ACTIVE' ? '#2e7d32' : '#c62828';

                                // Build policy URL based on type
                                let policyUrl = '';
                                if (policyType === 'ACCESS_POLICY' || policyType === 'OKTA_SIGN_ON') {
                                    policyUrl = `/admin/access/authentication-policies#policies/view/${policyId}`;
                                } else if (policyType === 'RESOURCE_ACCESS') {
                                    policyUrl = `/admin/access/authentication-policies#policies/view/${policyId}`;
                                }

                                policyHTML += `
                                    <tr style='border-bottom: 1px solid #eee;'>
                                        <td style='padding: 8px; font-weight: 600; width: 200px;'>Policy Name</td>
                                        <td style='padding: 8px;'>${policyUrl ? `<a href="${policyUrl}" target="_blank" style="color: #667eea; text-decoration: none;">${e(policyName)} ↗</a>` : e(policyName)}</td>
                                    </tr>
                                    <tr style='border-bottom: 1px solid #eee;'>
                                        <td style='padding: 8px; font-weight: 600;'>Policy ID</td>
                                        <td style='padding: 8px;'><code style='background: #f5f5f5; padding: 2px 6px; border-radius: 3px;'>${e(policyId)}</code></td>
                                    </tr>
                                    <tr style='border-bottom: 1px solid #eee;'>
                                        <td style='padding: 8px; font-weight: 600;'>Type</td>
                                        <td style='padding: 8px;'>${e(policyType)}</td>
                                    </tr>
                                    <tr style='border-bottom: 1px solid #eee;'>
                                        <td style='padding: 8px; font-weight: 600;'>Status</td>
                                        <td style='padding: 8px;'><span style='color: ${statusColor}; font-weight: 600;'>${e(policyStatus)}</span></td>
                                    </tr>
                                `;

                                // Try to get policy rules
                                try {
                                    const rules = await getJSON(`/api/v1/policies/${policy.id}/rules`);
                                    if (rules && rules.length > 0) {
                                        policyHTML += `
                                            <tr>
                                                <td style='padding: 8px; font-weight: 600; vertical-align: top;'>Rules</td>
                                                <td style='padding: 8px;'>
                                        `;
                                        rules.forEach(rule => {
                                            const ruleName = rule.name || 'Unnamed Rule';
                                            const ruleStatus = rule.status || '-';
                                            policyHTML += `<div style='margin: 4px 0; padding: 4px 8px; background: #f5f5f5; border-radius: 4px;'>${e(ruleName)} <span style='color: ${ruleStatus === 'ACTIVE' ? '#2e7d32' : '#999'};'>(${e(ruleStatus)})</span></div>`;
                                        });
                                        policyHTML += `</td></tr>`;
                                    }
                                } catch (ruleErr) {
                                    // Rules might not be accessible
                                }
                            }

                            policyHTML += `</table>`;
                        } else {
                            policyHTML = `
                                <h4 style='margin: 20px 0 10px 0; color: #667eea;'>Access Policy</h4>
                                <p style='color: #999; font-size: 0.9em;'>No specific access policy assigned.</p>
                            `;
                        }

                        $('#policySection').html(policyHTML);
                    } catch (policyErr) {
                        $('#policySection').html(`
                            <h4 style='margin: 20px 0 10px 0; color: #667eea;'>Access Policy</h4>
                            <p style='color: #999; font-size: 0.9em;'>Could not load policy information.</p>
                        `);
                    }

                    return;

                } catch (error) {
                    detailsPopup.html(`<div style="padding: 20px; color: #c62828;">Error: ${e(error.message)}</div>`);
                }
            });

            // Compare with Another App
            createDiv("Compare with Another App", mainPopup, async function () {
                const comparePopup = createPopup("Compare Apps");

                let inputHTML = `
                    <div style='padding: 15px;'>
                        <h4 style='margin: 0 0 15px 0;'>Compare "${e(appName)}" with another app:</h4>
                        <label style='display: block; margin-bottom: 5px; color: #666;'>Enter App ID:</label>
                        <input type='text' id='compareAppId' placeholder='e.g., 0oa1234567890abcdef' 
                            style='width: 100%; padding: 10px; font-size: 1em; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;'>
                        <p style='font-size: 0.85em; color: #999; margin: 5px 0 15px 0;'>
                            Tip: Copy the App ID from the URL of the other app page
                        </p>
                        <button id='compareBtn' style='padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;'>Compare</button>
                        <div id='compareResults' style='margin-top: 20px;'></div>
                    </div>
                `;

                comparePopup.html(inputHTML);

                $('#compareBtn').click(async function () {
                    const compareAppId = $('#compareAppId').val().trim();
                    if (!compareAppId) {
                        $('#compareResults').html('<div style="color: #c62828;">Please enter an App ID.</div>');
                        return;
                    }

                    if (compareAppId === appId) {
                        $('#compareResults').html('<div style="color: #c62828;">Cannot compare an app with itself.</div>');
                        return;
                    }

                    $('#compareResults').html('<div style="text-align: center;">Loading app and comparing...</div>');

                    try {
                        const app2 = await getJSON(`/api/v1/apps/${compareAppId}`);

                        // Compare settings
                        const signOn1 = app.settings?.signOn || app.settings?.oauthClient || {};
                        const signOn2 = app2.settings?.signOn || app2.settings?.oauthClient || {};

                        const allKeys = new Set([...Object.keys(signOn1), ...Object.keys(signOn2)]);

                        let diffHTML = `
                            <h4 style='margin: 0 0 15px 0;'>Comparison: ${e(appName)} vs ${e(app2.label)}</h4>
                            <table style='width: 100%; border-collapse: collapse; font-size: 0.85em;'>
                                <thead>
                                    <tr style='background: #667eea; color: white;'>
                                        <th style='padding: 8px; text-align: left;'>Setting</th>
                                        <th style='padding: 8px; text-align: left;'>${e(appName)}</th>
                                        <th style='padding: 8px; text-align: left;'>${e(app2.label)}</th>
                                        <th style='padding: 8px; text-align: center;'>Match</th>
                                    </tr>
                                </thead>
                                <tbody>
                        `;

                        allKeys.forEach(key => {
                            const val1 = JSON.stringify(signOn1[key]) || '-';
                            const val2 = JSON.stringify(signOn2[key]) || '-';
                            const match = val1 === val2;
                            const rowStyle = match ? '' : 'background: #fff3e0;';

                            diffHTML += `
                                <tr style='border-bottom: 1px solid #eee; ${rowStyle}'>
                                    <td style='padding: 8px; font-weight: 600;'>${e(key)}</td>
                                    <td style='padding: 8px; max-width: 200px; overflow: hidden; text-overflow: ellipsis;'>${e(val1)}</td>
                                    <td style='padding: 8px; max-width: 200px; overflow: hidden; text-overflow: ellipsis;'>${e(val2)}</td>
                                    <td style='padding: 8px; text-align: center;'>${match ? '✓' : '<span style="color: #c62828;">✗</span>'}</td>
                                </tr>
                            `;
                        });

                        diffHTML += '</tbody></table>';
                        $('#compareResults').html(diffHTML);

                    } catch (err) {
                        $('#compareResults').html(`<div style="color: #c62828;">Error: Could not load app. Check if the App ID is correct.</div>`);
                    }
                });
            });
        });
    }

    // Admin functions
    function directoryPeople() {
        createDiv("Search Users (experimental)", mainPopup, () => {
            searcher({
                url: "/api/v1/users",
                data() { return { q: this.search, limit: this.limit }; },
                limit: 15, // 15 is the max limit when using q.
                comparer: (user1, user2) => (user1.profile.firstName + user1.profile.lastName).localeCompare(user2.profile.firstName + user2.profile.lastName),
                template(user) {
                    var creds = user.credentials.provider;
                    var logo = creds.type == "LDAP" ? "ldap_sun_one" : creds.type.toLowerCase();
                    return `<tr><td><span class='icon icon-24 group-logos-24 logo-${logo}'></span> ${creds.name == "OKTA" ? "Okta" : creds.name}` +
                        `<td><a href="/admin/user/profile/view/${e(user.id)}#tab-account">${e(user.profile.firstName)} ${e(user.profile.lastName)}</a>` +
                        `<td>${e(user.profile.login)}<td>${e(user.profile.email)}`;
                },
                headers: "<tr><th>Source<th>Name<th>Username<th>Primary Email",
                placeholder: "Search Active by First/Last/Email...",
                empty: true
            });
        });
    }
    function directoryPerson() {
        var userId = location.pathname.split("/")[5];
        var user;
        getJSON(`/api/v1/users/${userId}`).then(aUser => {
            user = aUser;
            var ad = user.credentials.provider.type == "ACTIVE_DIRECTORY";
            $(".subheader").html(`${e(user.profile.login)}, email: ${e(user.profile.email)}${ad ? ", " : ""}`);
            document.title += ` - ${e(user.profile.firstName)} ${e(user.profile.lastName)}`;
            if (ad) {
                function showADs() {
                    getJSON(`/api/v1/apps?filter=user.id+eq+"${userId}"&expand=user/${userId}&limit=200&q=active_directory`).then(appUsers => {
                        var adPopup = createPopup("Active Directory");
                        var rows = "<tr><th>Domain<th>Username<th>Email";
                        appUsers.forEach(appUser => {
                            var user = appUser._embedded.user;
                            rows += `<tr><td>${e(appUser.label)}<td>${e(user.credentials.userName)}<td>${e(user.profile.email)}`;
                        });
                        adPopup.html(`<table class='data-list-table' style='border: 1px solid #ddd;'>${rows}</table>`);
                    });
                }
                createA("AD: " + e(user.credentials.provider.name), ".subheader", showADs);
                createPrefixA("<li class=option>", "<span class='icon directory-16'></span>Show AD", ".okta-dropdown-list", showADs);
            }
        });
        function showUser() {
            function toString(o, i = '') {
                const strings = [];
                for (const p in o) {
                    if (p == "_links") continue;
                    var v = o[p];
                    if (v === null) v = "null";
                    else if (typeof v == "string") v = '"' + v.replace(/(["\\])/g, "\\$1") + '"'; // Escape " and \
                    else if (Array.isArray(v)) v = v.length == 0 ? '[]' : "[\n" + toString(v, i + "    ") + i + "]";
                    else if (typeof v == "object") v = $.isEmptyObject(v) ? '{}' : "{\n" + toString(v, i + "    ") + i + "}";
                    if (!Array.isArray(o)) v = p + ": " + v;
                    strings.push(i + v);
                }
                return strings.join("\n") + "\n";
            }
            const userPopup = createPopup("User");
            const logo = user.credentials.provider.type == "LDAP" ? "ldap_sun_one" : user.credentials.provider.type.toLowerCase();
            userPopup.html(`<span class='icon icon-24 group-logos-24 logo-${logo}'></span><br><br><pre>${e(toString(user))}</pre>`);
        }
        createDiv("Show User", mainPopup, showUser);
        createPrefixA("<li class=option>", "<span class='icon person-16-gray'></span>Show User", ".okta-dropdown-list", showUser);

        // Show Devices function
        async function showDevices() {
            const devicesPopup = createPopup("Devices");
            devicesPopup.html('<div style="padding: 20px; text-align: center;"><div class="spinner"></div> Loading devices...</div>');

            try {
                // Try to get devices with expand parameter for more details
                let devices = await getJSON(`/api/v1/users/${userId}/devices?expand=device`);
                
                // Fallback to basic endpoint if expand fails
                if (!devices || devices.error) {
                    devices = await getJSON(`/api/v1/users/${userId}/devices`);
                }

                if (!devices || devices.length === 0) {
                    devicesPopup.html('<div style="padding: 20px; text-align: center; color: #666;">No devices found for this user.</div>');
                    return;
                }

                let tableHTML = `
                    <div style='padding: 10px; max-height: 500px; overflow-y: auto;'>
                        <div style='margin-bottom: 10px; color: #667eea; font-weight: 600;'>${devices.length} device${devices.length !== 1 ? 's' : ''} found</div>
                        <div style='margin-bottom: 10px; color: #666; font-size: 0.85em;'>
                            <i>Note: Management status and Screen Lock data may not be available for all devices depending on API permissions and device enrollment type.</i>
                        </div>
                        <table class='data-list-table' style='border: 1px solid #ddd; width: 100%; font-size: 0.85em;'>
                            <thead>
                                <tr style='background: #667eea; color: white;'>
                                    <th style='padding: 8px;'>Device Name</th>
                                    <th style='padding: 8px;'>Platform</th>
                                    <th style='padding: 8px;'>Status</th>
                                    <th style='padding: 8px;'>Enrolled</th>
                                    <th style='padding: 8px;'>Last Used</th>
                                    <th style='padding: 8px;'>Management</th>
                                    <th style='padding: 8px;'>Screen Lock</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                devices.forEach(item => {
                    // Data is nested under item.device or item itself
                    const device = item.device || item;
                    const profile = device.profile || {};
                    
                    // Debug: Log the full item structure to understand API response
                    console.log('Full device item:', item);

                    // Device name
                    const displayName = profile.displayName || profile.name || device.resourceDisplayName?.value || 'Unknown Device';

                    // Platform and model (use model since osVersion isn't in response)
                    const platform = profile.platform || 'Unknown';
                    const model = profile.model || '';
                    const manufacturer = profile.manufacturer || '';
                    const platformDisplay = model ? `${platform} (${model})` : platform;

                    // Status
                    const status = device.status || 'Unknown';
                    const statusColor = status === 'ACTIVE' ? '#2e7d32' : status === 'SUSPENDED' ? '#c62828' : '#666';

                    // Format dates - use device.created and device.lastUpdated
                    const created = device.created ? new Date(device.created).toLocaleDateString() : '-';
                    const lastUpdated = device.lastUpdated ? new Date(device.lastUpdated).toLocaleDateString() : '-';

                    // These fields may be in profile, device, or item level, or nested in other properties
                    // Check all possible locations for management status
                    let mgmtStatus = profile.managementStatus || device.managementStatus || item.managementStatus;
                    if (!mgmtStatus && profile.managed !== undefined) {
                        mgmtStatus = profile.managed;
                    }
                    if (!mgmtStatus && device.managed !== undefined) {
                        mgmtStatus = device.managed;
                    }
                    if (!mgmtStatus && profile.securityInfo) {
                        mgmtStatus = profile.securityInfo.managementStatus;
                    }
                    if (!mgmtStatus) {
                        mgmtStatus = '-';
                    }
                    
                    const mgmtColor = (mgmtStatus === 'MANAGED' || mgmtStatus === true) ? '#2e7d32' : '#666';
                    const mgmtDisplay = mgmtStatus === true ? 'MANAGED' : (mgmtStatus === false ? 'NOT MANAGED' : mgmtStatus);

                    // Check all possible locations for screen lock type
                    let screenLock = profile.screenLockType || device.screenLockType || item.screenLockType;
                    if (!screenLock && profile.screenLock) {
                        screenLock = profile.screenLock.type || profile.screenLock;
                    }
                    if (!screenLock && device.screenLock) {
                        screenLock = device.screenLock.type || device.screenLock;
                    }
                    if (!screenLock && profile.securityInfo) {
                        screenLock = profile.securityInfo.screenLockType;
                    }
                    if (!screenLock) {
                        screenLock = '-';
                    }
                    
                    const screenLockIcon = screenLock === 'BIOMETRIC' ? '🔐' : screenLock === 'PASSCODE' ? '🔢' : screenLock === 'NONE' ? '⚠️' : '';

                    tableHTML += `
                        <tr>
                            <td style='padding: 8px; font-weight: 500;'>${e(displayName)}</td>
                            <td style='padding: 8px;'>${e(platformDisplay)}</td>
                            <td style='padding: 8px;'><span style='color: ${statusColor}; font-weight: 600;'>${e(status)}</span></td>
                            <td style='padding: 8px;'>${e(created)}</td>
                            <td style='padding: 8px;'>${e(lastUpdated)}</td>
                            <td style='padding: 8px;'><span style='color: ${mgmtColor};'>${e(mgmtDisplay)}</span></td>
                            <td style='padding: 8px;'>${screenLockIcon} ${e(screenLock)}</td>
                        </tr>
                    `;
                });

                tableHTML += `
                            </tbody>
                        </table>
                    </div>
                `;

                devicesPopup.html(tableHTML);

            } catch (error) {
                devicesPopup.html(`<div style="padding: 20px; color: #c62828;">Error loading devices: ${e(error.message)}</div>`);
            }
        }
        createDiv("Show Devices", mainPopup, showDevices);
        createPrefixA("<li class=option>", "<span class='icon device-16-gray'></span>Show Devices", ".okta-dropdown-list", showDevices);


        createDiv("Verify Factors", mainPopup, async function () {
            function mapFactors(factor) {
                // Duo probably won't work, it seems to need a UI/SDK/etc.
                // WebAuthn probably won't work, either, since the user and browser have to be the same.
                // Same is probably true for at least some of the factors not listed below.
                const supportedFactors = [
                    { provider: 'OKTA', type: 'push', icon: "okta-otp", name: "Okta Verify with Push", sort: 0 },
                    { provider: 'OKTA', type: "token:software:totp", icon: "okta-otp", name: "Okta Verify (OTP)", sort: 1 },
                    { provider: 'GOOGLE', type: 'token:software:totp', icon: "otp", name: "Google Authenticator", sort: 2 },
                    { provider: 'CUSTOM', type: 'token:hotp', icon: 'hotp', name: factor.vendorName, sort: 3 },
                    { provider: 'OKTA', type: 'sms', icon: "sms", name: "SMS Authentication", sort: 4 },
                    { provider: 'OKTA', type: 'call', icon: "call", name: "Voice Call Authentication", sort: 5 },
                    { provider: 'OKTA', type: 'email', icon: "email", name: "Email Authentication", sort: 6 },
                    { provider: 'OKTA', type: 'question', icon: "question", name: "Security Question", sort: 7 }
                ];
                const type = factor.factorType;
                const supported = supportedFactors.find(f => f.provider == factor.provider && f.type == type);
                if (!supported || factor.status != 'ACTIVE') return { supported: false };
                const { icon, name, sort } = supported;
                const radio = `<label><input type=radio name=factor value='${factor.id}'><span class="mfa-${icon}-30 valign-middle margin-l-10 margin-r-5"></span>` +
                    `${name}</label><br>`;
                if (type == 'question') {
                    var html = '<br>' + e(factor.profile.questionText) + '<br>';
                    var inputType = 'password';
                    var field = 'answer';
                } else {
                    html = ' Code';
                    inputType = 'text';
                    field = 'passCode';
                }
                return { id: factor.id, supported: true, sort, radio, type, name, html, inputType, field };
            }
            const verifyPopup = createPopup("Verify Factors");
            try {
                var factors = await getJSON(`/api/v1/users/${userId}/factors`);
            } catch (err) {
                verifyPopup.html(e(err.responseJSON.errorSummary));
                return;
            }
            factors = factors.map(mapFactors).filter(f => f.supported).sort((f1, f2) => f1.sort - f2.sort);
            if (factors.length == 0) {
                verifyPopup.html("No supported factors were found.");
                return;
            }
            const html = factors.map(f => f.radio).join('');
            verifyPopup.html("<form id=factorForm>" + html + "<br><button class='link-button'>Next</button></form>");
            if (factors.length > 1) {
                factorForm.factor[0].checked = "checked";
            } else {
                factorForm.factor.checked = "checked";
            }
            factorForm.onsubmit = function () {
                const factor = factors.find(f => f.id == this.factor.value);
                const url = `/api/v1/users/${userId}/factors/${factor.id}/verify`;
                if (factor.type == "push") {
                    postJSON({ url }).then(response => {
                        const intervalMs = 4000; // time in ms.
                        verifyPopup.html(response.factorResult);
                        const intervalID = setInterval(async () => {
                            const url = new URL(response._links.poll.href);
                            const poll = await getJSON(url.pathname);
                            verifyPopup.html(poll.factorResult);
                            if (poll.factorResult != "WAITING") {
                                clearInterval(intervalID);
                            }
                        }, intervalMs);
                    }).fail(jqXHR => verifyPopup.html(e(jqXHR.responseJSON.errorSummary)));
                } else {
                    if (factor.type == "sms" || factor.type == "call" || factor.type == "email") {
                        postJSON({ url })
                            .fail(jqXHR => verifyPopup.html(e(jqXHR.responseJSON.errorSummary)));
                    }
                    verifyPopup.html("");
                    const verifyForm = verifyPopup[0].appendChild(document.createElement("form")); // Cuz "<form>" didn't work.
                    verifyForm.innerHTML = factor.name + '<br><div id=error></div>' + factor.html + ` <br><input id=answer type=${factor.inputType} autocomplete=off><br>` +
                        "<button class='link-button'>Verify</button>";
                    answer.focus(); // Cuz "autofocus" didn't work.
                    verifyForm.onsubmit = function () {
                        const data = {};
                        data[factor.field] = answer.value;
                        postJSON({ url, data })
                            .then(response => verifyPopup.html(response.factorResult))
                            .fail(jqXHR => error.innerHTML = '<br>' + e(jqXHR.responseJSON.errorSummary));
                        return false; // Cancel form.
                    };
                }
                return false; // Cancel form.
            };
        });

        createDiv("Administrator Roles", mainPopup, function () {
            var allRoles = [
                { type: "SUPER_ADMIN", label: "Super" },
                { type: "ORG_ADMIN", label: "Organization" },
                { type: "APP_ADMIN", label: "Application" },
                { type: "USER_ADMIN", label: "Group" }, // not "User"
                { type: "HELP_DESK_ADMIN", label: "Help Desk" },
                { type: "GROUP_MEMBERSHIP_ADMIN", label: "Group Membership" },
                { type: "READ_ONLY_ADMIN", label: "Read Only" },
                { type: "MOBILE_ADMIN", label: "Mobile" },
                { type: "API_ACCESS_MANAGEMENT_ADMIN", label: "API Access Management" },
                { type: "REPORT_ADMIN", label: "Report" }
            ];
            var rolesPopup = createPopup("Administrator Roles");
            showRoles();
            function showRoles() {
                getJSON(`/api/v1/users/${userId}/roles`).then(roles => {
                    if (roles.length == 0) {
                        rolesPopup.html("This user is not an admin.<br><br>");
                        allRoles.forEach(role => {
                            createDiv(`Grant ${role.label} Administrator`, rolesPopup, function () {
                                rolesPopup.html("Loading...");
                                var data = {
                                    type: role.type
                                };
                                // https://developer.okta.com/docs/api/resources/roles#assign-role-to-user
                                postJSON({
                                    url: `/api/v1/users/${userId}/roles`,
                                    data
                                }).then(() => setTimeout(showRoles, 1000))
                                    .fail(jqXHR => rolesPopup.html(e(jqXHR.responseJSON.errorSummary) + "<br><br>"));
                            });
                        });
                    } else {
                        rolesPopup.html("");
                        roles.forEach(role => {
                            if (role.label == "User Administrator") role.label = "Group Administrator"; // not "User"
                            createDiv(`Revoke ${role.label}`, rolesPopup, function () {
                                rolesPopup.html("Loading...");
                                // https://developer.okta.com/docs/api/resources/roles#unassign-role-from-user
                                deleteJSON(`/api/v1/users/${userId}/roles/${role.id}`)
                                    .then(() => setTimeout(showRoles, 1000))
                                    .fail(jqXHR => rolesPopup.html(e(jqXHR.responseJSON.errorSummary) + "<br><br>"));
                            });
                        });
                    }
                }).fail(jqXHR => rolesPopup.html(e(jqXHR.responseJSON.errorSummary) + "<br><br>"));
            }
        });

        createDiv("Set Password", mainPopup, function () {
            const passwordPopup = createPopup("Set Password");
            const passwordForm = passwordPopup[0].appendChild(document.createElement("form")); // Cuz "<form>" didn't work.
            passwordForm.innerHTML = "<input id=newPassword type=password><br><button class='link-button'>Set</button>";
            newPassword.focus(); // Cuz "autofocus" didn't work.
            passwordForm.onsubmit = function (event) {
                const url = `/api/v1/users/${userId}`; // TODO: `/api/v1/users/${userId}/lifecycle/expire_password?tempPassword=false`
                const data = {
                    credentials: {
                        password: {
                            value: newPassword.value
                        }
                    }
                };
                postJSON({ url, data })
                    .then(() => passwordPopup.html("Password set."))
                    .fail(jqXHR => passwordPopup.html(e(jqXHR.responseJSON.errorCauses[0].errorSummary)));
                event.preventDefault();
            };
        });

        createDiv('Show Linked Objects', mainPopup, async function () {
            const loPopup = createPopup('Linked Objects');
            const los = await getJson('/api/v1/meta/schemas/user/linkedObjects');
            for (const lo of los) {
                getLink(lo.primary);
                getLink(lo.associated);
            }
            async function getLink(lo) {
                const div = loPopup[0].appendChild(document.createElement('div'));
                div.innerHTML = e(lo.title) + '<br>Loading...<br><br>';
                const userId = location.pathname.split('/').pop();
                const links = await getJson(`/api/v1/users/${userId}/linkedObjects/${lo.name}`);

                const rows = await Promise.all(links.map(async link => {
                    const user = await getJson(new URL(link._links.self.href).pathname);
                    return `${user.profile.firstName} ${user.profile.lastName} (${user.profile.email})`.link(`/admin/user/profile/view/${user.id}`);
                }));
                div.innerHTML = e(lo.title) + '<br>' + (rows.length ? rows.sort().join('<br>') : '(none)') + '<br><br>';
            }
            async function getJson(url) {
                const r = await fetch(location.origin + url);
                return r.json();
            }
        });
    }

    function directoryGroups() {
        createDiv("Search Groups", mainPopup, function () {
            var popup = createPopup("Search Groups with Name Containing");
            var form = $("<form>Name <input class=name style='width: 300px'> " +
                "<input type=submit value=Search></form><br><div class=results></div>").appendTo(popup);
            form.submit(event => {
                popup.find("div.results").html("Loading...");
                getJSON("/api/v1/groups").then(groups => {
                    groups = groups
                        .filter(group => group.profile.name.match(new RegExp(form.find("input.name").val(), "i")))
                        .map(group => e(group.profile.name).link("/admin/group/" + group.id));
                    if (groups.length > 0) {
                        var results = groups.join("<br>");
                    } else {
                        results = "Not found";
                    }
                    popup.find("div.results").html(results);
                });
                event.preventDefault();
            });
            form.find("input.name").focus();
        });
        createDiv("Search Groups (experimental)", mainPopup, () => {
            const object = {
                url: "/api/v1/groups?expand=stats",
                data() { this.match = new RegExp(this.search, "i"); return { limit: this.limit }; },
                filter: group => group.profile.name.match(object.match),
                limit: 10000,
                comparer: (group1, group2) => group1.profile.name.localeCompare(group2.profile.name),
                template(group) {
                    const logo = group._links.logo[0].href.split('/')[7].split('-')[0].replace(/odyssey/, 'okta');
                    return `<tr><td class=column-width><span class='icon icon-24 group-logos-24 logo-${logo}'></span>` +
                        `<td><a href="/admin/group/${group.id}">${e(group.profile.name)}</a>` +
                        `<td>${e(group.profile.description || "No description")}` +
                        `<td>${group._embedded.stats.usersCount}` +
                        `<td>${group._embedded.stats.appsCount}` +
                        `<td>${group._embedded.stats.groupPushMappingsCount}`;
                },
                headers: "<tr><th>Source<th>Name<th>Description<th>People<th>Apps<th>Directories",
                placeholder: "Search name with wildcard...",
                empty: true
            };
            searcher(object);
        });
    }

    function securityAdministrators() {
        createDiv("Export Administrators", mainPopup, function () { // TODO: consider merging into exportObjects(). Will the Link headers be a problem?
            const adminsPopup = createPopup("Administrators");
            adminsPopup.html('This report has been deprecated. Please use the built-in report.');
        });
    }
    function systemLog() {
        createDiv("Expand All", mainPopup, () => {
            $(".row-expander").each(function () { this.click() });
            $(".expand-all-details a").each(function () { this.click() });
        });
        createDiv("Expand Each Row", mainPopup, () => {
            $(".row-expander").each(function () { this.click() });
        });
    }
    function activeDirectory() {
        createDiv("Add OU Tooltips", mainPopup, () => {
            addTooltips("user");
            addTooltips("group");

            function addTooltips(type) {
                var els = document.querySelectorAll("#orgunittree input");
                if (!els.length) els = document.querySelectorAll("#ad-import-ou-" + type + "-picker input");
                els.forEach(el => {
                    el.parentNode.title = el.value;
                    //el.previousSibling.click();
                });
            }
        });
        createDiv("Export OUs", mainPopup, () => {
            var ouPopup = createPopup("OUs");
            var ous = [];
            exportOUs("user");
            exportOUs("group");
            downloadCSV(ouPopup, ous.length + " OUs exported. ", "OU,type", ous, "AD OUs");

            function exportOUs(type) {
                var els = document.querySelectorAll("." + type + "outreenode.tree-element-chosen");
                if (!els.length) els = document.querySelectorAll("#ad-import-ou-" + type + "-picker input:checked.ou-checkbox-tree-item");
                els.forEach(el => ous.push(toCSV(el.value, type)));
            }
        });
    }
    function identityProviders() {
        createDiv("SAML IdPs", mainPopup, () => {
            getJSON(`/api/v1/idps?type=SAML2`).then(idps => {
                getJSON('/api/v1/idps/credentials/keys').then(keys => {
                    var idpPopup = createPopup("SAML IdPs");
                    var rows = "<tr><th>Name<th>Certificate Expires On<th>Days from today";
                    idps.forEach(idp => {
                        var key = keys.find(key => key.kid == idp.protocol.credentials.trust.kid);
                        var days = Math.trunc((new Date(key.expiresAt) - new Date()) / 1000 / 60 / 60 / 24);
                        var style = days < 30 ? "style='background-color: red; color: white'" : "";
                        rows += `<tr><td>${e(idp.name)}<td>${e(key.expiresAt)}<td ${style}}'>${days}`;
                    });
                    idpPopup.html(`<table class='data-list-table' style='border: 1px solid #ddd;'>${rows}</table>`);
                });
            });
        });
    }

    function exportObjects() {
        var exportPopup;
        var total;
        var totalBytes;
        var objectType;
        var template;
        var header;
        var lines;
        var userId;
        var appId;
        var groupId;
        var cancel;
        var _expand;
        if (location.pathname == "/admin/users") {
            // see also Reports > Reports, Okta Password Health: https://ORG-admin.oktapreview.com/api/v1/users?format=csv
            createDiv("Export Users", mainPopup, () => exportUsers("Users", "/api/v1/users", true));
        } else if (location.pathname.match("/admin/groups")) {
            createDiv("Export Groups", mainPopup, function () {
                startExport("Groups", "/api/v1/groups", "id,name,description,type",
                    group => toCSV(group.id, group.profile.name, group.profile.description || "", group.type));
            });
            createDiv("Export Groups with User and App Counts", mainPopup, function () {
                startExport("Groups", "/api/v1/groups?expand=stats&limit=1000", "id,name,description,type,usersCount,appsCount",
                    group => toCSV(group.id, group.profile.name, group.profile.description || "", group.type, group._embedded.stats.usersCount, group._embedded.stats.appsCount), 'stats');
            });
            createDiv("Export Group Rules", mainPopup, function () {
                startExport("Group Rules", "/api/v1/groups/rules", "id,name,status,if,assignToGroupIds,countOfExcludedUsers",
                    rule => toCSV(rule.id, rule.name, rule.status, rule.conditions.expression.value, rule.actions.assignUserToGroups.groupIds.join(";"), rule.conditions.people ? rule.conditions.people.users.exclude.length : 0));
            });
        } else if (location.pathname == "/admin/apps/active") {
            createDiv("Export Apps", mainPopup, function () {
                startExport("Apps", "/api/v1/apps", "id,label,name,userNameTemplate,features,signOnMode,status,embedLinks",
                    app => toCSV(app.id, app.label, app.name, app.credentials.userNameTemplate.template, app.features.join(', '), app.signOnMode, app.status,
                        app._links.appLinks.map(a => a.href).join(', ')));
            });
            createDiv("Export App Notes (experimental)", mainPopup, function () {
                startExport("App Notes", "/api/v1/apps?limit=2", "id,label,name,userNameTemplate,features,signOnMode,status,endUserAppNotes,adminAppNotes", async app => {
                    var response = await fetch(`${location.origin}/admin/app/${app.name}/instance/${app.id}/settings/general`);
                    var html = await response.text();
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(html, "text/html");
                    var enduserAppNotes = doc.getElementById("settings.enduserAppNotes") ? doc.getElementById("settings.enduserAppNotes").innerHTML : "";
                    var adminAppNotes = doc.getElementById("settings.adminAppNotes") ? doc.getElementById("settings.adminAppNotes").innerHTML : "";
                    return toCSV(app.id, app.label, app.name, app.credentials.userNameTemplate.template, app.features.join(', '), app.signOnMode, app.status, enduserAppNotes, adminAppNotes);
                });
            });

            createDiv("Export App Sign On Policies (experimental)", mainPopup, function () {
                startExport("App Sign On Policies", "/api/v1/apps?limit=2", "id,label,name,userNameTemplate,features,signOnMode,status,policies", async app => {
                    var response = await fetch(`${location.origin}/admin/app/instance/${app.id}/app-sign-on-policy-list`);
                    var html = await response.text();
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(html, "text/html");
                    const rows = [...doc.getElementsByTagName("tr")];
                    const policies = rows.map(r => r.innerText.replace(/ +\n+/g, '')).join('\n');
                    return toCSV(app.id, app.label, app.name, app.credentials.userNameTemplate.template, app.features.join(', '), app.signOnMode, app.status, policies);
                });
            });
            createDiv("Export Apps (custom)", mainPopup, function () {
                exportPopup = createPopup("Export Apps");
                exportPopup.append("<br>Columns to export");
                var checkboxDiv = $("<div style='overflow-y: scroll; height: 152px; width: 300px; border: 1px solid #ccc;'></div>").appendTo(exportPopup);

                function addCheckbox(value, text) {
                    const checked = exportColumns.includes(value) ? "checked" : "";
                    checkboxDiv.html(checkboxDiv.html() + `<label><input type=checkbox value='${e(value)}' ${checked}>${e(text)}</label><br>`);
                }
                const app = {
                    id: "App Id",
                    name: "Name",
                    label: "Label",
                    status: "Status",
                    created: "Created Date",
                    lastUpdated: "Last Updated Date",
                    signOnMode: "Sign On Mode",
                    features: "Features",
                    "credentials.userNameTemplate.template": "Username Template",
                    "settings.app.identityProviderArn": "AWS Identity Provider ARN",
                    "settings.signOn.ssoAcsUrl": "SSO ACS URL",
                    "settings.app.postBackURL": "Post Back URL",
                    "_links.embedLinks": "Embed Links"
                };
                const defaultColumns = "id,label,name,credentials.userNameTemplate.template,features,signOnMode,status";
                const exportColumns = (localStorage.rockstarExportAppColumns || defaultColumns).replace(/ /g, "").split(",");
                for (const p in app) addCheckbox(p, app[p]);

                var exportArgs = localStorage.rockstarExportAppArgs || "";
                exportPopup.append(`<br><br>Query or Filter&nbsp;&nbsp;` +
                    `<a href='https://developer.okta.com/docs/reference/api/apps/#list-applications' target='_blank' rel='noopener'>Help</a><br>` +
                    `<input id=exportargs list=parlist value='${e(exportArgs)}' style='width: 300px'><br><br>` +
                    `<div id=error>&nbsp;</div><br>` +
                    `<datalist id=parlist><option>q=amazon_aws<option>filter=status eq "ACTIVE"<option>filter=status eq "INACTIVE"</datalist>`);
                createDivA("Export", exportPopup, function () {
                    exportArgs = $("#exportargs").val();
                    var exportHeaders = [];
                    var exportColumns = [];
                    checkboxDiv.find("input:checked").each(function () {
                        exportHeaders.push(this.parentNode.textContent);
                        exportColumns.push(this.value);
                    });
                    if (exportHeaders.length) {
                        $("#error").html("&nbsp;");
                        exportHeaders = exportHeaders.join(",");
                        localStorage.rockstarExportAppColumns = exportColumns.join(",");
                        localStorage.rockstarExportAppArgs = exportArgs;
                        startExport("Apps", `/api/v1/apps?${exportArgs}`, exportHeaders, app => {
                            app._links.embedLinks = app._links.appLinks.map(a => a.href).join(', ');
                            return toCSV(...fields(app, exportColumns));
                        });
                    } else {
                        $("#error").html("Select at least 1 column.");
                    }
                });
            });
        } else if (location.pathname == "/admin/access/networks") {
            createDiv("Export Networks", mainPopup, function () {
                startExport("Zones", "/api/v1/zones", "id,name,gateways,gatewayType,zoneType",
                    zone => toCSV(zone.id, zone.name, zone.gateways && zone.gateways.map(gateway => gateway.value).join(', '),
                        zone.gateways && zone.gateways.map(gateway => gateway.type).join(', '), zone.type));
            });
        } else if (location.pathname.match("/admin/devices-inventory")) {
            createDiv("Export Devices", mainPopup, function () {
                startExport("Devices", "/api/v1/devices", "id,displayName,platform,manufacturer,model,osVersion,serialNumber,imei,meid,udid,sid",
                    device => toCSV(device.id, device.profile.displayName, device.profile.platform, device.profile.manufacturer, device.profile.model,
                        device.profile.osVersion, device.profile.serialNumber, device.profile.imei, device.profile.meid, device.profile.udid, device.profile.sid));
            });
        } else if (location.pathname == "/reports/user/yubikey") {
            createDiv("Export YubiKeys", mainPopup, function () {
                startExport("YubiKeys", "/api/v1/org/factors/yubikey_token/tokens?expand=user", "keyId,serial,status,userId,firstName,lastName,login,lastVerified",
                    token => toCSV(token.id, token.profile.serial, token.status, token._embedded?.user.id, token._embedded?.user.profile.firstName,
                        token._embedded?.user.profile.lastName, token._embedded?.user.profile.login, token.lastVerified), 'user');
            });
        } else if (location.pathname == "/admin/universaldirectory") {
            createDiv("Export Mappings", mainPopup, function () {
                startExport("Mappings", "/api/v1/mappings", "id,sourceId,sourceName,sourceType,targetId,targetName,targetType",
                    mapping => toCSV(mapping.id, mapping.source.id, mapping.source.name, mapping.source.type,
                        mapping.target.id, mapping.target.name, mapping.target.type));
            });
        } else if (userId = getUserId()) {
            createDiv("Export Group Memberships", mainPopup, function () {
                startExport("Group Memberships", `/api/v1/users/${userId}/groups`, "id,name,description,type",
                    group => toCSV(group.id, group.profile.name, group.profile.description || "", group.type));
            });
        } else if (appId = getAppId()) {
            const atos = a => a ? a.join(";") : "";
            createDiv("Export App Users", mainPopup, function () {
                startExport("App Users", `/api/v1/apps/${appId}/users?limit=500`, "id,userName,scope,externalId,firstName,lastName,syncState,salesforceGroups,samlRoles,groupName",
                    appUser => toCSV(appUser.id, appUser.credentials ? appUser.credentials.userName : "", appUser.scope, appUser.externalId,
                        appUser.profile.firstName, appUser.profile.lastName, appUser.syncState, atos(appUser.profile.salesforceGroups), atos(appUser.profile.samlRoles), appUser._links.group?.name));
            });
            createDiv("Export App Groups", mainPopup, function () {
                startExport("App Groups", `/api/v1/apps/${appId}/groups?expand=group`,
                    "id,name,licenses,roles,role,salesforceGroups,featureLicenses,publicGroups",
                    appGroup => toCSV(appGroup.id, appGroup._embedded.group.profile.name, atos(appGroup.profile.licenses),
                        atos(appGroup.profile.roles), appGroup.profile.role, atos(appGroup.profile.salesforceGroups),
                        atos(appGroup.profile.featureLicenses), atos(appGroup.profile.publicGroups)), 'group');
            });
        } else if (groupId = getGroupId()) {
            createDiv("Export Group Members", mainPopup, function () {
                startExport("Group Members", `/api/v1/groups/${groupId}/users`, "id,login,firstName,lastName,status",
                    user => toCSV(user.id, user.profile.login, user.profile.firstName, user.profile.lastName, user.status));
            });
            createDiv("Export Group Members (custom)", mainPopup, () => exportUsers('Group Members', `/api/v1/groups/${groupId}/users`, false));
            // TODO: what to do here?
            // } else {
            //     exportPopup = createPopup("Export");
            //     exportPopup.html("Error. Go to one of these:<br><br>" +
            //         "<a href='/admin/users'>Directory > People</a><br>" +
            //         "<a href='/admin/groups'>Directory > Groups</a><br>" +
            //         "<a href='/admin/people/directories'>Directory > Directory Integrations</a> and click on a Directory<br>" +
            //         "<a href='/admin/apps/active'>Applications > Applications</a> and click on an App<br>" +
            //         "<a href='/admin/apps/active'>Applications > Applications</a> to export Apps<br>" +
            //         "<a href='/admin/access/networks'>Security > Networks</a><br>");
        }
        function exportUsers(o, url, filter) {
            exportPopup = createPopup("Export " + o);
            exportPopup.append("<br>Columns to export");
            var errorBox = $('<div style="background-color: #ffb;"></div>').appendTo(exportPopup);
            var checkboxDiv = $("<div style='overflow-y: scroll; height: 152px; width: 500px; border: 1px solid #ccc;'></div>").appendTo(exportPopup);

            function addCheckbox(value, text) {
                const checked = exportColumns.includes(value) ? "checked" : "";
                checkboxDiv.html(checkboxDiv.html() + `<label><input type=checkbox value='${e(value)}' ${checked}>${e(text)}</label><br>`);
            }
            const user = {
                id: "User Id",
                status: "Status",
                created: "Created Date",
                activated: "Activated Date",
                statusChanged: "Status Changed Date",
                lastLogin: "Last Login Date",
                lastUpdated: "Last Updated Date",
                passwordChanged: "Password Changed Date",
                transitioningToStatus: "Transitioning to Status",
                'type.id': 'User Type ID',
                'credentials.recovery_question.question': 'Credential Recovery Question',
                "credentials.provider.type": "Credential Provider Type",
                "credentials.provider.name": "Credential Provider Name"
            };
            const defaultColumns = "id,status,profile.login,profile.firstName,profile.lastName,profile.email";
            const exportColumns = (localStorage.rockstarExportUserColumns || defaultColumns).replace(/ /g, "").split(",");
            for (const p in user) addCheckbox(p, user[p]);
            getJSON("/api/v1/meta/schemas/user/default").then(schema => {
                const base = schema.definitions.base.properties;
                const custom = schema.definitions.custom.properties;
                for (const p in base) addCheckbox("profile." + p, base[p].title);
                for (const p in custom) addCheckbox("profile." + p, custom[p].title);
            }).fail(() => {
                const profile = {
                    login: "Username",
                    firstName: "First name",
                    lastName: "Last name",
                    middleName: "Middle name",
                    honorificPrefix: "Honorific prefix",
                    honorificSuffix: "Honorific suffix",
                    email: "Primary email",
                    title: "Title",
                    displayName: "Display name",
                    nickName: "Nickname",
                    profileUrl: "Profile Url",
                    secondEmail: "Secondary email",
                    mobilePhone: "Mobile phone",
                    primaryPhone: "Primary phone",
                    streetAddress: "Street address",
                    city: "City",
                    state: "State",
                    zipCode: "Zip code",
                    countryCode: "Country code",
                    postalAddress: "Postal Address",
                    preferredLanguage: "Preferred language",
                    locale: "Locale",
                    timezone: "Time zone",
                    userType: "User type",
                    employeeNumber: "Employee number",
                    costCenter: "Cost center",
                    organization: "Organization",
                    division: "Division",
                    department: "Department",
                    managerId: "Manager Id",
                    manager: "Manager"
                };
                for (const p in profile) addCheckbox("profile." + p, profile[p]);
                errorBox.html('Unable to fetch custom attributes. Use an account with more privileges.<br>Only base attributes shown below.');
            });

            if (filter) {
                var exportArgs = localStorage.rockstarExportUserArgs || "";
                exportPopup.append(
                    `<form><br><br>Query, Filter, or Search&nbsp;&nbsp;` +
                    `<a href='https://developer.okta.com/docs/reference/api/users/#list-users' target='_blank' rel='noopener'>Help</a><br>` +
                    `<input id=exportargs list=parlist value='${e(exportArgs)}' style='width: 500px'>` +
                    `<datalist id=parlist><option>q=Smith<option>filter=status eq "DEPROVISIONED"<option>filter=profile.lastName eq "Smith"` +
                    `<option>search=status eq "DEPROVISIONED"<option>search=profile.lastName eq "Smith"</datalist>` +
                    `<br><br><a href='https://developer.okta.com/docs/reference/api/users/#list-users' target='_blank' rel='noopener'>Help</a>` +
                    `<br><br>By default, Okta lists all users who do not have a status of DEPROVISIONED.<br><br>` +
                    `Query lists up 10 users; query by first name, last name or email.<br><br>` +
                    `Filter lists all users; filter by status, last updated, id, login, email, first name or last name.<br><br>` +
                    `Search lists all users; search by any user profile property, including custom-defined<br>` +
                    `properties, and id, status, created, activated, status changed and last updated.</form>`);
            }
            exportPopup.append(`<br><br><div id=error>&nbsp;</div><br>`);
            createDivA("Export", exportPopup, function () {
                var exportHeaders = [];
                var exportColumns = [];
                checkboxDiv.find("input:checked").each(function () {
                    exportHeaders.push(this.parentNode.textContent);
                    exportColumns.push(this.value);
                });
                if (exportHeaders.length) {
                    $("#error").html("&nbsp;");
                    exportHeaders = exportHeaders.join(",");
                    localStorage.rockstarExportUserColumns = exportColumns.join(",");
                    var localUrl = url; // Don't modify url!
                    if (filter) {
                        exportArgs = $("#exportargs").val();
                        if (exportArgs.startsWith("?")) exportArgs = exportArgs.slice(1);
                        localStorage.rockstarExportUserArgs = exportArgs;
                        localUrl += '?' + exportArgs;
                    }
                    startExport(o, localUrl, exportHeaders, user => toCSV(...fields(user, exportColumns)));
                } else {
                    $("#error").html("ERROR: Select at least 1 column.");
                }
            });
        }
        function startExport(title, url, headerRow, templateCallback, expand) {
            total = 0;
            totalBytes = 0;
            objectType = title;
            exportPopup = createPopup(title);
            exportPopup.html("Loading ...");
            template = templateCallback;
            header = headerRow;
            _expand = expand;
            lines = [];
            cancel = false;
            getJSON(url).then(getObjects).fail(failObjects);
        }
        function getObjects(objects, status, jqXHR) {
            for (var i = 0; i < objects.length; i++) {
                var object = objects[i];
                var line = template(object);
                if (line.then) {
                    line.then(ln => lines.push(ln + '\n'));
                } else {
                    lines.push(line + '\n');
                    totalBytes += line.length + 1;
                }
            }
            total += objects.length;
            exportPopup.html(total.toLocaleString() + " " + objectType + "...<br>~" + totalBytes.toLocaleString() + ' bytes<br><br>');
            createDivA("Cancel", exportPopup, () => cancel = true);
            if (cancel) {
                exportPopup.parent().remove();
                return;
            }
            var link = jqXHR.getResponseHeader("Link");
            var links = link ? getLinks(link) : null;
            var paginate = links && links.next;
            if (paginate) {
                var nextUrl = new URL(links.next); // links.next is an absolute URL; we need a relative URL.
                var url = nextUrl.pathname + nextUrl.search;
                if (_expand) url += '&expand=' + _expand; // TODO: improve this.
                var remaining = jqXHR.getResponseHeader("X-Rate-Limit-Remaining");
                if (remaining && remaining < 10) {
                    var intervalID = setInterval(() => {
                        exportPopup.html(exportPopup.html() + "<br>Sleeping...");
                        if ((new Date()).getTime() / 1000 > jqXHR.getResponseHeader("X-Rate-Limit-Reset")) {
                            clearInterval(intervalID);
                            getJSON(url).then(getObjects).fail(failObjects);
                        }
                    }, 1000);
                } else {
                    getJSON(url).then(getObjects).fail(failObjects);
                }
            } else {
                if (total == lines.length) {
                    downloadCSV(exportPopup, total.toLocaleString() + " " + objectType + " exported, ~" + (totalBytes + header.length).toLocaleString() + ' bytes. ', header, lines, `Export ${objectType}`);
                } else {
                    exportPopup.html("Processing..."); // Wait for other fetches to finish.
                    var intervalID = setInterval(() => {
                        if (total == lines.length) {
                            downloadCSV(exportPopup, total.toLocaleString() + " " + objectType + " exported, ~" + (totalBytes + header.length).toLocaleString() + ' bytes. ', header, lines, `Export ${objectType}`);
                            clearInterval(intervalID);
                        }
                    }, 300);
                }
            }
        }
        function failObjects(jqXHR) {
            exportPopup.html("<br>Error: " + e(jqXHR.responseJSON.errorSummary));
        }
        function fields(o, fields) {
            var a = [];
            for (var f in fields) {
                a.push(dot(o, fields[f]));
            }
            return a;
        }
        function getUserId() {
            var path = location.pathname;
            var pathparts = path.split('/');
            if (path.match("admin/user") && (pathparts.length == 6)) {
                return pathparts[5];
            }
        }
        function getAppId() {
            var path = location.pathname;
            var pathparts = path.split('/');
            if (path.match("admin/app") && (pathparts.length == 6 || pathparts.length == 7)) {
                return pathparts[5];
            }
        }
        function getGroupId() {
            var path = location.pathname;
            var pathparts = path.split('/');
            if (path.match("admin/group") && (pathparts.length == 4)) {
                return pathparts[3];
            }
        }
    }

    // User functions
    function userHome() {
        createDiv("Show SSO", mainPopup, function () {
            var ssoPopup;
            var label = "Show SSO";
            var labels = document.getElementsByClassName("app-button-name");
            // if (labels.length == 0) { // New homepage
            //     labels = document.getElementsByClassName('chiclet--app-title');
            //     if (labels.length == 0) return;
            //     $('.chiclet--action').click(() => {
            //         setTimeout(() => {
            //             $('<div>Show SSO</div>').appendTo('.app-settings--launch-app').click(console.log);
            //         }, 1000);
            //     })
            // } else 
            if (labels.length > 0) { // Button labels on old Okta homepage
                for (var i = 0; i < labels.length; i++) {
                    if (!labels[i].innerHTML.match(label)) {
                        var a = document.createElement("a");
                        a.onclick = function () {
                            getDiv();
                            getSSO(this.parentNode.previousSibling.previousSibling.href);
                        };
                        if (labels[i].clientHeight <= 17) {
                            a.innerHTML = "<br>" + label;
                        } else {
                            a.innerHTML = " - " + label;
                        }
                        a.style.cursor = "pointer";
                        labels[i].appendChild(a);
                    }
                }
            } else {
                getDiv();
                var form = ssoPopup[0].appendChild(document.createElement("form"));
                var url = form.appendChild(document.createElement("input"));
                url.style.width = "700px";
                url.placeholder = "URL";
                url.focus();
                var input = form.appendChild(document.createElement("input"));
                input.type = "submit";
                input.value = label;
                form.onsubmit = function () {
                    getSSO(url.value);
                    return false; // cancel form submit
                };
            }
            function getSSO(url) {
                ssoPopup.html("Loading ...");
                url = url.replace(location.origin, '');
                getJSON(url).then(response => {
                    function unentity(s) {
                        return s.replace(/&#(x..?);/g, (m, p1) => String.fromCharCode("0" + p1));
                    }
                    var highlight = "style='background-color: yellow'";
                    var matches;
                    if (matches = response.match(/name="(SAMLResponse|wresult)".*value="(.*?)"/)) {
                        var assertion = unentity(matches[2]);
                        if (matches[1] == "SAMLResponse") assertion = atob(assertion);
                        console.log(assertion);
                        assertion = assertion.replace(/\n/g, "").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/&gt;&lt;/g, "&gt;\n&lt;")
                            .replace(/((SignatureValue|X509Certificate)&gt;.{80})(.*)&lt;/g, "$1<span title='$3' " + highlight + ">...</span>&lt;")
                            .replace(/((Address|Issuer|NameID|NameIdentifier|Name|AttributeValue|Audience|Destination|Recipient)(.*&gt;|="|=&quot;))(.*?)(&lt;|"|&quot;)/g,
                                "$1<span " + highlight + ">$4</span>$5");
                        var postTo = unentity(response.match(/<form id="appForm" action="(.*?)"/)[1]);
                        ssoPopup.html("Post to: " + postTo + "<br><br><pre>" + indentXml(assertion, 4) + "</pre>");
                    } else if (matches = response.match(/<form(?:.|\n)*<\/form>/)) {
                        var form = matches[0].replace(/ *</g, "&lt;").replace(/>/g, "&gt;").
                            replace(/value="(.*?)"/g, 'value="<span title="$1" ' + highlight + '>...</span>"');
                        ssoPopup.html(`<pre>${form}</pre>`);
                    } else if (matches = response.match(/<div class="error-content">(?:.|\n)*?<\/div>/)) {
                        ssoPopup.html(`<pre>${matches[0]}</pre>`);
                    } else {
                        ssoPopup.html("Is this a SWA app, plugin or bookmark?");
                    }
                });
            }
            function getDiv() {
                ssoPopup = createPopup("SSO");
            }
            function indentXml(xml, size) {
                var lines = xml.split("\n");
                var level = 0;
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    var end = line.match("&lt;/");
                    var empty = line.match("/&gt;") || line.match(/&gt;.*&gt;/);
                    if (end && !empty) level--;
                    lines[i] = " ".repeat(size * level) + line;
                    if (!end && !empty) level++;
                }
                return lines.join("\n");
            }
        });
        getJSON(`/api/v1/sessions/me`).then(session => {
            const msg = "Expires in " + Math.round((new Date(session.expiresAt) - new Date()) / 60 / 1000) + " minutes";
            if ($(".icon-clock-light").length == 1) { // Old homepage
                $(".icon-clock-light").parent().append("<div>" + msg + "</div>");
            } else {
                setTimeout(() => $(".support-text[data-se='last-login-time']").attr('title', msg), 1000);
            }
        });
        apiExplorer();

        var tinyStyle;
        if (localStorage.rockstarTinyApps) tinyApps();
        createDiv("Tiny Apps", mainPopup, function () {
            localStorage.rockstarTinyApps = localStorage.rockstarTinyApps ? '' : 'true';
            tinyApps();
        });
        function tinyApps() {
            if (tinyStyle) {
                document.head.removeChild(tinyStyle);
                tinyStyle = null;
                return;
            }
            tinyStyle = document.head.appendChild(document.createElement('style'));
            tinyStyle.innerHTML = `
            .app-button-wrapper {
                width: 64px;
                margin: 12px 12px 12px 24px;
            }
            .app-button .logo {
                max-width: 60px;
            }
            .app-button-name {
                width: 100%;
            }`;
        }

        createDiv("All Tiny Apps", mainPopup, async function () {
            const response = await fetch(`${location.origin}/api/v1/users/me/appLinks`);
            const links = (await response.json())
                .sort((link1, link2) => link1.sortOrder < link2.sortOrder ? -1 : 1);
            const lis = links.map(link => `<li class='app-button-wrapper' style='width: 64px;'>` +
                `<a href='${link.linkUrl}' target='_blank' class='app-button' rel='noopener'>` +
                `<img src='${link.logoUrl}' class='logo' style='visibility: visible; max-width: 60px;'></a>` +
                `<p class='app-button-name' style='color: black; width: 100%; text-overflow: clip;'>${link.label}`);
            createPopup("Apps").html(`<ul>${lis.join('')}</ul>`);
        });

        var qa;
        var count = 0;
        const intervalID = setInterval(() => {
            qa = document.querySelector('div[data-se=quick-access-tab-container]');
            if (!qa) {
                count++;
                if (count == 25) clearInterval(intervalID);
                return;
            }
            new MutationObserver(function () {
                this.disconnect();
                quickAccess();
            }).observe(qa, { attributes: true, attributeFilter: ['style'] });
            createDiv("Quick Access", mainPopup, function () {
                localStorage.rockstarQuickAccess = localStorage.rockstarQuickAccess ? '' : 'true';
                quickAccess();
            });
            clearInterval(intervalID);
        }, 200);
        function quickAccess() {
            qa.hidden = localStorage.rockstarQuickAccess;
        }
    }

    // Start logs list functions
    function getBackuptaTenantId() {
        return location.host.replace(/(-admin)?\./g, '_');
    }

    function settings() {
        const configPopup = createPopup("Configuration");

        $(`<div class="infobox clearfix infobox-info">` +
            `<span class="icon info-16"></span>` +
            `<div>If you want to know more about Backupta, <a href="https://www.backupta.com/#how-to-buy" target=_blank>contact us</a>.</div>` +
            `</div>`).appendTo(configPopup);

        $(`<div style='padding: 20px 5px 5px 5px'>Tenant id: ${getBackuptaTenantId()}</div>`).appendTo(configPopup);

        // Create the input element and set the default value
        const backuptaUrlDiv = $("<div style='padding: 5px'>Backupta base URL: </div>").appendTo(configPopup);

        const saveDiv = $("<div style='padding: 5px'></div>").appendTo(configPopup);
        const saveButton = $("<input type='submit' value='Save' class='button-primary link-button' disabled />")
            .appendTo(saveDiv)
            .click(function () {
                const val = $('#backuptaUrlInput').val().replace(/\/$/, "");
                $('#backuptaUrlInput').val(val);
                localStorage.backuptaBaseUrl = $('#backuptaUrlInput').val();
                saveButton.attr('disabled', true);
            });

        $("<input type='text' id='backuptaUrlInput' placeholder='https://...'>")
            .val(localStorage.backuptaBaseUrl) // Set the default value
            .appendTo(backuptaUrlDiv)
            .keyup(function () {
                saveButton.attr('disabled', $(this).val() == localStorage.backuptaBaseUrl);
            })
            .focus();
    }

    // Generic function to create a popup with search bar
    function createPopupWithSearch(popupTitle, searchPlaceholder) {
        const logListPopup = createPopup(popupTitle);
        logListPopup.parent().attr('id', 'logListPopup');
        const searchInputHTML = `<input type='text' id='userSearch' style='margin-bottom: 10px' placeholder='${searchPlaceholder}'>`;
        logListPopup.prepend(searchInputHTML);
        return { logListPopup, searchInputHTML };
    }

    // Fetch and display log data using utility functions
    async function fetchDataAndDisplay(type) {
        const popupConfig = logListPopups[type];
        const { logListPopup, searchInputHTML } = createPopupWithSearch(popupConfig.title, popupConfig.searchPlaceholder);
        displayResultTable(popupConfig, logListPopup, searchInputHTML);

        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 90);
        const url = `${location.origin}/api/v1/logs?since=${sinceDate.toISOString()}&limit=10&filter=${popupConfig.oktaFilter}&sortOrder=DESCENDING`;
        await fetchMore(url, 10);
    }

    async function fetchMore(url, limit) {
        const response = await fetch(url.replace(/limit=\d+/, `limit=${limit}`), { headers });
        const logs = await response.json();
        if (logs.length === 0 || logs.length < limit) {
            $('#showMore').hide();
        }
        const links = getLinks(response.headers.get('Link'));
        appendResults(logs, links);
    }

    function appendResults(logs, links) {
        let targetHTML = '';
        logs.forEach(log => {
            if (log.target && log.target.length > 0) {
                log.target.forEach(target => {
                    targetHTML += `<tr class='data-list-item' data-displayname='${e(target.displayName)}'>` +
                        `<td><input type='checkbox' id='${e(target.id)}'>` +
                        `<td><label for='${e(target.id)}'>${e(target.displayName)}</label>` +
                        `<td>${e(target.id)}` +
                        `<td>${e(target.type)}` +
                        `<td>${e(log.actor.displayName)}` +
                        `<td>${log.published.substring(0, 19).replace('T', ' ')}`;
                });
            }
        });
        $('.data-list-table.rockstar tbody').append(targetHTML);
        const button = $('#showMore');
        button.off("click");
        button.on("click", () => fetchMore(links.next, 100));
    }

    function displayResultTable(popupConfig, logListPopup, searchInputHTML) {
        let targetHTML = "<table class='data-list-table rockstar' style='border: 1px solid #ddd;'><thead>" +
            "<tr><th>&nbsp;<th>Display Name<th>ID<th>Type<th>Deleted By<th>Deleted On" +
            "<tbody></tbody></table>" +
            "<div style='float: right'><a href='#' id='showMore'>Show more</a></div>" +
            "<div style='margin-top: 15px;'><button id='btnRestore'>Restore with Backupta</button></div>";
        logListPopup.html(targetHTML);
        $(logListPopup).prepend(searchInputHTML);

        btnRestore.onclick = function () {
            var baseUrl = localStorage.backuptaBaseUrl;
            if (!baseUrl) {
                settings();
                return;
            }
            var items = document.querySelectorAll(".data-list-table.rockstar input[type='checkbox']:checked");
            var ids = Array.from(items).map(item => item.id);
            var targetUrl = `${baseUrl}/${getBackuptaTenantId()}/changes?filter_by=${popupConfig.backuptaFilterBy};id:${ids.join(',')}`;
            open(targetUrl, '_blank');
        };

        $('#userSearch').on('keyup', function () {
            const searchVal = $(this).val().toLowerCase();
            $('.data-list-item').each(function () {
                const displayName = $(this).data('displayname').toLowerCase();
                if (displayName.includes(searchVal)) {
                    $(this).show();
                } else {
                    $(this).hide();
                }
            });
        });
    }

    // Main function to generate div and get logs.
    function openLogList(type) {
        createDiv(logListPopups[type].menuTitle, mainPopup, async function () {
            if ($("#logListPopup").length) {
                $("#logListPopup").remove();
                return;
            }
            await fetchDataAndDisplay(type);
        });
    }

    // API functions
    function apiExplorer() {
        createDiv("API Explorer", mainPopup, function () {
            var apiPopup = createPopup("API Explorer");
            var form = apiPopup[0].appendChild(document.createElement("form"));
            form.innerHTML = "<select id=method><option>GET<option>POST<option>PUT<option>PATCH<option>DELETE</select> " +
                "<input id=url list=urls> "; // HACK: input.list is read-only, must set it at create time. :(
            url.style.width = "700px";
            url.placeholder = "URL";
            url.focus();
            var datalist = form.appendChild(document.createElement("datalist"));
            datalist.id = "urls";
            const paths = 'apps,apps/${appId},apps/${appId}/groups,apps/${appId}/users,apps?filter=user.id eq "${userId}",authorizationServers,devices,eventHooks,features,' +
                'groups,groups/${groupId},groups/${groupId}/roles,groups/${groupId}/users,groups/rules,idps,inlineHooks,logs,mappings,policies?type=${type},' +
                'meta/schemas/apps/${instanceId}/default,meta/schemas/user/default,meta/schemas/user/linkedObjects,meta/types/user,sessions/me,templates/sms,trustedOrigins,' +
                'users,users/me,users/${userId},users/${userId}/appLinks,users/${userId}/factors,users/${userId}/groups,users/${userId}/roles,zones';
            datalist.innerHTML = paths.split(',').map(path => `<option>/api/v1/${path}`).join("") + "<option>/oauth2/v1/clients";
            var send = form.appendChild(document.createElement("input"));
            send.type = "submit";
            send.value = "Send";
            form.appendChild(document.createElement("div")).innerHTML = "<br>Body";
            var data = form.appendChild(document.createElement("textarea"));
            data.style.width = "850px";
            var results = form.appendChild(document.createElement("div"));
            form.onsubmit = function () {
                $(results).html("<br>Loading ...");
                var url = form.url.value;
                if (url.match(/\${.*}/) && location.pathname.match("/admin/(app|group|user)/")) {
                    var parts = location.pathname.split('/');
                    var id = location.pathname.match("/group/") ? parts[3] : parts[5];
                    url = url.replace(/\${[^}]+}/g, id);
                }
                requestJSON({ url, method: method.value, data: data.value }).then((objects, status, jqXHR) => {
                    $(results).html("<br>");
                    var linkHeader = jqXHR.getResponseHeader("Link"); // TODO: maybe show X-Rate-Limit-* headers, too.
                    if (linkHeader) {
                        $(results).html("<br>Headers<br><table><tr><td>Link<td>" + linkHeader.replace(/</g, "&lt;").replace(/, /g, "<br>") + "</table><br>");
                        var links = getLinks(linkHeader);
                        if (links.next) {
                            var nextUrl = new URL(links.next); // links.next is an absolute URL; we need a relative URL.
                            nextUrl = nextUrl.pathname + nextUrl.search;
                        }
                    }
                    $(results).append("Status: " + jqXHR.status + " " + jqXHR.statusText + "<br>");
                    if (objects) {
                        const pathname = url.split('?')[0];
                        var addId = false;
                        if (Array.isArray(objects)) {
                            var table = formatObjects(objects, pathname);
                            addId = true;
                            $(results).append(table.header);
                            if (nextUrl) { // This is part of the header.
                                createA("Next >", results, () => {
                                    form.url.value = nextUrl;
                                    send.click();
                                });
                            }
                            $(results).append("<br>" + table.body);
                        }
                        const json = formatPre(linkify(e(JSON.stringify(objects, null, 4))), pathname, addId); // Pretty Print the JSON.
                        $(results).append(json);
                    }
                }).fail(jqXHR => $(results).html("<br>Status: " + jqXHR.status + " " + jqXHR.statusText + "<br><br>Error:<pre>" + e(JSON.stringify(jqXHR.responseJSON, null, 4)) + "</pre>"));
                return false; // Cancel form submit.
            };
        });
    }
    function formatJSON() {
        let pre = document.getElementsByTagName("pre")[0]; // Don't use jQuery.
        if (!pre) return; // No pre element on page, nothing to format
        let objects = JSON.parse(pre.innerHTML);
        let json = linkify(e(JSON.stringify(objects, null, 4))); // Pretty Print the JSON.
        if (objects.errorCode == "E0000005") json = "Are you signed in? <a href=/>Sign in</a>\n\n" + json;
        if (Array.isArray(objects)) {
            document.head.innerHTML = "<style>body {font-family: Arial;} table {border-collapse: collapse;} tr:hover {background-color: #f9f9f9;} " +
                "td,th {border: 1px solid silver; padding: 4px;} th {background-color: #f2f2f2; text-align: left;}</style>";
            var table = formatObjects(objects, location.pathname);
            document.body.innerHTML = table.header + table.body + formatPre(json, location.pathname, true);
        } else {
            pre.innerHTML = json;
        }
    }
    function formatObjects(objects, url) {
        function addTh(o, n) {
            for (const p in o) {
                if (p == '_links') continue;
                const v = n ? n + '.' + p : p;
                if (typeof o[p] == 'object' && !Array.isArray(o[p]) && o[p] !== null) {
                    addTh(o[p], v);
                } else if (!ths.includes(v)) {
                    ths.push(v);
                }
            }
        }
        const ths = [];
        objects.forEach(o => addTh(o, '')); // DON'T DO: forEach(addTh), cuz forEach will send addTh extra arrghs!
        // ths.sort(); // (t1, t2) => t1.startsWith('_links') ? 1 : t2.startsWith('_links') ? -1 : t1.localeCompare(t2));
        const rows = [];
        objects.forEach(row => {
            const tds = [];
            for (const p of ths) {
                var v = p.includes('.') ? dot(row, p) : row[p];
                if (v === undefined) v = "";
                if (p == "id") {
                    v = "<a href='" + url + "/" + v + "'>" + e(v) + "</a>";
                } else if (typeof v == "object") {
                    v = "<pre>" + e(JSON.stringify(v, null, 4)) + "</pre>";
                } else {
                    v = e(v);
                }
                tds.push("<td>" + v);
            }
            rows.push("<tr>" + tds.join(""));
        });
        const len = "(length: " + objects.length + ")\n\n";
        return {
            header: "<span id=table><b>Table</b> <a href=#json>JSON</a><br><br>" + len + "</span>",
            body: "<br><table class='data-list-table' style='border: 1px solid #ddd; white-space: nowrap;'><tr><th>" + ths.join("<th>") + linkify(rows.join("")) + "</table><br>" +
                "<div id=json><a href=#table>Table</a> <b>JSON</b></div><br>" + len
        };
    }
    function formatPre(s, url, addId) {
        return "<pre>" + s.replace(/"id": "(.*)"/g, (match, id) => id.startsWith('<') ? match : `"id": "<a href="${url}${addId ? '/' + id : ''}">${id}</a>"`) + "</pre>";
    }
    function linkify(s) {
        return s.replace(/"(https?.*)"/g, '"<a href="$1">$1</a>"');
    }
    /*
    // This doesn't seem to work since the new dev site went up.
    function tryAPI() {
        var baseUrl = $(".orgUrl")[0];
        if (!baseUrl || baseUrl == "https://{yourOktaDomain}") {
            //baseUrl = "https://EXAMPLE.oktapreview.com"; // TODO it should fail after, eg, 10 s and set a default.
            setTimeout(tryAPI, 1000);
            return;
        }
        baseUrl = baseUrl.innerText;
    
        // TODO: in the resulting JSON, each "id", url [etc?] should be clickable, too.
        // TODO: show HTTP response headers (need to make a new request?)
        // TODO: eg, for /api/v1/users, show q/filter/search params in a textbox.
    
        $(".api-uri-get").each(function () {
            var get = $(this);
            var url = baseUrl + get.text().replace("GET ", "").replace("${userId}", "me");
            get.parent().append(` <a href='${url}' target='_blank'>Try me -></a>`);
        });
        $(".language-sh").each(function () {
            var get = $(this);
            var curl = get.text();
            var matches;
            if (matches = curl.match(/-X GET[^]*(https.*)"/)) { // [^] matches any character, including \n. `.` does not. The /s flag will fix this, eventually.
                var url = matches[1].replace(/\\/g, "");
                get.append(` <a href='${url}' target='_blank'>Try me -></a>`);
            }
        });
    }
    */

    // Util functions
    if ($) {
        var xsrf = $("#_xsrfToken");
        if (xsrf.length) $.ajaxSetup({ headers: { "X-Okta-XsrfToken": xsrf.text() } });
    }
    function createPopup(title, main) {
        function toggleClosed() {
            popupBody.toggleClass('rs_closed');
        }
        function toggleSide() {
            popup.toggleClass('rs_toggle');
        }
        const popup = $(`<div style='position: absolute; z-index: 1000; top: 0px; max-height: calc(100% - 28px); max-width: calc(100% - 28px); padding: 8px; margin: 4px; overflow: auto; ` +
            `background-color: white; border: 1px solid #ddd;'>` +
            `${main ? "<span class=title><span style='font-size: 18px;'>≡</span> " : "<span style='font-weight: bold'>"}${title}</span>` +
            `<div class='rockstarButtons' style='display: block; float: right;'>${main ? "<span class=toggleSide style='padding: 4px'> ⇄ </span><span class=minimize style='padding: 4px'> _ </span>" : ""} ` +
            (main ? `<a class='whatsNew'><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-wclassth="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg></a>` : '') +
            (main ? `<a class='settings'><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg></a> ` : '') +
            `<a href='https://gabrielsroka.github.io/rockstar/' target='_blank' rel='noopener'>?</a> ` +
            `<a class=close>X</a></div><br><br></div>`)
            .appendTo(document.body);
        const popupBody = $("<div></div>").appendTo(popup);
        popup.find('.close').click(() => popup.remove());
        if (main) {
            popup.find('.title').click(toggleClosed);
            popup.find('.minimize').click(() => {
                toggleClosed();
                localStorage.rockstarClosed = localStorage.rockstarClosed ? '' : 'true';
            });
            popup.find('.toggleSide').click(() => {
                toggleSide();
                localStorage.rockstarToggleSide = localStorage.rockstarToggleSide ? '' : 'true';
            });
            popup.find('.whatsNew').click(whatsNew);
            popup.find('.settings').click(settings);
            if (localStorage.rockstarClosed) toggleClosed();
            if (localStorage.rockstarToggleSide) toggleSide();
        }
        return popupBody;
    }
    function createA(html, parent, clickHandler) {
        createPrefixA("", html, parent, clickHandler);
    }
    function createPrefixA(prefix, html, parent, clickHandler) {
        $(`${prefix}<a style='cursor: pointer' class='icon-16'>${html}</a>`).appendTo(parent).click(clickHandler);
    }
    function createDivA(html, parent, clickHandler) {
        $(`<div><a style='cursor: pointer' class='link-button'>${html}</a></div>`).appendTo(parent).click(clickHandler);
    }
    function createDiv(html, parent, clickHandler) {
        $(`<div class=hoverDiv>${html}</div>`).appendTo(parent).click(clickHandler);
    }
    function getLinks(linkHeader) {
        var headers = linkHeader.split(/, */);
        var links = {};
        for (var i = 0; i < headers.length; i++) {
            var [, url, name] = headers[i].match(/<(.*)>; rel="(.*)"/);
            links[name] = url;
        }
        return links;
    }
    function getJSON(url) {
        return $.get({ url: location.origin + url, headers });
    }
    function postJSON(settings) {
        settings.url = location.origin + settings.url;
        settings.contentType = "application/json";
        settings.data = JSON.stringify(settings.data);
        settings.headers = headers;
        return $.post(settings);
    }
    function requestJSON(settings) {
        settings.url = location.origin + settings.url;
        settings.contentType = "application/json";
        settings.headers = headers;
        return $.ajax(settings);
    }
    function deleteJSON(url) {
        return $.ajax({ url: location.origin + url, headers, method: "DELETE" });
    }
    async function isOIE() {
        let data = await getJSON("/.well-known/okta-organization");
        return data.pipeline === "idx";
    }
    function searcher(object) { // TODO: Save search string in location.hash # in URL. Reload from there.
        function searchObjects() {
            var settings = {
                url: object.url,
                data: object.data(),
                headers
            };
            if (object.dataType == "text") {
                settings.dataType = "text";
                $.get(settings).then(text => {
                    const prefix = "while(1){};";
                    var json = text.slice(prefix.length); // text has a prefix to prevent JSON hijacking. We have to remove the prefix.
                    var data = JSON.parse(json);
                    var properties = data[object.properties].sColumns.split(',');
                    var objects = [];
                    for (var i = 0; i < data.aaData.length; i++) {
                        var obj = {};
                        for (var p = 0; p < properties.length; p++) {
                            obj[properties[p]] = data.aaData[i][p];
                        }
                        objects.push(obj);
                    }
                    showObjects(objects);
                });
            } else {
                settings.dataType = "json";
                $.getJSON(settings).then(objects => showObjects(objects));
            }
        }
        function showObjects(objects) {
            var rows = "";
            if (object.filter) objects = objects.filter(object.filter);
            objects.sort(object.comparer).forEach(obj => rows += object.template(obj));
            $(object.$table || ".data-list-table").html(`<thead>${object.headers}</thead>${rows}`);
            if (object.empty) {
                if (objects.length == 0) {
                    $(".data-list-empty-msg").show();
                    if ($(".data-list-empty-msg").html() == "") {
                        $(".data-list-empty-msg").html(`<p class="data-list-empty-binary">01101110011011110111010001101000011010010110111001100111<span class="data-list-empty-img"></span></p>` +
                            `<h4 class="data-list-head data-list-empty-head">Nothing to show</h4><h5 class="data-list-head data-list-empty-head data-list-empty-subhead">Try searching or filtering</h5>`);
                    }
                } else {
                    $(".data-list-empty-msg").hide();
                }
            }
        }

        var timeoutID = 0;
        $(object.$search || ".data-list .data-list-toolbar")
            .html(`<span class="search-box input-fix"><span class="icon-only icon-16 magnifying-glass-16"></span> ` +
                `<input type='text' class='text-field-default' placeholder='${object.placeholder || "Search..."}' style='width: 250px'></span>`)
            .find("input")
            .keyup(function (event) {
                const ESC = 27;
                if (event.which == ESC) {
                    this.value = object.search = "";
                    showObjects([]);
                    return;
                }
                if (object.search == this.value || this.value.length < 2) return;
                object.search = this.value;
                clearTimeout(timeoutID);
                timeoutID = setTimeout(searchObjects, 400);
            });
    }
    function toCSV(...fields) {
        return fields.map(field => `"${field == undefined ? "" : field.toString().replace(/"/g, '""')}"`).join(',');
    }
    function downloadCSV(popup, html, header, lines, filename) {
        popup.html(html + "Done.");
        var a = $("<a>").appendTo(popup);
        lines.unshift(header + '\n');
        a.attr("href", URL.createObjectURL(new Blob(lines, { type: 'text/csv' })));
        var date = (new Date()).toISOString().replace(/T/, " ").replace(/:/g, "-").slice(0, 19);
        a.attr("download", `${filename} ${date}.csv`);
        a[0].click();
    }
    function e(s) {
        return s == null ? '' : s.toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function dot(o, dots) {
        var ps = dots.split(".");
        for (var p in ps) {
            o = o[ps[p]];
            if (o == null) break;
        }
        return o;
    }

    // Listen to message from service_worker.js.
    if (window.chrome && chrome.runtime.onMessage) chrome.runtime.onMessage.addListener(function (request, _, sendResponse) {
        getJSON("/api/v1/groups").then(groups => {
            groups = groups
                .filter(group => group.profile.name.match(new RegExp(request.group, "i")))
                .map(group => ({
                    content: location.origin + "/admin/group/" + group.id,
                    description: e(group.profile.name) + (group.profile.description ? ` <dim>(${group.profile.description})</dim>` : '')
                }));
            sendResponse({ groups });
        });
        return true; // Indicates that sendResponse will be called asynchronously.
    });
})();
