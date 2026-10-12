const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');

let lastQR = null;
const app = express();
const PORT = process.env.PORT || 10000;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--no-zygote',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-networking'
    ]
  }
});

client.on('qr', (qr) => {
  lastQR = qr;
  console.log('QR GENERADO - Ve a tu web');
});
client.on('authenticated', () => console.log('Auth OK'));
client.on('ready', () => {
  console.log('BOT LISTO!');
  lastQR = null;
});
client.on('disconnected', r => console.log('Desconectado', r));

client.initialize();

app.get('/', (req,res)=>{
  if(lastQR){
    const img=`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(lastQR)}`;
    res.send(`<center><h2>Escanea</h2><img src="${img}" style="width:400px"><script>setTimeout(()=>location.reload(),15000)</script></center>`);
  }else{
    res.send('<h2 style="text-align:center;margin-top:50px">✅ Bot conectado! Esta pagina puede tardar 50s en cargar porque es gratis</h2>');
  }
});
app.listen(PORT, ()=>console.log('Web lista '+PORT));
