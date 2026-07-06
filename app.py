import asyncio
import logging
import threading
import sqlite3
import os
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiogram.enums import ParseMode
from aiogram.types import CallbackQuery

# ============================================
# НАЛАШТУВАННЯ
# ============================================
TOKEN = "8598779608:AAFHE9nDK2cPqkBQAEwWXHTQ57UssdeKZmM"

# ВАЖЛИВО: ВСТАВТЕ СЮДИ URL ВАШОГО ФРОНТЕНДУ
# Для продакшну (Vercel):
WEBAPP_URL = "https://bloodnexus-frontend.vercel.app"

# Для локального тесту:
# WEBAPP_URL = "http://localhost:5000"

# Flask додаток
app = Flask(__name__)
CORS(app)

# Telegram бот
bot = Bot(token=TOKEN)
dp = Dispatcher()

logging.basicConfig(level=logging.INFO)

# ============================================
# БАЗА ДАНИХ
# ============================================
# ВИКОРИСТОВУЄМО /tmp ДЛЯ RENDER (БО ТАМ МОЖНА ПИСАТИ)
DB_PATH = 'bloodnexus.db'
# DB_PATH = 'bloodnexus.db'  # ДЛЯ ЛОКАЛЬНОГО ЗАПУСКУ

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id INTEGER UNIQUE NOT NULL,
            username TEXT,
            first_name TEXT,
            balance INTEGER DEFAULT 100,
            level INTEGER DEFAULT 1,
            experience INTEGER DEFAULT 0,
            daily_claimed TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS skins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price INTEGER NOT NULL,
            rarity TEXT DEFAULT 'Common',
            stars INTEGER DEFAULT 1,
            icon TEXT DEFAULT '🔫',
            category TEXT DEFAULT 'weapon'
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            skin_id INTEGER NOT NULL,
            purchased_at TEXT DEFAULT CURRENT_TIMESTAMP,
            equipped BOOLEAN DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (skin_id) REFERENCES skins (id) ON DELETE CASCADE
        )
    ''')
    
    cursor.execute("SELECT COUNT(*) FROM skins")
    if cursor.fetchone()[0] == 0:
        demo_skins = [
            ('AK-47', 'Червоний дракон', 500, 'Legendary', 4, '🔫', 'weapon'),
            ('M4A1', 'Нічний яструб', 350, 'Epic', 3, '🔫', 'weapon'),
            ('Ніж', 'Крижаний клинок', 200, 'Rare', 2, '🔪', 'knife'),
            ('Перк', 'Швидкий постріл', 50, 'Common', 1, '🎯', 'perk'),
            ('AWP', 'Драконова лють', 800, 'Legendary', 4, '🔫', 'weapon'),
            ('Deagle', 'Золотий орел', 450, 'Epic', 3, '🔫', 'weapon'),
        ]
        cursor.executemany(
            "INSERT INTO skins (name, description, price, rarity, stars, icon, category) VALUES (?, ?, ?, ?, ?, ?, ?)",
            demo_skins
        )
    
    conn.commit()
    conn.close()
    print(f"✅ База даних ініціалізована: {DB_PATH}")

def get_user(telegram_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE telegram_id = ?", (telegram_id,))
    user = cursor.fetchone()
    conn.close()
    return user

def get_or_create_user(telegram_id, username=None, first_name=None):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    user = get_user(telegram_id)
    if not user:
        cursor.execute(
            "INSERT INTO users (telegram_id, username, first_name) VALUES (?, ?, ?)",
            (telegram_id, username, first_name)
        )
        conn.commit()
        cursor.execute("SELECT * FROM users WHERE telegram_id = ?", (telegram_id,))
        user = cursor.fetchone()
    
    conn.close()
    return user

# ============================================
# API ЕНДПОІНТИ
# ============================================

@app.route('/')
def home():
    return '''
    <h1>🔥 BloodNexus API</h1>
    <p>Сервер працює!</p>
    <p>📡 API доступний за адресою: <a href="/api/skins">/api/skins</a></p>
    <p>🤖 Бот: @Project248_bot</p>
    <p>📱 Mini App: <a href="''' + WEBAPP_URL + '''">''' + WEBAPP_URL + '''</a></p>
    <p>🔗 WebApp URL: ''' + WEBAPP_URL + '''</p>
    '''

@app.route('/api/user', methods=['GET'])
def api_get_user():
    telegram_id = request.args.get('telegram_id')
    if not telegram_id:
        return jsonify({'error': 'telegram_id required'}), 400
    
    user = get_user(int(telegram_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'id': user[0],
        'telegram_id': user[1],
        'username': user[2],
        'first_name': user[3],
        'balance': user[4],
        'level': user[5],
        'experience': user[6],
        'created_at': user[8]
    })

@app.route('/api/skins', methods=['GET'])
def api_get_skins():
    category = request.args.get('category')
    limit = request.args.get('limit', 100)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    if category and category != 'all':
        cursor.execute(
            "SELECT * FROM skins WHERE category = ? LIMIT ?",
            (category, int(limit))
        )
    else:
        cursor.execute("SELECT * FROM skins LIMIT ?", (int(limit),))
    
    skins = cursor.fetchall()
    conn.close()
    
    result = []
    for skin in skins:
        result.append({
            'id': skin[0],
            'name': skin[1],
            'description': skin[2],
            'price': skin[3],
            'rarity': skin[4],
            'stars': skin[5],
            'icon': skin[6],
            'category': skin[7]
        })
    
    return jsonify(result)

@app.route('/api/inventory', methods=['GET'])
def api_get_inventory():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'user_id required'}), 400
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT s.*, i.equipped, i.purchased_at
        FROM inventory i
        JOIN skins s ON i.skin_id = s.id
        WHERE i.user_id = ?
    ''', (int(user_id),))
    
    items = cursor.fetchall()
    conn.close()
    
    result = []
    for item in items:
        result.append({
            'id': item[0],
            'name': item[1],
            'description': item[2],
            'price': item[3],
            'rarity': item[4],
            'stars': item[5],
            'icon': item[6],
            'category': item[7],
            'equipped': bool(item[8]),
            'purchased_at': item[9]
        })
    
    return jsonify(result)

