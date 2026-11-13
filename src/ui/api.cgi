#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""MediaInfo for File Station - CGI backend.

This CGI is executed by DSM's synoscgi as root.  For every request it:

  1. validates the DSM session through the official authenticate.cgi;
  2. validates the requested path (absolute, inside /volume*, regular file);
  3. drops privileges to the *logged-in DSM user* and runs the mediainfo
     command line tool, so the kernel enforces the same permissions that
     File Station enforces for that user;
  4. returns the MediaInfo JSON/Text output as JSON.

Only read-only operations are performed.  No shell is involved, so the
file path can never be interpreted as a command.
"""

import contextlib
import json
import os
import pwd
import re
import subprocess
import sys
import time
import urllib.parse
import uuid

AUTH_CGI = "/usr/syno/synoman/webman/modules/authenticate.cgi"
MEDIAINFO_CANDIDATES = (
    "/var/packages/mediainfo/target/bin/mediainfo",
    "/usr/local/bin/mediainfo",
    "/usr/bin/mediainfo",
)
VOLUME_RE = re.compile(r"^/volume(?:USB)?\d+(?:/|$)")
MAX_TIMEOUT = 90


def emit(obj, status="200 OK"):
    body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
    out = sys.stdout.buffer
    out.write(b"Status: " + status.encode("ascii") + b"\r\n")
    out.write(b"Content-Type: application/json; charset=utf-8\r\n")
    out.write(b"Cache-Control: no-store, no-cache, must-revalidate\r\n")
    out.write(b"Pragma: no-cache\r\n")
    out.write(b"X-Content-Type-Options: nosniff\r\n")
    out.write(b"Content-Length: " + str(len(body)).encode("ascii") + b"\r\n\r\n")
    out.write(body)
    out.flush()


def fail(message, code="error", extra=None):
    payload = {"ok": False, "code": code, "error": message}
    if extra:
        payload.update(extra)
    emit(payload)


def dsm_user():
    """Return the authenticated DSM user name, or None.

    authenticate.cgi is the official helper used by DSM package CGIs.  It
    reads the session cookie from the CGI environment and prints the user
    name when the session is valid.
    """
    env = dict(os.environ)
    forwarded = os.environ.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        real = forwarded.split(",")[0].strip()
        if real:
            env["REMOTE_ADDR"] = real
    try:
        proc = subprocess.run(
            [AUTH_CGI], capture_output=True, timeout=10, env=env, cwd="/tmp"
        )
    except (OSError, subprocess.SubprocessError):
        return None
    name = proc.stdout.decode("utf-8", "replace").strip()
    return name or None


def find_mediainfo():
    for path in MEDIAINFO_CANDIDATES:
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path
    # Fall back to any installed mediainfo package (e.g. 32-bit variants).
    try:
        import glob

        for path in sorted(glob.glob("/var/packages/mediainfo*/target/bin/mediainfo")):
            if os.path.isfile(path) and os.access(path, os.X_OK):
                return path
    except OSError:
        pass
    return None


def normalize_path(raw):
    if not raw or len(raw) > 4096:
        return None
    if "\x00" in raw or "\n" in raw or "\r" in raw:
        return None
    if not raw.startswith("/"):
        return None
    path = os.path.normpath(raw)
    if not VOLUME_RE.match(path):
        return None
    if path == "/":
        return None
    return path


def run_as_user(user, argv, timeout):
    pw = pwd.getpwnam(user)
    groups = os.getgrouplist(user, pw.pw_gid)
    env = {
        "PATH": "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
        "HOME": "/tmp",
        "TMPDIR": "/tmp",
        "LANG": "C.UTF-8",
        "LC_ALL": "C.UTF-8",
    }

    def demote():
        os.setgroups(groups)
        os.setgid(pw.pw_gid)
        os.setuid(pw.pw_uid)

    return subprocess.run(
        argv,
        capture_output=True,
        timeout=timeout,
        env=env,
        cwd="/tmp",
        preexec_fn=demote,
        close_fds=True,
    )


def user_can_read(user, path):
    """Check the file with the *target user's* credentials (ACL aware)."""
    code = "import os,sys; sys.exit(0 if os.access(sys.argv[1], os.R_OK) else 1)"
    try:
        proc = run_as_user(user, ["/usr/bin/python3", "-c", code, path], 15)
    except (subprocess.TimeoutExpired, OSError, subprocess.SubprocessError):
        return False
    return proc.returncode == 0


