(() => {
    const REICHINS = window.REICHINS = window.REICHINS || {};

    const {
        dropZone,
        fileInput,
        compressionRateSlider,
        compressionRateDisplay,
        compressionFailedModal,
        freeStockNoticeModal
    } = REICHINS.dom;

    // フォーマット切り替えボタン・見出し関連要素
    const navFormatJpeg = document.getElementById('navFormatJpeg');
    const navFormatPng = document.getElementById('navFormatPng');
    const navFormatWebp = document.getElementById('navFormatWebp');
    const saveFormatSelect = document.getElementById('saveFormatSelect');
    const formatMismatchModal = document.getElementById('formatMismatchModal');
    const formatMismatchCloseBtn = document.getElementById('formatMismatchCloseBtn');
    const mismatchSelectedFormat = document.getElementById('mismatchSelectedFormat');
    const mismatchActualFormat = document.getElementById('mismatchActualFormat');
    const unsupportedExtensionModal = document.getElementById('unsupportedExtensionModal');
    const unsupportedExtensionCloseBtn = document.getElementById('unsupportedExtensionCloseBtn');
    const unsupportedExtensionFileDisplay = document.getElementById('unsupportedExtensionFileDisplay');
    const saveFormatMismatchModal = document.getElementById('saveFormatMismatchModal');
    const saveFormatMismatchCloseBtn = document.getElementById('saveFormatMismatchCloseBtn');
    const saveMismatchActualExt = document.getElementById('saveMismatchActualExt');
    const saveMismatchTargetExt = document.getElementById('saveMismatchTargetExt');
    const jpgExtensionDeprecatedModal = document.getElementById('jpgExtensionDeprecatedModal');
    const jpgExtensionDeprecatedCloseBtn = document.getElementById('jpgExtensionDeprecatedCloseBtn');
    const saveFormatAutoErrorModal = document.getElementById('saveFormatAutoErrorModal');
    const saveFormatAutoErrorCloseBtn = document.getElementById('saveFormatAutoErrorCloseBtn');
    const textmetaFormatErrorModal = document.getElementById('textmetaFormatErrorModal');
    const textmetaFormatErrorCloseBtn = document.getElementById('textmetaFormatErrorCloseBtn');
    const textmetaActualSaveExt = document.getElementById('textmetaActualSaveExt');
    const imageDateErrorModal = document.getElementById('imageDateErrorModal');
    const imageDateErrorTitle = document.getElementById('imageDateErrorTitle');
    const imageDateErrorSubtitle = document.getElementById('imageDateErrorSubtitle');
    const imageDateErrorMessage = document.getElementById('imageDateErrorMessage');
    const imageDateErrorCloseBtn = document.getElementById('imageDateErrorCloseBtn');

    const compressionFailedCloseBtn = document.getElementById('compressionFailedCloseBtn');
    const compressionRateTooHighModal = document.getElementById('compressionRateTooHighModal');
    const compressionRateTooHighCloseBtn = document.getElementById('compressionRateTooHighCloseBtn');
    const detailSettingErrorModal = document.getElementById('detailSettingErrorModal');
    const detailSettingErrorTitle = document.getElementById('detailSettingErrorTitle');
    const detailSettingErrorMessage = document.getElementById('detailSettingErrorMessage');
    const detailSettingErrorCloseBtn = document.getElementById('detailSettingErrorCloseBtn');
    const metadataEnabledErrorModal = document.getElementById('metadataEnabledErrorModal');
    const metadataEnabledErrorCloseBtn = document.getElementById('metadataEnabledErrorCloseBtn');
    const legalConsentErrorModal = document.getElementById('legalConsentErrorModal');
    const legalConsentErrorMessage = document.getElementById('legalConsentErrorMessage');
    const legalConsentErrorCloseBtn = document.getElementById('legalConsentErrorCloseBtn');

    // ドラッグ＆ドロップ検出モーダル要素
    const freeStockFileName = document.getElementById('freeStockFileName');
    const dropCloseBtn = document.getElementById('dropCloseBtn');

    // ペースト非対応モーダル要素
    const pasteUnsupportedModal = document.getElementById('pasteUnsupportedModal');
    const pasteUnsupportedCloseBtn = document.getElementById('pasteUnsupportedCloseBtn');

    // ファイル名命名規則モーダル要素
    const filenameRuleModal = document.getElementById('filenameRuleModal');
    const filenameRuleCloseBtn = document.getElementById('filenameRuleCloseBtn');
    const rejectedFileNameDisplay = document.getElementById('rejectedFileNameDisplay');

    // 4つの主要コントロール個別リセットヘルパー
    function resetCompressMode() {
        const defaultRadio = document.querySelector('input[name="compressMode"][value="extreme"]');
        if (defaultRadio && typeof REICHINS.applyRadioSelection === 'function') {
            REICHINS.applyRadioSelection(defaultRadio);
        }
    }

    let previousValidCompressionRate = compressionRateSlider ? compressionRateSlider.value : 0;
    let previousValidSaveFormat = saveFormatSelect ? saveFormatSelect.value : 'auto';

    function resetCompressionRate() {
        previousValidCompressionRate = 0;
        compressionRateSlider.value = 0;
        compressionRateDisplay.textContent = '0%';
    }

    function resetSaveFormat() {
        previousValidSaveFormat = 'auto';
        if (saveFormatSelect) {
            saveFormatSelect.selectedIndex = 0;
        }
    }

    function resetProcessingFormat() {
        setSelectedFormat('WEBP');
    }

    function getDisplayedCompressionRate() {
        return Math.round(parseFloat(compressionRateSlider.value) || 0);
    }

    function getEffectiveCompressionRate() {
        const displayedRate = getDisplayedCompressionRate();
        if (REICHINS.state.noRoundCompressionRate !== false) {
            return displayedRate;
        }
        return Math.min(100, Math.round(displayedRate / 10) * 10);
    }

    compressionRateSlider.addEventListener('pointerdown', (e) => {
        if (REICHINS.legalConsent && !REICHINS.legalConsent.checkBaseConsentOrShowError()) {
            e.preventDefault();
        }
    });

    // 圧縮率スライダー操作
    compressionRateSlider.addEventListener('input', () => {
        if (REICHINS.legalConsent && !REICHINS.legalConsent.checkBaseConsentOrShowError()) {
            compressionRateSlider.value = previousValidCompressionRate;
            if (compressionRateDisplay) {
                compressionRateDisplay.textContent = `${Math.round(parseFloat(previousValidCompressionRate))}%`;
            }
            return;
        }
        previousValidCompressionRate = compressionRateSlider.value;
        const rounded = Math.round(parseFloat(compressionRateSlider.value));
        compressionRateDisplay.textContent = `${rounded}%`;
        if (REICHINS.state.safeChangeCompressionRate !== false) {
            resetCompressMode();
            resetSaveFormat();
            resetProcessingFormat();
        }
    });

    // 圧縮率スライダーの自動低下タイマー（全体の速度は10秒で100%のまま、20msごとに0.2%ずつ滑らかに低下）
    // ホーム画面を表示しており、かつモーダルや進捗画面が開いていない時のみ低下
    let sliderDecayInterval = null;

    function stopSliderDecay() {
        if (sliderDecayInterval) {
            clearInterval(sliderDecayInterval);
            sliderDecayInterval = null;
        }
    }

    function startSliderDecay() {
        if (sliderDecayInterval || REICHINS.state.isCompressionRateFixed) return;
        // 20msごとに0.2%ずつ減衰（1秒で10%、10秒で100%の速度を完全維持しつつ極めて滑らかに推移）
        sliderDecayInterval = setInterval(() => {
            if (REICHINS.state.isCompressionRateFixed) {
                stopSliderDecay();
                return;
            }
            if (REICHINS.utils.isHomeScreenActive()) {
                let currentVal = parseFloat(compressionRateSlider.value);
                if (currentVal > 0) {
                    currentVal = Math.max(0, currentVal - 0.2);
                    compressionRateSlider.value = currentVal;
                    compressionRateDisplay.textContent = `${Math.round(currentVal)}%`;
                }
            }
        }, 20);
    }

    REICHINS.startSliderDecay = startSliderDecay;
    REICHINS.stopSliderDecay = stopSliderDecay;
    startSliderDecay();

    compressionFailedCloseBtn.addEventListener('click', () => {
        compressionFailedModal.classList.add('hidden');
        REICHINS.resetAll();
    });

    if (compressionRateTooHighCloseBtn) {
        compressionRateTooHighCloseBtn.addEventListener('click', () => {
            if (compressionRateTooHighModal) {
                compressionRateTooHighModal.classList.add('hidden');
            }
        });
    }

    if (detailSettingErrorCloseBtn) {
        detailSettingErrorCloseBtn.addEventListener('click', () => {
            if (detailSettingErrorModal) {
                detailSettingErrorModal.classList.add('hidden');
            }
        });
    }

    if (metadataEnabledErrorCloseBtn) {
        metadataEnabledErrorCloseBtn.addEventListener('click', () => {
            if (metadataEnabledErrorModal) {
                metadataEnabledErrorModal.classList.add('hidden');
            }
        });
    }

    function showDetailSettingError(title, message) {
        if (detailSettingErrorTitle) {
            detailSettingErrorTitle.textContent = title;
        }
        if (detailSettingErrorMessage) {
            detailSettingErrorMessage.textContent = message;
        }
        if (detailSettingErrorModal) {
            detailSettingErrorModal.classList.remove('hidden');
        }
    }

    // 環境設定「圧縮の詳細設定」の12個のセグメントコントロール各選択肢に対応する圧縮オプション定義
    const DETAIL_SEGMENTS_DEF = [
        // 1. 圧縮タイプ
        {
            key: 'compressionType',
            paramName: '1 圧縮タイプ',
            defaultVal: 'lossless',
            options: {
                lossless: {
                    label: '可逆圧縮',
                    modes: ['quick', 'safegrow', 'lossless', 'websearch', 'localdevice']
                },
                lossy: {
                    label: '不可逆圧縮',
                    modes: ['extreme', 'spatial', 'textmeta', 'cloudsplit', 'cleaneco', 'classicmark', 'premium']
                }
            }
        },
        // 2. ハードウェア
        {
            key: 'hardware',
            paramName: '2 ハードウェア',
            defaultVal: 'npu',
            options: {
                npu: {
                    label: 'NPU',
                    modes: []
                },
                cpu: {
                    label: 'CPU',
                    modes: [
                        'extreme', 'quick', 'safegrow', 'spatial', 'lossless', 'websearch',
                        'textmeta', 'cloudsplit', 'cleaneco', 'classicmark', 'premium'
                    ]
                },
                gpu: {
                    label: 'GPU',
                    modes: ['localdevice']
                }
            }
        },
        // 3. 内部フォーマット
        {
            key: 'internalFormat',
            paramName: '3 内部フォーマット',
            defaultVal: 'webp',
            options: {
                webp: {
                    label: '.webp',
                    modes: [
                        'extreme', 'quick', 'safegrow', 'spatial', 'lossless', 'websearch',
                        'textmeta', 'cloudsplit', 'cleaneco', 'localdevice', 'classicmark', 'premium'
                    ]
                },
                png: {
                    label: '.png',
                    modes: [
                        'extreme', 'quick', 'safegrow', 'spatial', 'lossless', 'websearch',
                        'textmeta', 'cloudsplit', 'cleaneco', 'localdevice', 'classicmark', 'premium'
                    ]
                },
                jpeg: {
                    label: '.jpeg',
                    modes: [
                        'extreme', 'quick', 'safegrow', 'spatial', 'lossless', 'websearch',
                        'textmeta', 'cloudsplit', 'cleaneco', 'localdevice', 'classicmark', 'premium'
                    ]
                }
            }
        },
        // 4. Webに適した
        {
            key: 'webSuitable',
            paramName: '4 Webに適した',
            defaultVal: 'yes',
            options: {
                yes: {
                    label: 'はい',
                    modes: ['websearch']
                },
                no: {
                    label: 'いいえ',
                    modes: [
                        'extreme', 'quick', 'safegrow', 'spatial', 'lossless',
                        'textmeta', 'cloudsplit', 'cleaneco', 'localdevice', 'classicmark', 'premium'
                    ]
                }
            }
        },
        // 5. 容量削減保証
        {
            key: 'guaranteeReduction',
            paramName: '5 容量削減保証',
            defaultVal: 'yes',
            options: {
                yes: {
                    label: 'はい',
                    modes: []
                },
                no: {
                    label: 'いいえ',
                    modes: [
                        'extreme', 'quick', 'safegrow', 'spatial', 'lossless', 'websearch',
                        'textmeta', 'cloudsplit', 'cleaneco', 'localdevice', 'classicmark', 'premium'
                    ]
                }
            }
        },
        // 6. 省電力
        {
            key: 'powerSaving',
            paramName: '6 省電力',
            defaultVal: 'yes',
            options: {
                yes: {
                    label: 'はい',
                    modes: ['cleaneco']
                },
                no: {
                    label: 'いいえ',
                    modes: [
                        'extreme', 'quick', 'safegrow', 'spatial', 'lossless', 'websearch',
                        'textmeta', 'cloudsplit', 'localdevice', 'classicmark', 'premium'
                    ]
                }
            }
        },
        // 7. 容量の増減傾向
        {
            key: 'sizeTrend',
            paramName: '7 容量の増減傾向',
            defaultVal: 'nochange',
            options: {
                nochange: {
                    label: '変化無し',
                    modes: ['lossless', 'websearch']
                },
                increase: {
                    label: '増加',
                    modes: ['safegrow', 'localdevice']
                },
                decrease: {
                    label: '減少',
                    modes: [
                        'extreme', 'quick', 'spatial', 'textmeta', 'cloudsplit',
                        'cleaneco', 'classicmark', 'premium'
                    ]
                }
            }
        },
        // 8. 最終出力物
        {
            key: 'finalOutput',
            paramName: '8 最終出力物',
            defaultVal: 'txt',
            options: {
                txt: {
                    label: '.txt',
                    modes: ['textmeta']
                },
                zip: {
                    label: '.zip',
                    modes: ['cloudsplit']
                },
                image: {
                    label: '画像',
                    modes: [
                        'extreme', 'quick', 'safegrow', 'spatial', 'lossless',
                        'cleaneco', 'localdevice', 'classicmark', 'premium'
                    ]
                },
                searchbutton: {
                    label: '検索ボタン',
                    modes: ['websearch']
                }
            }
        },
        // 9. 物理的な変形
        {
            key: 'physicalTransform',
            paramName: '9 物理的な変形',
            defaultVal: 'yes',
            options: {
                yes: {
                    label: 'はい',
                    modes: ['spatial']
                },
                no: {
                    label: 'いいえ',
                    modes: [
                        'extreme', 'quick', 'safegrow', 'lossless', 'websearch',
                        'textmeta', 'cloudsplit', 'cleaneco', 'localdevice', 'classicmark', 'premium'
                    ]
                }
            }
        },
        // 10. 保存の分担人数
        {
            key: 'storageStaff',
            paramName: '10 保存の分担人数',
            defaultVal: 'single',
            options: {
                single: {
                    label: '1人',
                    modes: [
                        'extreme', 'quick', 'safegrow', 'spatial', 'lossless',
                        'websearch', 'textmeta', 'cleaneco', 'localdevice', 'classicmark', 'premium'
                    ]
                },
                sixteen: {
                    label: '16人',
                    modes: ['cloudsplit']
                }
            }
        },
        // 11. ウォーターマーク
        {
            key: 'watermark',
            paramName: '11 ウォーターマーク',
            defaultVal: 'yes',
            options: {
                yes: {
                    label: 'はい',
                    modes: ['classicmark']
                },
                no: {
                    label: 'いいえ',
                    modes: [
                        'extreme', 'quick', 'safegrow', 'spatial', 'lossless',
                        'websearch', 'textmeta', 'cloudsplit', 'cleaneco', 'localdevice', 'premium'
                    ]
                }
            }
        },
        // 12. パディング追加
        {
            key: 'paddingAdd',
            paramName: '12 パディング追加',
            defaultVal: 'under15gb',
            options: {
                under15gb: {
                    label: '1.5GBより少ない',
                    modes: ['safegrow']
                },
                under50pct: {
                    label: '+50%より少ない',
                    modes: ['localdevice']
                },
                none: {
                    label: 'なし',
                    modes: [
                        'extreme', 'quick', 'spatial', 'lossless', 'websearch',
                        'textmeta', 'cloudsplit', 'cleaneco', 'classicmark', 'premium'
                    ]
                }
            }
        }
    ];

    function validateDetailSettings(selectedMode, processingFormat, saveExt, detailSettings) {
        const detail = detailSettings || {};
        const modeName = (REICHINS.MODE_NAME_MAP && REICHINS.MODE_NAME_MAP[selectedMode]) || selectedMode;

        for (const seg of DETAIL_SEGMENTS_DEF) {
            const currentVal = detail[seg.key] || seg.defaultVal;
            const currentOpt = seg.options[currentVal] || seg.options[seg.defaultVal];
            const segLabel = currentOpt ? currentOpt.label : currentVal;

            // 3. 内部フォーマット固有の整合性チェック
            if (seg.key === 'internalFormat') {
                const internalFmt = (currentVal || 'webp').toLowerCase();
                const procFmt = (processingFormat || '').toLowerCase();
                const targetSaveExt = (saveExt || '').toLowerCase();
                if (!currentOpt || !currentOpt.modes.includes(selectedMode) || procFmt !== internalFmt || targetSaveExt !== internalFmt) {
                    return {
                        title: '圧縮処理を実行できません',
                        message: `${modeName}の${seg.paramName}は${segLabel}ではありません`
                    };
                }
                continue;
            }

            // 一般セグメントの適合チェック
            if (!currentOpt || !currentOpt.modes.includes(selectedMode)) {
                return {
                    title: '圧縮処理を実行できません',
                    message: `${modeName}の${seg.paramName}は${segLabel}ではありません`
                };
            }
        }

        return null;
    }

    REICHINS.validateDetailSettings = validateDetailSettings;

    pasteUnsupportedCloseBtn.addEventListener('click', () => {
        pasteUnsupportedModal.classList.add('hidden');
    });

    filenameRuleCloseBtn.addEventListener('click', () => {
        filenameRuleModal.classList.add('hidden');
    });

    if (legalConsentErrorCloseBtn) {
        legalConsentErrorCloseBtn.addEventListener('click', () => {
            if (legalConsentErrorModal) legalConsentErrorModal.classList.add('hidden');
        });
    }

    function setSelectedFormat(formatKey) {
        REICHINS.state.currentSelectedFormat = formatKey;

        // ボタンのアクティブ状態更新
        [
            { btn: navFormatJpeg, key: 'JPEG' },
            { btn: navFormatPng, key: 'PNG' },
            { btn: navFormatWebp, key: 'WEBP' }
        ].forEach(item => {
            if (item.key === formatKey) {
                item.btn.className = 'format-nav-btn text-blue-600 font-bold bg-blue-50/80 cursor-pointer transition py-1 px-2 rounded-md shadow-xs';
            } else {
                item.btn.className = 'format-nav-btn hover:text-blue-600 cursor-pointer transition py-1 px-2 rounded-md font-medium text-slate-600';
            }
        });
        if (typeof REICHINS.autoSaveIfPersisted === 'function') {
            REICHINS.autoSaveIfPersisted();
        }
    }

    function handleProcessingFormatClick(formatKey) {
        if (REICHINS.legalConsent && !REICHINS.legalConsent.checkBaseConsentOrShowError()) {
            return;
        }
        setSelectedFormat(formatKey);
        if (REICHINS.state.safeChangeProcessingFormat !== false) {
            resetCompressMode();
            resetCompressionRate();
            resetSaveFormat();
        }
        if (typeof REICHINS.autoSaveIfPersisted === 'function') {
            REICHINS.autoSaveIfPersisted();
        }
    }

    navFormatJpeg.addEventListener('click', () => handleProcessingFormatClick('JPEG'));
    navFormatPng.addEventListener('click', () => handleProcessingFormatClick('PNG'));
    navFormatWebp.addEventListener('click', () => handleProcessingFormatClick('WEBP'));

    if (saveFormatSelect) {
        saveFormatSelect.addEventListener('mousedown', (e) => {
            if (REICHINS.legalConsent && !REICHINS.legalConsent.checkBaseConsentOrShowError()) {
                e.preventDefault();
            }
        });

        saveFormatSelect.addEventListener('change', () => {
            if (REICHINS.legalConsent && !REICHINS.legalConsent.checkBaseConsentOrShowError()) {
                saveFormatSelect.value = previousValidSaveFormat;
                return;
            }
            previousValidSaveFormat = saveFormatSelect.value;
            if (REICHINS.state.safeChangeSaveFormat !== false) {
                resetCompressMode();
                resetCompressionRate();
                resetProcessingFormat();
            }
        });
    }

    formatMismatchCloseBtn.addEventListener('click', () => {
        formatMismatchModal.classList.add('hidden');
    });

    if (unsupportedExtensionCloseBtn) {
        unsupportedExtensionCloseBtn.addEventListener('click', () => {
            unsupportedExtensionModal.classList.add('hidden');
        });
    }

    if (saveFormatMismatchCloseBtn) {
        saveFormatMismatchCloseBtn.addEventListener('click', () => {
            saveFormatMismatchModal.classList.add('hidden');
        });
    }

    if (jpgExtensionDeprecatedCloseBtn) {
        jpgExtensionDeprecatedCloseBtn.addEventListener('click', () => {
            jpgExtensionDeprecatedModal.classList.add('hidden');
        });
    }

    if (saveFormatAutoErrorCloseBtn) {
        saveFormatAutoErrorCloseBtn.addEventListener('click', () => {
            saveFormatAutoErrorModal.classList.add('hidden');
        });
    }

    if (textmetaFormatErrorCloseBtn) {
        textmetaFormatErrorCloseBtn.addEventListener('click', () => {
            textmetaFormatErrorModal.classList.add('hidden');
        });
    }

    if (imageDateErrorCloseBtn) {
        imageDateErrorCloseBtn.addEventListener('click', () => {
            imageDateErrorModal.classList.add('hidden');
        });
    }

    function showImageDateError(title, subtitle, message) {
        if (imageDateErrorTitle) imageDateErrorTitle.textContent = title;
        if (imageDateErrorSubtitle) imageDateErrorSubtitle.textContent = subtitle;
        if (imageDateErrorMessage) imageDateErrorMessage.textContent = message;
        if (imageDateErrorModal) imageDateErrorModal.classList.remove('hidden');
    }

    // 保存形式ドロップダウンの拡張子をページアクセスごとにランダム順へシャッフル（「自動」を常に先頭に固定し、.png/.jpg/.jpeg/.webpは必ず中盤に埋もれさせる）
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function randomizeSaveFormatOptions() {
        if (!saveFormatSelect) return;

        const buriedSet = new Set(['png', 'jpg', 'jpeg', 'webp']);
        const rawOptions = Array.from(saveFormatSelect.querySelectorAll('option')).map((opt) => ({
            value: opt.value,
            text: opt.textContent
        }));
        if (rawOptions.length === 0) return;

        const autoOption = rawOptions.find((item) => item.value.toLowerCase() === 'auto');
        const formatOptions = rawOptions.filter((item) => item.value.toLowerCase() !== 'auto');

        const buried = shuffleArray(formatOptions.filter((item) => buriedSet.has(item.value.toLowerCase())));
        const others = shuffleArray(formatOptions.filter((item) => !buriedSet.has(item.value.toLowerCase())));

        const topPad = Math.min(others.length, Math.max(12, Math.floor(others.length * 0.25)));
        const bottomPad = Math.min(others.length - topPad, Math.max(8, Math.floor(others.length * 0.15)));
        const topSlice = others.slice(0, topPad);
        const midSlice = others.slice(topPad, others.length - bottomPad);
        const bottomSlice = others.slice(others.length - bottomPad);

        // 中盤領域を埋没対象数ぶんの区間に分け、各区間のランダム位置に1つずつ挿入（連続・先頭・末尾を回避）
        const midWithBuried = [];
        if (buried.length > 0 && midSlice.length >= buried.length) {
            const bucketSize = Math.floor(midSlice.length / buried.length);
            for (let b = 0; b < buried.length; b++) {
                const start = b * bucketSize;
                const end = b === buried.length - 1 ? midSlice.length : (b + 1) * bucketSize;
                const bucket = midSlice.slice(start, end);
                const minOffset = bucket.length >= 3 ? 1 : 0;
                const maxOffset = bucket.length >= 3 ? bucket.length - 1 : bucket.length;
                const insertPos = minOffset + Math.floor(Math.random() * Math.max(1, maxOffset - minOffset));
                bucket.splice(insertPos, 0, buried[b]);
                midWithBuried.push(...bucket);
            }
        } else {
            midWithBuried.push(...midSlice, ...buried);
        }

        const ordered = autoOption
            ? [autoOption, ...topSlice, ...midWithBuried, ...bottomSlice]
            : [...topSlice, ...midWithBuried, ...bottomSlice];
        saveFormatSelect.innerHTML = '';
        ordered.forEach((item) => {
            const opt = document.createElement('option');
            opt.value = item.value;
            opt.textContent = item.text;
            saveFormatSelect.appendChild(opt);
        });
        saveFormatSelect.selectedIndex = 0;
    }

    randomizeSaveFormatOptions();

    // ファイル名命名規則の厳格な検証関数
    function validateFileNameRules(fileName) {
        // 1. 16文字以上
        if (fileName.length < 16) return false;

        // 2. 4種類（英大文字・英小文字・数字・記号）がすべて含まれていること
        const hasUpper = /[A-Z]/.test(fileName);
        const hasLower = /[a-z]/.test(fileName);
        const hasDigit = /[0-9]/.test(fileName);
        // 記号（英数および一般的なスペース以外）
        const hasSymbol = /[^A-Za-z0-9]/.test(fileName);

        if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
            return false;
        }

        // 3. large, big, huge, massive, heavy のいずれかを含む（大文字小文字不問）
        const lowerName = fileName.toLowerCase();
        const keywords = ['large', 'big', 'huge', 'massive', 'heavy'];
        const hasKeyword = keywords.some(kw => lowerName.includes(kw));

        if (!hasKeyword) return false;

        return true;
    }

    // ファイル拡張子・MIMEタイプの判定関数（.jpgは非対応とし、.jpegのみ受け入れる）
    function detectFileFormat(file) {
        const fileName = file.name.toLowerCase();
        const mime = file.type.toLowerCase();

        if (fileName.endsWith('.jpg')) return 'UNKNOWN';
        if (mime === 'image/webp' || fileName.endsWith('.webp')) return 'WEBP';
        if (mime === 'image/png' || fileName.endsWith('.png')) return 'PNG';
        if (mime === 'image/jpeg' || fileName.endsWith('.jpeg')) return 'JPEG';

        return 'UNKNOWN';
    }

    function stopFreeStockTimer() {
        if (REICHINS.state.freeStockTimer) {
            clearInterval(REICHINS.state.freeStockTimer);
            REICHINS.state.freeStockTimer = null;
        }
    }

    function showDropDetectedModal(file) {
        REICHINS.state.freeStockPendingFile = file;
        if (freeStockFileName) {
            freeStockFileName.textContent = file.name;
        }
        if (freeStockNoticeModal) {
            freeStockNoticeModal.classList.remove('hidden');
        }
    }

    // 「閉じる」ボタン：モーダルを閉じる
    if (dropCloseBtn) {
        dropCloseBtn.addEventListener('click', () => {
            if (freeStockNoticeModal) {
                freeStockNoticeModal.classList.add('hidden');
            }
            REICHINS.state.freeStockPendingFile = null;
            REICHINS.state.pendingFile = null;
            fileInput.value = '';
        });
    }

    // ファイル名から拡張子（小文字、ドットなし）を取得する関数
    function getFileExtension(fileName) {
        const dotIndex = fileName.lastIndexOf('.');
        if (dotIndex <= 0 || dotIndex === fileName.length - 1) return '';
        return fileName.slice(dotIndex + 1).toLowerCase();
    }

    function isImageFile(file) {
        const mime = (file.type || '').toLowerCase();
        if (mime.startsWith('image/')) return true;
        const ext = getFileExtension(file.name);
        return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'ico', 'tif', 'tiff', 'avif', 'heic'].includes(ext);
    }

    // 圧縮開始ボタン押下時の各モード別モーダル・エラー振り分け処理
    async function runCompressionValidation(file) {
        if (!file) return;

        const clearPending = () => {
            REICHINS.state.pendingFile = null;
        };

        const actualExt = getFileExtension(file.name);

        // .jpg拡張子は一切受け入れない（「JPEGを圧縮」選択時は.jpegへの変更を案内、それ以外の処理モード選択時は拡張子不一致エラーを表示）
        if (actualExt === 'jpg') {
            if (REICHINS.state.currentSelectedFormat === 'JPEG') {
                if (jpgExtensionDeprecatedModal) {
                    jpgExtensionDeprecatedModal.classList.remove('hidden');
                }
            } else {
                if (mismatchSelectedFormat) {
                    mismatchSelectedFormat.textContent = REICHINS.state.currentSelectedFormat;
                }
                if (mismatchActualFormat) {
                    mismatchActualFormat.textContent = 'JPG';
                }
                if (formatMismatchModal) {
                    formatMismatchModal.classList.remove('hidden');
                }
            }
            clearPending();
            return;
        }

        // 0. 最優先チェック: 圧縮に対応している3種類の拡張子（.jpeg / .png / .webp）以外は専用エラー
        const detectedFormat = detectFileFormat(file);
        if (detectedFormat === 'UNKNOWN') {
            if (unsupportedExtensionFileDisplay) {
                unsupportedExtensionFileDisplay.textContent = file.name;
            }
            if (unsupportedExtensionModal) {
                unsupportedExtensionModal.classList.remove('hidden');
            }
            clearPending();
            return;
        }

        // リソース使用許可チェック
        if (REICHINS.resourcePermission && typeof REICHINS.resourcePermission.isGranted === 'function') {
            if (!REICHINS.resourcePermission.isGranted()) {
                REICHINS.resourcePermission.showConsentErrorModal();
                clearPending();
                return;
            }
        }

        // メタデータ追加有効チェック（全12オプション共通）
        if (REICHINS.dom.embedMetadataToggle && REICHINS.dom.embedMetadataToggle.checked) {
            if (metadataEnabledErrorModal) {
                metadataEnabledErrorModal.classList.remove('hidden');
            }
            clearPending();
            return;
        }

        // 容量制限（容量上限・容量下限）チェック
        if (REICHINS.fileSizeLimit && typeof REICHINS.fileSizeLimit.validateFileSize === 'function') {
            const sizeError = REICHINS.fileSizeLimit.validateFileSize(file);
            if (sizeError) {
                REICHINS.fileSizeLimit.showErrorModal(sizeError);
                clearPending();
                return;
            }
        }

        // 解像度制限（解像度上限・解像度下限）チェック
        if (REICHINS.resolutionLimit && typeof REICHINS.resolutionLimit.checkFileResolution === 'function') {
            const resolutionError = await REICHINS.resolutionLimit.checkFileResolution(file);
            if (resolutionError) {
                REICHINS.resolutionLimit.showErrorModal(resolutionError);
                clearPending();
                return;
            }
        }

        // 1. 優先チェック: ヘッダーの形式選択との一致チェック
        if (detectedFormat !== REICHINS.state.currentSelectedFormat) {
            mismatchSelectedFormat.textContent = REICHINS.state.currentSelectedFormat;
            mismatchActualFormat.textContent = detectedFormat;
            formatMismatchModal.classList.remove('hidden');
            clearPending();
            return;
        }

        // 2. 保存形式ドロップダウンのチェック（「自動」非対応・フォーマット最適化の「.txt」必須・通常モードの一致チェック）
        if (saveFormatSelect) {
            const targetExt = saveFormatSelect.value.toLowerCase();
            const selectedMode = document.querySelector('input[name="compressMode"]:checked')?.value || 'extreme';

            if (targetExt === 'auto') {
                if (saveFormatAutoErrorModal) {
                    saveFormatAutoErrorModal.classList.remove('hidden');
                }
                clearPending();
                return;
            }

            if (selectedMode === 'textmeta') {
                if (targetExt !== 'txt') {
                    if (textmetaActualSaveExt) {
                        textmetaActualSaveExt.textContent = `.${targetExt}`;
                    }
                    if (textmetaFormatErrorModal) {
                        textmetaFormatErrorModal.classList.remove('hidden');
                    }
                    clearPending();
                    return;
                }
            } else if (actualExt !== targetExt) {
                if (saveMismatchActualExt) {
                    saveMismatchActualExt.textContent = actualExt ? `.${actualExt}` : '拡張子なし';
                }
                if (saveMismatchTargetExt) {
                    saveMismatchTargetExt.textContent = `.${targetExt}`;
                }
                if (saveFormatMismatchModal) {
                    saveFormatMismatchModal.classList.remove('hidden');
                }
                clearPending();
                return;
            }
        }

        // 4. 次点チェック: ファイル名命名規則チェック（16文字以上、大文字・小文字・数字・記号、指定キーワード包含）
        if (!validateFileNameRules(file.name)) {
            rejectedFileNameDisplay.textContent = file.name;
            filenameRuleModal.classList.remove('hidden');
            clearPending();
            return;
        }

        // 5. 画像メタデータの日付チェック
        const metadataDate = REICHINS.metadata && typeof REICHINS.metadata.extractImageDateFromMetadata === 'function'
            ? await REICHINS.metadata.extractImageDateFromMetadata(file)
            : null;
        const allowUnknownDate = Boolean(REICHINS.state.allowUnknownDate);

        if (allowUnknownDate) {
            if (metadataDate !== null) {
                showImageDateError(
                    '日付情報を含む画像は圧縮できません',
                    'メタデータに日付情報が含まれています。',
                    '選択された画像には撮影日時または作成日時の情報が含まれているため、処理できません。'
                );
                clearPending();
                return;
            }
        } else {
            if (metadataDate === null) {
                showImageDateError(
                    '画像の日付を読み取ることができませんでした',
                    'メタデータに日付情報が含まれていません。',
                    '選択された画像から撮影日時や作成日時の情報を取得できなかったため、処理を続行できません。'
                );
                clearPending();
                return;
            }
            const configured = REICHINS.state.imageDate || { year: 1, month: 1, day: 1 };
            if (metadataDate.year !== configured.year) {
                showImageDateError(
                    '画像の日付に対応していません',
                    '選択された画像の日付が対象外です。',
                    `${metadataDate.year}年に作成された画像は圧縮できません。`
                );
                clearPending();
                return;
            }
            if (metadataDate.month !== configured.month || metadataDate.day !== configured.day) {
                showImageDateError(
                    '画像の日付に対応していません',
                    '選択された画像の日付が対象外です。',
                    `${metadataDate.month}月${metadataDate.day}日に作成された画像は圧縮できません。`
                );
                clearPending();
                return;
            }
        }

        // 6. 圧縮率上限チェック（スライダー表示が100%の場合のみエラー。四捨五入で内部的に100%になった場合は除外）
        if (getDisplayedCompressionRate() >= 100) {
            if (compressionRateTooHighModal) {
                compressionRateTooHighModal.classList.remove('hidden');
            }
            clearPending();
            return;
        }

        // 7. 詳細条件チェック（処理モードと保存形式の整合チェックの後に実行）
        const selectedMode = document.querySelector('input[name="compressMode"]:checked')?.value || 'extreme';
        const saveExt = saveFormatSelect ? saveFormatSelect.value.toLowerCase() : '';
        const detailError = validateDetailSettings(
            selectedMode,
            REICHINS.state.currentSelectedFormat,
            saveExt,
            REICHINS.state.detailSettings
        );
        if (detailError) {
            showDetailSettingError(detailError.title, detailError.message);
            clearPending();
            return;
        }

        if (REICHINS.imagePreview && typeof REICHINS.imagePreview.openDashboardModal === 'function') {
            REICHINS.imagePreview.openDashboardModal();
        } else {
            REICHINS.proceedToModeModal(file);
        }
    }

    // 画像選択時：ドラッグ＆ドロップ時は即座に専用モーダルを表示し、通常選択時は枠内にプレビューを表示
    function handleFileSelection(file, isDrop = false) {
        if (!file) return;

        if (isDrop) {
            if (!isImageFile(file)) {
                if (unsupportedExtensionFileDisplay) {
                    unsupportedExtensionFileDisplay.textContent = file.name;
                }
                if (unsupportedExtensionModal) {
                    unsupportedExtensionModal.classList.remove('hidden');
                }
                fileInput.value = '';
                REICHINS.state.pendingFile = null;
                return;
            }
            showDropDetectedModal(file);
            return;
        }

        if (REICHINS.imagePreview && typeof REICHINS.imagePreview.setPreviewFile === 'function') {
            REICHINS.imagePreview.setPreviewFile(file, false);
        }
    }

    const startCompressionBtn = document.getElementById('startCompressionBtn');
    const memoryDistanceErrorModal = document.getElementById('memoryDistanceErrorModal');
    const memoryDistanceErrorCloseBtn = document.getElementById('memoryDistanceErrorCloseBtn');

    if (memoryDistanceErrorCloseBtn) {
        memoryDistanceErrorCloseBtn.addEventListener('click', () => {
            if (memoryDistanceErrorModal) {
                memoryDistanceErrorModal.classList.add('hidden');
            }
        });
    }

    if (startCompressionBtn) {
        startCompressionBtn.addEventListener('click', (e) => {
            if (REICHINS.imagePreview && typeof REICHINS.imagePreview.shouldSuppressStartClick === 'function' && REICHINS.imagePreview.shouldSuppressStartClick()) {
                e.preventDefault();
                return;
            }
            if (!REICHINS.state.selectedFile) return;

            if (REICHINS.imagePreview && typeof REICHINS.imagePreview.isCardMovedToTop === 'function' && !REICHINS.imagePreview.isCardMovedToTop()) {
                if (memoryDistanceErrorModal) {
                    memoryDistanceErrorModal.classList.remove('hidden');
                }
                return;
            }

            runCompressionValidation(REICHINS.state.selectedFile);
        });
    }

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dropzone-active');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dropzone-active');
    });

    // 6種類の基本規約同意チェックヘルパー
    function checkBaseLegalConsent() {
        const missingDoc = REICHINS.legalConsent && typeof REICHINS.legalConsent.getFirstMissingBaseDocument === 'function'
            ? REICHINS.legalConsent.getFirstMissingBaseDocument()
            : null;
        if (missingDoc) {
            if (legalConsentErrorMessage) {
                legalConsentErrorMessage.textContent = missingDoc.consentErrorMessage;
            }
            if (legalConsentErrorModal) {
                legalConsentErrorModal.classList.remove('hidden');
            }
            return false;
        }
        return true;
    }

    // 規約・ポリシー・ガイドライン・民法等の同意チェックヘルパー
    function checkLegalConsent() {
        const missingLegalDoc = REICHINS.legalConsent && typeof REICHINS.legalConsent.getFirstMissingDocument === 'function'
            ? REICHINS.legalConsent.getFirstMissingDocument()
            : null;
        if (missingLegalDoc) {
            if (legalConsentErrorMessage) {
                legalConsentErrorMessage.textContent = missingLegalDoc.consentErrorMessage;
            }
            if (legalConsentErrorModal) {
                legalConsentErrorModal.classList.remove('hidden');
            }
            return false;
        }
        return true;
    }

    const lastDownloadVerifyModal = document.getElementById('lastDownloadVerifyModal');
    const lastDownloadVerifyInput = document.getElementById('lastDownloadVerifyInput');
    const lastDownloadVerifyError = document.getElementById('lastDownloadVerifyError');
    const lastDownloadVerifyContinueBtn = document.getElementById('lastDownloadVerifyContinueBtn');
    const lastDownloadVerifyResetReloadBtn = document.getElementById('lastDownloadVerifyResetReloadBtn');

    function openLastDownloadVerifyModal() {
        if (!lastDownloadVerifyModal) return;
        if (lastDownloadVerifyInput) lastDownloadVerifyInput.value = '';
        if (lastDownloadVerifyError) {
            lastDownloadVerifyError.textContent = '';
            lastDownloadVerifyError.classList.add('hidden');
        }
        lastDownloadVerifyModal.classList.remove('hidden');
        if (lastDownloadVerifyInput) {
            setTimeout(() => lastDownloadVerifyInput.focus(), 50);
        }
    }

    function handleLastDownloadVerifyContinue() {
        if (!lastDownloadVerifyInput) return;
        const entered = lastDownloadVerifyInput.value.trim();
        const expected = REICHINS.state?.lastDownloadedFileName || '';

        if (!entered) {
            if (lastDownloadVerifyError) {
                lastDownloadVerifyError.textContent = 'ファイル名を入力してください。';
                lastDownloadVerifyError.classList.remove('hidden');
            }
            return;
        }

        if (entered !== expected) {
            if (lastDownloadVerifyError) {
                lastDownloadVerifyError.textContent = 'ファイル名が正しくありません。前回ダウンロードした時点での名前を入力してください。';
                lastDownloadVerifyError.classList.remove('hidden');
            }
            return;
        }

        if (lastDownloadVerifyError) {
            lastDownloadVerifyError.classList.add('hidden');
        }
        if (lastDownloadVerifyModal) {
            lastDownloadVerifyModal.classList.add('hidden');
        }
        if (REICHINS.state) {
            REICHINS.state.lastDownloadVerified = true;
        }

        if (checkLegalConsent()) {
            fileInput.click();
        }
    }

    if (lastDownloadVerifyContinueBtn) {
        lastDownloadVerifyContinueBtn.addEventListener('click', handleLastDownloadVerifyContinue);
    }
    if (lastDownloadVerifyInput) {
        lastDownloadVerifyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLastDownloadVerifyContinue();
            }
        });
    }

    if (lastDownloadVerifyResetReloadBtn) {
        lastDownloadVerifyResetReloadBtn.addEventListener('click', () => {
            try {
                localStorage.clear();
                localStorage.setItem('reichins_theme_persist', 'false');
            } catch (err) {}
            window.location.reload();
        });
    }

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dropzone-active');

        // 6種類の規約に同意していない場合、エラーダイアログを表示
        if (!checkBaseLegalConsent()) {
            return;
        }

        // 前回ダウンロードしたファイル名がある場合、専用モーダルを表示
        if (REICHINS.state?.lastDownloadedFileName && !REICHINS.state?.lastDownloadVerified) {
            openLastDownloadVerifyModal();
            return;
        }

        // 規約・ポリシー・ガイドライン・民法等の同意チェック
        if (!checkLegalConsent()) {
            return;
        }

        const files = e.dataTransfer.files;
        if (files.length > 0) handleFileSelection(files[0], true);
    });

    dropZone.addEventListener('click', () => {
        // プレビュー表示中はクリックでファイル選択ダイアログを開かない（ゴミ箱ボタンで解除）
        if (REICHINS.state.selectedFile) return;

        // 6種類の規約に同意していない場合、エラーダイアログを表示
        if (!checkBaseLegalConsent()) {
            return;
        }

        // 前回ダウンロードしたファイル名がある場合、専用モーダルを表示
        if (REICHINS.state?.lastDownloadedFileName && !REICHINS.state?.lastDownloadVerified) {
            openLastDownloadVerifyModal();
            return;
        }

        // 規約・ポリシー・ガイドライン・民法等の同意チェック（未同意時はエクスプローラーを開く前にエラー表示）
        if (!checkLegalConsent()) {
            return;
        }

        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFileSelection(e.target.files[0], false);
    });

    // クリップボードからの貼り付け (Ctrl+V / Cmd+V) の検知と非対応アラート表示
    // ※ホーム画面で画像が選択されていないときに貼り付けされた場合のみ表示
    function shouldShowPasteUnsupportedModal() {
        const uploadView = REICHINS.dom?.uploadView || document.getElementById('uploadView');
        const processingView = REICHINS.dom?.processingView || document.getElementById('processingView');
        const completedView = REICHINS.dom?.completedView || document.getElementById('completedView');

        const isHome = uploadView && !uploadView.classList.contains('hidden')
            && (!processingView || processingView.classList.contains('hidden'))
            && (!completedView || completedView.classList.contains('hidden'))
            && !(typeof REICHINS.utils?.isModalActive === 'function' && REICHINS.utils.isModalActive());

        if (!isHome) return false;

        // 画像が選択されていないかどうかを判定
        const hasSelectedFile = Boolean(REICHINS.state?.selectedFile);
        if (hasSelectedFile) return false;

        return true;
    }

    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
            // 通常のテキスト入力要素内でのペーストは阻害しないように配慮
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
                return;
            }
            if (!shouldShowPasteUnsupportedModal()) {
                return;
            }
            e.preventDefault();
            pasteUnsupportedModal.classList.remove('hidden');
        }
    });

    window.addEventListener('paste', (e) => {
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
            return;
        }
        if (!shouldShowPasteUnsupportedModal()) {
            return;
        }
        e.preventDefault();
        pasteUnsupportedModal.classList.remove('hidden');
    });

    REICHINS.setSelectedFormat = setSelectedFormat;
    REICHINS.resetCompressMode = resetCompressMode;
    REICHINS.resetCompressionRate = resetCompressionRate;
    REICHINS.resetSaveFormat = resetSaveFormat;
    REICHINS.resetProcessingFormat = resetProcessingFormat;
    REICHINS.getDisplayedCompressionRate = getDisplayedCompressionRate;
    REICHINS.getEffectiveCompressionRate = getEffectiveCompressionRate;
    REICHINS.stopFreeStockTimer = stopFreeStockTimer;
})();
