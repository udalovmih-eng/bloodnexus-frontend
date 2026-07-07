// ============================================
// TELEGRAM WEB APP ІНІЦІАЛІЗАЦІЯ
// ============================================
const tg = window.Telegram.WebApp;
tg.expand();

// ============================================
// ОТРИМАННЯ ДАНИХ КОРИСТУВАЧА З TELEGRAM
// ============================================
const user = tg.initDataUnsafe?.user;

// ============================================
// API URL - ВАШ БЕКЕНД
// ============================================
const API_URL = 'https://bloodnexus-api.onrender.com/api'; // ⚠️ ЗМІНІТЬ НА ВАШ!

// ============================================
// СТАН КОРИСТУВАЧА
// ============================================
let currentUser = {
    id: null,
    username: null,
    firstName: null,
    balance: 0,
    level: 1,
    skins: 0,
    warns: 0,
    days: 0,
    dailyClaimed: false
};

// ============================================
// ЗАВАНТАЖЕННЯ ДАНИХ КОРИСТУВАЧА
// ============================================
function loadUserData() {
    if (user) {
        currentUser.id = user.id;
        currentUser.username = user.username || `user_${user.id}`;
        currentUser.firstName = user.first_name || 'Користувач';
        
        // Оновлюємо UI
        document.getElementById('userName').textContent = currentUser.firstName;
        document.getElementById('userTag').textContent = '@' + currentUser.username;
        
        // Аватар з першої літери
        const avatar = document.getElementById('userAvatar');
        avatar.textContent = currentUser.firstName.charAt(0).toUpperCase();
        avatar.style.background = '#e74c3c';
        avatar.style.color = '#fff';
        avatar.style.display = 'flex';
        avatar.style.alignItems = 'center';
        avatar.style.justifyContent = 'center';
        avatar.style.fontSize = '24px';
        avatar.style.fontWeight = 'bold';
        
        // Реєструємо та завантажуємо дані
        registerUser();
        loadUserStats();
        loadUserInventory();
    } else {
        document.getElementById('userName').textContent = 'Гість';
        document.getElementById('userTag').textContent = 'Увійдіть у Telegram';
    }
}

// ============================================
// РЕЄСТРАЦІЯ КОРИСТУВАЧА НА БЕКЕНДІ
// ============================================
function registerUser() {
    if (!user) return;
    
    fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            telegram_id: user.id,
            username: user.username || '',
            first_name: user.first_name || '',
            last_name: user.last_name || ''
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            console.log('✅ Користувача зареєстровано');
        }
    })
    .catch(err => console.error('❌ Помилка реєстрації:', err));
}

// ============================================
// ЗАВАНТАЖЕННЯ СТАТИСТИКИ КОРИСТУВАЧА
// ============================================
function loadUserStats() {
    if (!user) return;
    
    fetch(`${API_URL}/user/${user.id}`)
        .then(r => r.json())
        .then(data => {
            if (!data.error) {
                currentUser.balance = data.balance || 0;
                currentUser.level = data.level || 1;
                currentUser.warns = data.warns || 0;
                currentUser.days = data.days || 0;
                currentUser.dailyClaimed = data.daily_claimed || false;
                
                // Оновлюємо головну сторінку
                document.getElementById('userBalance').textContent = `🪙 ${currentUser.balance}`;
                document.getElementById('userLevel').textContent = `⭐ ${currentUser.level}`;
                document.getElementById('warnCount').textContent = currentUser.warns;
                document.getElementById('daysCount').textContent = currentUser.days;
                
                // Оновлюємо профіль
                updateProfilePage();
                
                // Оновлюємо магазин
                updateShopBalance();
            }
        })
        .catch(err => console.error('❌ Помилка завантаження даних:', err));
}

// ============================================
// ЗАВАНТАЖЕННЯ ІНВЕНТАРЯ
// ============================================
function loadUserInventory() {
    if (!user) return;
    
    fetch(`${API_URL}/inventory/${user.id}`)
        .then(r => r.json())
        .then(data => {
            if (!data.error) {
                currentUser.skins = data.length || 0;
                document.getElementById('skinCount').textContent = currentUser.skins;
            }
        })
        .catch(err => console.error('❌ Помилка завантаження інвентаря:', err));
}

// ============================================
// ЩОДЕННИЙ БОНУС
// ============================================
function claimDaily() {
    if (!user) {
        tg.showAlert('❌ Увійдіть у Telegram');
        return;
    }
    
    if (currentUser.dailyClaimed) {
        tg.showAlert('❌ Ви вже отримали бонус сьогодні!');
        return;
    }
    
    fetch(`${API_URL}/daily`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user.id })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            tg.showAlert('✅ ' + data.message);
            currentUser.balance += data.amount || 50;
            currentUser.dailyClaimed = true;
            document.getElementById('userBalance').textContent = `🪙 ${currentUser.balance}`;
            document.getElementById('bonusAmount').textContent = '✅ Отримано!';
            document.querySelector('.bonus-card .btn').textContent = '✅ Отримано';
            document.querySelector('.bonus-card .btn').disabled = true;
            document.querySelector('.bonus-card .btn').style.opacity = '0.5';
        } else {
            tg.showAlert('❌ ' + data.message);
        }
    })
    .catch(() => tg.showAlert('❌ Помилка сервера'));
}

