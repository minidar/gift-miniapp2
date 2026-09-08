// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Переменные
let selectedGiftId = null;
let selectedGiftName = null;
let gifts = [];
let isLoading = false;
let isWaitingForGifts = false;
let messageCheckInterval = null;

// Получаем данные пользователя
const user = tg.initDataUnsafe?.user || { id: 6659503490, username: 'f1nsk1' };
console.log('👤 Пользователь:', user);

// DOM элементы
const giftList = document.getElementById('gift-list');
const sendBtn = document.getElementById('sendBtn');
const statusDiv = document.getElementById('status');

// ============================================
// ЗАГРУЗКА ПОДАРКОВ
// ============================================
async function loadGifts() {
    if (isLoading) return;
    if (user.id === 0) {
        setStatus('⚠️ Ошибка авторизации', 'error');
        return;
    }
    
    isLoading = true;
    isWaitingForGifts = true;
    
    try {
        setStatus('⏳ Загрузка ваших NFT-подарков...', 'loading');
        sendBtn.disabled = true;
        
        giftList.innerHTML = '<div class="loading">⏳ Загрузка...</div>';
        
        const queryId = tg.webAppQueryId || 'test_query_id';
        
        const data = { 
            action: 'get_gifts',
            user_id: user.id,
            query_id: queryId
        };
        
        console.log('📤 Запрос подарков:', data);
        tg.sendData(JSON.stringify(data));
        
        // Ждём ответ от бота (сообщение в чат)
        waitForGiftsMessage();
        
        // Таймаут
        setTimeout(() => {
            if (isWaitingForGifts) {
                setStatus('⏳ Если подарки не загрузились, проверьте бота', '');
                isWaitingForGifts = false;
                isLoading = false;
            }
        }, 10000);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        setStatus('❌ Ошибка загрузки подарков', 'error');
        isLoading = false;
        isWaitingForGifts = false;
    }
}

// ============================================
// ОЖИДАНИЕ СООБЩЕНИЯ ОТ БОТА
// ============================================
function waitForGiftsMessage() {
    // Проверяем сообщения в чате каждые 500 мс
    if (messageCheckInterval) {
        clearInterval(messageCheckInterval);
    }
    
    messageCheckInterval = setInterval(() => {
        if (!isWaitingForGifts) {
            clearInterval(messageCheckInterval);
            return;
        }
        
        try {
            // Ищем сообщения от бота в DOM
            const messages = document.querySelectorAll('.message');
            for (const msg of messages) {
                if (msg.dataset.processed) continue;
                const text = msg.textContent || '';
                
                // Проверяем, содержит ли сообщение наш текст
                if (text.includes('Ваши NFT-подарки') || text.includes('У вас нет NFT-подарков')) {
                    msg.dataset.processed = 'true';
                    
                    // Парсим сообщение
                    parseGiftsFromMessage(text);
                    isWaitingForGifts = false;
                    isLoading = false;
                    clearInterval(messageCheckInterval);
                    return;
                }
            }
        } catch (e) {
            console.log('Ошибка при проверке сообщений:', e);
        }
    }, 500);
}

// ============================================
// ПАРСИНГ ПОДАРКОВ ИЗ СООБЩЕНИЯ
// ============================================
function parseGiftsFromMessage(text) {
    console.log('📥 Парсинг сообщения:', text);
    
    // Проверяем, есть ли подарки
    if (text.includes('У вас нет NFT-подарков')) {
        gifts = [];
        renderGifts();
        setStatus('📭 У вас нет NFT-подарков', '');
        sendBtn.disabled = true;
        return;
    }
    
    // Парсим подарки из сообщения
    const lines = text.split('\n');
    const parsedGifts = [];
    let currentGift = null;
    
    for (const line of lines) {
        // Строка с номером и названием: "1. 💎 **CandyCane-105118**"
        if (line.match(/^\d+\./)) {
            if (currentGift) {
                parsedGifts.push(currentGift);
            }
            const match = line.match(/^\d+\.\s*(.)\s*\*\*(.+?)\*\*/);
            if (match) {
                currentGift = {
                    id: null,
                    name: match[2].trim(),
                    emoji: match[1] || '💎',
                    price: '0⭐'
                };
            }
        }
        // Строка с ID: "   🆔 ID: `6003373314888696650`"
        if (line.includes('🆔 ID:')) {
            const match = line.match(/🆔 ID:\s*`(.+?)`/);
            if (match && currentGift) {
                currentGift.id = match[1].trim();
            }
        }
    }
    
    if (currentGift) {
        parsedGifts.push(currentGift);
    }
    
    if (parsedGifts.length > 0) {
        gifts = parsedGifts;
        renderGifts();
        setStatus(`✅ Загружено ${gifts.length} NFT-подарков`, 'success');
        sendBtn.disabled = true;
    } else {
        // Если не удалось распарсить, показываем сообщение
        setStatus('ℹ️ Подарки найдены, но не распарсены', '');
        giftList.innerHTML = `
            <div class="loading">
                <div style="font-size: 24px; margin-bottom: 12px;">📨</div>
                <div>Подарки отправлены в чат</div>
                <div style="font-size: 13px; margin-top: 8px; opacity: 0.6;">
                    Проверьте сообщение от бота выше
                </div>
            </div>
        `;
    }
}

