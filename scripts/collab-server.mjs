// Minimal Yjs collaboration WebSocket server for local development.
//
// y-websocket@3 ships only the browser provider (no server binary), and the
// scoped @y/websocket-server package targets the prerelease Yjs 14 wire format,
// which is incompatible with the stable yjs@13 client used by the app. This
// server speaks the same stable yjs@13 + y-protocols protocol as the client.

import http from "node:http";
import { WebSocketServer } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as map from "lib0/map";

const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number(process.env.PORT ?? 1234);
const PING_TIMEOUT_MS = 30_000;

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

/** @type {Map<string, WSSharedDoc>} */
const docs = new Map();

class WSSharedDoc extends Y.Doc {
  /** @param {string} name */
  constructor(name) {
    super({ gc: true });
    this.name = name;
    /** @type {Map<import("ws").WebSocket, Set<number>>} */
    this.conns = new Map();
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    this.awareness.on("update", ({ added, updated, removed }, conn) => {
      const changedClients = added.concat(updated, removed);
      if (conn !== null) {
        const controlledIds = this.conns.get(conn);
        if (controlledIds !== undefined) {
          added.forEach((id) => controlledIds.add(id));
          removed.forEach((id) => controlledIds.delete(id));
        }
      }
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients),
      );
      const message = encoding.toUint8Array(encoder);
      this.conns.forEach((_, c) => send(this, c, message));
    });

    this.on("update", (update) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);
      this.conns.forEach((_, c) => send(this, c, message));
    });
  }
}

/** @param {string} name */
const getDoc = (name) =>
  map.setIfUndefined(docs, name, () => new WSSharedDoc(name));

/**
 * @param {WSSharedDoc} doc
 * @param {import("ws").WebSocket} conn
 * @param {Uint8Array} message
 */
const send = (doc, conn, message) => {
  if (conn.readyState !== conn.OPEN && conn.readyState !== conn.CONNECTING) {
    closeConn(doc, conn);
    return;
  }
  try {
    conn.send(message, (err) => err != null && closeConn(doc, conn));
  } catch {
    closeConn(doc, conn);
  }
};

/**
 * @param {WSSharedDoc} doc
 * @param {import("ws").WebSocket} conn
 */
const closeConn = (doc, conn) => {
  const controlledIds = doc.conns.get(conn);
  if (controlledIds !== undefined) {
    doc.conns.delete(conn);
    awarenessProtocol.removeAwarenessStates(doc.awareness, Array.from(controlledIds), null);
    if (doc.conns.size === 0) {
      doc.destroy();
      docs.delete(doc.name);
    }
  }
  conn.close();
};

/**
 * @param {import("ws").WebSocket} conn
 * @param {WSSharedDoc} doc
 * @param {Uint8Array} message
 */
const messageListener = (conn, doc, message) => {
  try {
    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);
    if (messageType === MESSAGE_SYNC) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
      if (encoding.length(encoder) > 1) {
        send(doc, conn, encoding.toUint8Array(encoder));
      }
    } else if (messageType === MESSAGE_AWARENESS) {
      awarenessProtocol.applyAwarenessUpdate(
        doc.awareness,
        decoding.readVarUint8Array(decoder),
        conn,
      );
    }
  } catch (err) {
    console.error("Failed to handle message:", err);
  }
};

/**
 * @param {import("ws").WebSocket} conn
 * @param {http.IncomingMessage} req
 */
const setupConnection = (conn, req) => {
  conn.binaryType = "arraybuffer";
  const docName = (req.url ?? "").slice(1).split("?")[0] || "default";
  const doc = getDoc(docName);
  doc.conns.set(conn, new Set());

  conn.on("message", (data) => messageListener(conn, doc, new Uint8Array(data)));

  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      if (doc.conns.has(conn)) {
        closeConn(doc, conn);
      }
      clearInterval(pingInterval);
      return;
    }
    if (doc.conns.has(conn)) {
      pongReceived = false;
      try {
        conn.ping();
      } catch {
        closeConn(doc, conn);
        clearInterval(pingInterval);
      }
    }
  }, PING_TIMEOUT_MS);

  conn.on("pong", () => {
    pongReceived = true;
  });
  conn.on("close", () => {
    closeConn(doc, conn);
    clearInterval(pingInterval);
  });

  // Initial sync: send our state vector, then current awareness states.
  const syncEncoder = encoding.createEncoder();
  encoding.writeVarUint(syncEncoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(syncEncoder, doc);
  send(doc, conn, encoding.toUint8Array(syncEncoder));

  const awarenessStates = doc.awareness.getStates();
  if (awarenessStates.size > 0) {
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys())),
    );
    send(doc, conn, encoding.toUint8Array(awarenessEncoder));
  }
};

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ok");
});

const wss = new WebSocketServer({ server });
wss.on("connection", setupConnection);

server.listen(PORT, HOST, () => {
  console.log(`Collab server running at ws://${HOST}:${PORT}`);
});
