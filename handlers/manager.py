"""
Handler: Manager — AI-первый чат, эскалация на живого менеджера.
Аналог handlers/manager.py из Telegram-бота.
"""
import logging
from datetime import datetime, timezone, timedelta

from config import MANAGER_LINE_USER_ID, MANAGER_LINE_ID, MANAGER_WORK_START, MANAGER_WORK_END
from locales.texts import t
from utils import user_data as ud
from utils.line_api import push_text, push_manager_menu, push_back_to_menu, push_quick_reply
from utils.gemini import ask_gemini

logger = logging.getLogger(__name__)

TZ_OFFSET = timedelta(hours=7)  # UTC+7 Bangkok. Измени под свой часовой пояс.

MANAGER_STATE = "manager:chatting"


def is_manager_online() -> bool:
    now = datetime.now(tz=timezone(TZ_OFFSET))
    return MANAGER_WORK_START <= now.hour < MANAGER_WORK_END


async def manager_start(user_id: str):
    """
    Вход в раздел менеджера через postback menu:manager.
    Аналог manager_start callback в TG.
    """
    lang = ud.get_lang(user_id)
    ud.set_state(user_id, MANAGER_STATE)
    logger.info(f"[{user_id}] manager_start, online={is_manager_online()}")

    if not is_manager_online():
        push_back_to_menu(user_id, t(lang, "manager_offline"), lang)
    else:
        push_manager_menu(user_id, t(lang, "manager_hello"), lang)


async def handle_manager_transfer(user_id: str):
    """
    Пользователь нажал 'Связаться с менеджером' — передать живому оператору.
    Аналог transfer_to_manager в TG.
    """
    lang = ud.get_lang(user_id)
    logger.info(f"[{user_id}] manager transfer requested")

    push_text(user_id, t(lang, "manager_transfer"))
    await _notify_manager(user_id, "User requested human agent.", lang)

    # Показываем LINE ID менеджера или подтверждение
    if MANAGER_LINE_ID:
        text = t(lang, "manager_username_prompt").format(line_id=MANAGER_LINE_ID)
    else:
        text = t(lang, "manager_transferred")

    ud.clear_state(user_id)
    push_back_to_menu(user_id, text, lang)


async def handle_manager_message(user_id: str, text: str):
    """
    Обработка текстового сообщения в состоянии manager:chatting.
    Аналог handle_user_message в TG — сначала AI, при нужде эскалация.
    """
    lang = ud.get_lang(user_id)

    if not is_manager_online():
        # Вне рабочих часов — сохранить сообщение и уведомить менеджера
        await _notify_manager(user_id, text, lang)
        ud.clear_state(user_id)
        push_back_to_menu(user_id, t(lang, "manager_left_message"), lang)
        return

    # Сначала пробуем AI
    push_text(user_id, t(lang, "loading"))
    ai_response = await ask_gemini(user_message=text)

    if "[TRANSFER_TO_HUMAN]" in ai_response:
        push_text(user_id, t(lang, "manager_transfer"))
        await _notify_manager(user_id, text, lang)
        ud.clear_state(user_id)

        if MANAGER_LINE_ID:
            contact_text = t(lang, "manager_username_prompt").format(line_id=MANAGER_LINE_ID)
        else:
            contact_text = t(lang, "manager_transferred")
        push_back_to_menu(user_id, contact_text, lang)
    else:
        push_manager_menu(user_id, ai_response, lang)


async def _notify_manager(user_id: str, user_text: str, lang: str):
    """Отправить уведомление менеджеру в LINE."""
    if not MANAGER_LINE_USER_ID:
        logger.warning("MANAGER_LINE_USER_ID not set, cannot notify manager")
        return
    try:
        from utils.line_api import push_text as _push
        msg = (
            f"🔔 Новое сообщение от пользователя\n"
            f"User ID: {user_id} (lang: {lang})\n\n"
            f"Сообщение:\n{user_text}"
        )
        _push(MANAGER_LINE_USER_ID, msg)
        logger.info(f"Manager notified about message from {user_id}")
    except Exception as e:
        logger.error(f"Failed to notify manager: {e}")
