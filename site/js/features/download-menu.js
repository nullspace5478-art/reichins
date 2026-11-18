(() => {
    const REICHINS = window.REICHINS = window.REICHINS || {};

    // 1. 画像圧縮結果画面の画像部分の右クリック防止
    function setupImageProtection() {
        const previewContainer = document.getElementById('previewContainer') || document.getElementById('previewImage')?.parentElement;
        if (previewContainer) {
            previewContainer.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                return false;
            });
            previewContainer.addEventListener('dragstart', (e) => {
                e.preventDefault();
                return false;
            });
        }
        const previewImage = document.getElementById('previewImage');
        if (previewImage) {
            previewImage.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                return false;
            });
            previewImage.addEventListener('dragstart', (e) => {
                e.preventDefault();
                return false;
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupImageProtection);
    } else {
        setupImageProtection();
    }

    // 2. DOM要素の取得
    const downloadMenuModal = document.getElementById('downloadMenuModal');
    const downloadMenuCloseBtn = document.getElementById('downloadMenuCloseBtn');
    const downloadMenuCancelBtn = document.getElementById('downloadMenuCancelBtn');

    const desiredFileNameInput = document.getElementById('desiredFileNameInput');
    const fileNameCharCount = document.getElementById('fileNameCharCount');
    const fileNameError = document.getElementById('fileNameError');
    const fileNameErrorText = document.getElementById('fileNameErrorText');

    const nameRealizeRateSlider = document.getElementById('nameRealizeRateSlider');
    const nameRealizeRateDisplay = document.getElementById('nameRealizeRateDisplay');

    const desiredFileExtInput = document.getElementById('desiredFileExtInput');
    const fileExtError = document.getElementById('fileExtError');
    const fileExtErrorText = document.getElementById('fileExtErrorText');

    const extRealizeRateSlider = document.getElementById('extRealizeRateSlider');
    const extRealizeRateDisplay = document.getElementById('extRealizeRateDisplay');

    // 予約ダウンロード関連DOM
    const scheduleDownloadToggle = document.getElementById('scheduleDownloadToggle');
    const scheduleTimeContainer = document.getElementById('scheduleTimeContainer');
    const scheduleYear = document.getElementById('scheduleYear');
    const scheduleMonth = document.getElementById('scheduleMonth');
    const scheduleDay = document.getElementById('scheduleDay');
    const scheduleHour = document.getElementById('scheduleHour');
    const scheduleMinute = document.getElementById('scheduleMinute');
    const scheduleSecond = document.getElementById('scheduleSecond');
    const scheduleTimeError = document.getElementById('scheduleTimeError');
    const scheduleTimeErrorText = document.getElementById('scheduleTimeErrorText');

    // 予約待機モーダルDOM
    const scheduleWaitModal = document.getElementById('scheduleWaitModal');
    const scheduleWaitTargetText = document.getElementById('scheduleWaitTargetText');
    const scheduleWaitRemainingText = document.getElementById('scheduleWaitRemainingText');

    const downloadMenuSubmitBtn = document.getElementById('downloadMenuSubmitBtn');

    // 前提確認ダイアログDOM（第1確認: 12秒自動キャンセル & 入力必須）
    const downloadIntentModal = document.getElementById('downloadIntentModal');
    const downloadIntentInput = document.getElementById('downloadIntentInput');
    const downloadIntentError = document.getElementById('downloadIntentError');
    const downloadIntentErrorText = document.getElementById('downloadIntentErrorText');
    const intentTimerBar = document.getElementById('intentTimerBar');
    const intentTimerDisplay = document.getElementById('intentTimerDisplay');
    const downloadIntentConfirmBtn = document.getElementById('downloadIntentConfirmBtn');

    // ダウンロード確認ダイアログDOM（第2確認: 自動キャンセルなし、続行のみ、閉じるボタンあり）
    const downloadConfirmModal = document.getElementById('downloadConfirmModal');
    const downloadConfirmCloseBtn = document.getElementById('downloadConfirmCloseBtn');
    const confirmFileSizeDisplay = document.getElementById('confirmFileSizeDisplay');
    const downloadConfirmOkBtn = document.getElementById('downloadConfirmOkBtn');

    // 完了ダイアログDOM
    const downloadCompleteModal = document.getElementById('downloadCompleteModal');
    const completeFileNameDisplay = document.getElementById('completeFileNameDisplay');
    const copyCompleteFileNameBtn = document.getElementById('copyCompleteFileNameBtn');
    const downloadCompleteCloseBtn = document.getElementById('downloadCompleteCloseBtn');
    const downloadSpeedInput = document.getElementById('downloadSpeedInput');

    if (copyCompleteFileNameBtn) {
        copyCompleteFileNameBtn.addEventListener('click', async () => {
            const textToCopy = (REICHINS.state && REICHINS.state.lastDownloadedFileName)
                || (completeFileNameDisplay ? completeFileNameDisplay.textContent.trim() : '');
            if (!textToCopy) return;

            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(textToCopy);
                } else {
                    const ta = document.createElement('textarea');
                    ta.value = textToCopy;
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    ta.remove();
                }
                const originalHtml = copyCompleteFileNameBtn.innerHTML;
                copyCompleteFileNameBtn.innerHTML = '<i class="fa-solid fa-check text-emerald-600"></i><span class="text-emerald-600">コピー完了</span>';
                setTimeout(() => {
                    copyCompleteFileNameBtn.innerHTML = originalHtml;
                }, 1500);
            } catch (err) {
                console.error('Failed to copy filename: ', err);
            }
        });
    }

    function getBaseDownloadSpeed() {
        if (downloadSpeedInput) {
            const val = parseInt(downloadSpeedInput.value, 10);
            if (!isNaN(val)) {
                return Math.min(104857600, Math.max(1, val));
            }
        }
        if (typeof REICHINS.state?.downloadSpeed === 'number') {
            return Math.min(104857600, Math.max(1, REICHINS.state.downloadSpeed));
        }
        return 100;
    }

    if (downloadSpeedInput) {
        const normalizeSpeed = () => {
            let val = parseInt(downloadSpeedInput.value, 10);
            if (isNaN(val) || val < 1) {
                val = 1;
            } else if (val > 104857600) {
                val = 104857600;
            }
            downloadSpeedInput.value = val;
            if (REICHINS.state) {
                REICHINS.state.downloadSpeed = val;
            }
            if (typeof REICHINS.autoSaveIfPersisted === 'function') {
                REICHINS.autoSaveIfPersisted();
            }
        };
        downloadSpeedInput.addEventListener('change', normalizeSpeed);
        downloadSpeedInput.addEventListener('blur', normalizeSpeed);
    }

    let pendingDownloadConfig = null;
    let scheduleWaitInterval = null;
    let intentAnimFrame = null;

    function syncScrollLock() {
        if (typeof REICHINS.utils?.syncModalScrollLock === 'function') {
            REICHINS.utils.syncModalScrollLock();
        }
    }

    // エラー表示リセット
    function clearErrors() {
        if (fileNameError) {
            fileNameError.classList.add('hidden');
            fileNameError.classList.remove('flex');
        }
        if (fileExtError) {
            fileExtError.classList.add('hidden');
            fileExtError.classList.remove('flex');
        }
        if (scheduleTimeError) {
            scheduleTimeError.classList.add('hidden');
            scheduleTimeError.classList.remove('flex');
        }
        if (downloadIntentError) {
            downloadIntentError.classList.add('hidden');
            downloadIntentError.classList.remove('flex');
        }
    }

    function showFileNameError(msg) {
        if (fileNameErrorText && fileNameError) {
            fileNameErrorText.textContent = msg;
            fileNameError.classList.remove('hidden');
            fileNameError.classList.add('flex');
        }
    }

    function showFileExtError(msg) {
        if (fileExtErrorText && fileExtError) {
            fileExtErrorText.textContent = msg;
            fileExtError.classList.remove('hidden');
            fileExtError.classList.add('flex');
        }
    }

    function showScheduleTimeError(msg) {
        if (scheduleTimeErrorText && scheduleTimeError) {
            scheduleTimeErrorText.textContent = msg;
            scheduleTimeError.classList.remove('hidden');
            scheduleTimeError.classList.add('flex');
        }
    }

    // ダウンロードメニューを開く
    function openDownloadMenu() {
        clearErrors();

        if (desiredFileNameInput) desiredFileNameInput.value = '';
        if (fileNameCharCount) {
            fileNameCharCount.textContent = '0 / 24文字以上';
            fileNameCharCount.classList.remove('text-emerald-600', 'font-semibold');
            fileNameCharCount.classList.add('text-slate-400');
        }

        if (desiredFileExtInput) desiredFileExtInput.value = '';

        if (nameRealizeRateSlider) nameRealizeRateSlider.value = '50';
        if (extRealizeRateSlider) extRealizeRateSlider.value = '50';
        if (nameRealizeRateDisplay) nameRealizeRateDisplay.textContent = '50%';
        if (extRealizeRateDisplay) extRealizeRateDisplay.textContent = '50%';

        if (scheduleDownloadToggle) {
            scheduleDownloadToggle.checked = false;
        }
        if (scheduleTimeContainer) {
            scheduleTimeContainer.classList.add('hidden');
        }

        // デフォルトは3000年の1月1日0時0分0秒
        if (scheduleYear) scheduleYear.value = '3000';
        if (scheduleMonth) scheduleMonth.value = '1';
        if (scheduleDay) scheduleDay.value = '1';
        if (scheduleHour) scheduleHour.value = '0';
        if (scheduleMinute) scheduleMinute.value = '0';
        if (scheduleSecond) scheduleSecond.value = '0';

        if (downloadMenuModal) {
            downloadMenuModal.classList.remove('hidden');
        }
        syncScrollLock();
    }

    function closeDownloadMenu() {
        if (downloadMenuModal) {
            downloadMenuModal.classList.add('hidden');
        }
        syncScrollLock();
    }

    function clearIntentTimer() {
        if (intentAnimFrame) {
            cancelAnimationFrame(intentAnimFrame);
            intentAnimFrame = null;
        }
    }

    function closeIntentModal() {
        clearIntentTimer();
        if (downloadIntentModal) {
            downloadIntentModal.classList.add('hidden');
        }
        pendingDownloadConfig = null;
        syncScrollLock();
    }

    function closeConfirmModal() {
        if (downloadConfirmModal) {
            downloadConfirmModal.classList.add('hidden');
        }
        pendingDownloadConfig = null;
        syncScrollLock();
    }

    function closeCompleteModal() {
        if (downloadCompleteModal) {
            downloadCompleteModal.classList.add('hidden');
        }
        syncScrollLock();
        const completedView = document.getElementById('completedView');
        if (completedView) {
            completedView.classList.remove('hidden');
        }
    }

    // スライダー連動
    if (nameRealizeRateSlider && nameRealizeRateDisplay) {
        nameRealizeRateSlider.addEventListener('input', () => {
            nameRealizeRateDisplay.textContent = `${nameRealizeRateSlider.value}%`;
        });
    }

    if (extRealizeRateSlider && extRealizeRateDisplay) {
        extRealizeRateSlider.addEventListener('input', () => {
            extRealizeRateDisplay.textContent = `${extRealizeRateSlider.value}%`;
        });
    }

    // 予約ダウンロードトグル連動
    if (scheduleDownloadToggle) {
        scheduleDownloadToggle.addEventListener('change', () => {
            if (scheduleDownloadToggle.checked) {
                if (scheduleTimeContainer) {
                    scheduleTimeContainer.classList.remove('hidden');
                }
            } else {
                if (scheduleTimeContainer) {
                    scheduleTimeContainer.classList.add('hidden');
                }
                if (scheduleTimeError) {
                    scheduleTimeError.classList.add('hidden');
                    scheduleTimeError.classList.remove('flex');
                }
            }
        });
    }

    // 希望ファイル名リアルタイム文字数カウント
    if (desiredFileNameInput && fileNameCharCount) {
        desiredFileNameInput.addEventListener('input', () => {
            const len = desiredFileNameInput.value.length;
            fileNameCharCount.textContent = `${len} / 24文字以上`;
            if (len >= 24) {
                fileNameCharCount.classList.add('text-emerald-600', 'font-semibold');
                fileNameCharCount.classList.remove('text-slate-400');
            } else {
                fileNameCharCount.classList.remove('text-emerald-600', 'font-semibold');
                fileNameCharCount.classList.add('text-slate-400');
            }
        });
    }

    // 閉じる・キャンセルボタン
    if (downloadMenuCloseBtn) downloadMenuCloseBtn.addEventListener('click', closeDownloadMenu);
    if (downloadMenuCancelBtn) downloadMenuCancelBtn.addEventListener('click', closeDownloadMenu);

    if (downloadCompleteCloseBtn) {
        downloadCompleteCloseBtn.addEventListener('click', closeCompleteModal);
    }

    // ランダム文字列生成（大文字小文字数字記号を混ぜた文字列）
    function getRandomCharString(len) {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-!@#$%^&=+';
        let res = '';
        const randomVals = new Uint32Array(len);
        crypto.getRandomValues(randomVals);
        for (let i = 0; i < len; i++) {
            res += chars[randomVals[i] % chars.length];
        }
        return res;
    }

    // 第1確認モーダルを表示（12秒自動キャンセル機能 & 「本当に画像のダウンロードを行います」入力必須）
    function showIntentModal() {
        if (!pendingDownloadConfig) return;

        if (downloadIntentInput) {
            downloadIntentInput.value = '';
        }
        if (downloadIntentError) {
            downloadIntentError.classList.add('hidden');
            downloadIntentError.classList.remove('flex');
        }

        if (downloadIntentModal) {
            downloadIntentModal.classList.remove('hidden');
        }
        syncScrollLock();

        clearIntentTimer();

        // 12秒（12000ms）カウントダウン
        const durationMs = 12000;
        const startTime = performance.now();

        if (intentTimerBar) intentTimerBar.style.width = '100%';
        if (intentTimerDisplay) intentTimerDisplay.textContent = '12.0';

        function tickIntentTimer() {
            const elapsed = performance.now() - startTime;
            const remaining = Math.max(0, durationMs - elapsed);
            const pct = (remaining / durationMs) * 100;

            if (intentTimerBar) {
                intentTimerBar.style.width = `${pct}%`;
            }
            if (intentTimerDisplay) {
                intentTimerDisplay.textContent = (remaining / 1000).toFixed(1);
            }

            if (elapsed >= durationMs) {
                // 12秒経過：自動キャンセルして圧縮結果の画面に戻る（モーダルを閉じる）
                closeIntentModal();
            } else {
                intentAnimFrame = requestAnimationFrame(tickIntentTimer);
            }
        }

        intentAnimFrame = requestAnimationFrame(tickIntentTimer);

        // 入力欄にフォーカス
        setTimeout(() => {
            if (downloadIntentInput) downloadIntentInput.focus();
        }, 50);
    }

    // 第1確認モーダルの確定ボタン押下時
    if (downloadIntentConfirmBtn) {
        downloadIntentConfirmBtn.addEventListener('click', () => {
            const val = (downloadIntentInput ? downloadIntentInput.value : '').trim();
            if (val !== '本当に画像のダウンロードを行います') {
                if (downloadIntentErrorText && downloadIntentError) {
                    downloadIntentErrorText.textContent = '「本当に画像のダウンロードを行います」と正確に入力してください。';
                    downloadIntentError.classList.remove('hidden');
                    downloadIntentError.classList.add('flex');
                }
                return;
            }

            // 正確に入力されたら第1モーダルのタイマーをクリアして第2確認モーダルを表示
            clearIntentTimer();
            if (downloadIntentModal) {
                downloadIntentModal.classList.add('hidden');
            }
            showConfirmModal();
        });
    }

    if (downloadIntentInput) {
        downloadIntentInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (downloadIntentConfirmBtn) {
                    downloadIntentConfirmBtn.click();
                }
            }
        });
    }

    // 第2確認モーダルを表示（自動キャンセルなし、続行のみ）
    function showConfirmModal() {
        if (!pendingDownloadConfig) return;
        const blob = pendingDownloadConfig.blob;
        const sizeStr = blob
            ? `${REICHINS.utils.formatBytes(blob.size)} (${blob.size.toLocaleString()} Bytes)`
            : '0 Bytes';

        if (confirmFileSizeDisplay) {
            confirmFileSizeDisplay.textContent = sizeStr;
        }

        if (downloadConfirmModal) {
            downloadConfirmModal.classList.remove('hidden');
        }
        syncScrollLock();
    }

    // ダウンロードメニュー内の「ダウンロード」ボタン押下時
    if (downloadMenuSubmitBtn) {
        downloadMenuSubmitBtn.addEventListener('click', () => {
            clearErrors();
            let isValid = true;

            // 1. 希望ファイル名バリデーション
            const rawName = (desiredFileNameInput ? desiredFileNameInput.value : '').trim();
            if (!rawName) {
                showFileNameError('希望ファイル名を入力してください。');
                isValid = false;
            } else if (rawName.length < 24) {
                showFileNameError(`希望ファイル名は24文字以上必須です（現在: ${rawName.length}文字）。`);
                isValid = false;
            } else if (/[\\/:*?"<>|]/.test(rawName)) {
                showFileNameError('ファイル名に使用できない文字（\\ / : * ? " < > |）が含まれています。');
                isValid = false;
            } else if (!/(1343|1400|1428)/.test(rawName)) {
                showFileNameError('当ツールの制作者が好きな数を含めてください。');
                isValid = false;
            }

            // 2. 希望拡張子バリデーション
            const rawExt = (desiredFileExtInput ? desiredFileExtInput.value : '').trim();
            if (!rawExt) {
                showFileExtError('希望拡張子を入力してください。');
                isValid = false;
            } else if (!rawExt.startsWith('.')) {
                showFileExtError('希望拡張子は先頭に「.」（ドット）を入力してください（例: .mp4）。');
                isValid = false;
            } else if (!/^\.[a-zA-Z0-9_\-]+$/.test(rawExt)) {
                showFileExtError('有効な拡張子の形式を入力してください（例: .mp4）。');
                isValid = false;
            }

            // 3. 予約ダウンロードのバリデーション
            const isScheduleEnabled = scheduleDownloadToggle && scheduleDownloadToggle.checked;
            let targetTimestamp = null;
            let targetDisplayString = '';

            if (isScheduleEnabled) {
                const y = parseInt(scheduleYear ? scheduleYear.value : '', 10);
                const m = parseInt(scheduleMonth ? scheduleMonth.value : '', 10);
                const d = parseInt(scheduleDay ? scheduleDay.value : '', 10);
                const h = parseInt(scheduleHour ? scheduleHour.value : '', 10);
                const min = parseInt(scheduleMinute ? scheduleMinute.value : '', 10);
                const s = parseInt(scheduleSecond ? scheduleSecond.value : '', 10);

                if (isNaN(y) || isNaN(m) || isNaN(d) || isNaN(h) || isNaN(min) || isNaN(s)) {
                    showScheduleTimeError('予約時刻の各項目をすべて半角数字で正しく入力してください。');
                    isValid = false;
                } else if (y < 1 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31 || h < 0 || h > 23 || min < 0 || min > 59 || s < 0 || s > 59) {
                    showScheduleTimeError('予約時刻に無効な数値が入力されています。');
                    isValid = false;
                } else {
                    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
                    if (d > daysInMonth) {
                        showScheduleTimeError(`${m}月は${daysInMonth}日までしか存在しません。`);
                        isValid = false;
                    } else {
                        // モスクワ時間 (UTC+3) として解釈（UTCでは h - 3 時間）
                        const targetDate = new Date(Date.UTC(y, m - 1, d, h - 3, min, s));
                        if (y >= 0 && y <= 99) {
                            targetDate.setUTCFullYear(y);
                        }
                        targetTimestamp = targetDate.getTime();
                        const now = Date.now();

                        // 現在より未来である必要があり、1秒でも過去ならエラー
                        if (targetTimestamp <= now) {
                            showScheduleTimeError('予約時刻は現在より未来の日時を指定してください。');
                            isValid = false;
                        } else {
                            targetDisplayString = `${y}年${String(m).padStart(2, '0')}月${String(d).padStart(2, '0')}日${String(h).padStart(2, '0')}時${String(min).padStart(2, '0')}分${String(s).padStart(2, '0')}秒`;
                        }
                    }
                }
            }

            if (!isValid) return;

            // 希望実現率の判定
            const nameRate = parseInt(nameRealizeRateSlider.value, 10);
            const extRate = parseInt(extRealizeRateSlider.value, 10);

            const isNameRealized = (Math.random() * 100) < nameRate;
            const isExtRealized = (Math.random() * 100) < extRate;

            // 希望実現ペナルティ（一方でも実現すると35%低下 = 0.65倍）
            const isSpeedReduced = isNameRealized || isExtRealized;

            // 速度計算（他の低下率と乗算）
            let speedMultiplier = 1.0;
            if (isSpeedReduced) {
                speedMultiplier *= 0.65; // 35%低下
            }
            // 予約無効の場合、ダウンロード速度を90%低下（0.10倍）
            if (!isScheduleEnabled) {
                speedMultiplier *= 0.10; // 90%低下
            }

            // ダウンロード速度はいかなる場合でも1B/sを下回らないように計算に制限（四捨五入）
            const baseSpeed = getBaseDownloadSpeed();
            let speedBytesPerSec = Math.max(1, Math.round(baseSpeed * speedMultiplier));

            // 最終ファイル名の決定
            const finalNamePart = isNameRealized ? rawName : getRandomCharString(24);
            const finalExtPart = isExtRealized ? rawExt : '.' + getRandomCharString(12);
            const finalFileName = `${finalNamePart}${finalExtPart}`;

            const blob = REICHINS.state.lastOutputBlob;

            pendingDownloadConfig = {
                blob,
                fileName: finalFileName,
                speedBytesPerSec
            };

            closeDownloadMenu();

            if (isScheduleEnabled && targetTimestamp) {
                // 予約待機モーダルを表示
                if (scheduleWaitTargetText) {
                    scheduleWaitTargetText.textContent = `${targetDisplayString}を待っています`;
                }

                if (scheduleWaitModal) {
                    scheduleWaitModal.classList.remove('hidden');
                }
                syncScrollLock();

                if (scheduleWaitInterval) {
                    clearInterval(scheduleWaitInterval);
                }

                function updateWaitCountdown() {
                    const now = Date.now();
                    const diffSec = Math.max(0, Math.ceil((targetTimestamp - now) / 1000));
                    if (scheduleWaitRemainingText) {
                        scheduleWaitRemainingText.textContent = `残り${diffSec}秒`;
                    }

                    if (now >= targetTimestamp) {
                        clearInterval(scheduleWaitInterval);
                        scheduleWaitInterval = null;
                        if (scheduleWaitModal) {
                            scheduleWaitModal.classList.add('hidden');
                        }
                        syncScrollLock();
                        // 待機時間終了後、第1確認モーダルを表示
                        showIntentModal();
                    }
                }

                updateWaitCountdown();
                scheduleWaitInterval = setInterval(updateWaitCountdown, 250);
            } else {
                // 予約無効の場合は即座に第1確認モーダルを表示
                showIntentModal();
            }
        });
    }

    // 第2確認ダイアログの「閉じる」ボタン押下時
    if (downloadConfirmCloseBtn) {
        downloadConfirmCloseBtn.addEventListener('click', () => {
            closeConfirmModal();
        });
    }

    // 第2確認ダイアログの「続行」ボタン押下時
    if (downloadConfirmOkBtn) {
        downloadConfirmOkBtn.addEventListener('click', () => {
            const config = pendingDownloadConfig;
            closeConfirmModal();
            if (config && config.blob) {
                startStreamDownload(config);
            }
        });
    }

    // StreamAPIを使ったダウンロード処理と進捗画面
    async function startStreamDownload({ blob, fileName, speedBytesPerSec }) {
        const completedView = document.getElementById('completedView');
        const downloadProgressView = document.getElementById('downloadProgressView');
        const downloadTargetFileName = document.getElementById('downloadTargetFileName');
        const downloadProgressBar = document.getElementById('downloadProgressBar');
        const downloadBytesProgress = document.getElementById('downloadBytesProgress');
        const downloadPercent = document.getElementById('downloadPercent');
        const downloadSpeedDisplay = document.getElementById('downloadSpeedDisplay');
        const downloadRemainingDisplay = document.getElementById('downloadRemainingDisplay');
        const downloadCancelBtn = document.getElementById('downloadCancelBtn');

        if (!downloadProgressView || !completedView) return;

        completedView.classList.add('hidden');
        downloadProgressView.classList.remove('hidden');

        if (downloadTargetFileName) downloadTargetFileName.textContent = fileName;
        if (downloadProgressBar) downloadProgressBar.style.width = '0%';
        if (downloadPercent) downloadPercent.textContent = '0%';

        const totalBytes = blob.size;
        if (downloadBytesProgress) {
            downloadBytesProgress.textContent = `0 B / ${REICHINS.utils.formatBytes(totalBytes)}`;
        }
        if (downloadSpeedDisplay) {
            // ペナルティ適用中などの文字は含めず、純粋に転送速度のみを表示
            downloadSpeedDisplay.textContent = `転送速度: ${speedBytesPerSec} B/s`;
        }
        if (downloadRemainingDisplay) {
            downloadRemainingDisplay.textContent = `残り時間: 約 ${Math.ceil(totalBytes / speedBytesPerSec)} 秒`;
        }

        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        let isAborted = false;
        const onCancel = () => {
            isAborted = true;
        };
        if (downloadCancelBtn) {
            downloadCancelBtn.addEventListener('click', onCancel, { once: true });
        }

        let sentBytes = 0;
        const chunks = [];
        const updateIntervalMs = 50;
        const bytesPerInterval = (speedBytesPerSec * updateIntervalMs) / 1000;
        let fractionalBytes = 0;

        const stream = new ReadableStream({
            start(controller) {
                const timer = setInterval(() => {
                    if (isAborted) {
                        clearInterval(timer);
                        controller.error(new Error('Download cancelled by user'));
                        return;
                    }

                    fractionalBytes += bytesPerInterval;
                    const count = Math.floor(fractionalBytes);
                    if (count > 0) {
                        fractionalBytes -= count;
                        const nextEnd = Math.min(totalBytes, sentBytes + count);
                        const chunk = uint8Array.slice(sentBytes, nextEnd);
                        sentBytes = nextEnd;
                        controller.enqueue(chunk);

                        const pct = totalBytes > 0 ? Math.min(100, (sentBytes / totalBytes) * 100) : 100;
                        if (downloadProgressBar) downloadProgressBar.style.width = `${pct}%`;
                        if (downloadPercent) downloadPercent.textContent = `${Math.floor(pct)}%`;
                        if (downloadBytesProgress) {
                            downloadBytesProgress.textContent = `${REICHINS.utils.formatBytes(sentBytes)} / ${REICHINS.utils.formatBytes(totalBytes)}`;
                        }
                        const remainingSec = Math.ceil((totalBytes - sentBytes) / speedBytesPerSec);
                        if (downloadRemainingDisplay) {
                            downloadRemainingDisplay.textContent = `残り時間: 約 ${remainingSec} 秒`;
                        }

                        if (sentBytes >= totalBytes) {
                            clearInterval(timer);
                            controller.close();
                        }
                    }
                }, updateIntervalMs);
            }
        });

        let downloadSuccess = false;
        try {
            const reader = stream.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }

            if (downloadProgressBar) downloadProgressBar.style.width = '100%';
            if (downloadPercent) downloadPercent.textContent = '100%';
            if (downloadRemainingDisplay) downloadRemainingDisplay.textContent = 'ダウンロード完了';

            const finalDownloadedBlob = new Blob(chunks, { type: blob.type || 'application/octet-stream' });
            const downloadUrl = URL.createObjectURL(finalDownloadedBlob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

            downloadSuccess = true;
            await new Promise(r => setTimeout(r, 400));
        } catch (e) {
            // 中断された場合
            downloadSuccess = false;
        } finally {
            if (downloadCancelBtn) {
                downloadCancelBtn.removeEventListener('click', onCancel);
            }
            downloadProgressView.classList.add('hidden');

            if (downloadSuccess) {
                // ダウンロード完了ダイアログを表示
                if (completeFileNameDisplay) {
                    completeFileNameDisplay.textContent = fileName;
                }
                if (REICHINS.state) {
                    REICHINS.state.lastDownloadedFileName = fileName;
                    REICHINS.state.lastDownloadVerified = false;
                }
                if (downloadCompleteModal) {
                    downloadCompleteModal.classList.remove('hidden');
                }
                syncScrollLock();
                const persistToggle = document.getElementById('persistThemeToggle');
                if (persistToggle && persistToggle.checked) {
                    try {
                        localStorage.setItem('reichins_last_downloaded_filename', fileName);
                    } catch (e) {}
                    if (typeof REICHINS.saveAllSettingsToStorage === 'function') {
                        REICHINS.saveAllSettingsToStorage();
                    }
                }
            } else {
                completedView.classList.remove('hidden');
            }
        }
    }

    REICHINS.openDownloadMenu = openDownloadMenu;
})();
