const apiOrigin = (process.env.API_ORIGIN || "http://127.0.0.1:8000")
  .trim()
  .replace(/\/+$/, "");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${apiOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;