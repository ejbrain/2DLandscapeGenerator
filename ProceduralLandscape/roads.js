/**
 * ROAD NETWORK CLASS
 * ------------------
 * Generates a road network from a set of points using a minimum spanning tree
 * approach, and renders smooth (curved) roads.
 */
class RoadNetwork {
    constructor(width, height, pointsCount, elevationMap) {
      this.width = width;
      this.height = height;
      this.pointsCount = pointsCount;
      this.elevationMap = elevationMap;
      this.points = this.generateRoadPoints();
      this.edges = [];
      // Adjust this threshold to differentiate main (arterial) roads from sub-roads.
      this.mainRoadThreshold = Math.min(width, height) * 0.15;
    }
  
    // Generate road points using a Poisson disk–like approach for a more natural spread.
    generateRoadPoints() {
      const points = [];
      const minDist = this.width / this.pointsCount;
      const maxAttempts = 30;
  
      function isValidPoint(px, py, existingPoints) {
        for (const p of existingPoints) {
          if (Math.hypot(p.x - px, p.y - py) < minDist) return false;
        }
        return true;
      }
  
      for (let i = 0; i < this.pointsCount; i++) {
        let attempts = 0;
        let valid = false;
        let x, y;
        while (attempts < maxAttempts && !valid) {
          x = Math.random() * this.width;
          y = Math.random() * this.height;
          valid = isValidPoint(x, y, points);
          attempts++;
        }
        if (valid) points.push({ x, y });
      }
      return points;
    }
  
