const { google } = require('googleapis');
const { auth } = require('./utils');

const createFolder = async (name, parentId = null) => {
    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId && { parents: [parentId] })
    };

    const res = await drive.files.create({
        resource: fileMetadata,
        fields: 'id'
    });

    return res.data.id;
};

module.exports = createFolder;
