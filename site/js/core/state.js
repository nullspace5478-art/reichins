(() => {
    const REICHINS = window.REICHINS = window.REICHINS || {};

    REICHINS.MODAL_IDS = [
        'darkPatternModal',
        'noticeModal',
        'localNoticeModal',
        'surveyModal',
        'surveyThanksModal',
        'trafficSecurityModal',
        'metadataModal',
        'metadataEnabledErrorModal',
        'resourcePermissionModal',
        'resourceConsentErrorModal',
        'privacyModal',
        'termsModal',
        'cookieModal',
        'communityModal',
        'tokushohoModal',
        'antisocialModal',
        'civilCodeModal',
        'legalConsentErrorModal',
        'formatMismatchModal',
        'jpgExtensionDeprecatedModal',
        'saveFormatAutoErrorModal',
        'textmetaFormatErrorModal',
        'imageDateErrorModal',
        'unsupportedExtensionModal',
        'saveFormatMismatchModal',
        'filenameRuleModal',
        'compressionFailedModal',
        'compressionRateTooHighModal',
        'detailSettingErrorModal',
        'fileSizeLimitErrorModal',
        'resolutionLimitErrorModal',
        'freeStockNoticeModal',
        'pasteUnsupportedModal',
        'memoryDistanceErrorModal',
        'compressionCodeModal',
        'compressionDashboardModal',
        'lastDownloadVerifyModal',
        'helpModal',
        'downloadMenuModal',
        'scheduleWaitModal',
        'downloadIntentModal',
        'downloadConfirmModal',
        'downloadCompleteModal'
    ];

    REICHINS.MODE_NAME_MAP = {
        extreme: 'シンプル圧縮',
        quick: 'クイック圧縮',
        safegrow: '標準最適化',
        spatial: 'スマート圧縮',
        lossless: '可逆圧縮',
        websearch: 'Web圧縮',
        textmeta: 'フォーマット最適化',
        cloudsplit: '分散圧縮',
        cleaneco: 'クリーン圧縮',
        localdevice: 'GPU圧縮',
        classicmark: 'クラシック圧縮',
        premium: 'プレミアム圧縮'
    };

    REICHINS.state = {
        currentSelectedFormat: 'WEBP',
        createdObjectUrl: null,
        lastOutputBlob: null,
        selectedFile: null,
        selectedFileIsDrop: false,
        previewObjectUrl: null,
        compressionCode: '',
        pendingFile: null,
        lastOutputFileName: 'optimized_image.png',
        freeStockTimer: null,
        freeStockPendingFile: null,
        selectedModesSet: new Set(),
        previousRadioChecked: null,
        pendingRadioToConfirm: null,
        surveyAlreadyShown: false,
        trafficAlreadyShown: false,
        trafficPendingRadio: null,
        trafficAnomalyActive: false,
        trafficSelectionCount: 0,
        trafficPermanentlyDisabled: false,
        optionSwitchTimestamps: [],
        unlockedModes: new Set([
            'extreme', 'quick', 'safegrow', 'spatial', 'lossless', 'websearch',
            'textmeta', 'cloudsplit', 'cleaneco', 'localdevice', 'classicmark', 'premium'
        ]),
        isCompressionRateFixed: false,
        noRoundCompressionRate: true,
        allowUnknownDate: false,
        safeChangeCompressMode: true,
        safeChangeCompressionRate: true,
        safeChangeSaveFormat: true,
        safeChangeProcessingFormat: true,
        complianceCompressEnabled: false,
        resourcePermissionGranted: false,
        downloadSpeed: 100,
        legalConsent: {
            privacyAccepted: false,
            termsAccepted: false,
            cookieAccepted: false,
            communityAccepted: false,
            tokushohoAccepted: false,
            antisocialAccepted: false,
            civilCodeAccepted: false
        },
        fileSizeLimits: {
            max: { value: 60, unit: 'kB' },
            min: { value: 50, unit: 'kB' }
        },
        resolutionLimits: {
            max: { width: 32768, height: 16384 },
            min: { width: 16384, height: 8192 }
        },
        detailSettings: {
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
        },
        imageDate: { year: 1, month: 1, day: 1 },
        lastDownloadedFileName: null,
        lastDownloadVerified: false,
        encodeSpeedSeconds: 300,
        step2Agreed: false,
        succeededModes: new Set()
    };

    REICHINS.dom = {
        dropZone: document.getElementById('dropZone'),
        fileInput: document.getElementById('fileInput'),
        uploadView: document.getElementById('uploadView'),
        processingView: document.getElementById('processingView'),
        completedView: document.getElementById('completedView'),

        compressionRateSlider: document.getElementById('compressionRateSlider'),
        compressionRateDisplay: document.getElementById('compressionRateDisplay'),
        compressionFailedModal: document.getElementById('compressionFailedModal'),

        progressBar: document.getElementById('progressBar'),
        progressPercent: document.getElementById('progressPercent'),
        statusMessage: document.getElementById('statusMessage'),
        detailStatusMessage: document.getElementById('detailStatusMessage'),
        customProcessingDisplay: document.getElementById('customProcessingDisplay'),

        resultBanner: document.getElementById('resultBanner'),
        resultBannerIcon: document.getElementById('resultBannerIcon'),
        resultBannerTitle: document.getElementById('resultBannerTitle'),
        resultBannerDesc: document.getElementById('resultBannerDesc'),

        previewImage: document.getElementById('previewImage'),
        textFormatPreview: document.getElementById('textFormatPreview'),
        textFormatContent: document.getElementById('textFormatContent'),
        cloudGridPreview: document.getElementById('cloudGridPreview'),
        previewResolutionTag: document.getElementById('previewResolutionTag'),
        origFileName: document.getElementById('origFileName'),
        origFileSize: document.getElementById('origFileSize'),
        origBytesCount: document.getElementById('origBytesCount'),
        newFileSize: document.getElementById('newFileSize'),
        newBytesCount: document.getElementById('newBytesCount'),
        boostRatio: document.getElementById('boostRatio'),
        webSearchActionArea: document.getElementById('webSearchActionArea'),

        embedMetadataToggle: document.getElementById('embedMetadataToggle'),

        localNoticeModal: document.getElementById('localNoticeModal'),
        freeStockNoticeModal: document.getElementById('freeStockNoticeModal')
    };

    function isModalActive() {
        return REICHINS.MODAL_IDS.some((id) => {
            const modal = document.getElementById(id);
            return modal && !modal.classList.contains('hidden');
        });
    }

    function syncModalScrollLock() {
        const isOpen = isModalActive();
        if (isOpen) {
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            if (scrollbarWidth > 0 && !document.body.style.paddingRight) {
                document.body.style.paddingRight = `${scrollbarWidth}px`;
            }
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overscrollBehavior = 'none';
            document.body.style.overscrollBehavior = 'none';
        } else {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
            document.documentElement.style.overscrollBehavior = '';
            document.body.style.overscrollBehavior = '';
            document.body.style.paddingRight = '';
        }
    }

    const observedModals = new Set();
    const modalScrollObserver = typeof MutationObserver !== 'undefined'
        ? new MutationObserver(syncModalScrollLock)
        : null;

    function registerModalObserver(el) {
        if (!el || !modalScrollObserver || observedModals.has(el)) return;
        observedModals.add(el);
        modalScrollObserver.observe(el, { attributes: true, attributeFilter: ['class'] });
    }

    function setupModalScrollObservers() {
        if (!modalScrollObserver) return;

        REICHINS.MODAL_IDS.forEach((id) => {
            registerModalObserver(document.getElementById(id));
        });

        if (typeof document.querySelectorAll === 'function') {
            document.querySelectorAll('.fixed.inset-0').forEach(registerModalObserver);
        }

        syncModalScrollLock();
    }

    setupModalScrollObservers();

    function isHomeScreenActive() {
        const { uploadView, processingView, completedView } = REICHINS.dom;
        if (!uploadView || uploadView.classList.contains('hidden')) return false;
        if (!processingView || !processingView.classList.contains('hidden')) return false;
        if (!completedView || !completedView.classList.contains('hidden')) return false;
        if (isModalActive()) return false;
        return true;
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    REICHINS.utils = {
        isModalActive,
        syncModalScrollLock,
        registerModalObserver,
        isHomeScreenActive,
        formatBytes,
        loadImage
    };

    REICHINS.resetAll = function resetAll() {
        const {
            fileInput,
            progressBar,
            progressPercent,
            webSearchActionArea,
            previewImage,
            textFormatPreview,
            cloudGridPreview,
            completedView,
            processingView,
            uploadView,
            localNoticeModal,
            freeStockNoticeModal,
            compressionFailedModal
        } = REICHINS.dom;

        fileInput.value = '';
        progressBar.style.width = '0%';
        progressPercent.textContent = '0%';
        webSearchActionArea.classList.add('hidden');
        previewImage.classList.remove('hidden');
        textFormatPreview.classList.add('hidden');
        cloudGridPreview.classList.add('hidden');
        completedView.classList.add('hidden');
        processingView.classList.add('hidden');
        uploadView.classList.remove('hidden');
        if (localNoticeModal) localNoticeModal.classList.add('hidden');
        if (freeStockNoticeModal) freeStockNoticeModal.classList.add('hidden');
        if (compressionFailedModal) compressionFailedModal.classList.add('hidden');

        ['unsupportedExtensionModal', 'saveFormatMismatchModal', 'jpgExtensionDeprecatedModal', 'saveFormatAutoErrorModal', 'textmetaFormatErrorModal', 'imageDateErrorModal', 'compressionRateTooHighModal', 'detailSettingErrorModal', 'fileSizeLimitErrorModal', 'resolutionLimitErrorModal', 'resourcePermissionModal', 'resourceConsentErrorModal', 'metadataEnabledErrorModal', 'legalConsentErrorModal', 'memoryDistanceErrorModal', 'compressionCodeModal', 'compressionDashboardModal'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });

        if (typeof REICHINS.stopFreeStockTimer === 'function') {
            REICHINS.stopFreeStockTimer();
        }
        if (REICHINS.imagePreview && typeof REICHINS.imagePreview.clearPreview === 'function') {
            REICHINS.imagePreview.clearPreview();
        }
        REICHINS.state.freeStockPendingFile = null;
    };
})();
