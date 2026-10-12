const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const ytdl = require('@distube/ytdl-core');
const { MessageMedia } = require('whatsapp-web.js');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot vivo'));
app.listen(process.env.PORT || 10000);

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { 
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'] 
  }
});

client.on('qr', qr => {
  qrcode.generate(qr, {small: true});
  console.log(qr);
});

client.on('ready', () => console.log('BOT LISTO'));

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
