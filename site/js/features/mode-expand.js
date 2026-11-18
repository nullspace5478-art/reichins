(() => {
    const REICHINS = window.REICHINS = window.REICHINS || {};

    const INITIAL_VISIBLE_COUNT = 3;
    const EXPAND_BATCH_SIZE = 3;
    const CLICKS_PER_EXPAND = 9;

    const modeSelectorGrid = document.getElementById('modeSelectorGrid');
    const showMoreContainer = document.getElementById('modeShowMoreContainer');
    const previewGrid = document.getElementById('modePreviewGrid');
    const showMoreBtn = document.getElementById('modeShowMoreBtn');
    const showMoreText = document.getElementById('modeShowMoreText');

    if (!modeSelectorGrid || !showMoreContainer || !previewGrid || !showMoreBtn || !showMoreText) {
        return;
    }

    const allModeLabels = Array.from(modeSelectorGrid.querySelectorAll('label[data-mode]'));
    let visibleCount = INITIAL_VISIBLE_COUNT;
    let clicksRemaining = CLICKS_PER_EXPAND;

    function setLabelFocusable(label, focusable) {
        const input = label.querySelector('input[name="compressMode"]');
        if (!input) return;
        if (focusable) {
            input.removeAttribute('tabindex');
        } else {
            input.setAttribute('tabindex', '-1');
        }
    }

    function updateShowMoreLabel() {
        showMoreText.textContent = `もっと見る（+${clicksRemaining}）`;
    }

    function syncModeVisibility() {
        allModeLabels.forEach((label, index) => {
            if (index < visibleCount) {
                label.classList.remove('hidden');
                setLabelFocusable(label, true);
                modeSelectorGrid.appendChild(label);
            } else if (index < visibleCount + EXPAND_BATCH_SIZE) {
                label.classList.remove('hidden');
                setLabelFocusable(label, false);
                previewGrid.appendChild(label);
            } else {
                label.classList.add('hidden');
                setLabelFocusable(label, false);
                modeSelectorGrid.appendChild(label);
            }
        });

        if (visibleCount >= allModeLabels.length) {
            showMoreContainer.classList.add('hidden');
        } else {
            showMoreContainer.classList.remove('hidden');
            updateShowMoreLabel();
        }
    }

    function handleShowMoreClick() {
        if (window.REICHINS && REICHINS.legalConsent && !REICHINS.legalConsent.checkBaseConsentOrShowError()) {
            return;
        }
        if (visibleCount >= allModeLabels.length) return;

        clicksRemaining -= 1;
        if (clicksRemaining <= 0) {
            visibleCount = Math.min(allModeLabels.length, visibleCount + EXPAND_BATCH_SIZE);
            clicksRemaining = CLICKS_PER_EXPAND;
            syncModeVisibility();

            // 12個全ての展開が完了した段階で保存
            if (visibleCount >= allModeLabels.length && typeof REICHINS.autoSaveIfPersisted === 'function') {
                REICHINS.autoSaveIfPersisted();
            }
        } else {
            updateShowMoreLabel();
        }
    }

    showMoreContainer.addEventListener('click', (e) => {
        e.preventDefault();
        handleShowMoreClick();
    });

    syncModeVisibility();

    function setState(newState) {
        if (!newState) return;
        if (typeof newState.visibleCount === 'number') {
            visibleCount = Math.max(INITIAL_VISIBLE_COUNT, Math.min(allModeLabels.length, newState.visibleCount));
        }
        if (typeof newState.clicksRemaining === 'number') {
            clicksRemaining = Math.max(1, Math.min(CLICKS_PER_EXPAND, newState.clicksRemaining));
        }
        syncModeVisibility();
    }

    REICHINS.modeExpand = {
        getState: () => ({
            visibleCount,
            clicksRemaining,
            totalCount: allModeLabels.length
        }),
        setState
    };
})();
