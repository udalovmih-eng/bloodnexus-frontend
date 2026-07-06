// ============================================
// TELEGRAM WEB APP ІНІЦІАЛІЗАЦІЯ
// ============================================
// Перевіряємо, чи доступний Telegram WebApp
let tg = null;
let user = null;

try {
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        tg.expand();
        user = tg.initDataUnsafe.user;
        console.log('✅ Telegram WebApp успішно завантажено');
    } else {
        console.warn('⚠️ Telegram WebApp не доступний. Використовуємо тестові дані.');
        // Тестові дані для браузера
        user = {
            id: 435968860,
            first_name: 'tdev.exe',
            username: 'tdev_exe',
            language_code: 'uk'
        };
    }
} catch (e) {
    console.error('❌ Помилка ініціалізації Telegram:', e);
    user = {
        id: 435968860,
        first_name: 'tdev.exe',
        username: 'tdev_exe',
        language_code: 'uk'
    };
}

// ============================================
// ДАНІ КОРИСТУВАЧА
// ============================================
let currentUser = { id: null, username: null, firstName: null, balance: 0, level: 1, skins: 0 };

// ============================================
// API URL - ВАШ NGROK URL
// ============================================
const API_URL = 'https://quartet-footprint-dandruff.ngrok-free.dev/api';

// ============================================
// ЗАВАНТАЖЕННЯ ДАНИХ КОРИСТУВАЧА
// ============================================
function loadUserData() {
    if (user) {
        currentUser.id = user.id;
        currentUser.username = user.username || 'user';
        currentUser.firstName = user.first_name || 'Користувач';
        
        document.getElementById('userName').textContent = currentUser.firstName;
        document.getElementById('userTag').textContent = '@' + currentUser.username;
        
        const avatar = document.getElementById('userAvatar');
        avatar.textContent = currentUser.firstName.charAt(0).toUpperCase();
        avatar.style.background = '#e74c3c';
        avatar.style.color = '#fff';
        avatar.style.display = 'flex';
        avatar.style.alignItems = 'center';
        avatar.style.justifyContent = 'center';
        avatar.style.fontSize = '24px';
        avatar.style.fontWeight = 'bold';
        
        registerUser();
        loadUserStats();
    } else {
        document.getElementById('userName').textContent = 'Гість';
        document.getElementById('userTag').textContent = 'Увійдіть у Telegram';
    }
}

function registerUser() {
    if (!user) return;
    fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            telegram_id: user.id,
            username: user.username || '',
            first_name: user.first_name || ''
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('✅ Користувача зареєстровано:', data);
    })
    .catch(err => console.error('❌ Помилка реєстрації:', err));
}

function loadUserStats() {
    if (!user) return;
    
    console.log(`📡 Запит до API: ${API_URL}/user?telegram_id=${user.id}`);
    
    fetch(`${API_URL}/user?telegram_id=${user.id}`)
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            console.log('📊 Отримано дані користувача:', data);
            if (!data.error) {
                currentUser.balance = data.balance || 0;
                currentUser.level = data.level || 1;
                document.getElementById('userBalance').textContent = `🪙 ${currentUser.balance}`;
                document.getElementById('userLevel').textContent = `⭐ ${currentUser.level}`;
                updateProfilePage();
            }
        })
        .catch(err => {
            console.error('❌ Помилка завантаження даних:', err);
            // Показуємо демо-дані при помилці
            document.getElementById('userBalance').textContent = `🪙 100`;
            document.getElementById('userLevel').textContent = `⭐ 1`;
        });
    
    fetch(`${API_URL}/inventory?user_id=${user.id}`)
        .then(r => r.json())
        .then(data => {
            if (!data.error) {
                currentUser.skins = data.length || 0;
                document.getElementById('skinCount').textContent = currentUser.skins;
            }
        })
        .catch(err => console.error('❌ Помилка завантаження інвентаря:', err));
}

function updateProfilePage() {
    if (document.getElementById('profileName')) {
        document.getElementById('profileName').textContent = currentUser.firstName || 'Користувач';
        document.getElementById('profileTag').textContent = '@' + (currentUser.username || 'user');
        document.getElementById('profileBalance').textContent = currentUser.balance || 0;
        document.getElementById('profileLevel').textContent = currentUser.level || 1;
        document.getElementById('profileSkins').textContent = currentUser.skins || 0;
    }
    if (document.getElementById('shopBalance')) {
        document.getElementById('shopBalance').textContent = `🪙 ${currentUser.balance || 0}`;
    }
}

function navigate(page) {
    const baseUrl = '';
    const pages = {
        'home': `/index.html`,
        'shop': `/shop.html`,
        'inventory': `/inventory.html`,
        'profile': `/profile.html`
    };
    if (page === 'donate') { alert('💖 Дякуємо!'); return; }
    if (pages[page]) { window.location.href = pages[page]; }
}

