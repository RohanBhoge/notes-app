import unzipper from 'unzipper';
import path from 'path';

const zipPath = 'C:\\BisugenTech\\Projects\\01_Paper-Nest\\backend\\data\\data.zip';

async function listZipContents() {
    try {
        const directory = await unzipper.Open.file(zipPath);
        console.log('Zip file opened successfully.');
        console.log('Listing first 20 files:');
        directory.files.slice(0, 20).forEach(file => {
            console.log(file.path);
        });
    } catch (e) {
        console.error('Error opening zip:', e);
    }
}

listZipContents();
