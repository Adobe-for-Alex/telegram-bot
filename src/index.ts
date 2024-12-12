import { Menu, MenuRange } from "@grammyjs/menu"
import {Bot, Context, InlineKeyboard, Keyboard, session, SessionFlavor} from "grammy"
import { PlanId } from "./aliases"
import { PrismaClient } from "@prisma/client"
import PlansInPrisma from "./plans/PlansInPrisma"
import UsersInPrisma from "./users/UsersInPrisma"
import AdminsInPrisma from "./admins/AdminsInPrisma"
import express from "express"
import SubscriptionService from "./sessions/SubscriptionService"
import NotificationService from "./notification/notification";
import DiscountService from "./discount/discount";
import ReferralService from "./referral/referral";
import cron from 'node-cron'

const token = process.env['TELEGRAM_BOT_TOKEN']
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is undefined')
const subscriptionServiceBaseUrl = process.env['SUBSCRIPTION_SERVICE_BASE_URL']
if (!subscriptionServiceBaseUrl) throw new Error('SUBSCRIPTION_SERVICE_BASE_URL is undefined')
const webhookPath = process.env['SUBSCRIPTION_SERVICE_WEBHOOK_UPDATE_PATH']
if (!webhookPath) throw new Error('SUBSCRIPTION_SERVICE_WEBHOOK_UPDATE_PATH is undefined')

const prisma = new PrismaClient()
const plans = new PlansInPrisma(prisma)
const users = new UsersInPrisma(prisma)
const discount = new DiscountService(prisma);
const referral = new ReferralService(prisma);
const sessions = new SubscriptionService(new URL(subscriptionServiceBaseUrl), prisma)

interface Session {
  planId?: PlanId,
  planType?: 'all' | 'one' | 'admin' | 'adminDelete',
  product?: string,
  waitForText?: boolean
  waitForPrice?: boolean
  waitForDuration?: boolean
  price?: number
  duration?: number
}
type ContextWithSession = Context & SessionFlavor<Session>

const bot = new Bot<ContextWithSession>(token)
bot.use(session({ initial: () => ({}) }))
bot.use((ctx, next) => {
  console.log(`User ${ctx.from?.id} Chat ${ctx.chat?.id} Message ${ctx.message?.message_id} Callback ${ctx.update.callback_query?.data}`)
  return next()
})
const notification = new NotificationService(prisma, bot as unknown as Bot);

const admins = new AdminsInPrisma(bot.api, prisma)
bot.use(admins.middleware(plans, users, sessions, discount))
bot.use(discount.middleware());

cron.schedule('*/1 * * * *', async () => {
  await notification.notifyExpireSoon();
  await notification.notifyExpired();
  await discount.checkForPersonalDiscounts(notification);
  await discount.checkForTemporaryDiscounts(notification);
});

const paymentMenu = new Menu<ContextWithSession>('payment-menu')
    .text('Отменить', async ctx => {
      await ctx.editMessageReplyMarkup( { reply_markup: new InlineKeyboard() });
      if (ctx.session.planId === undefined) return;
      delete ctx.session.planId;
      await ctx.deleteMessage();
      await ctx.reply('Оплата отменена')
    }).row()
    .back('Назад', async ctx => {
      await ctx.editMessageText('Отлично! Выберете нужный вам тариф.')
    })

const products = [
  'Photoshop',
  'Illustrator',
  'Firefly для генерации изображений',
  'After Effects',
  'Premier Pro',
  'Lightroom',
  'Lightroom Classic',
  'Acrobat',
  'Character Animator',
  'Incopy',
  'InDesign',
  'Animate',
  'Fresco',
  'Premier Rush',
  'Audition'
]

