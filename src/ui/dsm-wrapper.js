/* MediaInfo for File Station - DSM UI glue.
 *
 * Registers three things:
 *   - MeowPerth.MediaInfoFS.FBExt      : the File Station "Open >" menu entry
 *   - MeowPerth.MediaInfoFS.AppInstance: the DSM application instance
 *   - MeowPerth.MediaInfoFS.AppWindow  : a DSM window that hosts ui/index.html
 *
 * The menu entry itself is declared in ui/config (fb_extern).  File Station
 * scans every registered application config, so the entry shows up in the
 * right-click "Open" submenu next to "Video Player".
 */
Ext.ns('MeowPerth.MediaInfoFS');

(function () {
    'use strict';

    var PAGE_URL = '/webman/3rdparty/mediainfo-fs/index.html';
    var viewerInstance = null;

    function currentViewerWindow() {
        if (viewerInstance && viewerInstance.window && !viewerInstance.window.isDestroyed) {
            return viewerInstance.window;
        }
        viewerInstance = null;
        return null;
    }

    function openViewer(paths, names) {
        var win = currentViewerWindow();
        if (win && win.addFiles) {
            win.addFiles({ paths: paths, names: names });
            return;
        }
        var inst = new MeowPerth.MediaInfoFS.AppInstance({ allowMultiInstance: false });
        viewerInstance = inst;
        inst.open({ fb_recs: { paths: paths, names: names } });
    }

    window.addEventListener('message', function (event) {
        if (event.origin !== window.location.origin) {
            return;
        }
        var data = event.data || {};
        if (data.type === 'mediainfo-active' && data.name) {
            var win = currentViewerWindow();
            if (win) {
                win.setTitle('MediaInfoViewer - ' + data.name);
            }
        }
    });

    // MediaInfo can inspect virtually any container.  We still limit the
    // menu to audio/video extensions so that it does not clutter the menu
    // for text files, PDFs or pictures.
    var MEDIA_EXT = {};
    (
        '3g2 3gp 3gp2 amv asf avi av1 divx dv dvr-ms evo f4v flv gvi h264 h265 ' +
        'hdmov hevc ifo iso ivf m1v m2p m2t m2ts m2v m4v mkv mov mp4 mpe mpeg ' +
        'mpeg1 mpeg2 mpeg4 mpg mpv mts mxf ogm ogv qt rm rmvb swf tp trp ts ' +
        'vob webm wmv wtv xvid ' +
        'aac ac3 aif aiff alac amr ape au caf dff dsf dts dtshd eac3 flac la ' +
        'loas m4a m4b mka mlp mp2 mp3 mpa mpc oga ogg opus ra spx tta wav wma wv'
    ).split(/\s+/).forEach(function (ext) {
        if (ext) {
            MEDIA_EXT[ext] = true;
        }
    });

    function extensionOf(record) {
        var name = record.get('filename') || record.get('name') || '';
        var path = record.get('path') || '';
        if (!name) {
            name = path.split('/').pop();
        }
        var dot = name.lastIndexOf('.');
        if (dot < 0 || dot === name.length - 1) {
            return '';
        }
        return name.slice(dot + 1).toLowerCase();
    }

    function recordPath(record) {
        // File Station's "path" is a virtual path below the share (e.g.
        // /docker/1.mkv).  "real_path" is the absolute path on the volume
        // (/volume1/docker/1.mkv) which the backend can inspect.
        return record.get('real_path') || record.get('path') || '';
    }

    Ext.define('MeowPerth.MediaInfoFS.FBExt', {
        statics: {
            checkFn: function (plugin, records) {
                if (!records || !records.length) {
                    return false;
                }
                for (var i = 0; i < records.length; i += 1) {
                    if (records[i].get('isdir')) {
                        return false;
                    }
                    if (!MEDIA_EXT[extensionOf(records[i])]) {
                        return false;
                    }
                    if (!/^\/volume/.test(recordPath(records[i]))) {
                        return false;
                    }
                }
                return true;
            },

            launchFn: function (records) {
                if (!records || !records.length) {
                    return;
                }
                var paths = [];
                var names = [];
                for (var i = 0; i < records.length && paths.length < 20; i += 1) {
                    var path = recordPath(records[i]);
                    if (path) {
                        paths.push(path);
                        names.push(records[i].get('filename') || path.split('/').pop());
                    }
                }
                if (!paths.length) {
                    return;
                }
                try {
                    // One viewer window for all files: the window keeps its
                    // iframe and the page appends new tabs for later launches.
                    openViewer(paths, names);
                } catch (err) {
                    SYNO.Debug.error('MediaInfo: cannot open viewer', err);
                }
            }
        }
    });

    MeowPerth.MediaInfoFS.AppInstance = Ext.extend(SYNO.SDS.AppInstance, {
        appWindowName: 'MeowPerth.MediaInfoFS.AppWindow'
    });

    MeowPerth.MediaInfoFS.AppWindow = Ext.extend(SYNO.SDS.LegacyAppWindow, {
        overwriteAppWinConfig: function (config) {
            // In a standalone File Station page DSM forces app windows to be
            // non-draggable/non-resizable.  The viewer should stay a normal
            // floating window.
            config.draggable = false;  // custom drag below (iframe-safe)
            config.resizable = true;
            return config;
        },

        constructor: function (config) {
            this._launchInfo = config && config.fb_recs ? { fb_recs: config.fb_recs } : null;
            config = Ext.apply(
                {
                    width: 1080,
                    height: 720,
                    minWidth: 720,
                    minHeight: 480,
                    resizable: true,
                    draggable: false,
                    autoRestoreSizePos: false,
                    maximizable: true,
                    minimizable: true,
                    title: 'MediaInfo',
                    cls: 'mediainfo-window',
                    url: PAGE_URL
                },
                config
            );
            SYNO.SDS.LegacyAppWindow.prototype.constructor.call(this, config);
            this.on('afterrender', this.setupDragGuard, this);
            this.setupDragGuard();
        },

        setupDragGuard: function () {
            if (this._dragGuardBound || !this.header) {
                return;
            }
            this.header.on('mousedown', this.onHeaderMouseDown, this);
            this.header.setStyle('cursor', 'move');
            Ext.each(this.header.query('.x-tool'), function (tool) {
                Ext.fly(tool).setStyle('cursor', 'pointer');
            });
            this._dragGuardBound = true;
        },

        onHeaderMouseDown: function (e) {
            if (e.button !== 0) {
                return;
            }
            // Do not start a window drag when clicking close/help/maximize.
            if (e.getTarget('.x-tool') || e.getTarget('a')) {
                return;
            }
            var frame = Ext.getDom(this.iframeId);
            if (frame) {
                frame.style.pointerEvents = 'none';
            }
            this.toFront();
            if (this.maximized) {
                this.restore();
            }
            Ext.getBody().setStyle('cursor', 'move');
            Ext.getBody().addClass('mediainfo-window-dragging');

            var self = this;
            var doc = Ext.getDoc();
            var start = this.getPosition();
            var startX = e.getPageX();
            var startY = e.getPageY();
            this._dragFrame = frame;

            var onMove = function (ev) {
                self.setPosition(
                    start[0] + ev.getPageX() - startX,
                    start[1] + ev.getPageY() - startY
                );
            };
            var onUp = function () {
                doc.un('mousemove', onMove, self);
                doc.un('mouseup', onUp, self);
                if (self._dragFrame) {
                    self._dragFrame.style.pointerEvents = '';
                    self._dragFrame = null;
                }
                Ext.getBody().setStyle('cursor', '');
                Ext.getBody().removeClass('mediainfo-window-dragging');
                if (self._dragTimer) {
                    clearTimeout(self._dragTimer);
                    self._dragTimer = null;
                }
            };

            doc.on('mousemove', onMove, self);
            doc.on('mouseup', onUp, self, { single: true });
            this._dragTimer = setTimeout(onUp, 10000);
            e.stopEvent();
        },

        onOpen: function (info) {
            this._launchInfo = info;
            SYNO.SDS.AppWindow.prototype.onOpen.apply(this, arguments);
            this.setupDragGuard();
            this.applyLaunchInfo();
        },

        onRequest: function (info) {
            this._launchInfo = info;
            SYNO.SDS.AppWindow.prototype.onRequest.apply(this, arguments);
            this.applyLaunchInfo();
        },

        addFiles: function (payload) {
            if (!payload || !payload.paths || !payload.paths.length) {
                return;
            }
            var frame = Ext.getDom(this.iframeId);
            if (frame && frame.contentWindow) {
                frame.contentWindow.postMessage({
                    type: 'mediainfo-open',
                    paths: payload.paths,
                    names: payload.names || []
                }, window.location.origin);
            }
            var lastName = payload.names && payload.names.length
                ? payload.names[payload.names.length - 1]
                : payload.paths[payload.paths.length - 1].split('/').pop();
            this.setTitle('MediaInfoViewer - ' + lastName);
            this.show();
            this.toFront();
        },

        applyLaunchInfo: function () {
            var info = this._launchInfo;
            var payload = info && info.fb_recs;
            if (!payload || !payload.paths || !payload.paths.length) {
                return;
            }
            var url = PAGE_URL + '?paths=' + encodeURIComponent(JSON.stringify(payload.paths));
            this.setURL(url);
            var first = (payload.names && payload.names[0]) || payload.paths[0].split('/').pop();
            var suffix = payload.paths.length > 1 ? ' 等 ' + payload.paths.length + ' 个文件' : '';
            this.setTitle('MediaInfoViewer - ' + first + suffix);
        }
    });
})();
