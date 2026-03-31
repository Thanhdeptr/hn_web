import express from 'express';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import cors from 'cors';

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
  // The rankings page contains "## LLM Leaderboard" and links like:
  // https://openrouter.ai/anthropic/claude-sonnet-4.6
  // Then nearby: "1.04T tokens"
  const startIdx = text.indexOf("## LLM Leaderboard");
  const slice = startIdx >= 0 ? text.slice(startIdx, startIdx + 25000) : text;

  const urlRe = /https:\/\/openrouter\.ai\/([a-z0-9_.-]+\/[a-z0-9_.:-]+)/gi;
  const tokensRe = /([0-9]+(?:\.[0-9]+)?\s*[TBM])\s*tokens/ig;

  const out = [];
  const seen = new Set();
  let m;
  while ((m = urlRe.exec(slice))) {
    const id = m[1];
    if (id.startsWith("apps")) continue;
    if (seen.has(id)) continue;
    seen.add(id);

    const window = slice.slice(m.index, m.index + 600);
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
  if (Date.now() < popularCache.expiresAt && Array.isArray(popularCache.value)) {
    return popularCache.value.slice(0, limit);
  }

  const res = await fetch(OPENROUTER_RANKINGS_URL, {
    headers: { "User-Agent": "hn_web/leaderboard" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter rankings failed: HTTP ${res.status} ${body}`.slice(0, 400));
  }
  const text = await res.text();
  const parsed = parsePopularModelsFromRankingsPage(text, Math.max(10, limit));

  popularCache = {
    value: parsed,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return parsed.slice(0, limit);
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