    // Clamp values to ensure we don't go out-of-bounds when sampling elevation.
    clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }
  
    // Calculate a terrain-aware “distance” that penalizes steep elevation changes.
    terrainAwareDistance(p1, p2) {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const steps = Math.max(Math.abs(dx), Math.abs(dy));
      let totalElevationChange = 0;
  
      for (let i = 0; i <= steps; i++) {
        const x = this.clamp(Math.round(p1.x + (dx * i) / steps), 0, this.width - 1);
        const y = this.clamp(Math.round(p1.y + (dy * i) / steps), 0, this.height - 1);
        if (this.elevationMap[y] && this.elevationMap[y][x] !== undefined) {
          const p1x = this.clamp(Math.round(p1.x), 0, this.width - 1);
          const p1y = this.clamp(Math.round(p1.y), 0, this.height - 1);
          totalElevationChange += Math.abs(this.elevationMap[y][x] - this.elevationMap[p1y][p1x]);
        } else {
          console.warn(`Invalid elevation access at (${x},${y})`);
        }
      }
      return Math.hypot(dx, dy) + totalElevationChange * 10;
    }
  
    // Generate a road network using a minimum spanning tree (shortest-path) algorithm.
    generateRoadNetwork() {
      const edges = [];
      const visited = new Set();
      const pq = [];
  
      visited.add(0);
      for (let i = 1; i < this.points.length; i++) {
        pq.push({
          from: 0,
          to: i,
          distance: this.terrainAwareDistance(this.points[0], this.points[i]),
        });
      }
  
      while (visited.size < this.points.length) {
        pq.sort((a, b) => a.distance - b.distance);
        const shortestEdge = pq.shift();
        if (!visited.has(shortestEdge.to)) {
          visited.add(shortestEdge.to);
          edges.push(shortestEdge);
          for (let i = 0; i < this.points.length; i++) {
            if (!visited.has(i)) {
              pq.push({
                from: shortestEdge.to,
                to: i,
                distance: this.terrainAwareDistance(this.points[shortestEdge.to], this.points[i]),
              });
            }
          }
        }
      }
      this.edges = edges;
    }
  
    // Helper: Compute a perpendicular offset vector for a segment.
    getPerpendicularOffset(p1, p2, magnitude) {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      if (len === 0) return { dx: 0, dy: 0 };
      // The perpendicular vector is (-dy, dx).
      return { dx: (-dy / len) * magnitude, dy: (dx / len) * magnitude };
    }
  
    // Render an edge as a quadratic Bézier curve with a control point for curvature.
    renderEdge(ctx, p1, p2) {
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      // Offset magnitude: adjust the 0.2 factor (and random factor) for more/less curvature.
      const offsetMagnitude = (dist * 0.2) * (Math.random() * 0.6 + 0.2);
      const offset = this.getPerpendicularOffset(p1, p2, offsetMagnitude);
      const midPoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const controlPoint = { x: midPoint.x + offset.dx, y: midPoint.y + offset.dy };
  
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, p2.x, p2.y);
      ctx.stroke();
    }
  
    // Render the entire road network.
    render(ctx) {
      for (let edge of this.edges) {
        const p1 = this.points[edge.from];
        const p2 = this.points[edge.to];
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const isMainRoad = dist > this.mainRoadThreshold;
        if (isMainRoad) {
          ctx.strokeStyle = "#AA0000"; // Darker red for main roads.
          ctx.lineWidth = 3;
        } else {
          ctx.strokeStyle = "#FF0000"; // Bright red for secondary roads.
          ctx.lineWidth = 1.5;
        }
        this.renderEdge(ctx, p1, p2);
      }
    }
  }
  
  /**
   * BUILDING GENERATION MODULE
   * --------------------------
   * Procedurally places buildings as red boxes (of various shapes) along the road network.
   * For each road edge, we divide its length into slots and place candidate buildings on both sides.
   */
  function generateBuildings(roadNetwork) {
    const buildings = [];
    // Increase the slot length to generate larger building footprints.
    const buildingSlotLength = 100; // Increased from 50 to 100.
    
    // Loop through each road edge.
    roadNetwork.edges.forEach(edge => {
      const p1 = roadNetwork.points[edge.from];
      const p2 = roadNetwork.points[edge.to];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.hypot(dx, dy);
      // Use at least one slot per edge.
      const slots = Math.max(1, Math.floor(length / buildingSlotLength));
      // Determine road orientation angle.
      const angle = Math.atan2(dy, dx);
      // Perpendicular unit vector (for offsetting buildings away from the road).
      const perpX = -Math.sin(angle);
      const perpY = Math.cos(angle);
  
      // For each slot along the edge, place buildings on both sides.
      for (let i = 0; i < slots; i++) {
        // Determine the mid-position along the slot.
        const t = (i + 0.5) / slots;
        const midX = p1.x + dx * t;
        const midY = p1.y + dy * t;
        // Randomize building dimensions; buildings range approximately 60-100 pixels in width and height.
        const bWidth = buildingSlotLength * (0.1 + Math.random() * 0.05);
        const bHeight = buildingSlotLength * (0.1 + Math.random() * 0.05);
        // Offset distance from road edge (includes a small gap).
        const offsetDistance = bWidth / 2 + 10;
        
        // Left side building.
        buildings.push({
          x: midX + perpX * offsetDistance,
          y: midY + perpY * offsetDistance,
          width: bWidth,
          height: bHeight,
          angle: angle
        });
        // Right side building.
        buildings.push({
          x: midX - perpX * offsetDistance,
          y: midY - perpY * offsetDistance,
          width: bWidth,
          height: bHeight,
          angle: angle
        });
      }
    });
    return buildings;
  }
  
  // Render buildings as red boxes (rotated to align with the road orientation).
  function renderBuildings(ctx, buildings) {
    ctx.fillStyle = "rgba(200, 0, 0, 0.7)"; // Semi-transparent red.
    buildings.forEach(b => {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      // Draw rectangle centered at (0,0)
      ctx.fillRect(-b.width / 2, -b.height / 2, b.width, b.height);
      ctx.restore();
    });
  }
  
  /**
   * INTEGRATION FUNCTIONS
   * ---------------------
   * These functions integrate the road network and building generation into the overall map.
   */
  
  // Overlays road segments on the classification map.
  function integrateRoadsIntoClassification(classification, roadNetwork) {
    const updatedClassification = classification.map(row => [...row]);
    roadNetwork.edges.forEach(edge => {
      const p1 = roadNetwork.points[edge.from];
      const p2 = roadNetwork.points[edge.to];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const steps = Math.max(Math.abs(dx), Math.abs(dy));
      for (let i = 0; i <= steps; i++) {
        const x = Math.round(p1.x + (dx * i) / steps);
        const y = Math.round(p1.y + (dy * i) / steps);
        if (x >= 0 && y >= 0 && x < updatedClassification[0].length && y < updatedClassification.length) {
          updatedClassification[y][x] = "#FF0000"; // Mark roads in red.
        }
      }
    });
    return updatedClassification;
  }
  
  // Generate roads, render them, and integrate them into the classification map.
  function generateRoads(width, height, pointsCount, ctx, classification, elevationMap) {
    console.log("Generating roads...");
    if (!elevationMap || elevationMap.length === 0) {
      console.error("Elevation map is empty or undefined.");
      return classification;
    }
    const roadNetwork = new RoadNetwork(width, height, pointsCount, elevationMap);
    roadNetwork.generateRoadNetwork();
    roadNetwork.render(ctx);
    return integrateRoadsIntoClassification(classification, roadNetwork);
  }
  
  /**
   * CITY LAYOUT GENERATION
   * -----------------------
   * Generates the city layout by rendering roads and then placing buildings along them.
   */
  function generateCityLayout(width, height, pointsCount, ctx, classification, elevationMap) {
    // Generate and render roads.
    const roadNetwork = new RoadNetwork(width, height, pointsCount, elevationMap);
    roadNetwork.generateRoadNetwork();
    roadNetwork.render(ctx);
    
    // Integrate roads into the classification (optional).
    const updatedClassification = integrateRoadsIntoClassification(classification, roadNetwork);
    
    // Generate and render buildings.
    const buildings = generateBuildings(roadNetwork);
    renderBuildings(ctx, buildings);
    
    return updatedClassification;
  }
  