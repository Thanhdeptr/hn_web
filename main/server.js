import express from 'express';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import cors from 'cors';
import https from "https";
import dns from "dns";

const app = express();

// Cho phép các trang web khác (Frontend) gọi API này
app.use(cors());

const OPENROUTER_RANKINGS_URL = "https://openrouter.ai/rankings";
const CACHE_TTL_MS = 10 * 60 * 1000;
let popularCache = { expiresAt: 0, value: null };

// Khởi tạo kết nối tới DynamoDB
// Region phải khớp với nơi Thành tạo bảng HackerNews_AI
const client = new DynamoDBClient({ region: "ap-southeast-1" });
const ddbDocClient = DynamoDBDocumentClient.from(client);

function parsePopularModelsFromRankingsPage(text, limit = 10) {
  const startIdx = text.indexOf("LLM Leaderboard");
  const slice = startIdx >= 0 ? text.slice(startIdx) : text;

  // OpenRouter rankings HTML in production often includes model routes as relative paths:
  //   /anthropic/claude-4.6-sonnet-20260217
  // so we parse those rather than expecting absolute https://openrouter.ai/... links.
  const urlRe = /\/([a-z0-9-]+)\/([a-z0-9_.:-]+)(?=["\s])/gi;
  const tokensRe = /([0-9]+(?:\.[0-9]+)?\s*[TBM])\s*tokens/ig;

  const out = [];
  const seen = new Set();
  const skipProviders = new Set([
    "css",
    "chunks",
    "_next",
    "static",
    "images",
    "fonts",
    "favicon.ico",
    "api",
    "docs",
    "company",
    "2000",
  ]);

  let m;
  while ((m = urlRe.exec(slice))) {
    const provider = m[1];
    const slug = m[2];

    if (skipProviders.has(provider)) continue;
    if (/^[0-9]+$/.test(provider)) continue;
    // Model slugs usually contain digits and '-' (or ':' for "free" variants)
    if (!/\d/.test(slug)) continue;
    if (!(slug.includes("-") || slug.includes(":"))) continue;
    if (slug.endsWith(".css") || slug.endsWith(".js") || slug.endsWith(".png") || slug.endsWith(".svg")) continue;

    const id = `${provider}/${slug}`;
    if (id.startsWith("apps/")) continue;
    if (seen.has(id)) continue;
    seen.add(id);

    const window = slice.slice(m.index, m.index + 900);
    const tm = tokensRe.exec(window);
    tokensRe.lastIndex = 0;
    const usageTokensWeekly = tm ? tm[1].replace(/\s+/g, "") : null;

    out.push({
      id,
      url: `https://openrouter.ai/${id}`,
      usageTokensWeekly,
    });

    if (out.length >= limit) break;
  }

  return out;
}

async function fetchPopularModels(limit) {
  // If cache is empty, re-fetch (previous parsing attempt could have failed due to HTML changes).
  if (Date.now() < popularCache.expiresAt && Array.isArray(popularCache.value) && popularCache.value.length > 0) {
    return popularCache.value.slice(0, limit);
  }

  const text = await fetchUrlTextIPv4(OPENROUTER_RANKINGS_URL, { "User-Agent": "hn_web/leaderboard" });
  const parsed = parsePopularModelsFromRankingsPage(text, Math.max(10, limit));

  console.log(`[leaderboard] parsed=${Array.isArray(parsed) ? parsed.length : 0}`);
  popularCache = {
    value: parsed,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return parsed.slice(0, limit);
}

function fetchUrlTextIPv4(url, headers = {}) {
  // Node's global fetch may fail if it resolves IPv6 that is unreachable (ENETUNREACH),
  // while curl works via IPv4. We force IPv4 by overriding DNS lookup.
  // This is mainly a robustness improvement; the primary issue here was the HTML parsing regex.
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        method: "GET",
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || 443,
        path: `${u.pathname}${u.search}`,
        headers,
        lookup: (hostname, opts, cb) => dns.lookup(hostname, { ...opts, family: 4 }, cb),
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) return resolve(body);
          return reject(new Error(`OpenRouter rankings failed: HTTP ${res.statusCode || "unknown"} ${body}`.slice(0, 400)));
        });
      },
    );
    req.on("error", (err) => reject(err));
    req.end();
  });
}

// Endpoint chính: Lấy danh sách tin tức
app.get('/api/news', async (req, res) => {
    console.log("Đang nhận yêu cầu lấy tin tức...");
    try {
        const params = {
            TableName: 'HackerNews_AI',
            Limit: 20 // Chỉ lấy 20 tin mới nhất để tiết kiệm băng thông
        };

        const data = await ddbDocClient.send(new ScanCommand(params));
        
        // Trả về mảng các bài báo
        res.json(data.Items);
    } catch (err) {
        console.error("Lỗi khi đọc DynamoDB:", err);
        res.status(500).json({ 
            error: "Không thể lấy dữ liệu từ Database",
            message: err.message 
        });
    }
});

// Leaderboard: Most popular models on OpenRouter (weekly tokens)
app.get('/api/leaderboard/popular', async (req, res) => {
  try {
    const limitRaw = req.query.limit;
    const limit = Math.min(50, Math.max(1, Number(limitRaw ?? 10) || 10));
    const data = await fetchPopularModels(limit);
    res.json({ data });
  } catch (err) {
    console.error("Lỗi khi lấy leaderboard OpenRouter:", err);
    res.status(500).json({
      error: "Không thể lấy leaderboard từ OpenRouter",
      message: err.message,
    });
  }
});

// Endpoint Health Check: Giúp AWS biết Server vẫn đang "sống"
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Lắng nghe tại cổng 3000
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`Backend AI News đã sẵn sàng!`);
    console.log(`Link test: http://localhost:${PORT}/api/news`);
    console.log(`=========================================`);
});