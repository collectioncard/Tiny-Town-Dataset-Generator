class TinyTown extends Phaser.Scene {
    constructor() {
        super("tinyTown");
    }

    preload() {
        this.load.setPath("./assets/");
        this.load.image("tiny_town_tiles", "kenny-tiny-town-tilemap-packed.png");    // tile sheet   
        this.load.tilemapTiledJSON("map", "TinyTownMap.json");                   // Load JSON of tilemap
    }

    create() {
        // Add a tile map
        // https://photonstorm.github.io/phaser3-docs/Phaser.GameObjects.GameObjectFactory.html#tilemap__anchor
        // "map" refers to the key from load.tilemapTiledJSON
        // The map uses 16x16 pixel tiles, and is 10x10 tiles large
        this.map = this.add.tilemap("map", 16, 16, 10, 10);

        // Add a tileset to the map
        // First parameter: the name we gave to the tileset when it was added to Tiled
        // Second parameter: the key for the tilesheet (from this.load.image above)
        // https://photonstorm.github.io/phaser3-docs/Phaser.Tilemaps.Tilemap.html#addTilesetImage__anchor
        this.tileset = this.map.addTilesetImage("tiny-town-packed", "tiny_town_tiles");

        // Create a tile map layer
        // First parameter: name of the layer from Tiled
        // https://newdocs.phaser.io/docs/3.54.0/Phaser.Tilemaps.Tilemap#createLayer
        this.grassLayer = this.map.createLayer("Grass-n-Houses", this.tileset, 0, 0);
        this.treeLayer = this.map.createLayer("Trees-n-Fences", this.tileset, 0, 0);
        this.grassLayer.setScale(4.0);
        this.treeLayer.setScale(4.0);

        document.getElementById('description').innerHTML = '<h2>Welcome to One-House-Town!</h2>'
    }

    update() {

    }
}