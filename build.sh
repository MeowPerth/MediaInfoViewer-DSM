#!/usr/bin/env bash
# Build the MediaInfo for File Station SPK.
# .spk is an uncompressed tar: INFO + package.tgz + scripts/ + conf/ + icons.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PKG_NAME="mediainfo-viewer"
VERSION="1.0.0"
ARCH="epyc7002 x86_64"
SPK_FILE="${ROOT}/dist/${PKG_NAME}_x86_64-dsm7_${VERSION}.spk"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
STAGE="$WORK/stage"
mkdir -p "$STAGE/ui/images" "$STAGE/bin" "$WORK/scripts" "$WORK/conf" "$WORK/WIZARD_UIFILES" "$ROOT/dist"

echo "==> checking sources"
node --check "$ROOT/src/ui/app.js"
python3 -m py_compile "$ROOT/src/ui/api.cgi"
python3 -c 'import json,sys; json.load(open(sys.argv[1]))' "$ROOT/src/ui/config"
python3 -c 'import json,sys; json.load(open(sys.argv[1]))' "$ROOT/src/ui/demo.json"
for f in "$ROOT"/spk/WIZARD_UIFILES/*; do
    python3 -c 'import json,sys; json.load(open(sys.argv[1]))' "$f"
done
for f in "$ROOT"/spk/scripts/*; do
    sh -n "$f"
done

echo "==> compiling enable helper"
gcc -O2 -static -s -o "$STAGE/bin/mediainfo-viewer-enable" "$ROOT/src/bin/enable.c"
chmod 0755 "$STAGE/bin/mediainfo-viewer-enable"

echo "==> assembling package.tgz"
install -m 0755 "$ROOT/src/ui/api.cgi"           "$STAGE/ui/api.cgi"
install -m 0644 "$ROOT/src/ui/config"            "$STAGE/ui/config"
install -m 0644 "$ROOT/src/ui/dsm-wrapper.js"    "$STAGE/ui/dsm-wrapper.js"
install -m 0644 "$ROOT/src/ui/index.html"        "$STAGE/ui/index.html"
install -m 0644 "$ROOT/src/ui/app.js"            "$STAGE/ui/app.js"
install -m 0644 "$ROOT/src/ui/app.css"           "$STAGE/ui/app.css"
install -m 0644 "$ROOT/src/ui/style.css"         "$STAGE/ui/style.css"
install -m 0644 "$ROOT/src/ui/demo.json"         "$STAGE/ui/demo.json"
for icon in "$ROOT"/src/ui/images/*.png; do
    install -m 0644 "$icon" "$STAGE/ui/images/$(basename "$icon")"
done

echo "==> assembling scripts / conf / wizard"
for f in "$ROOT"/spk/scripts/*; do
    install -m 0755 "$f" "$WORK/scripts/$(basename "$f")"
done
install -m 0644 "$ROOT/spk/conf/privilege" "$WORK/conf/privilege"
for f in "$ROOT"/spk/WIZARD_UIFILES/*; do
    install -m 0644 "$f" "$WORK/WIZARD_UIFILES/$(basename "$f")"
done
install -m 0644 "$ROOT/spk/PACKAGE_ICON.PNG"     "$WORK/PACKAGE_ICON.PNG"
install -m 0644 "$ROOT/spk/PACKAGE_ICON_256.PNG" "$WORK/PACKAGE_ICON_256.PNG"
install -m 0644 "$ROOT/LICENSE"                  "$WORK/LICENSE"

echo "==> creating package.tgz"
( cd "$STAGE" && tar czf "$WORK/package.tgz" bin ui )

CHECKSUM="$(md5sum "$WORK/package.tgz" | cut -d' ' -f1)"
echo "==> package.tgz md5 = ${CHECKSUM}"

cat > "$WORK/INFO" <<INFO
package="${PKG_NAME}"
version="${VERSION}"
description="MediaInfoViewer - view detailed MediaInfo technical data for audio and video files from the File Station right-click menu."
description_chs="MediaInfoViewer（MediaInfo查看器）：在 File Station 右键点击音视频文件，查看封装、视频、音频、字幕、章节等详细技术信息。"
description_cht="MediaInfoViewer（MediaInfo檢視器）：在 File Station 右鍵點擊音視訊檔案，檢視封裝、視訊、音訊、字幕、章節等詳細技術資訊。"
arch="epyc7002 x86_64"
os_min_ver="7.1-42661"
displayname="MediaInfo查看器"
displayname_enu="MediaInfoViewer"
displayname_chs="MediaInfo查看器"
displayname_cht="MediaInfo檢視器"
dsmuidir="ui"
dsmappname="MeowPerth.MediaInfoViewer.AppInstance"
maintainer="MeowPerth"
maintainer_url="https://github.com/MeowPerth/MediaInfoViewer-DSM"
distributor="MeowPerth"
distributor_url="https://github.com/MeowPerth/MediaInfoViewer-DSM"
helpurl="https://github.com/MeowPerth/MediaInfoViewer-DSM"
support_url="https://github.com/MeowPerth/MediaInfoViewer-DSM/issues"
install_dep_packages="mediainfo"
install_conflict_packages="mediainfo-fs"
startable="yes"
reloadui="yes"
changelog="1.0.0: first release - File Station 打开菜单 / 单窗口多标签 / 标准与完整模式 / 字段搜索 / 轨道总览 / HDR 与音频徽章 / 文本与 JSON / XML HTML CSV 导出"
checksum="${CHECKSUM}"
INFO

echo "==> packing .spk"
( cd "$WORK" && tar cpf "$SPK_FILE" INFO package.tgz scripts conf WIZARD_UIFILES \
    PACKAGE_ICON.PNG PACKAGE_ICON_256.PNG LICENSE )

echo "==> done: ${SPK_FILE}"
ls -lh "$SPK_FILE"
tar tf "$SPK_FILE"
