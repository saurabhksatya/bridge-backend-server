import WebSocket from "ws"
import { createServer } from "http"
import { Hub } from "./Hub"
import { Device } from "./Device"
import { Client } from "./Client"
import { env } from "./LoadEnv"
import { db } from "./db"

const hub = new Hub()
const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" })
    res.end("Server is online")
    return
  }
})
const wss = new WebSocket.Server({ noServer: true })

server.on("upgrade", async (req, socket, head) => {
  const url = new URL(req.url || "", "http://localhost")
  const path = url.pathname.split("/").filter(Boolean)

  console.log("Upgrade request for path:", path)

  if (path.length !== 3) {
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\nInvalid endpoint")
    socket.destroy()
    return
  }

  const [type, id, secret] = path
  if (!id || !secret) {
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\nInvalid endpoint")
    socket.destroy()
    return
  }

  if (type === "device") {
    const bridge = await db.bridge.findUnique({ where: { id } })
    if (!bridge || bridge.secretKey !== secret) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\nInvalid credentials")
      socket.destroy()
      return
    }
  } else if (type === "client") {
    const dbClient = await db.user.findUnique({ where: { id } })
    if (!dbClient || dbClient.secret !== secret) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\nInvalid credentials")
      socket.destroy()
      return
    }
  } else {
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\nInvalid endpoint")
    socket.destroy()
    return
  }

  // If checks pass, proceed with upgrade
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req)
  })
})

wss.on("connection", async (ws: WebSocket, req) => {
  const url = new URL(req.url || "", "http://localhost")
  const path = url.pathname.split("/").filter(Boolean)
  const [type, id] = path

  if (type === "device") {
    const bridge = await db.bridge.findUnique({ where: { id } })
    if (!bridge) return // Should not happen since checked in upgrade

    if (hub.getDevice(id)) {
      ws.close(1008, "Device with this ID already connected")
      return
    }

    if (!bridge.userId) {
      ws.close(1008, "Associated client not found")
      return
    }
    const device = new Device(ws, id, hub, bridge.userId)
    hub.addDevice(id, device)
    console.log(`Device connected: ${id}`)
  } else if (type === "client") {
    if (hub.getClient(id)) {
      ws.close(1008, "Already Connected")
      return
    }

    const client = new Client(ws, id, hub)
    hub.addClient(id, client)
    console.log(`Client connected: ${id}`)
  }
})

server.listen(8080, () => {
  console.log(`WebSocket server is running at port 8080 in ${env.NODE_ENV} mode`)
})