@contextlib.contextmanager
def ascii_link(path):
    """MediaInfo 26.05 fails to open paths containing non-ASCII bytes.

    Present the file through a temporary ASCII-only symlink instead.  The
    symlink lives in /tmp (sticky) and is removed immediately after use.  The
    target is opened with the caller's (dropped) credentials, so permissions
    are still enforced by the kernel.
    """
    if path.isascii():
        yield path
        return
    ext = os.path.splitext(path)[1]
    if not re.match(r"^\.[A-Za-z0-9]{1,8}$", ext or ""):
        ext = ""
    link = "/tmp/mifs-%s%s" % (uuid.uuid4().hex[:16], ext)
    try:
        os.symlink(path, link)
    except OSError:
        yield path
        return
    try:
        yield link
    finally:
        try:
            os.unlink(link)
        except OSError:
            pass


def action_info(user, params):
    if os.geteuid() != 0:
        fail("套件权限配置未生效，请重新安装本套件。", "not_root")
        return
    raw_path = (params.get("path") or [""])[0]
    path = normalize_path(raw_path)
    if not path:
        fail("无效的文件路径。", "bad_path")
        return
    if not os.path.exists(path):
        fail("文件不存在或已被移除。", "not_found")
        return
    if not os.path.isfile(path):
        fail("该路径不是一个普通文件。", "not_file")
        return
    try:
        if os.path.getsize(path) <= 0:
            fail("文件为空，无法读取媒体信息。", "empty_file")
            return
    except OSError as exc:
        fail("无法访问文件：%s" % exc.strerror, "stat_failed")
        return

    if not user_can_read(user, path):
        fail("当前 DSM 用户没有读取该文件的权限。", "permission_denied")
        return

    mediainfo = find_mediainfo()
    if not mediainfo:
        fail(
            "未找到 MediaInfo 命令行工具。请先在套件中心安装 MediaInfo（SynoCommunity）套件。",
            "mediainfo_missing",
        )
        return

    full = (params.get("full") or ["0"])[0] == "1"

    started = time.time()
    try:
        with ascii_link(path) as run_path:
            json_args = [mediainfo, "--Output=JSON", "--Language=raw"]
            text_args = [mediainfo, "--Output=Text"]
            if full:
                json_args.insert(1, "--Full")
                text_args.insert(1, "--Full")
            json_args.append(run_path)
            text_args.append(run_path)
            try:
                json_proc = run_as_user(user, json_args, MAX_TIMEOUT)
            except subprocess.TimeoutExpired:
                fail("读取媒体信息超时（文件可能过大或位于慢速存储）。", "timeout")
                return
            except (OSError, subprocess.SubprocessError) as exc:
                fail("无法以当前用户身份运行 MediaInfo：%s" % exc, "spawn_failed")
                return

            if json_proc.returncode != 0:
                stderr = (json_proc.stderr or b"").decode("utf-8", "replace").strip()
                if "Permission denied" in stderr or "permission" in stderr.lower():
                    fail("当前 DSM 用户没有读取该文件的权限。", "permission_denied")
                else:
                    fail("MediaInfo 无法解析该文件。", "mediainfo_failed", {"detail": stderr[:2000]})
                return

            raw_json = (json_proc.stdout or b"").decode("utf-8", "replace").strip()
            if run_path != path:
                raw_json = raw_json.replace(run_path, path)
            try:
                parsed = json.loads(raw_json)
            except ValueError:
                fail("MediaInfo 返回的数据无法解析。", "bad_output", {"detail": raw_json[:2000]})
                return

            try:
                text_proc = run_as_user(user, text_args, MAX_TIMEOUT)
                text = (text_proc.stdout or b"").decode("utf-8", "replace").strip()
                if text_proc.returncode != 0 and not text:
                    text = ""
            except (subprocess.TimeoutExpired, OSError, subprocess.SubprocessError):
                text = ""
            if run_path != path and text:
                text = text.replace(run_path, path)
    except OSError as exc:
        fail("无法准备临时文件：%s" % exc, "temp_failed")
        return

    try:
        stat = os.stat(path)
        size = stat.st_size
        mtime = stat.st_mtime
        mtime_text = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(mtime))
    except OSError:
        size = 0
        mtime = 0
        mtime_text = ""

    media = parsed.get("media") if isinstance(parsed, dict) else None
    if not media:
        fail("无法解析该文件（可能是权限不足、文件损坏或格式不受支持）。", "cannot_read")
        return
    tracks = (media or {}).get("track") or []
    library = (parsed.get("creatingLibrary") or {}).get("version", "") if isinstance(parsed, dict) else ""

    emit(
        {
            "ok": True,
            "data": {
                "path": path,
                "name": os.path.basename(path),
                "size": size,
                "mtime": mtime,
                "mtime_text": mtime_text,
                "mediainfo": parsed,
                "text": text,
                "track_count": len(tracks),
                "library": library,
                "full": full,
                "elapsed_ms": int((time.time() - started) * 1000),
            },
        }
    )


