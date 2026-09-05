export const QUIRE_REPOSITORY_URL = "https://github.com/aliiexe/Quire";
export const QUIRE_MAC_DOWNLOAD_URL = `${QUIRE_REPOSITORY_URL}/releases`;

const configuredWebsiteUrl = process.env.NEXT_PUBLIC_QUIRE_WEBSITE_URL?.trim().replace(/\/$/, "");

// Change this in Vercel through NEXT_PUBLIC_QUIRE_WEBSITE_URL if the
// production deployment uses a custom domain or a different project slug.
export const QUIRE_WEBSITE_URL = configuredWebsiteUrl || "https://quire-app.vercel.app";
export const QUIRE_PRIVACY_POLICY_URL = `${QUIRE_WEBSITE_URL}/privacy`;
