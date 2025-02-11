// Perlin Noise Generator with Multi-Octaves
class Noise {
    constructor() {
        this.p = [];
        for (let i = 0; i < 256; i++) this.p[i] = Math.floor(Math.random() * 256);
        this.perm = [...this.p, ...this.p];
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(a, b, t) {
        return a + t * (b - a);
    }

    grad(hash, x, y) {
        const h = hash & 3;
        const u = h < 2 ? x : y;
        const v = h < 2 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    noise(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);
        const u = this.fade(xf);
        const v = this.fade(yf);

        const aaa = this.perm[this.perm[X] + Y];
        const aba = this.perm[this.perm[X] + Y + 1];
        const baa = this.perm[this.perm[X + 1] + Y];
        const bba = this.perm[this.perm[X + 1] + Y + 1];

        const x1 = this.lerp(this.grad(aaa, xf, yf), this.grad(baa, xf - 1, yf), u);
        const x2 = this.lerp(this.grad(aba, xf, yf - 1), this.grad(bba, xf - 1, yf - 1), u);
        return (this.lerp(x1, x2, v) + 1) / 2;
    }

    multiOctaveNoise(x, y, octaves, persistence, scale) {
        let total = 0;
        let frequency = scale;
        let amplitude = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            total += this.noise(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }

        return total / maxValue;
    }
}

// Land Classification
const landClasses = [
    { value: 0.1, color: "#00008B", name: "Water" },
    { value: 0.2, color: "#A9A9A9", name: "Alpine Sparse and Barren" },
    { value: 0.3, color: "#FFFFFF", name: "Snow" },
    { value: 0.4, color: "#228B22", name: "Conifer Forest (Xeric-Mesic)" },
    { value: 0.5, color: "#66CDAA", name: "Conifer Forest (Mesic-Wet)" },
    { value: 0.6, color: "#006400", name: "Mixed Deciduous/Coniferous Forest" },
    { value: 0.7, color: "#D2B48C", name: "Shrubland" },
    { value: 0.8, color: "#F5DEB3", name: "Grassland" },
    { value: 0.9, color: "#ADD8E6", name: "Rivers" },
    { value: 1.0, color: "#FF0000", name: "Urban/Road Networks" },
];
window.elevation = []; // Make global
// Generate Elevation with Balanced Scaling to Avoid Black Areas
function generateElevation(noise, width, height) {
    const scale = 0.0015; // Slightly larger features for realism
    const octaves = 8; // Balanced octaves for detail
    const persistence = 0.45; // Amplitude retention across octaves
    const lacunarity = 2; // Controls frequency spacing of features

    const elevation = Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => {
            let value = 0;
            let frequency = scale;
            let amplitude = 1;
            let maxValue = 0;

            // Fractal Brownian Motion (fBM) for better terrain generation
            for (let i = 0; i < octaves; i++) {
                value += noise.noise(x * frequency, y * frequency) * amplitude;
                maxValue += amplitude;
                amplitude *= persistence;
                frequency *= lacunarity;
            }

            let elevationValue = value / maxValue; // Normalize

            // Apply a power curve to smooth out extreme peaks and valleys
            elevationValue = Math.pow(elevationValue, 1.5);

            // **NEW: Clamp elevation values between 0 and 1** to ensure all land classes work
            elevationValue = Math.min(Math.max(elevationValue, 0), 1);

            // Adjust scaling (lowered from 2.0 to 1.2 to prevent extreme heights)
            return elevationValue * 1.2; 
        })
    );

    return applyGaussianBlur(elevation, width, height);
}

// Gaussian Blur for Smooth Transitions
function applyGaussianBlur(data, width, height) {
    const kernel = [
        [1 / 16, 1 / 8, 1 / 16],
        [1 / 8, 1 / 4, 1 / 8],
        [1 / 16, 1 / 8, 1 / 16]
    ];
    
    const smoothed = JSON.parse(JSON.stringify(data));

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let sum = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    sum += data[y + ky][x + kx] * kernel[ky + 1][kx + 1];
                }
            }
            smoothed[y][x] = sum;
        }
    }
    return smoothed;
}





