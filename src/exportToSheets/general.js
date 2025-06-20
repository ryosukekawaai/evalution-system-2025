const { google } = require('googleapis');
const { auth, fetchKintoneRecords } = require('./utils');
const createFolder = require('./createFolder');
require('dotenv').config();

const GENERAL_TEMPLATE_FILE_ID = process.env.GENERAL_TEMPLATE_FILE_ID;

// 従業員の権限取得
const fetchAuthorityMap = async () => {
    const appId = 20;
    const apiToken = process.env.KINTONE_EMPLOYEE_API_TOKEN;
    const res = await fetchKintoneRecords(appId, apiToken, 'limit 500');

    const authorityMap = {};
    for (const r of res) {
        const code = r.user?.value?.[0]?.name;
        const authority = r.authority?.value;
        if (code && authority) {
            authorityMap[code] = authority;
        }
    }
    return authorityMap;
};

const exportToSheetGeneral = async (evaluationPeriod, { multiRecords, selfRecords, averageRecords }, periodFolderId) => {
    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });

    // 「一般」フォルダ作成（親は 評価期間フォルダ）
    const generalFolderId = await createFolder('一般', periodFolderId);

    // 社員名の一意リストを取得
    const employeeNames = [
        // 重複チェック
        ...new Set([
            ...selfRecords.map(r => r.name?.value),
            ...multiRecords.map(r => r.created_by?.value?.name),
            ...averageRecords.map(r => r.select_employee?.value?.[0]?.name)
        ].filter(Boolean))
    ];

    //  全社員分ループ
    for (const name of employeeNames) {
        // テンプレートをコピーして新しいスプレッドシートを作成
        const copyResponse = await drive.files.copy({
            fileId: GENERAL_TEMPLATE_FILE_ID,
            requestBody: {
                name: `多面評価閲覧_${name}`,
                parents: [generalFolderId]
            }
        });

        // コピーしたシートのID
        const spreadsheetId = copyResponse.data.id;

        // 自己評価の抽出
        const targetSelfRecord = selfRecords.find(r =>
            r.name?.value === name &&
            r.evaluation_period?.value === evaluationPeriod
        );

        // E8〜I8: スキル、ビジネス、マネジメント、合計平均、コメント
        const selfValues = targetSelfRecord ? [[
            targetSelfRecord.root?.value || '',
            targetSelfRecord.grade?.value || '',
            targetSelfRecord.skill?.value || '',
            targetSelfRecord.business?.value || '',
            targetSelfRecord.team_management?.value || '',
            targetSelfRecord.total_average?.value || '',
            targetSelfRecord.comment?.value || ''
        ]] : [['', '', '', '', '', '', '']];

        // 多面評価の抽出
        const additionalInputRows = multiRecords
            .filter(r =>
                r.created_by?.value?.name === name &&
                r.evaluation_period?.value === evaluationPeriod
            )

            .map(r => [
                r.select_employee?.value?.[0]?.name || '',
                r.root?.value || '',
                r.grade?.value || '',
                r.skill?.value || '',
                r.business?.value || '',
                r.team_management?.value || '',
                r.other_evaluation?.value || '',
                r.comment?.value || ''
            ]);

        if (additionalInputRows.length > 0) {
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `多面評価入力!B9:I${9 + additionalInputRows.length - 1}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: additionalInputRows }
            });
        }

        // 評価集計の抽出
        const targetAverageRecord = averageRecords.find(r =>
            r.select_employee?.value?.[0]?.name === name &&
            r.evaluation_period?.value === evaluationPeriod
        );

        const averageValues = targetAverageRecord ? [[
            targetAverageRecord.evaluation_skill?.value || '',
            targetAverageRecord.evaluation_business?.value || '',
            targetAverageRecord.evaluation_management?.value || '',
            targetAverageRecord.other_evaluation?.value || ''
        ]] : [['', '', '', '']];

        const authorityMap = await fetchAuthorityMap();

        const additionalViewRows = multiRecords
            .filter(r =>
                r.select_employee?.value?.[0]?.name === name &&
                r.evaluation_period?.value === evaluationPeriod
            )
            .map(r => {
                const targetCode = r.select_employee?.value?.[0]?.name || '';
                const authority = authorityMap[targetCode] || '';
                const isVisible = authority === '管理者' || authority === 'GM';

                return [
                    r.created_by?.value?.name || '',
                    r.creater_route?.value || '',
                    r.creater_grade?.value || '',
                    isVisible ? r.skill?.value || '' : '',
                    isVisible ? r.business?.value || '' : '',
                    isVisible ? r.team_management?.value || '' : '',
                    isVisible ? r.other_evaluation?.value || '' : '',
                    r.comment?.value || ''
                ];
            });


        const batchData = [
            // 自己評価入力シート
            { range: '多面評価入力!C3', values: [[evaluationPeriod]] },
            { range: '多面評価入力!C4', values: [[name]] },
            { range: '多面評価入力!C8:I8', values: selfValues },
            ...(additionalInputRows.length > 0 ? [{
                range: `多面評価入力!B9:I${8 + additionalInputRows.length}`,
                values: additionalInputRows
            }] : []),

            // 多面評価閲覧シート
            { range: '多面評価閲覧!C3', values: [[evaluationPeriod]] },
            { range: '多面評価閲覧!C4', values: [[name]] },
            { range: '多面評価閲覧!C8:I8', values: selfValues },
            { range: '多面評価閲覧!E9:H9', values: averageValues },
            ...(additionalViewRows.length > 0 ? [{
                range: `多面評価閲覧!B10:I${9 + additionalViewRows.length}`,
                values: additionalViewRows
            }] : [])
        ];

        try {
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId,
                requestBody: {
                    valueInputOption: 'USER_ENTERED',
                    data: batchData
                }
            });
            console.log(`✅ 一般シート: ${name} - ${evaluationPeriod} 出力完了`);
        } catch (error) {
            console.error(`❌ ${name} の出力中にエラー`, error);
        }
    }
};

module.exports = exportToSheetGeneral;
