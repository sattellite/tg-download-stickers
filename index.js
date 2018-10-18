const Telegraf = require('telegraf');
const Telegram = require('telegraf/telegram');
const rimraf = require('rimraf');
const https = require('https');
const request = require('request');
const os = require('os');
const fs = require('fs');
const { dirname, sep } = require('path');

const archiver = require('archiver');

const tmpDir = os.tmpdir();

const { BOT_TOKEN } = process.env;

if (!BOT_TOKEN) {
  process.stderr.write('You must set environment variable "BOT_TOKEN"');
  process.exit(1);
}

const dateTimeFormatter = Intl.DateTimeFormat('ru-RU', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});

const bot = new Telegraf(BOT_TOKEN);
const tg = new Telegram(BOT_TOKEN);

const normalizeURL = url => `https://api.telegram.org/file/bot${BOT_TOKEN}/${url}`;

const pad = (num, size) => `000000000${num}`.slice(-size);

const downloadSticker = (url, name, path) =>
  new Promise((resolve, reject) => {
    const file = fs.createWriteStream(`${path}${sep}${pad(name, 4)}.webp`);
    https
      .get(normalizeURL(url), (response) => {
        const stream = response.pipe(file);
        stream.on('finish', () => {
          file.end();
          return resolve(`${path}${sep}${pad(name, 4)}.webp`);
        });
        stream.on('error', e => reject(e));
      })
      .on('error', e => reject(e));
  });

const getStickerSet = (chatId, setName) => {
  const meta = { stickers: {} };
  return new Promise((resolve, reject) => {
    fs.mkdtemp(`${tmpDir}${sep}`, (err, folder) => {
      if (err) return reject(err);
      return fs.mkdir(`${folder}${sep}${setName}`, (error) => {
        if (error) return reject(error);
        return resolve(`${folder}${sep}${setName}`);
      });
    });
  })
    .then((folder) => {
      meta.path = folder;
      return tg.getStickerSet(setName);
    })
    .then((set) => {
      meta.name = set.name;
      meta.title = set.title;
      return Promise.all(set.stickers.map((sticker, i) => {
        meta.stickers[i] = sticker.emoji;
        return tg.getFile(sticker.file_id).then(f => downloadSticker(f.file_path, i, meta.path));
      }));
    })
    .then(res => ({ files: res, meta }));
};

const writeMeta = (path, data) =>
  new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(`${path}${sep}metainfo.json`);

    stream.write(JSON.stringify(data));
    stream.on('finish', () => resolve(`${path}${sep}metainfo.json`));
    stream.on('error', e => reject(e));
    stream.end('\n');
  });

const archiveStickers = (path, name, files, meta) =>
  new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(`${dirname(path)}${sep}${name}.zip`);
    stream.on('finish', () => resolve({ path: `${dirname(path)}${sep}${name}.zip`, meta }));

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', e => reject(e));

    archive.pipe(stream);
    archive.directory(path, name).finalize();
  });

const sendFileToChat = (chatId, filePath, caption, replyTo) =>
  new Promise((resolve, reject) => {
    request.post(
      {
        url: `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument?caption=${caption}&reply_to_message_id=${replyTo}&chat_id=${chatId}`,
        formData: {
          document: fs.createReadStream(filePath),
        },
      },
      (err, response) => {
        if (err) return reject(err);
        const body = JSON.parse(response.body);
        if (body.ok) {
          return resolve(filePath);
        }
        return reject(body);
      },
    );
  });

bot.use((ctx, next) => {
  console.info(`[${dateTimeFormatter.format(new Date())}] [INFO] ${JSON.stringify(ctx.from)}`);
  return next(ctx);
});

bot.start((ctx) => {
  ctx.reply('I can help you download one sticker or it set with meta. Send me a sticker 😋');
});

bot.command('help', ctx => ctx.reply('I can download one sticker or sticker set with meta'));

bot.on('sticker', (ctx) => {
  const { sticker } = ctx.message;
  return ctx
    .reply('Началась обработка. Подождите, пожалуйста')
    .then(msg => getStickerSet(msg.chat.id, sticker.set_name))
    .then((data) => {
      const { meta, files } = data;
      return writeMeta(meta.path, {
        name: meta.name,
        title: meta.title,
        stickers: meta.stickers,
      })
        .then(res => files.push(res))
        .then(() => ({ files, meta }));
    })
    .then(data => archiveStickers(data.meta.path, data.meta.name, data.files, data.meta))
    .then(data =>
      sendFileToChat(
        ctx.message.chat.id,
        data.path,
        `Набор "${data.meta.title}"`,
        ctx.message.message_id,
      ))
    .then(data => new Promise(resolve => rimraf(dirname(data), resolve)))
    .catch((err) => {
      ctx.reply('Что-то пошло не так. Попробуйте отправить стикер еще раз.');
      throw err;
    });
});

// Catch all error. Simple handler show date and error stack
bot.catch(err => console.error(`[${dateTimeFormatter.format(new Date())}] [ERROR] `, err));

console.info(`[${dateTimeFormatter.format(new Date())}] [INFO] Bot started`);
bot.startPolling();
