import { type Request, type Response } from "express"

const HEALTH_CACHE_DURATION = 5

const cache = {
  uptime: process.uptime(),
  condition: "Healthy",
}

let lastCacheDate = new Date()

export const HealthRouter = (req: Request, res: Response) => {
  const currentDate = new Date()
  const seconds = (currentDate.getTime() - lastCacheDate.getTime()) / 1000

  if (seconds > HEALTH_CACHE_DURATION) {
    cache.uptime = process.uptime()
    lastCacheDate = currentDate
  }

  res.status(200).send(cache)
}
