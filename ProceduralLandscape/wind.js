document.addEventListener("DOMContentLoaded", function () {
    setTimeout(initWindSimulation, 500); 
});

let windArrows = [];
let windSpeed = 5; 
let windDirection = Math.PI / 4; 
const arrowCount = 200; // 
const arrowUpdateInterval = 30; 


let scene = window.babylonScene;
let engine = scene ? scene.getEngine() : null;

function initWindSimulation() {
    scene = window.babylonScene; 
    engine = scene?.getEngine();

    if (!scene || !engine || !window.terrainMesh) {
        console.error("⏳ Babylon.js scene or terrain not ready. Retrying...");
        setTimeout(initWindSimulation, 500);
        return;
    }

    console.log("✅ Wind Simulation Initialized");


    setupWindControls();


    generateWindArrows();


    engine.runRenderLoop(() => {
        updateWindArrows();
        scene.render();
    });

   
    document.getElementById("heightScaleSlider").addEventListener("input", function (event) {
        window.heightScale = parseFloat(event.target.value);
        document.getElementById("scaleValue").textContent = window.heightScale.toFixed(1) + "x";
        regenerateWindArrows(); 
    });
}

function setupWindControls() {
    const speedSlider = document.getElementById("windSpeedSlider");
    const directionSlider = document.getElementById("windDirectionSlider");

    speedSlider.addEventListener("input", function () {
        windSpeed = parseFloat(speedSlider.value);
        document.getElementById("windSpeedValue").textContent = `${windSpeed} m/s`;
    });

  
    directionSlider.addEventListener("input", function () {
        windDirection = parseFloat(directionSlider.value) * (Math.PI / 180); 
        document.getElementById("windDirectionValue").textContent = `${directionSlider.value}°`;
        regenerateWindArrows(); 
    });
}

function generateWindArrows() {
    if (!scene || !window.terrainMesh) {
        console.error("Terrain or scene not found!");
        return;
    }


    windArrows.forEach(({ arrow }) => arrow.dispose());
    windArrows = [];

    const gridSize = 100; 
    const step = Math.sqrt(arrowCount); 

    for (let z = -gridSize / 2; z < gridSize / 2; z += step) {
        for (let x = -gridSize / 2; x < gridSize / 2; x += step) {
            const y = getElevationAt(x, z) + 2; 
            const position = new BABYLON.Vector3(x, y, z);
            const arrow = createArrow(position);
            windArrows.push({ arrow, position });
        }
    }
}

function createArrow(position) {
    const arrow = BABYLON.MeshBuilder.CreateCylinder("arrow", {
        height: 2,
        diameter: 0.1,
        diameterTop: 0,
        diameterBottom: 0.3
    }, scene);

    arrow.position = position.clone();
    arrow.rotation = new BABYLON.Vector3(0, windDirection, 0);

    const material = new BABYLON.StandardMaterial("arrowMaterial", scene);
    material.diffuseColor = new BABYLON.Color3(0.2, 0.6, 1); 
    material.alpha = 0.8; 
    arrow.material = material;

    return arrow;

function getElevationAt(x, z) {
    const elevationData = window.elevation || [];
    const gridSize = elevationData.length;

    if (gridSize === 0) return 0; 
    const scaledX = Math.floor((x + 50) / 100 * gridSize);
    const scaledZ = Math.floor((z + 50) / 100 * gridSize);

    if (scaledX >= 0 && scaledX < gridSize && scaledZ >= 0 && scaledZ < gridSize) {
        return elevationData[scaledZ][scaledX] * window.heightScale; //
    }

    return 0; 


function updateWindArrows() {
    windArrows.forEach(({ arrow, position }) => {
        const windVector = getWindVector(position.x, position.z);

        position.x += windVector.x * windSpeed * 0.05;
        position.z += windVector.z * windSpeed * 0.05;

        position.y = getElevationAt(position.x, position.z) + 2; 

        if (position.x < -50 || position.x > 50) position.x = -position.x;
        if (position.z < -50 || position.z > 50) position.z = -position.z;

        arrow.position = position.clone();
        arrow.rotation.y = Math.atan2(windVector.z, windVector.x);
    });
}

function getWindVector(x, z) {
    const baseVector = new BABYLON.Vector3(
        Math.cos(windDirection),
        0,
        Math.sin(windDirection)
    );

    baseVector.x += Math.sin(x * 0.1 + z * 0.1) * 0.05;
    baseVector.z += Math.cos(x * 0.1 - z * 0.1) * 0.05;

    return baseVector.normalize();
}


function regenerateWindArrows() {
    generateWindArrows(); // Recreate arrows with new height scaling
}
