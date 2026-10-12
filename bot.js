const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const ytdl = require('@distube/ytdl-core');
const { MessageMedia } = require('whatsapp-web.js');
const express = require('express');

const app = express();
let lastQR = null;

app.get('/', (req, res) => {
  if (lastQR) {
    res.send(`
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#111;color:white">
        <h2>Escanea este QR con WhatsApp</h2>
        <img src="${lastQR}" style="width:300px;height:300px;background:white;padding:10px" />
        <p>Se actualiza solo cada 15s</p>
        <script>setTimeout(()=>location.reload(), 15000)</script>
      </div>
    `);
  } else {
    res.send('<h1 style="font-family:sans-serif">Bot vivo - Si ves esto y ya escaneaste, todo OK. Si no, espera el QR...</h1>');
  }
});
app.listen(process.env.PORT || 10000, () => console.log('Web lista en puerto '+(process.env.PORT || 10000)));

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { 
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'] 
  }
});

client.on('qr', async qr => {
  console.log('QR GENERADO');
  lastQR = await qrcode.toDataURL(qr);
});

client.on('ready', () => {
  console.log('BOT LISTO');
  lastQR = null;
});

client.on('message', async msg => {
  let text = msg.body.trim();
  if (!text || msg.from.includes('@g.us')) return;
  let isAudio = false;
  if (text.toLowerCase().startsWith('audio ') || text.toLowerCase().startsWith('mp3 ')) {
    isAudio = true;
    text = text.slice(5).trim();
  }
  if (!ytdl.validateURL(text)) return;
  try {
    const info = await ytdl.getInfo(text);
    await msg.reply((isAudio?'🎵':'🎬') + ' ' + info.videoDetails.title + '\n⏬ Bajando...');
    const ext = isAudio?'mp3':'mp4';
    const file = '/tmp/' + Date.now() + '.' + ext;
    const opts = isAudio? { quality:'highestaudio', filter:'audioonly' } : { quality:'highest' };
    ytdl(text, opts).pipe(fs.createWriteStream(file)).on('finish', async () => {
      const media = MessageMedia.fromFilePath(file);
      await client.sendMessage(msg.from, media, { caption: (isAudio?'🎵':'🎬') + ' ' + info.videoDetails.title });
      fs.unlinkSync(file);
    });
  } catch (e) { 
    msg.reply('❌ Error: '+e.message); 
  }
});

client.initialize();
