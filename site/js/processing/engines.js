(() => {
    const REICHINS = window.REICHINS = window.REICHINS || {};

    function applyResultBanner({ bannerClass, iconClass, iconHtml, title, desc }) {
        const { resultBanner, resultBannerIcon, resultBannerTitle, resultBannerDesc } = REICHINS.dom;
        resultBanner.className = bannerClass;
        resultBannerIcon.className = iconClass;
        resultBannerIcon.innerHTML = iconHtml;
        resultBannerTitle.textContent = title;
        resultBannerDesc.textContent = desc;
    }

    function resolveOutputMime(file, fallback = 'image/jpeg') {
        const mime = (file && file.type ? file.type : '').toLowerCase();
        if (mime === 'image/jpeg') return 'image/jpeg';
        if (mime === 'image/png') return 'image/png';
        if (mime === 'image/webp') return 'image/webp';

        const name = (file && file.name ? file.name : '').toLowerCase();
        if (name.endsWith('.jpeg')) return 'image/jpeg';
        if (name.endsWith('.png')) return 'image/png';
        if (name.endsWith('.webp')) return 'image/webp';
        return fallback;
    }

    function canvasToBlobSafe(canvas, mime, quality) {
        return new Promise((resolve) => {
            const finishWithDataUrl = () => {
                try {
                    const dataUrl = canvas.toDataURL(mime, quality);
                    const parts = dataUrl.split(',');
                    const actualMime = (parts[0].match(/:(.*?);/) || [])[1] || mime;
                    const bin = atob(parts[1]);
                    const arr = new Uint8Array(bin.length);
                    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
                    resolve(new Blob([arr], { type: actualMime }));
                } catch (e) {
                    resolve(null);
                }
            };

            if (typeof canvas.toBlob === 'function') {
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else finishWithDataUrl();
                }, mime, quality);
            } else {
                finishWithDataUrl();
            }
        });
    }

    const engines = {
        async quick(file) {
            // 【クイック圧縮: 正確に1バイトだけ削る（WebPはRIFF仕様上偶数長必須のため破損回避調整）】
            const outputMime = resolveOutputMime(file, 'image/png');
            const newSize = Math.max(1, file.size - 1);
            let resultBlob = file.slice(0, newSize, outputMime);

            // JPEGは末尾EOI(FF D9)を維持したまま1バイト削減
            if (outputMime === 'image/jpeg' && file.size >= 4) {
                try {
                    const tail = new Uint8Array(await file.slice(file.size - 2).arrayBuffer());
                    if (tail[0] === 0xFF && tail[1] === 0xD9) {
                        const trimmed = new Uint8Array(newSize);
                        trimmed.set(new Uint8Array(await file.slice(0, newSize - 2).arrayBuffer()), 0);
                        trimmed[newSize - 2] = 0xFF;
                        trimmed[newSize - 1] = 0xD9;
                        resultBlob = new Blob([trimmed], { type: 'image/jpeg' });
                    }
                } catch (e) {}
            } else if (outputMime === 'image/webp' && file.size >= 16) {
                // WebPはRIFFコンテナ長がファイルサイズと一致＆偶数長である必要があるため破損しないよう調整
                try {
                    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
                    const dv = new DataView(header.buffer);
                    const riffSize = dv.getUint32(4, true);
                    if (file.size > riffSize + 8) {
                        resultBlob = file.slice(0, newSize, 'image/webp');
                    } else {
                        const { loadImage } = REICHINS.utils;
                        const img = await loadImage(file);
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);

                        const targetEvenLen = (file.size - 2) - ((file.size - 2) % 2);
                        let candidate = null;
                        for (const q of [0.92, 0.8, 0.6, 0.35, 0.1]) {
                            const b = await canvasToBlobSafe(canvas, 'image/webp', q);
                            if (b && b.size <= targetEvenLen - 8) {
                                candidate = b;
                                break;
                            }
                        }

                        if (candidate && candidate.size % 2 === 0) {
                            const sb = new Uint8Array(await candidate.arrayBuffer());
                            const need = targetEvenLen - sb.length;
                            const payloadLen = need - 8;
                            const padded = new Uint8Array(targetEvenLen);
                            padded.set(sb, 0);
                            padded[sb.length] = 0x4A;
                            padded[sb.length + 1] = 0x55;
                            padded[sb.length + 2] = 0x4E;
                            padded[sb.length + 3] = 0x4B;
                            const pdv = new DataView(padded.buffer);
                            pdv.setUint32(sb.length + 4, payloadLen, true);
                            pdv.setUint32(4, targetEvenLen - 8, true);
                            resultBlob = new Blob([padded], { type: 'image/webp' });
                        } else {
                            const fallback = await canvasToBlobSafe(canvas, 'image/webp', 0.5);
                            resultBlob = (fallback && fallback.size < file.size) ? fallback : file;
                        }
                    }
                } catch (e) {
                    resultBlob = file;
                }
            }

            const displayImageUrl = URL.createObjectURL(file); // 視覚的破損なし

            applyResultBanner({
                bannerClass: 'border border-emerald-200 bg-emerald-50/70 rounded-xl p-4 flex items-start sm:items-center space-x-3.5',
                iconClass: 'w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0',
                iconHtml: '<i class="fa-solid fa-bolt"></i>',
                title: 'クイック圧縮が完了しました',
                desc: '視覚情報を損なわずに1バイト程度の軽量化に成功しました。'
            });

            return { resultBlob, displayImageUrl };
        },

        async websearch(file) {
            // 【Web圧縮: スキャンした結果、Web上の画像圧縮ツールの利用を推奨】
            const { webSearchActionArea } = REICHINS.dom;
            const resultBlob = file;
            const displayImageUrl = URL.createObjectURL(file);

            applyResultBanner({
                bannerClass: 'border border-blue-200 bg-blue-50/70 rounded-xl p-4 flex items-start sm:items-center space-x-3.5',
                iconClass: 'w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0',
                iconHtml: '<i class="fa-solid fa-circle-nodes"></i>',
                title: 'Webで圧縮ができます',
                desc: 'この画像は画像圧縮ツールを使用した方が良いことが判明しました。'
            });
            webSearchActionArea.classList.remove('hidden');

            return { resultBlob, displayImageUrl };
        },

        async extreme(file) {
            // 【モード1: シンプル圧縮 (モザイク化)】
            const { loadImage } = REICHINS.utils;
            const img = await loadImage(file);
            const canvas = document.createElement('canvas');
            const outputMime = resolveOutputMime(file, 'image/jpeg');

            const tinyW = Math.max(16, Math.round(img.naturalWidth * 0.02));
            const tinyH = Math.max(16, Math.round(img.naturalHeight * 0.02));
            canvas.width = tinyW;
            canvas.height = tinyH;
            const ctx = canvas.getContext('2d');
            if (outputMime === 'image/jpeg') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, tinyW, tinyH);
            }
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, tinyW, tinyH);

            const resultBlob = (await canvasToBlobSafe(canvas, outputMime, 0.02)) || file;
            const displayImageUrl = URL.createObjectURL(resultBlob);

            applyResultBanner({
                bannerClass: 'border border-emerald-200 bg-emerald-50/70 rounded-xl p-4 flex items-start sm:items-center space-x-3.5',
                iconClass: 'w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0',
                iconHtml: '<i class="fa-solid fa-check"></i>',
                title: 'シンプル圧縮が完了しました',
                desc: '色彩情報を効率的に集約することにより、高い圧縮水準を達成しました。'
            });

            return { resultBlob, displayImageUrl };
        },

        async spatial(file) {
            // 【モード2: スマート圧縮 (アスペクト比調整)】
            const { loadImage } = REICHINS.utils;
            const img = await loadImage(file);
            const canvas = document.createElement('canvas');

            // アニメーション時に決定した軸（window._spatialCompressX）と完全一致させる
            const compressX = typeof window._spatialCompressX !== 'undefined' ? window._spatialCompressX : (Math.random() > 0.5);
            if (compressX) {
                canvas.width = Math.max(32, Math.round(img.naturalWidth * 0.15));
                canvas.height = img.naturalHeight;
            } else {
                canvas.width = img.naturalWidth;
                canvas.height = Math.max(32, Math.round(img.naturalHeight * 0.15));
            }

            const outputMime = resolveOutputMime(file, 'image/jpeg');
            const ctx = canvas.getContext('2d');
            if (outputMime === 'image/jpeg') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const resultBlob = (await canvasToBlobSafe(canvas, outputMime, 0.85)) || file;
            const displayImageUrl = URL.createObjectURL(resultBlob);

            applyResultBanner({
                bannerClass: 'border border-blue-200 bg-blue-50/70 rounded-xl p-4 flex items-start sm:items-center space-x-3.5',
                iconClass: 'w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0',
                iconHtml: '<i class="fa-solid fa-left-right"></i>',
                title: 'スマート圧縮が完了しました',
                desc: '画像をスリム化し、スマートに全体のデータ容量を減らすことに成功しました。'
            });

            return { resultBlob, displayImageUrl };
        },

        async lossless(file) {
            // 【モード4: 可逆圧縮 (元画像そのまま・0%圧縮に成功)】
            const resultBlob = file;
            const displayImageUrl = URL.createObjectURL(file);

            applyResultBanner({
                bannerClass: 'border border-slate-200 bg-slate-50 rounded-xl p-4 flex items-start sm:items-center space-x-3.5',
                iconClass: 'w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0',
                iconHtml: '<i class="fa-solid fa-shield-halved"></i>',
                title: '可逆圧縮が完了しました',
                desc: '元画像の品質が完全に保たれたまま、無損失で0%の圧縮に成功しました。'
            });

            return { resultBlob, displayImageUrl };
        },

        async premium() {
            // 【モード5: プレミアム圧縮 (画像データを完全破棄・0バイト / 100%圧縮達成)】
            const resultBlob = new Blob([], { type: 'application/octet-stream' });
            const displayImageUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>';

            applyResultBanner({
                bannerClass: 'border border-amber-200 bg-amber-50/70 rounded-xl p-4 flex items-start sm:items-center space-x-3.5',
                iconClass: 'w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0',
                iconHtml: '<i class="fa-solid fa-crown"></i>',
                title: 'プレミアム圧縮が完了しました',
                desc: '画像を徹底的に軽量化し、無駄なストレージ占有を残さない100%の圧縮を達成しました。'
            });

            return { resultBlob, displayImageUrl };
        },

        async textmeta(file) {
            // 【モード6: フォーマット最適化 (テキスト記述フォーマットへ変換)】
            const { loadImage } = REICHINS.utils;
            const { previewImage, textFormatPreview, textFormatContent } = REICHINS.dom;

            let width = 1920;
            let height = 1080;
            try {
                const img = await loadImage(file);
                width = img.naturalWidth || 1920;
                height = img.naturalHeight || 1080;
            } catch (e) {}

            const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
            const fileDate = file.lastModified ? new Date(file.lastModified) : new Date();
            const year = fileDate.getFullYear();
            const month = fileDate.getMonth() + 1;
            const day = fileDate.getDate();

            const metaDescription = `${width}×${height}pxで容量${sizeMb}MBの${year}年${month}月${day}日に作成された画像`;
            const resultBlob = new Blob([metaDescription], { type: 'text/plain;charset=utf-8' });

            previewImage.classList.add('hidden');
            textFormatPreview.classList.remove('hidden');
            textFormatContent.textContent = `「${metaDescription}」`;

            applyResultBanner({
                bannerClass: 'border border-blue-200 bg-blue-50/70 rounded-xl p-4 flex items-start sm:items-center space-x-3.5',
                iconClass: 'w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0',
                iconHtml: '<i class="fa-solid fa-file-code"></i>',
                title: 'フォーマット最適化が完了しました',
                desc: '画像をテキストベースの仕様へ最適化して、ファイル記述の簡素化を行いました。'
            });

            return { resultBlob, displayImageUrl: null };
        },

        async cloudsplit(file) {
            // 【モード7: 分散圧縮 (16分割してZIP化・16分の1に分散)】
            const { loadImage } = REICHINS.utils;
            const { previewImage, cloudGridPreview } = REICHINS.dom;

            const img = await loadImage(file);
            const zip = new JSZip();

            const cols = 4;
            const rows = 4;
            const pieceW = Math.max(1, Math.floor(img.naturalWidth / cols));
            const pieceH = Math.max(1, Math.floor(img.naturalHeight / rows));

            cloudGridPreview.innerHTML = '';
            previewImage.classList.add('hidden');
            cloudGridPreview.classList.remove('hidden');

            const tileCanvas = document.createElement('canvas');
            tileCanvas.width = pieceW;
            tileCanvas.height = pieceH;
            const tileCtx = tileCanvas.getContext('2d');

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    tileCtx.fillStyle = '#ffffff';
                    tileCtx.fillRect(0, 0, pieceW, pieceH);
                    tileCtx.drawImage(img, c * pieceW, r * pieceH, pieceW, pieceH, 0, 0, pieceW, pieceH);

                    const pieceBlob = (await canvasToBlobSafe(tileCanvas, 'image/jpeg', 0.85)) || file;

                    const arrayBuf = await pieceBlob.arrayBuffer();
                    zip.file(`slice_r${r + 1}_c${c + 1}.jpg`, arrayBuf);

                    // プレビュー用ミニ画像
                    const tileImg = document.createElement('img');
                    tileImg.src = URL.createObjectURL(pieceBlob);
                    tileImg.className = 'w-full h-full object-cover rounded border border-white/40 shadow-sm';
                    cloudGridPreview.appendChild(tileImg);
                }
            }

            const resultBlob = await zip.generateAsync({ type: 'blob' });

            applyResultBanner({
                bannerClass: 'border border-blue-200 bg-blue-50/70 rounded-xl p-4 flex items-start sm:items-center space-x-3.5',
                iconClass: 'w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0',
                iconHtml: '<i class="fa-solid fa-cubes"></i>',
                title: '分散圧縮が完了しました',
                desc: '画像を16分割しました。16人で分担すると各自の使用容量が16分の1になります。'
            });

            return { resultBlob, displayImageUrl: null };
        },

        async cleaneco(file) {
            // 【モード8: クリーン圧縮 (全ピクセルを純黒にしてディスプレイ消費電力を削減)】
            const { loadImage } = REICHINS.utils;
            const img = await loadImage(file);
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');

            // 全面を完全な純黒（#000000）で塗りつぶす
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const outputMime = resolveOutputMime(file, 'image/png');
            const resultBlob = (await canvasToBlobSafe(canvas, outputMime, 0.9)) || file;
            const displayImageUrl = URL.createObjectURL(resultBlob);

            applyResultBanner({
                bannerClass: 'border border-emerald-200 bg-emerald-50/70 rounded-xl p-4 flex items-start sm:items-center space-x-3.5',
                iconClass: 'w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0',
                iconHtml: '<i class="fa-solid fa-leaf"></i>',
                title: 'クリーン圧縮が完了しました',
                desc: '全ピクセルを黒に変更しました。モニターの消費電力を減らし、環境負荷を低減します。'
            });

            return { resultBlob, displayImageUrl };
        },

        async localdevice(file) {
            // 【モード9: GPU圧縮 (GPU性能不足で失敗・容量を1.3〜1.5倍に増大)】
            const multiplier = 1.3 + Math.random() * 0.2; // 1.3〜1.5倍
            const targetExtraBytes = Math.round(file.size * (multiplier - 1));
            const paddingBuffer = new Uint8Array(targetExtraBytes);

            const resultBlob = new Blob([file, paddingBuffer], { type: resolveOutputMime(file, 'image/png') });
            // プレビューには壊れていない元画像を表示
            const displayImageUrl = URL.createObjectURL(file);

            applyResultBanner({
                bannerClass: 'border border-amber-300 bg-amber-50/80 rounded-xl p-4 flex items-start sm:items-center space-x-3.5',
                iconClass: 'w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0',
                iconHtml: '<i class="fa-solid fa-triangle-exclamation"></i>',
                title: 'GPU圧縮に失敗しました',
                desc: 'お使いの端末のGPUは当ツール非対応であったため、ファイル容量を増やしました。'
            });

            return { resultBlob, displayImageUrl };
        },

        async classicmark(file) {
            // 【モード10: クラシック圧縮 (本当に圧縮するが、ライヒンスのウォーターマークを透明にせず堂々とでかく刻印)】
            const { loadImage } = REICHINS.utils;
            let resultBlob = null;
            let displayImageUrl = null;

            try {
                const img = await loadImage(file);
                const canvas = document.createElement('canvas');
                const w = img.naturalWidth || img.width || 800;
                const h = img.naturalHeight || img.height || 600;
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');

                // JPEG変換時の透過バグを防ぐため白背景でクリア
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, w, h);

                // 元画像を描画
                ctx.drawImage(img, 0, 0, w, h);

                // 全体に巨大な不透明（100%）ウォーターマークを堂々と刻印
                ctx.save();

                // 1. 中央に超特大のメイン刻印
                const centerFontSize = Math.max(32, Math.round(Math.min(w, h) * 0.18));
                ctx.font = `900 ${centerFontSize}px 'Inter', sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // 斜め回転
                ctx.translate(w / 2, h / 2);
                ctx.rotate(-28 * Math.PI / 180);

                // 極太の白縁取りと不透明な赤塗り（堂々と目立たせる）
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = Math.max(6, Math.round(centerFontSize * 0.15));
                ctx.strokeText('REICHINS', 0, 0);
                ctx.fillStyle = '#dc2626'; // 完全不透明な真紅
                ctx.fillText('REICHINS', 0, 0);

                // 2. 周囲にも堂々とでかいウォーターマークを複数刻印
                const subFontSize = Math.max(20, Math.round(centerFontSize * 0.5));
                ctx.font = `800 ${subFontSize}px 'Inter', sans-serif`;
                ctx.lineWidth = Math.max(4, Math.round(subFontSize * 0.14));

                const offsets = [
                    { x: 0, y: -centerFontSize * 1.5 },
                    { x: 0, y: centerFontSize * 1.5 },
                    { x: -w * 0.4, y: 0 },
                    { x: w * 0.4, y: 0 },
                    { x: -w * 0.3, y: -centerFontSize * 1.6 },
                    { x: w * 0.3, y: centerFontSize * 1.6 }
                ];

                offsets.forEach(pos => {
                    ctx.strokeStyle = '#ffffff';
                    ctx.strokeText('REICHINS', pos.x, pos.y);
                    ctx.fillStyle = '#dc2626';
                    ctx.fillText('REICHINS', pos.x, pos.y);
                });

                ctx.restore();

                // 実際に70%程度にしっかり圧縮（toBlobフォールバック付き）
                const inputMime = resolveOutputMime(file, 'image/jpeg');
                const classicMime = inputMime === 'image/webp' ? 'image/webp' : 'image/jpeg';
                resultBlob = (await canvasToBlobSafe(canvas, classicMime, 0.45)) || file;

                displayImageUrl = URL.createObjectURL(resultBlob);
            } catch (err) {
                // フェイルセーフ：万一Canvas処理で例外が出ても元画像で正常完了させる
                resultBlob = file;
                displayImageUrl = URL.createObjectURL(file);
            }

            applyResultBanner({
                bannerClass: 'border border-emerald-200 bg-emerald-50/70 rounded-xl p-4 flex items-start sm:items-center space-x-3.5',
                iconClass: 'w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0',
                iconHtml: '<i class="fa-solid fa-stamp"></i>',
                title: 'クラシック圧縮が完了しました',
                desc: '標準的な圧縮アルゴリズムによりデータ容量を削減し、ウォーターマークを追加しました。'
            });

            return { resultBlob, displayImageUrl };
        },

        async safegrow(file) {
            // 【標準最適化 (事前にカウントアップした正確なバイト数と完全一致させる)】
            const plan = window._safegrowPlan || {
                chunkSize: 16 * 1024 * 1024,
                repeatCount: 48,
                remainderSize: 1024 * 1024
            };

            const baseBuffer = new Uint8Array(plan.chunkSize);
            const remainderBuffer = new Uint8Array(plan.remainderSize);

            const blobParts = [file];
            for (let i = 0; i < plan.repeatCount; i++) {
                blobParts.push(baseBuffer);
            }
            if (plan.remainderSize > 0) {
                blobParts.push(remainderBuffer);
            }

            const resultBlob = new Blob(blobParts, { type: resolveOutputMime(file, 'image/png') });
            const displayImageUrl = URL.createObjectURL(file);

            applyResultBanner({
                bannerClass: 'border border-blue-200 bg-blue-50/70 rounded-xl p-4 flex items-start sm:items-center space-x-3.5',
                iconClass: 'w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0',
                iconHtml: '<i class="fa-solid fa-circle-info"></i>',
                title: '標準最適化が完了しました',
                desc: 'ファイルの末尾に大量のパディングを追加したため、容量が安全に増加しました。'
            });

            return { resultBlob, displayImageUrl };
        }
    };

    REICHINS.engines = engines;
})();
