/** @type {import('next').NextConfig} */
const nextConfig = {
  // Native / server-only packages stay out of the bundle.
  serverExternalPackages: ["sharp", "simple-icons"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
