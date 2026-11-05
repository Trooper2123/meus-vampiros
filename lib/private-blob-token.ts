/**
 * Vercel Storage prefixes credentials when a store is connected using a custom
 * envVarPrefix. The Blob SDK expects BLOB_READ_WRITE_TOKEN by default.
 * Keep this server-only: never export the token to clients or API responses.
 */
export function configurePrivateBlobToken(): boolean {
  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.Private_Blob_READ_WRITE_TOKEN
  if (!token) return false
  if (!process.env.BLOB_READ_WRITE_TOKEN) process.env.BLOB_READ_WRITE_TOKEN = token
  return true
}
