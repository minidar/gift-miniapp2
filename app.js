// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Переменные
let selectedGiftId = null;
let selectedGiftName = null;
let gifts = [];
let isLoading = false;

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
    
    try {
        setStatus('⏳ Загрузка ваших NFT-подарков...', 'loading');
        sendBtn.disabled = true;
        
        const queryId = tg.webAppQueryId || 'test_query_id';
        
        const data = { 
            action: 'get_gifts',
            user_id: user.id,
            query_id: queryId
        };
        
        console.log('📤 Запрос подарков:', data);
        tg.sendData(JSON.stringify(data));
        
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        setStatus('❌ Ошибка загрузки подарков', 'error');
        isLoading = false;
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
                    Купите подарок в Telegram и он появится здесь
                </div>
            </div>
        `;
        return;
    }
    
    gifts.forEach(gift => {
        const div = document.createElement('div');
        div.className = 'gift-item';
        div.dataset.id = gift.id;
        
        const emoji = gift.emoji || '🎁';
        
        div.innerHTML = `
            <div class="gift-emoji">${emoji}</div>
            <div class="gift-info">
                <div class="gift-name">${gift.name || 'Без названия'}</div>
                <div class="gift-price">${gift.price || 'Цена неизвестна'}</div>
            </div>
        `;
        
        div.addEventListener('click', () => {
            document.querySelectorAll('.gift-item').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            selectedGiftId = gift.id;
            selectedGiftName = gift.name;
            sendBtn.disabled = false;
            setStatus(`✅ Выбран: ${gift.name}`, 'success');
        });
        
        giftList.appendChild(div);
    });
}

// ============================================
// ОТПРАВКА ПОДАРКА
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
        }, 2000);
        
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
// ОБРАБОТКА ДАННЫХ ОТ БОТА
// ============================================
tg.onEvent('data', (data) => {
    console.log('📥 Получены данные от бота:', data);
    
    try {
        const response = JSON.parse(data);
        
        // ✅ ОБРАБОТКА ПОДАРКОВ
        if (response.gifts) {
            gifts = response.gifts;
            renderGifts();
            
            if (gifts.length > 0) {
                setStatus(`✅ Загружено ${gifts.length} подарков`, 'success');
            } else {
                setStatus('📭 У вас нет подарков', '');
            }
            sendBtn.disabled = true;
            isLoading = false;
        }
        
        // Обработка статуса
        if (response.status) {
            if (response.status === 'loading') {
                setStatus('⏳ ' + response.message, 'loading');
            } else if (response.status === 'success') {
                setStatus('✅ ' + response.message, 'success');
            } else if (response.status === 'error') {
                setStatus('❌ ' + response.message, 'error');
                isLoading = false;
                sendBtn.disabled = false;
            }
        }
        
    } catch (e) {
        console.log('ℹ️ Не JSON ответ:', data);
    }
});

// ============================================
// ОБРАБОТКА ЗАКРЫТИЯ
// ============================================
tg.onEvent('close', () => {
    console.log('👋 Mini App закрыт');
});

// ============================================
// ЗАПУСК
// ============================================
loadGifts();

// Экспорт функций для HTML
window.sendGift = sendGift;
window.closeApp = closeApp;
