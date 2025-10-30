const express = require('express');
const { makeWASocket, useMultiFileAuthState, delay, DisconnectReason } = require("@whiskeysockets/baileys");

const app = express();
const port = process.env.PORT || 5000;

// Global variables
let MznKing;
let messages = [];
let targets = [];
let intervalTime = null;
let haterName = null;
let currentInterval = null;
let stopKey = null;
let sendingActive = false;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Logger
const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()}: ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()}: ${msg}`)
};

// WhatsApp Connection Setup
const setupBaileys = async () => {
  try {
    logger.info('Initializing WhatsApp connection...');
    
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    
    const connectToWhatsApp = async () => {
      MznKing = makeWASocket({
        printQRInTerminal: true,
        auth: state,
        logger: { level: 'silent' }
      });

      MznKing.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) logger.info('QR Code received - Scan with WhatsApp');
        
        if (connection === "open") logger.info("✅ WhatsApp connected!");
        
        if (connection === "close") {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          if (statusCode !== DisconnectReason.loggedOut) {
            logger.info("🔄 Reconnecting...");
            setTimeout(connectToWhatsApp, 5000);
          }
        }
      });

      MznKing.ev.on('creds.update', saveCreds);
    };
    
    await connectToWhatsApp();
  } catch (error) {
    logger.error(`Setup error: ${error.message}`);
  }
};

setupBaileys();

// Utility Functions
function generateStopKey() {
  return 'MRPRINCE-' + Math.floor(1000000 + Math.random() * 9000000);
}

function formatPhoneNumber(phone) {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned.startsWith('91') && cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

// Routes
app.get('/', (req, res) => {
  const showStopKey = sendingActive && stopKey;

  res.send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>🌷 WhatsApp Server 🌷</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        margin: 0; padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family: Arial, sans-serif;
        min-height: 100vh;
      }
      .container {
        width: 90%; max-width: 450px; margin: 20px auto;
        background: rgba(255, 255, 255, 0.1); 
        padding: 30px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.2);
        color: white; text-align: center;
      }
      h1 { color: white; font-size: 28px; margin-bottom: 10px; }
      .form-group { margin-bottom: 20px; text-align: left; }
      label { display: block; margin: 10px 0 5px; font-weight: bold; color: white; }
      input, button, textarea {
        width: 100%; padding: 12px; margin-bottom: 15px; border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.3); background: rgba(255, 255, 255, 0.1);
        color: white; font-size: 16px;
      }
      button { 
        font-weight: bold; cursor: pointer; border: none; margin-top: 5px; 
        background: #ffcc00; color: #333; 
      }
      button:hover { opacity: 0.8; }
      .instructions { font-size: 12px; color: rgba(255, 255, 255, 0.7); margin-top: 5px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🌷 MR PRINCE 🌷</h1>
      <div style="color: rgba(255,255,255,0.8); margin-bottom: 20px;">WhatsApp Message Server</div>

      <form action="/generate-pairing-code" method="post">
        <div class="form-group">
          <label for="phoneNumber">Your Phone Number:</label>
          <input type="text" id="phoneNumber" name="phoneNumber" placeholder="91XXXXXXXXXX" required />
          <div class="instructions">With country code (91 for India)</div>
        </div>
        <button type="submit">GENERATE PAIR CODE</button>
      </form>

      <form action="/send-messages" method="post">
        <div class="form-group">
          <label for="targetsInput">Target Numbers:</label>
          <input type="text" id="targetsInput" name="targetsInput" placeholder="91XXXXXXXXXX" required />
          <div class="instructions">Separate multiple numbers with commas</div>

          <label for="messagesText">Messages (one per line):</label>
          <textarea id="messagesText" name="messagesText" rows="5" placeholder="Enter your messages, one per line" required></textarea>

          <label for="haterNameInput">Sender Name:</label>
          <input type="text" id="haterNameInput" name="haterNameInput" placeholder="Enter name" required />

          <label for="delayTime">Delay (seconds):</label>
          <input type="number" id="delayTime" name="delayTime" placeholder="Minimum 5" min="5" required />
        </div>
        <button type="submit" style="background: #00cc66; color: white;">START SENDING</button>
      </form>

      <form action="/stop" method="post">
        <div class="form-group">
          <label for="stopKeyInput">Stop Key:</label>
          <input type="text" id="stopKeyInput" name="stopKeyInput" placeholder="Enter stop key"/>
        </div>
        <button type="submit" style="background: #ff4444; color: white;">STOP SENDING</button>
      </form>

      ${showStopKey ? `
      <div style="margin-top: 20px; padding: 15px; background: rgba(255, 255, 255, 0.1); border-radius: 10px;">
        <label>Current Stop Key:</label>
        <input type="text" value="${stopKey}" readonly style="background: rgba(255,255,255,0.2);" />
        <div class="instructions">Save this key to stop sending</div>
      </div>` : ''}
      
      <div style="margin-top: 20px; font-size: 12px; color: rgba(255, 255, 255, 0.6);">
        © ${new Date().getFullYear()} MR PRINCE Server
      </div>
    </div>
  </body>
  </html>
  `);
});

