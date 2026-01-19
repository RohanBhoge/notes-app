import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const TARGET_DIR = "C:/Users/bhoge/OneDrive/Documents/Desktop/QPG/backend/data/data/data/CET/12/Physics";
const SOURCE_IMAGE = "C:/Users/bhoge/OneDrive/Documents/Desktop/QPG/backend/WhatsApp Image 2024-06-30 at 14.41.38_7e2ce26b.jpg";

const absTargetDir = path.resolve(TARGET_DIR);
const sourceImage = path.resolve(SOURCE_IMAGE);
const outputDir = absTargetDir + '_updated';
const imagesDir = path.join(outputDir, 'images');

// --- VALIDATION ---
if (!fs.existsSync(absTargetDir)) {
    console.error(`Target directory not found: ${absTargetDir}`);
    process.exit(1);
}

if (!fs.existsSync(sourceImage)) {
    console.error(`Source image not found: ${sourceImage}`);
    process.exit(1);
}

// Create output directory
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

console.log(`Scanning: ${absTargetDir}`);
console.log(`Outputting to: ${outputDir}`);
console.log(`Images will be saved to: ${imagesDir}\n`);

// --- HELPER FUNCTIONS ---

/**
 * Extracts all possible image fields from a JSON item
 */
const extractImages = (item) => {
    const fields = ['image_url', 'question_images', 'option_images', 'solution_images', 'extracted_image_names'];
    let found = [];
    fields.forEach(field => {
        if (item[field]) {
            if (Array.isArray(item[field])) found.push(...item[field]);
            else found.push(item[field]);
        }
    });
    return found.filter(img => img && typeof img === 'string' && img.trim() !== '');
};

/**
 * Ensures the physical file exists and returns the full absolute path
 */
const ensureAndGetPath = (imgName) => {
    if (!imgName) return imgName;

    let baseName = path.basename(imgName);
    // Extension Fix: If no extension, append .png
    if (!path.extname(baseName)) {
        baseName += '.png';
    }

    // Check if the image exists in the SOURCE directory
    const sourcePath = path.join(absTargetDir, baseName);

    // The destination path is now in the imagesDir
    const destPath = path.join(imagesDir, baseName);

    // If file doesn't exist in destination, try to copy from source or create dummy
    if (!fs.existsSync(destPath)) {
        if (fs.existsSync(sourcePath)) {
            // Copy from source directory if it exists there
            fs.copyFileSync(sourcePath, destPath);
            // console.log(`  [Copied] ${baseName}`); 
        } else {
            // Otherwise create from dummy source
            fs.copyFileSync(sourceImage, destPath);
            console.log(`  [Created Dummy] ${baseName}`);
        }
    }

    return destPath;
};

// --- MAIN PROCESSING ---

const files = fs.readdirSync(absTargetDir);
const jsonFiles = files.filter(f => f.toLowerCase().endsWith('.json'));

jsonFiles.forEach(jsonFile => {
    const filePath = path.join(absTargetDir, jsonFile);
    console.log(`Processing ${jsonFile}...`);

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        let data = JSON.parse(content);
        const processList = Array.isArray(data) ? data : [data];
        let modified = false;

        processList.forEach(item => {
            // Update individual fields
            const fieldsToUpdate = ['image_url', 'question_images', 'option_images', 'solution_images', 'extracted_image_names'];

            fieldsToUpdate.forEach(field => {
                if (!item[field]) return;

                if (Array.isArray(item[field])) {
                    item[field] = item[field].map(img => {
                        const newPath = ensureAndGetPath(img);
                        if (newPath !== img) modified = true;
                        return newPath;
                    });
                } else {
                    const newPath = ensureAndGetPath(item[field]);
                    if (newPath !== item[field]) {
                        item[field] = newPath;
                        modified = true;
                    }
                }
            });
        });

        // Save to the updated folder
        const outPath = path.join(outputDir, jsonFile);
        fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
        console.log(`  [Saved] ${jsonFile} ${modified ? '(updated paths)' : '(no changes)'}`);

    } catch (e) {
        console.error(`  [Error] ${jsonFile}:`, e.message);
    }
});

console.log("\nAll tasks completed.");