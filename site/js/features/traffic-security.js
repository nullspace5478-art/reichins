(() => {
    const REICHINS = window.REICHINS = window.REICHINS || {};

    const trafficSecurityModal = document.getElementById('trafficSecurityModal');
    const humanTestNoticeBox = document.getElementById('humanTestNoticeBox');
    const humanTestStepStart = document.getElementById('humanTestStepStart');
    const humanTestStartHoldBtn = document.getElementById('humanTestStartHoldBtn');
    const humanTestStartProgress = document.getElementById('humanTestStartProgress');
    const humanTestStartHint = document.getElementById('humanTestStartHint');
    const humanTestStepCheck = document.getElementById('humanTestStepCheck');
    const humanTestCheckboxBtn = document.getElementById('humanTestCheckboxBtn');
    const humanTestCheckboxBox = document.getElementById('humanTestCheckboxBox');
    const humanTestStepChallenge = document.getElementById('humanTestStepChallenge');
    const humanTestRoundDisplay = document.getElementById('humanTestRoundDisplay');
    const humanTestTargetHex = document.getElementById('humanTestTargetHex');
    const humanTestColorGrid = document.getElementById('humanTestColorGrid');
    const humanTestErrorMsg = document.getElementById('humanTestErrorMsg');
    const humanTestRefreshBtn = document.getElementById('humanTestRefreshBtn');
    const humanTestVerifyBtn = document.getElementById('humanTestVerifyBtn');
    const humanTestStepSuccess = document.getElementById('humanTestStepSuccess');
    const trafficSuccessCloseBtn = document.getElementById('trafficSuccessCloseBtn');
    const trafficSuccessRetryBtn = document.getElementById('trafficSuccessRetryBtn');
    const trafficSuccessSaveCloseBtn = document.getElementById('trafficSuccessSaveCloseBtn');

    const REQUIRED_CONSECUTIVE_MISSES = 3;
    const GRID_SIZE = 9;
    const START_HOLD_DURATION_MS = 3000;

    let wrongStreak = 0;
    let selectedTileIndex = null;
    let correctTileIndex = -1;
    let currentTargetHex = '#3298F8';
    let isCheckingCheckbox = false;
    let startHoldTimer = null;
    let startHoldBeginAt = null;

    function clampByte(n) {
        return Math.max(0, Math.min(255, Math.round(n)));
    }

    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(v => clampByte(v).toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    function colorDistance(c1, c2) {
        const dr = c1.r - c2.r;
        const dg = c1.g - c2.g;
        const db = c1.b - c2.b;
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    function generateColorRound() {
        selectedTileIndex = null;

        const targetRgb = {
            r: Math.floor(Math.random() * 256),
            g: Math.floor(Math.random() * 256),
            b: Math.floor(Math.random() * 256)
        };
        currentTargetHex = rgbToHex(targetRgb.r, targetRgb.g, targetRgb.b);

        const usedColors = [targetRgb];
        const usedHexSet = new Set([currentTargetHex]);
        const distractors = [];

        // 4色は目標に近い色相・明度の紛らわしい色、残りは幅広いランダム色を生成
        let attempts = 0;
        while (distractors.length < GRID_SIZE - 1 && attempts < 500) {
            attempts++;
            let candidate;
            if (distractors.length < 4) {
                const spread = 75;
                candidate = {
                    r: clampByte(targetRgb.r + (Math.random() * 2 - 1) * spread),
                    g: clampByte(targetRgb.g + (Math.random() * 2 - 1) * spread),
                    b: clampByte(targetRgb.b + (Math.random() * 2 - 1) * spread)
                };
            } else {
                candidate = {
                    r: Math.floor(Math.random() * 256),
                    g: Math.floor(Math.random() * 256),
                    b: Math.floor(Math.random() * 256)
                };
            }

            const hex = rgbToHex(candidate.r, candidate.g, candidate.b);
            if (usedHexSet.has(hex)) continue;

            const tooClose = usedColors.some(existing => colorDistance(existing, candidate) < 22);
            if (tooClose) continue;

            usedColors.push(candidate);
            usedHexSet.add(hex);
            distractors.push(hex);
        }

        // 万一不足した場合のフォールバック
        while (distractors.length < GRID_SIZE - 1) {
            const candidate = {
                r: Math.floor(Math.random() * 256),
                g: Math.floor(Math.random() * 256),
                b: Math.floor(Math.random() * 256)
            };
            const hex = rgbToHex(candidate.r, candidate.g, candidate.b);
            if (!usedHexSet.has(hex)) {
                usedHexSet.add(hex);
                distractors.push(hex);
            }
        }

        correctTileIndex = Math.floor(Math.random() * GRID_SIZE);
        const palette = [];
        let distractorCursor = 0;
        for (let i = 0; i < GRID_SIZE; i++) {
            if (i === correctTileIndex) {
                palette.push(currentTargetHex);
            } else {
                palette.push(distractors[distractorCursor++]);
            }
        }

        humanTestRoundDisplay.textContent = String(wrongStreak + 1);
        humanTestTargetHex.textContent = currentTargetHex;
        renderColorGrid(palette);
    }

    function renderColorGrid(palette) {
        humanTestColorGrid.innerHTML = '';

        palette.forEach((hex, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'aspect-square rounded-md relative cursor-pointer transition-all duration-100 border-2 border-white shadow-xs hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-400';
            btn.style.backgroundColor = hex;
            btn.setAttribute('aria-label', `色パネル ${index + 1}`);

            const checkBadge = document.createElement('span');
            checkBadge.className = 'hidden absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center shadow-sm';
            checkBadge.innerHTML = '<i class="fa-solid fa-check"></i>';
            btn.appendChild(checkBadge);

            btn.addEventListener('click', () => {
                selectedTileIndex = index;
                humanTestErrorMsg.classList.add('hidden');
                humanTestErrorMsg.textContent = '';

                Array.from(humanTestColorGrid.children).forEach((child, childIdx) => {
                    const badge = child.querySelector('span');
                    if (childIdx === index) {
                        child.classList.add('scale-[0.93]', 'ring-2', 'ring-blue-600');
                        if (badge) badge.classList.remove('hidden');
                    } else {
                        child.classList.remove('scale-[0.93]', 'ring-2', 'ring-blue-600');
                        if (badge) badge.classList.add('hidden');
                    }
                });
            });

            humanTestColorGrid.appendChild(btn);
        });
    }

    function cancelStartHold(showHint = false) {
        if (startHoldTimer) {
            clearInterval(startHoldTimer);
            startHoldTimer = null;
        }
        startHoldBeginAt = null;
        humanTestStartProgress.style.width = '0%';
        if (showHint && !humanTestStepStart.classList.contains('hidden')) {
            humanTestStartHint.classList.remove('hidden');
        }
    }

    function resetTrafficModalState() {
        cancelStartHold(false);
        wrongStreak = 0;
        selectedTileIndex = null;
        correctTileIndex = -1;
        isCheckingCheckbox = false;

        humanTestNoticeBox.classList.remove('hidden');
        humanTestStepStart.classList.remove('hidden');
        humanTestStartHint.classList.add('hidden');
        humanTestStepCheck.classList.add('hidden');
        humanTestStepChallenge.classList.add('hidden');
        humanTestStepSuccess.classList.add('hidden');

        humanTestCheckboxBtn.disabled = false;
        humanTestCheckboxBox.innerHTML = '';
        humanTestCheckboxBox.classList.remove('border-blue-600');
        humanTestCheckboxBox.classList.add('border-slate-300');

        humanTestErrorMsg.classList.add('hidden');
        humanTestErrorMsg.textContent = '';
    }

    // 「認証を開始」ボタンの3秒長押しで「私は人間ではありません」を表示
    function beginStartHold(e) {
        if (e.type === 'mousedown' && e.button !== 0) return;
        e.preventDefault();
        if (startHoldTimer) return;

        startHoldBeginAt = Date.now();
        humanTestStartProgress.style.width = '0%';

        startHoldTimer = setInterval(() => {
            const elapsed = Date.now() - startHoldBeginAt;
            const progress = Math.min(1, elapsed / START_HOLD_DURATION_MS);
            humanTestStartProgress.style.width = `${progress * 100}%`;

            if (elapsed >= START_HOLD_DURATION_MS) {
                cancelStartHold(false);
                humanTestStepStart.classList.add('hidden');
                humanTestStepCheck.classList.remove('hidden');
            }
        }, 30);
    }

    humanTestStartHoldBtn.addEventListener('mousedown', beginStartHold);
    humanTestStartHoldBtn.addEventListener('mouseup', () => cancelStartHold(true));
    humanTestStartHoldBtn.addEventListener('mouseleave', () => cancelStartHold(false));

    humanTestStartHoldBtn.addEventListener('touchstart', beginStartHold, { passive: false });
    humanTestStartHoldBtn.addEventListener('touchend', () => cancelStartHold(true));
    humanTestStartHoldBtn.addEventListener('touchcancel', () => cancelStartHold(false));

    // 高速切り替え検出時に通常のポップアップを表示
    function triggerTrafficWarningSequence(radioToHold) {
        if (!trafficSecurityModal.classList.contains('hidden')) return;

        const state = REICHINS.state;
        state.trafficPendingRadio = radioToHold;

        // 一旦表示上の選択を直前の状態に戻す
        if (state.previousRadioChecked && state.previousRadioChecked !== radioToHold) {
            state.previousRadioChecked.checked = true;
            REICHINS.applyRadioSelection(state.previousRadioChecked);
        }

        resetTrafficModalState();
        trafficSecurityModal.classList.remove('hidden');
        setTimeout(() => {
            trafficSecurityModal.classList.remove('opacity-0');
        }, 15);
    }

    // 「私は人間ではありません」チェックボックスのクリック
    humanTestCheckboxBtn.addEventListener('click', () => {
        if (isCheckingCheckbox) return;
        isCheckingCheckbox = true;
        humanTestCheckboxBtn.disabled = true;
        humanTestCheckboxBox.classList.remove('border-slate-300');
        humanTestCheckboxBox.classList.add('border-blue-600');
        humanTestCheckboxBox.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-sm"></i>';

        setTimeout(() => {
            wrongStreak = 0;
            generateColorRound();
            humanTestStepCheck.classList.add('hidden');
            humanTestStepChallenge.classList.remove('hidden');
            isCheckingCheckbox = false;
        }, 450);
    });

    // 問題の更新ボタン
    humanTestRefreshBtn.addEventListener('click', () => {
        humanTestErrorMsg.classList.add('hidden');
        humanTestErrorMsg.textContent = '';
        generateColorRound();
    });

    // 選択した色の確認ボタン
    humanTestVerifyBtn.addEventListener('click', () => {
        if (selectedTileIndex === null) {
            humanTestErrorMsg.textContent = '色のパネルを1つ選択してから「確認」を押してください。';
            humanTestErrorMsg.classList.remove('hidden');
            return;
        }

        if (selectedTileIndex === correctTileIndex) {
            // 1問でも正解するとやり直し
            const matchedHex = currentTargetHex;
            wrongStreak = 0;
            generateColorRound();
            humanTestErrorMsg.textContent = `正解のカラー（${matchedHex}）を選びました。人間には色の違いを見分けることはできないため、最初からやり直しになります。`;
            humanTestErrorMsg.classList.remove('hidden');
            return;
        }

        // 外れた場合：連続不正解数を加算
        wrongStreak += 1;
        humanTestErrorMsg.classList.add('hidden');
        humanTestErrorMsg.textContent = '';

        if (wrongStreak >= REQUIRED_CONSECUTIVE_MISSES) {
            // 3問連続で外すと人間扱いで合格
            humanTestNoticeBox.classList.add('hidden');
            humanTestStepChallenge.classList.add('hidden');
            humanTestStepSuccess.classList.remove('hidden');
            return;
        }

        generateColorRound();
    });

    function closeTrafficModal({ saveResult }) {
        const state = REICHINS.state;

        trafficSecurityModal.classList.add('opacity-0');
        setTimeout(() => {
            trafficSecurityModal.classList.add('hidden');
        }, 150);

        if (saveResult) {
            // リロードされるまで高速操作による再表示を抑止
            state.trafficPermanentlyDisabled = true;
        }

        state.optionSwitchTimestamps = [];

        if (state.trafficPendingRadio) {
            REICHINS.applyRadioSelection(state.trafficPendingRadio);
            state.trafficPendingRadio = null;
        }
    }

    // 合格後: 「閉じる」（再度高速操作すると再表示される）
    trafficSuccessCloseBtn.addEventListener('click', () => {
        closeTrafficModal({ saveResult: false });
    });

    // 合格後: 「もう1回認証する」
    trafficSuccessRetryBtn.addEventListener('click', () => {
        resetTrafficModalState();
    });

    // 合格後: 「結果を保存して閉じる」（リロードするまで再表示されない）
    trafficSuccessSaveCloseBtn.addEventListener('click', () => {
        closeTrafficModal({ saveResult: true });
    });

    REICHINS.triggerTrafficWarningSequence = triggerTrafficWarningSequence;
})();