// ============================================
// ОТОБРАЖЕНИЕ ПОДАРКОВ
// ============================================
function renderGifts() {
    giftList.innerHTML = '';
    
    if (!gifts || gifts.length === 0) {
        giftList.innerHTML = `
            <div class="loading">
                <div style="font-size: 48px; margin-bottom: 12px;">📭</div>
                <div>У вас нет NFT-подарков</div>
                <div style="font-size: 13px; margin-top: 8px; opacity: 0.6;">
                    Купите подарок в Telegram и улучшите его за звёзды
                </div>
            </div>
        `;
        return;
    }
    
    gifts.forEach(gift => {
        const div = document.createElement('div');
        div.className = 'gift-item';
        div.dataset.id = gift.id;
        
        const emoji = gift.emoji || '💎';
        const name = gift.name || 'Без названия';
        const price = gift.price || '0⭐';
        
        div.innerHTML = `
            <div class="gift-emoji">${emoji}</div>
            <div class="gift-info">
                <div class="gift-name">${name}</div>
                <div class="gift-price">${price}</div>
            </div>
        `;
        
        div.addEventListener('click', () => {
            document.querySelectorAll('.gift-item').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            selectedGiftId = gift.id;
            selectedGiftName = name;
            sendBtn.disabled = false;
            setStatus(`✅ Выбран: ${name}`, 'success');
        });
        
        giftList.appendChild(div);
    });
}

// ============================================
// ОТПРАВКА ВЫБРАННОГО ПОДАРКА
// ============================================
function sendGift() {
    if (!selectedGiftId) {
        setStatus('⚠️ Сначала выберите подарок', 'error');
        return;
    }
    
    setStatus('⏳ Отправка подарка...', 'loading');
    sendBtn.disabled = true;
    
    const data = {
        action: 'send_gift',
        gift_id: selectedGiftId,
        gift_name: selectedGiftName,
        user_id: user.id,
        username: user.username || 'guest'
    };
    
    console.log('📤 Отправка подарка:', data);
    
    try {
        tg.sendData(JSON.stringify(data));
        setStatus('✅ Подарок отправлен!', 'success');
        
        setTimeout(() => {
            tg.close();
        }, 1500);
        
    } catch (error) {
        console.error('❌ Ошибка отправки:', error);
        setStatus('❌ Ошибка отправки. Попробуйте снова.', 'error');
        sendBtn.disabled = false;
    }
}

// ============================================
// ЗАКРЫТИЕ MINI APP
// ============================================
function closeApp() {
    tg.close();
}

// ============================================
// УСТАНОВКА СТАТУСА
// ============================================
function setStatus(text, type = '') {
    statusDiv.textContent = text;
    statusDiv.className = 'status ' + type;
}

// ============================================
// ОБРАБОТКА ДАННЫХ ОТ БОТА (web_app_data)
// ============================================
tg.onEvent('data', (data) => {
    console.log('📥 Получены данные от бота (web_app_data):', data);
    try {
        const response = JSON.parse(data);
        if (response.gifts) {
            gifts = response.gifts;
            renderGifts();
            setStatus(`✅ Загружено ${gifts.length} NFT-подарков`, 'success');
            sendBtn.disabled = true;
            isLoading = false;
            isWaitingForGifts = false;
            if (messageCheckInterval) {
                clearInterval(messageCheckInterval);
            }
        }
    } catch (e) {
        console.log('ℹ️ Не JSON ответ:', data);
    }
});

// ============================================
// ЗАПУСК
// ============================================
loadGifts();

// Экспорт функций для HTML
window.sendGift = sendGift;
window.closeApp = closeApp;
