const topology = require('fully-connected-topology');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const { Blockchain, Transaction } = require('./blockchain4');
const fs = require('fs');

const { exit, argv } = process;
const { me, peers } = extractPeersAndMyPort();
const sockets = {};

const vinciCoin = new Blockchain();

const myIp = toLocalIp(me);
const peerIps = getPeerIps(peers);

let key;
const wallets = {};

key = ec.genKeyPair();

wallets[me] = {
  privateKey: key.getPrivate('hex'),
  publicKey: key.getPublic('hex'),
  key,
};
let transactionpool = [];

fs.readFile('./transactionpool.js', 'utf8', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  transactionpool = JSON.parse(data);
});
const random = Math.random() * 5000 + 5000;
let count = 0;
let sum = 0;

setInterval(() => {
  if (Object.keys(wallets).length < 3) return;
  for (let i = 0; i < 3; i++) {
    const tx1 = new Transaction(
      wallets[transactionpool[count].fromAddress].publicKey,
      wallets[transactionpool[count].toAddress].publicKey,
      transactionpool[count].amount
    );
    tx1.signTransaction(wallets[transactionpool[count].fromAddress].key);
    try {
      vinciCoin.addTransaction(tx1);
      sockets[transactionpool[count].fromAddress].write('The transaction was successful');
    } catch (err) {
      sockets[transactionpool[count].fromAddress].write(err.toString());
    }
    count++;
  }
  vinciCoin.minePendingTransaction(wallets[me].publicKey);
  if (count === transactionpool.length) {
    Object.keys(wallets).forEach(wallet => {
      sum += vinciCoin.getBalanceOfAddress(wallets[wallet].publicKey);
    });
    console.log(
      `Money were mined: ${vinciCoin.miningMoney}\nMoney were burned: ${
        vinciCoin.burnMoney
      }\nSum of money in all wallets: ${sum}\nBloom Filter: ${vinciCoin.ifTransactionExistsBlockchain(
        new Transaction('4002', '4003', 666)
      )}`
    );
    exit(0);
  }
}, random);

//connect to peers
topology(myIp, peerIps).on('connection', (socket, peerIp) => {
  const peerPort = extractPortFromIp(peerIp);
  sockets[peerPort] = socket;
  socket.on('data', data => {
    key = ec.keyFromPrivate(data.toString('utf8'));

    wallets[peerPort] = {
      privateKey: key.getPrivate('hex'),
      publicKey: key.getPublic('hex'),
      key,
    };
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

//'127.0.0.1:4000' -> '4000'
function extractPortFromIp(peer) {
  return peer.toString().slice(peer.length - 4, peer.length);
}
