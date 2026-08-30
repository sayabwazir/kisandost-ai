import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.0.101', 'localhost'],
  // The PWA plugin injects webpack config; an explicit (empty) turbopack
  // config stops Next 16's default Turbopack build from hard-erroring on it.
  turbopack: {},
  // readdirSync is not statically traceable, so force the knowledge base
  // into the serverless function trace for Vercel deployments.
  outputFileTracingIncludes: {
    '/api/assistant': ['src/data/knowledge/**/*'],
  },
};

export default withPWA(nextConfig);