app.post('/generate-pairing-code', async (req, res) => {
  const phoneNumber = req.body.phoneNumber;
  
  if (!phoneNumber) {
    return res.send('<script>alert("Phone number required"); window.history.back();</script>');
  }

  try {
    if (!MznKing) throw new Error('WhatsApp initializing. Please wait...');
    
    const formattedNumber = formatPhoneNumber(phoneNumber);
    const pairCode = await MznKing.requestPairingCode(formattedNumber);
    
    res.send(`
      <div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center;">
        <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 20px; color: white; text-align: center;">
          <h2>📱 Pairing Code</h2>
          <div style="font-size: 32px; font-weight: bold; margin: 20px 0; background: rgba(255,255,255,0.2); padding: 15px; border-radius: 10px;">${pairCode}</div>
          <p>Go to WhatsApp → Linked Devices → Link a Device</p>
          <button onclick="window.location.href='/'" style="padding: 12px 25px; background: #ffcc00; border: none; border-radius: 10px; font-weight: bold; cursor: pointer;">Back to Home</button>
        </div>
      </div>
    `);
  } catch (error) {
    res.send(`
      <div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center;">
        <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 20px; color: white; text-align: center;">
          <h2>❌ Error</h2>
          <p style="color: #ff6b6b;">${error.message}</p>
          <button onclick="window.history.back()" style="padding: 12px 25px; background: #ffcc00; border: none; border-radius: 10px; margin: 5px; cursor: pointer;">Go Back</button>
          <button onclick="window.location.href='/'" style="padding: 12px 25px; background: #00cc66; border: none; border-radius: 10px; margin: 5px; cursor: pointer; color: white;">Home</button>
        </div>
      </div>
    `);
  }
});

app.post('/send-messages', async (req, res) => {
  try {
    const { targetsInput, messagesText, delayTime, haterNameInput } = req.body;

    if (!MznKing) throw new Error('WhatsApp not connected. Generate pairing code first.');

    // Validation
    if (!targetsInput || !messagesText || !delayTime || !haterNameInput) {
      throw new Error('All fields are required');
    }

    haterName = haterNameInput.trim();
    intervalTime = Math.max(5, parseInt(delayTime, 10));

    // Process messages from textarea
    messages = messagesText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (messages.length === 0) throw new Error('No messages entered');

    // Process targets
    targets = targetsInput.split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .map(target => formatPhoneNumber(target) + '@s.whatsapp.net');
    
    if (targets.length === 0) throw new Error('No valid targets');

    // Start sending
    stopKey = generateStopKey();
    sendingActive = true;

    if (currentInterval) clearInterval(currentInterval);

    let msgIndex = 0;
    logger.info(`Starting messages to ${targets.length} targets`);

    currentInterval = setInterval(async () => {
      if (!sendingActive || msgIndex >= messages.length) {
        clearInterval(currentInterval);
        sendingActive = false;
        return;
      }

      const fullMessage = `${haterName} ${messages[msgIndex]}`;
      
      for (const target of targets) {
        try {
          await MznKing.sendMessage(target, { text: fullMessage });
          logger.info(`Sent to ${target}`);
        } catch (err) {
          logger.error(`Failed ${target}: ${err.message}`);
        }
        await delay(1000);
      }

      msgIndex++;
    }, intervalTime * 1000);

    res.redirect('/');
  } catch (error) {
    res.send(`
      <div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center;">
        <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 20px; color: white; text-align: center;">
          <h2>❌ Error</h2>
          <p style="color: #ff6b6b;">${error.message}</p>
          <button onclick="window.history.back()" style="padding: 12px 25px; background: #ffcc00; border: none; border-radius: 10px; margin: 5px; cursor: pointer;">Go Back</button>
          <button onclick="window.location.href='/'" style="padding: 12px 25px; background: #00cc66; border: none; border-radius: 10px; margin: 5px; cursor: pointer; color: white;">Home</button>
        </div>
      </div>
    `);
  }
});

app.post('/stop', (req, res) => {
  const userKey = req.body.stopKeyInput;
  
  if (!userKey) {
    return res.send('<script>alert("Enter stop key"); window.history.back();</script>');
  }

  if (userKey === stopKey) {
    sendingActive = false;
    if (currentInterval) {
      clearInterval(currentInterval);
      currentInterval = null;
    }
    
    return res.send(`
      <div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center;">
        <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 20px; color: white; text-align: center;">
          <h2>✅ Stopped</h2>
          <p>Message sending stopped successfully</p>
          <button onclick="window.location.href='/'" style="padding: 12px 25px; background: #ffcc00; border: none; border-radius: 10px; cursor: pointer;">Back to Home</button>
        </div>
      </div>
    `);
  } else {
    return res.send(`
      <div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center;">
        <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 20px; color: white; text-align: center;">
          <h2>❌ Error</h2>
          <p style="color: #ff6b6b;">Invalid stop key</p>
          <button onclick="window.history.back()" style="padding: 12px 25px; background: #ffcc00; border: none; border-radius: 10px; margin: 5px; cursor: pointer;">Try Again</button>
          <button onclick="window.location.href='/'" style="padding: 12px 25px; background: #00cc66; border: none; border-radius: 10px; margin: 5px; cursor: pointer; color: white;">Home</button>
        </div>
      </div>
    `);
  }
});

app.listen(port, () => {
  logger.info(`🚀 Server running on port ${port}`);
});
