/**
 * 从网络拉取四个央视频道台标到 ../logo/，文件名与 logo.json 主条目一致。
 * 来源：GitHub fanmingming/live（tv/）、vircloud/TVLogo（备用）、百度百科配图（央视精品，公开 CDN）。
 */
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoDir = path.join(__dirname, "..", "logo");

const fm = "https://raw.githubusercontent.com/fanmingming/live/main/tv/";
const vc = "https://raw.githubusercontent.com/vircloud/TVLogo/main/";

/** 百度百科「央视文化精品频道」相册中的台标图，加 f_png 输出 PNG（频道前身为 CCTV-央视精品）。 */
const baikeJingpinPng =
  "https://bkimg.cdn.bcebos.com/pic/622762d0f703918fa0ecdcf71066319759ee3d6d6ec0?x-bce-process=image/format,f_png";

const jobs = [
  {
    out: "央视台球.png",
    urls: [`${fm}%E5%A4%AE%E8%A7%86%E5%8F%B0%E7%90%83.png`, `${vc}%E5%A4%AE%E8%A7%86%E5%8F%B0%E7%90%83.png`],
  },
  {
    out: "CCTV女性时尚.png",
    urls: [`${fm}%E5%A5%B3%E6%80%A7%E6%97%B6%E5%B0%9A.png`, `${vc}%E5%A5%B3%E6%80%A7%E6%97%B6%E5%B0%9A.png`],
  },
  {
    out: "央视文化.png",
    urls: [`${fm}%E6%96%87%E5%8C%96%E7%B2%BE%E5%93%81.png`, `${vc}%E6%96%87%E5%8C%96%E7%B2%BE%E5%93%81.png`],
  },
  {
    out: "央视精品.png",
    urls: [baikeJingpinPng],
  },
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; logo-pages-fetch/1.0)" },
        timeout: 90000,
      },
      (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location;
          res.resume();
          if (!loc) {
            reject(new Error("Redirect without location"));
            return;
          }
          fetchBuffer(new URL(loc, url).href).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

function isPng(buf) {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  );
}

async function main() {
  if (!fs.existsSync(logoDir)) {
    fs.mkdirSync(logoDir, { recursive: true });
  }

  let cultureBuf = null;

  for (const job of jobs) {
    const dest = path.join(logoDir, job.out);
    let ok = false;
    for (const url of job.urls) {
      try {
        const buf = await fetchBuffer(url);
        if (!isPng(buf)) {
          console.error(job.out, "skip non-png from", url.slice(0, 80));
          continue;
        }
        fs.writeFileSync(dest, buf);
        console.log("OK", job.out, buf.length, "bytes");
        if (job.out === "央视文化.png") cultureBuf = buf;
        ok = true;
        break;
      } catch (e) {
        console.error("FAIL", job.out, url.slice(0, 72), "—", e.message);
      }
    }
    if (!ok && job.out === "央视精品.png" && cultureBuf) {
      fs.writeFileSync(dest, cultureBuf);
      console.log("OK", job.out, "(fallback: same image as 央视文化.png / 文化精品)");
      ok = true;
    }
    if (!ok) {
      process.exitCode = 1;
      console.error("ERROR: could not download", job.out);
    }
  }
}

main();
