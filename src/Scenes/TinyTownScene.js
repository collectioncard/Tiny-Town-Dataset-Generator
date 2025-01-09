class TinyTown extends Phaser.Scene {
    constructor() {
        super("tinyTown");
    }

    preload() {
        this.load.setPath("./assets/");
        this.load.image("tiny_town_tiles", "kenny-tiny-town-tilemap-packed.png");
    }

    create() {
        // If you need to lookup a tile, just swap this to true
        let view_lookup = false
        if (view_lookup){
            let w = 192
            let h = 176
            let size = 16
            let scale = 2
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
                    var text = this.add.text(x,y, name, {
                        "fontSize" : 8,
                        "backgroundColor" : "000000"
                    })
                }
            }
            return
        }

        // 3x3 sections, each each 5x5
        let sections = {x:2, y:2}
        let section_size = 8

        let ground_grid = this.generate_background(sections.x * section_size,sections.y * section_size, 1)
        let props_grid = this.generate_background(sections.x * section_size,sections.y * section_size, 1)

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
            var layer = map.createLayer(0, tilesheet, 0, 0)
            layer.setScale(2);
        });
    }

    // generates a section of the map
    // assume grid is filled
    // -1 is empty
    generate_section(grid, rect){
        // decide which section to generate
        const functions = [this.generate_nothing, this.generate_forest, this.generate_house]
        const randomIndex = Math.floor(Math.random() * functions.length);

        let local_section = functions[randomIndex].bind(this)(rect)
        for (let y = rect.y; y < rect.y+rect.h; y++) {
            for (let x = rect.x; x < rect.x+rect.w; x++) {
                grid[y][x] = local_section[y-rect.y][x-rect.x]
            }
        }
        return grid
    }

    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min; 
    }

    // returns a 2d array with a tile of 1 type
    generate_background(w, h, tile = 1){
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
        return this.generate_background(rect.w, rect.h, -1)
    }
    generate_forest(rect){
        return this.generate_background(rect.w, rect.h, 15)
    }
    generate_house(rect){
        let pad = 1
        let w = this.getRandomInt(3,rect.w-pad*2)
        let h = this.getRandomInt(3,rect.h-pad*2)
        let small_rect = {
            x: this.getRandomInt(pad,rect.w-w-pad),
            y: this.getRandomInt(pad,rect.h-h-pad),
            w:w,
            h,h
        }
        console.log(rect, small_rect)
        let from_grid =  this.generate_random_house(small_rect)
        let padded = this.pad_grid(from_grid, rect, small_rect)
        return padded
    }
    pad_grid(from_grid, to_rect, from_rect){
        let grid = this.generate_background(to_rect.w, to_rect.h, -1)
        for (let y = 0; y < from_rect.h; y++) {
            for (let x = 0; x < from_rect.w; x++) {
                grid[y+from_rect.y][x+from_rect.x] = from_grid[y][x]
            }
        }
        return grid
    }
    generate_random_house(rect){
        let h = rect.h
        let w = rect.w
        let door_x = this.getRandomInt(1,w-2)
        let grid =  this.generate_background(rect.w, rect.h, 77)
        // loop if windows
        let y = 0
        grid[y][0] = 52
        for (let x = 1; x < w-1; x++) {
            grid[y][x] = 53
        }
        grid[y][w-1] = 54
        y = 1
        grid[y][0] = 64
        for (let x = 1; x < w-1; x++) {
            grid[y][x] = 65
        }
        grid[y][w-1] = 66
        
        for (let y = 2; y < h; y++) {
            grid[y][0] = 76
            for (let x = 1; x < w-1; x++) {
                grid[y][x] = 77
            }
            grid[y][w-1] = 79
        }
        grid[h-1][door_x] = 89
        return grid
    }
    generate_fence(rect){
        return this.generate_background(rect.w, rect.h, 17)
    }

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
}