import type { TranslationTable } from './i18n';
import { tr } from './tr';

export const ru: TranslationTable = {
  ...tr,
  'nav.sales': 'Быстрые продажи',
  'nav.delivery': 'Заказы доставки',
  'nav.imkart': 'Карта Измира',
  'nav.posIntegration': 'Интеграция POS',
  'nav.stock': 'Товары и склад',
  'nav.purchase': 'Счет покупки',
  'nav.credit': 'Отслеживание кредита',
  'nav.expense': 'Книга расходов',
  'nav.staff': 'Персонал и зарплата',
  'nav.cash': 'Деньги и аналитика',
  'nav.settings': 'Настройки',
  'topbar.subtitle': 'Программа продаж по штрих-коду',
  'topbar.register': 'Касса',
  'topbar.imkart': 'Лимит карты Измира',
  'pos.payBtn': 'ПРИНЯТЬ ОПЛАТУ',
  'pay.title': 'Закрыть продажу / Принять оплату',
  'settings.language': 'Язык',
  "playTrial.remaining": "ДЕМО · ОСТАЛОСЬ {count} ПРОДАЖ",
  "playTrial.expired": "Демо на 1 000 продаж завершено. Для новых продаж нужен Play Pro.",
  "playTrial.summary": "Первые 1 000 завершённых продаж бесплатны, без лимита товаров и дополнительных блокировок функций Pro. Затем можно продолжить с подпиской Pro через Google Play.",
  "playTrial.records": "Данные сохраняются; отчёты и резервное копирование доступны. Требования к оборудованию и внешним сервисам остаются в силе.",
  "playTrial.storage": "Не удалось сохранить счётчик. Проверьте доступ и свободное место в хранилище.",
};
