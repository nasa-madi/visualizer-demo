// Load the embeddings from output.json

document.addEventListener("DOMContentLoaded", async function() {
    var currentPath = window.location.pathname;
    console.log("Current Path:", currentPath);
    if (currentPath.endsWith("/")){
        currentPath = currentPath.slice(0, -1);
    }
    
    // Load data and compute PCA once
    const response = await fetch(currentPath+"/output-whitespace.json");
    const embeddings = await response.json();
    
    // Extract data
    const embeddingVectors = embeddings.map(item => item.embedding);
    const sources = embeddings.map(item => item.source);
    const prompts = embeddings.map(item => item.prompt);
    const maturity = embeddings.map(item => item.maturity);
    
    // Compute PCA once for all data
    const pca = new druid.PCA(embeddingVectors, {d: 2, seed: 42});
    const allReducedData = pca.transform();
    
    // Compute clusters once with k=5
    const k = 5;
    const staticClusterAssignments = kMeans(allReducedData, k, 100);
    const staticCentroids = getCentroids(allReducedData, staticClusterAssignments, k);
    
    // Initialize visualization with static clustering
    buildVisualization(embeddings, allReducedData, sources, prompts, maturity, 
        staticClusterAssignments, staticCentroids);
});

function buildVisualization(embeddings, allReducedData, sources, prompts, maturity, 
    staticClusterAssignments, staticCentroids) {
    
    // Create controls first
    const controls = d3.select('#graph')
        .insert('div', 'svg')
        .attr('class', 'controls')
        .style('padding-left', '50px');
    
    // Cluster slider controls
    const sliderDiv = controls.append('div')
        .attr('class', 'slider-control');

    sliderDiv.append('label')
        .text('Number of clusters: ');

    sliderDiv.append('input')
        .attr('type', 'range')
        .attr('min', '2')
        .attr('max', '10')
        .attr('value', '5')
        .attr('id', 'cluster-slider');
        
    sliderDiv.append('span')
        .attr('id', 'cluster-value')
        .text('5');
    
    // Source filter dropdown
    const filterDiv = controls.append('div')
        .attr('class', 'filter-control');

        filterDiv.append('label')
        .text('Filter by source: ');
    
        const uniqueSources = ['All', ...new Set(embeddings.map(item => item.source))];
    
        filterDiv.append('select')
            .attr('id', 'source-filter')
            .selectAll('option')
            .data(uniqueSources)
            .enter()
            .append('option')
            .text(d => d)
            .attr('value', d => d);
        
    // Add line toggle control with label
    const lineToggleDiv = controls.append('div')
        .attr('class', 'line-control')
        .style('margin-top', '10px');

    lineToggleDiv.append('input')
        .attr('type', 'checkbox')
        .attr('id', 'line-toggle')
        .property('checked', false);

    lineToggleDiv.append('label')
        .attr('for', 'line-toggle')
        .text(' Show lines to centroids');

    // Add Voronoi toggle control with label
    const voronoiToggleDiv = controls.append('div')
        .attr('class', 'voronoi-control')
        .style('margin-top', '10px');

    voronoiToggleDiv.append('input')
        .attr('type', 'checkbox')
        .attr('id', 'voronoi-toggle')
        .property('checked', false);

    voronoiToggleDiv.append('label')
        .attr('for', 'voronoi-toggle')
        .text(' Show cluster regions / Voronoi');

    // Add back the cluster slider event listener - this computes new clusters for all data
    d3.select('#cluster-slider').on('input', function() {
        const k = parseInt(this.value);
        const selectedSource = d3.select('#source-filter').property('value');
        const showLines = d3.select('#line-toggle').property('checked');
        const showVoronoi = d3.select('#voronoi-toggle').property('checked');
        
        // Recompute clusters for new k value using ALL data
        const newClusterAssignments = kMeans(allReducedData, k, 100);
        const newCentroids = getCentroids(allReducedData, newClusterAssignments, k);
        
        d3.select('#cluster-value').text(k);
        d3.select('#graph svg').remove();
        
        // Store the new clustering for use in filtering
        currentClusterAssignments = newClusterAssignments;
        currentCentroids = newCentroids;
        
        // Update visualization with new clusters but respect current filter
        updateVisualization(allReducedData, sources, prompts, newClusterAssignments, 
            newCentroids, selectedSource, maturity);
            
        setTimeout(() => {
            d3.select('.lines-group').style('opacity', showLines ? 1 : 0);
            d3.selectAll('.voronoi-background path, .voronoi-borders path')
                .style('opacity', showVoronoi ? 1 : 0);
        }, 100);
    });

    // Update filter event listener to use current clustering
    d3.select('#source-filter').on('change', function() {
        const selectedSource = this.value;
        const showLines = d3.select('#line-toggle').property('checked');
        const showVoronoi = d3.select('#voronoi-toggle').property('checked');
        
        d3.select('#graph svg').remove();
        
        // Use the current clustering assignments and centroids
        updateVisualization(allReducedData, sources, prompts, currentClusterAssignments, 
            currentCentroids, selectedSource, maturity);
            
        setTimeout(() => {
            d3.select('.lines-group').style('opacity', showLines ? 1 : 0);
            d3.selectAll('.voronoi-background path, .voronoi-borders path')
                .style('opacity', showVoronoi ? 1 : 0);
        }, 100);
    });

    // Initialize current clustering variables
    let currentClusterAssignments = staticClusterAssignments;
    let currentCentroids = staticCentroids;

    // Initial visualization with k=5
    const initialSource = 'All';
    updateVisualization(allReducedData, sources, prompts, staticClusterAssignments, 
        staticCentroids, initialSource, maturity);

    // Add line toggle event listener
    lineToggleDiv.select('#line-toggle').on('change', function() {
        const isChecked = d3.select(this).property('checked');
        d3.selectAll('.lines-group')
            .style('opacity', isChecked ? 1 : 0)
            .style('pointer-events', isChecked ? 'all' : 'none');
    });

    // Add Voronoi toggle event listener
    voronoiToggleDiv.select('#voronoi-toggle').on('change', function() {
        const isChecked = d3.select(this).property('checked');
        d3.selectAll('.voronoi-background path, .voronoi-borders path')
            .style('opacity', isChecked ? 1 : 0)
            .style('pointer-events', isChecked ? 'all' : 'none');
    });
}

