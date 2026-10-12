const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

let lastQR = null;
const app = express();
const PORT = process.env.PORT || 10000;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] }
});

client.on('qr', (qr) => {
  lastQR = qr;
  console.log('QR GENERADO');
  qrcode.generate(qr, {small:true});
});

client.on('authenticated', () => console.log('Auth OK'));
client.on('ready', () => {
  console.log('BOT LISTO');
  lastQR = null;
});
client.on('auth_failure', m => {
  console.log('Auth fallo', m);
  lastQR = null;
});
client.on('disconnected', r => {
  console.log('Desconectado', r);
  lastQR = null;
});

process.on('unhandledRejection', r => {
  console.log('Unhandled:', r);
  lastQR = null;
});

client.initialize().catch(e => console.log('Init error', e));

app.get('/', (req,res)=>{
  if(lastQR){
    const url=`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(lastQR)}`;
    res.send(`<center><h2>Escanea este QR</h2><img src="${url}" style="width:400px"><script>setTimeout(()=>location.reload(),15000)</script></center>`);
  } else {
    res.send('<h2>Bot vivo - Si ya escaneaste todo OK</h2>');
  }
});

app.listen(PORT, ()=>console.log('Web lista en puerto '+PORT));
