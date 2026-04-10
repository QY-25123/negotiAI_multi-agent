/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output only for Docker builds (set NEXT_STANDALONE=true).
  // Vercel manages its own output format and should NOT use standalone.
  ...(process.env.NEXT_STANDALONE === "true" ? { output: "standalone" } : {}),
};
export default nextConfig;
