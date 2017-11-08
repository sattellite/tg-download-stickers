# Telegram bot for download stickers set


[![Node](https://img.shields.io/badge/node-%3E%3D6.2.0-brightgreen.svg?style=flat-square)]()

Just send sticker to bot and it will reply to your message with zip-archived set of sended sticker.

Bot written with [NodeJS](https://nodejs.org/) and [Telegraf framework](https://github.com/telegraf/telegraf).

## Installation

1. `git clone https://github.com/sattellite/tg-download-stickers.git`
2. `cd tg-download-stickers`
3. `yarn install` or `npm install`
4.  Get a [bot token](https://core.telegram.org/bots) by chatting with [BotFather](https://core.telegram.org/bots#6-botfather).
5. `BOT_TOKEN=xxx yarn start` or `BOT_TOKEN=xxx npm run start`


Now you can send stickers to your bot and recieve archives with stickers set.

## Docker

With `docker-compose` you can build container for bot. Just execute in bot directory:

`BOT_TOKEN=xxx docker-compose up -d --build`
