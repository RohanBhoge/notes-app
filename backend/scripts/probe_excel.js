import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelFilePath = path.join(__dirname, '../../questions data.xlsx');

async function probe() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelFilePath);

    workbook.eachSheet((sheet, id) => {
        console.log(`Sheet: ${sheet.name}`);
        console.log(`Dimensions: Rows: ${sheet.rowCount}, Cols: ${sheet.columnCount}`);

        // Read first few rows
        const row1 = sheet.getRow(1).values; // 1-indexed
        const row2 = sheet.getRow(2).values;
        const row3 = sheet.getRow(3).values;

        console.log('Row 1:', JSON.stringify(row1));
        console.log('Row 2:', JSON.stringify(row2));
        console.log('Row 3:', JSON.stringify(row3));
    });
}

probe().catch(console.error);
