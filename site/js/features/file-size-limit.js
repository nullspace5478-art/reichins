(() => {
    const REICHINS = window.REICHINS = window.REICHINS || {};

    const SIZE_UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', 'RB', 'QB'];

    const DEFAULT_LIMITS = {
        max: { value: 60, unit: 'kB' },
        min: { value: 50, unit: 'kB' }
    };

    const modal = document.getElementById('fileSizeLimitErrorModal');
    const modalTitle = document.getElementById('fileSizeLimitErrorTitle');
    const modalSubtitle = document.getElementById('fileSizeLimitErrorSubtitle');
    const modalMessage = document.getElementById('fileSizeLimitErrorMessage');
    const modalCloseBtn = document.getElementById('fileSizeLimitErrorCloseBtn');

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            if (modal) modal.classList.add('hidden');
        });
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
                value: source.max && typeof source.max.value === 'number' ? source.max.value : defaults.max.value,
                unit: source.max && SIZE_UNITS.includes(source.max.unit) ? source.max.unit : defaults.max.unit
            },
            min: {
                value: source.min && typeof source.min.value === 'number' ? source.min.value : defaults.min.value,
                unit: source.min && SIZE_UNITS.includes(source.min.unit) ? source.min.unit : defaults.min.unit
            }
        };
    }

    function populateUnitSelect(selectEl, defaultUnit = 'kB') {
        if (!selectEl) return;
        selectEl.innerHTML = '';
        SIZE_UNITS.forEach((unit) => {
            const opt = document.createElement('option');
            opt.value = unit;
            opt.textContent = unit;
            if (unit === defaultUnit) opt.selected = true;
            selectEl.appendChild(opt);
        });
    }

    function toBytes(value, unit) {
        const unitIndex = SIZE_UNITS.indexOf(unit);
        if (unitIndex === -1) return NaN;
        return value * Math.pow(1000, unitIndex);
    }

    function formatLimitLabel(limit) {
        return `${limit.value}${limit.unit}`;
    }

    function parseLimitInput(rawValue, unit, labelName) {
        const trimmed = String(rawValue ?? '').trim();
        if (!trimmed) {
            return { error: `${labelName}の数値を入力してください。` };
        }
        const num = Number(trimmed);
        if (!Number.isFinite(num) || num < 0) {
            return { error: `${labelName}には0以上の有効な数値を入力してください。` };
        }
        if (!SIZE_UNITS.includes(unit)) {
            return { error: `${labelName}の単位が正しくありません。` };
        }
        const bytes = toBytes(num, unit);
        if (!Number.isFinite(bytes)) {
            return { error: `${labelName}の値が大きすぎます。` };
        }
        return {
            limit: { value: num, unit },
            bytes
        };
    }

    function validateLimitsForm(maxRaw, maxUnit, minRaw, minUnit) {
        const maxResult = parseLimitInput(maxRaw, maxUnit, '容量上限');
        if (maxResult.error) return { error: maxResult.error };

        const minResult = parseLimitInput(minRaw, minUnit, '容量下限');
        if (minResult.error) return { error: minResult.error };

        if (minResult.bytes > maxResult.bytes) {
            return { error: '容量下限は容量上限以下の値を設定してください。' };
        }

        return {
            limits: {
                max: maxResult.limit,
                min: minResult.limit
            }
        };
    }

    function validateFileSize(file, limits = REICHINS.state.fileSizeLimits) {
        if (!file) return null;
        const resolved = cloneLimits(limits);
        const maxBytes = toBytes(resolved.max.value, resolved.max.unit);
        const minBytes = toBytes(resolved.min.value, resolved.min.unit);

        if (file.size > maxBytes) {
            return {
                type: 'max',
                title: '容量上限を超えています',
                subtitle: 'ブラウザの安全保護のため処理を中断しました。',
                message: `${file.name}は${formatLimitLabel(resolved.max)}を超えています`
            };
        }

        if (file.size < minBytes) {
            return {
                type: 'min',
                title: '容量下限未満です',
                subtitle: '圧縮対象の条件を満たしていません。',
                message: `${file.name}は${formatLimitLabel(resolved.min)}未満です`
            };
        }

        return null;
    }

    function showErrorModal(errorInfo) {
        if (!errorInfo) return;
        if (modalTitle) modalTitle.textContent = errorInfo.title || '容量制限エラー';
        if (modalSubtitle) modalSubtitle.textContent = errorInfo.subtitle || '';
        if (modalMessage) modalMessage.textContent = errorInfo.message || '';
        if (modal) modal.classList.remove('hidden');
    }

    REICHINS.fileSizeLimit = {
        SIZE_UNITS,
        getDefaultLimits,
        cloneLimits,
        populateUnitSelect,
        toBytes,
        formatLimitLabel,
        validateLimitsForm,
        validateFileSize,
        showErrorModal
    };
})();
