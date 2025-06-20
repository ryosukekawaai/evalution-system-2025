const { WebClient } = require('@slack/web-api');
require('dotenv').config();

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

// メッセージ送信
async function sendSlackNotification(message) {
    try {
        await slack.chat.postMessage({
            channel: CHANNEL_ID,
            text: message
        });
        console.log('✅ Slack通知を送信しました');
    } catch (error) {
        console.error('❌ Slack通知に失敗:', error.message);
    }
}

// メールからSlackユーザーIDを取得
async function getSlackUserIdByEmail(email) {
    try {
        const res = await slack.users.lookupByEmail({ email });
        return res.user.id;
    } catch (err) {
        throw new Error(`SlackユーザーIDの取得に失敗しました: ${email} (${err.message})`);
    }
}

module.exports = {
    sendSlackNotification,
    getSlackUserIdByEmail
};
