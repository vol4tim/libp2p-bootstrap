import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { bootstrap } from "@libp2p/bootstrap";
import { privateKeyFromRaw } from "@libp2p/crypto/keys";
import { floodsub } from "@libp2p/floodsub";
import { identify } from "@libp2p/identify";
import { kadDHT } from "@libp2p/kad-dht";
// import { kadDHT, removePublicAddressesMapper } from "@libp2p/kad-dht";
import { ping } from "@libp2p/ping";
import { tcp } from "@libp2p/tcp";
import { webRTCDirect } from "@libp2p/webrtc";
import { createLibp2p } from "libp2p";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";

import config from "../config.json" with { type: 'json' };

async function createNode(options) {
  return await createLibp2p({
    ...options,
    streamMuxers: [yamux()],
    connectionEncrypters: [noise()],
    services: {
      identify: identify(),
      ping: ping(),
      dht: kadDHT({
        clientMode: false,
        protocol: "/ipfs/lan/kad/1.0.0",
        // peerInfoMapper: removePublicAddressesMapper
        peerInfoMapper: (peer) => {
          return peer
        }
      }),
      pubsub: floodsub()
    }
  });
}

async function startServer() {
  const node = await createNode({
    privateKey: privateKeyFromRaw(
      uint8ArrayFromString(config.SERVER.PRIVATE_KEY, "base64")
    ),
    addresses: config.SERVER.ADDRESSES,
    transports: [tcp(), webRTCDirect()],
    peerDiscovery: [
      bootstrap({
        list: config.SERVER.BOOTSTRAP
      })
    ]
  });
  await node.start();
  console.log("Node started with ID:", node.peerId.toString());
  console.log(
    "Node listening on:",
    node.getMultiaddrs().map(addr => addr.toString())
  );
  node.addEventListener("peer:connect", () => {
    setTimeout(() => {
      console.log("PEERS ON NODE:", node.getPeers());
    }, 3000);
  });

  // Отправляем сообщение каждые 5 секунд
  setInterval(() => {
    const msg = JSON.stringify({
      time: new Date().toISOString()
    });
    node.services.pubsub.publish(
      "topic-pubsub",
      new TextEncoder().encode(msg)
    );
    console.log("Sent message:", msg);
  }, 5000);
}

startServer().catch(console.error);
