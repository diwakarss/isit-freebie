/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
  serverExternalPackages: ['@anthropic-ai/bedrock-sdk'],
}
module.exports = nextConfig;