// ============================================
// НАВІГАЦІЯ
// ============================================
function navigate(page) {
    const pages = {
        'home': '/index.html',
        'shop': '/shop.html',
        'inventory': '/inventory.html',
        'profile': '/profile.html'
    };
    
    if (pages[page]) {
        window.location.href = pages[page];
    }
}

// ============================================
// НАЛАШТУВАННЯ
// ============================================
function openSettings() {
    tg.showAlert('⚙️ Налаштування\n\nМова: Українська\nТема: Темна');
}

// ============================================
// ОНОВЛЕННЯ ПРОФІЛЮ
// ============================================
function updateProfilePage() {
    if (document.getElementById('profileName')) {
        document.getElementById('profileName').textContent = currentUser.firstName || 'Користувач';
        document.getElementById('profileTag').textContent = '@' + (currentUser.username || 'user');
        document.getElementById('profileBalance').textContent = currentUser.balance || 0;
        document.getElementById('profileLevel').textContent = currentUser.level || 1;
        document.getElementById('profileSkins').textContent = currentUser.skins || 0;
        document.getElementById('profileWarns').textContent = currentUser.warns || 0;
        
        // XP бар
        const xp = (currentUser.level || 1) * 100;
        const maxXp = (currentUser.level || 1) * 200;
        document.getElementById('xpCurrent').textContent = xp;
        document.getElementById('xpMax').textContent = maxXp;
        document.getElementById('xpFill').style.width = Math.min((xp / maxXp) * 100, 100) + '%';
        
        // Аватар
        const avatar = document.getElementById('profileAvatar');
        if (avatar) {
            avatar.textContent = currentUser.firstName?.charAt(0).toUpperCase() || '👤';
        }
    }
}

function updateShopBalance() {
    if (document.getElementById('shopBalance')) {
        document.getElementById('shopBalance').textContent = `🪙 ${currentUser.balance || 0}`;
    }
}

// ============================================
// МАГАЗИН
// ============================================
function loadShopSkins() {
    const container = document.getElementById('shopSkins');
    if (!container) return;
    
    fetch(`${API_URL}/skins`)
        .then(r => r.json())
        .then(skins => {
            container.innerHTML = skins.map(s => createSkinCard(s, true)).join('');
            updateShopBalance();
        })
        .catch(() => {
            container.innerHTML = getDemoSkins(true);
        });
}

function loadPopularSkins() {
    const container = document.getElementById('popularSkins');
    if (!container) return;
    
    fetch(`${API_URL}/skins/popular`)
        .then(r => r.json())
        .then(skins => {
            container.innerHTML = skins.map(s => createSkinCard(s, false)).join('');
        })
        .catch(() => {
            container.innerHTML = getDemoSkins(false);
        });
}

function loadInventory() {
    const container = document.getElementById('inventoryList');
    if (!container) return;
    if (!user) {
        container.innerHTML = '<p style="text-align:center;color:#888;">Увійдіть у Telegram</p>';
        return;
    }
    
    fetch(`${API_URL}/inventory/${user.id}`)
        .then(r => r.json())
        .then(skins => {
            const totalSkins = document.getElementById('totalSkins');
            if (totalSkins) totalSkins.textContent = skins.length + ' скінів';
            
            const equipped = skins.find(s => s.equipped);
            const equippedEl = document.getElementById('equippedSkin');
            if (equippedEl) {
                if (equipped) {
                    equippedEl.innerHTML = `
                        <div class="equipped-label">✅ Одягнутий скін:</div>
                        <div class="equipped-name">${equipped.name}</div>
                    `;
                } else {
                    equippedEl.innerHTML = `
                        <div class="equipped-label">✅ Одягнутий скін:</div>
                        <div class="equipped-name">Немає</div>
                    `;
                }
            }
            
            if (skins.length === 0) {
                container.innerHTML = '<p style="text-align:center;color:#888;">У вас немає скінів</p>';
            } else {
                container.innerHTML = skins.map(s => createSkinCard(s, false, true)).join('');
            }
        })
        .catch(() => {
            container.innerHTML = getDemoInventory();
        });
}

// ============================================
// СТВОРЕННЯ КАРТКИ СКІНА
// ============================================
function createSkinCard(skin, showBuy = false, showSell = false) {
    const rarityClass = (skin.rarity || 'common').toLowerCase();
    const stars = '⭐'.repeat(skin.stars || 1);
    const equippedBadge = skin.equipped ? ' ✅' : '';
    
    let actions = '';
    if (showBuy) {
        actions = `<button class="btn" onclick="buySkin(${skin.id})">Купити</button>`;
    }
    if (showSell) {
        actions = `<button class="btn btn-sell" onclick="sellSkin(${skin.id})">Продати</button>`;
    }
    
    return `
        <div class="skin-card" data-category="${skin.category || 'weapon'}">
            <div class="skin-icon">${skin.icon || '🔫'}</div>
            <div class="skin-name">${skin.name || 'Невідомий'}${equippedBadge}</div>
            <div class="skin-sub">${skin.description || ''}</div>
            <span class="skin-rarity ${rarityClass}">${stars} ${skin.rarity || 'Common'}</span>
            <div class="skin-price">${skin.price || 0} 🪙</div>
            <div class="skin-actions">${actions}</div>
        </div>
    `;
}

