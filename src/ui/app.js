/* MediaInfo for File Station - viewer logic */
(function () {
    'use strict';

    var $ = function (sel, root) { return (root || document).querySelector(sel); };

    var state = {
        files: [],
        active: 0,
        view: 'cards',
        full: false,
        showKeys: false,
        search: '',
        demo: false,
        loadingDemo: false
    };

    var welcomeNode = document.getElementById('welcome');
    if (welcomeNode && welcomeNode.parentNode) {
        welcomeNode.parentNode.removeChild(welcomeNode);
    }

    function getWelcome() {
        return welcomeNode || document.createElement('div');
    }

    /* ------------------------------------------------------------ constants */

    var ICONS = {
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.6v.2"/>',
        video: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 9.5l5 2.5-5 2.5z"/>',
        audio: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
        text: '<path d="M4 6h16M4 11h16M4 16h9"/>',
        menu: '<path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 4v16"/>',
        other: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.9v.2"/><path d="M12 17.2v.1"/>',
        refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
        copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
        download: '<path d="M12 4v11"/><path d="M8 11l4 4 4-4"/><path d="M5 20h14"/>',
        alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4"/><path d="M12 17v.2"/>',
        file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
        chevron: '<path d="M9 6l6 6-6 6"/>'
    };

    function svg(name) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
            'stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || ICONS.other) + '</svg>';
    }

    var LABELS = {
        ID: '轨道 ID',
        Format: '格式',
        Format_Info: '格式/信息',
        Format_Profile: '格式配置',
        Format_Level: '格式级别',
        Format_Tier: '格式层级',
        Format_Version: '格式版本',
        Format_Settings: '格式设置',
        Format_Settings_CABAC: 'CABAC',
        Format_Settings_RefFrames: '参考帧',
        Format_Settings_GOP: 'GOP',
        CodecID: '编解码器 ID',
        CodecID_Info: '编解码器信息',
        CodecID_Hint: '编解码器提示',
        CodecID_Description: '编解码器描述',
        FileSize: '文件大小',
        Duration: '时长',
        OverallBitRate: '总码率',
        OverallBitRate_Mode: '总码率模式',
        OverallBitRate_Maximum: '最大总码率',
        BitRate: '码率',
        BitRate_Mode: '码率模式',
        BitRate_Maximum: '最大码率',
        BitRate_Minimum: '最小码率',
        BitRate_Nominal: '标称码率',
        Width: '宽度',
        Height: '高度',
        Stored_Height: '存储高度',
        Sampled_Width: '采样宽度',
        Sampled_Height: '采样高度',
        PixelAspectRatio: '像素宽高比',
        DisplayAspectRatio: '显示宽高比',
        FrameRate_Mode: '帧率模式',
        FrameRate: '帧率',
        FrameRate_Original: '原始帧率',
        FrameRate_Minimum: '最小帧率',
        FrameRate_Maximum: '最大帧率',
        FrameRate_Num: '帧率分子',
        FrameRate_Den: '帧率分母',
        FrameCount: '帧数',
        ColorSpace: '色彩空间',
        ChromaSubsampling: '色度采样',
        BitDepth: '位深',
        ScanType: '扫描方式',
        BitsPixel_Frame: '每像素位数',
        'Bits-(Pixel*Frame)': '每像素位数',
        StreamSize: '流大小',
        Source_StreamSize: '源流大小',
        Language: '语言',
        Title: '标题',
        Default: '默认',
        Forced: '强制',
        Encoded_Library: '编码库',
        Encoded_Library_Name: '编码库名称',
        Encoded_Library_Version: '编码库版本',
        Encoded_Library_Settings: '编码设置',
        Encoded_Application: '编码程序',
        Encoded_Date: '编码日期',
        Tagged_Date: '标记日期',
        File_Created_Date: '创建日期',
        File_Modified_Date: '修改日期',
        File_Modified_Date_Local: '修改日期（本地）',
        FileExtension: '扩展名',
        UniqueID: '唯一 ID',
        VideoCount: '视频轨道数',
        AudioCount: '音频轨道数',
        TextCount: '字幕轨道数',
        MenuCount: '菜单数',
        IsStreamable: '可流式传输',
        colour_range: '色彩范围',
        colour_primaries: '色彩原色',
        transfer_characteristics: '传输特性',
        matrix_coefficients: '矩阵系数',
        HDR_Format: 'HDR 格式',
        HDR_Format_Compatibility: 'HDR 兼容性',
        MasteringDisplay_ColorPrimaries: '主显示色彩原色',
        MasteringDisplay_Luminance: '主显示亮度',
        MaxCLL: '最大内容亮度',
        MaxFALL: '最大帧平均亮度',
        'Channel(s)': '声道数',
        Channels: '声道数',
        ChannelLayout: '声道布局',
        ChannelPositions: '声道位置',
        SamplingRate: '采样率',
        SamplingCount: '采样数',
        Compression_Mode: '压缩模式',
        Delay: '延迟',
        Delay_Source: '延迟来源',
        ServiceName: '服务名称',
        ServiceProvider: '服务提供商',
        ServiceType: '服务类型',
        Count_of_elements: '元素数量',
        Chapters_Pos_Begin: '章节起始',
        Chapters_Pos_End: '章节结束',
        Source_Duration: '源时长'
    };

    var ORDER = {
        General: ['Format', 'Format_Version', 'Format_Profile', 'FileExtension', 'FileSize', 'Duration',
            'OverallBitRate', 'OverallBitRate_Mode', 'FrameRate', 'FrameCount', 'StreamSize', 'IsStreamable',
            'Encoded_Application', 'Encoded_Library', 'Encoded_Date', 'Tagged_Date', 'File_Created_Date',
            'File_Modified_Date', 'File_Modified_Date_Local', 'UniqueID', 'VideoCount', 'AudioCount',
            'TextCount', 'MenuCount'],
        Video: ['ID', 'Format', 'Format_Info', 'Format_Profile', 'Format_Level', 'Format_Tier', 'CodecID',
            'CodecID_Info', 'Duration', 'BitRate', 'BitRate_Maximum', 'Width', 'Height',
            'PixelAspectRatio', 'DisplayAspectRatio', 'FrameRate_Mode',
            'FrameRate', 'FrameRate_Original', 'FrameCount', 'ColorSpace',
            'ChromaSubsampling', 'BitDepth', 'ScanType', 'BitsPixel_Frame', 'colour_range', 'colour_primaries',
            'transfer_characteristics', 'matrix_coefficients', 'HDR_Format', 'HDR_Format_Compatibility',
            'MasteringDisplay_ColorPrimaries', 'MasteringDisplay_Luminance', 'MaxCLL', 'MaxFALL',
            'StreamSize', 'Language', 'Title', 'Default', 'Forced', 'Encoded_Library', 'Encoded_Library_Name',
            'Encoded_Library_Version', 'Encoded_Library_Settings', 'Delay', 'Delay_Source'],
        Audio: ['ID', 'Format', 'Format_Info', 'Format_Profile', 'Format_Settings', 'CodecID', 'CodecID_Info',
            'Duration', 'BitRate_Mode', 'BitRate', 'BitRate_Maximum', 'BitRate_Minimum', 'BitRate_Nominal',
            'Channel(s)', 'ChannelLayout', 'ChannelPositions', 'SamplingRate', 'SamplingCount', 'FrameRate',
            'BitDepth', 'Compression_Mode', 'StreamSize', 'Language', 'Title', 'Default', 'Forced',
            'Encoded_Library', 'Encoded_Library_Name', 'Encoded_Library_Version', 'Delay', 'Delay_Source',
            'ServiceName', 'ServiceProvider'],
        Text: ['ID', 'Format', 'Format_Info', 'Format_Profile', 'CodecID', 'CodecID_Info', 'Duration', 'BitRate',
            'FrameRate', 'Count_of_elements', 'StreamSize', 'Language', 'Title', 'Default', 'Forced', 'Delay'],
        Menu: ['Format', 'Duration', 'Delay', 'Chapters_Pos_Begin', 'Chapters_Pos_End', 'Language', 'Title']
    };

    var TYPE_LABEL = { General: '常规', Video: '视频', Audio: '音频', Text: '字幕', Menu: '章节', Other: '其他' };
    var TYPE_ICON = { General: 'info', Video: 'video', Audio: 'audio', Text: 'text', Menu: 'menu', Other: 'other' };

    var LANG_NAMES = {
        zh: '中文', zho: '中文', chi: '中文', 'zh-cn': '简体中文', 'zh-tw': '繁体中文',
        en: '英语', eng: '英语', ja: '日语', jpn: '日语', ko: '韩语', kor: '韩语',
        fr: '法语', fra: '法语', fre: '法语', de: '德语', deu: '德语', ger: '德语',
        es: '西班牙语', spa: '西班牙语', ru: '俄语', rus: '俄语', it: '意大利语', ita: '意大利语',
        pt: '葡萄牙语', por: '葡萄牙语', ar: '阿拉伯语', ara: '阿拉伯语', th: '泰语', tha: '泰语',
        vi: '越南语', vie: '越南语', hi: '印地语', hin: '印地语', und: '未指定', mul: '多语言'
    };

    /* ------------------------------------------------------------ utilities */

    function el(tag, cls, text) {
        var node = document.createElement(tag);
        if (cls) { node.className = cls; }
        if (text !== undefined && text !== null) { node.textContent = String(text); }
        return node;
    }

    function isNumber(value) {
        return value !== '' && value !== null && value !== undefined && isFinite(Number(value));
    }

    function pad(value, width) {
        var str = String(Math.abs(Math.trunc(value)));
        while (str.length < width) { str = '0' + str; }
        return (value < 0 ? '-' : '') + str;
    }

    function number(value) {
        var n = Number(value);
        if (!isFinite(n)) { return String(value); }
        return n.toLocaleString('en-US');
    }

    function humanBytes(value) {
        var n = Number(value);
        if (!isFinite(n)) { return String(value); }
        if (n < 1024) { return n + ' B'; }
        var units = ['KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
        var i = -1;
        do { n /= 1024; i += 1; } while (n >= 1024 && i < units.length - 1);
        var digits = n >= 100 ? 0 : (n >= 10 ? 1 : 2);
        return n.toFixed(digits).replace(/\.0+$/, '') + ' ' + units[i];
    }

    function humanDuration(value) {
        var n = Number(value);
        if (!isFinite(n)) { return String(value); }
        var ms = Math.round(n * 1000);
        var h = Math.floor(ms / 3600000);
        var m = Math.floor((ms % 3600000) / 60000);
        var s = Math.floor((ms % 60000) / 1000);
        var milli = ms % 1000;
        return pad(h, 2) + ':' + pad(m, 2) + ':' + pad(s, 2) + '.' + pad(milli, 3);
    }

    function durationText(value) {
        var n = Number(value);
        if (!isFinite(n)) { return String(value); }
        var h = Math.floor(n / 3600);
        var m = Math.floor((n % 3600) / 60);
        var s = Math.round(n % 60);
        if (s === 60) { s = 0; m += 1; }
        if (m === 60) { m = 0; h += 1; }
        if (h > 0) { return h + ' 小时 ' + m + ' 分'; }
        if (m > 0) { return m + ' 分 ' + s + ' 秒'; }
        return n.toFixed(3).replace(/\.?0+$/, '') + ' 秒';
    }

    function humanBitrate(value) {
        var n = Number(value);
        if (!isFinite(n)) { return String(value); }
        if (n >= 1000000) { return (n / 1000000).toFixed(2).replace(/\.?0+$/, '') + ' Mb/s'; }
        if (n >= 1000) { return number(Math.round(n / 1000)) + ' kb/s'; }
        return number(n) + ' b/s';
    }

    function humanSampling(value) {
        var n = Number(value);
        if (!isFinite(n)) { return String(value); }
        if (n >= 1000) { return (n / 1000).toFixed(1).replace(/\.0$/, '') + ' kHz'; }
        return number(n) + ' Hz';
    }

    function humanFps(value) {
        var n = Number(value);
        if (!isFinite(n)) { return String(value); }
        return n.toFixed(3) + ' FPS';
    }

    function aspectText(value) {
        var n = Number(String(value).replace(',', '.'));
        if (!isFinite(n)) { return String(value); }
        var common = [
            [16 / 9, '16:9'], [4 / 3, '4:3'], [21 / 9, '21:9'], [2.35, '2.35:1'],
            [2.39, '2.39:1'], [1.85, '1.85:1'], [1.66, '1.66:1'], [1.5, '3:2'], [1.25, '5:4']
        ];
        for (var i = 0; i < common.length; i += 1) {
            if (Math.abs(n - common[i][0]) < 0.02) {
                return n.toFixed(3) + ' (' + common[i][1] + ')';
            }
        }
        return n.toFixed(3);
    }

    function languageName(value) {
        var code = String(value).trim();
        var key = code.toLowerCase();
        var name = LANG_NAMES[key];
        return name ? name + ' (' + code + ')' : code;
    }

    function yesNo(value) {
        var v = String(value).toLowerCase();
        if (v === 'yes' || v === '1' || v === 'true') { return '是'; }
        if (v === 'no' || v === '0' || v === 'false') { return '否'; }
        return String(value);
    }

    function humanValue(key, value, type) {
        if (value === null || value === undefined || value === '') { return ''; }
        var lower = key.toLowerCase();
        var compact = lower.replace(/[^a-z0-9]/g, '');

        if (['filesize', 'streamsize', 'sourcestreamsize', 'headersize', 'footersize', 'datasize'].indexOf(compact) >= 0) {
            return { text: humanBytes(value), sub: number(value) + ' 字节' };
        }
        if (compact === 'duration' || compact === 'sourceduration') {
            if (isNumber(value)) { return { text: durationText(value), sub: humanDuration(value) }; }
            return { text: String(value) };
        }
        if (compact === 'delay') {
            if (isNumber(value)) { return { text: Number(value).toFixed(3) + ' 秒' }; }
            return { text: String(value) };
        }
        if (compact.indexOf('bitrate') >= 0 && isNumber(value)) {
            return { text: humanBitrate(value) };
        }
        if (compact === 'samplingrate' && isNumber(value)) {
            return { text: humanSampling(value) };
        }
        if (['width', 'height', 'storedheight', 'sampledwidth', 'sampledheight'].indexOf(compact) >= 0 && isNumber(value)) {
            return { text: Number(value) + ' 像素' };
        }
        if (['framerate', 'framerateoriginal', 'framerateminimum', 'frameratemaximum'].indexOf(compact) >= 0 && isNumber(value)) {
            return { text: humanFps(value) };
        }
        if (compact === 'framecount' && isNumber(value)) {
            return { text: number(value) };
        }
        if (compact === 'bitdepth' && isNumber(value)) {
            return { text: value + ' 位' };
        }
        if ((compact === 'channels' || compact === 'channel') && isNumber(value)) {
            return { text: value + ' 声道' };
        }
        if (compact === 'displayaspectratio' || compact === 'pixelaspectratio') {
            return { text: aspectText(value) };
        }
        if (compact === 'language') {
            return { text: languageName(value) };
        }
        if (compact === 'default' || compact === 'forced' || compact === 'isstreamable') {
            return { text: yesNo(value) };
        }
        if (compact === 'scantype') {
            var scan = String(value);
            if (/progressive/i.test(scan)) { return { text: '逐行扫描 (Progressive)' }; }
            if (/interlaced/i.test(scan)) { return { text: '隔行扫描 (Interlaced)' }; }
            return { text: scan };
        }
        if (compact === 'compressionmode') {
            var cm = String(value);
            if (/lossless/i.test(cm)) { return { text: '无损 (Lossless)' }; }
            if (/lossy/i.test(cm)) { return { text: '有损 (Lossy)' }; }
            return { text: cm };
        }
        if (compact === 'colourrange' || compact === 'colorrange') {
            var cr = String(value);
            if (/limited/i.test(cr)) { return { text: '有限 (Limited)' }; }
            if (/full/i.test(cr)) { return { text: '完整 (Full)' }; }
            return { text: cr };
        }
        if (compact === 'frameratemode') {
            var fm = String(value);
            if (/cfr/i.test(fm)) { return { text: '恒定 (CFR)' }; }
            if (/vfr/i.test(fm)) { return { text: '可变 (VFR)' }; }
            return { text: fm };
        }
        if (compact === 'overallbitratemode' || compact === 'bitratemode') {
            var bm = String(value);
            if (/vbr/i.test(bm)) { return { text: '可变 (VBR)' }; }
            if (/cbr/i.test(bm)) { return { text: '恒定 (CBR)' }; }
            return { text: bm };
        }
        if (compact === 'encodeddate' || compact === 'taggeddate') {
            return { text: String(value).replace(/\s*UTC$/, '') };
        }
        if (compact === 'fileextension') {
            return { text: String(value).toUpperCase() };
        }
        if (typeof value === 'object') {
            return null;
        }
        return { text: String(value) };
    }

    function labelOf(key, type) {
        if (key === 'StreamSize' && type === 'General') { return '文件头大小'; }
        if (LABELS[key]) { return LABELS[key]; }
        return String(key).replace(/_/g, ' ');
    }

    function baseName(path) {
        var parts = String(path).split('/');
        return parts[parts.length - 1] || path;
    }

    function extOf(name) {
        var dot = String(name).lastIndexOf('.');
        return dot > 0 ? String(name).slice(dot + 1).toUpperCase() : '';
    }

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    function synoToken() {
        var sources = [];
        try { sources.push(window.parent); } catch (err) {}
        try { if (window.top !== window.parent) { sources.push(window.top); } } catch (err) {}
        sources.push(window);
        for (var i = 0; i < sources.length; i += 1) {
            var w = sources[i];
            try {
                if (w && w.SYNO && w.SYNO.SDS && w.SYNO.SDS.Session && w.SYNO.SDS.Session.SynoToken) {
                    return w.SYNO.SDS.Session.SynoToken;
                }
                if (w && typeof w._S === 'function') {
                    var token = w._S('SynoToken');
                    if (token) { return token; }
                }
            } catch (err) { /* cross-origin or not ready */ }
        }
        return '';
    }

    function toast(message) {
        var node = $('#toast');
        node.textContent = message;
        node.hidden = false;
        clearTimeout(toast._timer);
        toast._timer = setTimeout(function () { node.hidden = true; }, 1800);
    }

    /* ------------------------------------------------------------ state */

    function activeFile() {
        return state.files[state.active] || null;
    }

    function tracksOf(data) {
        var media = (data && data.mediainfo && data.mediainfo.media) || {};
        return media.track || [];
    }

    function groupTracks(data) {
        var groups = { General: [], Video: [], Audio: [], Text: [], Menu: [], Other: [] };
        var tracks = tracksOf(data);
        tracks.forEach(function (track) {
            var type = track['@type'] || 'Other';
            if (!groups[type]) { groups[type] = []; }
            groups[type].push(track);
        });
        return groups;
    }

    /* ------------------------------------------------------------ loading */

    function parsePaths() {
        var params = new URLSearchParams(window.location.search);
        var view = params.get('view');
        if (view === 'cards' || view === 'text' || view === 'json') {
            state.view = view;
        }
        if (params.get('demo') === '1') {
            loadDemo();
            return;
        }
        var raw = params.get('paths');
        var paths = [];
        if (raw) {
            try {
                var parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) { paths = parsed.filter(function (p) { return typeof p === 'string'; }); }
            } catch (err) { paths = []; }
        }
        if (!paths.length) {
            var single = params.get('path');
            if (single) { paths = [single]; }
        }
        state.files = paths.map(function (path) {
            return { path: path, name: baseName(path), data: null, error: null, loading: false };
        });
        render();
        if (state.files.length) { loadFile(0); }
    }

    function loadDemo() {
        state.demo = true;
        state.loadingDemo = true;
        render();
        fetch('demo.json', { credentials: 'same-origin' })
            .then(function (res) { return res.json(); })
            .then(function (list) {
                state.files = list.map(function (item) {
                    return {
                        path: item.path, name: item.name || baseName(item.path),
                        data: item.data, error: null, loading: false
                    };
                });
                state.loadingDemo = false;
                render();
            })
            .catch(function (err) {
                state.loadingDemo = false;
                state.files = [{ path: 'demo.json', name: 'demo.json', data: null, error: '无法加载演示数据：' + err.message, loading: false }];
                render();
            });
    }

    function notifyActive() {
        var file = activeFile();
        if (!file) { return; }
        var name = (file.data && file.data.name) || file.name || baseName(file.path);
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'mediainfo-active', name: name }, window.location.origin);
            }
        } catch (err) { /* ignore */ }
    }

    function addFiles(paths, names) {
        if (!Array.isArray(paths) || !paths.length) { return; }
        var last = state.active;
        paths.forEach(function (path, index) {
            if (!path || typeof path !== 'string') { return; }
            var found = -1;
            for (var i = 0; i < state.files.length; i += 1) {
                if (state.files[i].path === path) { found = i; break; }
            }
            if (found < 0) {
                state.files.push({
                    path: path,
                    name: (names && names[index]) || baseName(path),
                    data: null,
                    error: null,
                    loading: false
                });
                found = state.files.length - 1;
            }
            last = found;
        });
        state.active = last;
        render();
        var file = state.files[state.active];
        if (file && (!file.data || file.full !== state.full) && !file.loading) {
            loadFile(state.active);
        }
        notifyActive();
    }

    function onParentMessage(event) {
        if (event.origin !== window.location.origin) { return; }
        var data = event.data || {};
        if (data.type === 'mediainfo-open') {
            addFiles(data.paths, data.names);
        }
    }

    function loadFile(index, force) {
        var file = state.files[index];
        if (!file || state.demo) { render(); return; }
        if (!force && file.loading) { return; }
        if (!force && file.data && file.full === state.full) { return; }
        if (file.data && file.full !== state.full) { file.data = null; }
        file.loading = true;
        file.error = null;
        file.errorCode = '';
        file.errorDetail = '';
        if (force) { file.data = null; }
        render();
        var url = 'api.cgi?action=info&path=' + encodeURIComponent(file.path) +
            '&full=' + (state.full ? '1' : '0');
        var headers = { 'X-Requested-With': 'XMLHttpRequest' };
        var token = synoToken();
        if (token) {
            headers['X-SYNO-Token'] = token;
            url += '&SynoToken=' + encodeURIComponent(token);
        }
        fetch(url, {
            credentials: 'same-origin',
            headers: headers
        }).then(function (res) {
            return res.text().then(function (body) {
                var json = null;
                try { json = JSON.parse(body); } catch (err) { json = null; }
                if (!json) {
                    throw new Error('服务器返回了无法解析的内容（HTTP ' + res.status + '）。');
                }
                if (!json.ok) {
                    var error = new Error(json.error || '读取失败');
                    error.code = json.code;
                    error.detail = json.detail;
                    throw error;
                }
                return json.data;
            });
        }).then(function (data) {
            file.data = data;
            file.name = data.name || file.name;
            file.full = state.full;
            file.loading = false;
            render();
            if (state.active === index) { notifyActive(); }
        }).catch(function (err) {
            file.error = err.message;
            file.errorCode = err.code || '';
            file.errorDetail = err.detail || '';
            file.loading = false;
            render();
        });
    }

    /* ------------------------------------------------------------ rendering */

    function render() {
        renderActions();
        renderTabs();
        renderBody();
        if (document.title.indexOf('MediaInfoViewer') !== 0) { document.title = 'MediaInfoViewer'; }
        var file = activeFile();
        if (file && file.data) { document.title = 'MediaInfoViewer - ' + (file.data.name || file.name); }
    }

    function renderActions() {
        var box = $('#topActions');
        var toolbar = $('#toolbar');
        var extra = $('#toolbarExtra');
        box.textContent = '';
        var file = activeFile();
        if (!file) {
            if (toolbar) { toolbar.hidden = true; }
            if (extra) { extra.hidden = true; }
            return;
        }
        if (toolbar) { toolbar.hidden = false; }
        if (extra) { extra.hidden = false; }

        var seg = el('div', 'segmented');
        ['cards', 'text', 'json'].forEach(function (view) {
            var btn = el('button', state.view === view ? 'active' : '', { cards: '详情', text: '文本', json: 'JSON' }[view]);
            btn.type = 'button';
            btn.dataset.view = view;
            btn.addEventListener('click', function () {
                state.view = view;
                renderActions();
                renderBody();
            });
            seg.appendChild(btn);
        });
        box.appendChild(seg);

        var mode = el('div', 'segmented mode-switch');
        [['0', '标准'], ['1', '完整']].forEach(function (item) {
            var active = (state.full ? '1' : '0') === item[0];
            var btn = el('button', active ? 'active' : '', item[1]);
            btn.type = 'button';
            btn.title = item[0] === '1' ? '显示 MediaInfo 全部内部字段（--Full）' : '只显示常用字段';
            btn.addEventListener('click', function () {
                var next = item[0] === '1';
                if (state.full === next) { return; }
                state.full = next;
                state.files.forEach(function (f) {
                    f.data = null;
                    f.full = null;
                    f.error = null;
                    f.errorCode = '';
                });
                renderActions();
                loadFile(state.active, true);
            });
            mode.appendChild(btn);
        });
        box.appendChild(mode);

        var reload = el('button', 'btn icon');
        reload.type = 'button';
        reload.title = '重新读取';
        reload.innerHTML = svg('refresh');
        reload.addEventListener('click', function () {
            loadFile(state.active, true);
        });
        box.appendChild(reload);

        var copy = el('button', 'btn', '复制');
        copy.type = 'button';
        copy.title = '复制当前视图内容';
        copy.addEventListener('click', copyCurrent);
        box.appendChild(copy);
    }

    function renderTabs() {
        var box = $('#filetabs');
        if (state.files.length < 2) {
            box.hidden = true;
            box.textContent = '';
            return;
        }
        box.hidden = false;
        box.textContent = '';
        state.files.forEach(function (file, index) {
            var tab = el('button', 'tab' + (index === state.active ? ' active' : ''));
            tab.type = 'button';
            tab.title = file.path;
            tab.appendChild(el('span', 'tab-name', file.name || baseName(file.path)));
            var ext = extOf(file.name || file.path);
            if (ext) { tab.appendChild(el('span', 'ext', ext)); }
            tab.addEventListener('click', function () {
                if (state.active === index) { return; }
                state.active = index;
                render();
                notifyActive();
                if (!file.data || file.full !== state.full) { loadFile(index); }
            });
            box.appendChild(tab);
        });
    }

    function renderBody() {
        var content = $('#content');
        var file = activeFile();
        if (state.loadingDemo) {
            content.textContent = '';
            content.appendChild(renderSkeleton());
            return;
        }
        if (!file) {
                content.textContent = '';
            content.appendChild(getWelcome());
            return;
        }
        content.textContent = '';
        if (state.view !== 'cards') {
            var sidebarNode = $('#sidebar');
            if (sidebarNode) { sidebarNode.hidden = true; }
        }
        if (file.loading) {
            content.appendChild(renderSkeleton());
            return;
        }
        if (file.error) {
            content.appendChild(renderError(file));
            return;
        }
        if (!file.data) {
            content.appendChild(renderSkeleton());
            return;
        }
        if (state.view === 'text') {
            content.appendChild(renderRaw(file.data.text || '（MediaInfo 未返回文本输出）', 'text'));
        } else if (state.view === 'json') {
            content.appendChild(renderRaw(JSON.stringify(file.data.mediainfo, null, 2), 'json'));
        } else {
            content.appendChild(renderCards(file));
        }
        applySearch();
    }

    function renderSkeleton() {
        var wrap = el('div', 'skeleton');
        wrap.appendChild(el('div', 'sk-card tall'));
        wrap.appendChild(el('div', 'sk-card'));
        wrap.appendChild(el('div', 'sk-card'));
        return wrap;
    }

    function renderError(file) {
        var box = el('div', 'error-box');
        var ico = el('div', 'error-ico');
        ico.innerHTML = svg('alert');
        box.appendChild(ico);
        box.appendChild(el('h2', '', '无法读取媒体信息'));

        var message = file.error || '未知错误';
        if (file.errorCode === 'unauthorized') {
            message = '登录会话已失效，请刷新 DSM 页面后重试。';
        } else if (file.errorCode === 'mediainfo_missing') {
            message = '未找到 MediaInfo 命令行工具，请先在套件中心安装 MediaInfo（SynoCommunity）。';
        } else if (file.errorCode === 'permission_denied') {
            message = '当前 DSM 用户没有读取该文件的权限。';
        }
        box.appendChild(el('p', '', message));
        if (file.errorDetail) {
            box.appendChild(el('div', 'detail', file.errorDetail));
        }

        var actions = el('div');
        if (file.errorCode === 'unauthorized') {
            var reloadPage = el('button', 'btn primary', '刷新页面');
            reloadPage.type = 'button';
            reloadPage.addEventListener('click', function () { window.location.reload(); });
            actions.appendChild(reloadPage);
        } else {
            var retry = el('button', 'btn primary', '重试');
            retry.type = 'button';
            retry.addEventListener('click', function () { loadFile(state.active, true); });
            actions.appendChild(retry);
        }
        box.appendChild(actions);
        return box;
    }

    function renderRaw(text, kind) {
        var wrap = el('div', 'raw-wrap');
        var pre = el('pre', 'raw', text);
        pre.setAttribute('data-kind', kind);
        wrap.appendChild(pre);
        return wrap;
    }

    function renderCards(file) {
        var data = file.data;
        var groups = groupTracks(data);
        var general = groups.General[0] || {};
        var page = el('div', 'page');

        page.appendChild(renderFileHead(file, general, groups));

        var summary = el('div', 'summary');
        addStat(summary, '容器格式', general.Format || '未知', general.Format_Profile || '');
        addStat(summary, '时长', general.Duration ? durationText(general.Duration) : '—', general.Duration ? humanDuration(general.Duration) : '');
        addStat(summary, '总码率', general.OverallBitRate ? humanBitrate(general.OverallBitRate) : '—', '');
        addStat(summary, '文件大小', humanBytes(data.size), number(data.size) + ' 字节');
        var trackText = [];
        if (groups.Video.length) { trackText.push('视频 ' + groups.Video.length); }
        if (groups.Audio.length) { trackText.push('音频 ' + groups.Audio.length); }
        if (groups.Text.length) { trackText.push('字幕 ' + groups.Text.length); }
        if (!trackText.length) { trackText.push('无媒体轨道'); }
        addStat(summary, '轨道', trackText.join(' · '), general.FileExtension ? general.FileExtension.toUpperCase() + ' 文件' : '');
        page.appendChild(summary);

        var layout = el('div', 'cards');
        var navItems = [];

        var overview = renderOverview(groups);
        if (overview) {
            layout.appendChild(overview);
            navItems.push({ id: 'sec-overview', label: '轨道总览', icon: 'menu' });
        }

        var generalCard = renderTrackCard('General', general, 0, 1, data);
        if (generalCard) {
            generalCard.id = 'sec-general';
            generalCard.setAttribute('data-section', 'general');
            layout.appendChild(generalCard);
            navItems.push({ id: 'sec-general', label: '常规', icon: 'info' });
        }
        ['Video', 'Audio', 'Text', 'Menu', 'Other'].forEach(function (type) {
            var list = groups[type] || [];
            list.forEach(function (track, index) {
                var card = renderTrackCard(type, track, index, list.length, data);
                if (!card) { return; }
                var id = 'sec-' + type.toLowerCase() + '-' + index;
                card.id = id;
                card.setAttribute('data-section', type.toLowerCase());
                layout.appendChild(card);
            });
            if (list.length) {
                var count = list.length;
                if (type === 'Menu') {
                    count = list.reduce(function (sum, track) { return sum + chapterCount(track); }, 0);
                }
                navItems.push({
                    id: 'sec-' + type.toLowerCase() + '-0',
                    label: TYPE_LABEL[type],
                    icon: TYPE_ICON[type],
                    count: count
                });
            }
        });

        page.appendChild(layout);

        var sidebar = $('#sidebar');
        sidebar.textContent = '';
        if (navItems.length) {
            sidebar.hidden = false;
            sidebar.appendChild(el('div', 'sidebar-title', '内容'));
            navItems.forEach(function (section, index) {
                var item = el('button', 'nav-item' + (index === 0 ? ' active' : ''));
                item.type = 'button';
                var ico = el('span', 'nav-ico');
                ico.innerHTML = svg(section.icon);
                item.appendChild(ico);
                item.appendChild(el('span', 'nav-label', section.label));
                if (section.count) { item.appendChild(el('span', 'nav-count', section.count)); }
                item.addEventListener('click', function () {
                    var target = document.getElementById(section.id);
                    if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
                });
                sidebar.appendChild(item);
            });
            setupSpy(navItems);
        } else {
            sidebar.hidden = true;
        }

        return page;
    }

    function chapterCount(track) {
        if (!track || !track.extra) { return 0; }
        return Object.keys(track.extra).length;
    }

    function streamBytes(track) {
        var size = Number(track && track.StreamSize);
        if (size > 0) { return size; }
        var bitrate = Number(track && track.BitRate);
        var duration = Number(track && track.Duration);
        if (bitrate > 0 && duration > 0) { return bitrate * duration / 8; }
        return 0;
    }

    function collectSpecs(groups) {
        var out = [];
        var seen = {};
        function add(label, kind) {
            if (!label || seen[label]) { return; }
            seen[label] = true;
            out.push({ label: label, kind: kind || '' });
        }

        var video = (groups.Video || [])[0] || {};
        var hdr = String(video.HDR_Format || '') + ' ' + String(video.HDR_Format_Compatibility || '');
        if (/dolby vision/i.test(hdr)) {
            add('Dolby Vision', 'hdr');
        } else if (/hdr10\+/i.test(hdr)) {
            add('HDR10+', 'hdr');
        } else if (/hdr10|smpte st 2086/i.test(hdr)) {
            add('HDR10', 'hdr');
        } else if (/hlg/i.test(String(video.transfer_characteristics || ''))) {
            add('HLG', 'hdr');
        }
        var width = Number(video.Width);
        if (width >= 7680) { add('8K', 'spec'); }
        else if (width >= 3840) { add('4K', 'spec'); }
        if (Number(video.BitDepth) >= 10) { add(Number(video.BitDepth) + '-bit', 'spec'); }

        (groups.Audio || []).forEach(function (audio) {
            var fmt = ((audio.Format || '') + ' ' + (audio.Format_Profile || '') + ' ' +
                (audio.Format_AdditionalFeatures || '')).toLowerCase();
            if (fmt.indexOf('atmos') >= 0 || fmt.indexOf('joc') >= 0) {
                add('Dolby Atmos', 'audio');
            } else if (/dts.*x/.test(fmt)) {
                add('DTS:X', 'audio');
            } else if (/dts/.test(fmt) && /ma/.test(fmt)) {
                add('DTS-HD MA', 'audio');
            } else if (/truehd/.test(fmt)) {
                add('TrueHD', 'audio');
            }
            var channels = Number(audio['Channel(s)'] || audio.Channels);
            if (channels === 6) { add('5.1', 'audio'); }
            else if (channels === 8) { add('7.1', 'audio'); }
            if (Number(audio.SamplingRate) >= 96000) { add('96 kHz', 'audio'); }
            if (Number(audio.BitDepth) >= 24) { add('24-bit', 'audio'); }
        });

        return out.slice(0, 9);
    }

    function overviewSpec(type, track) {
        if (type === 'Video') {
            var parts = [];
            if (track.Width && track.Height) { parts.push(track.Width + '×' + track.Height); }
            if (track.FrameRate) { parts.push(humanFps(track.FrameRate)); }
            return parts.join(' · ') || '—';
        }
        if (type === 'Audio') {
            var audio = [];
            var channels = track['Channel(s)'] || track.Channels;
            if (channels) { audio.push(channels + ' 声道'); }
            if (track.SamplingRate) { audio.push(humanSampling(track.SamplingRate)); }
            return audio.join(' · ') || '—';
        }
        if (type === 'Menu') { return chapterCount(track) + ' 章节'; }
        if (type === 'Text') { return track.Format || '—'; }
        return track.Format || '—';
    }

    function renderOverview(groups) {
        var entries = [];
        ['Video', 'Audio', 'Text', 'Menu'].forEach(function (type) {
            (groups[type] || []).forEach(function (track, index) {
                entries.push({ type: type, track: track, index: index, target: 'sec-' + type.toLowerCase() + '-' + index });
            });
        });
        if (!entries.length) { return null; }

        var card = el('section', 'card overview-card');
        card.id = 'sec-overview';
        card.setAttribute('data-section', 'overview');

        var head = el('div', 'card-head');
        var ico = el('div', 'card-ico');
        ico.innerHTML = svg('menu');
        head.appendChild(ico);
        var titleBox = el('div');
        titleBox.appendChild(el('div', 'card-title', '轨道总览'));
        var counts = [];
        if (groups.Video.length) { counts.push('视频 ' + groups.Video.length); }
        if (groups.Audio.length) { counts.push('音频 ' + groups.Audio.length); }
        if (groups.Text.length) { counts.push('字幕 ' + groups.Text.length); }
        if (groups.Menu.length) { counts.push('章节 ' + groups.Menu.length); }
        titleBox.appendChild(el('div', 'card-sub', counts.join(' · ')));
        head.appendChild(titleBox);
        head.appendChild(el('span', 'badge', entries.length + ' 条轨道'));
        card.appendChild(head);

        var body = el('div', 'overview-body');
        var tableWrap = el('div', 'overview-table-wrap');
        var table = el('table', 'overview-table');
        var thead = el('thead');
        var hr = el('tr');
        ['轨道', '编码', '语言', '码率', '规格', '大小'].forEach(function (label) {
            hr.appendChild(el('th', '', label));
        });
        thead.appendChild(hr);
        table.appendChild(thead);
        var tbody = el('tbody');
        entries.forEach(function (entry) {
            var track = entry.track;
            var row = el('tr');
            row.title = '点击跳到该轨道详情';
            var typeCell = el('td', 'ov-type');
            typeCell.appendChild(el('span', 'ov-dot ' + entry.type.toLowerCase()));
            typeCell.appendChild(el('span', '', TYPE_LABEL[entry.type] + (entry.type === 'Video' || entry.type === 'Audio' || entry.type === 'Text' ? (groups[entry.type].length > 1 ? ' #' + (entry.index + 1) : '') : '')));
            row.appendChild(typeCell);

            var codec = track.Format || '—';
            if (track.Format_Profile) { codec += ' ' + track.Format_Profile; }
            row.appendChild(el('td', 'ov-codec', codec));
            row.appendChild(el('td', '', track.Language ? languageName(track.Language) : '—'));
            row.appendChild(el('td', 'ov-num', track.BitRate ? humanBitrate(track.BitRate) : '—'));
            row.appendChild(el('td', 'ov-spec', overviewSpec(entry.type, track)));

            var size = streamBytes(track);
            row.appendChild(el('td', 'ov-num', size > 0 ? humanBytes(size) : '—'));
            row.addEventListener('click', function () {
                var target = document.getElementById(entry.target);
                if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
            });
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        tableWrap.appendChild(table);
        body.appendChild(tableWrap);

        var buckets = [
            { type: 'Video', label: '视频', cls: 'video' },
            { type: 'Audio', label: '音频', cls: 'audio' },
            { type: 'Text', label: '字幕', cls: 'text' }
        ];
        var total = 0;
        buckets.forEach(function (bucket) {
            bucket.bytes = 0;
            (groups[bucket.type] || []).forEach(function (track) { bucket.bytes += streamBytes(track); });
            total += bucket.bytes;
        });
        if (total > 0) {
            var bar = el('div', 'size-bar');
            buckets.forEach(function (bucket) {
                if (bucket.bytes <= 0) { return; }
                var seg = el('span', 'size-seg ' + bucket.cls);
                seg.style.width = (bucket.bytes / total * 100).toFixed(2) + '%';
                seg.title = bucket.label + ' ' + (bucket.bytes / total * 100).toFixed(1) + '%';
                bar.appendChild(seg);
            });
            body.appendChild(bar);

            var legend = el('div', 'size-legend');
            buckets.forEach(function (bucket) {
                if (bucket.bytes <= 0) { return; }
                var item = el('span', 'size-legend-item');
                item.appendChild(el('span', 'size-dot ' + bucket.cls));
                item.appendChild(el('span', '', bucket.label + ' ' + (bucket.bytes / total * 100).toFixed(1) + '%'));
                legend.appendChild(item);
            });
            body.appendChild(legend);
        }

        card.appendChild(body);
        return card;
    }

    function applySearch() {
        var content = $('#content');
        if (!content) { return; }
        var query = (state.search || '').trim().toLowerCase();
        var cards = content.querySelectorAll('.card');
        var total = 0;
        Array.prototype.forEach.call(cards, function (card) {
            if (card.id === 'sec-overview') {
                card.hidden = !!query;
                return;
            }
            var visible = 0;
            Array.prototype.forEach.call(card.querySelectorAll('.field'), function (row) {
                var haystack = row.dataset.search || '';
                var show = !query || haystack.indexOf(query) >= 0;
                row.hidden = !show;
                if (show) { visible += 1; }
            });
            card.hidden = !!query && visible === 0;
            total += visible;
        });
        var count = $('#searchCount');
        if (count) { count.textContent = query ? total + ' 项' : ''; }
    }

    function addStat(box, key, value, sub) {
        var stat = el('div', 'stat');
        stat.appendChild(el('div', 'stat-k', key));
        var v = el('div', 'stat-v', value);
        v.title = value;
        stat.appendChild(v);
        if (sub) {
            var s = el('div', 'stat-sub', sub);
            s.title = sub;
            stat.appendChild(s);
        }
        box.appendChild(stat);
    }

    function renderFileHead(file, general, groups) {
        var head = el('div', 'filehead');
        var main = el('div', 'filehead-main');
        main.appendChild(el('h1', '', file.data.name || file.name));

        var path = el('div', 'path', file.data.path || file.path);
        path.title = '点击复制路径';
        path.addEventListener('click', function () {
            copyText(file.data.path || file.path);
        });
        main.appendChild(path);

        var meta = el('div', 'meta-row');
        if (general.Format) { meta.appendChild(el('span', 'badge blue', general.Format)); }
        var ext = extOf(file.data.name || file.name);
        if (ext) { meta.appendChild(el('span', 'badge', ext)); }
        if (groups.Video.length) { meta.appendChild(el('span', 'badge plain', '视频 ' + groups.Video.length)); }
        if (groups.Audio.length) { meta.appendChild(el('span', 'badge plain', '音频 ' + groups.Audio.length)); }
        if (groups.Text.length) { meta.appendChild(el('span', 'badge plain', '字幕 ' + groups.Text.length)); }
        if (groups.Menu.length) { meta.appendChild(el('span', 'badge plain', '章节 ' + groups.Menu.length)); }
        collectSpecs(groups).forEach(function (spec) {
            meta.appendChild(el('span', 'badge spec ' + (spec.kind || ''), spec.label));
        });
        if (state.demo) { meta.appendChild(el('span', 'badge green', '演示数据')); }
        main.appendChild(meta);

        var note = el('div', 'meta-row');
        if (file.data.mtime_text) { note.appendChild(el('span', '', '修改时间 ' + file.data.mtime_text)); }
        if (file.data.library) { note.appendChild(el('span', '', 'MediaInfoLib ' + file.data.library)); }
        if (file.data.elapsed_ms) { note.appendChild(el('span', '', '解析耗时 ' + file.data.elapsed_ms + ' ms')); }
        if (note.childNodes.length) { main.appendChild(note); }

        head.appendChild(main);
        return head;
    }

    function trackSubtitle(type, track) {
        var parts = [];
        if (track.Format) {
            var format = track.Format;
            if (track.Format_Profile) { format += ' ' + track.Format_Profile; }
            parts.push(format);
        }
        if (type === 'Video') {
            if (track.Width && track.Height) { parts.push(track.Width + '×' + track.Height); }
            if (track.FrameRate) { parts.push(humanFps(track.FrameRate)); }
        } else if (type === 'Audio') {
            var channels = track['Channel(s)'] || track.Channels;
            if (channels) { parts.push(channels + ' 声道'); }
            if (track.SamplingRate) { parts.push(humanSampling(track.SamplingRate)); }
        } else if (type === 'Text') {
            if (track.Language) { parts.push(languageName(track.Language)); }
        } else if (type === 'Menu') {
            var count = chapterCount(track);
            if (count) { parts.push(count + ' 个章节'); }
        }
        if (track.Title) { parts.push(track.Title); }
        return parts.join(' · ');
    }

    function renderTrackCard(type, track, index, total, data) {
        if (!track || !Object.keys(track).length) { return null; }
        var card = el('section', 'card');

        var head = el('div', 'card-head');
        var ico = el('div', 'card-ico');
        ico.innerHTML = svg(TYPE_ICON[type] || 'other');
        head.appendChild(ico);

        var titleBox = el('div');
        var title = TYPE_LABEL[type] || type;
        if (type !== 'General' && total > 1) { title += ' #' + (index + 1); }
        titleBox.appendChild(el('div', 'card-title', title));
        var subtitle = trackSubtitle(type, track);
        if (subtitle) { titleBox.appendChild(el('div', 'card-sub', subtitle)); }
        head.appendChild(titleBox);

        head.appendChild(el('span', 'badge', type === 'General' ? 'General' : type + (total > 1 ? ' #' + (index + 1) : '')));
        card.appendChild(head);

        var fields = el('div', 'fields');
        var used = {};
        var order = ORDER[type] || ORDER.General;
        order.forEach(function (key) {
            if (track[key] === undefined || track[key] === null || track[key] === '') { return; }
            var row = renderField(key, track[key], type);
            if (row) {
                fields.appendChild(row);
                used[key] = true;
            }
        });

        if (type === 'Menu' && track.extra && typeof track.extra === 'object') {
            var chapters = Object.keys(track.extra).sort();
            chapters.forEach(function (chapter) {
                var label = chapter.replace(/^_/, '').replace(/_/g, ':').replace(/:(\d{3})$/, '.$1');
                fields.appendChild(fieldRow(label, String(track.extra[chapter])));
            });
        }

        var leftovers = [];
        Object.keys(track).forEach(function (key) {
            if (used[key] || key === '@type' || key === 'extra') { return; }
            var value = track[key];
            if (value === null || value === undefined || value === '' || typeof value === 'object') { return; }
            leftovers.push(key);
        });

        card.appendChild(fields);

        if (leftovers.length) {
            var details = el('details', 'more');
            details.appendChild(el('summary', '', '其他字段（' + leftovers.length + '）'));
            var more = el('div', 'fields');
            leftovers.forEach(function (key) {
                var row = renderField(key, track[key], type);
                if (row) { more.appendChild(row); }
            });
            details.appendChild(more);
            card.appendChild(details);
        }

        return card;
    }

    function renderField(key, value, type) {
        var human = humanValue(key, value, type);
        if (!human) { return null; }
        var label = labelOf(key, type);
        var row = el('div', 'field');
        row.dataset.key = key;
        row.dataset.search = (label + ' ' + human.text + ' ' + (human.sub || '') + ' ' + key).toLowerCase();
        var keyLabel = el('div', 'k', label);
        keyLabel.dataset.key = key;
        row.appendChild(keyLabel);

        var v = el('div', 'v');
        if (String(human.text).length > 40 || /[0-9a-f]{16,}/i.test(String(human.text))) {
            v.classList.add('mono');
        }
        v.textContent = human.text;
        v.title = String(value);
        if (human.sub) {
            var sub = el('span', 'sub', human.sub);
            v.appendChild(sub);
        }
        var copyBtn = el('button', 'field-copy', '复制');
        copyBtn.type = 'button';
        copyBtn.title = '复制原始值';
        copyBtn.addEventListener('click', function (ev) {
            ev.stopPropagation();
            copyText(String(value));
        });
        v.appendChild(copyBtn);
        row.appendChild(v);
        return row;
    }

    function fieldRow(label, value) {
        var row = el('div', 'field');
        row.dataset.search = (label + ' ' + value).toLowerCase();
        row.appendChild(el('div', 'k', label));
        var v = el('div', 'v', value);
        v.title = value;
        var copyBtn = el('button', 'field-copy', '复制');
        copyBtn.type = 'button';
        copyBtn.title = '复制原始值';
        copyBtn.addEventListener('click', function (ev) {
            ev.stopPropagation();
            copyText(String(value));
        });
        v.appendChild(copyBtn);
        row.appendChild(v);
        return row;
    }

    /* ------------------------------------------------------------ scroll spy */

    var spyHandler = null;

    function setupSpy(sections) {
        var content = $('#content');
        if (spyHandler) { content.removeEventListener('scroll', spyHandler); }
        var items = Array.prototype.slice.call(document.querySelectorAll('#sidebar .nav-item'));
        spyHandler = function () {
            var top = 80;
            var current = 0;
            sections.forEach(function (section, index) {
                var node = document.getElementById(section.id);
                if (!node) { return; }
                if (node.getBoundingClientRect().top - content.getBoundingClientRect().top <= top) {
                    current = index;
                }
            });
            items.forEach(function (item, index) {
                item.classList.toggle('active', index === current);
            });
        };
        content.addEventListener('scroll', spyHandler, { passive: true });
        spyHandler();
    }

    /* ------------------------------------------------------------ actions */

    function currentText() {
        var file = activeFile();
        if (!file || !file.data) { return ''; }
        if (state.view === 'json') { return JSON.stringify(file.data.mediainfo, null, 2); }
        if (state.view === 'text') { return file.data.text || ''; }
        return file.data.text || JSON.stringify(file.data.mediainfo, null, 2);
    }

    function copyText(text) {
        if (!text) { toast('没有可复制的内容'); return; }
        var done = function () { toast('已复制到剪贴板'); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text) || toast('复制失败'); });
        } else {
            fallbackCopy(text) ? done() : toast('复制失败');
        }
    }

    function fallbackCopy(text) {
        try {
            var area = document.createElement('textarea');
            area.value = text;
            area.style.position = 'fixed';
            area.style.opacity = '0';
            document.body.appendChild(area);
            area.select();
            var ok = document.execCommand('copy');
            document.body.removeChild(area);
            return ok;
        } catch (err) {
            return false;
        }
    }

    function copyCurrent() { copyText(currentText()); }

    function exportJson() {
        var file = activeFile();
        if (!file || !file.data) { toast('没有可导出的数据'); return; }
        var name = (file.data.name || file.name || 'mediainfo').replace(/\.[^.]+$/, '');
        var text;
        var suffix;
        if (state.view === 'text') {
            text = file.data.text || '';
            suffix = '.mediainfo.txt';
        } else {
            text = JSON.stringify(file.data.mediainfo, null, 2);
            suffix = '.mediainfo.json';
        }
        var blob = new Blob([text], { type: state.view === 'text' ? 'text/plain;charset=utf-8' : 'application/json;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = name + suffix;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        toast('已开始下载');
    }

    function downloadText(text, filename, mime) {
        var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    function exportFormat(format) {
        var file = activeFile();
        if (!file || !file.data) {
            toast('没有可导出的数据');
            return;
        }
        var base = (file.data.name || file.name || 'mediainfo').replace(/\.[^.]+$/, '');
        if (format === 'json') {
            downloadText(JSON.stringify(file.data.mediainfo, null, 2),
                base + '.mediainfo.json', 'application/json;charset=utf-8');
            toast('已开始下载');
            return;
        }
        if (format === 'text') {
            downloadText(file.data.text || '', base + '.mediainfo.txt', 'text/plain;charset=utf-8');
            toast('已开始下载');
            return;
        }

        var url = 'api.cgi?action=export&format=' + encodeURIComponent(format) +
            '&path=' + encodeURIComponent(file.path) +
            '&full=' + (state.full ? '1' : '0');
        var headers = { 'X-Requested-With': 'XMLHttpRequest' };
        var token = synoToken();
        if (token) {
            headers['X-SYNO-Token'] = token;
            url += '&SynoToken=' + encodeURIComponent(token);
        }
        toast('正在生成 ' + format.toUpperCase() + '…');
        fetch(url, { credentials: 'same-origin', headers: headers })
            .then(function (res) {
                return res.text().then(function (body) {
                    var json = null;
                    try { json = JSON.parse(body); } catch (err) { json = null; }
                    if (!json) { throw new Error('服务器返回了无法解析的内容。'); }
                    if (!json.ok) { throw new Error(json.error || '导出失败'); }
                    return json.data;
                });
            })
            .then(function (data) {
                downloadText(data.content, data.filename, data.mime);
                toast('已开始下载');
            })
            .catch(function (err) { toast('导出失败：' + err.message); });
    }

    function bindToolbarExtra() {
        var search = $('#fieldSearch');
        if (search) {
            search.value = state.search || '';
            search.addEventListener('input', function () {
                state.search = search.value;
                applySearch();
            });
        }

        var keyToggle = $('#keyToggle');
        if (keyToggle) {
            keyToggle.classList.toggle('active', state.showKeys);
            keyToggle.addEventListener('click', function () {
                state.showKeys = !state.showKeys;
                document.body.classList.toggle('show-keys', state.showKeys);
                keyToggle.classList.toggle('active', state.showKeys);
            });
        }

        var exportBtn = $('#exportBtn');
        var exportMenu = $('#exportMenu');
        if (exportBtn && exportMenu) {
            exportBtn.addEventListener('click', function (ev) {
                ev.stopPropagation();
                exportMenu.hidden = !exportMenu.hidden;
            });
            exportMenu.querySelectorAll('button[data-format]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    exportMenu.hidden = true;
                    exportFormat(btn.dataset.format);
                });
            });
            document.addEventListener('click', function (ev) {
                if (!exportMenu.hidden && !exportMenu.contains(ev.target) && !exportBtn.contains(ev.target)) {
                    exportMenu.hidden = true;
                }
            });
        }
    }

    /* ------------------------------------------------------------ boot */

    window.addEventListener('message', onParentMessage);
    bindToolbarExtra();
    if (state.showKeys) { document.body.classList.add('show-keys'); }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', parsePaths);
    } else {
        parsePaths();
    }
})();
