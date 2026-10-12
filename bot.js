const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');

let lastQR = null;
const app = express();
const PORT = process.env.PORT || 10000;

// Cliente WhatsApp
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  }
});

client.on('qr', (qr) => {
  lastQR = qr;
  console.log('QR GENERADO');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('Auth OK');
});

client.on('ready', () => {
  console.log('BOT LISTO');
  lastQR = null;
});

client.on('auth_failure', (msg) => {
  console.log('Auth fallo, generando nuevo QR...', msg);
  lastQR = null;
});

client.on('disconnected', (reason) => {
  console.log('Desconectado', reason);
  lastQR = null;
});

// Evitar crash por auth timeout
process.on('unhandledRejection', (reason) => {
  console.log('Unhandled Rejection:', reason);
  if (String(reason).includes('auth timeout')) {
    lastQR = null;
  }
});

client.initialize().catch(err => console.log('Init error:', err));

// Pagina web para ver el QR
app.get('/', (req, res) => {
  if (lastQR) {
    const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(lastQR)}`;
    res.send(`
      <div style="text-align:center;font-family:sans-serif;padding:20px">
        <h2>Escanea este QR en WhatsApp</h2>
        <img src="${qrImg}" style="width:90vw;max-width:400px;border:10px solid white">
        <p>Se actualiza cada 15s. Escanea rapido!</p>
        <script>setTimeout(()=>location.reload(),15000)</script>
      </div>
    `);
  } else {
    res.send('<h2 style="font-family:sans-serif;text-align:center;margin-top:50px">Bot vivo ✅ Si ya escaneaste, todo OK<br><br>Si no has escaneado, espera 20s y refresca para ver el QR</h2>');
  }
});

app.listen(PORT, () => console.log(`Web lista en puerto ${PORT}`));

// --- LOGICA YOUTUBE ---
client.on('message', async (msg) => {
  const text = msg.body;
  if (!ytdl.validateURL(text) && !text.includes('youtu.be')) return;

  try {
    const url = text.split(' ')[0]; // toma solo el primer link
    const isAudio = text.toLowerCase().includes('audio');

    await msg.reply(`⏬ Bajando ${isAudio ? 'audio' : 'video'}...`);

    const info = await
