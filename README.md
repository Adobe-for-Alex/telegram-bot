# Telegram Bot

Бот для взаимодействия с конечным пользователем.
Позволяет оформит подписку на постоянный доступ
к аккаунтам с продуктами Adobe (открыть сессию на время действия подписки).

Сервер бота взаимодействует с
[сервисом подписок](https://github.com/Adobe-for-Alex/subscription-service)

# Пользовательские сценарии

## Команда /start

- Поприветсвовать пользователя
- Предложить оформить подписку (например с клавиатурой)
- Если пользователь согласился, то перейти к сценарию с оформлением подписки

## Оформление подписки

- Дать пользователю выбрать период подписки (1 месяц, 3 месяца, 6 месяцев)
- Выслать пользователю банковские реквезиты для оплаты
- Дождать от пользователя картинки или PDF-файла с чеком оплаты
- Отправить чек на проверку админу (их может быть несколько)
- Дождаться подтверждения от админа
- Если админ подтвердил оплату - выделить пользователю сессию с подпиской
- Если админ отклонил оплату смотри сценарий
[Проверка платежа](#проверка-платежа)

### Проверка платежа

- Админ получает сообщение с именем пользователя, который преобретает подписку,
скидкой, которую пользователь получил, чеком оплаты
и клавиатурой с вариантами решений: кнопка "Подтвердить",
остальные кнопки - причина отказа в подтверждении платежа
("Обманщик", "Не нравится твое лицо" и т.д.)
- Если по истечению таймаута админ не обработал заказ,
то запрос передается случайному свободному админу
- Админ нажимает на одну из кнопок
- Админу высылается сообщение с подтверждением операции

## Когда подписка истекает

- Предложить пользователю продлить подписку
- Если пользователь отказался, тогда предложить скидку 10%
- Если пользователь согласился, тогда смотри сценарий
[Оформление подписки](#офрмление-подписки)

# REST API

## POST `/update-session`

Обновить данные аккаунта закрепленные за пользователем бота.
Пользователь должен быть уведомлен об изменении данных аккаунта

### Body

```json
{
  "session": "some-external-user-session-id",
  "email": "new-account-email",
  "password": "new-account-password"
}
```

# Основные технологии

- [Telegraf](https://www.npmjs.com/package/telegraf)
- [Express](https://www.npmjs.com/package/express)
- [Prisma](https://www.npmjs.com/package/prisma)

# Как внести свои измменения?

- Форкаешь репозиторий
- Клонишь свой форк
- Создаешь отдельную ветку для своиз изменений
(это важно для избежания гемороя при параллельной разработке нескольких фич)
- Комитишь изменения в свою ветку
- Оформляешь Pull Request
- Если твои изменения исправляют какие-то проблемы из раздела Issue,
то добавь их номера в описании PR в следующем виде:
```
Fixes #1
Fixes #2
Fixes #3
```
[Почему так стоит делать](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue)

