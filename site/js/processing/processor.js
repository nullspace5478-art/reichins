(() => {
    const REICHINS = window.REICHINS = window.REICHINS || {};

    REICHINS.processImage = async function processImage(file, options = {}) {
        if (!file || (/\.jpg$/i.test(file.name) || (!file.type.startsWith('image/') && !/\.(jpeg|png|webp)$/i.test(file.name)))) {
            return;
        }

        const selectedMode = document.querySelector('input[name="compressMode"]:checked')?.value || 'extreme';

        const {
            uploadView,
            processingView,
            completedView,
            webSearchActionArea,
            customProcessingDisplay,
            origFileName,
            origFileSize,
            origBytesCount,
            previewResolutionTag,
            previewImage,
            textFormatPreview,
            cloudGridPreview,
            boostRatio,
            newFileSize,
            newBytesCount,
            compressionRateSlider,
            compressionFailedModal
        } = REICHINS.dom;

        const { formatBytes } = REICHINS.utils;
        const fakeDownloadBtnText = document.getElementById('fakeDownloadBtnText');
        const realDownloadBtnText = document.getElementById('realDownloadBtnText');

        origFileName.textContent = file.name;
        origFileSize.textContent = formatBytes(file.size);
        origBytesCount.textContent = `(${file.size.toLocaleString()} Bytes)`;

        const compressionStartCard = document.getElementById('compressionStartCard');
        if (compressionStartCard) {
            compressionStartCard.classList.add('hidden');
        }

        // エンコード速度（秒数）の取得（0px/sが指定された場合も正しく認識）
        const speedSeconds = (REICHINS.state && typeof REICHINS.state.encodeSpeedSeconds === 'number')
            ? REICHINS.state.encodeSpeedSeconds
            : 300;

        const isSkipProgress = speedSeconds <= 0;

        if (isSkipProgress) {
            // 0px/sが選択された場合：プログレスバーをスキップして即座に圧縮結果へ
            uploadView.classList.add('hidden');
            processingView.classList.add('hidden');
            completedView.classList.add('hidden');
            webSearchActionArea.classList.add('hidden');
            customProcessingDisplay.innerHTML = '';
        } else {
            // 全12オプション共通：全く同じ進捗画面（各圧縮オプション独自のアニメーション無し）
            uploadView.classList.add('hidden');
            processingView.classList.remove('hidden');
            completedView.classList.add('hidden');
            webSearchActionArea.classList.add('hidden');
            customProcessingDisplay.innerHTML = '';

            await runUnifiedProgressAnimation(speedSeconds);
        }

        // プレビュー右上のタグをオプション名のみに設定
        previewResolutionTag.textContent = REICHINS.MODE_NAME_MAP[selectedMode] || '画像圧縮';

        // プレビュー表示の切り替え初期化
        previewImage.classList.remove('hidden');
        textFormatPreview.classList.add('hidden');
        cloudGridPreview.classList.add('hidden');

        // モード別処理エンジン実行
        const engineFn = REICHINS.engines[selectedMode] || REICHINS.engines.safegrow;
        let { resultBlob, displayImageUrl } = await engineFn(file);

        // --- 全オプション共通: 元サイズと最終バイナリサイズから正確な比率を算出して常に緑色で表示 ---
        const finalSize = resultBlob.size;
        const originalSize = file.size;

        // 削減・増加・変動なしの正確なパーセンテージ計算
        if (originalSize > 0) {
            if (finalSize < originalSize) {
                const diffBytes = originalSize - finalSize;
                const percent = (diffBytes / originalSize) * 100;
                // 小数点第1位（微細な差の場合は第4位まで表示）
                const formattedPct = percent < 0.1 && percent > 0 ? percent.toFixed(4) : percent.toFixed(1);
                boostRatio.textContent = `-${formattedPct}% 削減`;
            } else if (finalSize > originalSize) {
                const diffBytes = finalSize - originalSize;
                const percent = (diffBytes / originalSize) * 100;
                const formattedPct = percent >= 1000 ? Math.round(percent).toLocaleString() : percent.toFixed(1);
                boostRatio.textContent = `+${formattedPct}% 増加`;
            } else {
                boostRatio.textContent = `±0% 削減`;
            }
        } else {
            boostRatio.textContent = `±0% 削減`;
        }

        // 削減・増加・変動なしを問わず、常にグリーンの成功したような表示に統一
        boostRatio.className = 'inline-block text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full font-mono shadow-sm';
        newFileSize.className = 'font-mono font-bold text-emerald-700';

        if (displayImageUrl) {
            previewImage.src = displayImageUrl;
        } else {
            previewImage.removeAttribute('src');
        }
        newFileSize.textContent = formatBytes(resultBlob.size);
        newBytesCount.textContent = `(${resultBlob.size.toLocaleString()} Bytes)`;

        if (REICHINS.state.createdObjectUrl) {
            URL.revokeObjectURL(REICHINS.state.createdObjectUrl);
        }
        REICHINS.state.createdObjectUrl = URL.createObjectURL(resultBlob);
        REICHINS.state.lastOutputBlob = resultBlob;

        const dotIdx = file.name.lastIndexOf('.');
        const baseName = dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name;

        let ext = dotIdx !== -1 ? file.name.substring(dotIdx) : '.png';
        if (selectedMode === 'textmeta') {
            ext = '.txt';
        } else if (selectedMode === 'cloudsplit') {
            ext = '.zip';
        }
        REICHINS.state.lastOutputFileName = `${baseName}_optimized${ext}`;

        // ボタンの表記設定
        fakeDownloadBtnText.textContent = '全画面表示に切り替え';
        realDownloadBtnText.textContent = `ダウンロード (${formatBytes(resultBlob.size)})`;

        if (isSkipProgress) {
            // 0px/sが選択された場合はプログレスバーをスキップして確実に圧縮結果を表示
            REICHINS.state.succeededModes.add(selectedMode);
            processingView.classList.add('hidden');
            compressionFailedModal.classList.add('hidden');
            completedView.classList.remove('hidden');
        } else {
            // 進捗演出完了後、進捗画面と結果画面の間で成功／失敗を判定（スライダーの圧縮率＝成功率）
            const successRate = typeof REICHINS.getEffectiveCompressionRate === 'function'
                ? REICHINS.getEffectiveCompressionRate()
                : parseInt(compressionRateSlider.value, 10); // 0〜100
            const randomRoll = Math.random() * 100; // 0.0〜100.0
            const isSuccess = randomRoll < successRate;

            if (isSuccess) {
                REICHINS.state.succeededModes.add(selectedMode);
            }

            // 全モード共通：完了時の表示切り替え
            setTimeout(() => {
                processingView.classList.add('hidden');
                if (isSuccess) {
                    completedView.classList.remove('hidden');
                } else {
                    compressionFailedModal.classList.remove('hidden');
                }
            }, 200);
        }
    };

    // 圧縮オプション12種共通プログレスバー進行関数
    // setTimeoutの32bit整数制限（2,147,483,647ms / 約24.8日）を回避するため、
    // 短い刻みのインターバルで実時間差分（Date.now()）を測定・更新
    function runUnifiedProgressAnimation(durationSeconds) {
        if (Number(durationSeconds) <= 0) {
            return Promise.resolve();
        }
        const { statusMessage, detailStatusMessage, customProcessingDisplay, progressBar, progressPercent } = REICHINS.dom;
        if (customProcessingDisplay) customProcessingDisplay.innerHTML = '';
        if (statusMessage) statusMessage.textContent = '時間が経つのを待っています...';
        if (detailStatusMessage) detailStatusMessage.textContent = '画像に関する処理は行わず、ただタイマーが経過するのを待っています...';

        const totalDurationMs = Number(durationSeconds) * 1000;
        const startTime = Date.now();

        return new Promise((resolve) => {
            // インターバルは16ms〜100msの短周期で回す（どれだけ巨大な秒数でもオーバーフローしない）
            const intervalMs = Math.min(100, Math.max(16, Math.floor(totalDurationMs / 100)));

            const timerId = setInterval(() => {
                const elapsed = Date.now() - startTime;
                if (elapsed >= totalDurationMs) {
                    clearInterval(timerId);
                    if (progressBar) progressBar.style.width = '100%';
                    if (progressPercent) progressPercent.textContent = '100%';
                    if (detailStatusMessage) detailStatusMessage.textContent = '待機時間が経過しました';
                    setTimeout(resolve, 200);
                    return;
                }

                const ratio = elapsed / totalDurationMs;
                const pct = ratio * 100;
                if (progressBar) progressBar.style.width = `${pct}%`;

                if (progressPercent) {
                    if (pct < 1) {
                        progressPercent.textContent = `${pct.toFixed(pct < 0.01 ? 5 : 2)}%`;
                    } else {
                        progressPercent.textContent = `${Math.floor(pct)}%`;
                    }
                }

                if (detailStatusMessage) {
                    if (ratio > 0.3 && ratio < 0.7) {
                        detailStatusMessage.textContent = '引き続き時間が流れるのを待っています...';
                    } else if (ratio >= 0.7) {
                        detailStatusMessage.textContent = 'まもなく設定された待機時間が終了します...';
                    }
                }
            }, intervalMs);
        });
    }

    REICHINS.runUnifiedProgressAnimation = runUnifiedProgressAnimation;
})();
