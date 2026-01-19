import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the local Questions_Image_Data folder
// Adjust logic to find it relative to src/utils
// based on: c:\Users\bhoge\OneDrive\Documents\Desktop\QPG\backend\data\Questions_Image_Data
const LOCAL_IMAGE_DATA_PATH = path.join(__dirname, '..', '..', 'data', 'Questions_Image_Data');

// Map Structure:
// "exam|standard|subject|clean_chapter_name" -> "Actual Folder Name (e.g. 1. Motion in Plane)"
const chapterFolderMap = new Map();

let isInitialized = false;

/**
 * Normalizes string for key generation (lowercase, trimmed).
 */
function normalize(str) {
    return String(str || '').trim().toLowerCase();
}

/**
 * Recursively scans the directory to build the map.
 * Expected Structure: Questions_Image_Data / <Exam> / <Standard> / <Subject> / <Chapter>
 */
function scanDirectory(currentPath, depth, context = []) {
    if (!fs.existsSync(currentPath)) return;

    const items = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const item of items) {
        if (item.isDirectory()) {
            const folderName = item.name;

            if (depth < 4) {
                // Go deeper: Exam -> Standard -> Subject -> Chapter
                // Context accumulates: [Exam, Standard, Subject]
                scanDirectory(path.join(currentPath, folderName), depth + 1, [...context, folderName]);
            } else if (depth === 4) {
                // We are at the Chapter level (e.g. "1. Motion in Plane")
                // context is [Exam, Standard, Subject]
                const [exam, standard, subject] = context;

                // Key 1: Exact Name (normalize)
                // Key 2: Clean Name (remove leading number and dot)

                // "1. Motion in Plane" -> "Motion in Plane"
                const cleanName = folderName.replace(/^\d+\.\s*/, '');

                const key = `${normalize(exam)}|${normalize(standard)}|${normalize(subject)}|${normalize(cleanName)}`;

                // Store the ACTUAL folder name as value
                chapterFolderMap.set(key, folderName);

                // Also map the exact folder name just in case the JSON already has numbers (unlikely but safe)
                const exactKey = `${normalize(exam)}|${normalize(standard)}|${normalize(subject)}|${normalize(folderName)}`;
                if (key !== exactKey) {
                    chapterFolderMap.set(exactKey, folderName);
                }
            }
        }
    }
}

/**
 * Initializes the mapping by scanning the directory.
 */
export function initS3Mapping() {
    if (isInitialized) return;

    try {
        console.log('[S3 Helper] Scanning local data for folder structure...');
        if (fs.existsSync(LOCAL_IMAGE_DATA_PATH)) {
            // Start scanning. Depth 1 is inside Questions_Image_Data
            scanDirectory(LOCAL_IMAGE_DATA_PATH, 1);
            isInitialized = true;
            console.log(`[S3 Helper] Mapped ${chapterFolderMap.size} chapter paths.`);
        } else {
            console.warn(`[S3 Helper] Path not found: ${LOCAL_IMAGE_DATA_PATH}`);
        }
    } catch (error) {
        console.error('[S3 Helper] Error scanning directories:', error);
    }
}

/**
 * Retrieves the correct S3 folder name for a given chapter context.
 */
export function getS3ChapterFolder(exam, standard, subject, chapterName) {
    if (!isInitialized) initS3Mapping(); // Ensure init

    const key = `${normalize(exam)}|${normalize(standard)}|${normalize(subject)}|${normalize(chapterName)}`;

    if (chapterFolderMap.has(key)) {
        return chapterFolderMap.get(key);
    }

    // Fallback: return path as-is if not found (maybe it's already correct or missing)
    return chapterName;
}
