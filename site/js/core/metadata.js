(() => {
    const REICHINS = window.REICHINS = window.REICHINS || {};

    // CRC32計算テーブル（PNGチャンク用）
    let crcTable = null;
    function getCrcTable() {
        if (crcTable) return crcTable;
        crcTable = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) {
                if (c & 1) c = 0xedb88320 ^ (c >>> 1);
                else c = c >>> 1;
            }
            crcTable[n] = c;
        }
        return crcTable;
    }

    function calculateCrc(buf, offset, length) {
        const table = getCrcTable();
        let c = 0xffffffff;
        for (let i = 0; i < length; i++) {
            c = table[(c ^ buf[offset + i]) & 0xff] ^ (c >>> 8);
        }
        return (c ^ 0xffffffff) >>> 0;
    }

    // Windowsのプロパティ詳細タブ（タイトル・作成者・プログラム名・著作権・コメント）が直接解釈できる正規のTIFF/Exifバイナリを構築
    function buildWindowsExifPayload() {
        const encoder = new TextEncoder();
        const titleBytes = encoder.encode("REICHINS Compressed Graphic\0");
        const authorBytes = encoder.encode("REICHINS\0");
        const softwareBytes = encoder.encode("REICHINS\0");
        const copyrightBytes = encoder.encode("REICHINS\0");

        // Exif UserComment (タグ 0x9286): 8バイトヘッダー ('ASCII\0\0\0') + 文字列
        const commentPrefix = new Uint8Array([0x41, 0x53, 0x43, 0x49, 0x49, 0x00, 0x00, 0x00]); // "ASCII\0\0\0"
        const commentBody = encoder.encode("Processed by REICHINS");
        const userCommentBytes = new Uint8Array(commentPrefix.length + commentBody.length);
        userCommentBytes.set(commentPrefix, 0);
        userCommentBytes.set(commentBody, commentPrefix.length);

        // IFD0: 5 tags (ImageDescription, Software, Artist, ExifIFDPointer, Copyright)
        const ifd0EntryCount = 5;
        const ifd0Size = 2 + (ifd0EntryCount * 12) + 4; // 2 + 60 + 4 = 66
        const ifd0Offset = 8; // TIFFヘッダー直後

        // Exif SubIFD: 1 tag (UserComment)
        const exifIfdEntryCount = 1;
        const exifIfdSize = 2 + (exifIfdEntryCount * 12) + 4; // 2 + 12 + 4 = 18
        const exifIfdOffset = ifd0Offset + ifd0Size; // 8 + 66 = 74

        // データ領域オフセット
        let dataOffset = exifIfdOffset + exifIfdSize; // 74 + 18 = 92
        const titleOffset = dataOffset; dataOffset += titleBytes.length;
        const softwareOffset = dataOffset; dataOffset += softwareBytes.length;
        const authorOffset = dataOffset; dataOffset += authorBytes.length;
        const copyrightOffset = dataOffset; dataOffset += copyrightBytes.length;
        const commentOffset = dataOffset; dataOffset += userCommentBytes.length;

        const tiffBuf = new Uint8Array(dataOffset);
        const view = new DataView(tiffBuf.buffer);

        // TIFF Header (Little Endian: 'II' = 0x4949)
        view.setUint16(0, 0x4949, true);
        view.setUint16(2, 42, true);
        view.setUint32(4, ifd0Offset, true);

        // --- IFD0 ---
        view.setUint16(ifd0Offset, ifd0EntryCount, true);
        let p = ifd0Offset + 2;

        function writeTag(tag, type, count, valOrOffset) {
            view.setUint16(p, tag, true);
            view.setUint16(p + 2, type, true);
            view.setUint32(p + 4, count, true);
            view.setUint32(p + 8, valOrOffset, true);
            p += 12;
        }

        // 0x010E: ImageDescription (タイトル) - ASCII (Type 2)
        writeTag(0x010E, 2, titleBytes.length, titleOffset);
        // 0x0131: Software (プログラム名) - ASCII (Type 2)
        writeTag(0x0131, 2, softwareBytes.length, softwareOffset);
        // 0x013B: Artist (作成者) - ASCII (Type 2)
        writeTag(0x013B, 2, authorBytes.length, authorOffset);
        // 0x8769: ExifIFDPointer (LONG - Type 4)
        writeTag(0x8769, 4, 1, exifIfdOffset);
        // 0x8298: Copyright (著作権) - ASCII (Type 2)
        writeTag(0x8298, 2, copyrightBytes.length, copyrightOffset);
        // Next IFD Offset = 0
        view.setUint32(p, 0, true);

        // --- Exif SubIFD ---
        view.setUint16(exifIfdOffset, exifIfdEntryCount, true);
        p = exifIfdOffset + 2;
        // 0x9286: UserComment (コメント) - UNDEFINED (Type 7)
        writeTag(0x9286, 7, userCommentBytes.length, commentOffset);
        // Next IFD Offset = 0
        view.setUint32(p, 0, true);

        // データ値のコピー
        tiffBuf.set(titleBytes, titleOffset);
        tiffBuf.set(softwareBytes, softwareOffset);
        tiffBuf.set(authorBytes, authorOffset);
        tiffBuf.set(copyrightBytes, copyrightOffset);
        tiffBuf.set(userCommentBytes, commentOffset);

        return tiffBuf;
    }

    // JPEG/PNG画像バイナリにあらゆるメタデータ領域（Windowsプロパティ対応Exif/eXIf、COM、IPTC、tEXt、iTXt等）を活用してライヒンスクレジットを多重挿入するエンジン
    async function injectCreditMetadata(blob) {
        try {
            const arrayBuffer = await blob.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            const encoder = new TextEncoder();
            const tiffData = buildWindowsExifPayload();

            // ----------------------------------------------------
            // 1. JPEG形式の多重メタデータ注入 (Windows詳細プロパティExif + 多重COM + IPTC)
            // ----------------------------------------------------
            if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xD8) {
                const segments = [];

                // Windowsプロパティ用 APP1 Exif セグメント (0xFF 0xE1 + Length + "Exif\0\0" + TIFF)
                const exifHeader = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]); // "Exif\0\0"
                const app1Len = 2 + exifHeader.length + tiffData.length;
                const app1Seg = new Uint8Array(2 + app1Len);
                app1Seg[0] = 0xFF;
                app1Seg[1] = 0xE1;
                app1Seg[2] = (app1Len >> 8) & 0xFF;
                app1Seg[3] = app1Len & 0xFF;
                app1Seg.set(exifHeader, 4);
                app1Seg.set(tiffData, 4 + exifHeader.length);
                segments.push(app1Seg);

                // COMセグメント生成ヘルパー (0xFF 0xFE + Length + Data)
                function makeComSegment(text) {
                    const tBytes = encoder.encode(text);
                    const segLen = tBytes.length + 2;
                    const seg = new Uint8Array(4 + tBytes.length);
                    seg[0] = 0xFF;
                    seg[1] = 0xFE;
                    seg[2] = (segLen >> 8) & 0xFF;
                    seg[3] = segLen & 0xFF;
                    seg.set(tBytes, 4);
                    return seg;
                }

                // APPnセグメント生成ヘルパー
                function makeAppSegment(markerByte, headerStr, payloadStr) {
                    const hBytes = encoder.encode(headerStr);
                    const pBytes = encoder.encode(payloadStr);
                    const contentLen = hBytes.length + 1 + pBytes.length;
                    const segLen = contentLen + 2;
                    const seg = new Uint8Array(4 + contentLen);
                    seg[0] = 0xFF;
                    seg[1] = markerByte;
                    seg[2] = (segLen >> 8) & 0xFF;
                    seg[3] = segLen & 0xFF;
                    seg.set(hBytes, 4);
                    seg[4 + hBytes.length] = 0x00;
                    seg.set(pBytes, 4 + hBytes.length + 1);
                    return seg;
                }

                segments.push(makeComSegment("Processed and verified by REICHINS Image Core"));
                segments.push(makeComSegment("Author: REICHINS Content Engine"));
                segments.push(makeComSegment("Software: REICHINS Optimization Suite"));
                segments.push(makeComSegment("Copyright: REICHINS Media Pipeline"));
                segments.push(makeComSegment("Digital Signature: [REICHINS-DIGITAL-STAMP-OK]"));
                segments.push(makeAppSegment(0xED, "Photoshop 3.0", "IPTC: By-line=REICHINS; Source=REICHINS; Caption=REICHINS Processed Media"));

                let extraLen = 0;
                segments.forEach(s => extraLen += s.length);

                const combined = new Uint8Array(bytes.length + extraLen);
                combined.set(bytes.subarray(0, 2), 0); // SOI (0xFF, 0xD8)
                let currentOffset = 2;
                for (const seg of segments) {
                    combined.set(seg, currentOffset);
                    currentOffset += seg.length;
                }
                combined.set(bytes.subarray(2), currentOffset);

                return new Blob([combined], { type: 'image/jpeg' });
            }

            // ----------------------------------------------------
            // 2. PNG形式の多重メタデータ注入 (Windowsプロパティ用 eXIf チャンク + 各種 tEXt / iTXt)
            // ----------------------------------------------------
            if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
                const pngChunks = [];

                // Windowsプロパティ詳細が読み取る公式 PNG eXIf チャンクの生成
                function makeExifChunk(rawTiff) {
                    const dataLen = rawTiff.length;
                    const chunk = new Uint8Array(12 + dataLen);
                    chunk[0] = (dataLen >> 24) & 0xFF;
                    chunk[1] = (dataLen >> 16) & 0xFF;
                    chunk[2] = (dataLen >> 8) & 0xFF;
                    chunk[3] = dataLen & 0xFF;
                    // Type: 'eXIf' (0x65, 0x58, 0x49, 0x66)
                    chunk[4] = 0x65; chunk[5] = 0x58; chunk[6] = 0x49; chunk[7] = 0x66;
                    chunk.set(rawTiff, 8);
                    const crc = calculateCrc(chunk, 4, 4 + dataLen);
                    const crcPos = 8 + dataLen;
                    chunk[crcPos] = (crc >> 24) & 0xFF;
                    chunk[crcPos + 1] = (crc >> 16) & 0xFF;
                    chunk[crcPos + 2] = (crc >> 8) & 0xFF;
                    chunk[crcPos + 3] = crc & 0xFF;
                    return chunk;
                }

                // Windowsが認識するeXIfチャンクを追加
                pngChunks.push(makeExifChunk(tiffData));

                // tEXtチャンク生成ヘルパー
                function makeTextChunk(keyword, value) {
                    const kwBytes = encoder.encode(keyword);
                    const valBytes = encoder.encode(value);
                    const dataLen = kwBytes.length + 1 + valBytes.length;
                    const chunk = new Uint8Array(12 + dataLen);

                    chunk[0] = (dataLen >> 24) & 0xFF;
                    chunk[1] = (dataLen >> 16) & 0xFF;
                    chunk[2] = (dataLen >> 8) & 0xFF;
                    chunk[3] = dataLen & 0xFF;

                    // Type: 'tEXt'
                    chunk[4] = 0x74; chunk[5] = 0x45; chunk[6] = 0x58; chunk[7] = 0x74;

                    chunk.set(kwBytes, 8);
                    chunk[8 + kwBytes.length] = 0;
                    chunk.set(valBytes, 8 + kwBytes.length + 1);

                    const crc = calculateCrc(chunk, 4, 4 + dataLen);
                    const crcPos = 8 + dataLen;
                    chunk[crcPos] = (crc >> 24) & 0xFF;
                    chunk[crcPos + 1] = (crc >> 16) & 0xFF;
                    chunk[crcPos + 2] = (crc >> 8) & 0xFF;
                    chunk[crcPos + 3] = crc & 0xFF;
                    return chunk;
                }

                // iTXt (International Text) チャンク生成ヘルパー
                function makeITxtChunk(keyword, value) {
                    const kwBytes = encoder.encode(keyword);
                    const valBytes = encoder.encode(value);
                    const dataLen = kwBytes.length + 5 + valBytes.length;
                    const chunk = new Uint8Array(12 + dataLen);

                    chunk[0] = (dataLen >> 24) & 0xFF;
                    chunk[1] = (dataLen >> 16) & 0xFF;
                    chunk[2] = (dataLen >> 8) & 0xFF;
                    chunk[3] = dataLen & 0xFF;

                    // Type: 'iTXt'
                    chunk[4] = 0x69; chunk[5] = 0x54; chunk[6] = 0x58; chunk[7] = 0x74;

                    let pos = 8;
                    chunk.set(kwBytes, pos);
                    pos += kwBytes.length;
                    chunk[pos++] = 0x00;
                    chunk[pos++] = 0x00;
                    chunk[pos++] = 0x00;
                    chunk[pos++] = 0x00;
                    chunk[pos++] = 0x00;
                    chunk.set(valBytes, pos);

                    const crc = calculateCrc(chunk, 4, 4 + dataLen);
                    const crcPos = 8 + dataLen;
                    chunk[crcPos] = (crc >> 24) & 0xFF;
                    chunk[crcPos + 1] = (crc >> 16) & 0xFF;
                    chunk[crcPos + 2] = (crc >> 8) & 0xFF;
                    chunk[crcPos + 3] = crc & 0xFF;
                    return chunk;
                }

                // 補助メタデータも併せて注入
                pngChunks.push(makeTextChunk("Software", "REICHINS"));
                pngChunks.push(makeTextChunk("Author", "REICHINS"));
                pngChunks.push(makeTextChunk("Title", "REICHINS Compressed Graphic"));
                pngChunks.push(makeTextChunk("Description", "Optimized with REICHINS high-density algorithms"));
                pngChunks.push(makeTextChunk("Comment", "Processed by REICHINS"));
                pngChunks.push(makeTextChunk("Copyright", "REICHINS"));
                pngChunks.push(makeTextChunk("Source", "REICHINS"));
                pngChunks.push(makeITxtChunk("Disclaimer", "This asset has been formatted through REICHINS"));

                let totalExtra = 0;
                pngChunks.forEach(c => totalExtra += c.length);

                // IHDRチャンク（最初の33バイト）の直後に挿入
                const insertPos = bytes.length >= 33 ? 33 : 8;
                const combined = new Uint8Array(bytes.length + totalExtra);
                combined.set(bytes.subarray(0, insertPos), 0);

                let cOffset = insertPos;
                for (const chunk of pngChunks) {
                    combined.set(chunk, cOffset);
                    cOffset += chunk.length;
                }
                combined.set(bytes.subarray(insertPos), cOffset);

                return new Blob([combined], { type: blob.type || 'image/png' });
            }

            return blob;
        } catch (err) {
            return blob;
        }
    }

    function isValidCalendarDate(year, month, day) {
        if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
        if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1) return false;
        const isLeap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
        const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        return day <= daysInMonth[month - 1];
    }

    function parseMetadataDateString(raw) {
        if (!raw || typeof raw !== 'string') return null;
        const cleaned = raw.replace(/\0/g, '').trim();
        if (!cleaned) return null;

        const numericMatch = cleaned.match(/(\d{4})[:\-\/](\d{1,2})[:\-\/](\d{1,2})/);
        if (numericMatch) {
            const year = parseInt(numericMatch[1], 10);
            const month = parseInt(numericMatch[2], 10);
            const day = parseInt(numericMatch[3], 10);
            if (isValidCalendarDate(year, month, day)) {
                return { year, month, day };
            }
        }

        const monthMap = {
            jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
            jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
        };

        const rfcMatch = cleaned.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/i);
        if (rfcMatch) {
            const day = parseInt(rfcMatch[1], 10);
            const month = monthMap[rfcMatch[2].slice(0, 3).toLowerCase()];
            const year = parseInt(rfcMatch[3], 10);
            if (isValidCalendarDate(year, month, day)) {
                return { year, month, day };
            }
        }

        const usMatch = cleaned.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b/i);
        if (usMatch) {
            const month = monthMap[usMatch[1].slice(0, 3).toLowerCase()];
            const day = parseInt(usMatch[2], 10);
            const year = parseInt(usMatch[3], 10);
            if (isValidCalendarDate(year, month, day)) {
                return { year, month, day };
            }
        }

        return null;
    }

    function decodeAscii(bytes, start, length) {
        let end = start + length;
        if (end > bytes.length) end = bytes.length;
        let out = '';
        for (let i = start; i < end; i++) {
            const code = bytes[i];
            if (code === 0) break;
            out += String.fromCharCode(code);
        }
        return out;
    }

    function extractDatesFromTiff(bytes, tiffStart) {
        const result = {
            dateTimeOriginal: null,
            dateTimeDigitized: null,
            dateTime: null
        };
        if (tiffStart < 0 || tiffStart + 8 > bytes.length) return result;

        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const byteOrder = view.getUint16(tiffStart, false);
        let littleEndian;
        if (byteOrder === 0x4949) littleEndian = true;
        else if (byteOrder === 0x4D4D) littleEndian = false;
        else return result;

        if (view.getUint16(tiffStart + 2, littleEndian) !== 42) return result;

        const ifd0RelOffset = view.getUint32(tiffStart + 4, littleEndian);

        function readIfdAscii(entryOffset, count) {
            if (count <= 0 || count > 256) return null;
            if (count <= 4) {
                return decodeAscii(bytes, entryOffset + 8, count);
            }
            const relOffset = view.getUint32(entryOffset + 8, littleEndian);
            const absOffset = tiffStart + relOffset;
            if (absOffset < tiffStart || absOffset >= bytes.length) return null;
            return decodeAscii(bytes, absOffset, count);
        }

        function readIfd(relOffset) {
            const absOffset = tiffStart + relOffset;
            if (relOffset === 0 || absOffset < tiffStart || absOffset + 2 > bytes.length) return [];
            const entryCount = view.getUint16(absOffset, littleEndian);
            const entries = [];
            for (let i = 0; i < entryCount; i++) {
                const entryOffset = absOffset + 2 + i * 12;
                if (entryOffset + 12 > bytes.length) break;
                const tag = view.getUint16(entryOffset, littleEndian);
                const type = view.getUint16(entryOffset + 2, littleEndian);
                const count = view.getUint32(entryOffset + 4, littleEndian);
                entries.push({ tag, type, count, entryOffset });
            }
            return entries;
        }

        let exifSubIfdOffset = 0;
        const ifd0Entries = readIfd(ifd0RelOffset);
        for (const entry of ifd0Entries) {
            if (entry.tag === 0x0132 && entry.type === 2) {
                const parsed = parseMetadataDateString(readIfdAscii(entry.entryOffset, entry.count));
                if (parsed) result.dateTime = parsed;
            } else if (entry.tag === 0x8769 && (entry.type === 4 || entry.type === 3)) {
                exifSubIfdOffset = entry.type === 4
                    ? view.getUint32(entry.entryOffset + 8, littleEndian)
                    : view.getUint16(entry.entryOffset + 8, littleEndian);
            }
        }

        if (exifSubIfdOffset > 0) {
            const exifEntries = readIfd(exifSubIfdOffset);
            for (const entry of exifEntries) {
                if (entry.tag === 0x9003 && entry.type === 2) {
                    const parsed = parseMetadataDateString(readIfdAscii(entry.entryOffset, entry.count));
                    if (parsed) result.dateTimeOriginal = parsed;
                } else if (entry.tag === 0x9004 && entry.type === 2) {
                    const parsed = parseMetadataDateString(readIfdAscii(entry.entryOffset, entry.count));
                    if (parsed) result.dateTimeDigitized = parsed;
                }
            }
        }

        return result;
    }

    function extractDatesFromXmp(xmlText) {
        const result = {
            creationDate: null,
            digitizedDate: null,
            modifyDate: null
        };
        if (!xmlText) return result;

        function readXmpTag(tagName) {
            const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const attrMatch = xmlText.match(new RegExp(`\\b${escaped}\\s*=\\s*["']([^"']+)["']`, 'i'));
            if (attrMatch) {
                const parsed = parseMetadataDateString(attrMatch[1]);
                if (parsed) return parsed;
            }
            const elemMatch = xmlText.match(new RegExp(`<${escaped}\\b[^>]*>([^<]+)</${escaped}>`, 'i'));
            if (elemMatch) {
                const parsed = parseMetadataDateString(elemMatch[1]);
                if (parsed) return parsed;
            }
            const rdfMatch = xmlText.match(new RegExp(`<${escaped}\\b[^>]*>[\\s\\S]*?<rdf:li[^>]*>([^<]+)</rdf:li>[\\s\\S]*?</${escaped}>`, 'i'));
            if (rdfMatch) {
                const parsed = parseMetadataDateString(rdfMatch[1]);
                if (parsed) return parsed;
            }
            return null;
        }

        const creationTags = [
            'exif:DateTimeOriginal',
            'photoshop:DateCreated',
            'xmp:CreateDate',
            'xap:CreateDate',
            'dc:date'
        ];
        for (const tag of creationTags) {
            const parsed = readXmpTag(tag);
            if (parsed) {
                result.creationDate = parsed;
                break;
            }
        }

        result.digitizedDate = readXmpTag('exif:DateTimeDigitized');

        const modifyTags = ['xmp:ModifyDate', 'xap:ModifyDate', 'xmp:MetadataDate', 'xap:MetadataDate'];
        for (const tag of modifyTags) {
            const parsed = readXmpTag(tag);
            if (parsed) {
                result.modifyDate = parsed;
                break;
            }
        }

        return result;
    }

    function mergeTiffDates(candidates, tiffDates) {
        if (!candidates.exifOriginal && tiffDates.dateTimeOriginal) {
            candidates.exifOriginal = tiffDates.dateTimeOriginal;
        }
        if (!candidates.exifDigitized && tiffDates.dateTimeDigitized) {
            candidates.exifDigitized = tiffDates.dateTimeDigitized;
        }
        if (!candidates.exifModify && tiffDates.dateTime) {
            candidates.exifModify = tiffDates.dateTime;
        }
    }

    function mergeXmpDates(candidates, xmpDates) {
        if (!candidates.xmpCreation && xmpDates.creationDate) {
            candidates.xmpCreation = xmpDates.creationDate;
        }
        if (!candidates.xmpDigitized && xmpDates.digitizedDate) {
            candidates.xmpDigitized = xmpDates.digitizedDate;
        }
        if (!candidates.xmpModify && xmpDates.modifyDate) {
            candidates.xmpModify = xmpDates.modifyDate;
        }
    }

    function matchBytesPrefix(bytes, offset, prefixArr) {
        if (offset + prefixArr.length > bytes.length) return false;
        for (let i = 0; i < prefixArr.length; i++) {
            if (bytes[offset + i] !== prefixArr[i]) return false;
        }
        return true;
    }

    async function extractImageDateFromMetadata(file) {
        try {
            if (!file) return null;
            const buffer = await file.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
            const candidates = {
                exifOriginal: null,
                exifDigitized: null,
                xmpCreation: null,
                pngTextCreation: null,
                exifModify: null,
                xmpDigitized: null,
                xmpModify: null,
                pngTextModify: null,
                pngTime: null
            };

            // 1. JPEG
            if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xD8) {
                const exifPrefix = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"
                const xmpPrefix = Array.from(new TextEncoder().encode('http://ns.adobe.com/xap/1.0/\0'));
                let offset = 2;

                while (offset + 1 < bytes.length) {
                    if (bytes[offset] !== 0xFF) {
                        offset++;
                        continue;
                    }
                    while (offset < bytes.length && bytes[offset] === 0xFF) offset++;
                    if (offset >= bytes.length) break;

                    const marker = bytes[offset++];
                    if (marker === 0xD9 || marker === 0xDA) break; // EOI or SOS
                    if (marker === 0x00 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD8)) continue;
                    if (offset + 2 > bytes.length) break;

                    const segLen = (bytes[offset] << 8) | bytes[offset + 1];
                    if (segLen < 2 || offset + segLen > bytes.length) break;

                    const payloadStart = offset + 2;
                    const payloadEnd = offset + segLen;

                    if (marker === 0xE1) {
                        if (matchBytesPrefix(bytes, payloadStart, exifPrefix)) {
                            mergeTiffDates(candidates, extractDatesFromTiff(bytes, payloadStart + exifPrefix.length));
                        } else if (matchBytesPrefix(bytes, payloadStart, xmpPrefix)) {
                            const xmlText = utf8Decoder.decode(bytes.subarray(payloadStart + xmpPrefix.length, payloadEnd));
                            mergeXmpDates(candidates, extractDatesFromXmp(xmlText));
                        }
                    }

                    offset = payloadEnd;
                }
            }
            // 2. PNG
            else if (
                bytes.length >= 8 &&
                bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
                bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A
            ) {
                const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
                let offset = 8;

                while (offset + 12 <= bytes.length) {
                    const chunkLen = view.getUint32(offset, false);
                    const type = String.fromCharCode(
                        bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]
                    );
                    const dataStart = offset + 8;
                    const dataEnd = dataStart + chunkLen;
                    if (dataEnd + 4 > bytes.length) break;

                    if (type === 'eXIf') {
                        mergeTiffDates(candidates, extractDatesFromTiff(bytes, dataStart));
                    } else if (type === 'tIME' && chunkLen === 7) {
                        const year = view.getUint16(dataStart, false);
                        const month = bytes[dataStart + 2];
                        const day = bytes[dataStart + 3];
                        if (isValidCalendarDate(year, month, day)) {
                            candidates.pngTime = { year, month, day };
                        }
                    } else if (type === 'tEXt') {
                        let sep = -1;
                        for (let i = dataStart; i < dataEnd; i++) {
                            if (bytes[i] === 0) { sep = i; break; }
                        }
                        if (sep !== -1) {
                            const keyword = decodeAscii(bytes, dataStart, sep - dataStart).trim().toLowerCase();
                            const textVal = utf8Decoder.decode(bytes.subarray(sep + 1, dataEnd));
                            if (keyword === 'xml:com.adobe.xmp') {
                                mergeXmpDates(candidates, extractDatesFromXmp(textVal));
                            } else if (keyword === 'creation time' || keyword === 'datetimeoriginal' || keyword === 'date:create' || keyword === 'createdate') {
                                const parsed = parseMetadataDateString(textVal);
                                if (parsed && !candidates.pngTextCreation) candidates.pngTextCreation = parsed;
                            } else if (keyword === 'modifydate' || keyword === 'date:modify' || keyword === 'last-modified') {
                                const parsed = parseMetadataDateString(textVal);
                                if (parsed && !candidates.pngTextModify) candidates.pngTextModify = parsed;
                            }
                        }
                    } else if (type === 'iTXt') {
                        let sep = -1;
                        for (let i = dataStart; i < dataEnd; i++) {
                            if (bytes[i] === 0) { sep = i; break; }
                        }
                        if (sep !== -1 && sep + 3 < dataEnd) {
                            const keyword = decodeAscii(bytes, dataStart, sep - dataStart).trim().toLowerCase();
                            const compressionFlag = bytes[sep + 1];
                            let cursor = sep + 3; // skip compressionFlag + compressionMethod
                            while (cursor < dataEnd && bytes[cursor] !== 0) cursor++;
                            cursor++; // skip languageTag null
                            while (cursor < dataEnd && bytes[cursor] !== 0) cursor++;
                            cursor++; // skip translatedKeyword null
                            if (compressionFlag === 0 && cursor < dataEnd) {
                                const textVal = utf8Decoder.decode(bytes.subarray(cursor, dataEnd));
                                if (keyword === 'xml:com.adobe.xmp') {
                                    mergeXmpDates(candidates, extractDatesFromXmp(textVal));
                                } else if (keyword === 'creation time' || keyword === 'datetimeoriginal' || keyword === 'date:create' || keyword === 'createdate') {
                                    const parsed = parseMetadataDateString(textVal);
                                    if (parsed && !candidates.pngTextCreation) candidates.pngTextCreation = parsed;
                                } else if (keyword === 'modifydate' || keyword === 'date:modify' || keyword === 'last-modified') {
                                    const parsed = parseMetadataDateString(textVal);
                                    if (parsed && !candidates.pngTextModify) candidates.pngTextModify = parsed;
                                }
                            }
                        }
                    } else if (type === 'IEND') {
                        break;
                    }

                    offset = dataEnd + 4;
                }
            }
            // 3. WebP (RIFF....WEBP)
            else if (
                bytes.length >= 12 &&
                bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
                bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
            ) {
                const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
                const exifPrefix = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
                let offset = 12;

                while (offset + 8 <= bytes.length) {
                    const fourcc = String.fromCharCode(
                        bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]
                    );
                    const chunkLen = view.getUint32(offset + 4, true);
                    const dataStart = offset + 8;
                    const dataEnd = dataStart + chunkLen;
                    if (dataEnd > bytes.length) break;

                    if (fourcc === 'EXIF') {
                        const tiffOffset = matchBytesPrefix(bytes, dataStart, exifPrefix)
                            ? dataStart + exifPrefix.length
                            : dataStart;
                        mergeTiffDates(candidates, extractDatesFromTiff(bytes, tiffOffset));
                    } else if (fourcc === 'XMP ') {
                        const xmlText = utf8Decoder.decode(bytes.subarray(dataStart, dataEnd));
                        mergeXmpDates(candidates, extractDatesFromXmp(xmlText));
                    }

                    offset = dataEnd + (chunkLen % 2);
                }
            }

            return (
                candidates.exifOriginal ||
                candidates.exifDigitized ||
                candidates.xmpCreation ||
                candidates.pngTextCreation ||
                candidates.exifModify ||
                candidates.xmpDigitized ||
                candidates.xmpModify ||
                candidates.pngTextModify ||
                candidates.pngTime ||
                null
            );
        } catch (err) {
            return null;
        }
    }

    REICHINS.metadata = {
        injectCreditMetadata,
        extractImageDateFromMetadata
    };
})();
