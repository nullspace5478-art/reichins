(() => {
    const REICHINS = window.REICHINS = window.REICHINS || {};

    const CONSENT_KEY = 'civilCodeAccepted';
    const CONSENT_ERROR_MESSAGE = '民法に同意してください';
    const LOCKED_MESSAGE = 'あなたは民法に同意しなかったため、ライヒンスを利用することができません';

    // legal-modals.js 側の共通同意チェックへ民法を登録
    REICHINS.extraLegalConsentChecks = REICHINS.extraLegalConsentChecks || [];
    if (!REICHINS.extraLegalConsentChecks.some((item) => item.consentKey === CONSENT_KEY)) {
        REICHINS.extraLegalConsentChecks.push({
            consentKey: CONSENT_KEY,
            consentErrorMessage: CONSENT_ERROR_MESSAGE
        });
    }

    function ensureConsentState() {
        if (!REICHINS.state.legalConsent) {
            REICHINS.state.legalConsent = {};
        }
        if (typeof REICHINS.state.legalConsent[CONSENT_KEY] !== 'boolean') {
            REICHINS.state.legalConsent[CONSENT_KEY] = false;
        }
        return REICHINS.state.legalConsent;
    }

    function buildSourceBannerHtml(meta) {
        const revisionId = meta.lawRevisionId || '';
        const lawNum = meta.lawNum || '明治二十九年法律第八十九号';
        const amendNum = meta.amendmentLawNum || '';
        const amendTitle = meta.amendmentLawTitle || '';
        const enforceDate = meta.amendmentEnforcementDate || '';
        const updated = meta.updated || '';
        const sourceUrl = meta.sourceUrl || 'https://laws.e-gov.go.jp/law/129AC0000000089';
        const accessedDate = meta.accessedDate || '2026年11月12日';

        return `
            <div id="civilCodeSourceBanner" class="rounded-xl border border-blue-200 bg-blue-50/70 p-3 sm:p-4 text-xs text-slate-700 leading-relaxed space-y-1.5 shrink-0">
                <div class="font-bold text-blue-900 flex items-center gap-1.5">
                    <i class="fa-solid fa-circle-info text-blue-600"></i>
                    <span>掲載法令の版・出典について</span>
                </div>
                <p>
                    <span class="font-semibold text-slate-800">法令・版：</span>
                    民法（${lawNum}）／ ${amendNum}「${amendTitle}」（施行日：${enforceDate}）改正反映版・現行施行版（リビジョンID：<code class="font-mono text-[11px]">${revisionId}</code>／e-Gov最終更新：${updated}）
                </p>
                <p>
                    <span class="font-semibold text-slate-800">出典：</span>
                    「民法」（e-Gov法令検索）（<a href="${sourceUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline hover:opacity-80">${sourceUrl}</a>）（${accessedDate}に利用）
                </p>
                <p class="text-[11px] text-slate-600">
                    ※「民法」（e-Gov法令検索）（${sourceUrl}）の法令データ（e-Gov法令API v2）をもとに、Web表示用に整形してライヒンスが作成・掲載しています（条文の内容自体は改変しておりません）。本データは「公共データ利用規約（第1.0版）」（PDL1.0）に基づき利用しています。
                </p>
            </div>
        `;
    }

    function createCivilCodeModal() {
        const container = document.getElementById('civilCodeModalContainer');
        if (!container) return null;

        const data = REICHINS.CIVIL_CODE_DATA || { meta: {}, html: '' };
        const meta = data.meta || {};

        const modalEl = document.createElement('div');
        modalEl.id = 'civilCodeModal';
        modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm hidden overflow-y-auto';

        modalEl.innerHTML = `
            <div class="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-2xl flex flex-col gap-4 max-h-[92vh] text-left">
                <div class="flex items-center justify-between pb-2.5 border-b border-slate-100 shrink-0">
                    <h3 class="text-slate-900 font-bold text-lg sm:text-xl flex items-center gap-2.5">
                        <i class="fa-solid fa-book text-blue-600"></i>
                        <span>民法</span>
                    </h3>
                </div>

                ${buildSourceBannerHtml(meta)}

                <div id="civilCodeScrollBox" class="flex-1 min-h-0 overflow-y-auto pr-2 sm:pr-4 border border-slate-200 rounded-xl p-4 sm:p-6 bg-white text-sm leading-7 text-slate-700">
                    <div id="civilCodeContentHost"></div>
                    <div class="pt-6 mt-8 border-t border-slate-200 flex justify-end">
                        <button type="button" id="civilCodeAcceptBtn" class="shrink-0 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition cursor-pointer">
                            同意して閉じる
                        </button>
                    </div>
                </div>

                <div id="civilCodeLockedMessage" class="hidden rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 leading-relaxed">
                    ${LOCKED_MESSAGE}
                </div>

                <div id="civilCodeCloseFooter" class="pt-2 border-t border-slate-100 flex items-center justify-end shrink-0">
                    <button type="button" id="civilCodeCloseBtn" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer">
                        同意しない
                    </button>
                </div>
            </div>
        `;

        container.appendChild(modalEl);

        if (REICHINS.utils && typeof REICHINS.utils.registerModalObserver === 'function') {
            REICHINS.utils.registerModalObserver(modalEl);
        }

        return modalEl;
    }

    function initCivilCodeModal() {
        ensureConsentState();

        const footerWrapper = document.getElementById('footerCivilCodeWrapper');
        const triggerBtn = document.getElementById('footerCivilCodeBtn');
        const setupTriggerBtn = document.getElementById('setupTriggerBtn');
        const complianceSection = document.getElementById('complianceCompressSection');
        const complianceYesBtn = document.getElementById('complianceCompressYesBtn');

        function areAllBaseDocumentsAccepted() {
            const consent = ensureConsentState();
            const baseDocs = Array.isArray(REICHINS.LEGAL_DOCUMENTS) ? REICHINS.LEGAL_DOCUMENTS : [];
            return baseDocs.length > 0 && baseDocs.every((doc) => Boolean(consent[doc.consentKey]));
        }

        function syncComplianceSection() {
            if (!complianceSection) return;
            if (areAllBaseDocumentsAccepted() || REICHINS.state.complianceCompressEnabled) {
                complianceSection.classList.remove('hidden');
            } else {
                complianceSection.classList.add('hidden');
            }
        }

        function lockComplianceYesButton() {
            if (!complianceYesBtn) return;
            complianceYesBtn.disabled = true;
            complianceYesBtn.textContent = 'はい';
            complianceYesBtn.className = 'px-4 py-1.5 rounded-lg bg-slate-300 text-slate-600 text-xs font-semibold cursor-not-allowed';
        }

        function applyComplianceState() {
            syncComplianceSection();
            if (REICHINS.state.complianceCompressEnabled) {
                lockComplianceYesButton();
                if (footerWrapper) footerWrapper.classList.remove('hidden');
            }
        }
        REICHINS.applyComplianceState = applyComplianceState;

        REICHINS.onLegalConsentUpdated = function() {
            applyComplianceState();
            if (typeof REICHINS.autoSaveIfPersisted === 'function') {
                REICHINS.autoSaveIfPersisted();
            }
        };

        if (setupTriggerBtn) {
            setupTriggerBtn.addEventListener('click', applyComplianceState);
        }

        if (complianceYesBtn) {
            complianceYesBtn.addEventListener('click', () => {
                if (REICHINS.state.complianceCompressEnabled || !areAllBaseDocumentsAccepted()) return;
                REICHINS.state.complianceCompressEnabled = true;
                applyComplianceState();
                if (typeof REICHINS.autoSaveIfPersisted === 'function') {
                    REICHINS.autoSaveIfPersisted();
                }
            });
        }

        applyComplianceState();

        const modalEl = document.getElementById('civilCodeModal') || createCivilCodeModal();
        if (!modalEl) return;

        const sourceBanner = document.getElementById('civilCodeSourceBanner');
        const scrollBox = document.getElementById('civilCodeScrollBox');
        const contentHost = document.getElementById('civilCodeContentHost');
        const lockedMessageEl = document.getElementById('civilCodeLockedMessage');
        const closeFooterEl = document.getElementById('civilCodeCloseFooter');
        const acceptBtn = document.getElementById('civilCodeAcceptBtn');
        const disagreeBtn = document.getElementById('civilCodeCloseBtn');

        let isLocked = false;
        let hasRenderedBody = false;

        function ensureBodyRendered() {
            if (hasRenderedBody || !contentHost) return;
            const data = REICHINS.CIVIL_CODE_DATA;
            contentHost.innerHTML = data && data.html
                ? data.html
                : '<p class="text-red-600">民法データの読み込みに失敗しました。</p>';
            hasRenderedBody = true;
        }

        if (triggerBtn) {
            triggerBtn.addEventListener('click', () => {
                ensureBodyRendered();
                modalEl.classList.remove('hidden');

                if (isLocked) {
                    if (sourceBanner) sourceBanner.classList.add('hidden');
                    if (scrollBox) scrollBox.classList.add('hidden');
                    if (lockedMessageEl) lockedMessageEl.classList.remove('hidden');
                    if (closeFooterEl) closeFooterEl.classList.add('hidden');
                    return;
                }

                if (sourceBanner) sourceBanner.classList.remove('hidden');
                if (scrollBox) {
                    scrollBox.classList.remove('hidden');
                    scrollBox.scrollTop = 0;
                }
                if (lockedMessageEl) lockedMessageEl.classList.add('hidden');
                if (closeFooterEl) closeFooterEl.classList.remove('hidden');
            });
        }

        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => {
                if (isLocked) return;
                ensureConsentState()[CONSENT_KEY] = true;
                modalEl.classList.add('hidden');
                if (typeof REICHINS.onLegalConsentUpdated === 'function') {
                    REICHINS.onLegalConsentUpdated();
                }
            });
        }

        if (disagreeBtn) {
            disagreeBtn.addEventListener('click', () => {
                if (isLocked) return;
                isLocked = true;
                ensureConsentState()[CONSENT_KEY] = false;
                if (sourceBanner) sourceBanner.classList.add('hidden');
                if (scrollBox) scrollBox.classList.add('hidden');
                if (lockedMessageEl) lockedMessageEl.classList.remove('hidden');
                if (closeFooterEl) closeFooterEl.classList.add('hidden');
            });
        }
    }

    initCivilCodeModal();
})();
