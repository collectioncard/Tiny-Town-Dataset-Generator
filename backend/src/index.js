const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const appHost = express();
const appPort = 3000;

const outputDir = 'mapOutput';
let workingDir = outputDir + '/' + Date.now();

let mapCounter = 0;


//create the directory for map images/text
try {
    fs.mkdirSync(workingDir, { recursive: true });
    console.log('Created output directory');
} catch (err) {
    console.error('Unable to create working directory :( ', err);
}

//Host the website
appHost.use(express.static('../frontend'));
appHost.use(bodyParser.json({ limit: '50mb' }));

//handle server requests
appHost.post('/mapGenerated', (req, res) => {
    console.log(req.body)
    const mapImageData = req.body.image.replace(/^data:image\/png;base64,/, '');
    const imgBuffer = Buffer.from(mapImageData, 'base64');

    const mapDescription = req.body.description;

    console.log("saving!")

    fs.writeFile(workingDir + "/map" + mapCounter + ".png", imgBuffer, (error) => {
        if (error) {
            console.log("BRO");
            res.status(500)
        }else {
            fs.writeFile(workingDir + "/map" + mapCounter + ".txt", mapDescription, (error) => {
                if (error) {
                    res.status(500)
                    console.log("BRO but like worse because this is just text so how did the image part work. AAAAAAHAHAHAHAHAHAHAHAHAHAHAHAHAHAHAHAHA");
                }else {
                    res.status(200)
                    mapCounter ++;
                }
            });
        }
    });
});



appHost.listen(appPort, () => {
    console.log(`Server is running at http://localhost:${appPort}`);
});





