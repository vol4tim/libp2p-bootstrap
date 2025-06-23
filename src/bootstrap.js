import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { privateKeyFromRaw } from "@libp2p/crypto/keys";
import { identify } from "@libp2p/identify";
import { kadDHT, removePublicAddressesMapper } from "@libp2p/kad-dht";
import { ping } from "@libp2p/ping";
import { tcp } from "@libp2p/tcp";
import { webSockets } from "@libp2p/websockets";
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
        peerInfoMapper: removePublicAddressesMapper
      })
    }
  });
}

async function startServer() {
  const node1 = await createNode({
    privateKey: privateKeyFromRaw(uint8ArrayFromString(config.PRIVATE_KEY, "base64")),
    ...config.LIBP2P_OPTIONS,
    transports: [tcp(), webSockets()]
  });
  await node1.start();
  console.log("Node 1 started with ID:", node1.peerId.toString());
  console.log(
    "Node 1 listening on:",
    node1.getMultiaddrs().map(addr => addr.toString())
  );
  node1.addEventListener("peer:connect", () => {
    setTimeout(() => {
      console.log("PEERS ON NODE 1:", node1.getPeers());
    }, 3000);
  });
}

startServer().catch(console.error);