const productMenu = new Menu<ContextWithSession>('product-menu')
    .dynamic(async () => {
      const range = new MenuRange<ContextWithSession>()
      for (const product of products) {
        range.text(product, async ctx => {
          ctx.session.product = product;
          if (!ctx.session.planId) return;
          const plan = await plans.withId(ctx.session.planId);
          if (!plan) return;
          const personalDiscount = await discount.getPersonalDiscount(`${ctx.from?.id}`);
          const price = await plan.getPrice();
          const userPrice = price - (personalDiscount) * price / 100;
          await ctx.deleteMessage();
          await ctx.reply(
              `Вы выбрали продукт: ${product}
${await plan.asString()}\n` +
            (personalDiscount !== 0 ? `Ваша цена ${userPrice} рублей (с учётом персональной скидки в ${personalDiscount}%)\n` : '') +
`Вам необходимо оплатить его и отправить нам чек
Реквезиты для оплаты: <реквизиты>`,
              { reply_markup: paymentMenu }
          )
        }).row()
      }
      return range;
    })
    .back('Назад')

const deleteDiscountMenu = new Menu<ContextWithSession>('delete-discount-menu')
  .text('Подтвердить', async ctx => {
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
    await ctx.reply('Скидка была удалена');
    const plan = await plans.withId(ctx.session.planId ?? -1);
    const planType = await plan?.isSingle() ? 'Adobe CC все приложения + ИИ' : 'Adobe CC одно приложение';
    await notification.globalMessage(`Скидка\n${planType}\n${await plan?.asString()},\nбыла завершена`)
    await discount.deleteDiscount(ctx.session.planId ?? -1);
  }).row()
  .text('Отменить', async ctx => {
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
    await ctx.reply('Операция была отменена');
  })
bot.use(deleteDiscountMenu.middleware());

const monthMenu = new Menu<ContextWithSession>('month-menu')
  .dynamic(async (ctx) => {
    const range = new MenuRange<ContextWithSession>();

    for (const plan of await plans.all()) {
      const planString = await plan.asString();
      const planId = await plan.id();
      const hasDiscount = await plan.hasDiscount();
      const isSingle = await plan.isSingle();
      const personalDiscount = await discount.getPersonalDiscount(`${ctx.from?.id}`);
      const price = await plan.getPrice();
      const userPrice = price - (personalDiscount) * price / 100;

      switch (ctx.session.planType) {
        case 'adminDelete':
          if (!hasDiscount) continue;
          range.text(planString, async ctx => {
            await ctx.reply(`Выбран план ${planString}, id: ${planId}`);
            await ctx.reply('Вы действительно хотите убрать скидку?', { reply_markup: deleteDiscountMenu });
            ctx.session.planId = planId;
            ctx.session.waitForPrice = true;
          }).row();
          break;
        case 'admin':
          if (hasDiscount) continue;
          range.text(planString, async ctx => {
            await ctx.reply(`Выбран план ${planString}, id: ${planId}`);
            await ctx.reply('Введите новую цену');
            ctx.session.planId = planId;
            ctx.session.waitForPrice = true;
          }).row();
          break;
        case 'one':
          if (isSingle) {
            range.text(planString, async ctx => {
              await ctx.deleteMessage();
              ctx.session.planId = planId;
              await ctx.reply(
                'Adobe Creative Cloud одно приложение:\n' +
                '- Любая программа из всех на ваш выбор\n' +
                '- 1000 генеративных кредитов (в случае выбора приложений с Firefly)\n' +
                '- 2 ТБ облака\n' +
                '- Для 2-х устройств\n' +
                '- Поддержка Windows, Mac, iOS, iPadOS, Android\n' +
                '- Никаких ограничений\n' +
                '- Постоянные обновления \n',
                { reply_markup: productMenu }
              );
            }).row();
          }
          break;
        case 'all':
          if (!isSingle) {
            range.text(`${planString}`, async ctx => {
              await ctx.deleteMessage();
              ctx.session.planId = planId;
              await ctx.reply(
                `Вы выбрали тариф: ${planString}\n` +
                (personalDiscount !== 0 ? `Ваша цена ${userPrice} рублей (с учётом скидки в ${personalDiscount}%)\n` : '') +
                'Вам необходимо оплатить его и отправить нам чек\n' +
                'Реквизиты для оплаты: <реквизиты>',
                { reply_markup: paymentMenu }
              );
            }).row();
          }
          break;
        default:
          break;
      }
    }

    return range;
  })
  .back('Назад', async ctx => {
    await ctx.editMessageText('Отлично! Выберете нужный вам тариф.');
  });


