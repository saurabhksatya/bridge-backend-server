import WebSocket from "ws"
import type { Hub } from "./Hub"
import { db } from "./db"

export class Client {
  public ws: WebSocket
  public id: string
  private userId: string
  private hub: Hub

  constructor(ws: WebSocket, id: string, userId: string, hub: Hub) {
    this.ws = ws
    this.id = id
    this.userId = userId
    this.hub = hub

    // Send list of active devices for this user when connected
    void this.sendUserDevices()
    console.log(`Client ${this.id} connected for user ${this.userId}`)

    this.ws.on("message", (data) => {
      this.handleMessage(data)
    })

    this.ws.on("close", () => {
      this.hub.removeClient(this.id)
      console.log(`Client ${this.id} disconnected`)
    })

    this.ws.on("error", (error) => {
      console.error(`Client ${this.id} error:`, error)
    })
  }

  private sendUserDevices() {
    const devices = this.hub.getAllDevices().filter((device) => device.clientId === this.userId)

    const data = [
      ...devices.map((device) => ({
        id: device.id,
        state: device.curState,
      })),
    ]
    this.ws.send(JSON.stringify({ type: "devices", devices: data }))
  }

  private async handleMessage(data: WebSocket.RawData) {
    try {
      const message = JSON.parse(data.toString()) as { command: string; deviceId: string }

      const validCommands = ["OFF", "ON", "AUTO"]
      if (!validCommands.includes(message.command)) {
        this.ws.send(JSON.stringify({ error: "Invalid command. Expected: OFF, ON, or AUTO" }))
        return
      }

      const dbDevice = await db.device.findUnique({ where: { id: message.deviceId } })
      if (!dbDevice?.userId || dbDevice.userId !== this.userId) {
        console.warn(`Client ${this.id} attempted to control unauthorized device: ${message.deviceId}`)
      }

      await db.device.update({
        where: {
          id: message.deviceId,
        },
        data: {
          GlobalChoice: message.command as "OFF" | "ON" | "AUTO",
        },
      })

      const device = this.hub.getDevice(message.deviceId)
      if (device && device.ws.readyState === WebSocket.OPEN) {
        device.send(message.command)
      }
    } catch (error) {
      console.error(`Client ${this.id} error parsing message:`, error)
    }
  }

  send(data: string) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data)
    }
  }
}
