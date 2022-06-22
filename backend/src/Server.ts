import WebSocket from 'ws';
import axios from 'axios';
import { ConnectionState } from '../../common/ConnectionState';
import { Message, messageDecode, messageEncode } from '../../common/Message';
import { Connection } from './Connection';
import { initSnapshot } from './functions';

const logger = require('node-color-log');

class Server {

  constructor(host: string, port: number) {

    const wss = new WebSocket.Server({
      host: host,
      port: port
    });

    initSnapshot();

    wss.on('connection', (ws: any) => {
      const connection = new Connection(ws);

      // Mainly for the case of worker creating a new worker, which will
      // lose the connection information.
      // @ts-ignore js global
      global.connection = connection;

      logger.debug("Connection established: " + connection.id());

      ws.on('message', (data: string) => {
        const message = messageDecode(data);

        workDispatch(message, connection, ws);
      });

      ws.on('close', (data: string) => {
        logger.debug("Connection closed: " + connection.id());
        connection.close();
      });

      const helloMsg = messageEncode(
        ConnectionState.Message, "Hello from server!", null);
      ws.send(helloMsg);
    });

    logger.info(`Server listens on port ${port}.`);
  }
}

async function workDispatch(message: Message, connection: Connection, ws: WebSocket) {
  const data = message.data;
  switch (message.state) {
    case ConnectionState.Message: {
      logger.debug("received: " + message.data);
      break;
    }
    case ConnectionState.CreateBuffer: {
      const id = data.id;
      const size = data.size;
      logger.debug(`Create buffer in size ${size} with ID ${id}`);

      connection.createBuffer(id, size);

      const reply = messageEncode(ConnectionState.BufferReady, id, null);
      ws.send(reply);
      logger.debug(`Sent buffer ready message with ID ${id}`);
      break;
    }
    case ConnectionState.CreateWasmModule: {
      const url = data.url;
      const moduleId = data.moduleId;

      logger.debug(`Create InstantiateStreaming in url ${url} ` +
        `with moduleID ${moduleId}`);

      connection.createWasmModule(moduleId, url, false);

      const reply = messageEncode(ConnectionState.WasmModuleReady, moduleId, null);
      ws.send(reply);
      logger.debug(`Sent wasm module ready message with moduleID ${moduleId}`);
      break;
    }
    case ConnectionState.CreateWasmMemory: {
      const id = data.id;
      const descriptor = data.descriptor;
      logger.debug(`Create wasm memory with ID ${id}`);

      connection.createWasmMemory(id, descriptor);

      const reply = messageEncode(ConnectionState.WasmMemoryReady, id, null);
      ws.send(reply);
      logger.debug(`Sent wasm memory ready message with ID ${id}`);
      break;
    }
    case ConnectionState.CreateWorker: {
      const url = data.url;
      const id = data.id;

      // early reply since the RTT may be high
      const reply = messageEncode(ConnectionState.WorkerReady, id, null);
      ws.send(reply);
      logger.debug(`Sent worker ready message with ID ${id}`);

      (async () => {
        const res = await axios.get(url);
        connection.createWorker(id, res.data, { url: url, mc: null });
      })();
    }
    case ConnectionState.PostMessage: {
      const workerId = data.workerId;

      if (!workerId)
        break;

      const msg = data.message;
      logger.debug(`Worker ${workerId} receives messages ${JSON.stringify(msg)}`);

      // simulate the behavior of the browser
      const newData = {
        data: msg
      };
      const iterate = (obj: any) => {
        for (const key in obj) {
          // Match UUID
          if (typeof obj[key] === 'string' && obj[key].length === 36) {
            // check SharedArrayBuffer
            for (const id of connection.bufferIds()) {
              if (obj[key] === id) {
                try {
                  // mount server-side shared-buffer
                  obj[key] = connection.buffer(id);
                } catch (e) {
                  logger.error(e);
                }
              }
            }

            // check wasm memory
            for (const id of connection.wasmMemIds()) {
              if (obj[key] === id) {
                try {
                  // mount server-side wasm memory
                  obj[key] = connection.wasmMemory(id);
                } catch (e) {
                  logger.error(e);
                }
              }
            }

            // check wasm module
            for (const id of connection.wasmModuleIds()) {
              if (obj[key] === id) {
                try {
                  // mount server-side wasm module
                  obj[key] = connection.wasmModule(id);
                } catch (e) {
                  logger.error(e);
                }
              }
            }
          }

          if (typeof obj[key] === 'object') {
            iterate(obj[key])
          }
        }
      };

      iterate(newData);

      const tryTotal = 400; // waiting at most 6 seconds
      // in case that the worker are constructing
      for (let tryCnt = 0; tryCnt < tryTotal; tryCnt++) {
        try {
          const worker = connection.worker(workerId);

          // currently no chance to happen, but it may be possible if make the
          // offworker creation async.
          if (!worker?.isReady())
            throw `Worker ${workerId} is not ready`;

          worker?.eventEmit("onmessage", newData);

          break;
        } catch (e) {
          if (tryCnt % 40 == 0)
            logger.error(e, `retrying in ${tryCnt}/${tryTotal}`);
          await wait();
        }
      }
    }
    default: {
      break;
    }
  }
}

async function wait() {
  await new Promise(resolve => setTimeout(resolve, 10));
  return;
}

module.exports = Server;