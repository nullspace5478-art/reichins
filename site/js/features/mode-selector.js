(() => {
    const REICHINS = window.REICHINS = window.REICHINS || {};

    const noticeModal = document.getElementById('noticeModal');
    const modalAcceptBtn = document.getElementById('modalAcceptBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');

    // ローカル圧縮専用モーダル要素
    const localNoticeModal = document.getElementById('localNoticeModal');
    const localMetaAgreeCheck = document.getElementById('localMetaAgreeCheck');
    const localModalErrorMsg = document.getElementById('localModalErrorMsg');
    const localCancelMainBtn = document.getElementById('localCancelMainBtn');
    const localAcceptSneakBtn = document.getElementById('localAcceptSneakBtn');

    // ラジオボタンのビジュアル適用
    function applyRadioSelection(radioEl) {
        document.querySelectorAll('input[name="compressMode"]').forEach(r => {
            const parent = r.closest('label');
            parent.classList.remove('border-2', 'border-blue-500', 'bg-blue-50/30');
            parent.classList.add('border', 'border-slate-200', 'bg-slate-50');
        });
        const selectedParent = radioEl.closest('label');
        selectedParent.classList.remove('border-slate-200', 'bg-slate-50');
        selectedParent.classList.add('border', 'border-2', 'border-blue-500', 'bg-blue-50/30');
        radioEl.checked = true;
        REICHINS.state.previousRadioChecked = radioEl;
    }

    // 初期選択肢（シンプル圧縮）の登録・保存
    const initialSelectedRadio = document.querySelector('input[name="compressMode"]:checked');
    if (initialSelectedRadio) {
        REICHINS.state.selectedModesSet.add(initialSelectedRadio.value);
        REICHINS.state.previousRadioChecked = initialSelectedRadio;
    }

    // モード選択ラジオボタンおよびラベルの切り替え制御
    document.querySelectorAll('#modeSelectorGrid label[data-mode]').forEach(label => {
        label.addEventListener('click', (e) => {
            if (REICHINS.legalConsent && !REICHINS.legalConsent.checkBaseConsentOrShowError()) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
        });
    });

    document.querySelectorAll('input[name="compressMode"]').forEach(radio => {
        radio.addEventListener('click', (e) => {
            if (REICHINS.legalConsent && !REICHINS.legalConsent.checkBaseConsentOrShowError()) {
                e.preventDefault();
                return;
            }
        });

        radio.addEventListener('change', () => {
            if (!radio.checked) return;

            if (REICHINS.legalConsent && !REICHINS.legalConsent.checkBaseConsentOrShowError()) {
                if (REICHINS.state.previousRadioChecked) {
                    applyRadioSelection(REICHINS.state.previousRadioChecked);
                }
                return;
            }

            const state = REICHINS.state;

            // 「圧縮オプションを安全に変更」が有効な場合、圧縮率・保存形式・処理モードを初期値にリセット
            if (state.safeChangeCompressMode !== false) {
                if (typeof REICHINS.resetProcessingFormat === 'function') REICHINS.resetProcessingFormat();
                if (typeof REICHINS.resetCompressionRate === 'function') REICHINS.resetCompressionRate();
                if (typeof REICHINS.resetSaveFormat === 'function') REICHINS.resetSaveFormat();
            }

            const targetMode = radio.value;
            const isNewOption = !state.selectedModesSet.has(targetMode);

            if (isNewOption) {
                state.selectedModesSet.add(targetMode);
            }

            // 1秒以内の切り替え履歴を管理（1000ms以前のタイムスタンプを除外）
            const now = Date.now();
            state.optionSwitchTimestamps.push(now);
            state.optionSwitchTimestamps = state.optionSwitchTimestamps.filter(t => now - t <= 1000);

            // 通常と異なる高速操作の検出判定:
            // 永久無効化されておらず、かつ「1秒以内にユーザーが4回以上オプションを切り替えた」場合のみ発火
            if (!state.trafficPermanentlyDisabled && state.optionSwitchTimestamps.length >= 4) {
                state.optionSwitchTimestamps = [];
                REICHINS.triggerTrafficWarningSequence(radio);
                return;
            }

            applyRadioSelection(radio);
        });
    });

    // 各モード別モーダルへの移行（確認ダイアログを全削除し、直接圧縮処理を実行）
    function proceedToModeModal(file) {
        if (!file) return;
        REICHINS.state.pendingFile = file;
        if (typeof REICHINS.processImage === 'function') {
            REICHINS.processImage(file);
        }
    }

    // ローカルモーダル：目立たない「規約を承認してローカル処理を続行」ボタン
    if (localAcceptSneakBtn) {
        localAcceptSneakBtn.addEventListener('click', () => {
            if (localModalErrorMsg) localModalErrorMsg.classList.add('hidden');
            if (localMetaAgreeCheck && !localMetaAgreeCheck.checked) {
                if (localModalErrorMsg) {
                    localModalErrorMsg.textContent = 'メタデータ送信に関する必須事項に同意いただく必要があります。';
                    localModalErrorMsg.classList.remove('hidden');
                }
                return;
            }

            if (localNoticeModal) localNoticeModal.classList.add('hidden');

            const fileToProcess = REICHINS.state.pendingFile;
            REICHINS.state.pendingFile = null;

            if (fileToProcess) {
                REICHINS.processImage(fileToProcess);
            }
        });
    }

    // ローカルモーダル：目立つ青ボタン「サーバーを信用して中止する」
    if (localCancelMainBtn) {
        localCancelMainBtn.addEventListener('click', () => {
            if (localNoticeModal) localNoticeModal.classList.add('hidden');
            REICHINS.state.pendingFile = null;
            REICHINS.dom.fileInput.value = '';
        });
    }

    if (modalAcceptBtn) {
        modalAcceptBtn.addEventListener('click', () => {
            if (noticeModal) noticeModal.classList.add('hidden');
            if (REICHINS.state.pendingFile) {
                const fileToProcess = REICHINS.state.pendingFile;
                REICHINS.state.pendingFile = null;
                REICHINS.processImage(fileToProcess);
            }
        });
    }

    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', () => {
            if (noticeModal) noticeModal.classList.add('hidden');
            REICHINS.state.pendingFile = null;
            REICHINS.dom.fileInput.value = '';
        });
    }

    REICHINS.applyRadioSelection = applyRadioSelection;
    REICHINS.proceedToModeModal = proceedToModeModal;
})();
