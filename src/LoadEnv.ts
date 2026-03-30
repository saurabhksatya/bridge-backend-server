import "dotenv/config"

const LoadEnv = (name: string) => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Environment variable ${name} not found`)
  }
  return value
}

export const env = {
  NODE_ENV: LoadEnv("NODE_ENV") as "development" | "production",
}
