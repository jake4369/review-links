/**
 * Client and server feedback for the database review-link policy.
 * PostgreSQL's review_destination_is_valid() and CHECK constraint remain
 * authoritative; keep this helper aligned with any future SQL policy changes.
 */
export const REVIEW_DESTINATIONS = [
  { name: "Google", field: "google" },
  { name: "Trustpilot", field: "trustpilot" },
  { name: "Facebook", field: "facebook" },
] as const;

export type ReviewField = (typeof REVIEW_DESTINATIONS)[number]["field"];

const isHostOrSubdomain = (host: string, domain: string) =>
  host === domain || host.endsWith(`.${domain}`);

export function reviewDestinationError(
  platform: string,
  enteredUrl: string,
): string | null {
  const url = enteredUrl.trim();

  // Blank destinations are allowed; a blank field removes that platform.
  if (!url) return null;

  if (url.length > 2048) return "This link is too long (maximum 2,048 characters).";

  if (!url.startsWith("https://")) {
    return "Use a complete secure link beginning with https://.";
  }

  if (/[\s\u0000-\u001f\u007f\\]/u.test(url)) {
    return "Remove spaces, line breaks or backslashes from the link.";
  }

  // Match the raw authority too, so the checks agree with the database's
  // hostname policy (which excludes ports, credentials and IP addresses).
  const authority = /^https:\/\/([^/?#]+)/.exec(url)?.[1];
  if (!authority) return "Enter a full HTTPS address with a valid website domain.";

  if (authority.includes("@")) {
    return "Links containing a username or password are not allowed.";
  }

  if (authority.includes(":")) {
    return "Remove the port number; use the website's normal HTTPS address.";
  }

  const host = authority.toLowerCase();
  const validHost =
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(host) &&
    /\.[a-z]{2,63}$/.test(host);

  if (!validHost || /(^|\.)(local|localhost|internal|lan|test|invalid|example|onion)$/.test(host)) {
    return "Enter a public website address; local addresses and IP addresses aren't allowed.";
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "That doesn't appear to be a valid web address. Check for typos.";
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.hostname.toLowerCase() !== host ||
    parsed.username ||
    parsed.password ||
    parsed.port
  ) {
    return "Check the website address. Credentials, ports and unusual URL formats aren't supported.";
  }

  const name = platform.trim().toLowerCase();

  if (name.includes("google")) {
    const trusted =
      isHostOrSubdomain(host, "google.com") ||
      isHostOrSubdomain(host, "google.co.uk") ||
      host === "g.page" ||
      host === "maps.app.goo.gl";
    if (!trusted) return "Google links must use an official Google domain (such as google.com or g.page).";
  } else if (name.includes("trustpilot")) {
    if (!isHostOrSubdomain(host, "trustpilot.com")) {
      return "Trustpilot links must use trustpilot.com or one of its subdomains.";
    }
  } else if (name.includes("facebook")) {
    if (!isHostOrSubdomain(host, "facebook.com") && !isHostOrSubdomain(host, "fb.com")) {
      return "Facebook links must use an official facebook.com or fb.com domain.";
    }
  }

  const path = parsed.pathname.toLowerCase();
  const googleHost = isHostOrSubdomain(host, "google.com") || isHostOrSubdomain(host, "google.co.uk");
  if (googleHost && path === "/url") {
    return "Use the direct review URL, not Google's redirect-link address.";
  }

  if (
    host === "l.facebook.com" ||
    host === "lm.facebook.com" ||
    (isHostOrSubdomain(host, "facebook.com") && path === "/l.php")
  ) {
    return "Use the direct Facebook review URL rather than a redirect link.";
  }

  return null;
}
