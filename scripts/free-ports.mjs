#!/usr/bin/env node
/**
 * 启动前自动释放开发端口。
 * 由 package.json 的 `predev` 钩子在 `npm run dev` 之前自动执行，
 * 杀掉仍在监听目标端口(前端 Vite / 后端 Express)的孤儿进程，避免 EADDRINUSE。
 *
 * 跨平台：Windows 用 netstat + taskkill；macOS/Linux 用 lsof + kill。
 * 只结束"正在监听(LISTEN)目标端口"的进程，不误伤其他连接。
 */
import { execSync } from 'node:child_process';

const PORTS = [3000, 5173, 5174];
const isWin = process.platform === 'win32';

/** 返回正在监听指定端口的 PID 集合 */
function getListeningPids(port) {
  const pids = new Set();
  try {
    if (isWin) {
      // netstat 输出示例:  TCP    0.0.0.0:3000   0.0.0.0:0   LISTENING   1234
      const out = execSync('netstat -ano -p TCP', { encoding: 'utf8' });
      for (const line of out.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line)) continue;
        // 精确匹配本地地址以 :port 结尾(避免 :30000 命中 :3000)
        const m = line.match(/[:.](\d+)\s+\S+\s+LISTENING\s+(\d+)/i);
        if (m && Number(m[1]) === port) pids.add(m[2]);
      }
    } else {
      // -sTCP:LISTEN 只取监听态；-t 只输出 PID
      const out = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8' });
      out.split(/\r?\n/).forEach((p) => p.trim() && pids.add(p.trim()));
    }
  } catch {
    // 无匹配进程时命令会以非 0 退出，视为端口空闲
  }
  return pids;
}

function killPid(pid) {
  try {
    if (isWin) execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
    else execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

let killed = 0;
for (const port of PORTS) {
  for (const pid of getListeningPids(port)) {
    if (killPid(pid)) {
      console.log(`[free-ports] 已释放端口 ${port} (结束进程 PID ${pid})`);
      killed++;
    }
  }
}

console.log(
  killed
    ? `[free-ports] 清理完成，共释放 ${killed} 个进程。`
    : '[free-ports] 目标端口均空闲，无需清理。'
);
