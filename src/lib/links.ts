export const QUIRE_REPOSITORY_URL = "https://github.com/aliiexe/Quire";
export const QUIRE_DOWNLOADS_URL = `${QUIRE_REPOSITORY_URL}/releases`;
// Kept as an alias so older links continue to resolve while the site points
// everyone to the platform-specific installers on the Releases page.
export const QUIRE_MAC_DOWNLOAD_URL = QUIRE_DOWNLOADS_URL;

const configuredWebsiteUrl = process.env.NEXT_PUBLIC_QUIRE_WEBSITE_URL?.trim().replace(/\/$/, "");

// Change this in Vercel through NEXT_PUBLIC_QUIRE_WEBSITE_URL if the
// production deployment uses a custom domain or a different project slug.
export const QUIRE_WEBSITE_URL = configuredWebsiteUrl || "https://quire-app.vercel.app";
export const QUIRE_PRIVACY_POLICY_URL = `${QUIRE_WEBSITE_URL}/privacy`;
