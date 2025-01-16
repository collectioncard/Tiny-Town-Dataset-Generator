const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const appHost = express();
const appPort = 3000;

let batchDirs = new Map(); // Track batch directories

appHost.use(express.static('../frontend'));
appHost.use(bodyParser.json({ limit: '50mb' }));

appHost.post('/mapGenerated', (req, res) => {
    const { image: mapImageData, description: mapDescription, batchId } = req.body;
    
    // Get or create batch directory
    let workingDir = batchDirs.get(batchId);
    if (!workingDir) {
        workingDir = `mapOutput/${batchId}`;
        batchDirs.set(batchId, workingDir);
        fs.mkdirSync(workingDir, { recursive: true });
    }

    // Get current count in directory
    const fileCount = fs.readdirSync(workingDir).filter(f => f.endsWith('.png')).length;
    
    const imageBuffer = Buffer.from(mapImageData.replace(/^data:image\/png;base64,/, ''), 'base64');

    try {
        fs.writeFileSync(`${workingDir}/map${fileCount}.png`, imageBuffer);
        fs.writeFileSync(`${workingDir}/map${fileCount}.txt`, mapDescription);
        res.status(200).json({ success: true, count: fileCount + 1 });
    } catch (error) {
        console.error('Error saving files:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

appHost.listen(appPort, () => {
    console.log(`Server is running at http://localhost:${appPort}`);
});