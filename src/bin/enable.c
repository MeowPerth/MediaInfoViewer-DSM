/*
 * mediainfo-fs-enable: tiny setuid helper for the UI-only package.
 *
 *   1. create /var/packages/mediainfo-fs/enabled (DSM's enabled marker);
 *   2. install a one-shot systemd timer that runs `synopkg start mediainfo-fs`
 *      after install/boot, so File Station sees the package as "start" and
 *      loads the right-click menu (a UI-only package has no long-running
 *      daemon whose status would otherwise flip to start);
 *   3. remove that timer on uninstall.
 *
 * The helper accepts only fixed arguments and runs only fixed commands.
 */
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <sys/types.h>

#define ENABLED_PATH "/var/packages/mediainfo-fs/enabled"
#define UNIT_DIR "/etc/systemd/system"
#define SERVICE_PATH UNIT_DIR "/mediainfo-fs-autostart.service"
#define TIMER_PATH UNIT_DIR "/mediainfo-fs-autostart.timer"

static int write_file(const char *path, const char *content)
{
    FILE *fp = fopen(path, "w");
    if (!fp) {
        perror(path);
        return 1;
    }
    fputs(content, fp);
    fclose(fp);
    chmod(path, 0644);
    chown(path, 0, 0);
    return 0;
}

static void install_autostart(void)
{
    write_file(SERVICE_PATH,
        "[Unit]\n"
        "Description=Start MediaInfoViewer package\n"
        "[Service]\n"
        "Type=oneshot\n"
        "ExecStart=/usr/syno/bin/synopkg start mediainfo-fs\n");
    write_file(TIMER_PATH,
        "[Unit]\n"
        "Description=Start MediaInfoViewer after boot or install\n"
        "[Timer]\n"
        "OnActiveSec=2s\n"
        "Unit=mediainfo-fs-autostart.service\n"
        "[Install]\n"
        "WantedBy=timers.target\n");
    system("/usr/bin/systemctl daemon-reload >/dev/null 2>&1");
    system("/usr/bin/systemctl enable mediainfo-fs-autostart.timer >/dev/null 2>&1");
    system("/usr/bin/systemctl stop mediainfo-fs-autostart.timer >/dev/null 2>&1");
    system("/usr/bin/systemctl start mediainfo-fs-autostart.timer >/dev/null 2>&1");
}

static void remove_autostart(void)
{
    system("/usr/bin/systemctl disable mediainfo-fs-autostart.timer >/dev/null 2>&1");
    system("/usr/bin/systemctl stop mediainfo-fs-autostart.timer >/dev/null 2>&1");
    unlink(TIMER_PATH);
    unlink(SERVICE_PATH);
    system("/usr/bin/systemctl daemon-reload >/dev/null 2>&1");
}

int main(int argc, char **argv)
{
    FILE *fp;

    if (argc == 2 && strcmp(argv[1], "--remove-autostart") == 0) {
        if (geteuid() != 0) {
            fprintf(stderr, "not running with root privileges\n");
            return 3;
        }
        if (setuid(0) != 0) {
            perror("setuid");
            return 3;
        }
        remove_autostart();
        return 0;
    }

    if (argc < 2 || strcmp(argv[1], ENABLED_PATH) != 0) {
        fprintf(stderr, "usage: %s " ENABLED_PATH " [--install-autostart]\n", argv[0]);
        return 2;
    }
    if (geteuid() != 0) {
        fprintf(stderr, "not running with root privileges\n");
        return 3;
    }
    if (setuid(0) != 0) {
        perror("setuid");
        return 3;
    }

    fp = fopen(ENABLED_PATH, "a");
    if (!fp) {
        perror("fopen");
        return 4;
    }
    fclose(fp);
    chmod(ENABLED_PATH, 0644);
    chown(ENABLED_PATH, 0, 0);

    if (argc > 2 && strcmp(argv[2], "--install-autostart") == 0) {
        install_autostart();
    }
    return 0;
}