monthMenu.register(paymentMenu);
monthMenu.register(productMenu);

const typeMenu = new Menu<ContextWithSession>('type-menu')
    .text('Adobe CC все приложения + ИИ', async ctx => {
      await ctx.deleteMessage();
      ctx.session.planType = 'all';
      await ctx.reply(
          'Выберите период',
          { reply_markup: monthMenu }
      )
    }).row()
    .text('Adobe CC одно приложение', async ctx => {
      await ctx.deleteMessage();
      ctx.session.planType = 'one';
      await ctx.reply(
          'Adobe Creative Cloud  одно приложение:\n' +
          '- Любая программа из всех на ваш выбор\n' +
          '- 1000 генеративных кредитов (в случае выбора приложений с Firefly)\n' +
          '- 2 ТБ облака\n' +
          '- Для 2-х устройств\n' +
          '- Поддержка Windows, Mac, iOS, iPadOS, Android\n' +
          '- Никаких ограничений\n' +
          '- Постоянные обновления \n',
          { reply_markup: monthMenu }
      )
    }).row()
  .text('Купить через менеджера', async ctx => {
    await ctx.editMessageReplyMarkup({reply_markup: new InlineKeyboard() });
    await ctx.reply(`Аккаунт менеджера ${textData.support}`);
  })
typeMenu.register(monthMenu);
bot.use(typeMenu.middleware());

bot.command('start', async ctx => {
  const referralCode = ctx.message?.text.split(' ')[1];
  if (referralCode) {
    if (await referral.createReferral(referralCode, ctx.from?.id.toString() ?? '1')) {
      await discount.givePersonalDiscount(referralCode, 25);
      await notification.privateMessage(referralCode, 'Вы пригласили рефералаа, вам положена скидка 25% на следующую покупку, успейте в течении 4 дней!');
    }
  }
  await ctx.reply(
      'Привет! Добро пожаловать в наш сервис.',
      {
        reply_markup: new Keyboard()
          .text('Текущая подписка📝').row()
          .text('Оплатить/Продлить подписку💸').row()
          .text('Сотрудничество. Дропшиппинг⚙️').row()
          .text('Онлайн поддержка👨🏽‍💻').row()
          .text('Реферальная система').row()
          .resized()
      }
  )
})

bot.command('admin', async ctx => {
    const user = await users.withId(ctx.chatId.toString());
    if (!await user.isAdmin()) {
        return;
    }
    await ctx.reply(
        'Админ меню.',
        {
            reply_markup: new Keyboard()
                .text('Глобальное сообщение').row()
                .text('Временная скидка').row()
                .text('Текущие скидки').row()
                .resized()
        }
    )
})

const declineMenu = new Menu<ContextWithSession>('decline')
  .text('Отменить', async ctx => {
    ctx.session.waitForText = false;
    await ctx.deleteMessage();
  })
bot.use(declineMenu.middleware());

bot.hears('Глобальное сообщение', async ctx => {
  ctx.session.waitForText = false;
  ctx.session.waitForPrice = false;
  ctx.session.waitForDuration = false;
    const user = await users.withId(ctx.chatId.toString());
    if (!await user.isAdmin()) {
        return;
    }
    ctx.session.waitForText = true;
    await ctx.reply(
        'Введите сообщение.',
        {
            reply_markup: declineMenu
        }
    );
})

bot.hears('Временная скидка', async ctx => {
  ctx.session.waitForText = false;
  ctx.session.waitForPrice = false;
  ctx.session.waitForDuration = false;
    const user = await users.withId(ctx.chatId.toString());
    if (!await user.isAdmin()) {
        return;
    }
    ctx.session.planType = 'admin';
    await ctx.reply(
        'Выберите тариф.',
        {
            reply_markup: monthMenu
        }
    );
})

