const { google } = require('googleapis');
const { readFileSync } = require('fs');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(readFileSync(path.resolve('credentials/sheets-service-account.json'), 'utf-8')),
    scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets'
    ]
});

// 従業員を取得
const fetchKintoneRecords = async (appId, apiToken, query = 'limit 500') => {
    const response = await axios.get(`${process.env.KINTONE_BASE_URL}/k/v1/records.json`, {
        headers: { 'X-Cybozu-API-Token': apiToken },
        params: { app: appId, query }
    });
    return response.data.records;
};

module.exports = {
    auth,
    fetchKintoneRecords,
};
