const { google } = require('googleapis');
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

// Render上でJSONを.envから復元
const ensureCredentialsFile = () => {
    const credDir = path.resolve('credentials');
    const credPath = path.join(credDir, 'sheets-service-account.json');

    if (!existsSync(credDir)) {
        mkdirSync(credDir);
    }

    if (!existsSync(credPath)) {
        const base64 = process.env.SHEETS_SERVICE_ACCOUNT_JSON_BASE64;
        if (!base64) {
            throw new Error('SHEETS_SERVICE_ACCOUNT_JSON_BASE64 が未設定です');
        }
        const jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
        writeFileSync(credPath, jsonStr, 'utf-8');
        console.log('✅ credentials/sheets-service-account.json を生成しました');
    }
};
ensureCredentialsFile();

const credentials = JSON.parse(
  readFileSync(path.resolve('credentials/sheets-service-account.json'), 'utf-8')
);

console.log('✅ 現在使われているサービスアカウント:', credentials.client_email);

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
