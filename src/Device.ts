import WebSocket from "ws"
import { type Hub } from "./Hub"
import { db } from "./db"

export class Device {
  public ws: WebSocket
  public id: string
  private hub: Hub
  public clientId: string
  public curState: "OFF" | "DIM" | "FULL" = "OFF"

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

    void this.StartingMsg()
  }

  private async StartingMsg() {
    const dbDevice = await db.device.findUnique({ where: { id: this.id } })
    if (!dbDevice) {
      console.warn("Device not present")
      return
    }

    this.send(dbDevice.GlobalChoice)
  }

  private handleMessage(data: WebSocket.RawData) {
    const message = data.toString().trim()
    console.log(`Device ${this.id} message: ${message}`)

    const validCommands = ["OFF", "FULL", "DIM"]
    if (!validCommands.includes(message)) {
      console.warn(`Device ${this.id} sent invalid command: ${message}`)
      this.ws.send(JSON.stringify({ error: "Invalid command. Expected: OFF, FULL, or DIM" }))
      return
    }

    this.curState = message as "OFF" | "DIM" | "FULL"

    const client = this.hub.getClient(this.clientId)
    if (client && client.ws.readyState === WebSocket.OPEN) {
      console.log(`Sending command ${message} to client ${this.clientId}`)
      client.send(JSON.stringify({ id: this.id, state: this.curState }))
    }

    console.log(`Device ${this.id} sent command: ${message}`)
  }

  send(data: string) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data)
    }
  }
}
