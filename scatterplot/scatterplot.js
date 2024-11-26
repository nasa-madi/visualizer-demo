// Load the embeddings from output.json

document.addEventListener("DOMContentLoaded", function() {
    var currentPath = window.location.pathname;
    console.log("Current Path:", currentPath);
    if (currentPath.endsWith("/")){
        currentPath = currentPath.slice(0, -1);
    }
    buildVisualization(currentPath+"/output.json");
});

function buildVisualization(pathData) {
    fetch(pathData)
        .then(response => response.json())
        .then(embeddings => {
            // Add slider HTML element
            const controls = d3.select('#graph')
                .insert('div', 'svg')
                .attr('class', 'controls');
            
            controls.append('label')
                .text('Number of clusters: ');
            
            controls.append('input')
                .attr('type', 'range')
                .attr('min', '2')
                .attr('max', '10')
                .attr('value', '5')
                .attr('id', 'cluster-slider');
                
            controls.append('span')
                .attr('id', 'cluster-value')
                .text('5');
            // Extract the embedding vectors from the loaded data
            const embeddingVectors = embeddings.map(item => item.embedding);
            const maturityLevels = embeddings.map(item => item.source);
            const prompts = embeddings.map(item => item.prompt);
            const sources = embeddings.map(item => item.source);
            const labels = embeddings.map(item => `<span class="maturity">${item.maturityLevels}</span> <span class="source">${item.source}</span><br>${item.prompt}`);

            
            // Perform PCA dimensionality reduction to 2 dimensions
            const pca = new druid.PCA(embeddingVectors,{d: 2, seed: 42});
            const reducedData = pca.transform();
            
            // Initial visualization
            updateVisualization(reducedData, sources, prompts, 5);

            // Add event listener for slider
            d3.select('#cluster-slider').on('input', function() {
                const k = parseInt(this.value);
                d3.select('#cluster-value').text(k);
                // Clear previous visualization
                d3.select('#graph svg').remove();
                updateVisualization(reducedData, sources, prompts, k);
            });
        });
    }
// Add this new function to handle visualization updates
function updateVisualization(reducedData, sources, prompts, k) {
        // Perform k-means clustering with new k value
         const clusterAssignments = kMeans(reducedData, k, 100);

         // Perform dimensionality reduction (using first two dimensions for simplicity)
         const points = reducedData.map((vector, index) => ({
            x: vector[0],
            y: vector[1],
            source: sources[index],
            prompt: prompts[index],
            cluster: clusterAssignments[index]
        }));

         // Set up dimensions and margins
        const margin = {top: 20, right: 180, bottom: 30, left: 50};
        const width = 1200 - margin.left - margin.right;
        const height = 600 - margin.top - margin.bottom;


        // Create SVG container
        const svg = d3.select('#graph')
                .append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

           // Create color scale for clusters
        const colorScale = d3.scaleOrdinal()
            .domain([...Array(k).keys()])  // [0, 1, 2, ..., k-1]
            .range(d3.schemeCategory10);   // Use D3's category10 color scheme

        // Create scales for x and y axes
        const xScale = d3.scaleLinear()
            .domain(d3.extent(points, d => d.x))
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain(d3.extent(points, d => d.y))
            .range([height, 0]);

          // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        svg.append('g')
            .call(d3.axisLeft(yScale));
        
        // Fix the label creation and handling
        const tooltip = svg.append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);
            
            // Show label on mouseover
        function showLabel(event, d) {
            labels.filter((_, i) => reducedData[i] === d)
                .style('visibility', 'visible');
            d3.select(this)
                .style('stroke', 'hotpink')
                .style('stroke-width', '2px');
        }

        // Hide label on mouseout
        function hideLabel(event, d) {
            labels.filter((_, i) => reducedData[i] === d)
                .style('visibility', 'hidden');
            }
        
            // Add points
            svg.selectAll('circle')
                .data(points)
                .enter()
                .append('circle')
                .attr('cx', d => xScale(d.x))
                .attr('cy', d => yScale(d.y))
                .attr('r', 5)
                .style('fill', d => colorScale(d.cluster))
                //.style('fill', d => colorScale(d.source)) // old color scale based on source
                .style('opacity', 0.7)
                // Add tooltip on hover
                .on('mouseover', function(event, d) {
                    d3.select(this)
                        .style('fill', 'red')
                        .attr('r', 8);
                    
                    // Show the corresponding label
                    d3.select(`.label-${points.indexOf(d)}`)
                        .style('visibility', 'visible')
                        .attr('x', xScale(d.x) + 10)
                        .attr('y', yScale(d.y) - 10);
                })
                .on('mouseout', function(event , d) {
                   // Reset point style
                   d3.select(this)
                   .style('fill', d => colorScale(d.cluster))
                   .attr('r', 5);
               
                    // Hide the label
                    d3.select(`.label-${points.indexOf(d)}`)
                        .style('visibility', 'hidden');
                });
            // Add legend
            const legendSpacing = 25;
            const legend = svg.append('g')
                .attr('class', 'legend')
                .attr('transform', `translate(${width + 20}, 20)`);

             // Add cluster legend items
            legend.selectAll('circle')
                .data([...Array(k).keys()])
                .enter()
                .append('circle')
                .attr('cx', 10)
                .attr('cy', (d, i) => i * legendSpacing)
                .attr('r', 5)
                .style('fill', d => colorScale(d));

            legend.selectAll('text')
                .data([...Array(k).keys()])
                .enter()
                .append('text')
                .attr('x', 25)
                .attr('y', (d, i) => i * legendSpacing + 5)
                .text(d => `Cluster ${d + 1}`)
                .style('font-size', '12px');

            // Add labels to the nodes
             const label = svg.append('g')
                       .attr('class', 'labels') // Add class to the <g> element for styling
                       .selectAll('foreignObject')
                       .data(points)
                       .enter()
                       .append('foreignObject')
                       .attr('class', (d, i) => `node-label label-${i}`) // Add class to the <foreignObject> element
                       .attr('width', 200)
                       .attr('height', 100)
                       .style('visibility', 'hidden')
                       .style('pointer-events', 'none') // Prevent labels from interfering with mouse events
                       .attr('x', d => xScale(d.x) + 10)
                       .attr('y', d => yScale(d.y) - 10)
                       .append('xhtml:div')
                       .attr('class', 'label-content')
                       .html(d => `
                        <div class="label-box">
                            <span class="source">${d.source}</span>
                            <br/>
                            ${d.prompt}
                        </div>
                    `);
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