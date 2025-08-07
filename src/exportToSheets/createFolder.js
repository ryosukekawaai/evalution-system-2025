const { google } = require('googleapis');
const { auth } = require('./utils');

const drive = google.drive({ version: 'v3', auth });

// フォルダの存在確認
const folderExists = async (folderId) => {
    try {
        await drive.files.get({
            fileId: folderId,
            fields: 'id',
        });
        return true;
    } catch (error) {
        console.warn(`⚠️ 指定されたフォルダID(${folderId})は存在しないかアクセスできません`);
        return false;
    }
};

const createFolder = async (name, parentId = null) => {
    let parents = [];

    if (parentId) {
        const exists = await folderExists(parentId);
        if (exists) {
            parents.push(parentId);
        } else {
            console.warn(`⛔ 親フォルダが存在しないため、親なしで ${name} を作成します`);
        }
    }

    const fileMetadata = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parents.length > 0 ? { parents } : {})
    };

    const res = await drive.files.create({
        resource: fileMetadata,
        fields: 'id'
    });

    return res.data.id;
};

module.exports = createFolder;
