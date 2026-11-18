(() => {
    const guideContent = document.getElementById('guideContent');
    const guideShowAllBtn = document.getElementById('guideShowAllBtn');
    const guideActionContainer = document.getElementById('guideActionContainer');

    if (guideShowAllBtn) {
        guideShowAllBtn.addEventListener('click', () => {
            if (window.REICHINS && REICHINS.legalConsent && !REICHINS.legalConsent.checkBaseConsentOrShowError()) {
                return;
            }
            if (guideContent) {
                guideContent.textContent = window.REICHINS_GUIDE_TEXT || '';
            }
            if (guideActionContainer) {
                guideActionContainer.classList.add('hidden');
            }
            if (typeof REICHINS.autoSaveIfPersisted === 'function') {
                REICHINS.autoSaveIfPersisted();
            }
        });
    }
})();
