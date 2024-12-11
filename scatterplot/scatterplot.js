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
            // Create a container for all controls
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
             // Initial visualization - add 'All' as the default selectedSource
             const initialK = 5;
             const initialSource = 'All';
             updateVisualization(reducedData, sources, prompts, initialK, initialSource);

            // Add event listener for slider
            d3.select('#cluster-slider').on('input', function() {
                const k = parseInt(this.value);
                const selectedSource = d3.select('#source-filter').property('value');
                const showLines = d3.select('#line-toggle').property('checked');
                d3.select('#cluster-value').text(k);
                d3.select('#graph svg').remove();
                updateVisualization(reducedData, sources, prompts, k, selectedSource);
                d3.select('.lines-group').style('opacity', showLines ? 1 : 0);
            });
             // Filter event listener
             d3.select('#source-filter').on('change', function() {
                const k = parseInt(d3.select('#cluster-slider').property('value'));
                const selectedSource = this.value;
                const showLines = d3.select('#line-toggle').property('checked');
                d3.select('#graph svg').remove();
                updateVisualization(reducedData, sources, prompts, k, selectedSource);
                d3.select('.lines-group').style('opacity', showLines ? 1 : 0);
            });

            // Add line toggle control
            const lineToggleDiv = controls.append('div')
                .attr('class', 'line-control')
                .style('margin-top', '10px');

            lineToggleDiv.append('input')
                .attr('type', 'checkbox')
                .attr('id', 'line-toggle');

            lineToggleDiv.append('label')
                .attr('for', 'line-toggle')
                .text(' Show lines to centroids');

            lineToggleDiv.select('#line-toggle').on('change', function() {
                const isChecked = d3.select(this).property('checked');
                d3.select('.lines-group')
                    .transition()
                    .duration(300)
                    .style('opacity', isChecked ? 1 : 0);
            });
        });
    }
// Add this new function to handle visualization updates
function updateVisualization(reducedData, sources, prompts, k, selectedSource) {
    // Filter the data based on selected source
    const filteredIndices = selectedSource === 'All' 
        ? [...Array(sources.length).keys()]
        : sources.map((s, i) => s === selectedSource ? i : -1).filter(i => i !== -1);
    
    const filteredData = filteredIndices.map(i => reducedData[i]);
    const filteredSources = filteredIndices.map(i => sources[i]);
    const filteredPrompts = filteredIndices.map(i => prompts[i]);
        // Perform k-means clustering with new k value
         const clusterAssignments = kMeans(filteredData, k, 100);

         // Get the centroids from k-means
         const centroids = getCentroids(filteredData, clusterAssignments, k);

         // Perform dimensionality reduction (using first two dimensions for simplicity)
         const points = filteredData.map((vector, index) => ({
            x: vector[0],
            y: vector[1],
            source: filteredSources[index],
            prompt: filteredPrompts[index],
            cluster: clusterAssignments[index]
        }));

         // Set up dimensions and margins
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
        

        const tooltip = d3.select("body").append("div")
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
        
        svg.selectAll('circle')
            .data(points)
            .enter()
            .append('circle')
            .attr('cx', d => xScale(d.x))
            .attr('cy', d => yScale(d.y))
            .attr('r', 5)
            .style('fill', d => colorScale(d.cluster))
            .style('opacity', 0.6)
            .on('mouseover', function(event, d) {
                // Point styling
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 8)
                    .style('opacity', 1);
                
                // Tooltip display
                tooltip.transition()
                    .duration(200)
                    .style('opacity', 0.9);
                    
                tooltip.html(`Prompt: ${d.prompt}`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function(event, d) {
                // Reset point styling
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 5)
                    .style('opacity', 0.6)
                    .style('fill', d => colorScale(d.cluster));
        
                // Hide tooltip
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);   
    });


// tooltip.html(`Prompt: ${d.prompt}`);
//                 })
//                 .on('mouseout', function(event , d) {
//                    // Reset point style
//                    d3.select(this)
//                    .style('fill', d => colorScale(d.cluster))
//                    .attr('r', 5);
               
//                     // Hide the label
//                     d3.select(`.label-${points.indexOf(d)}`)
//                         .style('visibility', 'hidden');
//                 });
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

    // After creating the circles for data points, add the centroids
    svg.selectAll('.centroid')
        .data(centroids)
        .enter()
        .append('circle')
        .attr('class', 'centroid')
        .attr('cx', d => xScale(d[0]))
        .attr('cy', d => yScale(d[1]))
        .attr('r', 7)
        .style('fill', 'none')
        .style('stroke', (d, i) => colorScale(i))
        .style('stroke-width', 2);

    // Create a group for the lines (add this before the points)
    const linesGroup = svg.append('g')
        .attr('class', 'lines-group')
        .style('opacity', 0); // Hidden by default

    // Add lines from points to centroids
    linesGroup.selectAll('.centroid-line')
        .data(points)
        .enter()
        .append('line')
        .attr('class', 'centroid-line')
        .attr('x1', d => xScale(d.x))
        .attr('y1', d => yScale(d.y))
        .attr('x2', d => xScale(centroids[d.cluster][0]))
        .attr('y2', d => yScale(centroids[d.cluster][1]))
        .style('stroke', d => colorScale(d.cluster))
        .style('stroke-width', 0.5)
        .style('stroke-opacity', 0.2);
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