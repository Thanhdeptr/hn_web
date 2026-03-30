import express from 'express';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import cors from 'cors';

const app = express();

// Cho phép các trang web khác (Frontend) gọi API này
app.use(cors());

// Khởi tạo kết nối tới DynamoDB
// Region phải khớp với nơi Thành tạo bảng HackerNews_AI
const client = new DynamoDBClient({ region: "ap-southeast-1" });
const ddbDocClient = DynamoDBDocumentClient.from(client);

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