// Generate Fuel Classification Layer
function generateClassification(elevation, width, height, activeLandClasses) {
    return elevation.map(row =>
        row.map(value => {
            const land = activeLandClasses.find(c => value <= c.value);
            return land ? land.color : "#000000";
        })
    );
}

// Generate Fuel Density Map
function generateFuelDensity(noise, elevation, classification, width, height) {
    return elevation.map((row, y) =>
        row.map((value, x) => {
            const color = classification[y][x];
            if (color === "#228B22" || color === "#66CDAA" || color === "#006400") {
                return Math.max(0.5, value) * noise.noise(x * 0.01, y * 0.01);
            } else if (color === "#D2B48C" || color === "#F5DEB3") {
                return Math.max(0.3, value) * noise.noise(x * 0.02, y * 0.02);
            }
            return 0;
        })
    );
}

// Render Layers
function renderLayer(layer, ctx, width, height, type) {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            const value = layer[y][x];

            if (type === "density" || type === "elevation") {
                const gray = Math.floor(value * 255);
                data[index] = gray;
                data[index + 1] = gray;
                data[index + 2] = gray;
            } else {
                const [r, g, b] = value.match(/\w\w/g).map(c => parseInt(c, 16));
                data[index] = r;
                data[index + 1] = g;
                data[index + 2] = b;
            }
            data[index + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

// Main Function
function generateLandscape() {
    const canvas = document.getElementById("landscapeCanvas");
    const ctx = canvas.getContext("2d");
    const width = 500, height = 500;
    canvas.width = width;
    canvas.height = height;

    const noise = new Noise();
    const includeSnow = document.getElementById("snowToggle").checked;
    const includeUrban = document.getElementById("urbanToggle").checked;
    const includeWater = document.getElementById("waterToggle").checked;

    const activeLandClasses = landClasses.filter((fuel) => {
        if (!includeSnow && fuel.name === "Snow") return false;
        if (!includeUrban && fuel.name === "Urban/Road Networks") return false;
        return true;
    });

    // Generate terrain layers
    elevation = generateElevation(noise, width, height);
    classification = generateClassification(elevation, width, height, activeLandClasses);
    density = generateFuelDensity(noise, elevation, classification, width, height);

    // Generate urban areas if included
    if (includeUrban) {
        const roadCtx = document.createElement("canvas").getContext("2d");
        classification = generateRoads(width, height, 50, roadCtx, classification, elevation);
    }

    // Render the selected classification layer
    renderLayer(classification, ctx, width, height, "classification");

    // Generate water features if included
    if (includeWater) {
        generateWaterFeatures(width, height, ctx, elevation);
    }

    // Generate roads and city layout after classification
    if (includeUrban) {
        generateCityLayout(width, height, 50, ctx, classification, elevation);
    }

    // Generate vegetation based on the classification and elevation
    generateVegetation(classification, elevation);

    // ✅ Initialize Babylon.js 3D Scene if not already set
    if (!scene) {
        init3DTerrain();
    }

    // ✅ Ensure Wind Simulation is initialized **after the scene is created**
    setTimeout(() => {
        initWindSimulation();
    }, 1000); // Allow scene to initialize before adding wind elements
}

// Ensure Correct Layer Switching
document.getElementById("generate").addEventListener("click", generateLandscape);
document.getElementById("layerSelector").addEventListener("change", function () {
    const selectedLayer = this.value;
    const canvas = document.getElementById("landscapeCanvas");
    const ctx = canvas.getContext("2d");

    if (selectedLayer === "classification") {
        renderLayer(classification, ctx, canvas.width, canvas.height, "classification");
    } else if (selectedLayer === "elevation") {
        renderLayer(elevation, ctx, canvas.width, canvas.height, "elevation");
    } else if (selectedLayer === "density") {
        renderLayer(density, ctx, canvas.width, canvas.height, "density");
    } else if (selectedLayer === "water") {
        generateWaterFeatures(canvas.width, canvas.height, ctx, elevation);
    }
});

// Run initial landscape generation on page load
window.onload = generateLandscape;
