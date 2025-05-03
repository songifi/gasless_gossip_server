
// How a client would generate proper authentication headers
import { ec, stark } from 'starknet';

async function generateStarknetHeaders(privateKey: string, method: string, path: string, body = {}) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const messageToSign = `${method}:${path}:${JSON.stringify(body)}:${timestamp}`;
  
  // Create starknet keypair
  const keyPair = ec.getKeyPair(privateKey);
  const publicKey = ec.getStarkKey(keyPair);
  
  // Sign the message
  const messageHash = stark.hashMessage(messageToSign);
  const signature = ec.sign(keyPair, messageHash);
  
  return {
    'x-starknet-public-key': publicKey,
    'x-starknet-signature': signature,
    'x-starknet-timestamp': timestamp
  };
}

// Example API usage
async function makeAuthenticatedRequest() {
  const privateKey = '0x123...'; // Your private key
  const method = 'GET';
  const path = '/protected';
  const body = {};
  
  const headers = await generateStarknetHeaders(privateKey, method, path, body);
  
  // Now use these headers in your fetch/axios request
  const response = await fetch('http://localhost:3000/protected', {
    method: method,
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: method !== 'GET' ? JSON.stringify(body) : undefined
  });
  
  return response.json();
}

// WebSocket client example
function connectAuthenticatedWebSocket() {
  const privateKey = '0x123...'; // Your private key
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const messageToSign = `WS:/socket:${timestamp}`;
  
  const keyPair = ec.getKeyPair(privateKey);
  const publicKey = ec.getStarkKey(keyPair);
  
  const messageHash = stark.hashMessage(messageToSign);
  const signature = ec.sign(keyPair, messageHash);
  
  const socket = io('http://localhost:3000', {
    extraHeaders: {
      'x-starknet-public-key': publicKey,
      'x-starknet-signature': signature,
      'x-starknet-timestamp': timestamp
    }
  });
  
  return socket;
}
