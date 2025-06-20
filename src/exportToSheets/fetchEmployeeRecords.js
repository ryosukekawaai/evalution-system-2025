const fetch = require('node-fetch');
require('dotenv').config();

// kintoneから情報を取得
const fetchRecords = async (appId, apiToken, query = '') => {
    const url = `${process.env.KINTONE_BASE_URL}/k/v1/records.json?app=${appId}&query=${encodeURIComponent(query)}`;

    const headers = {
        'X-Cybozu-API-Token': apiToken,
        'X-Requested-With': 'XMLHttpRequest'
    };

    try {
        // データ取得
        const res = await fetch(url, { method: 'GET', headers });
        const data = await res.json();
        if (!res.ok) throw data;
        return data.records;
    } catch (err) {
        console.error(`❌ アプリID ${appId} の取得に失敗:`, err);
        return [];
    }
};

const fetchEmployeeRecords = async (evaluationPeriod) => {
    // 各アプリからデータを取得
    const [multiRecords, selfRecords, averageRecords] = await Promise.all([
        fetchRecords(process.env.KINTONE_MULTI_APP_ID, process.env.KINTONE_MULTI_API_TOKEN, `evaluation_period = "${evaluationPeriod}" limit 500`),
        fetchRecords(process.env.KINTONE_SELF_APP_ID, process.env.KINTONE_SELF_API_TOKEN, `evaluation_period = "${evaluationPeriod}" limit 500`),
        fetchRecords(process.env.KINTONE_AVERAGE_APP_ID, process.env.KINTONE_AVERAGE_API_TOKEN, `evaluation_period = "${evaluationPeriod}" limit 500`)
    ]);

    return {
        multiRecords,
        selfRecords,
        averageRecords
    };
};

module.exports = {
    fetchEmployeeRecords
};
