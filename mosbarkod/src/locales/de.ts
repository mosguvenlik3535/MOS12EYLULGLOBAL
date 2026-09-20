import type { TranslationTable } from './i18n';
import { tr } from './tr';

export const de: TranslationTable = {
  ...tr,
  // Navigation
  'nav.sales': 'Schnellverkauf',
  'nav.delivery': 'Lieferaufträge',
  'nav.imkart': 'Stadtkarte',
  'nav.posIntegration': 'POS-Integration',
  'nav.stock': 'Produkte & Lager',
  'nav.purchase': 'Kaufrechnungen',
  'nav.credit': 'Kreditverfolgung',
  'nav.expense': 'Ausgabenbuch',
  'nav.staff': 'Personal & Gehalt',
  'nav.cash': 'Kasse & Analysen',
  'nav.settings': 'Einstellungen',
  // Login
  'login.selectUser': 'BENUTZER WÄHLEN',
  'login.switchUser': 'BENUTZER WECHSELN',
  'login.enterPin': 'PIN EINGEBEN',
  'login.wrongPin': 'FALSCHER PIN',
  'login.ok': 'ANMELDUNG ERFOLGREICH',
  'login.title': 'MOSBARKODYAZILIM',
  'login.subtitle': 'Benutzer wählen und 4-stelligen PIN eingeben',
  'login.cancel': 'Abbrechen',
  'login.admin': 'Als Admin fortfahren',
  'login.requiresAdmin': 'Admin-Rechte erforderlich',
  'login.adminOnly': 'Dieser Bereich ist nur für das Admin-Konto verfügbar.',
  'topbar.subtitle': 'BARCODE-VERKAUFSPROGRAMM',
  'topbar.register': 'Kasse',
  'pos.payBtn': 'ZAHLUNG ANNEHMEN',
  'pay.title': 'Verkauf abschließen / Zahlung',
  'settings.language': 'Sprache',
  'poslock.title': 'MOSBARKODYAZILIM',
  'poslock.subtitle': 'POS-Integration — Lizenzschlüssel erforderlich',
  'poslock.unlock': 'ENTSPERREN',
};