bot.hears('Текущие скидки', async ctx => {
  ctx.session.waitForText = false;
  ctx.session.waitForPrice = false;
  ctx.session.waitForDuration = false;
  const user = await users.withId(ctx.chatId.toString());
  if (!await user.isAdmin()) {
    return;
  }
  ctx.session.planType = 'adminDelete';
  await ctx.reply(
    'Выберите тариф.',
    {
      reply_markup: monthMenu
    }
  );
})

bot.hears('Текущая подписка📝', async ctx => {
  if (ctx.from === undefined) return
  const user = await users.withId(`${ctx.from.id}`)
  const subscription = await user.subscrption()
  if (subscription === undefined || await subscription.ended() < new Date()) {
    await ctx.reply('У вас сейчас нету подписки')
    return
  }
  await ctx.reply(await subscription.asString())
})

bot.hears('Оплатить/Продлить подписку💸', async ctx => {
  await ctx.reply(
      'Отлично! Выберете нужный вам тариф.',
      { reply_markup: typeMenu }
  )
})

bot.hears('Сотрудничество. Дропшиппинг⚙️', async ctx => {
  await ctx.reply(
      'Добрый день! 👋 Команда SoftPlus рада приветствовать вас!\n' +
      '\n' +
      'Мы всегда открыты к сотрудничеству и ищем новых партнёров, готовых зарабатывать вместе с нами. Наша система дропшиппинга — это модель, при которой вы реализуете наш товар через свои платформы: Авито, социальные сети, собственный сайт, маркетплейсы или любые другие удобные для вас каналы.\n' +
      'Вы полностью контролируете свои продажи, самостоятельно устанавливаете цены и зарабатываете на своей разнице.\n' +
      '\n' +
      'Для вас будет создан индивидуальный бот, который автоматизирует весь процесс:\n' +
      ' • создаёт аккаунты для ваших клиентов,\n' +
      ' • отправляет их напрямую,\n' +
      ' • выдаёт новые в случае форс-мажоров,\n' +
      ' • продлевает подписки и уведомляет клиентов.\n' +
      '\n' +
      'Всё, что от вас требуется, — направлять клиентов в вашего персонального бота, а остальное мы берём на себя.\n' +
      '\n' +
      'Что мы предлагаем:\n' +
      ' • 📦 Автоматизированная система дропшиппинга: Система сама автоматически будет выдавать аккаунты клиентам, принимать платежи, продлевать, присылать данные и инструкцию, осуществлять замены проблемных аккаунтов, если такие будут!\n' +
      ' • 💰 Индивидуальные цены: Для наших партнеров действуют специальные условия на покупку аккаунтов.\n' +
      ' • 🚀 Полная поддержка: Мы готовы помочь вам в любое время и обеспечить надежное сотрудничество.\n' +
      '\n' +
      'Мы будем рады видеть вас в числе наших партнеров!\n' +
      'Для вопросов по сотрудничеству обращайтесь:\n' +
      '📩 @softplus_ww (с 08:00 до 23:00 по МСК ежедневно).\n' +
      '\n' +
      'С уважением,\n' +
      'Команда SoftPlus'
  )
})

bot.hears('Онлайн поддержка👨🏽‍💻', async ctx => {
  await ctx.reply(
      'Аккаунт поддержки: @softplus_ww'
  )
})

bot.hears('Реферальная система', async ctx => {
  const user = await users.withId(`${ctx.from?.id}`);
  const referralLink = referral.getReferralCode(await user.id());
  await ctx.reply(
    `Ваша реферальная ссылка: ${referralLink}\n` +
    `У вас ${await referral.getReferralsCount(`${ctx.from?.id}`)} рефералов`
  );
})

