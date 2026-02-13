const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
}

const bucket = admin.storage().bucket();
const PUBLIC_URL = (process.env.FIREBASE_STORAGE_PUBLIC_URL || '').replace(/\/$/, '');
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET;

async function uploadFile(buffer, key, contentType) {
    const file = bucket.file(key);
    await file.save(buffer, {
        metadata: { contentType },
        public: true,
    });
    return getPublicUrl(key);
}

async function deleteFile(key) {
    try {
        const file = bucket.file(key);
        const [exists] = await file.exists();
        if (exists) await file.delete();
    } catch (err) {
        console.error('Storage delete error:', err.message);
    }
}

async function getFileBuffer(key) {
    const file = bucket.file(key);
    const [buffer] = await file.download();
    return buffer;
}

async function fileExists(key) {
    try {
        const file = bucket.file(key);
        const [exists] = await file.exists();
        return exists;
    } catch {
        return false;
    }
}

function getPublicUrl(key) {
    return `${PUBLIC_URL}/${key}`;
}

/**
 * Resolves a DB path (legacy or new) to a full public URL.
 * - Full URLs (http/https) are returned as-is
 * - Relative paths like /uploads/avatars/file.jpg -> PUBLIC_URL/uploads/avatars/file.jpg
 * - Plain keys like ai-uploads/file.pdf -> PUBLIC_URL/ai-uploads/file.pdf
 */
function resolveFileUrl(dbPath) {
    if (!dbPath) return null;
    if (dbPath.startsWith('http://') || dbPath.startsWith('https://')) return dbPath;
    const key = dbPath.startsWith('/') ? dbPath.substring(1) : dbPath;
    return getPublicUrl(key);
}

/**
 * Extracts the storage key from a full URL or DB path.
 * - Full storage URL -> strips the public URL prefix
 * - /uploads/avatars/file.jpg -> uploads/avatars/file.jpg
 * - uploads/avatars/file.jpg -> uploads/avatars/file.jpg
 */
function extractKey(dbPath) {
    if (!dbPath) return null;
    if (dbPath.startsWith(PUBLIC_URL)) {
        return dbPath.substring(PUBLIC_URL.length + 1);
    }
    return dbPath.startsWith('/') ? dbPath.substring(1) : dbPath;
}

module.exports = {
    bucket,
    uploadFile,
    deleteFile,
    getFileBuffer,
    fileExists,
    getPublicUrl,
    resolveFileUrl,
    extractKey,
    BUCKET,
};
