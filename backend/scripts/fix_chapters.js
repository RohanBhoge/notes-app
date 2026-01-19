import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelFilePath = path.join(__dirname, '../../questions data.xlsx');
const baseDataPath = path.join(__dirname, '../data/data_structure');

// Mappings
const EXAM_MAP = {
    'MHTCET': 'CET',
    'JEE': 'JEE',
    'NEET': 'NEET'
};

const SUBJECT_MAP = {
    'CHEM': 'Chemistry',
    'PHYSICS': 'Physics',
    'MATH': 'Maths',
    'BIO': 'Biology',
    'BIOLOGY': 'Biology',
    'BOTANY': 'Botany',
    'ZOOLOGY': 'Zoology'
};

const BAD_FOLDERS = [
    '11TH', '12TH', 'CHEM', 'PHYSICS', 'MATH', 'BIO', 'BIOLOGY', 'BOTANY', 'ZOOLOGY',
    'Chapters', 'Total', 'nan', 'Total Questions', 'Questions Extracted', 'total'
];

async function cleanBadFolders(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            cleanBadFolders(fullPath);
            if (BAD_FOLDERS.includes(file) || BAD_FOLDERS.includes(file.trim())) {
                console.log(`Deleting incorrect folder: ${fullPath}`);
                fs.rmSync(fullPath, { recursive: true, force: true });
            }
        }
    }
}

async function organizeChapters() {
    if (!fs.existsSync(excelFilePath)) {
        console.error(`Excel file not found`);
        return;
    }

    // Ensure base dir exists
    if (!fs.existsSync(baseDataPath)) {
        fs.mkdirSync(baseDataPath, { recursive: true });
    }

    console.log('Cleaning up incorrect folders...');
    cleanBadFolders(baseDataPath);

    const workbook = new ExcelJS.Workbook();
    console.log('Reading Excel file...');
    await workbook.xlsx.readFile(excelFilePath);

    workbook.eachSheet((sheet, sheetId) => {
        const sheetName = sheet.name;
        const examFolder = EXAM_MAP[sheetName];

        if (!examFolder) return;

        console.log(`Processing Sheet: ${sheetName}`);

        let splitRow = -1;
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                const cell1 = String(row.getCell(1).value).trim();
                if (cell1 === '12TH') {
                    splitRow = rowNumber;
                }
            }
        });

        const blocks = [];

        // Block 1 (11th)
        blocks.push({
            classLabel: '11',
            startHeaderRow: 1,
            subjectRow: 2,
            subRow: 3,
            dataStartRow: 4,
            endRow: splitRow === -1 ? sheet.rowCount : splitRow - 1
        });

        // Block 2 (12th)
        if (splitRow !== -1) {
            blocks.push({
                classLabel: '12',
                startHeaderRow: splitRow,
                subjectRow: splitRow + 1,
                subRow: splitRow + 2,
                dataStartRow: splitRow + 3,
                endRow: sheet.rowCount
            });
        }

        blocks.forEach(block => {
            const { classLabel, subjectRow, subRow, dataStartRow, endRow } = block;

            console.log(`  Processing Class ${classLabel}`);

            for (let col = 1; col <= sheet.columnCount; col += 3) {
                const subjectRaw = sheet.getRow(subjectRow).getCell(col).value;
                if (!subjectRaw) continue;

                const subValue = sheet.getRow(subRow).getCell(col).value;

                let actualSubSubject = null;
                if (String(subValue).trim().toLowerCase() !== 'chapters') {
                    actualSubSubject = subValue;
                }

                const subjectName = SUBJECT_MAP[String(subjectRaw).trim()] || String(subjectRaw).trim().replace(/^\d+\.\s*/, '');
                const subSubjectName = actualSubSubject ? (SUBJECT_MAP[String(actualSubSubject).trim()] || String(actualSubSubject).trim()) : null;

                let folderPath = path.join(baseDataPath, examFolder, classLabel, subjectName);
                if (subSubjectName) {
                    folderPath = path.join(folderPath, subSubjectName);
                }

                for (let r = dataStartRow; r <= endRow; r++) {
                    const row = sheet.getRow(r);
                    let cellVal = row.getCell(col).value;

                    if (!cellVal) continue;

                    cellVal = String(cellVal).trim();

                    if (cellVal === 'Total' || cellVal.toLowerCase() === 'nan') continue;
                    if (BAD_FOLDERS.includes(cellVal)) continue;

                    const safeName = cellVal.replace(/[<>:"/\\|?*]/g, '');
                    const finalPath = path.join(folderPath, safeName);

                    if (!fs.existsSync(finalPath)) {
                        fs.mkdirSync(finalPath, { recursive: true });
                    }
                }
            }
        });
    });
    console.log('Regeneration complete.');
}

organizeChapters().catch(console.error);
