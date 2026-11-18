(() => {
    const helpTriggerBtn = document.getElementById('helpTriggerBtn');
    const helpModal = document.getElementById('helpModal');
    const helpModalHeaderSubmitBtn = document.getElementById('helpModalHeaderSubmitBtn');
    const helpFormCloseBtn = document.getElementById('helpFormCloseBtn');
    const helpForm = document.getElementById('helpForm');
    const helpErrorMsg = document.getElementById('helpErrorMsg');
    const helpErrorDetail = document.getElementById('helpErrorDetail');
    const helpPrimeInput = document.getElementById('helpPrimeInput');
    const helpQuestionInput = document.getElementById('helpQuestionInput');
    const helpLiveSeconds = document.getElementById('helpLiveSeconds');
    const helpAgeStopBtn = document.getElementById('helpAgeStopBtn');
    const helpAgeInputDisplay = document.getElementById('helpAgeInputDisplay');
    const helpWaitingView = document.getElementById('helpWaitingView');
    const helpWaitingStatusText = document.getElementById('helpWaitingStatusText');
    const helpWaitingSubText = document.getElementById('helpWaitingSubText');
    const helpProgressBar = document.getElementById('helpProgressBar');
    const helpProgressPercent = document.getElementById('helpProgressPercent');
    const helpReplyView = document.getElementById('helpReplyView');
    const helpReplyBackBtn = document.getElementById('helpReplyBackBtn');

    let helpClockInterval = null;
    let helpSelectedAge = null;
    let helpWaitingStatusInterval = null;
    let helpWaitProgressTimer = null;

    function stopHelpWaitTimers() {
        if (helpWaitingStatusInterval) {
            clearInterval(helpWaitingStatusInterval);
            helpWaitingStatusInterval = null;
        }
        if (helpWaitProgressTimer) {
            clearInterval(helpWaitProgressTimer);
            helpWaitProgressTimer = null;
        }
    }

    // 秒数クロックの更新開始
    function startHelpClock() {
        if (helpClockInterval) clearInterval(helpClockInterval);
        const updateSec = () => {
            const now = new Date();
            const sec = now.getSeconds();
            helpLiveSeconds.textContent = String(sec).padStart(2, '0');
        };
        updateSec();
        helpClockInterval = setInterval(updateSec, 200);
    }

    function stopHelpClock() {
        if (helpClockInterval) {
            clearInterval(helpClockInterval);
            helpClockInterval = null;
        }
    }

    // フォームおよび選択状態の初期化
    function resetHelpFormState(keepError = false) {
        // 1. チェックボックス：12個すべてにチェックを入れる
        const allCbs = document.querySelectorAll('.help-opt-cb');
        allCbs.forEach(cb => cb.checked = true);

        // 2. 好きな素数初期化
        helpPrimeInput.value = '';

        // 3. 質問内容初期化
        helpQuestionInput.value = '';

        // 4. 年齢初期化
        helpSelectedAge = null;
        helpAgeInputDisplay.textContent = '未入力';

        // エラー非表示（リセット時にエラーメッセージを残す場合はスキップ）
        if (!keepError) {
            helpErrorMsg.classList.add('hidden');
            helpErrorDetail.textContent = '';
        }
    }

    // 素数判定
    function isPrime(n) {
        if (!Number.isInteger(n) || n < 2) return false;
        if (n === 2) return true;
        if (n % 2 === 0) return false;
        for (let i = 3; i * i <= n; i += 2) {
            if (n % i === 0) return false;
        }
        return true;
    }

    // 「ヘルプが必要ですか?」ボタンクリック時
    helpTriggerBtn.addEventListener('click', () => {
        if (REICHINS.legalConsent && !REICHINS.legalConsent.checkBaseConsentOrShowError()) {
            return;
        }
        helpModal.classList.remove('hidden');
        helpForm.classList.remove('hidden');
        helpWaitingView.classList.add('hidden');
        helpReplyView.classList.add('hidden');
        helpModalHeaderSubmitBtn.classList.remove('hidden');

        resetHelpFormState();
        startHelpClock();
    });

    // 閉じる機能（フォーム下部の「閉じる」ボタン）
    function closeHelpModal() {
        helpModal.classList.add('hidden');
        stopHelpClock();
        stopHelpWaitTimers();
    }
    helpFormCloseBtn.addEventListener('click', closeHelpModal);

    // 回答画面からフォームに戻る
    helpReplyBackBtn.addEventListener('click', () => {
        helpReplyView.classList.add('hidden');
        helpForm.classList.remove('hidden');
        helpModalHeaderSubmitBtn.classList.remove('hidden');
        resetHelpFormState();
        startHelpClock();
    });

    // 年齢ストップボタン
    helpAgeStopBtn.addEventListener('click', () => {
        const sec = new Date().getSeconds();
        helpSelectedAge = sec;
        helpAgeInputDisplay.textContent = `${sec} 歳`;
    });

    // 送信処理（右上の紙飛行機アイコンクリック時）
    function handleHelpSubmit() {
        const checkedOptions = Array.from(document.querySelectorAll('.help-opt-cb')).filter(cb => cb.checked);
        const rawPrime = helpPrimeInput.value.trim();
        const questionText = helpQuestionInput.value.trim();

        const errors = [];

        // 1. 圧縮オプションは1つのみ選択必須
        if (checkedOptions.length !== 1) {
            errors.push('・問い合わせる圧縮オプションは必ず1つのみ選択してください。');
        }

        // 2. 好きな素数検証（後出し条件：素数かつ1328以上かつ1428以下）
        if (!/^-?\d+$/.test(rawPrime)) {
            errors.push('・好きな素数は整数で入力してください。');
        } else {
            const primeNum = Number(rawPrime);
            if (!isPrime(primeNum)) {
                errors.push(`・好きな素数は素数を入力してください（${primeNum} は素数ではありません）。`);
            }
            if (primeNum < 1328) {
                errors.push(`・好きな素数は1328以上にしてください（現在 ${primeNum} です）。`);
            } else if (primeNum > 1428) {
                errors.push(`・好きな素数は1428以下にしてください（現在 ${primeNum} です）。`);
            }
        }

        // 3. 質問内容検証（10文字以上かつ10文字以内、実質ちょうど10文字）
        if (questionText.length < 10) {
            errors.push(`・質問内容は10文字以上で入力してください（現在 ${questionText.length} 文字です）。`);
        } else if (questionText.length > 10) {
            errors.push(`・質問内容は10文字以内で入力してください（現在 ${questionText.length} 文字です）。`);
        }

        // 4. 年齢検証（未入力不可）
        if (helpSelectedAge === null) {
            errors.push('・年齢はストップボタンを押して現在の秒数を確定してください。');
        }

        // 条件を満たしていない場合：エラーを表示し、入力・選択内容をすべてリセット
        if (errors.length > 0) {
            helpErrorDetail.innerHTML = errors.join('<br>');
            helpErrorMsg.classList.remove('hidden');
            resetHelpFormState(true);
            return;
        }

        // 条件を満たした場合：フォームを隠し、永遠に待機するロード画面を表示
        stopHelpClock();
        stopHelpWaitTimers();
        helpForm.classList.add('hidden');
        helpReplyView.classList.add('hidden');
        helpWaitingView.classList.remove('hidden');

        // 待機画面では右上のボタンを非表示
        helpModalHeaderSubmitBtn.classList.add('hidden');

        const waitStatuses = [
            {
                title: 'AIが回答用のテンプレートを用意しています...',
                sub: 'このAIはお使いの端末内で完全ローカル動作しています。外部へ内容を送信することなく、そのまま処理を進めています。'
            },
            {
                title: 'ご質問内容に合うテンプレートを照合しています...',
                sub: '入力された内容の文脈をローカルAIが解析し、もっとも適切な定型文を丁寧に選定しています。'
            },
            {
                title: '回答テンプレートの文章を整えています...',
                sub: '端末内のローカルAIエンジンで最終確認を行っています。通信は発生しませんので、この画面のままお待ちください。'
            },
            {
                title: 'テンプレートの出力準備がまもなく完了します...',
                sub: '完全ローカル環境で生成された回答テンプレートを表示する準備をしています。あと少しお待ちください。'
            }
        ];

        let statusIdx = 0;
        helpWaitingStatusText.textContent = waitStatuses[0].title;
        helpWaitingSubText.textContent = waitStatuses[0].sub;

        helpWaitingStatusInterval = setInterval(() => {
            statusIdx = (statusIdx + 1) % waitStatuses.length;
            helpWaitingStatusText.textContent = waitStatuses[statusIdx].title;
            helpWaitingSubText.textContent = waitStatuses[statusIdx].sub;
        }, 4500);

        // 15秒〜30秒のランダムな待機時間（ミリ秒）
        const totalDuration = (Math.floor(Math.random() * (30 - 15 + 1)) + 15) * 1000;
        const interval = 100;
        let elapsed = 0;

        helpProgressBar.style.width = '0%';
        helpProgressPercent.textContent = '0%';

        helpWaitProgressTimer = setInterval(() => {
            elapsed += interval;
            const pct = Math.min(100, Math.round((elapsed / totalDuration) * 100));
            helpProgressBar.style.width = `${pct}%`;
            helpProgressPercent.textContent = `${pct}%`;

            if (elapsed >= totalDuration) {
                stopHelpWaitTimers();
                // 100%到達後、サポートからの冷たい回答画面へ切り替え
                helpWaitingView.classList.add('hidden');
                helpReplyView.classList.remove('hidden');
            }
        }, interval);
    }

    // 右上の紙飛行機アイコンで送信を実行
    helpModalHeaderSubmitBtn.addEventListener('click', handleHelpSubmit);
})();