// Update visualization function to use static clusters
function updateVisualization(reducedData, sources, prompts, clusterAssignments, centroids, 
    selectedSource, maturity) {
    // Set up dimensions and margins first
    const margin = {top: 20, right: 250, bottom: 300, left: 100};
    const width = 1400 - margin.left - margin.right;
    const height = 1100 - margin.top - margin.bottom;

    // Create SVG container
    const svg = d3.select('#graph')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales using full dataset
    const xScale = d3.scaleLinear()
        .domain(d3.extent(reducedData.map(d => d[0])))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain(d3.extent(reducedData.map(d => d[1])))
        .range([height, 0]);

    // Get the current k from the cluster assignments
    const k = Math.max(...clusterAssignments) + 1;  // Get k from actual assignments
    
    const colorScale = d3.scaleOrdinal()
        .domain([...Array(k).keys()])
        .range(d3.schemeCategory10);

    // Add axes first
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale));

    svg.append('g')
        .call(d3.axisLeft(yScale));

    // Add tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Create Voronoi using the original centroids (not filtered)
    const delaunay = d3.Delaunay.from(
        centroids.slice(0, k).map(d => [xScale(d[0]), yScale(d[1])])
    );
    const voronoi = delaunay.voronoi([0, 0, width, height]);

    // Get toggle states with fallback values
    const showVoronoi = d3.select('#voronoi-toggle').empty() ? false : 
        d3.select('#voronoi-toggle').property('checked');
    const showLines = d3.select('#line-toggle').empty() ? false : 
        d3.select('#line-toggle').property('checked');

    // Use these values when setting initial opacity
    svg.append('g')
        .attr('class', 'voronoi-background')
        .selectAll('path')
        .data(centroids.slice(0, k))
        .enter()
        .append('path')
        .attr('d', (_, i) => voronoi.renderCell(i))
        .style('fill', (_, i) => colorScale(i))
        .style('fill-opacity', 0.1)
        .style('stroke', 'none')
        .style('opacity', showVoronoi ? 1 : 0);

    // Add Voronoi borders with original centroids
    svg.append('g')
        .attr('class', 'voronoi-borders')
        .selectAll('path')
        .data(centroids.slice(0, k))
        .enter()
        .append('path')
        .attr('d', (_, i) => voronoi.renderCell(i))
        .style('fill', 'none')
        .style('stroke', '#999')
        .style('stroke-width', 0.5)
        .style('stroke-opacity', 0.3)
        .style('opacity', showVoronoi ? 1 : 0);

    // Create points with visibility based on filter but keep original cluster assignments
    const points = reducedData.map((vector, index) => ({
        x: vector[0],
        y: vector[1],
        source: sources[index],
        prompt: prompts[index],
        maturity: maturity[index],
        cluster: clusterAssignments[index],
        visible: selectedSource === 'All' || sources[index] === selectedSource
    }));

    // Update point visualization to respect visibility
    svg.selectAll('circle')
        .data(points)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d.x))
        .attr('cy', d => yScale(d.y))
        .attr('r', 5)
        .style('fill', d => d.source === 'whitespace' ? 'none' : colorScale(d.cluster))
        .style('stroke', d => d.source === 'whitespace' ? colorScale(d.cluster) : 'none')
        .style('stroke-width', d => d.source === 'whitespace' ? 1 : 0)
        .style('opacity', d => d.visible ? 0.6 : 0)
        .style('pointer-events', d => d.visible ? 'all' : 'none')
        .on('mouseover', function(event, d) {
            // Point styling
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 8)
                .style('opacity', d.visible ? 1 : 0);
            
            // Tooltip display
            tooltip.transition()
                .duration(200)
                .style('opacity', 0.9);
                    
            tooltip.html(`
                <strong>Source:</strong> ${d.source}<br>
                <strong>Maturity:</strong> ${d.maturity}<br>
                <strong>Prompt:</strong> ${d.prompt}
            `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function(event, d) {
            // Reset point styling
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 5)
                .style('opacity', d.visible ? 0.6 : 0);

            // Hide tooltip
            tooltip.transition()
                .duration(500)
                .style('opacity', 0);   
        });

    // Get the actual centroids from the current clustering
    const currentCentroids = getCentroids(reducedData, clusterAssignments, k);

    // Use currentCentroids for the X marks
    svg.selectAll('.centroid')
        .data(currentCentroids)
        .enter()
        .append('path')
        .attr('class', 'centroid')
        .attr('d', d => {
            const x = xScale(d[0]);
            const y = yScale(d[1]);
            const size = 7;  // Size of the X
            return `M${x-size},${y-size} L${x+size},${y+size} M${x-size},${y+size} L${x+size},${y-size}`;
        })
        .style('stroke', 'black')
        .style('stroke-width', 2)
        .style('fill', 'none');

    // Create a group for the lines (move this before points)
    const linesGroup = svg.append('g')
        .attr('class', 'lines-group')
        .style('opacity', showLines ? 1 : 0)
        .style('pointer-events', showLines ? 'all' : 'none');

    // Add lines from points to centroids (only for visible points)
    linesGroup.selectAll('.centroid-line')
        .data(points.filter(d => d.visible))  // Only create lines for visible points
        .enter()
        .append('line')
        .attr('class', 'centroid-line')
        .attr('x1', d => xScale(d.x))
        .attr('y1', d => yScale(d.y))
        .attr('x2', d => xScale(currentCentroids[d.cluster][0]))
        .attr('y2', d => yScale(currentCentroids[d.cluster][1]))
        .style('stroke', d => colorScale(d.cluster))
        .style('stroke-width', 0.5)
        .style('stroke-opacity', 0.2);

    // After the centroids circles code, add centroid labels:
    svg.selectAll('.centroid-label')
        .data(currentCentroids)
        .enter()
        .append('text')
        .attr('class', 'centroid-label')
        .attr('x', d => xScale(d[0]))
        .attr('y', d => yScale(d[1]) - 10)
        .text((d, i) => `Cluster ${i + 1}`)
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', (d, i) => colorScale(i));

    // Update the legend to include whitespace points
    const legendData = [
        ...Array(k).keys(),  // Only include current number of clusters
        'whitespace',
        'centroid'
    ];

    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width + 20}, 20)`);

    // Add legend items for clusters and whitespace
    legend.selectAll('.legend-marker')
        .data(legendData)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 25})`)
        .each(function(d, i) {
            const g = d3.select(this);
            const clusterIndex = typeof d === 'number' ? d : 0;  // Use first cluster color for whitespace
            
            if (d === 'whitespace') {
                // Hollow circle for whitespace
                g.append('circle')
                    .attr('cx', 10)
                    .attr('cy', 0)
                    .attr('r', 5)
                    .style('fill', 'none')
                    .style('stroke', 'black')
                    .style('stroke-width', 1);
            } else if (d === 'centroid') {
                // X mark for centroids
                g.append('path')
                    .attr('d', 'M5,-5 L15,5 M5,5 L15,-5')
                    .style('stroke', 'black')
                    .style('stroke-width', 2);
            } else {
                // Filled circle for regular clusters
                g.append('circle')
                    .attr('cx', 10)
                    .attr('cy', 0)
                    .attr('r', 5)
                    .style('fill', colorScale(clusterIndex));
            }

            // Add labels with matching colors
            g.append('text')
                .attr('x', 25)
                .attr('y', 5)
                .text(d === 'whitespace' ? 'Whitespace Points' : 
                      d === 'centroid' ? 'Cluster Centers' : 
                      `Cluster ${d + 1}`)
                .style('font-size', '12px')
                .style('fill', d => {
                    if (d === 'whitespace' || d === 'centroid') return 'black';
                    return colorScale(d);
                });
        });
}

