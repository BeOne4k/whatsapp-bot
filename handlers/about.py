"""
Handler: About — информация о компании.
Аналог handlers/about.py из Telegram-бота.
"""
import logging
from locales.texts import t
from utils import user_data as ud
from utils.line_api import push_back_to_menu

logger = logging.getLogger(__name__)


async def handle_about(user_id: str):
    """
    Показать страницу 'О компании'.
    Аналог about() callback в TG.
    """
    lang = ud.get_lang(user_id)
    logger.info(f"[{user_id}] handle_about")
    push_back_to_menu(user_id, t(lang, "about_text"), lang)
