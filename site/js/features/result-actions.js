(() => {
    const REICHINS = window.REICHINS = window.REICHINS || {};

    const fakeDownloadBtn = document.getElementById('fakeDownloadBtn');
    const realDownloadBtn = document.getElementById('realDownloadBtn');
    const darkResetBtn = document.getElementById('darkResetBtn');

    const darkPatternModal = document.getElementById('darkPatternModal');
    const darkPatternCancelBtn = document.getElementById('darkPatternCancelBtn');
    const darkPatternNoBtn = document.getElementById('darkPatternNoBtn');
    const modalTimerBar = document.getElementById('modalTimerBar');

    let pendingActionType = null; // 'download' | 'reset'
    let modalCountdownInterval = null;

    // タイマーのリセットと停止
    function stopModalTimer() {
        if (modalCountdownInterval) {
            clearInterval(modalCountdownInterval);
            modalCountdownInterval = null;
        }
    }

    // 「キャンセル」ボタンを押したとき（または3秒経過時）：ポップアップを閉じる（何もしない）
    function closeModalByCancel() {
        stopModalTimer();
        darkPatternModal.classList.add('hidden');
        pendingActionType = null;
    }

    // 確認モーダルの呼び出し（3秒カウントダウン開始）
    function promptDarkPattern(actionType) {
        stopModalTimer();
        pendingActionType = actionType;
        darkPatternModal.classList.remove('hidden');

        // 3秒（3000ms）のタイマーバー初期化
        const totalDuration = 3000;
        const updateInterval = 50;
        let remaining = totalDuration;
        modalTimerBar.style.width = '100%';

        modalCountdownInterval = setInterval(() => {
            remaining -= updateInterval;
            const pct = Math.max(0, (remaining / totalDuration) * 100);
            modalTimerBar.style.width = `${pct}%`;

            if (remaining <= 0) {
                stopModalTimer();
                closeModalByCancel(); // 3秒経過で自動的にキャンセル（閉じる）を選択
            }
        }, updateInterval);
    }

    darkPatternCancelBtn.addEventListener('click', closeModalByCancel);

    // 「いいえ」ボタンを押したとき：本来要求されたアクションを実行（最初の画面に戻る）
    darkPatternNoBtn.addEventListener('click', () => {
        stopModalTimer();
        darkPatternModal.classList.add('hidden');
        if (pendingActionType === 'reset') {
            REICHINS.resetAll();
        }
        pendingActionType = null;
    });

    // ボタンへのイベント登録：全画面表示は即座、ダウンロードはダウンロードメニュー、リセットは確認モーダル
    fakeDownloadBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    });
    realDownloadBtn.addEventListener('click', () => {
        if (typeof REICHINS.openDownloadMenu === 'function') {
            REICHINS.openDownloadMenu();
        }
    });
    darkResetBtn.addEventListener('click', () => promptDarkPattern('reset'));
})();
