/**
 * locales/texts.js — All bot messages in EN / RU / TH.
 * Identical content to the Telegram bot's locales/texts.py.
 */

const TEXTS = {
    en: {
        welcome: '👋 Welcome! Please choose your language:',
        lang_set: '✅ Language set to English.',
        main_menu: 'Hello! 👋 Welcome to WeedeN — one of the leading Thai brands in healthy lifestyle and cannabis-based wellness. We have 56+ stores all over Thailand: Bangkok, Phuket, Samui, Pattaya, and other cities.\nChoose what you are interested in 👇',
        btn_stores: '📍 Find nearest store',
        btn_loyalty: '🎁 Get loyalty card',
        btn_manager: '💬 Contact manager',
        btn_about: 'ℹ️ About us',
        btn_socials: '📲 Our socials',
        btn_help: '🤖 Help (AI Assistant)',
        btn_help_clear: '🗑 Clear chat history',
        help_hello:
            '🤖 *AI Help Assistant*\n\n' +
            'I\'m powered by Gemini AI and can answer your questions.\n' +
            'Type anything to get started!',
        help_cleared: '✅ Conversation cleared. Let\'s start fresh!',
        btn_back: '⬅️ Back',
        btn_main_menu: '🏠 Main menu',
        btn_change_lang: '🌐 Change language',
        loading: '⏳ Processing...',

        review_reminder:
            '🙏 Thank you for your purchase!\n\n' +
            'We\'d love to hear your feedback — it takes less than a minute and helps us improve. Your opinion matters! 💬',

        loyalty_hint: 'Get your loyalty card in 30 seconds and receive a bonus 🎁',

        loyalty_reminder: 'It takes 30 seconds to create loyalty card for bonuses in every store',
        after_phone_reminder: 'Finish registration to activate your bonus',
        loyalty5m_reminder: 'Without registration you can\'t get rewards in stores',
        loyalty24h_reminder: 'Your bonus -30% is still waiting 🎁. Registrate to get your loyalty card!',

        loyalty_start:
            '🎁 *Get access to bonuses, discounts and faster service*\n\n' +
            'Please enter your phone number in international format:\n' +
            'Example: +66812345678',
        loyalty_phone_invalid: '❌ Invalid phone number. Please use international format, e.g. +66812345678',
        loyalty_otp_sent: '📱 OTP code sent to *{phone}*\n\nPlease enter the 6-digit code:',
        loyalty_otp_invalid: '❌ Invalid OTP code. Please try again or type /start to restart.',
        loyalty_otp_attempts: '❌ Too many failed attempts. Please start over with /start',
        loyalty_ask_name: 'Please enter your full name:',
        loyalty_name_invalid: '❌ Please enter your real full name (at least 2 characters):',
        loyalty_ask_country: '🌍 Please enter your country (e.g. Thailand, Russia, USA):',
        loyalty_ask_tourist: '🌍 Are you visiting as a tourist? Reply *yes* or *no*',
        loyalty_ask_thai_citizen: '🇹🇭 Are you a Thai citizen? Reply *yes* or *no*',
        btn_yes: '✅ Yes',
        btn_no: '❌ No',
        loyalty_success:
            '🎉 *Registration successful!*\n\n' +
            '📱 Phone: {phone}\n' +
            '🏷 Your loyalty card barcode: `{barcode}`\n\n' +
            'Show this code at any of our stores to get your discount!',
        loyalty_already_exists:
            '✅ *Welcome back!*\n\n' +
            '📱 Phone: {phone}\n' +
            '🏷 Barcode: `{barcode}`\n\n' +
            'Your information has been updated.',
        loyalty_crm_error: '⚠️ A technical error occurred. Please try again later or contact our manager.',
        loyalty_already_have_card_text:
            '🎁 You already have a loyalty card!\n\n' +
            'Show the barcode at the checkout or tell the cashier your number — both options work.',
        show_card_hint: 'Don\'t forget to show your loyalty card in store to get bonus',

        stores_request_geo:
            '📍 *Find nearest store*\n\n' +
            'Please share your location (send as attachment) or type a region name:\n' +
            'Available regions: Bangkok, Phuket, Samui, Pattaya\n\n' +
            'Enter *0* to return to the main menu.',
        btn_send_geo: '📍 Share location',
        btn_choose_region: '🗺 Choose region',
        stores_choose_region: 'Please type a region name:\nBangkok, Phuket, Samui, Pattaya',
        stores_not_found: '😔 No stores found nearby. Try a different region.',
        stores_result: '📍 *Nearest stores ({count} found):*',
        btn_open_maps: '🗺 Open in Google Maps',
        store_card: '🏪 *{name}*\n📍 {address}\n🕐 {hours}\n',

        manager_hello:
            '💬 *Manager Chat*\n\n' +
            'Our AI assistant will help you first.\n' +
            'Type your question:',
        manager_offline:
            '🕐 Our managers work from 10:00 to 18:00.\n\n' +
            'You can leave a message and we\'ll get back to you:',
        manager_transfer: '🔄 Transferring you to a live manager...',
        manager_transferred: '✅ A manager will respond shortly. Please wait.',
        manager_left_message: '✅ Your message has been saved. We\'ll contact you soon!',
        btn_transfer_manager: '👤 Talk to a human',
        ai_error: '⚠️ AI assistant is temporarily unavailable. Connecting you to a manager...',

        about_text:
            'ℹ️ *About Us*\n\n' +
            'WeedeN is the largest network of cannabis shops in Thailand 🌿\n\n' +
            '56+ stores in key locations: Bangkok, Phuket, Samui, Pattaya, and other cities. We are building a modern and healthy cannabis culture — quality products, friendly service, and a loyalty program with real discounts up to 30%.\n' +
            '🔗 Website: weeden.club\n\n',

        "socials_text": "📲 Our instagram page: https://www.instagram.com/weedenthailand/",
        btn_open_socials: '🔗 Open social links',

        error_generic: '⚠️ Something went wrong. Please try again.',

                menu_hint:
            'Reply with a number to choose:\n' +
            '1️⃣ ' + '📍 Find nearest store' + '\n' +
            '2️⃣ ' + '🎁 Get loyalty card' + '\n' +
            '3️⃣ ' + '🤖 Help (AI Assistant)' + '\n' +
            '4️⃣ ' + 'ℹ️ About us' + '\n' +
            '5️⃣ ' + '📲 Our socials' + '\n' +
            '6️⃣ ' + '🌐 Change language',

        help_hint: '0 = clear history · 9 = main menu · M = contact manager',
        manager_username_prompt: '👤 You can contact our manager directly on WhatsApp: {wa_id}',
    },

    ru: {
        welcome: '👋 Добро пожаловать! Пожалуйста, выберите язык:',
        lang_set: '✅ Язык установлен: Русский.',
        main_menu: 'Привет! 👋 Добро пожаловать в WeedeN — один из ведущих тайских брендов в сфере здорового образа жизни и wellness на основе каннабиса. У нас 56+ магазинов по всему Таиланду: Бангкок, Пхукет, Самуи, Паттайя и другие города.\nВыбери, что тебя интересует 👇',
        btn_stores: '📍 Найти ближайший магазин',
        btn_loyalty: '🎁 Получить карту лояльности',
        btn_manager: '💬 Связаться с менеджером',
        btn_about: 'ℹ️ О компании',
        btn_socials: '📲 Наши соцсети',
        btn_help: '🤖 Помощь (ИИ-ассистент)',
        btn_help_clear: '🗑 Очистить историю чата',
        help_hello:
            '🤖 *ИИ-ассистент*\n\n' +
            'Я работаю на Gemini AI и готов ответить на ваши вопросы.\n' +
            'Напишите что-нибудь, чтобы начать!',
        help_cleared: '✅ История очищена. Начнём заново!',
        btn_back: '⬅️ Назад',
        btn_main_menu: '🏠 Главное меню',
        btn_change_lang: '🌐 Сменить язык',
        loading: '⏳ Загрузка...',

        review_reminder:
            '🙏 Благодарим за покупку!\n\n' +
            'Пожалуйста, оставьте отзыв о товаре — это займёт меньше минуты и поможет нам стать лучше. Ваше мнение очень важно для нас! 💬',

        loyalty_hint: 'Получите карту лояльности за 30 секунд и получите бонус 🎁',
        loyalty_reminder: 'Создание карты лояльности для получения бонусов в любом магазине занимает 30 секунд',
        after_phone_reminder: 'Завершите регистрацию, чтобы активировать бонус',
        loyalty5m_reminder: 'Без регистрации вы не сможете получать бонусы в магазинах',
        loyalty24h_reminder: 'Ваш бонус -30% всё ещё ждёт вас 🎁. Зарегистрируйтесь, чтобы получить карту постоянного клиента!',

        loyalty_start:
            '🎁 *Получите доступ к бонусам, скидкам и более оперативному обслуживанию*\n\n' +
            'Введите номер телефона в международном формате:\n' +
            'Пример: +79123456789',
        loyalty_phone_invalid: '❌ Неверный формат. Используйте международный формат, например: +79123456789',
        loyalty_otp_sent: '📱 OTP-код отправлен на *{phone}*\n\nВведите 6-значный код:',
        loyalty_otp_invalid: '❌ Неверный OTP-код. Попробуйте ещё раз или напишите /start.',
        loyalty_otp_attempts: '❌ Превышено число попыток. Начните заново с /start',
        loyalty_ask_name: 'Введите ваше полное имя:',
        loyalty_name_invalid: '❌ Введите настоящее имя (минимум 2 символа):',
        loyalty_ask_country: '🌍 Введите вашу страну (например: Россия, Таиланд, США):',
        loyalty_ask_tourist: '🌍 Вы приехали как турист? Ответьте *да* или *нет*',
        loyalty_ask_thai_citizen: '🇹🇭 Вы гражданин Таиланда? Ответьте *да* или *нет*',
        btn_yes: '✅ Да',
        btn_no: '❌ Нет',
        loyalty_success:
            '🎉 *Регистрация прошла успешно!*\n\n' +
            '📱 Телефон: {phone}\n' +
            '🏷 Штрихкод карты: `{barcode}`\n\n' +
            'Покажите этот код в магазине для получения скидки!',
        loyalty_already_exists:
            '✅ *С возвращением!*\n\n' +
            '📱 Телефон: {phone}\n' +
            '🏷 Штрихкод: `{barcode}`\n\n' +
            'Ваши данные обновлены.',
        loyalty_crm_error: '⚠️ Произошла техническая ошибка. Попробуйте позже или свяжитесь с менеджером.',
        loyalty_already_have_card_text:
            '🎁 У тебя уже есть карта лояльности!\n\n' +
            'Покажи штрихкод на кассе или назови номер карты — оба варианта работают.',
        show_card_hint: 'Не забудьте предъявить в магазине свою карту лояльности, чтобы получить бонус',

        stores_request_geo:
            '📍 *Поиск ближайшего магазина*\n\n' +
            'Поделитесь геолокацией или введите название региона:\n' +
            'Доступные регионы: Bangkok, Phuket, Samui, Pattaya\n\n' +
            'Введите *0* чтобы веренуться в главное меню.',
        btn_send_geo: '📍 Отправить геолокацию',
        btn_choose_region: '🗺 Выбрать регион',
        stores_choose_region: 'Введите название региона:\nBangkok, Phuket, Samui, Pattaya',
        stores_not_found: '😔 Рядом не найдено магазинов. Попробуйте другой регион.',
        stores_result: '📍 *Ближайшие магазины (найдено: {count}):*',
        btn_open_maps: '🗺 Открыть в Google Maps',
        store_card: '🏪 *{name}*\n📍 {address}\n🕐 {hours}\n',

        manager_hello:
            '💬 *Чат с менеджером*\n\n' +
            'Сначала вам ответит AI-ассистент.\n' +
            'Напишите ваш вопрос:',
        manager_offline:
            '🕐 Менеджеры работают с 10:00 до 18:00.\n\n' +
            'Вы можете оставить сообщение, и мы свяжемся с вами:',
        manager_transfer: '🔄 Передаём вас живому менеджеру...',
        manager_transferred: '✅ Менеджер скоро ответит. Пожалуйста, подождите.',
        manager_left_message: '✅ Ваше сообщение сохранено. Мы свяжемся с вами в ближайшее время!',
        btn_transfer_manager: '👤 Связаться с человеком',
        ai_error: '⚠️ AI-ассистент временно недоступен. Соединяем с менеджером...',

        about_text:
            'ℹ️ *О компании*\n\n' +
            'WeedeN — крупнейшая сеть cannabis-шопов в Таиланде 🌿\n\n' +
            '56+ магазинов в ключевых локациях: Бангкок, Пхукет, Самуи, Паттайя и другие города. Мы строим современную и здоровую cannabis-культуру — качественные продукты, дружелюбный сервис и программа лояльности с реальными скидками до 30%.\n' +
            '🔗 Сайт: weeden.club\n\n',

        "socials_text": "📲 Наш инстаграм: https://www.instagram.com/weedenthailand/",
        btn_open_socials: '🔗 Открыть соцсети',

        error_generic: '⚠️ Что-то пошло не так. Попробуйте ещё раз.',

                menu_hint:
            'Ответьте цифрой для выбора:\n' +
            '1️⃣ 📍 Найти ближайший магазин\n' +
            '2️⃣ 🎁 Получить карту лояльности\n' +
            '3️⃣ 🤖 Помощь (ИИ-ассистент)\n' +
            '4️⃣ ℹ️ О компании\n' +
            '5️⃣ 📲 Наши соцсети\n' +
            '6️⃣ 🌐 Сменить язык',

        help_hint: '0 = очистить · 9 = главное меню · M = связаться с менеджером',
        manager_username_prompt: '👤 Вы можете написать нашему менеджеру напрямую в WhatsApp: {wa_id}',
    },

    th: {
        welcome: '👋 ยินดีต้อนรับ! กรุณาเลือกภาษา:',
        lang_set: '✅ ตั้งค่าภาษาเป็นภาษาไทยแล้ว',
        main_menu: 'สวัสดี! 👋 ยินดีต้อนรับสู่ WeedeN — หนึ่งในแบรนด์ชั้นนำของไทยด้านไลฟ์สไตล์เพื่อสุขภาพและเวลเนสจากกัญชา เรามีร้านค้ากว่า 55 สาขาทั่วประเทศไทย: กรุงเทพฯ ภูเก็ต สมุย พัทยา และเมืองอื่นๆ\nเลือกสิ่งที่คุณสนใจด้านล่าง 👇',
        btn_stores: '📍 ค้นหาร้านใกล้เคียง',
        btn_loyalty: '🎁 รับบัตรสะสมแต้ม',
        btn_manager: '💬 ติดต่อผู้จัดการ',
        btn_about: 'ℹ️ เกี่ยวกับเรา',
        btn_socials: '📲 โซเชียลมีเดียของเรา',
        btn_help: '🤖 ช่วยเหลือ (AI Assistant)',
        btn_help_clear: '🗑 ล้างประวัติการสนทนา',
        help_hello:
            '🤖 *AI ผู้ช่วย*\n\n' +
            'ฉันขับเคลื่อนโดย Gemini AI และพร้อมตอบคำถามของคุณ\n' +
            'พิมพ์อะไรก็ได้เพื่อเริ่มต้น!',
        help_cleared: '✅ ล้างการสนทนาแล้ว เริ่มใหม่กันเลย!',
        btn_back: '⬅️ กลับ',
        btn_main_menu: '🏠 เมนูหลัก',
        btn_change_lang: '🌐 เปลี่ยนภาษา',
        loading: '⏳ กำลังโหลด',

        review_reminder:
            '🙏 ขอบคุณสำหรับการซื้อของคุณ!\n\n' +
            'กรุณาฝากรีวิวสินค้า — ใช้เวลาไม่ถึงนาที และช่วยให้เราพัฒนาได้ดีขึ้น ความคิดเห็นของคุณสำคัญมาก! 💬',

        loyalty_hint: 'รับบัตรสะสมแต้มใน 30 วินาทีและรับโบนัส 🎁',
        loyalty_reminder: 'การสร้างบัตรสะสมแต้มเพื่อรับโบนัสที่ร้านค้าใดก็ได้ใช้เวลาเพียง 30 วินาที',
        after_phone_reminder: 'กรอกข้อมูลลงทะเบียนให้ครบถ้วนเพื่อเปิดใช้งานโบนัส',
        loyalty5m_reminder: 'หากไม่ลงทะเบียน คุณจะไม่สามารถรับโบนัสในร้านค้าได้',
        loyalty24h_reminder: 'โบนัสส่วนลด 30% ของคุณยังรออยู่ 🎁 ลงทะเบียนเพื่อรับบัตรสมาชิกเลย!',

        loyalty_start:
            '🎁 *รับสิทธิ์พิเศษ ส่วนลด และบริการที่รวดเร็วยิ่งขึ้น*\n\n' +
            'กรุณาใส่หมายเลขโทรศัพท์ในรูปแบบสากล:\n' +
            'ตัวอย่าง: +66812345678',
        loyalty_phone_invalid: '❌ หมายเลขโทรศัพท์ไม่ถูกต้อง กรุณาใช้รูปแบบสากล เช่น +66812345678',
        loyalty_otp_sent: '📱 ส่งรหัส OTP ไปยัง *{phone}* แล้ว\n\nกรุณาใส่รหัส 6 หลัก:',
        loyalty_otp_invalid: '❌ รหัส OTP ไม่ถูกต้อง กรุณาลองอีกครั้ง',
        loyalty_otp_attempts: '❌ ลองผิดพลาดหลายครั้งเกินไป กรุณาเริ่มใหม่',
        loyalty_ask_name: 'กรุณาใส่ชื่อ-นามสกุล:',
        loyalty_name_invalid: '❌ กรุณาใส่ชื่อจริง (อย่างน้อย 2 ตัวอักษร):',
        loyalty_ask_country: '🌍 กรุณาใส่ประเทศของคุณ (เช่น Thailand, Russia):',
        loyalty_ask_tourist: '🌍 คุณมาในฐานะนักท่องเที่ยวใช่ไหม? ตอบ *ใช่* หรือ *ไม่ใช่*',
        loyalty_ask_thai_citizen: '🇹🇭 คุณเป็นพลเมืองไทยหรือไม่? ตอบ *ใช่* หรือ *ไม่ใช่*',
        btn_yes: '✅ ใช่',
        btn_no: '❌ ไม่ใช่',
        loyalty_success:
            '🎉 *ลงทะเบียนสำเร็จ!*\n\n' +
            '📱 เบอร์โทร: {phone}\n' +
            '🏷 บาร์โค้ดบัตรสะสมแต้ม: `{barcode}`\n\n' +
            'แสดงรหัสนี้ที่ร้านเพื่อรับส่วนลด!',
        loyalty_already_exists:
            '✅ *ยินดีต้อนรับกลับมา!*\n\n' +
            '📱 เบอร์โทร: {phone}\n' +
            '🏷 บาร์โค้ด: `{barcode}`\n\n' +
            'อัปเดตข้อมูลของคุณแล้ว',
        loyalty_crm_error: '⚠️ เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลังหรือติดต่อผู้จัดการ',
        loyalty_already_have_card_text:
            '🎁 คุณมีบัตรสะสมแต้มอยู่แล้ว!\n\n' +
            'แสดงบาร์โค้ดที่จุดชำระเงินหรือแจ้งหมายเลขบัตรของคุณ — ใช้ได้ทั้งสองวิธี',
        show_card_hint: 'อย่าลืมแสดงบัตรสะสมแต้มที่ร้านค้าเพื่อรับโบนัส',

        stores_request_geo:
            '📍 *ค้นหาร้านใกล้เคียง*\n\n' +
            'แชร์ตำแหน่งหรือพิมพ์ชื่อภูมิภาค:\n' +
            'ภูมิภาคที่มี: Bangkok, Phuket, Samui, Pattaya\n\n'+
            'กด *0* เพื่อกลับสู่เมนูหลัก',
        btn_send_geo: '📍 แชร์ตำแหน่ง',
        btn_choose_region: '🗺 เลือกภูมิภาค',
        stores_choose_region: 'พิมพ์ชื่อภูมิภาค:\nBangkok, Phuket, Samui, Pattaya',
        stores_not_found: '😔 ไม่พบร้านค้าใกล้เคียง ลองเลือกภูมิภาคอื่น',
        stores_result: '📍 *ร้านค้าใกล้เคียง (พบ {count} แห่ง):*',
        btn_open_maps: '🗺 เปิดใน Google Maps',
        store_card: '🏪 *{name}*\n📍 {address}\n🕐 {hours}\n',

        manager_hello: '💬 *แชทกับผู้จัดการ*\n\nผู้ช่วย AI จะตอบก่อน\nพิมพ์คำถามของคุณ:',
        manager_offline: '🕐 ผู้จัดการทำงานตั้งแต่ 10:00 ถึง 18:00\n\nคุณสามารถฝากข้อความไว้ได้:',
        manager_transfer: '🔄 กำลังโอนไปยังผู้จัดการ...',
        manager_transferred: '✅ ผู้จัดการจะตอบในไม่ช้า กรุณารอสักครู่',
        manager_left_message: '✅ บันทึกข้อความของคุณแล้ว เราจะติดต่อกลับโดยเร็ว!',
        btn_transfer_manager: '👤 คุยกับคน',
        ai_error: '⚠️ AI ไม่พร้อมใช้งานชั่วคราว กำลังเชื่อมต่อกับผู้จัดการ...',

        about_text:
            'ℹ️ *เกี่ยวกับเรา*\n\n' +
            'WeedeN คือเครือข่ายร้านกัญชาที่ใหญ่ที่สุดในประเทศไทย 🌿\n\n' +
            'มีมากกว่า 56 สาขาในพื้นที่สำคัญ: กรุงเทพฯ, ภูเก็ต, เกาะสมุย, พัทยา และเมืองอื่นๆ เรากำลังสร้างวัฒนธรรมกัญชาที่ทันสมัยและดีต่อสุขภาพ — สินค้าคุณภาพ บริการเป็นกันเอง และโปรแกรมสะสมแต้มที่ให้ส่วนลดสูงสุดถึง 30%\n' +
            '🔗 เว็บไซต์: weeden.club\n\n',

        "socials_text": "📲 อินสตาแกรมของเรา: https://www.instagram.com/weedenthailand\_th/",
        btn_open_socials: '🔗 เปิดโซเชียลมีเดีย',

        error_generic: '⚠️ เกิดข้อผิดพลาด กรุณาลองอีกครั้ง',

                menu_hint:
            'ตอบด้วยตัวเลขเพื่อเลือก:\n' +
            '1️⃣ 📍 ค้นหาร้านใกล้เคียง\n' +
            '2️⃣ 🎁 รับบัตรสะสมแต้ม\n' +
            '3️⃣ 🤖 ช่วยเหลือ (AI Assistant)\n' +
            '4️⃣ ℹ️ เกี่ยวกับเรา\n' +
            '5️⃣ 📲 โซเชียลมีเดียของเรา\n' +
            '6️⃣ 🌐 เปลี่ยนภาษา',

        help_hint: '0 = ล้างประวัติ · 9 = เมนูหลัก · M = ติดต่อผู้จัดการ',
        manager_username_prompt: '👤 คุณสามารถติดต่อผู้จัดการของเราโดยตรงใน WhatsApp: {wa_id}',
    },
};

/**
 * Get a translated string, falling back to EN.
 * Supports {placeholder} interpolation.
 */
function t(lang, key, vars = {}) {
    const langData = TEXTS[lang] || TEXTS['en'];
    let text = langData[key] || TEXTS['en'][key] || key;
    for (const [k, v] of Object.entries(vars)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    return text;
}

module.exports = { TEXTS, t };