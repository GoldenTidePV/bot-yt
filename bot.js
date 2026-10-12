const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
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

client.on('qr', qr => { lastQR = qr; console.log('QR GENERADO'); });
client.on('authenticated', () => console.log('Auth OK'));
client.on('ready', () => { console.log('BOT LISTO!'); lastQR = null; });

client.on('message_create', async msg => {
  const text = msg.body.trim();
  console.log('Mensaje recibido:', text);
  
  if (!ytdl.validateURL(text)) return;

  try {
    await msg.reply('⏳ Bajando audio... 20s');
    const info = await ytdl.getInfo(text);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi,'').substring(0,25);
    const file = `/tmp/${title}.mp3`;
    
    await new Promise((resolve, reject) => {
      ytdl(text, { filter: 'audioonly', quality: 'highestaudio' })
        .pipe(fs.createWriteStream(file))
        .on('finish', resolve)
        .on('error', reject);
    });

    const media = MessageMedia.fromFilePath(file);
    await client.sendMessage(msg.from, media);
    fs.unlinkSync(file);
    console.log('Audio enviado!');
  } catch(e){
    console.log('ERROR YT:', e);
    msg.reply('❌ Error: ' + e.message);
  }
});

client.initialize();

app.get('/', (req,res)=>{
  if(lastQR){
    const img=`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(lastQR)}`;
    res.send(`<center><h2>Escanea</h2><img src="${img}" style="width:400px"></center>`);
  }else{
    res.send('<h2 style="text-align:center;margin-top:50px">✅ Bot conectado! Mándame un link de YouTube</h2>');
  }
});
app.listen(PORT, ()=>console.log('Web lista '+PORT));
