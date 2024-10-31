import express from 'express'
import { Telegraf } from 'telegraf'

const app = express()
app.get('/', async (req, res, next) => {
  const name = req.query['name']
  res.send(name ? `Hello Mr. ${name}` : 'Hello World!')
  next()
})
app.listen(8080, () => console.log('Server started'))

const token = process.env['TELEGRAM_BOT_TOKEN']
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is undefined')
const bot = new Telegraf(token)
bot.command('start', Telegraf.reply('Привет!'))
bot.launch(() => console.log('Bot started'))


bot.command('sendfile', (ctx) => {
  ctx.replyWithDocument({
    source: 'путь_к_файлу/файл.pdf' // Укажите путь к файлу
  })
    .then(() => {
      console.log('Файл успешно отправлен!');
    })
    .catch((error) => {
      console.error('Ошибка при отправке файла:', error);
    });
});