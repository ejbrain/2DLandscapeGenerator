function generateSatelliteView(classification, elevation) {
    const layer = [];
    for (let y = 0; y < classification.length; y++) {
        const row = [];
        for (let x = 0; x < classification[0].length; x++) {
            const elevationValue = elevation[y][x];
            const color = classification[y][x];

            // Generate realistic shading based on elevation
            const shadingFactor = elevationValue * 100;
            row.push(applyShading(color, shadingFactor));
        }
        layer.push(row);
    }
    return layer;
}

// Apply shading to base color
function applyShading(baseColor, shadingFactor) {
    const [r, g, b] = baseColor.match(/\w\w/g).map((c) => parseInt(c, 16));
    const shade = Math.max(0, Math.min(255, shadingFactor));
    return `rgb(${Math.min(r + shade, 255)}, ${Math.min(g + shade, 255)}, ${Math.min(b + shade, 255)})`;
}

// Render Satellite View
function renderSatelliteView(satelliteLayer, ctx, width, height) {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let y = 0; y < satelliteLayer.length; y++) {
        for (let x = 0; x < satelliteLayer[0].length; x++) {
            const [r, g, b] = satelliteLayer[y][x].match(/\d+/g).map((c) => parseInt(c));
            const index = (y * width + x) * 4;
            data[index] = r;
            data[index + 1] = g;
            data[index + 2] = b;
            data[index + 3] = 255; // Alpha
        }
    }
    ctx.putImageData(imageData, 0, 0);
}
