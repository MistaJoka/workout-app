// Single source of truth for the support contact shown on the Privacy and
// Terms pages. The app has no account/backend, so this is the only
// "contact us" surface — and nobody has set a real address yet.
//
// TODO(owner): replace with the real support email before this app is
// listed in any store. See support/CLAUDE_REQUESTS.md for the request
// tracking this decision (store-listing requirements).
export const SUPPORT_CONTACT = 'support@example.com'
