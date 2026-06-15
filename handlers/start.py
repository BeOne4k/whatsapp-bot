"""
Handler: Start — приветствие, выбор языка, главное меню.
Аналог handlers/start.py из Telegram-бота.
"""
import logging
from locales.texts import t
from utils import user_data as ud
from utils.line_api import push_language_select, push_main_menu, push_text, push_quick_reply
from utils.api_client import register_channel
from utils.line_registry import bind as registry_bind
from webhook_api import flush_pending

logger = logging.getLogger(__name__)


async def handle_start(user_id: str):
    """
    Вход в бот — аналог /start в Telegram.
    Сбрасывает состояние и показывает выбор языка.
    """
    ud.clear_state(user_id)
    lang = ud.get_lang(user_id)
    logger.info(f"[{user_id}] handle_start, lang={lang}")
    push_language_select(user_id)


async def handle_lang_select(user_id: str, lang: str):
    """
    Пользователь выбрал язык через postback lang:<code>.
    Аналог set_language callback в TG.
    """
    ud.set_lang(user_id, lang)
    logger.info(f"[{user_id}] language set to {lang}")

    # Подтверждение + hint лояльности
    push_text(user_id, t(lang, "lang_set"))
    push_main_menu(user_id, t(lang, "loyalty_hint"), lang)


async def handle_main_menu(user_id: str):
    """
    Показать главное меню.
    Аналог show_main_menu / back_to_menu в TG.
    """
    ud.clear_state(user_id)
    lang = ud.get_lang(user_id)
    logger.info(f"[{user_id}] handle_main_menu")
    push_main_menu(user_id, t(lang, "main_menu"), lang)
