const fetch = require('node-fetch');
require('dotenv').config();

// 共通：kintoneからデータ取得
const fetchRecords = async (appId, apiToken, query = '') => {
    const url = `${process.env.KINTONE_BASE_URL}/k/v1/records.json?app=${appId}&query=${encodeURIComponent(query)}`;

    const headers = {
        'X-Cybozu-API-Token': apiToken,
        'X-Requested-With': 'XMLHttpRequest'
    };

    try {
        const res = await fetch(url, { method: 'GET', headers });
        const data = await res.json();
        if (!res.ok) throw data;
        return data.records;
    } catch (err) {
        console.error(`❌ アプリID ${appId} の取得に失敗:`, err);
        return [];
    }
};

// 評価期間取得
const fetchEvaluationPeriods = async () => {
    return await fetchRecords(
        process.env.KINTONE_EVALUATION_PERIOD_APP_ID,
        process.env.KINTONE_EVALUATION_PERIOD_API_TOKEN,
        'evaluation_period != "" limit 500'
    );
};

// 自己評価取得
const fetchSelfEvaluations = async () => {
    return await fetchRecords(
        process.env.KINTONE_SELF_APP_ID,
        process.env.KINTONE_SELF_API_TOKEN,
        'evaluation_period != "" limit 500'
    );
};

// 多面評価入力
const fetchMultiEvaluations = async() => {
    return await fetchRecords(
        process.env.KINTONE_MULTI_APP_ID,
        process.env.KINTONE_MULTI_API_TOKEN,
        'evaluation_period != "" limit 500'
    );
};

// 従業員取得
const fetchAllEmployees = async () => {
    const records = await fetchRecords(
        process.env.KINTONE_EMPLOYEE_APP_ID,
        process.env.KINTONE_EMPLOYEE_API_TOKEN,
        'limit 500'
    );
    return records.filter(r => r.user?.value?.length > 0);
};

module.exports = {
    fetchEvaluationPeriods,
    fetchSelfEvaluations,
    fetchAllEmployees,
    fetchMultiEvaluations,
    fetchRecords
};