bot.on(['message:document', 'message:photo'], async ctx => {
  const planId = ctx.session.planId
  if (planId === undefined) return
  const plan = await plans.withId(planId)
  if (!plan) {
    await ctx.reply('Ошибка! Выбранный вами тариф не найден. Для возврата средств обратитесь к администратору')
    return
  }
  const admin = await admins.any()
  try {
    const filePath = await ctx.getFile().then(x => x.file_path)
    if (filePath === undefined) throw new Error('Failed to get file_path of document')
    const personalDiscount = await discount.getPersonalDiscount(`${ctx.from?.id}`);
    const plan = await plans.withId(ctx.session.planId ?? -1);
    if (!plan) return;
    const price = await plan.getPrice();
    const priceWithRefDiscount = price - (personalDiscount) * price / 100;
    await admin.requestCheck(plan, await users.withId(`${ctx.from.id}`), [personalDiscount, priceWithRefDiscount], ctx.message.message_id, filePath)
    delete ctx.session.planId
  } catch (e) {
    await ctx.reply('Ошибка! Что-то пошло не так, когда мы направляли запрос администратору. '
      + 'Попробуйте отправить чек еще раз или обратитесь к администратору для возврата средств')
    throw e
  }
  await ctx.reply('Ваш чек был отправлен администратору для проверки. Ожидайте подтверждения')
})

const confirmNewPrice = new Menu<ContextWithSession>('new-price')
  .text('Подтвердить', async ctx => {
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
    const plan = await plans.withId(ctx.session.planId ?? -1);
    const planType = await plan?.isSingle() ? 'Adobe CC все приложения + ИИ' : 'Adobe CC одно приложение';
    await notification.globalMessage(`Объявлена скидка на тариф\n ${planType}\n ${await plan?.asString()},\n успейте в течении ${ctx.session.duration} дней`)
    await discount.createDiscount(ctx.session.planId ?? -1, ctx.session.price ?? -1, ctx.session.duration ?? -1)
    await ctx.reply('Цена изменена');
  }).row()
  .text('Отклонить', async ctx => {
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
    await ctx.reply('Цена не была изменена');
  })
bot.use(confirmNewPrice);

bot.hears(/^.+$/, async ctx => {
    const user = await users.withId(ctx.chatId.toString());
    if (!await user.isAdmin()) return;
    if (!ctx.message) return;
    if (!ctx.session.waitForText && !ctx.session.waitForPrice && !ctx.session.waitForDuration) return;
    if (ctx.session.waitForText) {
      await notification.globalMessage(`${ctx.message.text}`);
      ctx.session.waitForText = false;
    }
    else if (ctx.session.waitForPrice) {
      const price = ctx.message.text ?? '1';
      ctx.session.price = parseInt(price);
      if (isNaN(ctx.session.price)) return;
      await ctx.reply('Введите длительность (дней)');
      ctx.session.waitForDuration = true;
      ctx.session.waitForPrice = false;
    }
    else if (ctx.session.waitForDuration) {
      const duration = ctx.message.text ?? '1';
      ctx.session.duration = parseInt(duration);
      if (isNaN(ctx.session.duration)) return;
      await ctx.reply(
        'Вы действительно хотите изменить тариф\n' +
        `${(await (await plans.withId(ctx.session.planId ?? 1))?.asString())}\n` +
        `Новая цена: ${ctx.session.price} рублей\n` +
        `Новая длительность: ${ctx.session.duration} дней`,
        {
          reply_markup: confirmNewPrice,
        });
      ctx.session.waitForDuration = false;
    }
});

bot.catch(details => console.error(`User ${details.ctx.from?.id} Chat ${details.ctx.chat?.id}`, details.error))
bot.start({ onStart: () => console.log('Bot started') })

const webhook = express().use(express.json())
webhook.use((req, _, next) => {
  console.log(req.method, req.path, 'Query:', req.query, 'Body:', req.body)
  return next()
})
webhook.post(webhookPath, async (req, res, next) => {
  try {
    const { id, email, password } = req.body
    await sessions.update(id, email, password)
    const user = await sessions.withId(id).then(x => x?.user())
    if (!user) throw new Error(`Session ${id} not found while update it`)
    await bot.api.sendMessage(
      await user.id(),
      `Данные вашей подписки были обновленны:

${await user.subscrption().then(x => x?.asString())}`
    )
    res.status(200).send('Updated')
  } catch (e) {
    return next(e)
  }
})
webhook.listen(8080, () => console.log('Server started'))
