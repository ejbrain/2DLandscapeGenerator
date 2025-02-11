/**
 * WATER FEATURES CLASS
 * ---------------------
 * Generates lake and river systems dynamically based on the elevation map.
 * Uses a pathfinding algorithm that follows lower elevation points to create 
 * realistic river flow and lakes.
 */
class WaterFeatures {
    constructor(width, height, elevationMap) {
        this.width = width;
        this.height = height;
        this.elevationMap = elevationMap;
        this.waterBodies = []; // Store lakes
        this.rivers = []; // Store rivers
        this.waterThreshold = 0.2; // Elevation threshold for lakes
        this.maxRivers = 2; // Limit number of major rivers
    }

    // Identify and generate lakes based on elevation threshold
    generateLakes() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.elevationMap[y][x] <= this.waterThreshold) {
                    this.waterBodies.push({ x, y });
                }
            }
        }
    }

    // Generate a limited number of larger river networks
    generateRivers() {
        const riverSources = this.identifyRiverSources();
        riverSources.slice(0, this.maxRivers).forEach(source => {
            this.createRiverPath(source);
        });
    }

    // Identify a few key sources at mid-high elevations for realistic river origins
    identifyRiverSources() {
        const sources = [];
        for (let y = 0; y < this.height; y += Math.floor(this.height / 5)) {
            for (let x = 0; x < this.width; x += Math.floor(this.width / 5)) {
                if (this.elevationMap[y][x] > this.waterThreshold && this.elevationMap[y][x] < 0.6) {
                    sources.push({ x, y });
                }
            }
        }
        return sources.sort((a, b) => this.elevationMap[b.y][b.x] - this.elevationMap[a.y][a.x]);
    }

    // Create a smoother, branching river path
    createRiverPath(source) {
        let current = source;
        const riverPath = [];
        let widthFactor = Math.random() * 2 + 1; // Vary river width
        
        while (true) {
            riverPath.push({ ...current, width: widthFactor });
            const neighbors = this.getNeighbors(current.x, current.y);
            const lowestNeighbor = neighbors.reduce((lowest, neighbor) => {
                return this.elevationMap[neighbor.y][neighbor.x] < this.elevationMap[lowest.y][lowest.x] ? neighbor : lowest;
            }, current);
            
            if (this.elevationMap[lowestNeighbor.y][lowestNeighbor.x] >= this.elevationMap[current.y][current.x]) {
                break;
            }

            widthFactor = Math.max(1, widthFactor * (0.9 + Math.random() * 0.2)); // Adjust width randomly
            current = lowestNeighbor;
        }

        this.rivers.push(riverPath);
    }

    // Get valid neighbors of a given coordinate
    getNeighbors(x, y) {
        const neighbors = [];
        const directions = [
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
            { dx: -1, dy: -1 }, { dx: 1, dy: 1 },
            { dx: -1, dy: 1 }, { dx: 1, dy: -1 }
        ];
        directions.forEach(({ dx, dy }) => {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < this.width && ny < this.height) {
                neighbors.push({ x: nx, y: ny });
            }
        });
        return neighbors;
    }

    // Render lakes and rivers onto the canvas
    render(ctx) {
        ctx.fillStyle = "#00008B"; // Deep blue for lakes
        this.waterBodies.forEach(({ x, y }) => {
            ctx.fillRect(x, y, 1, 1);
        });
        
        this.rivers.forEach(river => {
            for (let i = 1; i < river.length; i++) {
                const p1 = river[i - 1];
                const p2 = river[i];
                ctx.strokeStyle = "#4682B4";
                ctx.lineWidth = p2.width; // Use dynamic river width
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        });
    }
}

/**
 * WATER SYSTEM INTEGRATION
 * -------------------------
 * Generates lakes and river networks and integrates them into the landscape.
 */
function generateWaterFeatures(width, height, ctx, elevationMap) {
    const waterSystem = new WaterFeatures(width, height, elevationMap);
    waterSystem.generateLakes();
    waterSystem.generateRivers();
    waterSystem.render(ctx);
}