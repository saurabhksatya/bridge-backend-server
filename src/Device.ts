import WebSocket from "ws"
import { type Hub } from "./Hub"
import { db } from "./db"

export class Device {
  public ws: WebSocket
  public id: string
  private hub: Hub
  private clientId: string

  constructor(ws: WebSocket, id: string, hub: Hub, clientId: string) {
    this.ws = ws
    this.id = id
    this.clientId = clientId

    this.hub = hub

    this.ws.on("message", (data) => {
      void this.handleMessage(data)
    })

    this.ws.on("close", () => {
      this.hub.removeDevice(this.id)
      console.log(`Device ${this.id} disconnected`)
    })

    this.ws.on("error", (error) => {
      console.error(`Device ${this.id} error:`, error)
    })
  }

  private async handleMessage(data: WebSocket.RawData) {
    const message = data.toString().trim()
    console.log(`Device ${this.id} message: ${message}`)

    const weight = Number(message)
    if (!Number.isFinite(weight)) {
      console.warn(`Device ${this.id} sent invalid weight: ${message}`)
      this.ws.send(JSON.stringify({ error: "Invalid weight value" }))
      return
    }

    const record = await db.records.create({
      data: {
        bridgeId: this.id,
        weight,
      },
    })

    const payload = JSON.stringify({
      bridgeId: this.id,
      weight: record.weight,
      createdAt: record.createdAt.toISOString(),
      id: record.id,
    })

    const client = this.hub.getClient(this.clientId)
    if (client && client.ws.readyState === WebSocket.OPEN) {
      console.log("Sending")
      client.send(payload)
    }

    console.log(`Saved record for bridge ${this.id}: ${weight}`)
  }

  send(data: string) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data)
    }
  }
}
