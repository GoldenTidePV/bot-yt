const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');

let lastQR = null;
const app = express();
const PORT = process.env.PORT || 10000;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--single-process','--no-zygote']
  }
});

client.on('qr', qr => {
  lastQR = qr;
  console.log('QR GENERADO - Ve a tu web');
});
client.on('authenticated', () => console.log('Auth OK'));
client.on('ready', () => {
  console.log('BOT LISTO!');
  lastQR = null;
});

client.on('message', async msg => {
  const text = msg.body;
  if (!ytdl.validateURL(text)) return;

  try {
    await msg.reply('⏳ Bajando audio...');
    const info = await ytdl.getInfo(text);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi,'').substring(0,30);
    
    const file = `/tmp/${title}.mp3`;
    const stream = ytdl(text, { filter: 'audioonly', quality: 'highestaudio' });
    
    const write = fs.createWriteStream(file);
    stream.pipe(write);

    write.on('finish', async () => {
      const media = require('whatsapp-web.js').MessageMedia.fromFilePath(file);
      await client.sendMessage(msg.from, media, { sendAudioAsVoice: false });
      fs.unlinkSync(file);
    });
  } catch(e){
    console.log(e);
    msg.reply('Error al descargar: ' + e.message);
  }
});

client.initialize();

app.get('/', (req,res)=>{
  if(lastQR){
    const img=`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(lastQR)}`;
    res.send(`<center><h2>Escanea</h2><img src="${img}" style="width:400px"><script>setTimeout(()=>location.reload(),15000)</script></center>`);
  }else{
    res.send('<h2 style="text-align:center;margin-top:50px">✅ Bot conectado! Mándame un link de YouTube</h2>');
  }
});
app.listen(PORT, ()=>console.log('Web lista '+PORT));
