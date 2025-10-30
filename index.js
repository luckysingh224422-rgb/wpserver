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

// Middleware - Multer ki jagah simple body parsing
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Logger
const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()}: ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()}: ${msg}`)
};

// WhatsApp Connection Setup
const setupBaileys = async () => {
  try {
    logger.info('🚀 Initializing WhatsApp connection...');
    
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    
    const connectToWhatsApp = async () => {
      MznKing = makeWASocket({
        printQRInTerminal: true,
        auth: state,
        logger: { level: 'silent' }
      });

      MznKing.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
          logger.info('📱 QR Code received - Scan with WhatsApp');
        }
        
        if (connection === "open") {
          logger.info("✅ WhatsApp connected successfully!");
        }
        
        if (connection === "close") {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          logger.warn(`Connection closed with status: ${statusCode}`);
          
          if (statusCode !== DisconnectReason.loggedOut) {
            logger.info("🔄 Attempting to reconnect...");
            setTimeout(() => connectToWhatsApp(), 5000);
          } else {
            logger.error("❌ Logged out from WhatsApp. Please re-scan QR code.");
          }
        }
      });

      MznKing.ev.on('creds.update', saveCreds);
      
      return MznKing;
    };
    
    await connectToWhatsApp();
  } catch (error) {
    logger.error(`Failed to setup WhatsApp: ${error.message}`);
  }
};

// Initialize WhatsApp
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
      * { 
        margin: 0; 
        padding: 0; 
        box-sizing: border-box; 
      }
      
      body {
        margin: 0; 
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        min-height: 100vh;
      }
      
      .container {
        width: 90%; 
        max-width: 450px; 
        margin: 20px auto;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        padding: 30px; 
        border-radius: 20px; 
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white; 
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        text-align: center;
      }
      
      .header {
        margin-bottom: 25px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      h1 {
        color: white;
        font-size: 28px;
        margin-bottom: 10px;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }
      
      .subtitle {
        color: rgba(255, 255, 255, 0.8);
        font-size: 14px;
      }
      
      .form-group {
        margin-bottom: 20px;
        text-align: left;
      }
      
      label {
        display: block;
        margin: 10px 0 5px;
        font-weight: 600;
        color: white;
      }
      
      input, button, textarea {
        width: 100%;
        padding: 12px 15px;
        margin-bottom: 15px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.1);
        color: white;
        font-size: 16px;
        transition: all 0.3s ease;
      }
      
      input::placeholder, textarea::placeholder {
        color: rgba(255, 255, 255, 0.6);
      }
      
      input:focus, textarea:focus {
        outline: none;
        border-color: rgba(255, 255, 255, 0.6);
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
      }
      
      button {
        font-weight: bold;
        cursor: pointer;
        transition: 0.3s;
        border: none;
        margin-top: 5px;
      }
      
      .pair-btn {
        background: linear-gradient(135deg, #ffcc00, #ff9900);
        color: #333;
      }
      
      .start-btn {
        background: linear-gradient(135deg, #00cc66, #00aa55);
        color: white;
      }
      
      .stop-btn {
        background: linear-gradient(135deg, #ff4444, #cc0000);
        color: white;
      }
      
      button:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
      }
      
      .stop-key-section {
        margin-top: 20px;
        padding: 15px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .instructions {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        margin-top: 5px;
        text-align: left;
      }
      
      .footer {
        margin-top: 20px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }
      
      .status-info {
        background: rgba(0, 100, 255, 0.2);
        padding: 10px;
        border-radius: 8px;
        margin: 10px 0;
        font-size: 14px;
        border: 1px solid rgba(0, 100, 255, 0.5);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🌷 MR PRINCE 🌷</h1>
        <div class="subtitle">WhatsApp Message Server</div>
      </div>

      <div class="status-info">
        💡 Server is running on port ${port}
      </div>

      <form action="/generate-pairing-code" method="post">
        <div class="form-group">
          <label for="phoneNumber">Your Phone Number:</label>
          <input type="text" id="phoneNumber" name="phoneNumber" placeholder="91XXXXXXXXXX" required />
          <div class="instructions">Enter your WhatsApp number with country code (91 for India)</div>
        </div>
        <button type="submit" class="pair-btn">GENERATE PAIR CODE</button>
      </form>

      <form action="/send-messages" method="post">
        <div class="form-group">
          <label for="targetsInput">Target Numbers:</label>
          <input type="text" id="targetsInput" name="targetsInput" placeholder="91XXXXXXXXXX" required />
          <div class="instructions">For multiple numbers, separate with commas</div>

          <label for="messagesText">Messages (one per line):</label>
          <textarea id="messagesText" name="messagesText" rows="6" placeholder="Enter your messages here, one message per line&#10;Example:&#10;Hello!&#10;How are you?&#10;This is test message" required></textarea>
          <div class="instructions">Write each message on a new line</div>

          <label for="haterNameInput">Sender Name:</label>
          <input type="text" id="haterNameInput" name="haterNameInput" placeholder="Enter sender name" required />

          <label for="delayTime">Delay between messages (seconds):</label>
          <input type="number" id="delayTime" name="delayTime" placeholder="Minimum 5 seconds" min="5" required />
          <div class="instructions">Time delay between sending each message</div>
        </div>
        <button type="submit" class="start-btn">START SENDING MESSAGES</button>
      </form>

      <form action="/stop" method="post">
        <div class="form-group">
          <label for="stopKeyInput">Stop Key:</label>
          <input type="text" id="stopKeyInput" name="stopKeyInput" placeholder="Enter stop key to cancel sending"/>
        </div>
        <button type="submit" class="stop-btn">STOP SENDING</button>
      </form>

      ${showStopKey ? `
      <div class="stop-key-section">
        <label>Current Stop Key (Save this):</label>
        <input type="text" value="${stopKey}" readonly style="background: rgba(255,255,255,0.2); font-weight: bold;" />
        <div class="instructions">Copy this key to stop message sending later</div>
      </div>` : ''}
      
      <div class="footer">
        © ${new Date().getFullYear()} MR PRINCE Server | Node.js ${process.version}
      </div>
    </div>
  </body>
  </html>
  `);
});