// Helper function to calculate cosine similarity between two vectors
function cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (normA * normB);
}

// Add these helper functions at the end of your file
function kMeans(data, k, maxIterations = 100) {
    // Initialize centroids randomly
    let centroids = initializeCentroids(data, k);
    let assignments = new Array(data.length).fill(0);
    let iterations = 0;
    let oldAssignments = null;

    while (iterations < maxIterations) {
        // Assign points to nearest centroid
        oldAssignments = [...assignments];
        assignments = assignToClusters(data, centroids);

        // Check for convergence
        if (arraysEqual(oldAssignments, assignments)) {
            break;
        }

        // Update centroids
        centroids = updateCentroids(data, assignments, k);
        iterations++;
    }

    return assignments;
}

function initializeCentroids(data, k) {
    const centroids = [];
    const numFeatures = data[0].length;
    
    // Find min and max values for each feature
    const mins = new Array(numFeatures).fill(Infinity);
    const maxs = new Array(numFeatures).fill(-Infinity);
    
    data.forEach(point => {
        for (let i = 0; i < numFeatures; i++) {
            mins[i] = Math.min(mins[i], point[i]);
            maxs[i] = Math.max(maxs[i], point[i]);
        }
    });

    // Initialize k random centroids
    for (let i = 0; i < k; i++) {
        const centroid = [];
        for (let j = 0; j < numFeatures; j++) {
            centroid.push(mins[j] + Math.random() * (maxs[j] - mins[j]));
        }
        centroids.push(centroid);
    }
    
    return centroids;
}

