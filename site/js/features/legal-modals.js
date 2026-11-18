(() => {
    const REICHINS = window.REICHINS = window.REICHINS || {};

    const footerMetadataBtn = document.getElementById('footerMetadataBtn');

    const metadataModal = document.getElementById('metadataModal');
    const metadataCloseBtn = document.getElementById('metadataCloseBtn');
    const metadataCloseIconBtn = document.getElementById('metadataCloseIconBtn');
    const metadataHoldSvg = document.getElementById('metadataHoldSvg');
    const metadataHoldRing = document.getElementById('metadataHoldRing');
    const embedMetadataToggle = document.getElementById('embedMetadataToggle');
    const metadataWarningBox = document.getElementById('metadataWarningBox');

    function resetHoldRing(ringEl) {
        if (!ringEl) return;
        ringEl.style.strokeDashoffset = '88';
    }

    // 極めて遅いスクロール処理の実装（ホイールイベントを制御）
    function setupSlowScroll(container) {
        if (!container) return;
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            // 極めて遅いスクロール速度（ホイールデルタの約1.5%、わずか0.5〜1.5ピクセルずつしか進まない）
            const slowDelta = e.deltaY * 0.015;
            container.scrollTop += slowDelta;
        }, { passive: false });
    }

    // メタデータ設定に応じたボタン・閉じる挙動の同期
    function syncMetadataModalUI() {
        const isChecked = !!(embedMetadataToggle && embedMetadataToggle.checked);
        if (metadataWarningBox) {
            metadataWarningBox.classList.toggle('hidden', isChecked);
        }
        if (metadataCloseBtn) {
            metadataCloseBtn.textContent = isChecked ? '閉じる' : 'リセット';
        }
        if (metadataHoldSvg) {
            metadataHoldSvg.classList.toggle('hidden', isChecked);
        }
        if (metadataCloseIconBtn) {
            metadataCloseIconBtn.title = isChecked ? '閉じる' : '3秒長押しで閉じる';
            const srOnly = metadataCloseIconBtn.querySelector('.sr-only');
            if (srOnly) {
                srOnly.textContent = isChecked ? '閉じる' : '長押しで閉じる';
            }
        }
        if (isChecked) {
            resetHoldRing(metadataHoldRing);
        }
    }

    // メタデータ右上の閉じるボタン（チェック時は即閉じる、未チェック時は3秒長押し）
    function setupMetadataIconClose() {
        if (!metadataCloseIconBtn) return;

        let holdTimer = null;
        let startTime = null;
        const targetDuration = 3000;

        function cancelHold() {
            if (holdTimer) {
                clearInterval(holdTimer);
                holdTimer = null;
            }
            resetHoldRing(metadataHoldRing);
        }

        metadataCloseIconBtn.addEventListener('click', () => {
            if (embedMetadataToggle && embedMetadataToggle.checked) {
                cancelHold();
                if (metadataModal) metadataModal.classList.add('hidden');
            }
        });

        function startHold(e) {
            if (embedMetadataToggle && embedMetadataToggle.checked) {
                return;
            }
            e.preventDefault();
            cancelHold();
            startTime = Date.now();

            holdTimer = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(1, elapsed / targetDuration);
                const offset = 88 - (88 * progress);
                if (metadataHoldRing) {
                    metadataHoldRing.style.strokeDashoffset = `${offset}`;
                }

                if (elapsed >= targetDuration) {
                    cancelHold();
                    if (metadataModal) metadataModal.classList.add('hidden');
                }
            }, 30);
        }

        metadataCloseIconBtn.addEventListener('mousedown', startHold);
        metadataCloseIconBtn.addEventListener('mouseup', cancelHold);
        metadataCloseIconBtn.addEventListener('mouseleave', cancelHold);

        metadataCloseIconBtn.addEventListener('touchstart', startHold, { passive: false });
        metadataCloseIconBtn.addEventListener('touchend', cancelHold);
        metadataCloseIconBtn.addEventListener('touchcancel', cancelHold);
    }

    if (footerMetadataBtn) {
        footerMetadataBtn.addEventListener('click', () => {
            if (REICHINS.legalConsent && !REICHINS.legalConsent.checkBaseConsentOrShowError()) {
                return;
            }
            syncMetadataModalUI();
            if (metadataModal) metadataModal.classList.remove('hidden');
            resetHoldRing(metadataHoldRing);
        });
    }

    if (embedMetadataToggle) {
        embedMetadataToggle.addEventListener('change', syncMetadataModalUI);
    }

    if (metadataCloseBtn) {
        metadataCloseBtn.addEventListener('click', () => {
            if (embedMetadataToggle && embedMetadataToggle.checked) {
                if (metadataModal) metadataModal.classList.add('hidden');
            } else if (embedMetadataToggle) {
                embedMetadataToggle.checked = true;
                syncMetadataModalUI();
            }
        });
    }

    setupMetadataIconClose();
    syncMetadataModalUI();

    // 法務・ガイドライン系モーダル共通セットアップ
    function ensureConsentState() {
        if (!REICHINS.state.legalConsent) {
            REICHINS.state.legalConsent = {};
        }
        return REICHINS.state.legalConsent;
    }

    function createLegalModalElement(doc) {
        const modalEl = document.createElement('div');
        modalEl.id = doc.modalId;
        modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm hidden overflow-y-auto';

        const cardEl = document.createElement('div');
        cardEl.className = 'w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-4 my-8 text-left';

        // ヘッダー（バツボタン無し）
        const headerEl = document.createElement('div');
        headerEl.className = 'flex items-center justify-between pb-2 border-b border-slate-100';

        const titleEl = document.createElement('h3');
        titleEl.className = 'text-slate-900 font-bold text-base sm:text-lg flex items-center gap-2';

        const iconEl = document.createElement('i');
        iconEl.className = `${doc.iconClass} text-blue-600`;
        titleEl.appendChild(iconEl);
        titleEl.appendChild(document.createTextNode(` ${doc.title}`));

        headerEl.appendChild(titleEl);
        cardEl.appendChild(headerEl);

        // 3行分しか見えず、スクロールバー非表示の本文ボックス
        const scrollBox = document.createElement('div');
        scrollBox.id = `${doc.id}ScrollBox`;
        scrollBox.className = 'space-y-3 text-xs leading-relaxed text-slate-600 h-[4.75rem] overflow-y-scroll no-scrollbar select-none pr-1';

        (doc.articles || []).forEach((article) => {
            const headingEl = document.createElement('p');
            headingEl.className = 'font-bold text-slate-800';
            headingEl.textContent = article.heading;
            scrollBox.appendChild(headingEl);

            const bodyEl = document.createElement('p');
            bodyEl.textContent = article.body;
            scrollBox.appendChild(bodyEl);
        });

        const acceptWrapper = document.createElement('div');
        acceptWrapper.className = 'pt-3 pb-1 flex justify-end';

        const acceptBtn = document.createElement('button');
        acceptBtn.type = 'button';
        acceptBtn.id = `${doc.id}AcceptBtn`;
        acceptBtn.className = 'px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer';
        acceptBtn.textContent = '同意して閉じる';

        acceptWrapper.appendChild(acceptBtn);
        scrollBox.appendChild(acceptWrapper);
        cardEl.appendChild(scrollBox);

        // 同意しなかった場合のロックメッセージ
        const lockedMessageEl = document.createElement('div');
        lockedMessageEl.id = `${doc.id}LockedMessage`;
        lockedMessageEl.className = 'hidden rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 leading-relaxed';
        lockedMessageEl.textContent = doc.lockedMessage;
        cardEl.appendChild(lockedMessageEl);

        // フッター（「同意しない」ボタン）
        const closeFooterEl = document.createElement('div');
        closeFooterEl.id = `${doc.id}CloseFooter`;
        closeFooterEl.className = 'pt-2 border-t border-slate-100 flex items-center justify-end';

        const disagreeBtn = document.createElement('button');
        disagreeBtn.type = 'button';
        disagreeBtn.id = `${doc.id}CloseBtn`;
        disagreeBtn.className = 'px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition';
        disagreeBtn.textContent = '同意しない';

        closeFooterEl.appendChild(disagreeBtn);
        cardEl.appendChild(closeFooterEl);

        modalEl.appendChild(cardEl);

        return {
            modalEl,
            scrollBox,
            lockedMessageEl,
            closeFooterEl,
            disagreeBtn,
            acceptBtn
        };
    }

    function setupLegalDocumentModal({
        triggerBtn,
        modalEl,
        scrollBox,
        lockedMessageEl,
        closeFooterEl,
        disagreeBtn,
        acceptBtn,
        consentKey
    }) {
        let isLocked = false;

        if (triggerBtn && modalEl) {
            triggerBtn.addEventListener('click', () => {
                modalEl.classList.remove('hidden');
                if (isLocked) {
                    if (scrollBox) scrollBox.classList.add('hidden');
                    if (lockedMessageEl) lockedMessageEl.classList.remove('hidden');
                    if (closeFooterEl) closeFooterEl.classList.add('hidden');
                    return;
                }
                if (scrollBox) {
                    scrollBox.classList.remove('hidden');
                    scrollBox.scrollTop = 0;
                }
                if (lockedMessageEl) lockedMessageEl.classList.add('hidden');
                if (closeFooterEl) closeFooterEl.classList.remove('hidden');
                if (disagreeBtn) disagreeBtn.textContent = '同意しない';
                if (acceptBtn) acceptBtn.textContent = '同意して閉じる';
            });
        }

        if (scrollBox) {
            setupSlowScroll(scrollBox);
        }

        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => {
                if (isLocked) return;
                ensureConsentState()[consentKey] = true;
                if (modalEl) modalEl.classList.add('hidden');
                if (typeof REICHINS.onLegalConsentUpdated === 'function') {
                    REICHINS.onLegalConsentUpdated();
                }
            });
        }

        if (disagreeBtn) {
            disagreeBtn.addEventListener('click', () => {
                if (isLocked) return;
                isLocked = true;
                ensureConsentState()[consentKey] = false;
                if (scrollBox) scrollBox.classList.add('hidden');
                if (lockedMessageEl) lockedMessageEl.classList.remove('hidden');
                if (closeFooterEl) closeFooterEl.classList.add('hidden');
            });
        }
    }

    const legalModalsContainer = document.getElementById('legalModalsContainer');
    const legalDocuments = Array.isArray(REICHINS.LEGAL_DOCUMENTS) ? REICHINS.LEGAL_DOCUMENTS : [];

    legalDocuments.forEach((doc) => {
        ensureConsentState()[doc.consentKey] = Boolean(ensureConsentState()[doc.consentKey]);

        let modalEl = document.getElementById(doc.modalId);
        let scrollBox = document.getElementById(`${doc.id}ScrollBox`);
        let lockedMessageEl = document.getElementById(`${doc.id}LockedMessage`);
        let closeFooterEl = document.getElementById(`${doc.id}CloseFooter`);
        let disagreeBtn = document.getElementById(`${doc.id}CloseBtn`);
        let acceptBtn = document.getElementById(`${doc.id}AcceptBtn`);

        if (!modalEl && legalModalsContainer) {
            const created = createLegalModalElement(doc);
            modalEl = created.modalEl;
            scrollBox = created.scrollBox;
            lockedMessageEl = created.lockedMessageEl;
            closeFooterEl = created.closeFooterEl;
            disagreeBtn = created.disagreeBtn;
            acceptBtn = created.acceptBtn;
            legalModalsContainer.appendChild(modalEl);

            if (REICHINS.utils && typeof REICHINS.utils.registerModalObserver === 'function') {
                REICHINS.utils.registerModalObserver(modalEl);
            }
        }

        setupLegalDocumentModal({
            triggerBtn: document.getElementById(doc.footerBtnId),
            modalEl,
            scrollBox,
            lockedMessageEl,
            closeFooterEl,
            disagreeBtn,
            acceptBtn,
            consentKey: doc.consentKey
        });
    });

    REICHINS.legalConsent = {
        getFirstMissingBaseDocument() {
            const consent = ensureConsentState();
            return legalDocuments.find((doc) => !consent[doc.consentKey]) || null;
        },
        getFirstMissingDocument() {
            const consent = ensureConsentState();
            const missingDoc = legalDocuments.find((doc) => !consent[doc.consentKey]);
            if (missingDoc) return missingDoc;
            if (Array.isArray(REICHINS.extraLegalConsentChecks)) {
                return REICHINS.extraLegalConsentChecks.find((doc) => !consent[doc.consentKey]) || null;
            }
            return null;
        },
        areAllBaseDocumentsAccepted() {
            const consent = ensureConsentState();
            return legalDocuments.every((doc) => Boolean(consent[doc.consentKey]));
        },
        showConsentErrorModal(missingDoc) {
            const doc = missingDoc || this.getFirstMissingBaseDocument();
            if (!doc) return false;
            const msgEl = document.getElementById('legalConsentErrorMessage');
            const modalEl = document.getElementById('legalConsentErrorModal');
            if (msgEl) {
                msgEl.textContent = doc.consentErrorMessage;
            }
            if (modalEl) {
                modalEl.classList.remove('hidden');
            }
            return true;
        },
        checkBaseConsentOrShowError() {
            const missingDoc = this.getFirstMissingBaseDocument();
            if (missingDoc) {
                this.showConsentErrorModal(missingDoc);
                return false;
            }
            return true;
        }
    };
})();
