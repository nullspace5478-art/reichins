(() => {
    const REICHINS = window.REICHINS = window.REICHINS || {};

    const setupTriggerBtn = document.getElementById('setupTriggerBtn');
    const surveyModal = document.getElementById('surveyModal');
    const surveyCloseBtn = document.getElementById('surveyCloseBtn');
    const surveyForm = document.getElementById('surveyForm');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const persistThemeToggle = document.getElementById('persistThemeToggle');
    const compressionRateFixToggle = document.getElementById('compressionRateFixToggle');
    const noRoundCompressionRateToggle = document.getElementById('noRoundCompressionRateToggle');
    const allowUnknownDateToggle = document.getElementById('allowUnknownDateToggle');
    const safeChangeCompressModeToggle = document.getElementById('safeChangeCompressModeToggle');
    const safeChangeCompressionRateToggle = document.getElementById('safeChangeCompressionRateToggle');
    const safeChangeSaveFormatToggle = document.getElementById('safeChangeSaveFormatToggle');
    const safeChangeProcessingFormatToggle = document.getElementById('safeChangeProcessingFormatToggle');
    const fileSizeMaxInput = document.getElementById('fileSizeMaxInput');
    const fileSizeMaxUnitSelect = document.getElementById('fileSizeMaxUnitSelect');
    const fileSizeMinInput = document.getElementById('fileSizeMinInput');
    const fileSizeMinUnitSelect = document.getElementById('fileSizeMinUnitSelect');
    const surveyBirthYear = document.getElementById('surveyBirthYear');
    const piIndexInput = document.getElementById('piIndexInput');
    const piExtractedDate = document.getElementById('piExtractedDate');
    const surveyResetBtn = document.getElementById('surveyResetBtn');
    const surveySubmitBtn = document.getElementById('surveySubmitBtn');
    const surveyErrorMsg = document.getElementById('surveyErrorMsg');

    const surveyThanksModal = document.getElementById('surveyThanksModal');
    const surveyThanksBackBtn = document.getElementById('surveyThanksBackBtn');
    const surveyThanksYesBtn = document.getElementById('surveyThanksYesBtn');
    const surveyThanksNoBtn = document.getElementById('surveyThanksNoBtn');

    const STORAGE_KEY_PERSIST = 'reichins_theme_persist';
    const STORAGE_KEY_DARK = 'reichins_theme_dark';
    const STORAGE_KEY_SETTINGS = 'reichins_saved_settings';
    const STORAGE_KEY_LAST_FILENAME = 'reichins_last_downloaded_filename';

    const DEFAULT_DETAIL_SETTINGS = {
        compressionType: 'lossless',
        hardware: 'npu',
        internalFormat: 'webp',
        webSuitable: 'yes',
        guaranteeReduction: 'yes',
        powerSaving: 'yes',
        sizeTrend: 'nochange',
        finalOutput: 'txt',
        physicalTransform: 'yes',
        storageStaff: 'single',
        watermark: 'yes',
        paddingAdd: 'under15gb'
    };

    const DETAIL_RADIO_NAMES = {
        compressionType: 'detailCompressionType',
        hardware: 'detailHardware',
        internalFormat: 'detailInternalFormat',
        webSuitable: 'detailWebSuitable',
        guaranteeReduction: 'detailGuaranteeReduction',
        powerSaving: 'detailPowerSaving',
        sizeTrend: 'detailSizeTrend',
        finalOutput: 'detailFinalOutput',
        physicalTransform: 'detailPhysicalTransform',
        storageStaff: 'detailStorageStaff',
        watermark: 'detailWatermark',
        paddingAdd: 'detailPaddingAdd'
    };

    let savedDarkMode = false;
    let savedPersistTheme = false;
    let savedCompressionRateFixed = false;
    let savedNoRoundCompressionRate = true;
    let savedAllowUnknownDate = false;
    let savedSafeChangeCompressMode = true;
    let savedSafeChangeCompressionRate = true;
    let savedSafeChangeSaveFormat = true;
    let savedSafeChangeProcessingFormat = true;
    let savedFileSizeLimits = REICHINS.fileSizeLimit.getDefaultLimits();
    let savedResolutionLimits = REICHINS.resolutionLimit.getDefaultLimits();
    let savedDetailSettings = { ...DEFAULT_DETAIL_SETTINGS };
    const resolutionFormController = REICHINS.resolutionLimit.createFormController();
    let savedImageYear = 1;
    let savedPiIndex = 2562;
    let savedImageMmdd = '0101';

    // 1〜3000年のオプションを生成
    function populateBirthYearOptions() {
        if (!surveyBirthYear) return;
        surveyBirthYear.innerHTML = '';
        const fragment = document.createDocumentFragment();
        for (let y = 1; y <= 3000; y++) {
            const opt = document.createElement('option');
            opt.value = String(y);
            opt.textContent = `${y}年`;
            if (y === 1) {
                opt.selected = true;
            }
            fragment.appendChild(opt);
        }
        surveyBirthYear.appendChild(fragment);
        surveyBirthYear.value = String(savedImageYear || 1);
    }

    populateBirthYearOptions();

    function applyDarkMode(isDark) {
        document.body.classList.toggle('dark-mode', Boolean(isDark));
    }

    // 全設定データを収集
    function collectAllSettingsData() {
        // 1. テーマ
        const darkMode = document.body.classList.contains('dark-mode');

        // 2. 環境設定内の全項目
        const surveySettings = {
            compressionRateFixed: savedCompressionRateFixed,
            noRoundCompressionRate: savedNoRoundCompressionRate,
            allowUnknownDate: savedAllowUnknownDate,
            imageYear: savedImageYear,
            piIndex: savedPiIndex,
            imageMmdd: savedImageMmdd,
            safeChangeCompressMode: savedSafeChangeCompressMode,
            safeChangeCompressionRate: savedSafeChangeCompressionRate,
            safeChangeSaveFormat: savedSafeChangeSaveFormat,
            safeChangeProcessingFormat: savedSafeChangeProcessingFormat,
            complianceCompressEnabled: Boolean(REICHINS.state?.complianceCompressEnabled),
            fileSizeLimits: {
                max: { ...savedFileSizeLimits.max },
                min: { ...savedFileSizeLimits.min }
            },
            resolutionLimits: {
                max: { ...savedResolutionLimits.max },
                min: { ...savedResolutionLimits.min }
            },
            detailSettings: { ...savedDetailSettings }
        };

        // 3. 規約7種類（民法含む）
        const legalConsent = {
            privacyAccepted: Boolean(REICHINS.state?.legalConsent?.privacyAccepted),
            termsAccepted: Boolean(REICHINS.state?.legalConsent?.termsAccepted),
            cookieAccepted: Boolean(REICHINS.state?.legalConsent?.cookieAccepted),
            communityAccepted: Boolean(REICHINS.state?.legalConsent?.communityAccepted),
            tokushohoAccepted: Boolean(REICHINS.state?.legalConsent?.tokushohoAccepted),
            antisocialAccepted: Boolean(REICHINS.state?.legalConsent?.antisocialAccepted),
            civilCodeAccepted: Boolean(REICHINS.state?.legalConsent?.civilCodeAccepted)
        };

        // 4. メタデータ
        const embedMetadata = Boolean(document.getElementById('embedMetadataToggle')?.checked);

        // 5. リソースの使用許可
        const resourcePermission = {
            granted: Boolean(REICHINS.state?.resourcePermissionGranted),
            checkedIds: (REICHINS.resourcePermission && typeof REICHINS.resourcePermission.getSavedCheckedIds === 'function')
                ? REICHINS.resourcePermission.getSavedCheckedIds()
                : []
        };

        // 画面上部の処理モード、圧縮率、保存形式、圧縮オプションは保存対象から除外（リロード時リセット）

        // 10. 圧縮オプションを開くもっと見るボタンの状況（12個全て完全に展開完了している場合のみ保存）
        const modeExpandState = (REICHINS.modeExpand && typeof REICHINS.modeExpand.getState === 'function')
            ? REICHINS.modeExpand.getState()
            : null;
        const isFullyExpanded = Boolean(
            modeExpandState &&
            typeof modeExpandState.totalCount === 'number' &&
            modeExpandState.visibleCount >= modeExpandState.totalCount
        );

        // 11. ユーザーガイドの「全文を表示する」ボタンの状況
        const guideActionContainer = document.getElementById('guideActionContainer');
        const guideShowAll = Boolean(guideActionContainer && guideActionContainer.classList.contains('hidden'));

        // 12. ダウンロード速度
        const downloadSpeedInput = document.getElementById('downloadSpeedInput');
        const downloadSpeed = downloadSpeedInput
            ? (parseInt(downloadSpeedInput.value, 10) || 100)
            : (REICHINS.state?.downloadSpeed || 100);

        return {
            version: 2,
            persist: true,
            darkMode,
            surveySettings,
            complianceCompressEnabled: Boolean(REICHINS.state?.complianceCompressEnabled),
            legalConsent,
            embedMetadata,
            resourcePermission,
            modeExpand: isFullyExpanded ? {
                visibleCount: modeExpandState.visibleCount,
                clicksRemaining: modeExpandState.clicksRemaining
            } : null,
            guideShowAll,
            downloadSpeed,
            lastDownloadedFileName: REICHINS.state?.lastDownloadedFileName || null
        };
    }

    function saveAllSettingsToStorage() {
        try {
            const data = collectAllSettingsData();
            savedPersistTheme = true;
            localStorage.setItem(STORAGE_KEY_PERSIST, 'true');
            localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(data));
            localStorage.setItem(STORAGE_KEY_DARK, String(data.darkMode));
            if (REICHINS.state && REICHINS.state.lastDownloadedFileName) {
                localStorage.setItem(STORAGE_KEY_LAST_FILENAME, REICHINS.state.lastDownloadedFileName);
            }
        } catch (err) {
            console.warn('Failed to save settings to localStorage:', err);
        }
    }

    let isApplyingSettings = false;
    let autoSaveTimer = null;
    function autoSaveIfPersisted() {
        if (isApplyingSettings) return;
        const isPersist = (persistThemeToggle && persistThemeToggle.checked) ||
            localStorage.getItem(STORAGE_KEY_PERSIST) === 'true';
        if (isPersist) {
            saveAllSettingsToStorage();
        }
    }

    function autoSaveDebounced(delay = 100) {
        if (isApplyingSettings) return;
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            autoSaveIfPersisted();
        }, delay);
    }

    function setupAutoSaveListeners() {
        // メタデータトグル
        const metaToggle = document.getElementById('embedMetadataToggle');
        if (metaToggle) {
            metaToggle.addEventListener('change', autoSaveIfPersisted);
        }

        // ダウンロード速度入力
        const speedInput = document.getElementById('downloadSpeedInput');
        if (speedInput) {
            speedInput.addEventListener('input', () => autoSaveDebounced(300));
            speedInput.addEventListener('change', autoSaveIfPersisted);
        }
    }

    function clearAllSettingsFromStorage() {
        try {
            savedPersistTheme = false;
            localStorage.removeItem(STORAGE_KEY_PERSIST);
            localStorage.removeItem(STORAGE_KEY_SETTINGS);
            localStorage.removeItem(STORAGE_KEY_DARK);
            localStorage.removeItem(STORAGE_KEY_LAST_FILENAME);
        } catch (err) {
            // ignore
        }
    }

    function applyAllSettingsFromStorage() {
        if (isApplyingSettings) return;
        isApplyingSettings = true;
        try {
            let saved = null;
            try {
                const isPersist = localStorage.getItem(STORAGE_KEY_PERSIST) === 'true';
                if (!isPersist) {
                    savedPersistTheme = false;
                    if (persistThemeToggle) persistThemeToggle.checked = false;
                    if (REICHINS.state) {
                        REICHINS.state.lastDownloadedFileName = null;
                    }
                    return;
                }
                savedPersistTheme = true;
                if (persistThemeToggle) persistThemeToggle.checked = true;

                const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
                if (raw) {
                    saved = JSON.parse(raw);
                } else {
                    const isDark = localStorage.getItem(STORAGE_KEY_DARK) === 'true';
                    saved = { darkMode: isDark };
                }

                if (REICHINS.state) {
                    REICHINS.state.lastDownloadedFileName = localStorage.getItem(STORAGE_KEY_LAST_FILENAME)
                        || saved?.lastDownloadedFileName
                        || null;
                }
            } catch (err) {
                return;
            }

            if (!saved) return;

            // 1. ダークモード
            if (typeof saved.darkMode === 'boolean') {
                savedDarkMode = saved.darkMode;
                applyDarkMode(savedDarkMode);
                if (darkModeToggle) darkModeToggle.checked = savedDarkMode;
            }

            // ダウンロード速度の復元
            if (typeof saved.downloadSpeed === 'number') {
                const speed = Math.min(104857600, Math.max(1, saved.downloadSpeed));
                if (REICHINS.state) REICHINS.state.downloadSpeed = speed;
                const speedInput = document.getElementById('downloadSpeedInput');
                if (speedInput) speedInput.value = speed;
            }

            // 2. 環境設定内の全項目
            if (saved.surveySettings) {
                const s = saved.surveySettings;
                if (typeof s.compressionRateFixed === 'boolean') commitCompressionRateFix(s.compressionRateFixed);
                if (typeof s.noRoundCompressionRate === 'boolean') commitNoRoundCompressionRate(s.noRoundCompressionRate);
                if (typeof s.allowUnknownDate === 'boolean') {
                    commitImageDateSettings(s.allowUnknownDate, s.imageYear || 1, s.piIndex || 2562, s.imageMmdd || '0101');
                }
                if (typeof s.safeChangeCompressMode === 'boolean') {
                    commitSafeChangeSettings(
                        s.safeChangeCompressMode,
                        s.safeChangeCompressionRate,
                        s.safeChangeSaveFormat,
                        s.safeChangeProcessingFormat
                    );
                }
                if (s.fileSizeLimits) commitFileSizeLimits(s.fileSizeLimits);
                if (s.resolutionLimits) commitResolutionLimits(s.resolutionLimits);
                if (s.detailSettings) commitDetailSettings(s.detailSettings);
                syncFormWithSavedSettings();
            }

            // コンプライアンス遵守圧縮の復元
            const complianceEnabled = (saved.surveySettings && typeof saved.surveySettings.complianceCompressEnabled === 'boolean')
                ? saved.surveySettings.complianceCompressEnabled
                : Boolean(saved.complianceCompressEnabled);
            if (complianceEnabled) {
                REICHINS.state.complianceCompressEnabled = true;
                if (typeof REICHINS.applyComplianceState === 'function') {
                    REICHINS.applyComplianceState();
                }
            }

            // 3. 規約7種類（民法含む）
            if (saved.legalConsent) {
                if (!REICHINS.state.legalConsent) REICHINS.state.legalConsent = {};
                Object.assign(REICHINS.state.legalConsent, saved.legalConsent);
                if (typeof REICHINS.onLegalConsentUpdated === 'function') {
                    REICHINS.onLegalConsentUpdated();
                }
            }

            // 4. メタデータ
            if (typeof saved.embedMetadata === 'boolean') {
                const metaToggle = document.getElementById('embedMetadataToggle');
                if (metaToggle) {
                    metaToggle.checked = saved.embedMetadata;
                    metaToggle.dispatchEvent(new Event('change'));
                }
            }

            // 5. リソースの使用許可
            if (saved.resourcePermission) {
                if (Array.isArray(saved.resourcePermission.checkedIds) && REICHINS.resourcePermission && typeof REICHINS.resourcePermission.setSavedCheckedIds === 'function') {
                    REICHINS.resourcePermission.setSavedCheckedIds(saved.resourcePermission.checkedIds);
                }
                if (typeof saved.resourcePermission.granted === 'boolean') {
                    REICHINS.state.resourcePermissionGranted = saved.resourcePermission.granted;
                }
            }

            // ※画面上部の処理モード、圧縮率、保存形式、圧縮オプションは保存対象外（リロード時は初期状態にリセット）

            // 10. 圧縮オプションを開くもっと見るボタンの状況（12個全て完全に展開完了している保存データのみ復元）
            if (saved.modeExpand && REICHINS.modeExpand && typeof REICHINS.modeExpand.setState === 'function') {
                const currentTotal = (typeof REICHINS.modeExpand.getState === 'function')
                    ? REICHINS.modeExpand.getState().totalCount
                    : 12;
                if (typeof saved.modeExpand.visibleCount === 'number' && saved.modeExpand.visibleCount >= currentTotal) {
                    REICHINS.modeExpand.setState(saved.modeExpand);
                }
            }

            // 11. ユーザーガイドの「全文を表示する」ボタン
            if (saved.guideShowAll) {
                const guideContent = document.getElementById('guideContent');
                const guideActionContainer = document.getElementById('guideActionContainer');
                if (guideContent) {
                    guideContent.textContent = window.REICHINS_GUIDE_TEXT || '';
                }
                if (guideActionContainer) {
                    guideActionContainer.classList.add('hidden');
                }
            }
        } finally {
            if (autoSaveTimer) clearTimeout(autoSaveTimer);
            isApplyingSettings = false;
        }
    }

    function commitCompressionRateFix(isFixed) {
        savedCompressionRateFixed = Boolean(isFixed);
        REICHINS.state.isCompressionRateFixed = savedCompressionRateFixed;
        if (savedCompressionRateFixed) {
            if (typeof REICHINS.stopSliderDecay === 'function') {
                REICHINS.stopSliderDecay();
            }
        } else {
            if (typeof REICHINS.startSliderDecay === 'function') {
                REICHINS.startSliderDecay();
            }
        }
    }

    function commitImageDateSettings(allowUnknown, year, piIndex, mmdd) {
        savedAllowUnknownDate = Boolean(allowUnknown);
        savedImageYear = year;
        savedPiIndex = piIndex;
        savedImageMmdd = mmdd;
        REICHINS.state.allowUnknownDate = savedAllowUnknownDate;
        REICHINS.state.imageDate = {
            year,
            month: parseInt(mmdd.substring(0, 2), 10),
            day: parseInt(mmdd.substring(2, 4), 10)
        };
    }

    function commitSafeChangeSettings(compressMode, compressionRate, saveFormat, processingFormat) {
        savedSafeChangeCompressMode = Boolean(compressMode);
        savedSafeChangeCompressionRate = Boolean(compressionRate);
        savedSafeChangeSaveFormat = Boolean(saveFormat);
        savedSafeChangeProcessingFormat = Boolean(processingFormat);
        REICHINS.state.safeChangeCompressMode = savedSafeChangeCompressMode;
        REICHINS.state.safeChangeCompressionRate = savedSafeChangeCompressionRate;
        REICHINS.state.safeChangeSaveFormat = savedSafeChangeSaveFormat;
        REICHINS.state.safeChangeProcessingFormat = savedSafeChangeProcessingFormat;
    }

    function commitNoRoundCompressionRate(noRound) {
        savedNoRoundCompressionRate = Boolean(noRound);
        REICHINS.state.noRoundCompressionRate = savedNoRoundCompressionRate;
    }

    function commitFileSizeLimits(limits) {
        savedFileSizeLimits = {
            max: { ...limits.max },
            min: { ...limits.min }
        };
        REICHINS.state.fileSizeLimits = {
            max: { ...limits.max },
            min: { ...limits.min }
        };
    }

    function commitResolutionLimits(limits) {
        savedResolutionLimits = {
            max: { ...limits.max },
            min: { ...limits.min }
        };
        REICHINS.state.resolutionLimits = {
            max: { ...limits.max },
            min: { ...limits.min }
        };
    }

    function commitDetailSettings(settings) {
        savedDetailSettings = { ...settings };
        REICHINS.state.detailSettings = { ...settings };
    }

    function applyFileSizeLimitsToForm(limits) {
        if (!fileSizeMaxInput || !fileSizeMaxUnitSelect || !fileSizeMinInput || !fileSizeMinUnitSelect) return;
        fileSizeMaxInput.value = limits.max.value;
        fileSizeMaxUnitSelect.value = limits.max.unit;
        fileSizeMinInput.value = limits.min.value;
        fileSizeMinUnitSelect.value = limits.min.unit;
    }

    function applyDetailSettingsToForm(settings) {
        Object.entries(DETAIL_RADIO_NAMES).forEach(([key, radioName]) => {
            const val = settings[key];
            if (val === undefined) return;
            const target = document.querySelector(`input[name="${radioName}"][value="${val}"]`);
            if (target) target.checked = true;
        });
    }

    function readDetailSettingsFromForm() {
        const result = { ...DEFAULT_DETAIL_SETTINGS };
        Object.entries(DETAIL_RADIO_NAMES).forEach(([key, radioName]) => {
            const checked = document.querySelector(`input[name="${radioName}"]:checked`);
            if (checked) {
                result[key] = checked.value;
            }
        });
        return result;
    }

    // 任意桁まで破綻せず計算できる高精度π算出エンジン (Spigot / BigInt級数展開)
    function computePiFractionDigits(startDigit, count = 4) {
        return new Promise((resolve) => {
            const targetEnd = startDigit + count + 10;
            // 10n*(targetEnd)桁の精度でMachin-like公式 (16*arctan(1/5) - 4*arctan(1/239)) をBigIntで展開
            const precision = BigInt(targetEnd + 15);
            const unity = 10n ** precision;

            function arccot(xVal, mult) {
                const x = BigInt(xVal);
                const x2 = x * x;
                let term = (unity * BigInt(mult)) / x;
                let sum = term;
                let n = 3n;
                let sign = -1n;
                while (term > 0n) {
                    term = term / x2;
                    const div = term / n;
                    if (div === 0n) break;
                    sum += sign * div;
                    sign = -sign;
                    n += 2n;
                }
                return sum;
            }

            // 非同期タスクでUIブロッキングを最小限にして計算
            setTimeout(() => {
                const piBig = 16n * arccot(5n, 1n) - 4n * arccot(239n, 1n);
                const piStr = piBig.toString();
                const fraction = piStr.substring(1);
                const startIdx = startDigit - 1;
                const extracted = fraction.substring(startIdx, startIdx + count);
                resolve(extracted);
            }, 0);
        });
    }

    function syncFormWithSavedSettings() {
        if (darkModeToggle) darkModeToggle.checked = savedDarkMode;
        if (persistThemeToggle) persistThemeToggle.checked = savedPersistTheme;
        if (compressionRateFixToggle) compressionRateFixToggle.checked = savedCompressionRateFixed;
        if (noRoundCompressionRateToggle) noRoundCompressionRateToggle.checked = savedNoRoundCompressionRate;
        if (allowUnknownDateToggle) allowUnknownDateToggle.checked = savedAllowUnknownDate;
        if (safeChangeCompressModeToggle) safeChangeCompressModeToggle.checked = savedSafeChangeCompressMode;
        if (safeChangeCompressionRateToggle) safeChangeCompressionRateToggle.checked = savedSafeChangeCompressionRate;
        if (safeChangeSaveFormatToggle) safeChangeSaveFormatToggle.checked = savedSafeChangeSaveFormat;
        if (safeChangeProcessingFormatToggle) safeChangeProcessingFormatToggle.checked = savedSafeChangeProcessingFormat;

        applyFileSizeLimitsToForm(savedFileSizeLimits);
        resolutionFormController.applyLimits(savedResolutionLimits);
        applyDetailSettingsToForm(savedDetailSettings);

        if (surveyBirthYear) surveyBirthYear.value = String(savedImageYear);
        if (piIndexInput) piIndexInput.value = String(savedPiIndex);
        if (piExtractedDate) {
            piExtractedDate.textContent = savedImageMmdd;
            piExtractedDate.className = 'font-mono text-sm font-bold text-blue-600';
        }
        applyDarkMode(savedDarkMode);
    }

    function syncSurveyScrollLock() {
        const isOpen = surveyModal && !surveyModal.classList.contains('hidden');
        if (isOpen) {
            surveyModal.scrollTop = 0;
        }
        if (REICHINS.utils && typeof REICHINS.utils.syncModalScrollLock === 'function') {
            REICHINS.utils.syncModalScrollLock();
        }
    }

    if (surveyModal) {
        surveyModal.addEventListener('scroll', () => {
            if (surveyModal.scrollTop !== 0) {
                surveyModal.scrollTop = 0;
            }
        });
    }

    if (surveyModal && typeof MutationObserver !== 'undefined') {
        const surveyModalObserver = new MutationObserver(syncSurveyScrollLock);
        surveyModalObserver.observe(surveyModal, { attributes: true, attributeFilter: ['class'] });
    }

    // 常駐ボタン「環境設定」クリックでモーダル表示
    if (setupTriggerBtn) {
        setupTriggerBtn.addEventListener('click', () => {
            if (REICHINS.legalConsent && !REICHINS.legalConsent.checkBaseConsentOrShowError()) {
                return;
            }
            if (surveyErrorMsg) {
                surveyErrorMsg.classList.add('hidden');
                surveyErrorMsg.textContent = '';
            }
            syncFormWithSavedSettings();
            if (surveyModal) surveyModal.classList.remove('hidden');
            syncSurveyScrollLock();
        });
    }

    // 右上のバツボタンで閉じた場合は保存前の状態へ戻す
    if (surveyCloseBtn) {
        surveyCloseBtn.addEventListener('click', () => {
            syncFormWithSavedSettings();
            if (surveyModal) surveyModal.classList.add('hidden');
            syncSurveyScrollLock();
        });
    }

    // ダークモードトグル切り替え（ダウンロード完了モーダル内）
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', (e) => {
            if (savedDarkMode) {
                e.preventDefault();
                darkModeToggle.checked = true;
            }
        });

        darkModeToggle.addEventListener('change', () => {
            if (savedDarkMode) {
                darkModeToggle.checked = true;
                return;
            }
            if (darkModeToggle.checked) {
                savedDarkMode = true;
                applyDarkMode(true);
                if (persistThemeToggle && persistThemeToggle.checked) {
                    saveAllSettingsToStorage();
                }
            }
        });
    }

    // 設定をブラウザに保存トグル切り替え（ダウンロード完了モーダル内）
    if (persistThemeToggle) {
        persistThemeToggle.addEventListener('change', () => {
            if (persistThemeToggle.checked) {
                if (REICHINS.state && REICHINS.state.lastDownloadedFileName) {
                    try {
                        localStorage.setItem(STORAGE_KEY_LAST_FILENAME, REICHINS.state.lastDownloadedFileName);
                    } catch (e) {}
                }
                saveAllSettingsToStorage();
            } else {
                clearAllSettingsFromStorage();
            }
        });
    }

    // 円周率インデックス入力
    let piCalculationTimer = null;
    let isPiCalculating = false;
    let currentCalcToken = 0;

    if (piIndexInput) {
        piIndexInput.addEventListener('input', async () => {
            const val = piIndexInput.value.trim();
            if (piCalculationTimer) clearTimeout(piCalculationTimer);
            const thisToken = ++currentCalcToken;

            if (!val) {
                isPiCalculating = false;
                if (piExtractedDate) {
                    piExtractedDate.textContent = '----';
                    piExtractedDate.className = 'font-mono text-sm font-bold text-blue-600';
                }
                return;
            }

            const idx = parseInt(val, 10);
            if (isNaN(idx) || idx < 1) {
                isPiCalculating = false;
                if (piExtractedDate) {
                    piExtractedDate.textContent = '無効な数値';
                    piExtractedDate.className = 'font-mono text-xs font-semibold text-rose-500';
                }
                return;
            }

            if (idx > 60872) {
                isPiCalculating = false;
                if (piExtractedDate) {
                    piExtractedDate.textContent = 'E';
                    piExtractedDate.className = 'font-mono text-sm font-bold text-slate-800';
                }
                return;
            }

            isPiCalculating = true;
            const loadingTimeout = setTimeout(() => {
                if (thisToken === currentCalcToken && isPiCalculating && piExtractedDate) {
                    piExtractedDate.className = 'font-mono text-xs text-blue-600 flex items-center gap-1.5';
                    piExtractedDate.innerHTML = `
                        <i class="fa-solid fa-circle-notch fa-spin text-blue-500 text-[11px]"></i>
                        <span>円周率の小数桁を計算中...</span>
                    `;
                }
            }, 200);

            try {
                const extracted = await computePiFractionDigits(idx, 4);
                clearTimeout(loadingTimeout);

                if (thisToken !== currentCalcToken) return;

                if (extracted && extracted.length === 4 && piExtractedDate) {
                    piExtractedDate.textContent = extracted;
                    piExtractedDate.className = 'font-mono text-sm font-bold text-blue-600';
                } else if (piExtractedDate) {
                    piExtractedDate.textContent = '計算エラー';
                    piExtractedDate.className = 'font-mono text-xs font-semibold text-rose-500';
                }
            } catch (err) {
                clearTimeout(loadingTimeout);
                if (thisToken === currentCalcToken && piExtractedDate) {
                    piExtractedDate.textContent = '計算エラー';
                    piExtractedDate.className = 'font-mono text-xs font-semibold text-rose-500';
                }
            } finally {
                if (thisToken === currentCalcToken) {
                    isPiCalculating = false;
                }
            }
        });
    }

    function showSurveyError(msg) {
        if (surveyErrorMsg) {
            surveyErrorMsg.textContent = msg;
            surveyErrorMsg.classList.remove('hidden');
        }
    }

    function isValidCalendarMonthDay(year, month, day) {
        if (month < 1 || month > 12 || day < 1) return false;
        const isLeap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
        const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        return day <= daysInMonth[month - 1];
    }

    // 環境設定リセット関数
    function resetSurveyForm() {
        if (surveyForm) surveyForm.reset();
        if (compressionRateFixToggle) compressionRateFixToggle.checked = false;
        if (noRoundCompressionRateToggle) noRoundCompressionRateToggle.checked = true;
        if (allowUnknownDateToggle) allowUnknownDateToggle.checked = false;
        if (safeChangeCompressModeToggle) safeChangeCompressModeToggle.checked = true;
        if (safeChangeCompressionRateToggle) safeChangeCompressionRateToggle.checked = true;
        if (safeChangeSaveFormatToggle) safeChangeSaveFormatToggle.checked = true;
        if (safeChangeProcessingFormatToggle) safeChangeProcessingFormatToggle.checked = true;
        applyFileSizeLimitsToForm(REICHINS.fileSizeLimit.getDefaultLimits());
        resolutionFormController.applyLimits(REICHINS.resolutionLimit.getDefaultLimits());
        applyDetailSettingsToForm(DEFAULT_DETAIL_SETTINGS);

        if (surveyBirthYear) surveyBirthYear.value = '1';
        if (piIndexInput) piIndexInput.value = '2562';
        if (piExtractedDate) {
            piExtractedDate.textContent = '0101';
            piExtractedDate.className = 'font-mono text-sm font-bold text-blue-600';
        }
        currentCalcToken++;
        isPiCalculating = false;
        if (surveyErrorMsg) {
            surveyErrorMsg.classList.add('hidden');
            surveyErrorMsg.textContent = '';
        }
    }

    // 設定保存バリデーション
    if (surveySubmitBtn) {
        surveySubmitBtn.addEventListener('click', () => {
            if (surveyErrorMsg) {
                surveyErrorMsg.classList.add('hidden');
                surveyErrorMsg.textContent = '';
            }

            if (isPiCalculating) {
                showSurveyError('円周率の桁数算出が完了するまでお待ちください。');
                return;
            }

            const selectedYear = parseInt(surveyBirthYear ? surveyBirthYear.value : '1', 10);
            if (isNaN(selectedYear) || selectedYear < 1 || selectedYear > 3000) {
                showSurveyError('有効な年（西暦）を選択してください。');
                return;
            }

            const extracted = piExtractedDate ? piExtractedDate.textContent.trim() : '';
            if (!/^\d{4}$/.test(extracted)) {
                showSurveyError('有効な日付（4桁の数字）を指し示す円周率の桁インデックスを入力してください。');
                return;
            }
            const month = parseInt(extracted.substring(0, 2), 10);
            const day = parseInt(extracted.substring(2, 4), 10);
            if (!isValidCalendarMonthDay(selectedYear, month, day)) {
                showSurveyError(`抽出された値 (${extracted}) は有効な日付ではありません。別の桁位置を入力してください。`);
                return;
            }

            const piIdx = parseInt(piIndexInput ? piIndexInput.value.trim() : '2562', 10);

            const limitsResult = REICHINS.fileSizeLimit.validateLimitsForm(
                fileSizeMaxInput ? fileSizeMaxInput.value : '',
                fileSizeMaxUnitSelect ? fileSizeMaxUnitSelect.value : 'kB',
                fileSizeMinInput ? fileSizeMinInput.value : '',
                fileSizeMinUnitSelect ? fileSizeMinUnitSelect.value : 'kB'
            );
            if (limitsResult.error) {
                showSurveyError(limitsResult.error);
                return;
            }

            const resolutionResult = REICHINS.resolutionLimit.validateLimitsForm(
                resolutionFormController.readLimits()
            );
            if (resolutionResult.error) {
                showSurveyError(resolutionResult.error);
                return;
            }

            // 正しく設定を保存できた場合のみ設定を確定する
            commitCompressionRateFix(compressionRateFixToggle ? compressionRateFixToggle.checked : false);
            commitNoRoundCompressionRate(noRoundCompressionRateToggle ? noRoundCompressionRateToggle.checked : true);
            commitImageDateSettings(allowUnknownDateToggle ? allowUnknownDateToggle.checked : false, selectedYear, piIdx, extracted);
            commitSafeChangeSettings(
                safeChangeCompressModeToggle ? safeChangeCompressModeToggle.checked : true,
                safeChangeCompressionRateToggle ? safeChangeCompressionRateToggle.checked : true,
                safeChangeSaveFormatToggle ? safeChangeSaveFormatToggle.checked : true,
                safeChangeProcessingFormatToggle ? safeChangeProcessingFormatToggle.checked : true
            );
            commitFileSizeLimits(limitsResult.limits);
            commitResolutionLimits(resolutionResult.limits);
            commitDetailSettings(readDetailSettingsFromForm());

            if (persistThemeToggle && persistThemeToggle.checked) {
                saveAllSettingsToStorage();
            }

            if (surveyModal) surveyModal.classList.add('hidden');
            syncSurveyScrollLock();
            if (surveyThanksModal) surveyThanksModal.classList.remove('hidden');
        });
    }

    // 「リセット」ボタン：環境設定内容を初期化
    if (surveyResetBtn) {
        surveyResetBtn.addEventListener('click', () => {
            resetSurveyForm();
        });
    }

    // 最も目立つ「戻る」ボタン
    if (surveyThanksBackBtn) {
        surveyThanksBackBtn.addEventListener('click', () => {
            if (surveyThanksModal) surveyThanksModal.classList.add('hidden');
            resetSurveyForm();
            if (surveyModal) surveyModal.classList.remove('hidden');
            syncSurveyScrollLock();
        });
    }

    function finalizeSurveyAndApplyOption() {
        if (surveyThanksModal) surveyThanksModal.classList.add('hidden');
        if (REICHINS.state.pendingRadioToConfirm) {
            REICHINS.applyRadioSelection(REICHINS.state.pendingRadioToConfirm);
            REICHINS.state.pendingRadioToConfirm = null;
        }
    }

    if (surveyThanksYesBtn) surveyThanksYesBtn.addEventListener('click', finalizeSurveyAndApplyOption);

    if (surveyThanksNoBtn) {
        surveyThanksNoBtn.addEventListener('click', () => {
            commitCompressionRateFix(false);
            commitNoRoundCompressionRate(true);
            commitImageDateSettings(false, 1, 2562, '0101');
            commitSafeChangeSettings(true, true, true, true);
            commitFileSizeLimits(REICHINS.fileSizeLimit.getDefaultLimits());
            commitResolutionLimits(REICHINS.resolutionLimit.getDefaultLimits());
            commitDetailSettings(DEFAULT_DETAIL_SETTINGS);
            resetSurveyForm();
            if (persistThemeToggle && persistThemeToggle.checked) {
                saveAllSettingsToStorage();
            }
            finalizeSurveyAndApplyOption();
        });
    }

    REICHINS.saveAllSettingsToStorage = saveAllSettingsToStorage;
    REICHINS.clearAllSettingsFromStorage = clearAllSettingsFromStorage;
    REICHINS.applyAllSettingsFromStorage = applyAllSettingsFromStorage;
    REICHINS.autoSaveIfPersisted = autoSaveIfPersisted;

    setupAutoSaveListeners();

    // 全スクリプト初期化完了後に保存済み全設定を自動適用
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setupAutoSaveListeners();
            setTimeout(applyAllSettingsFromStorage, 0);
        });
    } else {
        setTimeout(applyAllSettingsFromStorage, 0);
    }
})();
