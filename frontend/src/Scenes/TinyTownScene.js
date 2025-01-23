class TinyTown extends Phaser.Scene {
    VIEW_LOOKUP = false;
    DEBUG_DRAW = true;
    DEBUG_PATH = false;
    DEBUG_COORDS = false;
    runOnce;

    //Path Data
    VALID_PATH_TILES = [
        -1, //empty space
        69, //fence door
        89, //house door
        85 //brown house door
    ];
    PATH_ENDPOINTS = [];

    SECTION_MAX_HEIGHT = 12
    SECTION_MIN_HEIGHT = 5

    SECTION_MAX_WIDTH = 12
    SECTION_MIN_WIDTH = 5

    SECTIONS = []
    GENERATED_SECTIONS = []

    FactString = "";
    relationshipsText = "Relationships:\n";


    constructor() {
        super("tinyTown");

        this.relationshipsText = "Relationships:\n";
        this.FactString = "";
    }
    /*TODO: Variations of output syntax? Like (x, y), x = # y = #, at # and #. Coordinate then object?
    */
    add_fact_from_type(rect, type_string) {
        let new_fact = "";
        new_fact += `${type_string} at (${rect.x}, ${rect.y})`
        if (rect.w > 1 && rect.h > 1) { //If size is > 1x1 also give height and width info
            new_fact += ` with width ${rect.w} and height ${rect.h}`;
        }

        new_fact += `.\n`;
        this.FactString += new_fact;
    }
    add_paths_fact(endPoints) {
        let new_fact = "";
        if (endPoints.length > 0) {
            new_fact += "Path connecting points: ";
            for (let point of endPoints) {
                new_fact += `(${point.x}, ${point.y}) `;
            }
        }
        new_fact += "\n";
        this.FactString += new_fact;
    }

    generate_relationships(objects) {
        const relationships = [];
        const groupedRelationships = {};
    
        // Extract centers and compute relationships
        objects.forEach((objA, indexA) => {
            if (!objA.center || objA.center.x === undefined || objA.center.y === undefined) {
                console.error(`Object ${indexA} (${objA.name}) is missing a valid center property.`);
                return;
            }
            
            // Initialize the group for objA
            groupedRelationships[`${objA.name} at (${objA.center.x}, ${objA.center.y})`] = [];
    
            objects.forEach((objB, indexB) => {
                if (indexA === indexB) return; // Skip comparing the same object
    
                if (!objB.center || objB.center.x === undefined || objB.center.y === undefined) {
                    console.error(`Object ${indexB} (${objB.name}) is missing a valid center property.`);
                    return;
                }
    
                // Calculate positional relationship
                const dx = objB.center.x - objA.center.x;
                const dy = objB.center.y - objA.center.y;
    
                let position;
                if (Math.abs(dy) < 1 && dx > 0) {
                    position = "to the left of";
                } else if (Math.abs(dy) < 1 && dx < 0) {
                    position = "to the right of";
                } else if (Math.abs(dx) < 1 && dy > 0) {
                    position = "above";
                } else if (Math.abs(dx) < 1 && dy < 0) {
                    position = "below";
                } else if (dx > 0 && dy > 0) {
                    position = "diagonally above and to the left of";
                } else if (dx < 0 && dy > 0) {
                    position = "diagonally above and to the right of";
                } else if (dx > 0 && dy < 0) {
                    position = "diagonally below and to the left of";
                } else if (dx < 0 && dy < 0) {
                    position = "diagonally below and to the right of";
                } else {
                    position = "overlapping with";
                }

                const distance = Math.abs(dx) + Math.abs(dy); 
    
                // Add relationship description
                const description = `${objA.name} is ${position} ${objB.name}.`;
                relationships.push(description);

                // Add relationship to the group for objA
                groupedRelationships[`${objA.name} at (${objA.center.x}, ${objA.center.y})`].push(
                    `- is ${position} ${objB.name} at (${objB.center.x}, ${objB.center.y}) (distance: ${distance} tiles).`
                );
    
                // Debug: Log the relationship details
                console.log(
                    `Object ${indexA} (${objA.name}) and Object ${indexB} (${objB.name}): ${description}`
                );
                
                // Update the text
                this.relationshipsText = "Relationships:\n";
                for (const [object, relations] of Object.entries(groupedRelationships)) {
                    this.relationshipsText += `\nRelationships for ${object}:\n`;
                    this.relationshipsText += relations.join("\n") + "\n";
                }

                // For non-grouped relationship text
                // const description = `${objA.name} at (${objA.center.x}, ${objA.center.y}) is ${position} ${objB.name} at (${objB.center.x}, ${objB.center.y}) (distance: ${distance} tiles).`;
                // relationships.push(description);
            });
        });
    
        // Debug: Log all relationships
        console.log("Generated Relationships:", relationships);

        // For non-grouped relationship text
        //this.relationshipsText += relationships.join("\n");
        
        return relationships;
    }
    
    preload() {
        this.load.setPath("./assets/");
        this.load.image("tiny_town_tiles", "kenny-tiny-town-tilemap-packed.png");
    }

    update() {
        if (!this.runOnce) {
            return;
        }
        this.runOnce = false;
    }

    async create() {
        // If you need to lookup a tile, just swap this to true
        // Replaces map generation with a display of the full tile set and each tile's id
        // Debug get tile x, y from click
        if (this.VIEW_LOOKUP) {
            let w = 192;
            let h = 176;
            let size = 16;
            let scale = SCALE;
            let grid = this.generate_lookup_grid(w / size, h / size);
            const map = this.make.tilemap({
                data: grid,
                tileWidth: 16,
                tileHeight: 16,
            });
            const tilesheet = map.addTilesetImage("tiny_town_tiles");
            let layer = map.createLayer(0, tilesheet, 0, 0);
            layer.setScale(scale);
            for (let y = 0; y < h * scale; y += size * scale) {
                for (let x = 0; x < w * scale; x += size * scale) {
                    let name = (x / size / scale + (y / size / scale) * (w / size)).toString();
                    this.add.text(x, y, name, {
                        fontSize: 8,
                        backgroundColor: "000000",
                    });
                }
            }
            return;
        }

        this.SECTIONS = [];
        this.GENERATED_SECTIONS = [];
        this.PATH_ENDPOINTS = [];
        this.FactString = "";
        this.relationshipsText = "Relationships:\n";
    
        // 3x3 sections, each 5x5
        let ground_grid = this.generate_background(MAP_WIDTH, MAP_HEIGHT);
        let props_grid = this.fill_with_tiles(MAP_WIDTH, MAP_HEIGHT, 1);
        this.input.on("pointerdown", () => {
            console.log(
                `${Math.floor(game.input.mousePointer.x / 16)}, ${Math.floor(game.input.mousePointer.y / 16)}`
            );
            console.log(
                props_grid[Math.floor(game.input.mousePointer.y / 16)][
                    Math.floor(game.input.mousePointer.x / 16)
                ]
            );
        });
    
        let stack = [{ x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT }];
    
        while (stack.length > 0) {
            let { x, y, w, h } = stack.pop();
    
            if (w > this.SECTION_MAX_WIDTH || h > this.SECTION_MAX_HEIGHT) {
                let splitVertical = Phaser.Math.Between(0, 1) === 0; // Randomly choose split direction
    
                if (splitVertical) {
                    if (w <= this.SECTION_MIN_WIDTH * 2) {
                        splitVertical = false; // Force horizontal split if width is too small
                    }
                } else {
                    if (h <= this.SECTION_MIN_HEIGHT * 2) {
                        splitVertical = true; // Force vertical split if height is too small
                    }
                }
    
                if (splitVertical) {
                    // Vertical split
                    let split = Phaser.Math.Between(
                        this.SECTION_MIN_WIDTH,
                        Math.min(w - this.SECTION_MIN_WIDTH, this.SECTION_MAX_WIDTH)
                    );
                    stack.push({ x: x, y: y, w: split, h: h });
                    stack.push({ x: x + split, y: y, w: w - split, h: h });
                } else {
                    // Horizontal split
                    let split = Phaser.Math.Between(
                        this.SECTION_MIN_HEIGHT,
                        Math.min(h - this.SECTION_MIN_HEIGHT, this.SECTION_MAX_HEIGHT)
                    );
                    stack.push({ x: x, y: y, w: w, h: split });
                    stack.push({ x: x, y: y + split, w: w, h: h - split });
                }
            } else {
                let rect = { x: x, y: y, w: w, h: h };
                console.log(rect);
                this.draw_debug_rect(rect);
                props_grid = this.generate_section(props_grid, rect);
            }
        }
    
        // Now that generation is complete we can build roads between sections
        if (this.DEBUG_PATH) console.log("[PATH DEBUG] Path Endpoints: ", this.PATH_ENDPOINTS);
    
        await this.generate_path(props_grid);
        if (this.DEBUG_PATH) console.log("[PATH DEBUG] Path generation complete");
    
    
        let grids = [ground_grid, props_grid];
        grids.forEach((grid) => {
            const map = this.make.tilemap({
                data: grid,
                tileWidth: 16,
                tileHeight: 16,
            });
            const tilesheet = map.addTilesetImage("tiny_town_tiles");
            let layer = map.createLayer(0, tilesheet, 0, 0);
            layer.setScale(SCALE);
        });
    
        if (this.DEBUG_COORDS) {
            for (let y = 0; y < MAP_HEIGHT; y += 5) {
                for (let x = 0; x < MAP_WIDTH; x += 5) {
                    let name = x.toString() + " " + y.toString();
                    this.add.text(x * TILE_WIDTH, y * TILE_HEIGHT, name, {
                        fontSize: 8,
                        backgroundColor: "000000",
                    });
                }
            }
        }
    
        // Generate relationships after all objects have been created
        console.log("Before Generated Sections:");
        console.table(this.GENERATED_SECTIONS);

        const relationships = this.generate_relationships(this.GENERATED_SECTIONS);
        console.log("Extracted Relationships:", relationships);
        this.FactString += `\n${this.relationshipsText}`;
        console.log(this.FactString);
    
        this.runOnce = true;
    }


    async sendMapToBackend(map_description) {
        const canvas = game.context.canvas;
        const imageData = canvas.toDataURL('image/png');

        const response = await fetch('http://localhost:3000/mapGenerated', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: imageData,
                description: map_description,
                batchId: global.currentBatchStartTime
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
    }
    
    // generates a section of the map
    // assume grid is filled
    // -1 is empty
    generate_section(grid, rect){
        // decide which section to generate
        this.draw_debug_rect(rect);
        const functions = [this.generate_nothing, this.generate_forest, this.generate_house, this.generate_fence, this.generate_decor]
        const randomIndex = Phaser.Math.Between(0, functions.length - 1);

        //let is_small = rect.w < this.SECTION_MIN_SIZE || rect.h < this.SECTION_MIN_SIZE
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
        let debug_rect = this.add.rectangle(rect.x * TILE_WIDTH * SCALE, rect.y * TILE_HEIGHT * SCALE, rect.w * TILE_WIDTH * SCALE, rect.h * TILE_HEIGHT * SCALE)
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
            name : "nothing",
            rect : rect,
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
        let description = "A forest";
        this.add_fact_from_type(rect, description);
        
        // Manually define the center of the forest rectangle
        const forestObject = {
            name: "Forest",
            rect: {
                x: rect.x,
                y: rect.y,
                w: rect.w,
                h: rect.h,
            },
            center: {
                x: rect.x + rect.w / 2,
                y: rect.y + rect.h / 2,
            }, // Add the center with x and y
        };
        
        // Draw a red dot at the center
        this.add.circle(
            forestObject.center.x * TILE_WIDTH * SCALE,
            forestObject.center.y * TILE_HEIGHT * SCALE,
            2, // radius of the dot
            0xFF0000 // red color
        ).setDepth(10);
        
        this.GENERATED_SECTIONS.push(forestObject);
        
        return {
            grid : grid,
            path_points : [],
            name : "forest",
            description : description,
            rect : rect,
        }
    }

    // House Constants
    HOUSE_MIN_W = 3
    HOUSE_MIN_H = 3

    //returns a tile grid containing a house with padding within the section
    generate_house(section_rect){
        let pad = 1
        let w = Phaser.Math.Between(this.HOUSE_MIN_W,section_rect.w-pad*2)
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
        let window_count = 0
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
                    window_count ++
                }
            }
            window_chance += 0.2
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

        let description = "A " + (alt == 0 ? "gray" : "brown") + " House with " + window_count.toString() + " windows"

        this.add_fact_from_type({
            x: section_rect.x + house_rect.x,
            y: section_rect.y + house_rect.y,
            w: house_rect.w,
            h: house_rect.h}, description);

        // Add the object to the GENERATED_SECTIONS array
        const houseObject = {
            name: "House",
            rect: {
                x: section_rect.x + house_rect.x,
                y: section_rect.y + house_rect.y,
                w: house_rect.w,
                h: house_rect.h,
            },
            center: {
                x: section_rect.x + house_rect.x + house_rect.w / 2,
                y: section_rect.y + house_rect.y + house_rect.h / 2,
            },
        };

        // Draw a red dot at the center
        this.add.circle(
            houseObject.center.x * TILE_WIDTH * SCALE,
            houseObject.center.y * TILE_HEIGHT * SCALE,
            2, // radius of the dot
            0xFF0000 // red color
        ).setDepth(10);

        this.GENERATED_SECTIONS.push(houseObject);


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
            name : "house",
            description : description,
            rect : section_rect,
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

    //returns tilegrid with single tile decor
    generate_decor(rect) {
        const DECOR_TILES = [106, 57, 130, 94, 95, 131, 107, 29,27, 28 ]; //tile ids
        const DECOR_NAME = {
            27: "orange tree",
            28: "green tree",
            29: "mushroom",
            57: "wheelbarrow",
            94: "beehive",
            95: "target",
            106: "log",
            107: "bag",
            130: "bucket empty",
            131: "bucket full"
        }
        const decor_chance = 0.03;

        let grid = this.fill_with_tiles(rect.w, rect.h, -1);
        let description = "An area with "
        for (let y = 0; y < rect.h; y++) {
            for (let x = 0; x < rect.w; x++) {
                if (Math.random() < decor_chance) {
                    let decor = Phaser.Utils.Array.GetRandom(DECOR_TILES)
                    grid[y][x] = decor;
                    //TODO: facts
                    this.add_fact_from_type({
                        x: rect.x + x,
                        y: rect.y + y,
                        w: 1,
                        h: 1
                    }, `A ${DECOR_NAME[decor]}`)
                    description += `A ${DECOR_NAME[decor]}, `
                }
            }
        }
  
        return {
            grid: grid,
            //decor does not generate path endpoints
            path_points: [],
            rect : rect,
            name : "random",
            description : description
        };
    }

    generate_fence(section_rect) {
        const rand = Math.random();
        if (rand < 0.6) {
            return this.generate_regular_fence(section_rect);
        } else if (rand < 0.8) {
            return this.generate_random_fence(section_rect);
        } else {
            return this.generate_single_fence(section_rect);
        }
        // Add the object to the GENERATED_SECTIONS array
        const fenceObject = {
            name: "Fence",
            rect: {
                x: section_rect.x,
                y: section_rect.y,
                w: section_rect.w,
                h: section_rect.h,
            },
        };
        this.GENERATED_SECTIONS.push(fenceObject);
        
    }

    generate_regular_fence(section_rect) {
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
        
        let description = "A closed fenced-in area, with fences"
        this.add_fact_from_type({
            x: section_rect.x + fence_rect.x,
            y: section_rect.y + fence_rect.y,
            w: fence_rect.w,
            h: fence_rect.h
        }, description);

        // Add the object to the GENERATED_SECTIONS array
        const regularFenceObject = {
            name: "Regular Fence",
            rect: {
                x: section_rect.x + fence_rect.x,
                y: section_rect.y + fence_rect.y,
                w: fence_rect.w,
                h: fence_rect.h
            },
            center: {
                x: section_rect.x + fence_rect.x + fence_rect.w / 2,
                y: section_rect.y + fence_rect.y + fence_rect.h / 2,
            },
        };

        // Draw a red dot at the center
        this.add.circle(
            regularFenceObject.center.x * TILE_WIDTH * SCALE,
            regularFenceObject.center.y * TILE_HEIGHT * SCALE,
            2, // radius of the dot
            0xFF0000 // red color
        ).setDepth(10);

        this.GENERATED_SECTIONS.push(regularFenceObject);

            
        let door_global_position = {
            x: section_rect.x + fence_rect.x + door_x,
            y: section_rect.y + fence_rect.y + (door_edge === "bottom" ? fence_h - 1 : 0),
        };
    
        return {
            grid: grid,
            path_points: [door_global_position],
            name : "closed fence",
            description : description,
            rect : section_rect
        };
    }

    generate_random_fence(section_rect) {
        let pad = 1; // Padding to ensure fences don't touch edges
    
        // Randomly decide the length of horizontal and vertical parts of the L-shaped fence
        let horizontal_length = Phaser.Math.Between(3, section_rect.w - pad * 2);
        let vertical_length = Phaser.Math.Between(3, section_rect.h - pad * 2);
    
        // Randomly decide the starting position for the fence within the section
        let start_x = Phaser.Math.Between(pad, section_rect.w - horizontal_length - pad);
        let start_y = Phaser.Math.Between(pad, section_rect.h - vertical_length - pad);
    
        // Randomly choose the orientation of the L-shape
        let orientation = Phaser.Math.RND.pick([
            "top-left",     // Horizontal on top, vertical on left
            "top-right",    // Horizontal on top, vertical on right
            "bottom-left",  // Horizontal on bottom, vertical on left
            "bottom-right"  // Horizontal on bottom, vertical on right
        ]);
    
        // Create a grid for the section initialized with -1
        let grid = this.fill_with_tiles(section_rect.w, section_rect.h, -1);
    
        // Draw the L-shaped fence
        if (orientation === "top-left") {
            // Horizontal part on top
            for (let x = 0; x < horizontal_length; x++) {
                let global_x = start_x + x;
                let global_y = start_y;
                if (x === 0) {
                    grid[global_y][global_x] = 44; // Start of horizontal fence
                } else if (x === horizontal_length - 1) {
                    grid[global_y][global_x] = 82; // Turning point to vertical fence
                } else {
                    grid[global_y][global_x] = 45; // Middle of horizontal fence
                }
            }
            // Vertical part on the left
            for (let y = 1; y < vertical_length; y++) {
                let global_x = start_x;
                let global_y = start_y + y;
                if (y === vertical_length - 1) {
                    grid[global_y][global_x] = 71; // End of vertical fence
                } else {
                    grid[global_y][global_x] = 56; // Middle of vertical fence
                }
            }
        } else if (orientation === "top-right") {
            // Horizontal part on top
            for (let x = 0; x < horizontal_length; x++) {
                let global_x = start_x + x;
                let global_y = start_y;
                if (x === 0) {
                    grid[global_y][global_x] = 80; // Start of horizontal fence
                } else if (x === horizontal_length - 1) {
                    grid[global_y][global_x] = 46; // Turning point to vertical fence
                } else {
                    grid[global_y][global_x] = 45; // Middle of horizontal fence
                }
            }
            // Vertical part on the right
            for (let y = 1; y < vertical_length; y++) {
                let global_x = start_x + horizontal_length - 1;
                let global_y = start_y + y;
                if (y === vertical_length - 1) {
                    grid[global_y][global_x] = 71; // End of vertical fence
                } else {
                    grid[global_y][global_x] = 58; // Middle of vertical fence
                }
            }
        } else if (orientation === "bottom-left") {
            // Vertical part on the left
            for (let y = 0; y < vertical_length; y++) {
                let global_x = start_x;
                let global_y = start_y + y;
                if (y === 0) {
                    grid[global_y][global_x] = 47; // Start of vertical fence
                } else if (y === vertical_length - 1) {
                    grid[global_y][global_x] = 68; // Turning point to horizontal fence
                } else {
                    grid[global_y][global_x] = 56; // Middle of vertical fence
                }
            }
            // Horizontal part on bottom
            for (let x = 1; x < horizontal_length; x++) {
                let global_x = start_x + x;
                let global_y = start_y + vertical_length - 1;
                if (x === horizontal_length - 1) {
                    grid[global_y][global_x] = 82; // End of horizontal fence
                } else {
                    grid[global_y][global_x] = 45; // Middle of horizontal fence
                }
            }
        } else if (orientation === "bottom-right") {
            // Vertical part on the right
            for (let y = 0; y < vertical_length; y++) {
                let global_x = start_x + horizontal_length - 1;
                let global_y = start_y + y;
                if (y === 0) {
                    grid[global_y][global_x] = 47; // Start of vertical fence
                } else if (y === vertical_length - 1) {
                    grid[global_y][global_x] = 70; // Turning point to horizontal fence
                } else {
                    grid[global_y][global_x] = 58; // Middle of vertical fence
                }
            }
            // Horizontal part on bottom
            for (let x = 0; x < horizontal_length - 1; x++) {
                let global_x = start_x + x;
                let global_y = start_y + vertical_length - 1;
                if (x === 0) {
                    grid[global_y][global_x] = 80; // Start of horizontal fence
                } else {
                    grid[global_y][global_x] = 45; // Middle of horizontal fence
                }
            }
        }
    
        let description = "A random L-shaped fence";
        // Log the fence details
        this.add_fact_from_type({
            x: section_rect.x + start_x,
            y: section_rect.y + start_y,
            w: horizontal_length,
            h: vertical_length
        }, description);
        
        // Add the object to the GENERATED_SECTIONS array
        const randomFenceObject = {
            name: "Random Fence",
            rect: {
                x: section_rect.x + start_x,
                y: section_rect.y + start_y,
                w: horizontal_length,
                h: vertical_length,
            },
            center: {
                x: section_rect.x + start_x + horizontal_length / 2,
                y: section_rect.y + start_y + vertical_length / 2,
            },
        };
        
        // Draw a red dot at the center
        this.add.circle(
            randomFenceObject.center.x * TILE_WIDTH * SCALE,
            randomFenceObject.center.y * TILE_HEIGHT * SCALE,
            2, // radius of the dot
            0xFF0000 // red color
        ).setDepth(10);
        
        this.GENERATED_SECTIONS.push(randomFenceObject);        
    
        return {
            grid: grid,
            path_points: [],
            name : "L fence",
            description : description,
            rect : section_rect
        };
    }
    
    generate_single_fence(section_rect) {
        let pad = 1;
        let isHorizontal = Math.random() < 0.5;
    
        let length = Phaser.Math.Between(3, (isHorizontal ? section_rect.w : section_rect.h) - pad * 2);
        let start_x = isHorizontal
            ? Phaser.Math.Between(pad, section_rect.w - length - pad)
            : Phaser.Math.Between(pad, section_rect.w - 1 - pad);
        let start_y = isHorizontal
            ? Phaser.Math.Between(pad, section_rect.h - 1 - pad)
            : Phaser.Math.Between(pad, section_rect.h - length - pad);
    
        let grid = this.fill_with_tiles(section_rect.w, section_rect.h, -1);
    
        if (isHorizontal) {
            for (let x = 0; x < length; x++) {
                let global_x = start_x + x;
                let global_y = start_y;
                grid[global_y][global_x] = x === 0 ? 80 : x === length - 1 ? 82 : 45;
            }
        } else {
            for (let y = 0; y < length; y++) {
                let global_x = start_x;
                let global_y = start_y + y;
                grid[global_y][global_x] = y === 0 ? 47 : y === length - 1 ? 71 : 59;
            }
        }
    
        let description = "A single line fence";
        this.add_fact_from_type({
            x: section_rect.x + start_x,
            y: section_rect.y + start_y,
            w: isHorizontal ? length : 1,
            h: isHorizontal ? 1 : length
        }, description);
        
        // Calculate midpoint based on orientation
        const singleFenceObject = {
            name: "Single Fence",
            rect: {
                x: section_rect.x + start_x,
                y: section_rect.y + start_y,
                w: isHorizontal ? length : 1,
                h: isHorizontal ? 1 : length,
            },
            center: {
                x: isHorizontal
                    ? section_rect.x + start_x + length / 2
                    : section_rect.x + start_x,
                y: isHorizontal
                    ? section_rect.y + start_y
                    : section_rect.y + start_y + length / 2,
            }, // Add the center with x and y
        };
        
        // Draw a red dot at the midpoint
        this.add.circle(
            singleFenceObject.center.x * TILE_WIDTH * SCALE,
            singleFenceObject.center.y * TILE_HEIGHT * SCALE,
            2, // radius of the dot
            0xFF0000 // red color
        ).setDepth(10);
        
        this.GENERATED_SECTIONS.push(singleFenceObject);
        
        return {
            grid: grid,
            path_points: [],
            name : "single fence",
            description : description,
            rect : section_rect
        };
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

                //draw circles if debug
                if (this.DEBUG_PATH){
                    this.add.circle(
                        tile.x * this.TILEHEIGHT + 8,
                        tile.y * this.TILEHEIGHT + 8,
                        2,
                        0x00ff00
                    ).setDepth(10);
                }

                //only draw if the tile is empty
                if (grid[tile.y][tile.x] === -1) {
                    grid[tile.y][tile.x] = 43;
                }

            });
        });

        //TODO: Get array of points that actually end up along path
        this.add_paths_fact(this.PATH_ENDPOINTS);

    }

}