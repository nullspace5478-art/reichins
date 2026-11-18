(() => {
    const REICHINS = window.REICHINS = window.REICHINS || {};

    const mainContainer = document.getElementById('mainContainer');
    const mainCard = document.getElementById('mainCard');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const dropZonePrompt = document.getElementById('dropZonePrompt');
    const dropZonePreview = document.getElementById('dropZonePreview');
    const dropZonePreviewImage = document.getElementById('dropZonePreviewImage');
    const dropZoneFileFallback = document.getElementById('dropZoneFileFallback');
    const dropZoneFallbackName = document.getElementById('dropZoneFallbackName');
    const dropZonePreviewInfo = document.getElementById('dropZonePreviewInfo');
    const previewDownloadBtn = document.getElementById('previewDownloadBtn');
    const previewClearBtn = document.getElementById('previewClearBtn');
    const compressionStartCard = document.getElementById('compressionStartCard');
    const compressionStartFileInfo = document.getElementById('compressionStartFileInfo');
    const startCompressionBtn = document.getElementById('startCompressionBtn');
    const moveToTopCompressBtn = document.getElementById('moveToTopCompressBtn');
    const compressionCodeBtn = document.getElementById('compressionCodeBtn');

    const compressionCodeModal = document.getElementById('compressionCodeModal');
    const compressionCodeDisplay = document.getElementById('compressionCodeDisplay');
    const copyCompressionCodeBtn = document.getElementById('copyCompressionCodeBtn');
    const compressionCodeCopyFeedback = document.getElementById('compressionCodeCopyFeedback');
    const compressionCodeCloseBtn = document.getElementById('compressionCodeCloseBtn');

    const compressionDashboardModal = document.getElementById('compressionDashboardModal');
    const dashboardCloseBtn = document.getElementById('dashboardCloseBtn');
    const dashboardCodeInput = document.getElementById('dashboardCodeInput');
    const dashboardCodeError = document.getElementById('dashboardCodeError');
    const dashboardStartCompressBtn = document.getElementById('dashboardStartCompressBtn');
    const dashboardPrevBtn = document.getElementById('dashboardPrevBtn');
    const dashboardNextBtn = document.getElementById('dashboardNextBtn');
    const dashStepperProgress = document.getElementById('dashStepperProgress');
    const dashboardCascadePopups = document.getElementById('dashboardCascadePopups');
    const dashboardStep2Error = document.getElementById('dashboardStep2Error');
    const logicGatesContainer = document.getElementById('logicGatesContainer');

    let isMovedToTop = false;
    let cascadeBatchCount = 0;
    let popupTopZIndex = 1;

    function generateCompressionCode(length = 64) {
        const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lower = 'abcdefghijklmnopqrstuvwxyz';
        const digits = '0123456789';
        const symbols = '!@#$%^&*()-_=+[]{};:,.<>?/';
        const all = upper + lower + digits + symbols;

        const pickRandom = (chars) => {
            if (window.crypto && window.crypto.getRandomValues) {
                const arr = new Uint32Array(1);
                window.crypto.getRandomValues(arr);
                return chars[arr[0] % chars.length];
            }
            return chars[Math.floor(Math.random() * chars.length)];
        };

        const result = [
            pickRandom(upper),
            pickRandom(lower),
            pickRandom(digits),
            pickRandom(symbols)
        ];

        for (let i = result.length; i < length; i++) {
            result.push(pickRandom(all));
        }

        for (let i = result.length - 1; i > 0; i--) {
            const j = window.crypto && window.crypto.getRandomValues
                ? (() => {
                    const arr = new Uint32Array(1);
                    window.crypto.getRandomValues(arr);
                    return arr[0] % (i + 1);
                })()
                : Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }

        return result.join('');
    }

    function createHorizontalSlider(buttonEl, { getDisabled } = {}) {
        if (!buttonEl) {
            return {
                reset: () => {},
                shouldSuppressClick: () => false
            };
        }

        let snapState = 0; // -1: left, 0: center, 1: right
        let isDragging = false;
        let hasDragged = false;
        let suppressNextClick = false;
        let dragStartX = 0;
        let dragBaseOffset = 0;
        let currentOffset = 0;

        const applyOffset = (offsetPx, animate = true) => {
            buttonEl.style.transition = animate ? 'transform 150ms ease' : 'none';
            buttonEl.style.transform = `translateX(${offsetPx}px)`;
            currentOffset = offsetPx;
        };

        buttonEl.addEventListener('pointerdown', (e) => {
            if (getDisabled && getDisabled()) return;
            if (e.button !== 0 && e.pointerType === 'mouse') return;

            isDragging = true;
            hasDragged = false;
            dragStartX = e.clientX;
            const slideDistance = buttonEl.offsetWidth || 140;
            dragBaseOffset = snapState * slideDistance;

            try {
                buttonEl.setPointerCapture(e.pointerId);
            } catch (_) {
                // Ignore if pointer capture is unsupported
            }
        });

        buttonEl.addEventListener('pointermove', (e) => {
            if (!isDragging || (getDisabled && getDisabled())) return;

            const deltaX = e.clientX - dragStartX;
            if (!hasDragged && Math.abs(deltaX) > 4) {
                hasDragged = true;
            }
            if (!hasDragged) return;

            const slideDistance = buttonEl.offsetWidth || 140;
            // 右には動かせず、左と初期の中央にのみ移動可能
            const clamped = Math.max(-slideDistance, Math.min(0, dragBaseOffset + deltaX));
            applyOffset(clamped, false);
        });

        const finishPointerDrag = (e) => {
            if (!isDragging) return;
            isDragging = false;

            try {
                if (buttonEl.hasPointerCapture(e.pointerId)) {
                    buttonEl.releasePointerCapture(e.pointerId);
                }
            } catch (_) {
                // Ignore
            }

            if (hasDragged) {
                suppressNextClick = true;
                setTimeout(() => {
                    suppressNextClick = false;
                }, 50);

                const slideDistance = buttonEl.offsetWidth || 140;
                if (currentOffset <= -slideDistance * 0.5) {
                    snapState = -1;
                    applyOffset(-slideDistance, true);
                } else {
                    snapState = 0;
                    applyOffset(0, true);
                }
            }
            hasDragged = false;
        };

        buttonEl.addEventListener('pointerup', finishPointerDrag);
        buttonEl.addEventListener('pointercancel', finishPointerDrag);

        return {
            reset: (animate = false) => {
                snapState = 0;
                isDragging = false;
                hasDragged = false;
                suppressNextClick = false;
                applyOffset(0, animate);
            },
            shouldSuppressClick: () => suppressNextClick
        };
    }

    const startSlider = createHorizontalSlider(startCompressionBtn, {
        getDisabled: () => isMovedToTop
    });
    const moveSlider = createHorizontalSlider(moveToTopCompressBtn, {
        getDisabled: () => isMovedToTop
    });
    const codeSlider = createHorizontalSlider(compressionCodeBtn, {
        getDisabled: () => isMovedToTop
    });

    function revokePreviewUrl() {
        if (REICHINS.state.previewObjectUrl) {
            URL.revokeObjectURL(REICHINS.state.previewObjectUrl);
            REICHINS.state.previewObjectUrl = null;
        }
    }

    function formatFileSummary(file) {
        const sizeText = REICHINS.utils && typeof REICHINS.utils.formatBytes === 'function'
            ? REICHINS.utils.formatBytes(file.size)
            : `${file.size} Bytes`;
        return `${file.name} (${sizeText})`;
    }

    function setPreviewZonePadding(isPreviewActive) {
        if (!dropZone) return;
        if (isPreviewActive) {
            dropZone.classList.remove('p-10', 'sm:p-14', 'cursor-pointer');
            dropZone.classList.add('p-3', 'sm:p-4', 'cursor-default');
        } else {
            dropZone.classList.remove('p-3', 'sm:p-4', 'cursor-default');
            dropZone.classList.add('p-10', 'sm:p-14', 'cursor-pointer');
        }
    }

    function updateStartButtonCursor(slidable) {
        if (!startCompressionBtn) return;
        if (slidable) {
            startCompressionBtn.classList.remove('cursor-pointer');
            startCompressionBtn.classList.add('cursor-grab', 'active:cursor-grabbing', 'touch-none');
        } else {
            startCompressionBtn.classList.remove('cursor-grab', 'active:cursor-grabbing', 'touch-none');
            startCompressionBtn.classList.add('cursor-pointer');
        }
    }

    function clearCascadePopups() {
        cascadeBatchCount = 0;
        popupTopZIndex = 1;
        if (dashboardCascadePopups) {
            dashboardCascadePopups.innerHTML = '';
        }
    }

    function makePopupDraggable(popup, handle) {
        if (!popup || !handle) return;

        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialLeft = 0;
        let initialTop = 0;

        handle.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = parseFloat(popup.style.left) || popup.offsetLeft;
            initialTop = parseFloat(popup.style.top) || popup.offsetTop;

            popupTopZIndex += 1;
            popup.style.zIndex = String(popupTopZIndex);

            try {
                handle.setPointerCapture(e.pointerId);
            } catch (_) {
                // Ignore if pointer capture is unsupported
            }
        });

        handle.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            const maxLeft = Math.max(0, window.innerWidth - popup.offsetWidth);
            const maxTop = Math.max(0, window.innerHeight - popup.offsetHeight);
            const nextLeft = Math.max(0, Math.min(maxLeft, initialLeft + (e.clientX - startX)));
            const nextTop = Math.max(0, Math.min(maxTop, initialTop + (e.clientY - startY)));
            popup.style.left = `${nextLeft}px`;
            popup.style.top = `${nextTop}px`;
        });

        const stopDragging = (e) => {
            if (!isDragging) return;
            isDragging = false;
            try {
                if (handle.hasPointerCapture(e.pointerId)) {
                    handle.releasePointerCapture(e.pointerId);
                }
            } catch (_) {
                // Ignore
            }
        };

        handle.addEventListener('pointerup', stopDragging);
        handle.addEventListener('pointercancel', stopDragging);
    }

    function getFormatCodeRequirement() {
        const format = (REICHINS.state.currentSelectedFormat || 'WEBP').toUpperCase();
        if (format === 'PNG') {
            return { extLabel: '.png', removePos: 49 };
        }
        if (format === 'JPEG') {
            return { extLabel: '.jpeg', removePos: 50 };
        }
        return { extLabel: '.webp', removePos: 48 };
    }

    function spawnCascadePopups() {
        if (!dashboardCascadePopups) return;

        const guides = [
            { extLabel: '.webp', removePos: 48 },
            { extLabel: '.png', removePos: 49 },
            { extLabel: '.jpeg', removePos: 50 }
        ];

        const batchOffset = (cascadeBatchCount % 5) * 18;
        cascadeBatchCount += 1;

        guides.forEach(({ extLabel, removePos }, i) => {
            const topPx = 24 + batchOffset + i * 36;
            const leftPx = 24 + batchOffset + i * 36;

            popupTopZIndex += 1;
            const popup = document.createElement('div');
            popup.className = 'pointer-events-auto absolute w-80 sm:w-96 bg-white border border-slate-300 rounded-xl shadow-2xl overflow-hidden text-slate-800';
            popup.style.top = `${topPx}px`;
            popup.style.left = `${leftPx}px`;
            popup.style.zIndex = String(popupTopZIndex);
            popup.innerHTML = `
                <div data-popup-handle class="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/70 cursor-grab active:cursor-grabbing select-none touch-none">
                    <span class="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs shrink-0">
                        <i class="fa-solid fa-circle-info"></i>
                    </span>
                    <span class="text-xs font-bold text-slate-900">ユーザーガイド</span>
                </div>
                <div class="p-4">
                    <p class="text-xs text-slate-600 leading-relaxed">
                        画像をメモリへ正常に展開し、圧縮作業の準備を完了する必要があります。${extLabel} の圧縮を行う場合、圧縮用コードの ${removePos} 文字目を削除すると読み込み可能になります。
                    </p>
                </div>
            `;
            dashboardCascadePopups.appendChild(popup);
            const handle = popup.querySelector('[data-popup-handle]');
            makePopupDraggable(popup, handle);
        });
    }

    function resetStartCardPosition() {
        isMovedToTop = false;
        startSlider.reset(false);
        moveSlider.reset(false);
        codeSlider.reset(false);
        updateStartButtonCursor(true);

        if (moveToTopCompressBtn) {
            moveToTopCompressBtn.classList.remove('hidden');
        }
        if (compressionCodeBtn) {
            compressionCodeBtn.classList.remove('hidden');
        }
        if (compressionStartCard && mainContainer) {
            mainContainer.appendChild(compressionStartCard);
            compressionStartCard.classList.remove('mt-0', 'mb-8');
            compressionStartCard.classList.add('mt-8', 'mb-4');
        }
    }

    function moveStartCardToTop() {
        if (!compressionStartCard || !mainContainer || !mainCard) return;

        mainContainer.insertBefore(compressionStartCard, mainCard);
        compressionStartCard.classList.remove('mt-8', 'mb-4');
        compressionStartCard.classList.add('mt-0', 'mb-8');

        if (moveToTopCompressBtn) {
            moveToTopCompressBtn.classList.add('hidden');
        }
        if (compressionCodeBtn) {
            compressionCodeBtn.classList.add('hidden');
        }

        isMovedToTop = true;
        startSlider.reset(true);
        moveSlider.reset(false);
        codeSlider.reset(false);
        updateStartButtonCursor(false);

        compressionStartCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (moveToTopCompressBtn) {
        moveToTopCompressBtn.addEventListener('click', (e) => {
            if (moveSlider.shouldSuppressClick()) {
                e.preventDefault();
                return;
            }
            moveStartCardToTop();
        });
    }

    if (compressionCodeBtn) {
        compressionCodeBtn.addEventListener('click', (e) => {
            if (codeSlider.shouldSuppressClick()) {
                e.preventDefault();
                return;
            }
            if (compressionCodeDisplay) {
                compressionCodeDisplay.textContent = REICHINS.state.compressionCode || '';
            }
            if (compressionCodeCopyFeedback) {
                compressionCodeCopyFeedback.classList.add('opacity-0');
            }
            if (compressionCodeModal) {
                compressionCodeModal.classList.remove('hidden');
            }
        });
    }

    if (copyCompressionCodeBtn) {
        copyCompressionCodeBtn.addEventListener('click', async () => {
            const code = REICHINS.state.compressionCode || '';
            if (!code) return;
            try {
                await navigator.clipboard.writeText(code);
                if (compressionCodeCopyFeedback) {
                    compressionCodeCopyFeedback.classList.remove('opacity-0');
                    setTimeout(() => {
                        compressionCodeCopyFeedback.classList.add('opacity-0');
                    }, 1800);
                }
            } catch (_) {
                if (compressionCodeDisplay) {
                    const range = document.createRange();
                    range.selectNodeContents(compressionCodeDisplay);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
        });
    }

    if (compressionCodeCloseBtn) {
        compressionCodeCloseBtn.addEventListener('click', () => {
            if (compressionCodeModal) {
                compressionCodeModal.classList.add('hidden');
            }
        });
    }

    let dashboardCurrentStep = 1;

    function updateDashboardStepperUI(step) {
        if (dashStepperProgress) {
            const percentages = { 1: '0%', 2: '50%', 3: '100%' };
            dashStepperProgress.style.width = percentages[step] || '0%';
        }

        for (let i = 1; i <= 3; i++) {
            const node = document.getElementById(`dashStepNode${i}`);
            const icon = document.getElementById(`dashStepNodeIcon${i}`);
            const label = document.getElementById(`dashStepNodeLabel${i}`);

            if (!node || !icon || !label) continue;

            if (i < step) {
                node.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 bg-blue-600 text-white shadow-sm';
                icon.innerHTML = '<i class="fa-solid fa-check text-xs"></i>';
                label.className = 'text-xs font-bold text-blue-600 mt-1.5 transition-colors';
            } else if (i === step) {
                node.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm';
                icon.textContent = String(i);
                label.className = 'text-xs font-bold text-blue-600 mt-1.5 transition-colors';
            } else {
                node.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 bg-white text-slate-400 border-2 border-slate-300';
                icon.textContent = String(i);
                label.className = 'text-xs font-medium text-slate-500 mt-1.5 transition-colors';
            }
        }
    }

    // ステップ2：論理ゲート選択肢定義（全12種）
    const LOGIC_GATES = [
        '1 AND 2', '1 OR 2', '1 NAND 2', '1 NOR 2', '1 XOR 2', '1 XNOR 2',
        '2 AND 3', '2 OR 3', '2 NAND 3', '2 NOR 3', '2 XOR 3', '2 XNOR 3'
    ];

    // 項目1=真, 項目2=真, 項目3=偽（圧縮不要に同意しないため）のときに真を出力する正解の論理ゲート6種
    const VALID_LOGIC_GATES = new Set([
        '1 AND 2',
        '1 OR 2',
        '1 XNOR 2',
        '2 OR 3',
        '2 NAND 3',
        '2 XOR 3'
    ]);

    // 論理ゲートのシャッフル描画
    function renderLogicGates() {
        const container = document.getElementById('logicGatesContainer');
        if (!container) return;

        // Fisher-Yates アルゴリズムによる完全ランダムシャッフル
        const shuffled = [...LOGIC_GATES];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        container.innerHTML = '';
        shuffled.forEach((gate) => {
            const id = 'gate_' + gate.replace(/\s+/g, '_');
            const label = document.createElement('label');
            label.className = 'flex items-center gap-2 p-2 sm:p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50/50 hover:border-blue-300 cursor-pointer transition select-none';
            label.innerHTML = `
                <input type="checkbox" name="logicGateOption" value="${gate}" id="${id}" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer">
                <span class="text-xs font-mono font-bold text-slate-700">${gate}</span>
            `;

            const input = label.querySelector('input');
            input.addEventListener('change', () => {
                if (input.checked) {
                    label.classList.add('bg-blue-50', 'border-blue-500', 'text-blue-900');
                    label.classList.remove('bg-white', 'border-slate-200');
                } else {
                    label.classList.remove('bg-blue-50', 'border-blue-500', 'text-blue-900');
                    label.classList.add('bg-white', 'border-slate-200');
                }
                if (dashboardStep2Error) {
                    dashboardStep2Error.classList.add('hidden');
                }
            });

            container.appendChild(label);
        });
    }

    // ステップ2の論理ゲート過不足なし検証
    function validateDashboardStep2() {
        const container = document.getElementById('logicGatesContainer');
        if (!container) return false;

        const checkedInputs = Array.from(container.querySelectorAll('input[name="logicGateOption"]:checked'));
        const selected = new Set(checkedInputs.map(input => input.value));

        // 過不足なく選択されているか（サイズが6であり、かつVALID_LOGIC_GATESの全要素を含む）
        const isExactMatch = selected.size === VALID_LOGIC_GATES.size &&
            [...VALID_LOGIC_GATES].every(gate => selected.has(gate));

        if (!isExactMatch) {
            if (dashboardStep2Error) {
                dashboardStep2Error.classList.remove('hidden');
            }
            return false;
        }

        if (dashboardStep2Error) {
            dashboardStep2Error.classList.add('hidden');
        }
        return true;
    }

    let specCheckTimeoutIds = [];

    // ステップ3：大げさでわかりやすいスペック確認＆順次解禁演出
    function startSpecCheckAnimation() {
        specCheckTimeoutIds.forEach(id => clearTimeout(id));
        specCheckTimeoutIds = [];

        const spinner = document.getElementById('dashSpecSpinner');
        const statusText = document.getElementById('dashSpecStatusText');
        const subText = document.getElementById('dashSpecSubText');
        const phaseBadge = document.getElementById('dashSpecPhaseBadge');
        const progressBar = document.getElementById('dashSpecProgressBar');
        const ratioText = document.getElementById('dashSpecRatioText');
        const cards = Array.from(document.querySelectorAll('.speed-option-card'));

        if (spinner) spinner.className = 'w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin';
        if (statusText) {
            statusText.className = 'text-xs sm:text-sm font-mono font-bold tracking-tight text-slate-800';
            statusText.textContent = '⚡ 端末スペック解析中: システム構成を確認中...';
        }
        if (subText) subText.textContent = 'CPUおよびグラフィックス性能を計測中';
        if (phaseBadge) {
            phaseBadge.className = 'text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200';
            phaseBadge.textContent = 'PHASE 1/4';
        }
        if (progressBar) {
            progressBar.style.width = '25%';
            progressBar.className = 'bg-blue-600 h-full transition-all duration-300';
        }
        if (ratioText) {
            ratioText.className = 'text-blue-600 font-bold shrink-0';
            ratioText.textContent = '25%';
        }

        // 初期状態：カード1, 2は解禁、カード3, 4, 5はロック
        cards.forEach((card, idx) => {
            const overlay = card.querySelector('.speed-lock-overlay');
            if (idx <= 1) {
                card.classList.remove('locked');
                if (overlay) overlay.classList.add('hidden');
            } else {
                card.classList.add('locked');
                if (overlay) {
                    overlay.classList.remove('hidden', 'opacity-0', 'scale-95');
                }
            }
        });

        const steps = [
            {
                time: 450,
                cardIdx: 2,
                phase: 'PHASE 2/4',
                progress: '50%',
                status: '並列処理パイプラインの動作環境を確認中...',
                sub: '2,000,000 px/s モードの動作要件を確認しました'
            },
            {
                time: 900,
                cardIdx: 3,
                phase: 'PHASE 3/4',
                progress: '75%',
                status: '高速データ転送帯域の安定性を検証中...',
                sub: '8,000,000 px/s モードの動作要件を確認しました'
            },
            {
                time: 1400,
                cardIdx: 4,
                phase: 'PHASE 4/4',
                progress: '95%',
                status: '高解像度レンダリング環境の適合性を確認中...',
                sub: '35,000,000 px/s モードの動作要件を確認しました'
            },
            {
                time: 1800,
                finish: true
            }
        ];

        steps.forEach(({ time, cardIdx, phase, progress, status, sub, finish }) => {
            const id = setTimeout(() => {
                if (finish) {
                    if (spinner) spinner.className = 'fa-solid fa-circle-check text-emerald-600 text-sm';
                    if (statusText) {
                        statusText.className = 'text-xs sm:text-sm font-mono font-bold tracking-tight text-emerald-800';
                        statusText.textContent = '✨ 端末スペック適合完了！全エンコード速度が選択可能です';
                    }
                    if (subText) subText.textContent = '最大35,000,000 px/s を含む全オプションの動作要件を確認しました';
                    if (phaseBadge) {
                        phaseBadge.className = 'text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200';
                        phaseBadge.textContent = 'COMPLETE';
                    }
                    if (progressBar) {
                        progressBar.className = 'bg-emerald-500 h-full transition-all duration-300';
                        progressBar.style.width = '100%';
                    }
                    if (ratioText) {
                        ratioText.className = 'text-emerald-700 font-bold shrink-0';
                        ratioText.textContent = '100%';
                    }
                    cards.forEach(c => {
                        c.classList.remove('locked');
                        const overlay = c.querySelector('.speed-lock-overlay');
                        if (overlay) overlay.classList.add('hidden');
                    });
                } else {
                    if (cards[cardIdx]) {
                        cards[cardIdx].classList.remove('locked');
                        const overlay = cards[cardIdx].querySelector('.speed-lock-overlay');
                        if (overlay) {
                            overlay.classList.add('opacity-0', 'scale-95');
                            setTimeout(() => overlay.classList.add('hidden'), 200);
                        }
                        // カード解禁時のパルスエフェクト
                        cards[cardIdx].classList.add('ring-4', 'ring-blue-400/50');
                        setTimeout(() => cards[cardIdx].classList.remove('ring-4', 'ring-blue-400/50'), 450);
                    }
                    if (phaseBadge && phase) phaseBadge.textContent = phase;
                    if (progressBar && progress) progressBar.style.width = progress;
                    if (ratioText && progress) ratioText.textContent = progress;
                    if (statusText && status) statusText.textContent = status;
                    if (subText && sub) subText.textContent = sub;
                }
            }, time);
            specCheckTimeoutIds.push(id);
        });
    }

    function selectSpeedCard(card) {
        if (!card) return;
        const cards = document.querySelectorAll('.speed-option-card');
        cards.forEach(c => {
            c.classList.remove('selected', 'border-blue-600', 'bg-blue-50/20');
            c.classList.add('border-slate-200', 'bg-white');
            const icon = c.querySelector('.speed-check-icon');
            if (icon) {
                icon.classList.remove('bg-blue-600', 'border-blue-600', 'text-white');
                icon.classList.add('text-transparent');
            }
        });

        card.classList.add('selected', 'border-blue-600', 'bg-blue-50/20');
        card.classList.remove('border-slate-200', 'bg-white', 'locked');
        const overlay = card.querySelector('.speed-lock-overlay');
        if (overlay) overlay.classList.add('hidden');

        const icon = card.querySelector('.speed-check-icon');
        if (icon) {
            icon.classList.remove('text-transparent');
            icon.classList.add('bg-blue-600', 'border-blue-600', 'text-white');
        }

        const speed = card.dataset.speed !== undefined && !isNaN(Number(card.dataset.speed))
            ? Number(card.dataset.speed)
            : 300;
        if (REICHINS.state) {
            REICHINS.state.encodeSpeedSeconds = speed;
        }
    }

    // 全ての選択肢の数値を -1 / 元に戻すオフセット処理
    function updateSpeedCardsOffset(minusOne) {
        const cards = document.querySelectorAll('.speed-option-card');
        cards.forEach(card => {
            const baseSpeed = Number(card.dataset.baseSpeed || card.dataset.speed);
            if (!card.dataset.baseSpeed) {
                card.dataset.baseSpeed = String(baseSpeed);
            }
            const effectiveSpeed = minusOne ? Math.max(0, baseSpeed - 1) : baseSpeed;
            card.dataset.speed = String(effectiveSpeed);

            const valEl = card.querySelector('.speed-card-val');
            if (valEl) {
                valEl.textContent = effectiveSpeed.toLocaleString();
            }

            // 選択中のカードの速度も即座に同期
            if (card.classList.contains('selected')) {
                if (REICHINS.state) {
                    REICHINS.state.encodeSpeedSeconds = effectiveSpeed;
                }
            }
        });
    }

    // スピードオプションカードのクリックイベント（即時＆DOM準備完了時バインド）
    function bindSpeedCardClicks() {
        document.querySelectorAll('.speed-option-card').forEach(card => {
            card.removeEventListener('click', card._clickHandler);
            card._clickHandler = () => selectSpeedCard(card);
            card.addEventListener('click', card._clickHandler);
        });
    }
    bindSpeedCardClicks();
    renderLogicGates();

    const speedHelpToggleBtn = document.getElementById('speedHelpToggleBtn');
    if (speedHelpToggleBtn) {
        speedHelpToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const content = document.getElementById('speedHelpContent');
            if (content) {
                content.classList.toggle('hidden');
            }
        });
    }

    const speedMinusOneToggle = document.getElementById('speedMinusOneToggle');
    if (speedMinusOneToggle) {
        speedMinusOneToggle.addEventListener('change', () => {
            updateSpeedCardsOffset(speedMinusOneToggle.checked);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        bindSpeedCardClicks();
        renderLogicGates();
    });

    function setDashboardStep(step) {
        dashboardCurrentStep = Math.max(1, Math.min(3, step));

        const speedHelpContent = document.getElementById('speedHelpContent');
        if (speedHelpContent) {
            speedHelpContent.classList.add('hidden');
        }

        const pages = [
            document.getElementById('dashPage1'),
            document.getElementById('dashPage2'),
            document.getElementById('dashPage3')
        ];
        pages.forEach((p, idx) => {
            if (!p) return;
            if (idx + 1 === dashboardCurrentStep) {
                p.classList.remove('hidden');
            } else {
                p.classList.add('hidden');
            }
        });

        // 1ページ目の「戻る」はグレーアウトされて押せない
        if (dashboardPrevBtn) {
            if (dashboardCurrentStep === 1) {
                dashboardPrevBtn.disabled = true;
                dashboardPrevBtn.className = 'px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-400 font-bold text-sm transition flex items-center gap-1.5 opacity-40 cursor-not-allowed';
            } else {
                dashboardPrevBtn.disabled = false;
                dashboardPrevBtn.className = 'px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-bold text-sm transition flex items-center gap-1.5 cursor-pointer';
            }
        }

        // 3ページ目の「次へ」はグレーアウトされて押せない
        if (dashboardNextBtn) {
            if (dashboardCurrentStep === 3) {
                dashboardNextBtn.disabled = true;
                dashboardNextBtn.className = 'px-6 py-2.5 rounded-xl bg-slate-300 text-slate-500 font-bold text-sm transition flex items-center gap-1.5 opacity-40 cursor-not-allowed shadow-none';
            } else {
                dashboardNextBtn.disabled = false;
                dashboardNextBtn.className = 'px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition flex items-center gap-1.5 cursor-pointer';
            }
        }

        // 右下のボタン「圧縮開始」は3ページ目で初めて表示される
        if (dashboardStartCompressBtn) {
            if (dashboardCurrentStep === 3) {
                dashboardStartCompressBtn.classList.remove('hidden');
            } else {
                dashboardStartCompressBtn.classList.add('hidden');
            }
        }

        // ステップ3に遷移した場合はスペック確認演出を開始
        if (dashboardCurrentStep === 3) {
            bindSpeedCardClicks();
            startSpecCheckAnimation();
        }

        updateDashboardStepperUI(dashboardCurrentStep);
    }

    function validateDashboardStep1() {
        // 1. チャンク構造および総ピクセル数の検証（2つのエラー）
        const memoryValid = typeof REICHINS.validateDashboardMemoryInputs === 'function'
            ? REICHINS.validateDashboardMemoryInputs()
            : true;

        // 2. 圧縮用コード入力の検証（3つ目のエラー）
        const entered = dashboardCodeInput ? dashboardCodeInput.value.trim() : '';
        const rawCode = REICHINS.state.compressionCode || '';
        const { removePos } = getFormatCodeRequirement();
        const expected = rawCode
            ? rawCode.slice(0, removePos - 1) + rawCode.slice(removePos)
            : '';

        let codeValid = true;
        if (!entered || !expected || entered !== expected) {
            codeValid = false;
            if (rawCode && entered === rawCode) {
                spawnCascadePopups();
                if (dashboardCodeError) {
                    dashboardCodeError.textContent = '圧縮用コードのメモリ展開検証に失敗しました。';
                    dashboardCodeError.classList.remove('hidden');
                }
            } else {
                if (dashboardCodeError) {
                    dashboardCodeError.textContent = '圧縮用コードを入力してください';
                    dashboardCodeError.classList.remove('hidden');
                }
            }
        } else {
            if (dashboardCodeError) {
                dashboardCodeError.classList.add('hidden');
            }
        }

        return memoryValid && codeValid;
    }

    function openDashboardModal() {
        clearCascadePopups();
        if (dashboardCodeInput) {
            dashboardCodeInput.value = '';
        }
        if (dashboardCodeError) {
            dashboardCodeError.textContent = '';
            dashboardCodeError.classList.add('hidden');
        }
        if (dashboardStep2Error) {
            dashboardStep2Error.classList.add('hidden');
        }
        // ステップ2の論理ゲート選択肢をランダム順にシャッフル生成
        renderLogicGates();

        if (REICHINS.state) {
            REICHINS.state.step2Agreed = false;
            REICHINS.state.encodeSpeedSeconds = 300;
        }
        const speedMinusOneToggle = document.getElementById('speedMinusOneToggle');
        if (speedMinusOneToggle) {
            speedMinusOneToggle.checked = false;
            updateSpeedCardsOffset(false);
        }
        // スピードカード初期化（300を選択）
        bindSpeedCardClicks();
        const defaultCard = document.querySelector('.speed-option-card[data-speed="300"]');
        if (defaultCard) {
            selectSpeedCard(defaultCard);
        }

        setDashboardStep(1);
        if (typeof REICHINS.renderDashboardMemoryView === 'function') {
            REICHINS.renderDashboardMemoryView();
        }
        if (compressionDashboardModal) {
            compressionDashboardModal.classList.remove('hidden');
        }
        ['dashMemPipelineLog', 'dashMemChunkList', 'dashMemDumpList'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.scrollTop = 0;
        });
    }

    if (dashboardCloseBtn) {
        dashboardCloseBtn.addEventListener('click', () => {
            clearCascadePopups();
            setDashboardStep(1);
            if (compressionDashboardModal) {
                compressionDashboardModal.classList.add('hidden');
            }
        });
    }

    if (dashboardPrevBtn) {
        dashboardPrevBtn.addEventListener('click', () => {
            if (dashboardCurrentStep > 1) {
                setDashboardStep(dashboardCurrentStep - 1);
            }
        });
    }

    if (dashboardNextBtn) {
        dashboardNextBtn.addEventListener('click', () => {
            if (dashboardCurrentStep === 1) {
                // 1ページ目の「次へ」を押す時点で3つのエラーを検証
                const isValid = validateDashboardStep1();
                if (!isValid) {
                    return;
                }
                clearCascadePopups();
                setDashboardStep(2);
            } else if (dashboardCurrentStep === 2) {
                // 2ページ目の「次へ」を押す時点で論理ゲートの選択を過不足なく検証
                const isValid = validateDashboardStep2();
                if (!isValid) {
                    return;
                }
                if (REICHINS.state) {
                    REICHINS.state.step2Agreed = true;
                }
                setDashboardStep(3);
            }
        });
    }

    if (dashboardStartCompressBtn) {
        dashboardStartCompressBtn.addEventListener('click', () => {
            if (dashboardCurrentStep !== 3) {
                return;
            }

            const isStep1Valid = validateDashboardStep1();
            if (!isStep1Valid) {
                setDashboardStep(1);
                return;
            }

            const isStep2Valid = validateDashboardStep2();
            if (!isStep2Valid) {
                setDashboardStep(2);
                return;
            }

            clearCascadePopups();
            if (dashboardCodeError) {
                dashboardCodeError.classList.add('hidden');
            }
            if (compressionDashboardModal) {
                compressionDashboardModal.classList.add('hidden');
            }
            if (compressionStartCard) {
                compressionStartCard.classList.add('hidden');
            }

            // 確認ダイアログを挟まず直接圧縮処理を開始！
            if (REICHINS.state.selectedFile && typeof REICHINS.processImage === 'function') {
                REICHINS.processImage(REICHINS.state.selectedFile);
            }
        });
    }

    function setPreviewFile(file, isDrop = false) {
        if (!file) return;

        revokePreviewUrl();
        clearCascadePopups();
        resetStartCardPosition();
        setDashboardStep(1);

        REICHINS.state.selectedFile = file;
        REICHINS.state.selectedFileIsDrop = Boolean(isDrop);
        REICHINS.state.compressionCode = generateCompressionCode(64);

        const summary = formatFileSummary(file);
        if (dropZonePreviewInfo) {
            dropZonePreviewInfo.textContent = summary;
        }
        if (compressionStartFileInfo) {
            compressionStartFileInfo.textContent = summary;
        }

        if (dropZonePrompt) dropZonePrompt.classList.add('hidden');
        if (dropZonePreview) dropZonePreview.classList.remove('hidden');
        setPreviewZonePadding(true);

        if (dropZonePreviewImage && dropZoneFileFallback) {
            dropZonePreviewImage.classList.add('hidden');
            dropZoneFileFallback.classList.add('hidden');

            const objectUrl = URL.createObjectURL(file);
            REICHINS.state.previewObjectUrl = objectUrl;

            dropZonePreviewImage.onload = () => {
                if (REICHINS.state.previewObjectUrl !== objectUrl) return;
                dropZonePreviewImage.classList.remove('hidden');
                dropZoneFileFallback.classList.add('hidden');
                if (dropZonePreviewInfo) {
                    const dims = `${dropZonePreviewImage.naturalWidth}×${dropZonePreviewImage.naturalHeight}`;
                    dropZonePreviewInfo.textContent = `${file.name} (${dims} · ${REICHINS.utils.formatBytes(file.size)})`;
                }
            };

            dropZonePreviewImage.onerror = () => {
                if (REICHINS.state.previewObjectUrl !== objectUrl) return;
                dropZonePreviewImage.classList.add('hidden');
                dropZoneFileFallback.classList.remove('hidden');
                if (dropZoneFallbackName) {
                    dropZoneFallbackName.textContent = file.name;
                }
            };

            dropZonePreviewImage.src = objectUrl;
        }

        if (compressionStartCard) {
            compressionStartCard.classList.remove('hidden');
        }
    }

    function clearPreview() {
        revokePreviewUrl();
        clearCascadePopups();
        resetStartCardPosition();
        setDashboardStep(1);

        REICHINS.state.selectedFile = null;
        REICHINS.state.selectedFileIsDrop = false;
        REICHINS.state.compressionCode = '';
        REICHINS.state.pendingFile = null;
        REICHINS.state.freeStockPendingFile = null;

        if (fileInput) {
            fileInput.value = '';
        }
        if (dropZonePreviewImage) {
            dropZonePreviewImage.onload = null;
            dropZonePreviewImage.onerror = null;
            dropZonePreviewImage.removeAttribute('src');
            dropZonePreviewImage.classList.add('hidden');
        }
        if (dropZoneFileFallback) {
            dropZoneFileFallback.classList.add('hidden');
        }
        if (dropZonePreviewInfo) {
            dropZonePreviewInfo.textContent = '';
        }
        if (compressionStartFileInfo) {
            compressionStartFileInfo.textContent = '';
        }
        if (dropZonePreview) {
            dropZonePreview.classList.add('hidden');
        }
        if (dropZonePrompt) {
            dropZonePrompt.classList.remove('hidden');
        }
        setPreviewZonePadding(false);

        if (compressionStartCard) {
            compressionStartCard.classList.add('hidden');
        }
    }

    function downloadSelectedFile() {
        const file = REICHINS.state.selectedFile;
        if (!file) return;

        const downloadUrl = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = file.name || 'image';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
            URL.revokeObjectURL(downloadUrl);
        }, 1000);
    }

    if (previewDownloadBtn) {
        previewDownloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            downloadSelectedFile();
        });
    }

    if (previewClearBtn) {
        previewClearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearPreview();
        });
    }

    REICHINS.imagePreview = {
        setPreviewFile,
        clearPreview,
        downloadSelectedFile,
        openDashboardModal,
        isCardMovedToTop: () => isMovedToTop,
        shouldSuppressStartClick: () => startSlider.shouldSuppressClick()
    };
})();