@app.route('/api/buy', methods=['POST'])
def api_buy_skin():
    data = request.json
    user_id = data.get('user_id')
    skin_id = data.get('skin_id')
    
    if not user_id or not skin_id:
        return jsonify({'success': False, 'message': 'Missing data'}), 400
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM skins WHERE id = ?", (skin_id,))
    skin = cursor.fetchone()
    if not skin:
        conn.close()
        return jsonify({'success': False, 'message': 'Скін не знайдено'})
    
    cursor.execute("SELECT balance FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return jsonify({'success': False, 'message': 'Користувача не знайдено'})
    
    if user[0] < skin[3]:
        conn.close()
        return jsonify({'success': False, 'message': 'Недостатньо монет'})
    
    cursor.execute(
        "SELECT * FROM inventory WHERE user_id = ? AND skin_id = ?",
        (user_id, skin_id)
    )
    if cursor.fetchone():
        conn.close()
        return jsonify({'success': False, 'message': 'Цей скін вже у вас є'})
    
    cursor.execute(
        "INSERT INTO inventory (user_id, skin_id) VALUES (?, ?)",
        (user_id, skin_id)
    )
    cursor.execute(
        "UPDATE users SET balance = balance - ? WHERE id = ?",
        (skin[3], user_id)
    )
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Скін куплено!'})

@app.route('/api/sell', methods=['POST'])
def api_sell_skin():
    data = request.json
    user_id = data.get('user_id')
    skin_id = data.get('skin_id')
    
    if not user_id or not skin_id:
        return jsonify({'success': False, 'message': 'Missing data'}), 400
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT * FROM inventory WHERE user_id = ? AND skin_id = ?",
        (user_id, skin_id)
    )
    inv = cursor.fetchone()
    if not inv:
        conn.close()
        return jsonify({'success': False, 'message': 'Скін не знайдено в інвентарі'})
    
    cursor.execute("SELECT price FROM skins WHERE id = ?", (skin_id,))
    skin = cursor.fetchone()
    
    sell_price = skin[0] // 2
    
    cursor.execute(
        "DELETE FROM inventory WHERE user_id = ? AND skin_id = ?",
        (user_id, skin_id)
    )
    cursor.execute(
        "UPDATE users SET balance = balance + ? WHERE id = ?",
        (sell_price, user_id)
    )
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': f'Скін продано за {sell_price} монет'})

@app.route('/api/daily', methods=['POST'])
def api_daily():
    data = request.json
    telegram_id = data.get('telegram_id')
    
    if not telegram_id:
        return jsonify({'success': False, 'message': 'Missing telegram_id'}), 400
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    user = get_user(int(telegram_id))
    if not user:
        conn.close()
        return jsonify({'success': False, 'message': 'Користувача не знайдено'})
    
    last_claimed = user[7]
    today = datetime.now().strftime('%Y-%m-%d')
    
    if last_claimed == today:
        conn.close()
        return jsonify({'success': False, 'message': 'Ви вже отримали бонус сьогодні'})
    
    cursor.execute(
        "UPDATE users SET balance = balance + 50, daily_claimed = ? WHERE telegram_id = ?",
        (today, int(telegram_id))
    )
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Бонус отримано! +50 монет'})