EXPORT_FORMATS = {
    "xml": ("--Output=XML", "application/xml; charset=utf-8", "xml"),
    "html": ("--Output=HTML", "text/html; charset=utf-8", "html"),
    "csv": ("--Output=CSV", "text/csv; charset=utf-8", "csv"),
}


def action_export(user, params):
    if os.geteuid() != 0:
        fail("套件权限配置未生效，请重新安装本套件。", "not_root")
        return
    fmt = (params.get("format") or [""])[0].lower()
    if fmt not in EXPORT_FORMATS:
        fail("不支持的导出格式。", "bad_format")
        return
    raw_path = (params.get("path") or [""])[0]
    path = normalize_path(raw_path)
    if not path:
        fail("无效的文件路径。", "bad_path")
        return
    if not os.path.isfile(path):
        fail("文件不存在或不是普通文件。", "not_found")
        return
    if not user_can_read(user, path):
        fail("当前 DSM 用户没有读取该文件的权限。", "permission_denied")
        return
    mediainfo = find_mediainfo()
    if not mediainfo:
        fail(
            "未找到 MediaInfo 命令行工具。请先在套件中心安装 MediaInfo（SynoCommunity）套件。",
            "mediainfo_missing",
        )
        return

    full = (params.get("full") or ["0"])[0] == "1"
    output_opt, mime, ext = EXPORT_FORMATS[fmt]
    argv = [mediainfo]
    if full:
        argv.append("--Full")
    argv.extend([output_opt, path])
    try:
        with ascii_link(path) as run_path:
            argv[-1] = run_path
            proc = run_as_user(user, argv, MAX_TIMEOUT)
            content = (proc.stdout or b"").decode("utf-8", "replace")
            if run_path != path:
                content = content.replace(run_path, path)
    except subprocess.TimeoutExpired:
        fail("导出超时（文件可能过大或位于慢速存储）。", "timeout")
        return
    except (OSError, subprocess.SubprocessError) as exc:
        fail("无法以当前用户身份运行 MediaInfo：%s" % exc, "spawn_failed")
        return
    if proc.returncode != 0 or not content.strip():
        detail = (proc.stderr or b"").decode("utf-8", "replace").strip()
        fail("MediaInfo 无法导出该文件。", "mediainfo_failed", {"detail": detail[:2000]})
        return

    base = os.path.splitext(os.path.basename(path))[0]
    emit(
        {
            "ok": True,
            "data": {
                "format": fmt,
                "content": content,
                "filename": "%s.mediainfo.%s" % (base, ext),
                "mime": mime,
                "full": full,
            },
        }
    )


def action_version(user, params):
    mediainfo = find_mediainfo()
    version = ""
    if mediainfo:
        try:
            proc = run_as_user(user, [mediainfo, "--Version"], 15)
            version = (proc.stdout or b"").decode("utf-8", "replace").strip()
        except (subprocess.TimeoutExpired, OSError, subprocess.SubprocessError):
            version = ""
    emit({"ok": True, "data": {"mediainfo": mediainfo or "", "version": version}})


def main():
    method = os.environ.get("REQUEST_METHOD", "GET").upper()
    if method != "GET":
        fail("只支持 GET 请求。", "method_not_allowed")
        return

    # Reject simple cross-site requests.  The viewer always sends the
    # X-Requested-With header from its same-origin fetch().
    same_origin = os.environ.get("HTTP_SEC_FETCH_SITE", "") in ("same-origin", "none")
    xrw = os.environ.get("HTTP_X_REQUESTED_WITH", "").lower() == "xmlhttprequest"
    if not xrw and not same_origin:
        fail("请求来源未被允许。", "forbidden")
        return

    user = dsm_user()
    if not user:
        fail("登录会话已失效，请刷新 DSM 页面后重试。", "unauthorized")
        return

    try:
        pwd.getpwnam(user)
    except KeyError:
        fail("无法识别当前 DSM 用户（可能为域用户）。", "unknown_user")
        return

    params = urllib.parse.parse_qs(os.environ.get("QUERY_STRING", ""), keep_blank_values=True)
    action = (params.get("action") or ["info"])[0]

    if action == "info":
        action_info(user, params)
    elif action == "export":
        action_export(user, params)
    elif action == "version":
        action_version(user, params)
    else:
        fail("未知操作：%s" % action, "bad_action")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # never leak a Python traceback into the HTTP response
        try:
            fail("内部错误：%s" % exc, "internal_error")
        except Exception:
            pass
