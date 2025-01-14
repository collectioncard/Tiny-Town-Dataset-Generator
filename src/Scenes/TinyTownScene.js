class TinyTown extends Phaser.Scene {
    constructor() {
        super("tinyTown");
    }

    TILEWIDTH = 16;
    TILEHEIGHT = 16
    SCALE = 1;
    VIEW_LOOKUP = false;
    DEBUG_DRAW = true;
    DEBUG_PATH = true;

    //Path Data
    VALID_PATH_TILES = [
        -1, //empty space
        69, //fence door
        89, //house door
    ];
    PATH_ENDPOINTS = [];

    preload() {
        this.load.setPath("./assets/");
        this.load.image("tiny_town_tiles", "kenny-tiny-town-tilemap-packed.png");
    }

    create() {
        // If you need to lookup a tile, just swap this to true
        //Replaces map generation with a display of the full tile set and each tile's id
        if (this.VIEW_LOOKUP){
            let w = 192
            let h = 176
            let size = 16
            let scale = this.SCALE
            let grid = this.generate_lookup_grid(w/size,h/size)
            const map = this.make.tilemap({
                data: grid,
                tileWidth: 16,
                tileHeight: 16
            })
            const tilesheet = map.addTilesetImage("tiny_town_tiles")
            var layer = map.createLayer(0, tilesheet, 0, 0)
            layer.setScale(scale);
            for (let y = 0; y < h*scale; y+=size*scale) {
                for (let x = 0; x < w*scale; x+=size*scale) {
                    let name = (x/size/scale+y/size/scale*w/size).toString()
                    this.add.text(x,y, name, {
                        "fontSize" : 8,
                        "backgroundColor" : "000000"
                    })
                }
            }
            return
        }

        // 3x3 sections, each each 5x5
        //TODO: Should eventually make random num of sections of random sizes
        let sections = {x:5, y:5}
        let section_size = 8

        let ground_grid = this.generate_background(sections.x * section_size,sections.y * section_size)
        let props_grid = this.fill_with_tiles(sections.x * section_size,sections.y * section_size, 1)

        for (let y = 0; y < sections.y; y++) {
            for (let x = 0; x < sections.x; x++) {
                let rect = {
                    x:x*section_size,
                    y:y*section_size,
                    w:section_size,
                    h:section_size
                }
                props_grid = this.generate_section(props_grid, rect)
            }
        }

        let grids = [ground_grid, props_grid]
        grids.forEach(grid => {
            const map = this.make.tilemap({
                data: grid,
                tileWidth: 16,
                tileHeight: 16
            })
            const tilesheet = map.addTilesetImage("tiny_town_tiles")
            let layer = map.createLayer(0, tilesheet, 0, 0)
            layer.setScale(this.SCALE);
        });

        //Now that generation is complete we can build roads between sections
        if (this.DEBUG_PATH) console.log("[PATH DEBUG] Path Endpoints: ", this.PATH_ENDPOINTS);

        this.generate_path(props_grid).then(() => {
            if (this.DEBUG_PATH) console.log("[PATH DEBUG] Path generation complete");
        });
    }

    // generates a section of the map
    // assume grid is filled
    // -1 is empty
    generate_section(grid, rect){
        // decide which section to generate
        this.draw_debug_rect(rect);
        const functions = [this.generate_nothing, this.generate_forest, this.generate_house, this.generate_fence]
        const randomIndex = Phaser.Math.Between(0, functions.length - 1);

        let local_section = functions[randomIndex].bind(this)(rect)
        for (let y = rect.y; y < rect.y+rect.h; y++) {
            for (let x = rect.x; x < rect.x+rect.w; x++) {
                grid[y][x] = local_section.grid[y-rect.y][x-rect.x]
            }
        }

        //Keep track of path endpoints for later generation
        this.PATH_ENDPOINTS.push(...local_section.path_points);

        return grid
    }

    /** Draw a debug outline, for the given rect
     *
     * rect: {x, y, w, h } **/
    draw_debug_rect(rect, color = 0x00FF00) {
        if (!this.DEBUG_DRAW) {
            return;
        }
        let debug_rect = this.add.rectangle(rect.x * this.TILEWIDTH * this.SCALE, rect.y * this.TILEHEIGHT * this.SCALE, rect.w * this.TILEWIDTH * this.SCALE, rect.h * this.TILEHEIGHT * this.SCALE)
            .setDepth(5)
            .setStrokeStyle(2, color, 255);
        //Offset for origin of rectangles being their center
        debug_rect.x += debug_rect.width/2;
        debug_rect.y += debug_rect.height/2;
    }

    // returns a 2d array filled with a random assignment of the given background tiles
    generate_background(w, h, tiles = [0, 1, 2]){
        let grid = []
        for (let y = 0; y < h; y++) {
            let row = []   
            for (let x = 0; x < w; x++) {
                row.push(tiles[Phaser.Math.Between(0, tiles.length -1)])
            }
            grid.push(row)
        }
        return grid
    }

    // returns a 2d array with a tile of 1 type
    fill_with_tiles(w, h, tile = 1) {
        let grid = []
        for (let y = 0; y < h; y++) {
            let row = []
            for (let x = 0; x < w; x++) {
                row.push(tile)
            }
            grid.push(row)
        }
        return grid
    }

    // returns a local grid of size of the rect
    generate_nothing(rect){
        return {
            grid : this.fill_with_tiles(rect.w, rect.h, -1),
            path_points : [],
        }
    }
    //returns a tile grid containing a forest
    generate_forest(rect){
        
        const TILE_TYPES = {
            bushes: {
                green: [5, 17, 28],
                yellow: 27,
            },
            trees: {
                single: {
                    green: [4, 16],
                    yellow: [3, 15],
                },
                stack1:{
                    green: [6, 8, 30, 32],
                    yellow: [9, 11, 33, 35],
                },
                stack2:{
                    green: [7, 19, 31, 18, 20],
                    yellow: [10, 22, 34, 21, 23],
                },
            },
        };


        let grid = this.fill_with_tiles(rect.w, rect.h, -1)
        let tree_chance = 0.8;

        for (let y = 0; y < rect.h; y++) {
            for (let x = 0; x < rect.w; x++) {

                if (grid [y][x] !== -1 || Math.random() > tree_chance) { // random chance to skip the tile
                    continue;
                }

                let type = Phaser.Math.Between(0, 100);
                let color = Math.random() < 0.5 ? "green" : "yellow";

                if (type < 7){
                    grid[y][x] = 29; // 1 tile mushroom
                } else if (type < 30){ // 1 tile bushes/trees
                    grid[y][x] = Phaser.Utils.Array.GetRandom(TILE_TYPES.bushes[color]);
                } else if (type < 60 && y + 1 < rect.h){ //2 tile trees
                    let tree = TILE_TYPES.trees.single[color];
                    if (grid[y+1][x] === -1){
                        grid[y][x] = tree[0];
                        grid[y+1][x] = tree[1];
                    }
                } else if (type < 85 && y + 1 < rect.h && x + 1 < rect.w) { // 4 tile trees (stack 1)
                    let tree = TILE_TYPES.trees.stack1[color];
                    if (grid[y+1][x] === -1 && grid[y][x+1] === -1 && grid[y+1][x+1] === -1){
                        grid[y][x] = tree[0];
                        grid[y][x+1] = tree[1];
                        grid[y+1][x] = tree[2];
                        grid[y+1][x+1] = tree[3];
                    }
                } else if (y+2 < rect.h && x-1 >= 0 && x+1 < rect.w){ // 5 tile trees (stack 2)
                    let stack = TILE_TYPES.trees.stack2[color];
                    if (grid[y+1][x] === -1 && grid[y+2][x] === -1 && grid[y+1][x-1] === -1 && grid[y+1][x+1] === -1){
                        grid[y][x] = stack[0];
                        grid[y+1][x] = stack[1];
                        grid[y+2][x] = stack[2];
                        grid[y+1][x-1] = stack[3];
                        grid[y+1][x+1] = stack[4];
                    }
                }
            }
        }

        return {
            grid : grid,
            path_points : [],
        }
    }

    // House Constants
    HOUSE_MIN_W = 3
    HOUSE_MIN_H = 3
    HOUSE_PADDING = 1

    //returns a tile grid containing a house with padding within the section
    generate_house(section_rect){
        let pad = 1 //Min padding???
        let w = Phaser.Math.Between(this.HOUSE_MIN_W,section_rect.w-pad*2) //TODO: Extract 3 as min house dimensions
        let h = Phaser.Math.Between(this.HOUSE_MIN_H,section_rect.h-pad*2)
        let house_rect = {
            x: Phaser.Math.Between(pad,section_rect.w-w-pad),
            y: Phaser.Math.Between(pad,section_rect.h-h-pad),
            w:w,
            h:h
        }

        // TileId offset randomly picked between the two house variants
        let alt = Math.random() < 0.5 ? -4 : 0
        // generate door location
        let door_x = Phaser.Math.Between(1,w-2)
        // generate background
        let grid =  this.fill_with_tiles(house_rect.w, house_rect.h, -1)
        
        // loop for the top roof
        let y = 0
        let chimney_x = Phaser.Math.Between(-1,w-1)
        grid[y][0] = 52 + alt
        for (let x = 1; x < w-1; x++) {
            grid[y][x] = 53 + alt
        }
        grid[y][w-1] = 54 + alt
        if (chimney_x !== -1) { //Variants of houses without chimneys
            grid[y][chimney_x] = 55 + alt
        }
        // loop for bottom roof
        y = 1
        grid[y][0] = 64 + alt
        for (let x = 1; x < w-1; x++) {
            grid[y][x] = 65 + alt
        }
        grid[y][w-1] = 66 + alt
        
        let window_chance = 0.6
        // loop for walls
        for (let y = 2; y < h; y++) {
            grid[y][0] = 76 + alt

            for (let x = 1; x < w-1; x++) {
                grid[y][x] = 77 + alt
                // add windows with awnings
                if (Math.random() < window_chance){
                    grid[y][x] = 88 + alt
                    grid[1][x] = 67 + alt
                    window_chance -= 0.2
                }
            }
            grid[y][w-1] = 79 + alt
        }
        // add door
        grid[h-1][door_x] = 89 + alt
        // add an awning over the door
        grid[1][door_x] = 67 + alt

        let padded = this.pad_grid(grid, section_rect, house_rect)
        this.draw_debug_rect({
            x: section_rect.x + house_rect.x,
            y: section_rect.y + house_rect.y,
            w: house_rect.w,
            h: house_rect.h
        }, 0x0000FF)

        let door_global_position = {
            x : section_rect.x + house_rect.x + door_x,
            y : section_rect.y + house_rect.y + h-1,
        }
        this.draw_debug_rect({
            x: door_global_position.x,
            y: door_global_position.y,
            w: 1,
            h: 1,
        }, 0x0000FF)

        return {
            grid : padded,
            path_points : [door_global_position],
        }
    }
    //Pads the tile grid defined in from_grid of size and pos from_rect, into a new grid of size and position of to_rect.
    pad_grid(from_grid, to_rect, from_rect){
        let grid = this.fill_with_tiles(to_rect.w, to_rect.h, -1)
        for (let y = 0; y < from_rect.h; y++) {
            for (let x = 0; x < from_rect.w; x++) {
                grid[y+from_rect.y][x+from_rect.x] = from_grid[y][x]
            }
        }
        return grid
    }

    generate_fence(section_rect) {
        // Padding to ensure fences don't touch section edges
        let pad = 1;
    
        // Generate random size for the fence group
        let fence_w = Phaser.Math.Between(3, section_rect.w - pad * 2);
        let fence_h = Phaser.Math.Between(3, section_rect.h - pad * 2);
    
        // Random location for the fence group within the section
        let fence_x = Phaser.Math.Between(pad, section_rect.w - fence_w - pad);
        let fence_y = Phaser.Math.Between(pad, section_rect.h - fence_h - pad);
    
        // Define the rect for the fence
        let fence_rect = {
            x: fence_x,
            y: fence_y,
            w: fence_w,
            h: fence_h
        };
    
        // Create a grid for the entire section initialized to -1
        let grid = this.fill_with_tiles(section_rect.w, section_rect.h, -1);
    
        // Randomly determine whether the door is on the top or bottom horizontal edge
        let door_edge = Math.random() < 0.5 ? "top" : "bottom";
        let door_x = Phaser.Math.Between(1, fence_rect.w - 2); // Avoid corners
    
        for (let y = 0; y < fence_rect.h; y++) {
            for (let x = 0; x < fence_rect.w; x++) {
                let global_x = fence_rect.x + x;
                let global_y = fence_rect.y + y;
    
                // Top row
                if (y === 0) {
                    if (x === 0) {
                        grid[global_y][global_x] = 44; // Top-left corner
                    } else if (x === fence_rect.w - 1) {
                        grid[global_y][global_x] = 46; // Top-right corner
                    } else {
                        // Place door on the top edge if chosen
                        grid[global_y][global_x] = (door_edge === "top" && x === door_x) ? 69 : 45;
                    }
                }
                // Bottom row
                else if (y === fence_rect.h - 1) {
                    if (x === 0) {
                        grid[global_y][global_x] = 68; // Bottom-left corner
                    } else if (x === fence_rect.w - 1) {
                        grid[global_y][global_x] = 70; // Bottom-right corner
                    } else {
                        // Place door on the bottom edge if chosen
                        grid[global_y][global_x] = (door_edge === "bottom" && x === door_x) ? 69 : 45;
                    }
                }
                // Vertical sides
                else {
                    if (x === 0) {
                        grid[global_y][global_x] = 56; // Left vertical
                    } else if (x === fence_rect.w - 1) {
                        grid[global_y][global_x] = 58; // Right vertical
                    }
                }
            }
        }
    
        // Debug drawing for the fence_rect
        this.draw_debug_rect({
            x: section_rect.x + fence_rect.x,
            y: section_rect.y + fence_rect.y,
            w: fence_rect.w,
            h: fence_rect.h
        }, 0xFFA500); // Orange debug outline

        let door_global_position = {
            x : section_rect.x + fence_rect.x + door_x,
            y : section_rect.y + fence_rect.y + (door_edge == "bottom" ? fence_h-1 : 0),
        }
        this.draw_debug_rect({
            x: door_global_position.x,
            y: door_global_position.y,
            w: 1,
            h: 1,
        }, 0xFFA500); // Orange debug outline
    
        return {
            grid : grid,
            path_points : [door_global_position],
        }
    }
    
    //generates a grid from the tile set, with tile id labels
    generate_lookup_grid(w,h){
        let grid = []
        for (let y = 0; y < h; y++) {
            let row = []   
            for (let x = 0; x < w; x++) {
                row.push(x+y*w)
            }
            grid.push(row)
        }
        return grid
    }

    //Calculates the manhattan distance of a path. This counts in cardinal directions
    // which makes it a bit more accurate than euclidean distance for pathfinding.
    calculateManhattanDistance(path){
        let totalDistance = 0;

        for (let i = 0; i < path.length - 1; i++) {
            const step1 = path[i];
            const step2 = path[i + 1];
            const distance =
                Math.abs(step2.x - step1.x) + Math.abs(step2.y - step1.y);
            totalDistance += distance; // Sum of distances
        }

        return totalDistance;
    }

    async generate_path(grid) {
        // Ok, so this is how this algorithm works:
        // 1. Create a graph connecting all path endpoints to each other using a*. Each will have a link to all other endpoints.
        // 2. Use Kruskal's algorithm to find the minimum spanning tree of the graph.
        // 3. Draw the minimum spanning tree on the grid.
        // 4. Profit.

        let pathGenerator = new EasyStar.js();
        if (this.DEBUG_PATH) console.log("[PATH DEBUG] Grid we workin with: ", grid);
        pathGenerator.setGrid(grid);
        pathGenerator.setAcceptableTiles(this.VALID_PATH_TILES);

        //Step 1:
        const coordinates = this.PATH_ENDPOINTS;
        const edges = [];

        const pathPromises = coordinates.flatMap((startPoint, i) =>
            coordinates.slice(i + 1).map((endPoint) =>
                new Promise((resolve) => {
                    const {x: startX, y: startY} = startPoint;
                    const {x: endX, y: endY} = endPoint;

                    pathGenerator.findPath(startX, startY, endX, endY, (path) => {
                        if (path) {
                            edges.push({
                                startPoint,
                                endPoint,
                                path,
                                distance: this.calculateManhattanDistance(path),
                            });
                        }
                        resolve();
                    });
                    pathGenerator.calculate();
                })
            )
        );

        await Promise.all(pathPromises);

        // Step 2:
        edges.sort((a, b) => a.distance - b.distance);
        if (this.DEBUG_PATH) console.log("[PATH DEBUG] Sorted edges: ", edges);

        const parentMap = new Map();

        //returns the root of the set (tree? idk...) that the point is in
        const find = (point) => {
            if (!parentMap.has(point)) parentMap.set(point, point);
            if (parentMap.get(point) !== point) {
                parentMap.set(point, find(parentMap.get(point)));
            }
            return parentMap.get(point);
        };

        //merges two sets together
        const union = (pointA, pointB) => {
            const rootA = find(pointA);
            const rootB = find(pointB);
            if (rootA !== rootB) parentMap.set(rootA, rootB);
        };

        //actual Kruskal's algorithm. Forms mst
        const mstEdges = [];
        for (const edge of edges) {
            const { startPoint, endPoint } = edge;
            const startKey = `${startPoint.x},${startPoint.y}`;
            const endKey = `${endPoint.x},${endPoint.y}`;

            if (find(startKey) !== find(endKey)) {
                mstEdges.push(edge);
                union(startKey, endKey);
            }
        }

        if (this.DEBUG_PATH) console.log("[PATH DEBUG] Minimum Spanning Tree Edges: ", mstEdges);

        // 5. Draw the MST paths on the grid
        mstEdges.forEach((edge) => {
            edge.path.forEach((tile) => {
                this.add.circle(
                    tile.x * this.TILEHEIGHT + 8,
                    tile.y * this.TILEHEIGHT + 8,
                    4,
                    0x00ff00
                );
            });
        });
    }



}