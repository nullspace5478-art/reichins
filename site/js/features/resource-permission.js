(() => {
    const REICHINS = window.REICHINS = window.REICHINS || {};

    const REQUIRED_RESOURCES = [
        { id: 'res_user_time', label: 'ユーザーの貴重な時間' },
        { id: 'res_cpu_main', label: 'CPU（メインスレッド）' },
        { id: 'res_main_ram', label: 'メインメモリ（RAM）' },
        { id: 'res_storage_io', label: 'ストレージ読み取り I/O' },
        { id: 'res_internal_bus', label: '内部データバス' },
        { id: 'res_prng', label: '乱数生成器（PRNG）' },
        { id: 'res_timer_clock', label: 'タイマー回路（クロック）' },
        { id: 'res_js_engine', label: 'ブラウザのJavaScript実行エンジン' },
        { id: 'res_object_url_ram', label: 'Object URL管理メモリ（RAM）' },
        { id: 'res_file_buffer_ram', label: 'ファイルバッファ（File / Blob / ArrayBuffer 用RAM）' },
        { id: 'res_decode_work_ram', label: 'デコード用ワークメモリ（非圧縮RGBAビットマップ用RAM）' },
        { id: 'res_canvas_2d', label: 'HTML5 Canvas 2D描画コンテキスト（CPU/GPUラスタライズ演算・VRAM）' },
        { id: 'res_image_codec', label: 'ブラウザ内蔵画像デコーダ・エンコーダ（JPEG / PNG / WebP）' },
        { id: 'res_typed_array_ram', label: 'バイナリ配列バッファ（Uint8Array / DataView 用RAM）' },
        { id: 'res_text_encoder', label: '文字列エンコーダ（TextEncoder / Base64変換用CPU・RAM）' },
        { id: 'res_crc32_lut', label: '巡回冗長検査（CRC32）演算用ルックアップテーブル（RAM・CPU整数演算）' },
        { id: 'res_jszip', label: 'JSZipライブラリ（外部CDN通信・ZIPアーカイブ生成用CPU/RAM）' }
    ];

    const SPECIAL_ITEMS = [
        { id: 'sp_disagree', label: 'リソース使用に同意しない', special: 'disagree' },
        { id: 'sp_uncheck_all', label: '全ての選択肢からチェックを外す', special: 'uncheckAll' },
        { id: 'sp_shuffle_reset', label: '項目をシャッフルしてリセット', special: 'shuffleReset' }
    ];

    const footerResourceBtn = document.getElementById('footerResourceBtn');
    const modal = document.getElementById('resourcePermissionModal');
    const listContainer = document.getElementById('resourcePermissionList');
    const resetCloseBtn = document.getElementById('resourceResetCloseBtn');
    const agreeReloadBtn = document.getElementById('resourceAgreeReloadBtn');
    const hiddenCloseBtn = document.getElementById('resourceStealthCloseBtn');

    const consentErrorModal = document.getElementById('resourceConsentErrorModal');
    const consentYesBtn = document.getElementById('resourceConsentYesBtn');
    const consentNoBtn = document.getElementById('resourceConsentNoBtn');
    const consentCancelBtn = document.getElementById('resourceConsentCancelBtn');

    let currentItems = [];
    let checkedIds = new Set();
    let savedCheckedIds = new Set();

    function shuffleArray(arr) {
        const copy = arr.slice();
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    function buildShuffledItems() {
        const base = shuffleArray(REQUIRED_RESOURCES);
        const specials = shuffleArray(SPECIAL_ITEMS);

        // 先頭・末尾付近（先頭3件・末尾3件）を避けた中間領域へ3つの特殊項目を個別に挿入
        const result = base.slice();
        const minEdgeGap = 3;
        const chosenIndices = [];

        specials.forEach((sp) => {
            const minPos = minEdgeGap;
            const maxPos = result.length - minEdgeGap;
            const pos = minPos + Math.floor(Math.random() * Math.max(1, maxPos - minPos + 1));
            result.splice(pos, 0, sp);
            chosenIndices.push(pos);
        });

        return result;
    }

    function isPermittedBySet(idSet) {
        if (!idSet || idSet.has('sp_disagree')) return false;
        return REQUIRED_RESOURCES.every((item) => idSet.has(item.id));
    }

    function commitSavedPermission(idSet) {
        savedCheckedIds = new Set(idSet);
        REICHINS.state.resourcePermissionGranted = isPermittedBySet(savedCheckedIds);
        if (typeof REICHINS.autoSaveIfPersisted === 'function') {
            REICHINS.autoSaveIfPersisted();
        }
    }

    function renderList() {
        if (!listContainer) return;
        listContainer.innerHTML = '';

        currentItems.forEach((item) => {
            const label = document.createElement('label');
            label.className = 'flex items-start gap-2.5 p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100/80 cursor-pointer transition select-none';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = item.id;
            checkbox.checked = checkedIds.has(item.id);
            checkbox.className = 'mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0 cursor-pointer';

            const text = document.createElement('span');
            text.className = 'text-xs text-slate-700 leading-snug';
            text.textContent = item.label;

            checkbox.addEventListener('change', () => {
                if (item.special === 'uncheckAll') {
                    checkedIds.clear();
                    renderList();
                    return;
                }
                if (item.special === 'shuffleReset') {
                    checkedIds.clear();
                    currentItems = buildShuffledItems();
                    renderList();
                    return;
                }
                if (checkbox.checked) {
                    checkedIds.add(item.id);
                } else {
                    checkedIds.delete(item.id);
                }
            });

            label.appendChild(checkbox);
            label.appendChild(text);
            listContainer.appendChild(label);
        });
    }

    function resetAndShuffle() {
        checkedIds.clear();
        currentItems = buildShuffledItems();
        commitSavedPermission(checkedIds);
        renderList();
    }

    // 初期状態生成（全項目未選択＋ランダム順）
    currentItems = buildShuffledItems();
    commitSavedPermission(checkedIds);
    renderList();

    if (footerResourceBtn) {
        footerResourceBtn.addEventListener('click', () => {
            if (REICHINS.legalConsent && !REICHINS.legalConsent.checkBaseConsentOrShowError()) {
                return;
            }
            checkedIds = new Set(savedCheckedIds);
            renderList();
            if (modal) modal.classList.remove('hidden');
        });
    }

    // 「リセットして閉じる」：チェック・並びをリセットして閉じる
    if (resetCloseBtn) {
        resetCloseBtn.addEventListener('click', () => {
            resetAndShuffle();
            if (modal) modal.classList.add('hidden');
        });
    }

    // 「同意して再読み込み」：サイトをリロードして結果的にリセット
    if (agreeReloadBtn) {
        agreeReloadBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }

    // モーダル外・画面右下の小さい「閉じる」：現在のチェック内容を保存して閉じる
    if (hiddenCloseBtn) {
        hiddenCloseBtn.addEventListener('click', () => {
            commitSavedPermission(checkedIds);
            if (modal) modal.classList.add('hidden');
        });
    }

    function closeConsentErrorModal() {
        if (consentErrorModal) consentErrorModal.classList.add('hidden');
    }

    [consentYesBtn, consentNoBtn, consentCancelBtn].forEach((btn) => {
        if (btn) btn.addEventListener('click', closeConsentErrorModal);
    });

    function isGranted() {
        return Boolean(REICHINS.state.resourcePermissionGranted) && isPermittedBySet(savedCheckedIds);
    }

    function showConsentErrorModal() {
        if (consentErrorModal) consentErrorModal.classList.remove('hidden');
    }

    function getSavedCheckedIds() {
        return Array.from(savedCheckedIds);
    }

    function setSavedCheckedIds(ids) {
        if (!Array.isArray(ids)) return;
        commitSavedPermission(new Set(ids));
        checkedIds = new Set(savedCheckedIds);
    }

    REICHINS.resourcePermission = {
        REQUIRED_RESOURCES,
        SPECIAL_ITEMS,
        buildShuffledItems,
        isPermittedBySet,
        isGranted,
        showConsentErrorModal,
        resetAndShuffle,
        getSavedCheckedIds,
        setSavedCheckedIds
    };
})();
