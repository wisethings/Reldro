/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Clickjacking: nothing on this platform is meant to be framed by another site.
          { key: "X-Frame-Options", value: "DENY" },
          // Stop browsers guessing content types away from what the server declares.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak full URLs (which can carry session-adjacent context in query strings) to third-party link targets.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Force HTTPS for a year, including subdomains, once a browser has seen it once.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Disable browser APIs this product has no legitimate use for.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
