// Jim Whitehead
// Created: 4/14/2024
// Phaser: 3.70.0
//
// Cubey
//
// An example of putting sprites on the screen using Phaser
// 
// Art assets from Kenny Assets "Shape Characters" set:
// https://kenney.nl/assets/shape-characters

// debug with extreme prejudice
"use strict"

let MAP_WIDTH = 40
let MAP_HEIGHT = 40

let CANVAS_WIDTH = 640;
let CANVAS_HEIGHT = 640;

let TILE_WIDTH = 16;
let TILE_HEIGHT = 16
let SCALE = 1

// game config
let config = {
    parent: 'phaser-game',
    type: Phaser.CANVAS,
    render: {
        pixelArt: true  // prevent pixel art from getting blurred when scaled
    },
    width: CANVAS_WIDTH,         // 10 tiles, each 16 pixels, scaled 4x
    height: CANVAS_HEIGHT,
    scene: [TinyTown]
}

const game = new Phaser.Game(config);

let global = {
    snapCount: 0,
    targetSnapCount: 5,
    isGenerating: false,
    stopRequested: false,
    currentBatchStartTime: null,
    generationPromises: []
};

async function generateMap() {
    return new Promise((resolve, reject) => {
        game.scene.getScene('tinyTown').scene.restart();
        game.scale.setGameSize(MAP_WIDTH * TILE_WIDTH * SCALE, MAP_HEIGHT * TILE_HEIGHT * SCALE);
        // Give scene time to initialize
        setTimeout(() => {
            const scene = game.scene.getScene('tinyTown');
            game.renderer.snapshot((snapshot) => {
                scene.sendMapToBackend(scene.FactString)
                    .then(() => resolve())
                    .catch(reject);
            });
        }, 100);
    });
}

async function startGeneration(count) {
    global.isGenerating = true;
    global.stopRequested = false;
    global.snapCount = 0;
    global.targetSnapCount = count;
    global.currentBatchStartTime = Date.now();
    global.generationPromises = [];

    const startBtn = document.getElementById('startGen');
    const stopBtn = document.getElementById('stopGen');
    startBtn.disabled = true;
    stopBtn.disabled = false;

    try {
        for (let i = 0; i < count && !global.stopRequested; i++) {
            await generateMap();
            global.snapCount++;
            updateProgress(global.snapCount, count);
            // Small delay between generations
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    } catch (error) {
        console.error('Generation error:', error);
    } finally {
        global.isGenerating = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        console.log(`Generation complete. Generated ${global.snapCount} maps.`);
    }
}

// UI Control Functions
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startGen');
    const stopBtn = document.getElementById('stopGen');
    const mapWidth = document.getElementById('mapWidth');
    const mapHeight = document.getElementById('mapHeight');
    const batchSize = document.getElementById('batchSize');
    const sizeWarning = document.getElementById('sizeWarning');
    
    function validateMapSize() {
        const width = parseInt(mapWidth.value);
        const height = parseInt(mapHeight.value);
        const isValid = width >= 5 && width <= 80 && height >= 5 && height <= 80;
        
        sizeWarning.style.display = isValid ? 'none' : 'block';
        startBtn.disabled = !isValid;
        
        return isValid;
    }
    
    // Add validation to inputs
    mapWidth.addEventListener('input', validateMapSize);
    mapHeight.addEventListener('input', validateMapSize);
    
    startBtn.addEventListener('click', async () => {
        if (!validateMapSize()) return;
        
        MAP_WIDTH = parseInt(mapWidth.value);
        MAP_HEIGHT = parseInt(mapHeight.value);
        
        const count = parseInt(batchSize.value);
        await startGeneration(count);
    });
    
    stopBtn.addEventListener('click', () => {
        global.stopRequested = true;
        stopBtn.disabled = true;
    });
});

function updateProgress(current, total) {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const percentage = Math.min((current / total) * 100, 100); // Ensure we don't exceed 100%
    
    progressBar.style.width = percentage + '%';
    progressText.textContent = `Progress: ${Math.min(current, total)}/${total}`;
}
