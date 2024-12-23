const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const { exec } = require("child_process");
const { version } = require("./package.json");

const GITHUB_API_URL = "https://api.github.com/repos/JonasPaprotka/Shared-OBS-Control/releases/latest";

function compareVersions(v1, v2) {
    const v1Parts = v1.split(".").map(Number);
    const v2Parts = v2.split(".").map(Number);
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const part1 = v1Parts[i] || 0;
        const part2 = v2Parts[i] || 0;
        if (part1 > part2) return 1;
        if (part1 < part2) return -1;
    }
    return 0;
}

function fetchLatestRelease() {
    return new Promise((resolve, reject) => {
        https
            .get(GITHUB_API_URL, { headers: { "User-Agent": "Electron-App" } }, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    try {
                        const release = JSON.parse(data);
                        const latestVersion = release.tag_name.replace(/^v/, "");
                        const downloadUrl = release.assets[0]?.browser_download_url;
                        resolve({ latestVersion, downloadUrl });
                    } catch (error) {
                        reject(new Error("Failed to parse release data."));
                    }
                });
            })
            .on("error", reject);
    });
}

function downloadFile(url, destination, onProgress) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destination);
        https
            .get(url, (res) => {
                const totalSize = parseInt(res.headers["content-length"], 10);
                let downloaded = 0;

                res.on("data", (chunk) => {
                    downloaded += chunk.length;
                    onProgress((downloaded / totalSize) * 100);
                });

                res.pipe(file);
                file.on("finish", () => file.close(() => resolve(destination)));
            })
            .on("error", (err) => {
                fs.unlink(destination, () => reject(err));
            });
    });
}

function installUpdate(updateFile) {
    return new Promise((resolve, reject) => {
        const installDir = app.getAppPath();
        const tempDir = path.join(app.getPath("temp"), "update-extract");

        fs.mkdirSync(tempDir, { recursive: true });

        exec(`unzip -o "${updateFile}" -d "${tempDir}"`, (error) => {
            if (error) return reject(error);

            try {
                fs.readdirSync(tempDir).forEach((file) => {
                    const srcPath = path.join(tempDir, file);
                    const destPath = path.join(installDir, file);
                    if (fs.existsSync(destPath)) fs.rmSync(destPath, { recursive: true });
                    fs.renameSync(srcPath, destPath);
                });

                resolve();
            } catch (err) {
                reject(err);
            }
        });
    });
}

async function checkForUpdates(mainWindow) {
    try {
        const { latestVersion, downloadUrl } = await fetchLatestRelease();
        if (compareVersions(latestVersion, version) > 0) {
            mainWindow.webContents.send("update-available", { version: latestVersion });

            const updateFile = path.join(app.getPath("downloads"), `update-${latestVersion}.zip`);
            await downloadFile(downloadUrl, updateFile, (progress) => {
                mainWindow.webContents.send("update-progress", progress);
            });

            await installUpdate(updateFile);
            mainWindow.webContents.send("update-installed");

            app.relaunch();
            app.exit(0);
        }
    } catch (error) {
        console.error("Update error:", error.message);
    }
}

module.exports = { checkForUpdates };
