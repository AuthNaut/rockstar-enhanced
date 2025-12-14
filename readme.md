# Rockstar Enhanced - Okta Admin Toolkit

An enhanced version of [gabrielsroka's Rockstar](https://github.com/gabrielsroka/gabrielsroka.github.io/tree/master/rockstar) Chrome extension for Okta administrators.

## New Features Added

### 1. User Activity Lookup Enhancements

#### Failed Events Detail
- **Click the red "Failed" stat card** to see detailed failure information
- Shows failure reasons grouped by category (MFA failures, policy denials, invalid credentials)
- Displays timestamp, event type, reason, and specific details (policy name, authenticator info)

#### User Comparison
- Compare two users' application access side-by-side
- See which apps are unique to each user and which are shared

### 2. Show Devices
- **New menu item on user profile pages**
- Displays all devices enrolled by a user
- Shows device details:
  - Device Name
  - Platform + Model (e.g., "IOS (iPhone16,2)")
  - Status (color-coded)
  - Enrolled Date
  - Last Used Date
  - Management Status
  - Screen Lock Type

### 3. Application Details & Comparison

#### Show App Details
New "Show App Details" menu on application pages showing:

**For SAML Applications:**
- Metadata URL (clickable)
- SSO URL (ACS)
- Entity ID / Audience
- Assertion Signed, Signature Algorithm, Digest Algorithm
- Name ID Format
- **Attribute Statements** (Name, Format, Value)

**For OIDC Applications:**
- Client ID
- Redirect URIs
- Grant Types, Response Types
- Token Auth Method
- Issuer Mode
- **Allowed Scopes**
- Authorization Server (OpenID Config URL)

**For All Applications:**
- App ID, Embed Link
- Created/Updated dates
- **Sign-On Policy** with link to policy page
- Policy Rules

#### Compare with Another App
- Enter another app's ID to compare configurations
- Side-by-side diff showing which settings match or differ
- Highlighted differences for quick identification

### 4. Bug Fixes
- Fixed `formatJSON` error on OAuth authorization pages

---

## Future Enhancements

- [ ] **Upgrade jQuery to 3.7.1** - Current version (1.12.4) has known security CVEs
- [ ] **Enhanced Sign-On Policy display** - Show full policy rules and conditions

---

## Installation

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the repository folder

## Usage

1. Log in to your Okta Admin Console
2. Click the Rockstar extension icon or find "rockstar" menu items in the Okta interface
3. Access new features from the popup menu or context menus on user/app pages

## Credits

- Original Rockstar by [Gabriel Sroka](https://github.com/gabrielsroka)
- Enhancements by Kumar

## License

See original project for license information.