// ============================================
// ПОКУПКА ТА ПРОДАЖ
// ============================================
function buySkin(skinId) {
    if (!user) {
        tg.showAlert('❌ Увійдіть у Telegram');
        return;
    }
    
    fetch(`${API_URL}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, skin_id: skinId })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            tg.showAlert('✅ ' + data.message);
            loadUserStats();
            loadShopSkins();
        } else {
            tg.showAlert('❌ ' + data.message);
        }
    })
    .catch(() => tg.showAlert('❌ Помилка сервера'));
}

function sellSkin(skinId) {
    if (!confirm('Продати цей скін за 50% ціни?')) return;
    
    fetch(`${API_URL}/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, skin_id: skinId })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            tg.showAlert('✅ ' + data.message);
            loadUserStats();
            loadInventory();
        } else {
            tg.showAlert('❌ ' + data.message);
        }
    })
    .catch(() => tg.showAlert('❌ Помилка сервера'));
}

// ============================================
// ФІЛЬТРИ ТА ПОШУК
// ============================================
function filterSkins(category) {
    const btns = document.querySelectorAll('.filter-btn');
    btns.forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        document.querySelector(`.filter-btn[onclick*="${category}"]`)?.classList.add('active');
    }
    
    const cards = document.querySelectorAll('.skin-card');
    cards.forEach(card => {
        const cat = card.dataset.category || 'weapon';
        card.style.display = (category === 'all' || cat === category) ? 'block' : 'none';
    });
}

function searchSkins() {
    const query = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const cards = document.querySelectorAll('.skin-card');
    cards.forEach(card => {
        const name = card.querySelector('.skin-name')?.textContent?.toLowerCase() || '';
        const desc = card.querySelector('.skin-sub')?.textContent?.toLowerCase() || '';
        card.style.display = (name.includes(query) || desc.includes(query)) ? 'block' : 'none';
    });
}

// ============================================
// ДЕМО-ДАНІ
// ============================================
function getDemoSkins(more = false) {
    const skins = [
        { id: 1, name: 'AK-47', description: 'Червоний дракон', rarity: 'Legendary', stars: 4, price: 500, icon: '🔫', category: 'weapon' },
        { id: 2, name: 'M4A1', description: 'Нічний яструб', rarity: 'Epic', stars: 3, price: 350, icon: '🔫', category: 'weapon' },
        { id: 3, name: 'Ніж', description: 'Крижаний клинок', rarity: 'Rare', stars: 2, price: 200, icon: '🔪', category: 'knife' },
        { id: 4, name: 'Перк', description: 'Швидкий постріл', rarity: 'Common', stars: 1, price: 50, icon: '🎯', category: 'perk' }
    ];
    
    if (more) {
        skins.push(
            { id: 5, name: 'AWP', description: 'Драконова лють', rarity: 'Legendary', stars: 4, price: 800, icon: '🔫', category: 'weapon' },
            { id: 6, name: 'Deagle', description: 'Золотий орел', rarity: 'Epic', stars: 3, price: 450, icon: '🔫', category: 'weapon' }
        );
    }
    
    return skins.map(s => createSkinCard(s, true, false)).join('');
}

function getDemoInventory() {
    const skins = [
        { id: 1, name: 'AK-47', description: 'Червоний дракон', rarity: 'Legendary', stars: 4, price: 500, icon: '🔫', category: 'weapon', equipped: true },
        { id: 2, name: 'M4A1', description: 'Нічний яструб', rarity: 'Epic', stars: 3, price: 350, icon: '🔫', category: 'weapon', equipped: false }
    ];
    return skins.map(s => createSkinCard(s, false, true)).join('');
}

// ============================================
// ІНШІ ФУНКЦІЇ
// ============================================
function editProfile() {
    tg.showAlert('✏️ Редагування профілю буде скоро!');
}

function donate() {
    tg.showAlert('💖 Дякуємо за підтримку!\n\nЦе допоможе розвивати проєкт.');
}

// ============================================
// ЗАПУСК
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    loadUserData();
    
    const path = window.location.pathname;
    if (path.includes('shop.html')) {
        loadShopSkins();
    } else if (path.includes('inventory.html')) {
        loadInventory();
    } else if (path.includes('profile.html')) {
        updateProfilePage();
    } else {
        loadPopularSkins();
    }
});

console.log('✅ BloodNexus завантажено!');
console.log('📡 API URL:', API_URL);
console.log('👤 Користувач:', user ? user.first_name : 'Гість');
console.log('🆔 ID:', user ? user.id : 'Немає');
