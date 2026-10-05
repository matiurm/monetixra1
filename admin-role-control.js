/* Role-based UI and action protection. Admin controls remain separate from normal-user features. */
(function () {
  'use strict';
  const adminActions = [
    'rAdmin', 'adminTab', 'adminSearchUsers', 'adminUserFilter', 'adminPostFilter',
    'openAdminUserControl', 'adminToggleDisable', 'adminToggleDeactivate', 'adminToggleBlock',
    'adminToggleKYC', 'adminToggleVerify', 'adminResetPassword', 'adminAddPts', 'adminRemovePts',
    'adminSendNotif', 'adminHidePost', 'adminDeletePostById', 'adminDeleteAllPosts', 'adminDeleteUser',
    'adminToggleHidePost', 'adminDeletePostAdmin', 'approveKYC', 'rejectKYC', 'approveWithdrawal',
    'rejectWithdrawal', 'startLiveMonitor', 'refreshLiveMonitor', 'adminGlobalActions',
    'exportSupabaseData', 'exportLocalData', 'migrateToS3', 'fullExportAndMigrate'
  ];
  function isAdmin() { return !!(window.CU && window.CU.isAdmin); }
  function deny() { if (typeof window.toast === 'function') window.toast('e', 'Admin only'); return false; }
  function guard(name) {
    const original = window[name];
    if (typeof original !== 'function' || original.__adminGuarded) return;
    const guarded = function () { return isAdmin() ? original.apply(this, arguments) : deny(); };
    guarded.__adminGuarded = true;
    window[name] = guarded;
  }
  function apply() {
    adminActions.forEach(guard);
    document.querySelectorAll('[data-user-account-action]').forEach(el => { el.style.display = 'none'; el.setAttribute('aria-hidden', 'true'); });
    document.querySelectorAll('[data-p="admin"], #settAdminSection, #settAdminBtn').forEach(el => { el.style.display = isAdmin() ? '' : 'none'; });
    const page = document.getElementById('pg-admin');
    if (!isAdmin() && page?.classList.contains('on') && typeof window.nav === 'function') window.nav('feed');
  }
  function protectAccountDestruction() {
    ['deactivateAccount', 'deleteAccount'].forEach(name => {
      const original = window[name];
      if (typeof original !== 'function' || original.__adminOnlyAccountAction) return;
      const protectedAction = function () { return isAdmin() ? original.apply(this, arguments) : deny(); };
      protectedAction.__adminOnlyAccountAction = true;
      window[name] = protectedAction;
    });
    const manager = window.MonetixraAccountManagement;
    if (manager) ['deactivateAccount', 'deleteAccount'].forEach(name => {
      const original = manager[name];
      if (typeof original !== 'function' || original.__adminOnlyAccountAction) return;
      const protectedAction = function () { return isAdmin() ? original.apply(manager, arguments) : deny(); };
      protectedAction.__adminOnlyAccountAction = true;
      manager[name] = protectedAction;
    });
  }
  document.addEventListener('DOMContentLoaded', () => { protectAccountDestruction(); apply(); setInterval(() => { protectAccountDestruction(); apply(); }, 1200); }, { once: true });
  window.MonetixraRoles = { isAdmin, apply };
})();
