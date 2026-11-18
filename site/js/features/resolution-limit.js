(() => {
    const REICHINS = window.REICHINS = window.REICHINS || {};

    const MIN_PX = 1;
    const MAX_PX = 65536;

    const DEFAULT_LIMITS = {
        max: { width: 32768, height: 16384 },
        min: { width: 16384, height: 8192 }
    };

    const modal = document.getElementById('resolutionLimitErrorModal');
    const modalTitle = document.getElementById('resolutionLimitErrorTitle');
    const modalSubtitle = document.getElementById('resolutionLimitErrorSubtitle');
    const modalMessage = document.getElementById('resolutionLimitErrorMessage');
    const modalCloseBtn = document.getElementById('resolutionLimitErrorCloseBtn');

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            if (modal) modal.classList.add('hidden');
        });
    }

    function clampPixel(value) {
        const num = Number(value);
        if (!Number.isFinite(num)) return MIN_PX;
        return Math.min(MAX_PX, Math.max(MIN_PX, Math.round(num)));
    }

    function getDefaultLimits() {
        return {
            max: { ...DEFAULT_LIMITS.max },
            min: { ...DEFAULT_LIMITS.min }
        };
    }

    function cloneLimits(limits) {
        const defaults = getDefaultLimits();
        const source = limits || defaults;
        return {
            max: {
                width: source.max && typeof source.max.width === 'number' ? clampPixel(source.max.width) : defaults.max.width,
                height: source.max && typeof source.max.height === 'number' ? clampPixel(source.max.height) : defaults.max.height
            },
            min: {
                width: source.min && typeof source.min.width === 'number' ? clampPixel(source.min.width) : defaults.min.width,
                height: source.min && typeof source.min.height === 'number' ? clampPixel(source.min.height) : defaults.min.height
            }
        };
    }

    function multiplyByTwo(value) {
        return clampPixel(clampPixel(value) * 2);
    }

    function divideByTwo(value) {
        return clampPixel(Math.floor(clampPixel(value) / 2));
    }

    function validateLimitsForm(limits) {
        const resolved = cloneLimits(limits);
        if (resolved.min.width > resolved.max.width) {
            return { error: '解像度下限（横）は解像度上限（横）以下の値を設定してください。' };
        }
        if (resolved.min.height > resolved.max.height) {
            return { error: '解像度下限（縦）は解像度上限（縦）以下の値を設定してください。' };
        }
        return { limits: resolved };
    }

    function validateImageResolution(width, height, limits = REICHINS.state.resolutionLimits) {
        const resolved = cloneLimits(limits);

        if (width > resolved.max.width) {
            return {
                type: 'max',
                axis: '横',
                title: '解像度が上限を超えています',
                subtitle: '選択された画像の解像度は処理対象外です。',
                message: `画像は横${resolved.max.width}px以下である必要があります`
            };
        }

        if (height > resolved.max.height) {
            return {
                type: 'max',
                axis: '縦',
                title: '解像度が上限を超えています',
                subtitle: '選択された画像の解像度は処理対象外です。',
                message: `画像は縦${resolved.max.height}px以下である必要があります`
            };
        }

        if (width < resolved.min.width) {
            return {
                type: 'min',
                axis: '横',
                title: '解像度が下限未満です',
                subtitle: '選択された画像の解像度は処理対象外です。',
                message: `画像は横${resolved.min.width}px以上である必要があります`
            };
        }

        if (height < resolved.min.height) {
            return {
                type: 'min',
                axis: '縦',
                title: '解像度が下限未満です',
                subtitle: '選択された画像の解像度は処理対象外です。',
                message: `画像は縦${resolved.min.height}px以上である必要があります`
            };
        }

        return null;
    }

    async function checkFileResolution(file, limits = REICHINS.state.resolutionLimits) {
        if (!file || !REICHINS.utils || typeof REICHINS.utils.loadImage !== 'function') {
            return null;
        }
        let img = null;
        try {
            img = await REICHINS.utils.loadImage(file);
            return validateImageResolution(img.naturalWidth, img.naturalHeight, limits);
        } catch (err) {
            return null;
        } finally {
            if (img && img.src && img.src.startsWith('blob:')) {
                URL.revokeObjectURL(img.src);
            }
        }
    }

    function showErrorModal(errorInfo) {
        if (!errorInfo) return;
        if (modalTitle) modalTitle.textContent = errorInfo.title || '解像度エラー';
        if (modalSubtitle) modalSubtitle.textContent = errorInfo.subtitle || '';
        if (modalMessage) modalMessage.textContent = errorInfo.message || '';
        if (modal) modal.classList.remove('hidden');
    }

    function createFormController() {
        let draft = getDefaultLimits();

        const fields = [
            {
                key: ['max', 'width'],
                displayEl: document.getElementById('resMaxWidthDisplay'),
                mulBtn: document.getElementById('resMaxWidthMulBtn'),
                divBtn: document.getElementById('resMaxWidthDivBtn')
            },
            {
                key: ['max', 'height'],
                displayEl: document.getElementById('resMaxHeightDisplay'),
                mulBtn: document.getElementById('resMaxHeightMulBtn'),
                divBtn: document.getElementById('resMaxHeightDivBtn')
            },
            {
                key: ['min', 'width'],
                displayEl: document.getElementById('resMinWidthDisplay'),
                mulBtn: document.getElementById('resMinWidthMulBtn'),
                divBtn: document.getElementById('resMinWidthDivBtn')
            },
            {
                key: ['min', 'height'],
                displayEl: document.getElementById('resMinHeightDisplay'),
                mulBtn: document.getElementById('resMinHeightMulBtn'),
                divBtn: document.getElementById('resMinHeightDivBtn')
            }
        ];

        function renderField(field) {
            const [bound, axis] = field.key;
            const val = draft[bound][axis];
            if (field.displayEl) {
                field.displayEl.textContent = `${val}px`;
            }
            if (field.mulBtn) {
                field.mulBtn.disabled = val >= MAX_PX;
            }
            if (field.divBtn) {
                field.divBtn.disabled = val <= MIN_PX;
            }
        }

        function renderAll() {
            fields.forEach(renderField);
        }

        fields.forEach((field) => {
            const [bound, axis] = field.key;
            if (field.mulBtn) {
                field.mulBtn.addEventListener('click', () => {
                    draft[bound][axis] = multiplyByTwo(draft[bound][axis]);
                    renderField(field);
                });
            }
            if (field.divBtn) {
                field.divBtn.addEventListener('click', () => {
                    draft[bound][axis] = divideByTwo(draft[bound][axis]);
                    renderField(field);
                });
            }
        });

        renderAll();

        return {
            applyLimits(limits) {
                draft = cloneLimits(limits);
                renderAll();
            },
            readLimits() {
                return cloneLimits(draft);
            }
        };
    }

    REICHINS.resolutionLimit = {
        MIN_PX,
        MAX_PX,
        getDefaultLimits,
        cloneLimits,
        multiplyByTwo,
        divideByTwo,
        validateLimitsForm,
        validateImageResolution,
        checkFileResolution,
        showErrorModal,
        createFormController
    };
})();