@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.json
    telegram_id = data.get('telegram_id')
    username = data.get('username')
    first_name = data.get('first_name')
    
    if not telegram_id:
        return jsonify({'success': False, 'message': 'telegram_id required'}), 400
    
    user = get_or_create_user(int(telegram_id), username, first_name)
    return jsonify({
        'success': True,
        'user': {
            'id': user[0],
            'telegram_id': user[1],
            'username': user[2],
            'first_name': user[3],
            'balance': user[4],
            'level': user[5]
        }
    })

# ============================================
# ТЕЛЕГРАМ БОТ
# ============================================

@dp.message(Command("start"))
async def start_command(message: types.Message):
    get_or_create_user(
        message.from_user.id,
        message.from_user.username,
        message.from_user.first_name
    )
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🚀 Відкрити BloodNexus",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )],
        [
            InlineKeyboardButton(text="👤 Профіль", callback_data="profile"),
            InlineKeyboardButton(text="🛒 Магазин", callback_data="shop")
        ],
        [
            InlineKeyboardButton(text="📦 Інвентар", callback_data="inventory"),
            InlineKeyboardButton(text="💰 Баланс", callback_data="balance")
        ],
        [InlineKeyboardButton(text="📅 Щоденний бонус", callback_data="daily")]
    ])
    
    await message.answer(
        f"🔥 <b>Ласкаво просимо до BloodNexus, {message.from_user.first_name}!</b>\n\n"
        "👇 Натисніть кнопку, щоб відкрити додаток!",
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML
    )

@dp.message(Command("profile"))
async def profile_command(message: types.Message):
    user = get_user(message.from_user.id)
    if user:
        await message.answer(
            f"👤 <b>Ваш профіль</b>\n\n"
            f"🪙 Баланс: {user[4]} монет\n"
            f"⭐ Рівень: {user[5]}\n"
            f"📊 Досвід: {user[6]}",
            parse_mode=ParseMode.HTML
        )
    else:
        await message.answer("❌ Профіль не знайдено")

@dp.message(Command("balance"))
async def balance_command(message: types.Message):
    user = get_user(message.from_user.id)
    balance = user[4] if user else 0
    await message.answer(f"🪙 <b>Ваш баланс:</b> {balance} монет", parse_mode=ParseMode.HTML)

@dp.callback_query()
async def handle_callback(callback: CallbackQuery):
    data = callback.data
    
    await callback.answer()
    
    if data == "profile":
        user = get_user(callback.from_user.id)
        balance = user[4] if user else 0
        await callback.message.answer(f"👤 <b>Профіль</b>\n\n🪙 Баланс: {balance} монет", parse_mode=ParseMode.HTML)
    
    elif data == "shop":
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text="🛒 Відкрити магазин",
                web_app=WebAppInfo(url=WEBAPP_URL + "/shop.html")
            )]
        ])
        await callback.message.answer("🛒 <b>Магазин</b>", reply_markup=keyboard, parse_mode=ParseMode.HTML)
    
    elif data == "inventory":
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text="📦 Відкрити інвентар",
                web_app=WebAppInfo(url=WEBAPP_URL + "/inventory.html")
            )]
        ])
        await callback.message.answer("📦 <b>Інвентар</b>", reply_markup=keyboard, parse_mode=ParseMode.HTML)
    
    elif data == "balance":
        user = get_user(callback.from_user.id)
        balance = user[4] if user else 0
        await callback.message.answer(f"🪙 <b>Ваш баланс:</b> {balance} монет", parse_mode=ParseMode.HTML)
    
    elif data == "daily":
        user = get_user(callback.from_user.id)
        if user:
            today = datetime.now().strftime('%Y-%m-%d')
            if user[7] == today:
                await callback.message.answer("❌ Ви вже отримали бонус сьогодні!", parse_mode=ParseMode.HTML)
            else:
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE users SET balance = balance + 50, daily_claimed = ? WHERE telegram_id = ?",
                    (today, callback.from_user.id)
                )
                conn.commit()
                conn.close()
                await callback.message.answer(
                    "📅 <b>Щоденний бонус!</b>\n\n✅ Ви отримали +50 монет!",
                    parse_mode=ParseMode.HTML
                )
        else:
            await callback.message.answer("❌ Користувача не знайдено", parse_mode=ParseMode.HTML)

# ============================================
# ЗАПУСК
# ============================================

async def run_bot():
    print("🤖 Бот запускається...")
    await dp.start_polling(bot)

def start_bot_thread():
    asyncio.run(run_bot())

if __name__ == "__main__":
    init_db()
    
    bot_thread = threading.Thread(target=start_bot_thread)
    bot_thread.start()
    
    print(f"🚀 API запускається на порту 5000")
    print(f"🔗 WebApp URL: {WEBAPP_URL}")
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)