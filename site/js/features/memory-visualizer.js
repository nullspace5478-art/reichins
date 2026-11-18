(() => {
    const REICHINS = window.REICHINS = window.REICHINS || {};

    let currentRenderId = 0;
    let currentExpectedTotalPixels = null;

    function formatBytesWithRaw(bytes) {
        if (bytes === 0) return '0 B (0 bytes)';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]} (${bytes.toLocaleString()} bytes)`;
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getFormatProfile(selectedFormat) {
        const key = (selectedFormat || 'WEBP').toUpperCase();
        if (key === 'PNG') {
            return {
                key: 'PNG',
                extLabel: '.png',
                decodeMethod: 'ハフマン符号 / LZ77(Deflate)',
                colorSource: 'Filter/Deflate'
            };
        }
        if (key === 'JPEG') {
            return {
                key: 'JPEG',
                extLabel: '.jpeg',
                decodeMethod: 'ハフマン符号 / 逆量子化・逆DCT',
                colorSource: 'YCbCr/MCU'
            };
        }
        return {
            key: 'WEBP',
            extLabel: '.webp',
            decodeMethod: 'VP8/VP8L エントロピー符号・予測復号',
            colorSource: 'YUV420/VP8'
        };
    }

    function parseBinaryStructure(view, bytes) {
        const chunks = [];

        // 1. PNG (89 50 4E 47 0D 0A 1A 0A)
        if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
            chunks.push({
                offset: 0,
                type: 'SIGNATURE',
                length: 8,
                desc: 'PNGマジックナンバー (89 50 4E 47 0D 0A 1A 0A) - ファイル形式の識別子',
                isData: false,
                isMetadata: false
            });

            let offset = 8;
            while (offset + 8 <= bytes.length) {
                const length = view.getUint32(offset, false);
                const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);

                let desc = '補助チャンク (構成データ等)';
                let isData = false;
                let isMetadata = false;

                if (type === 'IHDR') {
                    if (offset + 21 <= bytes.length) {
                        const w = view.getUint32(offset + 8, false);
                        const h = view.getUint32(offset + 12, false);
                        const bitDepth = bytes[offset + 16];
                        const colorType = bytes[offset + 17];
                        desc = `イメージヘッダ: ${w}×${h}px, ビット深度:${bitDepth}, カラータイプ:${colorType}`;
                    }
                } else if (type === 'IDAT') {
                    desc = '圧縮画像データ本体 (Deflate圧縮ストリームの分割チャンク)';
                    isData = true;
                } else if (type === 'IEND') {
                    desc = 'イメージ終端チャンク (ファイルの終わり)';
                } else if (type === 'PLTE') {
                    desc = 'カラーパレット定義チャンク';
                } else if (type === 'tEXt' || type === 'iTXt' || type === 'zTXt') {
                    desc = 'テキストメタデータ (ソフトウェア情報・コメント等)';
                    isMetadata = true;
                } else if (type === 'eXIf') {
                    desc = 'カメラ撮影情報・メタデータ';
                    isMetadata = true;
                } else if (type === 'pHYs') {
                    desc = '物理ピクセル寸法・解像度(DPI)情報';
                } else if (type === 'sRGB' || type === 'gAMA' || type === 'iCCP') {
                    desc = '色空間・ガンマ補正プロファイル情報';
                }

                chunks.push({ offset, type, length, desc, isData, isMetadata });
                offset += 12 + length;
                if (type === 'IEND' || length > bytes.length) break;
            }
        }
        // 2. JPEG (FF D8)
        else if (bytes.length > 2 && bytes[0] === 0xFF && bytes[1] === 0xD8) {
            let offset = 0;
            while (offset < bytes.length - 1) {
                if (bytes[offset] !== 0xFF) {
                    offset++;
                    continue;
                }
                const marker = bytes[offset + 1];
                if (marker === 0xD8) {
                    chunks.push({ offset, type: 'SOI (FFD8)', length: 2, desc: 'Start of Image (JPEG画像開始マーカー)', isData: false, isMetadata: false });
                    offset += 2;
                } else if (marker === 0xD9) {
                    chunks.push({ offset, type: 'EOI (FFD9)', length: 2, desc: 'End of Image (JPEG画像終了マーカー)', isData: false, isMetadata: false });
                    break;
                } else if (marker === 0xDA) {
                    const segLen = offset + 3 < bytes.length ? view.getUint16(offset + 2, false) : 0;
                    chunks.push({ offset, type: 'SOS (FFDA)', length: segLen, desc: 'Start of Scan (スキャンヘッダ：これ以降に圧縮MCUブロックが連続)', isData: false, isMetadata: false });
                    const dataStart = offset + 2 + segLen;
                    const dataLen = Math.max(0, bytes.length - dataStart - 2);
                    chunks.push({ offset: dataStart, type: 'MCU Scan Data', length: dataLen, desc: 'ハフマン符号化された8×8 DCT量子化データ本体', isData: true, isMetadata: false });
                    break;
                } else if (marker >= 0xC0 && marker <= 0xFE && offset + 3 < bytes.length) {
                    const segLen = view.getUint16(offset + 2, false);
                    let name = `MARKER (FF${marker.toString(16).toUpperCase()})`;
                    let desc = 'JPEGセグメントデータ';
                    let isMetadata = false;
                    if (marker === 0xE0) { name = 'APP0 (JFIF)'; desc = 'JFIFヘッダ・解像度情報'; }
                    else if (marker === 0xE1) { name = 'APP1 (Exif/XMP)'; desc = 'カメラ撮影情報・メタデータ'; isMetadata = true; }
                    else if (marker === 0xDB) { name = 'DQT (FFDB)'; desc = '量子化テーブル (画質と圧縮率を決める重要データ)'; }
                    else if (marker === 0xC0) { name = 'SOF0 (FFC0)'; desc = 'フレームヘッダ (画像幅・高さ・YCbCrサブサンプリング情報)'; }
                    else if (marker === 0xC2) { name = 'SOF2 (FFC2)'; desc = 'プログレッシブJPEG フレームヘッダ'; }
                    else if (marker === 0xC4) { name = 'DHT (FFC4)'; desc = 'ハフマン符号化テーブル (復号用辞書データ)'; }

                    chunks.push({ offset, type: name, length: segLen, desc, isData: false, isMetadata });
                    offset += 2 + Math.max(2, segLen);
                } else {
                    offset += 2;
                }
            }
        }
        // 3. WebP (RIFF .... WEBP)
        else if (bytes.length > 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57 && bytes[9] === 0x45) {
            chunks.push({ offset: 0, type: 'RIFF Header', length: 12, desc: 'RIFFコンテナヘッダ (WEBP識別子)', isData: false, isMetadata: false });
            let offset = 12;
            while (offset + 8 <= bytes.length) {
                const type = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
                const length = view.getUint32(offset + 4, true);
                const isData = (type === 'VP8 ' || type === 'VP8L');
                let isMetadata = false;
                let desc = 'WebPチャンクデータ';
                if (type === 'VP8 ') desc = '非可逆圧縮ビットストリーム本体 (Lossy)';
                else if (type === 'VP8L') desc = '可逆圧縮ビットストリーム本体 (Lossless)';
                else if (type === 'VP8X') desc = '拡張WebPヘッダ (アニメーション・透明度フラグ等)';
                else if (type === 'ALPH') desc = 'アルファチャンネル(透明度)圧縮データ';
                else if (type === 'EXIF') { desc = 'カメラ撮影情報・メタデータ'; isMetadata = true; }
                else if (type === 'ICCP') desc = 'ICCカラープロファイル情報';
                else if (type === 'XMP ') { desc = 'XMPメタデータ'; isMetadata = true; }

                chunks.push({ offset, type, length, desc, isData, isMetadata });
                offset += 8 + length + (length % 2);
                if (length > bytes.length) break;
            }
        } else {
            chunks.push({ offset: 0, type: 'RAW STREAM', length: bytes.length, desc: '圧縮バイナリストリーム全体', isData: true, isMetadata: false });
        }

        // どの形式でもメタデータが検出されなかった場合は、本来メタデータが配置される位置に0Bのメタデータを挿入
        if (!chunks.some(c => c.isMetadata)) {
            let metaType = 'EXIF';
            let insertIdx = chunks.length;

            if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
                // PNG: IHDRの直後（または最初のIDATの直前）
                metaType = 'eXIf';
                const idatIdx = chunks.findIndex(c => c.type === 'IDAT');
                const ihdrIdx = chunks.findIndex(c => c.type === 'IHDR');
                insertIdx = idatIdx !== -1 ? idatIdx : (ihdrIdx !== -1 ? ihdrIdx + 1 : chunks.length);
            } else if (bytes.length > 2 && bytes[0] === 0xFF && bytes[1] === 0xD8) {
                // JPEG: APP0の直後（なければSOIの直後）
                metaType = 'APP1 (Exif/XMP)';
                const app0Idx = chunks.findIndex(c => c.type === 'APP0 (JFIF)');
                const soiIdx = chunks.findIndex(c => c.type === 'SOI (FFD8)');
                insertIdx = app0Idx !== -1 ? app0Idx + 1 : (soiIdx !== -1 ? soiIdx + 1 : 0);
            } else if (bytes.length > 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57 && bytes[9] === 0x45) {
                // WebP: RIFF Header / VP8Xの直後（ビットストリームの前）
                metaType = 'EXIF';
                const vp8xIdx = chunks.findIndex(c => c.type === 'VP8X');
                const riffIdx = chunks.findIndex(c => c.type === 'RIFF Header');
                insertIdx = vp8xIdx !== -1 ? vp8xIdx + 1 : (riffIdx !== -1 ? riffIdx + 1 : 0);
            }

            const refOffset = insertIdx < chunks.length ? chunks[insertIdx].offset : bytes.length;
            chunks.splice(insertIdx, 0, {
                offset: refOffset,
                type: metaType,
                length: 0,
                desc: 'カメラ撮影情報・メタデータ',
                isData: false,
                isMetadata: true
            });
        }

        return chunks;
    }

    function renderPipelineLogs(logs) {
        const container = document.getElementById('dashMemPipelineSteps');
        if (!container) return;
        container.innerHTML = logs.map(log => `
            <div class="border-l-2 border-slate-300 pl-3 py-0.5">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-slate-500">[+${escapeHtml(log.elapsed)}ms]</span>
                    <span class="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold">${escapeHtml(log.step)}</span>
                    <span class="font-bold ${log.highlight}">${escapeHtml(log.title)}</span>
                </div>
                <div class="text-slate-600 mt-1 pl-1">${escapeHtml(log.detail)}</div>
            </div>
        `).join('');

        const logWrapper = document.getElementById('dashMemPipelineLog');
        if (logWrapper) {
            logWrapper.scrollTop = 0;
            requestAnimationFrame(() => {
                logWrapper.scrollTop = 0;
            });
        }
    }

    function renderChunkList(chunks) {
        const container = document.getElementById('dashMemChunkList');
        if (!container) return;
        const displayChunks = chunks.slice(0, 100);

        let html = displayChunks.map((c, idx) => `
            <div class="p-2.5 rounded-xl border ${c.isData ? 'bg-blue-50/70 border-blue-200' : 'bg-slate-50 border-slate-200'} flex items-center justify-between gap-2.5">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-[10px] font-mono text-slate-500">#${idx + 1}</span>
                        <span class="font-mono text-xs font-bold ${c.isData ? 'text-blue-700' : 'text-slate-900'}">${escapeHtml(c.type)}</span>
                        <span class="text-[10px] font-mono text-slate-500">Offset: 0x${c.offset.toString(16).toUpperCase().padStart(6, '0')}</span>
                        <span class="font-mono text-[10px] font-semibold ${c.isData ? 'text-blue-700 bg-blue-100' : 'text-slate-600 bg-slate-200'} px-1.5 py-0.5 rounded">
                            ${c.length.toLocaleString()} B
                        </span>
                    </div>
                    <p class="text-[11px] text-slate-600 mt-1 truncate" title="${escapeHtml(c.desc)}">${escapeHtml(c.desc)}</p>
                </div>
                <label class="shrink-0 inline-flex items-center gap-1.5 cursor-pointer select-none pl-1">
                    <input type="checkbox" class="sr-only peer dash-chunk-toggle" data-is-metadata="${c.isMetadata ? 'true' : 'false'}">
                    <div class="relative w-7 h-4 bg-slate-300 rounded-full peer peer-checked:bg-blue-600 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-3"></div>
                    <span class="text-[10px] font-medium text-slate-600 whitespace-nowrap">圧縮キューに追加</span>
                </label>
            </div>
        `).join('');

        if (chunks.length > 100) {
            html += `<div class="text-center text-xs text-slate-500 py-2">...他 ${chunks.length - 100} 個のチャンクを省略しました</div>`;
        }
        container.innerHTML = html;
    }

    function renderMemoryDump(rawRgbaData, samplePixelCount, fullWidth, fullHeight) {
        const container = document.getElementById('dashMemDumpList');
        if (!container) return;

        const totalPixels = fullWidth * fullHeight;
        const maxDisplay = Math.min(60, samplePixelCount, totalPixels);

        let html = '';
        for (let i = 0; i < maxDisplay; i++) {
            const bIdx = i * 4;
            const r = rawRgbaData[bIdx];
            const g = rawRgbaData[bIdx + 1];
            const b = rawRgbaData[bIdx + 2];
            const a = rawRgbaData[bIdx + 3];

            const x = i % fullWidth;
            const y = Math.floor(i / fullWidth);

            const addrHex = '0x' + bIdx.toString(16).toUpperCase().padStart(8, '0');
            const hexBytes = [r, g, b, a].map(v => v.toString(16).toUpperCase().padStart(2, '0')).join(' ');
            const rgbaCss = `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;

            html += `
                <div class="grid grid-cols-12 items-center px-3 py-1.5 hover:bg-slate-100 transition text-[11px]">
                    <div class="col-span-3 text-slate-500 truncate">${addrHex}</div>
                    <div class="col-span-2 text-slate-600">(${x},${y})</div>
                    <div class="col-span-4 text-amber-700 font-semibold">${hexBytes}</div>
                    <div class="col-span-3 flex items-center gap-1.5 min-w-0">
                        <span class="w-3.5 h-3.5 rounded border border-slate-300 shrink-0" style="background-color: ${rgbaCss};"></span>
                        <span class="text-slate-700 truncate text-[10px]">${r},${g},${b},${a}</span>
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
    }

    function loadImageFromFile(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => resolve({ img, url });
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Image decode failed'));
            };
            img.src = url;
        });
    }

    function clearDashboardMemoryErrors() {
        const chunkError = document.getElementById('dashMemChunkError');
        const pixelError = document.getElementById('dashMemPixelError');
        if (chunkError) {
            chunkError.textContent = '';
            chunkError.classList.add('hidden');
        }
        if (pixelError) {
            pixelError.textContent = '';
            pixelError.classList.add('hidden');
        }
    }

    function validateDashboardMemoryInputs() {
        clearDashboardMemoryErrors();
        let isValid = true;

        const chunkError = document.getElementById('dashMemChunkError');
        const pixelError = document.getElementById('dashMemPixelError');
        const pixelInput = document.getElementById('dashMemTotalPixelsInput');

        // 1. 「ファイル内部の「チャンク / セグメント」構造」トグル検証
        const toggles = Array.from(document.querySelectorAll('#dashMemChunkList .dash-chunk-toggle'));
        if (toggles.length === 0 || currentExpectedTotalPixels === null) {
            if (chunkError) {
                chunkError.textContent = '画像のメモリ展開解析が完了していません。';
                chunkError.classList.remove('hidden');
            }
            return false;
        }

        const hasInvalidNonMetadata = toggles.some(t => t.dataset.isMetadata !== 'true' && t.checked);
        const metadataToggles = toggles.filter(t => t.dataset.isMetadata === 'true');
        const hasUncheckedMetadata = metadataToggles.length === 0 || metadataToggles.some(t => !t.checked);

        if (hasInvalidNonMetadata) {
            if (chunkError) {
                chunkError.textContent = '消すと画像が破損するチャンクが圧縮キューに指定されています。メタデータ以外の項目は解除してください。';
                chunkError.classList.remove('hidden');
            }
            isValid = false;
        } else if (hasUncheckedMetadata) {
            if (chunkError) {
                chunkError.textContent = '「カメラ撮影情報・メタデータ」は削除するため圧縮キューに追加してください。';
                chunkError.classList.remove('hidden');
            }
            isValid = false;
        }

        // 2. 「RAM上の生ピクセル配列」総ピクセル数入力検証
        const rawVal = pixelInput ? pixelInput.value.replace(/,/g, '').trim() : '';
        if (!rawVal) {
            if (pixelError) {
                pixelError.textContent = '総ピクセル数（幅 × 高さ）を計算して入力してください。';
                pixelError.classList.remove('hidden');
            }
            isValid = false;
        } else if (!/^\d+$/.test(rawVal) || Number(rawVal) !== currentExpectedTotalPixels) {
            if (pixelError) {
                pixelError.textContent = '総ピクセル数が正しくありません。画像の解像度（幅 × 高さ）から正しい値を計算して入力してください。';
                pixelError.classList.remove('hidden');
            }
            isValid = false;
        }

        return isValid;
    }

    async function renderDashboardMemoryView() {
        const panel = document.getElementById('dashboardMemoryVisualizer');
        if (!panel) return;

        currentExpectedTotalPixels = null;
        clearDashboardMemoryErrors();

        const pixelInput = document.getElementById('dashMemTotalPixelsInput');
        if (pixelInput) {
            pixelInput.value = '';
        }

        const file = REICHINS.state.selectedFile;
        const profile = getFormatProfile(REICHINS.state.currentSelectedFormat);

        const formatBadge = document.getElementById('dashMemFormatBadge');
        if (formatBadge) {
            formatBadge.textContent = `${profile.extLabel} (${profile.key})`;
        }

        if (!file) {
            panel.classList.add('hidden');
            return;
        }
        panel.classList.remove('hidden');

        const renderId = ++currentRenderId;
        const tStart = performance.now();

        try {
            const arrayBuffer = await file.arrayBuffer();
            if (renderId !== currentRenderId) return;

            const view = new DataView(arrayBuffer);
            const bytes = new Uint8Array(arrayBuffer);

            const logs = [];
            const addLog = (step, title, detail, highlight = 'text-slate-800') => {
                const elapsed = (performance.now() - tStart).toFixed(2);
                logs.push({ elapsed, step, title, detail, highlight });
            };

            const headBytes = Array.from(bytes.slice(0, 8))
                .map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase())
                .join(' ');

            addLog(
                'STEP 1',
                'バイナリ読み込み (File -> ArrayBuffer)',
                `ディスクから圧縮状態のバイナリ ${bytes.length.toLocaleString()} bytes をメモリ上の連続領域にロードしました。先頭8バイト: [${headBytes}]`,
                'text-blue-700'
            );

            const chunks = parseBinaryStructure(view, bytes);
            renderChunkList(chunks);

            const dataChunksCount = chunks.filter(c => c.isData).length;
            addLog(
                'STEP 2',
                `ヘッダ ＆ チャンク構造のパース完了 (${profile.extLabel})`,
                `ファイル内に計 ${chunks.length} 個のチャンク/セグメントを検出しました（画像データ本体: ${dataChunksCount}個）。メタデータと圧縮ストリームの境界を特定。`,
                'text-slate-900'
            );

            const { img, url } = await loadImageFromFile(file);
            if (renderId !== currentRenderId) {
                URL.revokeObjectURL(url);
                return;
            }

            const w = img.naturalWidth || 1;
            const h = img.naturalHeight || 1;
            const totalPixels = w * h;
            const totalRamBytes = totalPixels * 4;
            currentExpectedTotalPixels = totalPixels;

            addLog(
                'STEP 3',
                'エントロピー復号 ＆ メモリ領域確保 (malloc)',
                `${profile.decodeMethod} を展開するため、RAM上に生ピクセル配列用のメモリを確保します。計算式: 幅(${w}px) × 高さ(${h}px) × 4ch(RGBA) = ${totalRamBytes.toLocaleString()} bytes`,
                'text-amber-700'
            );

            let sampleRgba;
            let samplePixelCount = Math.min(totalPixels, 60);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            try {
                canvas.width = w;
                canvas.height = h;
                ctx.drawImage(img, 0, 0, w, h);
                const rowsNeeded = Math.min(h, Math.ceil(samplePixelCount / w));
                sampleRgba = ctx.getImageData(0, 0, w, rowsNeeded).data;
            } catch (_) {
                const safeW = Math.min(w, 60);
                samplePixelCount = safeW;
                canvas.width = safeW;
                canvas.height = 1;
                ctx.drawImage(img, 0, 0, safeW, 1, 0, 0, safeW, 1);
                sampleRgba = ctx.getImageData(0, 0, safeW, 1).data;
            } finally {
                URL.revokeObjectURL(url);
            }

            const expansionRatio = bytes.length > 0 ? (totalRamBytes / bytes.length).toFixed(1) : '0.0';
            addLog(
                'STEP 4',
                `RAM上への生ビットマップ展開完了 (${profile.colorSource} -> RGBA)`,
                `圧縮が完全に解かれ、メモリ上に ${totalRamBytes.toLocaleString()} bytes の生配列が展開されました！元の圧縮ファイルと比較してメモリ上で【約 ${expansionRatio} 倍】に膨張しています。`,
                'text-amber-700'
            );

            renderMemoryDump(sampleRgba, samplePixelCount, w, h);
            renderPipelineLogs(logs);

            const totalMs = (performance.now() - tStart).toFixed(2);
            const timeBadge = document.getElementById('dashMemProcessTime');
            if (timeBadge) {
                timeBadge.textContent = `展開時間: ${totalMs} ms`;
            }

            const statInputSize = document.getElementById('dashMemInputSize');
            const statInputMeta = document.getElementById('dashMemInputMeta');
            const statRamSize = document.getElementById('dashMemRamSize');
            const statRamMeta = document.getElementById('dashMemRamMeta');

            if (statInputSize) statInputSize.textContent = formatBytesWithRaw(bytes.length);
            if (statInputMeta) statInputMeta.textContent = `${file.type || profile.extLabel} | ${w}×${h}px`;
            if (statRamSize) statRamSize.textContent = formatBytesWithRaw(totalRamBytes);
            if (statRamMeta) statRamMeta.textContent = `圧縮時の ${expansionRatio}倍 に膨張 (${w}×${h}×4ch)`;
        } catch (_) {
            if (renderId !== currentRenderId) return;
            const logEl = document.getElementById('dashMemPipelineSteps');
            if (logEl) {
                logEl.innerHTML = '<div class="text-rose-600">画像のメモリ展開解析中にエラーが発生しました。</div>';
            }
        }
    }

    REICHINS.renderDashboardMemoryView = renderDashboardMemoryView;
    REICHINS.validateDashboardMemoryInputs = validateDashboardMemoryInputs;
})();
