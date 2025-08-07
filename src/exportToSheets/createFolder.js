const { google } = require('googleapis');
const { auth } = require('./utils');

const drive = google.drive({ version: 'v3', auth });


async function createTestFile() {
  try {
    const res = await drive.files.create({
      requestBody: {
        name: 'テストスプレッドシート',
        mimeType: 'application/vnd.google-apps.spreadsheet',
        parents: ['1s9n_OJWtCt8taWsIrB7jD8I772G0OlmN'] // 一般フォルダID
      },
      fields: 'id, name'
    });
    console.log('✅ 作成成功:', res.data);
  } catch (e) {
    console.error('❌ 作成エラー:', e.response?.data?.error || e.message);
  }
}
module.exports = createTestFile;
