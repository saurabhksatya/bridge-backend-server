import WebSocket from "ws"
import { Hub } from "./Hub"

export class Client {
  public ws: WebSocket
  public id: string
  private hub: Hub

  constructor(ws: WebSocket, id: string, hub: Hub) {
    this.ws = ws
    this.id = id
    this.hub = hub

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

  private handleMessage(data: WebSocket.RawData) {
    const message = data.toString()
    console.log(`Client ${this.id} message: ${message}`)
    // Handle client messages here
    // For example, send to devices or something
  }

  send(data: string) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data)
    }
  }
}
