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

var MAP_WIDTH = 40
var MAP_HEIGHT = 40

var TILE_WIDTH = 16;
var TILE_HEIGHT = 16
var SCALE = 1

// game config
let config = {
    parent: 'phaser-game',
    type: Phaser.CANVAS,
    render: {
        pixelArt: true  // prevent pixel art from getting blurred when scaled
    },
    width: MAP_WIDTH * TILE_WIDTH * SCALE,         // 10 tiles, each 16 pixels, scaled 4x
    height: MAP_HEIGHT * TILE_HEIGHT * SCALE,
    scene: [TinyTown]
}

const game = new Phaser.Game(config);