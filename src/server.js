const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

const { fetchEmployeeRecords } = require('./exportToSheets/fetchEmployeeRecords');
const exportToSheetGeneral = require('./exportToSheets/general');
const exportToSheetAdminInput = require('./exportToSheets/adminInput');
const exportToSheetAdminView = require('./exportToSheets/adminView');

const createFolder = require('./exportToSheets/createFolder');

// envファイル読み込み
dotenv.config();
const app = express();
app.use(express.json());

// スケジュール処理（Slack通知）
require(path.join(__dirname, 'scheduler', 'evaluationReminder'));

// CORS対応（すべてのリクエストに対応）
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// OPTIONSリクエスト（プリフライト）に対応
app.options('*', (req, res) => {
    res.sendStatus(200);
});

// スプレッドシートへの出力処理
app.post('/api/exportToSheet', async (req, res) => {
    const { evaluationPeriod } = req.body;

    // 期間のnullチェック
    if (!evaluationPeriod) {
        return res.status(400).json({ error: 'evaluationPeriodが指定されていません。' });
    }

    try {
        const now = new Date();
        const jstNow = new Date(now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
        const timestamp = jstNow.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];

        const folderName = `${evaluationPeriod}_${timestamp}`;

        // 「評価期間」フォルダの作成
        const periodFolderId = await createFolder(folderName, process.env.FOLDER_ID);

        // 各アプリから該当データ取得
        const allData = await fetchEmployeeRecords(evaluationPeriod);

        // スプレッドシート出力処理
        await exportToSheetGeneral(evaluationPeriod, allData, periodFolderId);
        await exportToSheetAdminInput(evaluationPeriod, allData, periodFolderId);
        await exportToSheetAdminView(evaluationPeriod, allData, periodFolderId);

        res.status(200).json({ message: '全社員分の出力に成功しました！' });
    } catch (error) {
        console.error('出力エラー:', error);
        res.status(500).json({ error: 'スプレッドシート出力に失敗しました。' });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
