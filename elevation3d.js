
document.addEventListener("DOMContentLoaded", function () {
    init3DTerrain();
});

let terrainMesh, heightScale = 1.5;
let terrainData = []; 

function init3DTerrain() {
    const canvas = document.createElement("canvas");
    canvas.id = "terrainCanvas";
    document.getElementById("terrainContainer").appendChild(canvas);
    const engine = new BABYLON.Engine(canvas, true);
    const scene = new BABYLON.Scene(engine);

    const camera = new BABYLON.ArcRotateCamera("Camera", Math.PI / 3, Math.PI / 3, 100, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true); 

    const light = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0, -1, 1), scene);
    light.intensity = 1;

    terrainMesh = BABYLON.MeshBuilder.CreateGround("terrain", {
        width: 100,
        height: 100,
        subdivisions: 100,
        updatable: true
    }, scene);

   
    const terrainMaterial = new BABYLON.StandardMaterial("terrainMaterial", scene);
    terrainMaterial.diffuseColor = new BABYLON.Color3(0.33, 0.42, 0.18); 
    terrainMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    terrainMesh.material = terrainMaterial;

  
    window.babylonScene = scene;
    window.babylonEngine = engine;
    window.babylonCamera = camera;
    window.terrainMesh = terrainMesh; 

    document.getElementById("heightScaleSlider").addEventListener("input", (event) => {
        heightScale = parseFloat(event.target.value);
        document.getElementById("scaleValue").innerText = heightScale.toFixed(1) + "x";
        regenerateTerrain();
    });

    engine.runRenderLoop(() => {
        scene.render();
    });

    window.addEventListener("resize", () => {
        engine.resize();
    });
}

function generate3DTerrain(elevationData) {
    if (!elevationData || elevationData.length === 0) return;
    terrainData = elevationData; 

    if (terrainMesh) terrainMesh.dispose(); 

    const gridSize = elevationData.length;
    terrainMesh = BABYLON.MeshBuilder.CreateGround("terrain", {
        width: 100,
        height: 100,
        subdivisions: gridSize - 1,
        updatable: true
    }, babylonScene);

   
    const positions = terrainMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);

    for (let i = 0; i < positions.length / 3; i++) {
        const xIndex = i % gridSize;
        const yIndex = Math.floor(i / gridSize);
        if (elevationData[yIndex] && elevationData[yIndex][xIndex] !== undefined) {
            positions[i * 3 + 1] = elevationData[yIndex][xIndex] * heightScale;
        }
    }

    terrainMesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);

    const indices = terrainMesh.getIndices();
    const normals = [];
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    terrainMesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);

    terrainMesh.refreshBoundingInfo();
    terrainMesh.material = babylonScene.getMaterialByName("terrainMaterial");

    window.terrainMesh = terrainMesh;
}

function getTerrainHeightAt(x, z) {
    if (!terrainData || terrainData.length === 0) return 0;
    const gridSize = terrainData.length;
    
    const scaledX = Math.floor((x / 100) * gridSize);
    const scaledZ = Math.floor((z / 100) * gridSize);

    if (terrainData[scaledZ] && terrainData[scaledZ][scaledX] !== undefined) {
        return terrainData[scaledZ][scaledX] * heightScale;
    }
    return 0;
}

function regenerateTerrain() {
    generate3DTerrain(terrainData);
}

document.getElementById("generate").addEventListener("click", function () {
    generate3DTerrain(window.elevation);
});
