import type { TranslationTable } from './i18n';
import { tr } from './tr';

export const es: TranslationTable = {
  ...tr,
  // Navegación
  'nav.sales': 'Venta Rápida',
  'nav.delivery': 'Pedidos de Entrega',
  'nav.imkart': 'Tarjeta de Ciudad',
  'nav.posIntegration': 'Integración POS',
  'nav.stock': 'Productos y Stock',
  'nav.purchase': 'Facturas de Compra',
  'nav.credit': 'Control de Crédito',
  'nav.expense': 'Libro de Gastos',
  'nav.staff': 'Personal y Salario',
  'nav.cash': 'Caja y Análisis',
  'nav.settings': 'Ajustes',
  // Login
  'login.selectUser': 'SELECCIONE USUARIO',
  'login.switchUser': 'CAMBIAR USUARIO',
  'login.enterPin': 'INGRESE SU PIN',
  'login.wrongPin': 'PIN INCORRECTO',
  'login.ok': 'INICIO DE SESIÓN EXITOSO',
  'login.title': 'MOSBARKODYAZILIM',
  'login.subtitle': 'Seleccione usuario e ingrese PIN de 4 dígitos',
  'login.cancel': 'Cancelar',
  'login.admin': 'Continuar como Admin',
  'login.requiresAdmin': 'Se requieren derechos de administrador',
  'login.adminOnly': 'Esta sección solo está disponible para la cuenta Admin.',
  'topbar.subtitle': 'PROGRAMA DE VENTAS CON CÓDIGO DE BARRAS CON IA',
  'topbar.register': 'Caja',
  'pos.payBtn': 'COBRAR',
  'pay.title': 'Cerrar Venta / Cobrar',
  'settings.language': 'Idioma',
  'poslock.title': 'MOSBARKODYAZILIM',
  'poslock.subtitle': 'Integración POS — Se requiere clave de licencia',
  'poslock.unlock': 'DESBLOQUEAR',
};
