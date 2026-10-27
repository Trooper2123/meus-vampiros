import process from 'node:process'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: (process.env.NEXT_DEV_ALLOWED_ORIGINS ?? '').split(',').map(origin => origin.trim()).filter(Boolean),
}

export default nextConfig
