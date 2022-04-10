const topology = require('fully-connected-topology');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

const { argv } = process;
const { me, peers } = extractPeersAndMyPort();

const myIp = toLocalIp(me);
const peerIps = getPeerIps(peers);

const key = ec.genKeyPair();
const privateKey = key.getPrivate('hex');

//connect to peers
topology(myIp, peerIps).on('connection', (socket, peerIp) => {
  const peerPort = extractPortFromIp(peerIp);
  if (peerPort === '4001') {
    socket.write(privateKey);
  }
  socket.on('data', data => {
    console.log(data.toString('utf8'));
  });
});

//extract ports from process arguments, {me: first_port, peers: rest... }
function extractPeersAndMyPort() {
  return {
    me: argv[2],
    peers: argv.slice(3, argv.length),
  };
}

//'4000' -> '127.0.0.1:4000'
function toLocalIp(port) {
  return `127.0.0.1:${port}`;
}

//['4000', '4001'] -> ['127.0.0.1:4000', '127.0.0.1:4001']
function getPeerIps(peers) {
  return peers.map(peer => toLocalIp(peer));
}

function extractPortFromIp(peer) {
  return peer.toString().slice(peer.length - 4, peer.length);
}
