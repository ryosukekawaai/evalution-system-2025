const { CronJob } = require('cron');
const { sendSlackNotification, getSlackUserIdByEmail } = require('../services/slackService');
const {
    fetchAllEmployees,
    fetchSelfEvaluations,
    fetchEvaluationPeriods,
    fetchMultiEvaluations
} = require('../services/kintoneService');

// 通知済み記録セット
const sentNotifications = new Set();

// 通知ジョブ
const job = new CronJob(
    '0 * * * * *', // 毎分0秒に実行
    async () => {
        const now = new Date();
        const jst = new Date(now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
        const nowHour = jst.getHours();
        const nowMinute = jst.getMinutes();
        const todayStr = jst.toISOString().split('T')[0];

        const periods = await fetchEvaluationPeriods();

        for (const p of periods) {
            const notifTime = p.notification_time?.value;
            const deadlineStr = p.input_period?.value;
            const targetPeriod = p.evaluation_period?.value?.trim();
            const notifDaysStr = p.notification_days_before?.value;
            if (!notifTime || !deadlineStr || !targetPeriod || !notifDaysStr) continue;

            const [notifHour, notifMinute] = notifTime.split(':').map(Number);
            if (nowHour !== notifHour || nowMinute !== notifMinute) continue;

            const deadline = new Date(deadlineStr);
            deadline.setHours(0, 0, 0, 0);

            const today = new Date(jst);
            today.setHours(0, 0, 0, 0);

            const isDeadlineToday = deadline.getTime() === today.getTime();

            let shouldNotify = isDeadlineToday;
            if (!shouldNotify) {
                for (let d = 1; d <= parseInt(notifDaysStr, 10); d++) {
                    const checkDate = new Date(deadline);
                    checkDate.setDate(checkDate.getDate() - d);
                    if (checkDate.getTime() === today.getTime()) {
                        shouldNotify = true;
                        break;
                    }
                }
            }
            if (!shouldNotify) continue;

            const allEmployees = await fetchAllEmployees();
            const selfEvaluations = await fetchSelfEvaluations();
            const multiEvaluations = await fetchMultiEvaluations();

            const normalize = (s) => s?.trim();

            const submittedSelf = selfEvaluations
                .filter(r => r.evaluation_period?.value === targetPeriod)
                .map(r => normalize(r.name?.value))
                .filter(Boolean);

            const submittedMulti = multiEvaluations
                .filter(r => r.evaluation_period?.value === targetPeriod)
                .map(r => normalize(r.creator_user?.value?.[0]?.name))
                .filter(Boolean);

            const missingSelf = allEmployees.filter((emp) => {
                const displayName = normalize(emp.user?.value?.[0]?.name);
                return displayName && !submittedSelf.includes(displayName);
            });

            const missingMulti = allEmployees.filter((emp) => {
                const displayName = normalize(emp.user?.value?.[0]?.name);
                return displayName && !submittedMulti.includes(displayName);
            });

            const generateMentions = async (list) => {
                const mentions = await Promise.all(list.map(async (m) => {
                    const email = m.user?.value?.[0]?.code;
                    const name = m.user?.value?.[0]?.name;
                    try {
                        const slackId = await getSlackUserIdByEmail(email);
                        return `<@${slackId}>`;
                    } catch (err) {
                        console.warn(`⚠️ メール ${email} のSlackユーザーID取得に失敗`, err.message);
                        return name;
                    }
                }));
                return [...new Set(mentions)];
            };

            const mentionSelf = await generateMentions(missingSelf);
            const mentionMulti = await generateMentions(missingMulti);

            // 個別通知キー（評価期＋日付＋種別）
            const baseKey = `${todayStr}_${targetPeriod}`;
            const selfKey = `${baseKey}_self`;
            const multiKey = `${baseKey}_multi`;

            // 自己評価通知
            if (!sentNotifications.has(selfKey) && mentionSelf.length > 0) {
                const title = isDeadlineToday
                    ? `📢 【最終リマインド】本日が自己評価の入力期限です！`
                    : `📢 【リマインド】評価期「${targetPeriod}」の自己評価入力期限が近づいています（締切：${deadlineStr}）`;

                const message = [
                    title,
                    `未提出者（自己評価）：`,
                    ...mentionSelf.map(m => `- ${m}`)
                ].join('\n');

                await sendSlackNotification(message);
                sentNotifications.add(selfKey);
                console.log('✅ 自己評価 通知送信：', selfKey);
            }

            // 多面評価通知
            if (!sentNotifications.has(multiKey) && mentionMulti.length > 0) {
                const title = isDeadlineToday
                    ? `📢 【最終リマインド】本日が多面評価の入力期限です！`
                    : `📢 【リマインド】評価期「${targetPeriod}」の多面評価入力期限が近づいています（締切：${deadlineStr}）`;

                const message = [
                    title,
                    `未提出者（多面評価）：`,
                    ...mentionMulti.map(m => `- ${m}`)
                ].join('\n');

                await sendSlackNotification(message);
                sentNotifications.add(multiKey);
                console.log('✅ 多面評価 通知送信：', multiKey);
            }
        }
    },
    null,
    true,
    'Asia/Tokyo'
);

module.exports = job;
