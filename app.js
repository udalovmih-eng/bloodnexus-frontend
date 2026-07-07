// ============================================
// ІНІЦІАЛІЗАЦІЯ TELEGRAM WEB APP
// ============================================

const tg = window.Telegram.WebApp;
tg.expand(); // Розгортаємо на весь екран

// Отримуємо дані користувача
const user = tg.initDataUnsafe?.user;
if (user) {
    document.getElementById('userName').textContent = `👤 ${user.first_name} ${user.last_name || ''}`;
} else {
    document.getElementById('userName').textContent = '👤 Гість';
}

// ============================================
// ПЕРЕМИКАННЯ ВКЛАДОК
// ============================================

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
        // Видаляємо активний клас з усіх вкладок
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Активуємо поточну вкладку
        this.classList.add('active');
        const tabId = this.dataset.tab;
        document.getElementById(`tab-${tabId}`).classList.add('active');
    });
});

// ============================================
// ПОШУК КОРИСТУВАЧІВ
// ============================================

function searchUsers() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const users = document.querySelectorAll('.user-item');
    
    users.forEach(user => {
        const name = user.querySelector('.user-name').textContent.toLowerCase();
        if (name.includes(query)) {
            user.style.display = 'flex';
        } else {
            user.style.display = 'none';
        }
    });
}

// Пошук при натисканні Enter
document.getElementById('searchInput').addEventListener('keyup', function(e) {
    if (e.key === 'Enter') searchUsers();
});

// ============================================
// ДІЇ З КОРИСТУВАЧАМИ (відправка в бота)
// ============================================

function getUserId(button) {
    const userItem = button.closest('.user-item');
    return userItem.dataset.userId;
}

function banUser(button) {
    const userId = getUserId(button);
    if (!userId) return;
    
    const reason = prompt('Введіть причину бану:', 'Порушення правил');
    if (reason === null) return;
    
    if (confirm(`Ви впевнені, що хочете заблокувати цього користувача?`)) {
        tg.sendData(JSON.stringify({
            action: 'ban_user',
            user_id: parseInt(userId),
            reason: reason || 'Без причини'
        }));
        tg.showAlert('✅ Користувача заблоковано!');
    }
}

function muteUser(button) {
    const userId = getUserId(button);
    if (!userId) return;
    
    const duration = prompt('Введіть час муту (в секундах):', '60');
    if (duration === null || isNaN(duration) || duration <= 0) return;
    
    tg.sendData(JSON.stringify({
        action: 'mute_user',
        user_id: parseInt(userId),
        duration: parseInt(duration)
    }));
    tg.showAlert(`🔇 Користувача замучено на ${duration} секунд!`);
}

function kickUser(button) {
    const userId = getUserId(button);
    if (!userId) return;
    
    if (confirm('Ви впевнені, що хочете вигнати цього користувача?')) {
        tg.sendData(JSON.stringify({
            action: 'kick_user',
            user_id: parseInt(userId)
        }));
        tg.showAlert('👢 Користувача вигнано з чату!');
    }
}

// ============================================
// ЗБЕРЕЖЕННЯ НАЛАШТУВАНЬ
// ============================================

function saveSettings() {
    const settings = {
        antispam: document.getElementById('antiSpam').checked ? 1 : 0,
        slowmode: document.getElementById('slowMode').checked ? 1 : 0,
        slowDelay: parseInt(document.getElementById('slowDelay').value) || 5,
        welcome: document.getElementById('welcomeMessage').value,
        language: document.getElementById('language').value
    };
    
    tg.sendData(JSON.stringify({
        action: 'save_settings',
        settings: settings
    }));
    
    tg.showAlert('💾 Налаштування збережено!');
}

// ============================================
// ІГРИ
// ============================================

function playGame(game) {
    const games = {
        dice: { emoji: '🎲', name: 'Кістки' },
        quiz: { emoji: '❓', name: 'Вікторина' },
        roulette: { emoji: '🎰', name: 'Рулетка' },
        dart: { emoji: '🎯', name: 'Дартс' }
    };
    
    const gameInfo = games[game];
    if (!gameInfo) return;
    
    tg.sendData(JSON.stringify({
        action: 'play_game',
        game: game
    }));
    
    tg.showAlert(`${gameInfo.emoji} ${gameInfo.name} запущено!`);
}

// ============================================
// ОНОВЛЕННЯ СТАТИСТИКИ (з бота)
// ============================================

function updateStats(data) {
    if (data.users) document.getElementById('statUsers').textContent = data.users;
    if (data.messages) document.getElementById('statMessages').textContent = data.messages;
    if (data.banned) document.getElementById('statBanned').textContent = data.banned;
    if (data.active) document.getElementById('statActive').textContent = data.active + '%';
}

// ============================================
// ОБРОБКА ПОВІДОМЛЕНЬ ВІД БОТА
// ============================================

tg.onEvent('viewportChanged', function() {
    // Можна додати логіку при зміні розміру
});

// Отримуємо дані з бота (якщо бот надсилає)
tg.onEvent('mainButtonClicked', function() {
    // Якщо використовується головна кнопка
});

console.log('🚀 BloodNexus Mini App завантажено!');
console.log('👤 Користувач:', user);