function claimDaily() {
    if (!user) { alert('❌ Увійдіть у Telegram'); return; }
    fetch(`${API_URL}/daily`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user.id })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) { alert('✅ ' + data.message); location.reload(); }
        else { alert('❌ ' + data.message); }
    })
    .catch(() => alert('❌ Помилка'));
}

function loadPopularSkins() {
    const container = document.getElementById('popularSkins');
    if (!container) return;
    fetch(`${API_URL}/skins?limit=4`)
        .then(r => r.json())
        .then(skins => { container.innerHTML = skins.map(s => createSkinCard(s)).join(''); })
        .catch(() => { container.innerHTML = getDemoSkins(); });
}

function loadShopSkins() {
    const container = document.getElementById('shopSkins');
    if (!container) return;
    fetch(`${API_URL}/skins`)
        .then(r => r.json())
        .then(skins => { container.innerHTML = skins.map(s => createSkinCard(s, true)).join(''); })
        .catch(() => { container.innerHTML = getDemoSkins(true); });
}

function loadInventory() {
    const container = document.getElementById('inventoryList');
    if (!container) return;
    if (!user) { container.innerHTML = '<p style="text-align:center;color:#888;">Увійдіть у Telegram</p>'; return; }
    
    fetch(`${API_URL}/inventory?user_id=${user.id}`)
        .then(r => r.json())
        .then(skins => {
            document.getElementById('totalSkins').textContent = skins.length + ' скінів';
            const equipped = skins.find(s => s.equipped);
            if (equipped) {
                document.getElementById('equippedSkin').innerHTML = `
                    <div class="equipped-label">✅ Одягнутий скін:</div>
                    <div class="equipped-name">${equipped.name}</div>
                `;
            } else {
                document.getElementById('equippedSkin').innerHTML = `
                    <div class="equipped-label">✅ Одягнутий скін:</div>
                    <div class="equipped-name">Немає</div>
                `;
            }
            if (skins.length === 0) { container.innerHTML = '<p style="text-align:center;color:#888;">У вас немає скінів</p>'; }
            else { container.innerHTML = skins.map(s => createSkinCard(s, false, true)).join(''); }
        })
        .catch(() => { container.innerHTML = getDemoInventory(); });
}

function createSkinCard(skin, showBuy = true, showSell = false) {
    const rarityClass = (skin.rarity || 'common').toLowerCase();
    const stars = '⭐'.repeat(skin.stars || 1);
    let actions = '';
    if (showBuy) { actions = `<button class="btn" onclick="buySkin(${skin.id})">Купити</button>`; }
    if (showSell) { actions = `<button class="btn btn-sell" onclick="sellSkin(${skin.id})">Продати</button>`; }
    const equippedBadge = skin.equipped ? ' ✅' : '';
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

function buySkin(skinId) {
    if (!user) { alert('❌ Увійдіть у Telegram'); return; }
    fetch(`${API_URL}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, skin_id: skinId })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) { alert('✅ ' + data.message); location.reload(); }
        else { alert('❌ ' + data.message); }
    })
    .catch(() => alert('❌ Помилка'));
}

function sellSkin(skinId) {
    if (!confirm('Продати?')) return;
    fetch(`${API_URL}/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, skin_id: skinId })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) { alert('✅ ' + data.message); location.reload(); }
        else { alert('❌ ' + data.message); }
    })
    .catch(() => alert('❌ Помилка'));
}

function filterSkins(category) {
    const btns = document.querySelectorAll('.filter-btn');
    btns.forEach(btn => btn.classList.remove('active'));
    if (event && event.target) { event.target.classList.add('active'); }
    const cards = document.querySelectorAll('.skin-card');
    cards.forEach(card => {
        const cat = card.dataset.category || 'weapon';
        card.style.display = (category === 'all' || cat === category) ? 'block' : 'none';
    });
}

function searchSkins() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const cards = document.querySelectorAll('.skin-card');
    cards.forEach(card => {
        const name = card.querySelector('.skin-name')?.textContent?.toLowerCase() || '';
        card.style.display = name.includes(query) ? 'block' : 'none';
    });
}

function editProfile() { alert('✏️ Скоро буде!'); }
function donate() { alert('💖 Дякуємо!'); }

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

document.addEventListener('DOMContentLoaded', function() {
    loadUserData();
    const path = window.location.pathname;
    if (path.includes('shop.html')) { loadShopSkins(); }
    else if (path.includes('inventory.html')) { loadInventory(); }
    else { loadPopularSkins(); }
});

console.log('✅ BloodNexus завантажено!');
console.log('📡 API URL:', API_URL);
console.log('👤 Користувач:', user ? user.first_name : 'Гість');