function assignToClusters(data, centroids) {
    return data.map(point => {
        let minDistance = Infinity;
        let clusterIndex = 0;
        
        centroids.forEach((centroid, index) => {
            const distance = euclideanDistance(point, centroid);
            if (distance < minDistance) {
                minDistance = distance;
                clusterIndex = index;
            }
        });
        
        return clusterIndex;
    });
}

function updateCentroids(data, assignments, k) {
    const centroids = [];
    const counts = new Array(k).fill(0);
    const sums = Array(k).fill().map(() => new Array(data[0].length).fill(0));
    
    // Sum up all points in each cluster
    data.forEach((point, i) => {
        const cluster = assignments[i];
        counts[cluster]++;
        point.forEach((value, j) => {
            sums[cluster][j] += value;
        });
    });
    
    // Calculate average for each cluster
    for (let i = 0; i < k; i++) {
        centroids[i] = sums[i].map(sum => sum / (counts[i] || 1));
    }
    
    return centroids;
}

function euclideanDistance(a, b) {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

function arraysEqual(a, b) {
    return a.every((val, index) => val === b[index]);
}

// Add this helper function to calculate centroids
function getCentroids(data, assignments, k) {
    const centroids = Array(k).fill().map(() => Array(data[0].length).fill(0));
    const counts = Array(k).fill(0);
    
    // Sum up all points in each cluster
    data.forEach((point, i) => {
        const cluster = assignments[i];
        counts[cluster]++;
        point.forEach((val, j) => {
            centroids[cluster][j] += val;
        });
    });
    
    // Calculate average for each cluster
    centroids.forEach((centroid, i) => {
        centroid.forEach((sum, j) => {
            centroids[i][j] = sum / (counts[i] || 1);
        });
    });
    
    return centroids;
}