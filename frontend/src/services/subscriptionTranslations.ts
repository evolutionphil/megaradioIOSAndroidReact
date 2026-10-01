// Local fallbacks keep account status readable before remote translations load.
const rows: Record<string, string[]> = {
  en: ['Premium Active', 'Ad-free Active', 'Manage subscription', 'Your subscription is active. No new purchase is needed.', 'Restore purchases'],
  tr: ['Premium aktif', 'Reklamsız üyelik aktif', 'Aboneliği yönet', 'Aboneliğiniz aktif. Yeniden satın almanız gerekmiyor.', 'Satın alımları geri yükle'],
  de: ['Premium aktiv', 'Werbefrei aktiv', 'Abo verwalten', 'Dein Abo ist aktiv. Ein erneuter Kauf ist nicht nötig.', 'Käufe wiederherstellen'],
  fr: ['Premium actif', 'Sans publicité actif', 'Gérer l’abonnement', 'Votre abonnement est actif. Aucun nouvel achat n’est nécessaire.', 'Restaurer les achats'],
  es: ['Premium activo', 'Sin anuncios activo', 'Gestionar suscripción', 'Tu suscripción está activa. No necesitas volver a comprarla.', 'Restaurar compras'],
  it: ['Premium attivo', 'Senza pubblicità attivo', 'Gestisci abbonamento', 'Il tuo abbonamento è attivo. Non è necessario acquistarlo di nuovo.', 'Ripristina acquisti'],
  pt: ['Premium ativo', 'Sem anúncios ativo', 'Gerenciar assinatura', 'Sua assinatura está ativa. Não é necessário comprar novamente.', 'Restaurar compras'],
  nl: ['Premium actief', 'Advertentievrij actief', 'Abonnement beheren', 'Je abonnement is actief. Je hoeft het niet opnieuw te kopen.', 'Aankopen herstellen'],
  pl: ['Premium aktywne', 'Brak reklam aktywny', 'Zarządzaj subskrypcją', 'Twoja subskrypcja jest aktywna. Nie musisz kupować jej ponownie.', 'Przywróć zakupy'],
  ru: ['Premium активен', 'Без рекламы — активно', 'Управление подпиской', 'Ваша подписка активна. Повторная покупка не нужна.', 'Восстановить покупки'],
  ja: ['Premiumは有効です', '広告非表示は有効です', 'サブスクリプションを管理', 'サブスクリプションは有効です。再購入は必要ありません。', '購入を復元'],
  ko: ['Premium 이용 중', '광고 제거 이용 중', '구독 관리', '구독이 활성화되어 있습니다. 다시 구매할 필요가 없습니다.', '구매 복원'],
  zh: ['Premium 已生效', '无广告服务已生效', '管理订阅', '您的订阅已生效，无需再次购买。', '恢复购买'],
  ar: ['Premium نشط', 'إزالة الإعلانات نشطة', 'إدارة الاشتراك', 'اشتراكك نشط. لا حاجة للشراء مرة أخرى.', 'استعادة المشتريات'],
};
const keys = ['premium_active', 'ad_free_active', 'manage_subscription', 'subscription_already_active', 'restore_purchases'];
export const subscriptionTranslations: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(rows).map(([locale, values]) => [locale, Object.fromEntries(keys.map((key, i) => [key, values[i]]))]),
);