app.post('/generate-pairing-code', async (req, res) => {
  const phoneNumber = req.body.phoneNumber;
  
  if (!phoneNumber) {
    return res.send('<script>alert("Phone number is required"); window.history.back();</script>');
  }

  try {
    if (!MznKing) {
      throw new Error('WhatsApp is initializing. Please wait a moment and try again.');
    }
    
    const formattedNumber = formatPhoneNumber(phoneNumber);
    logger.info(`Generating pairing code for: ${formattedNumber}`);
    
    const pairCode = await MznKing.requestPairingCode(formattedNumber);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pairing Code Generated</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 30px;
            border-radius: 20px;
            text-align: center;
            color: white;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            width: 90%;
          }
          h2 {
            margin-bottom: 20px;
            color: white;
          }
          .pair-code {
            font-size: 32px;
            font-weight: bold;
            background: rgba(255, 255, 255, 0.2);
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            letter-spacing: 3px;
            font-family: monospace;
          }
          .instructions {
            margin: 20px 0;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.8);
            text-align: left;
          }
          .btn {
            display: inline-block;
            padding: 12px 25px;
            background: linear-gradient(135deg, #ffcc00, #ff9900);
            color: #333;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            margin-top: 10px;
            border: none;
            cursor: pointer;
          }
          .step {
            margin: 10px 0;
            padding: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>📱 Pairing Code Generated</h2>
          <div class="instructions">
            <div class="step">1. Open WhatsApp on your phone</div>
            <div class="step">2. Go to Settings → Linked Devices</div>
            <div class="step">3. Tap on "Link a Device"</div>
            <div class="step">4. Enter this code when prompted:</div>
          </div>
          <div class="pair-code">${pairCode}</div>
          <div class="instructions">
            <div class="step">5. You should see "Ubuntu" as the device name</div>
            <div class="step">6. Wait for connection confirmation</div>
          </div>
          <button onclick="window.location.href='/'" class="btn">Back to Home</button>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    logger.error(`Pairing code error: ${error.message}`);
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 30px;
            border-radius: 20px;
            text-align: center;
            color: white;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          .error {
            color: #ff6b6b;
            margin: 20px 0;
            background: rgba(255, 0, 0, 0.1);
            padding: 15px;
            border-radius: 10px;
            border: 1px solid rgba(255, 0, 0, 0.3);
          }
          .btn {
            display: inline-block;
            padding: 12px 25px;
            background: linear-gradient(135deg, #ffcc00, #ff9900);
            color: #333;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            margin-top: 10px;
            border: none;
            cursor: pointer;
            margin: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>❌ Error</h2>
          <div class="error">${error.message}</div>
          <button onclick="window.history.back()" class="btn">Go Back</button>
          <button onclick="window.location.href='/'" class="btn">Home</button>
        </div>
      </body>
      </html>
    `);
  }
});

app.post('/send-messages', async (req, res) => {
  try {
    const { targetsInput, messagesText, delayTime, haterNameInput } = req.body;

    if (!MznKing) {
      throw new Error('WhatsApp is not connected yet. Please generate pairing code first and wait for connection.');
    }

    // Validation
    if (!targetsInput || !messagesText || !delayTime || !haterNameInput) {
      throw new Error('All fields are required');
    }

    haterName = haterNameInput.trim();
    intervalTime = parseInt(delayTime, 10);

    if (isNaN(intervalTime) || intervalTime < 5) {
      throw new Error('Delay time must be a number and at least 5 seconds');
    }

    // Process messages from textarea
    messages = messagesText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (messages.length === 0) {
      throw new Error('No messages entered. Please enter at least one message.');
    }

    // Process targets
    targets = targetsInput.split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .map(target => formatPhoneNumber(target) + '@s.whatsapp.net');
    
    if (targets.length === 0) {
      throw new Error('No valid targets specified');
    }

    // Generate stop key and start sending
    stopKey = generateStopKey();
    sendingActive = true;

    // Clear any existing interval
    if (currentInterval) {
      clearInterval(currentInterval);
      currentInterval = null;
    }

    let msgIndex = 0;
    let totalSent = 0;

    logger.info(`Starting message sending: ${targets.length} targets, ${messages.length} messages, ${intervalTime}s delay`);

    currentInterval = setInterval(async () => {
      if (!sendingActive) {
        clearInterval(currentInterval);
        logger.info('Message sending stopped by user');
        return;
      }

      if (msgIndex >= messages.length) {
        clearInterval(currentInterval);
        sendingActive = false;
        logger.info(`Message sending completed. Total messages sent: ${totalSent}`);
        return;
      }

      const fullMessage = `${haterName} ${messages[msgIndex]}`;
      
      for (const target of targets) {
        try {
          await MznKing.sendMessage(target, { text: fullMessage });
          totalSent++;
          logger.info(`✅ Sent message ${msgIndex + 1}/${messages.length} to ${target}`);
        } catch (err) {
          logger.error(`❌ Failed to send to ${target}: ${err.message}`);
        }
        
        // Small delay between sends to avoid rate limiting
        await delay(1000);
      }

      msgIndex++;
    }, intervalTime * 1000);

    res.redirect('/');
  } catch (error) {
    logger.error(`Send messages error: ${error.message}`);
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 30px;
            border-radius: 20px;
            text-align: center;
            color: white;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          .error {
            color: #ff6b6b;
            margin: 20px 0;
            background: rgba(255, 0, 0, 0.1);
            padding: 15px;
            border-radius: 10px;
            border: 1px solid rgba(255, 0, 0, 0.3);
          }
          .btn {
            display: inline-block;
            padding: 12px 25px;
            background: linear-gradient(135deg, #ffcc00, #ff9900);
            color: #333;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            margin-top: 10px;
            border: none;
            cursor: pointer;
            margin: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>❌ Error</h2>
          <div class="error">${error.message}</div>
          <div>
            <button onclick="window.history.back()" class="btn">Go Back</button>
            <button onclick="window.location.href='/'" class="btn">Home</button>
          </div>
        </div>
      </body>
      </html>
    `);
  }
});

app.post('/stop', (req, res) => {
  const userKey = req.body.stopKeyInput;
  
  if (!userKey) {
    return res.send('<script>alert("Please enter stop key"); window.history.back();</script>');
  }

  if (userKey === stopKey) {
    sendingActive = false;
    if (currentInterval) {
      clearInterval(currentInterval);
      currentInterval = null;
    }
    logger.info('Message sending stopped successfully');
    
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Stopped</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 30px;
            border-radius: 20px;
            text-align: center;
            color: white;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          .success {
            color: #51cf66;
            margin: 20px 0;
            font-size: 18px;
            background: rgba(0, 255, 0, 0.1);
            padding: 15px;
            border-radius: 10px;
            border: 1px solid rgba(0, 255, 0, 0.3);
          }
          .btn {
            display: inline-block;
            padding: 12px 25px;
            background: linear-gradient(135deg, #ffcc00, #ff9900);
            color: #333;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            margin-top: 10px;
            border: none;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>✅ Success</h2>
          <div class="success">Message sending stopped successfully</div>
          <button onclick="window.location.href='/'" class="btn">Back to Home</button>
        </div>
      </body>
      </html>
    `);
  } else {
    logger.warn(`Invalid stop key attempt: ${userKey}`);
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 30px;
            border-radius: 20px;
            text-align: center;
            color: white;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          .error {
            color: #ff6b6b;
            margin: 20px 0;
            background: rgba(255, 0, 0, 0.1);
            padding: 15px;
            border-radius: 10px;
            border: 1px solid rgba(255, 0, 0, 0.3);
          }
          .btn {
            display: inline-block;
            padding: 12px 25px;
            background: linear-gradient(135deg, #ffcc00, #ff9900);
            color: #333;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            margin-top: 10px;
            border: none;
            cursor: pointer;
            margin: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>❌ Error</h2>
          <div class="error">Invalid stop key</div>
          <button onclick="window.history.back()" class="btn">Try Again</button>
          <button onclick="window.location.href='/'" class="btn">Home</button>
        </div>
      </body>
      </html>
    `);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    whatsappConnected: MznKing ? true : false,
    sendingActive: sendingActive
  });
});

// Start server
app.listen(port, () => {
  logger.info(`🚀 Server started on port ${port}`);
  logger.info(`📱 WhatsApp bot initializing...`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  if (currentInterval) {
    clearInterval(currentInterval);
  }
  process.exit(0);
});
