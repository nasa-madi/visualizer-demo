// Load the embeddings from output.json

document.addEventListener("DOMContentLoaded", function() {
    var currentPath = window.location.pathname;
    console.log("Current Path:", currentPath);
    if (currentPath.endsWith("/")){
        currentPath = currentPath.slice(0, -1);
    }
    buildVisualization(currentPath+"/output.json");
});

function buildVisualization(pathData){
    fetch(pathData)
        .then(response => response.json())
        .then(embeddings => {
            // Extract the embedding vectors from the loaded data
            const embeddingVectors = embeddings.map(item => item.embedding);
            const maturityLevels = embeddings.map(item => item.source);
            const prompts = embeddings.map(item => item.prompt);
            const sources = embeddings.map(item => item.source);

            const nodeShapes = [
                // d3.symbolDiamond,
                d3.symbolCircle,
                // d3.symbolSquare,
                // d3.symbolTriangle,
                // d3.symbolStar,
                // d3.symbolCross,
                // d3.symbolWye,
            ];
            // Create an object to map sources to node shapes
            const sourceShapeMap = {};
            const uniqueSources = [...new Set(sources)];
            uniqueSources.forEach((source, index) => {
                sourceShapeMap[source] = nodeShapes[index % nodeShapes.length];
            });


            // Define a color scale based on maturity levels
            const colorScale = {
                'CAS': '#AA3377',
                'CAS ': '#AA3377',
                'TTT': '#66CCEE',
                'UI': '#CCBB44',
                'UI ': '#CCBB44',
                'nan' : '#90c4a2',
                'CAS Discovery  Health and Wellness': '#2c7fb8',
                'CAS Wicked Wild': '#253494', 
                'CAS X1': '#00008B', 
                'CAS Discovery  Powering Sustainable Airports': '#337939',
                'UI Blue Skies Competition 2022 - "Airports of Tomorrow"': '#7750b5',
                'UI Blue Skies Competition 2023 - "Clean Aviation Energy"':'#a3a9d8',
                'CAS Execution':'#38b483', 
                'Low': '#AA3377'
            };
            const sourceList = {
                'CAS': '#AA3377',
                'CAS ': '#AA3377',
                'TTT': '#66CCEE',
                'UI': '#CCBB44',
                'UI ': '#CCBB44',
                'CAS Discovery  Health and Wellness': '#2c7fb8',
                'CAS Wicked Wild': '#253494',
                'CAS X1': '#00008B',
                'CAS Discovery  Powering Sustainable Airports': '#337939',
                'UI Blue Skies Competition 2022 - "Airports of Tomorrow"': '#7750b5',
                'UI Blue Skies Competition 2023 - "Clean Aviation Energy"':'#a3a9d8',
                'CAS Execution':'#38b483',
                'Low': '#AA3377',
            };

            // Map maturity levels to colors
            const colors = maturityLevels.map(maturity => colorScale[maturity]);
            const shapes = sources.map(source => sourceShapeMap[source]);
            const labels = embeddings.map(item => `<span class="maturity">${item.maturity}</span> <span class="source">${item.source}</span><br>${item.prompt}`);

            // Calculate the similarity between embeddings
            const similarity = [];
            for (let i = 0; i < embeddingVectors.length; i++) {
                for (let j = i + 1; j < embeddingVectors.length; j++) {
                    const dist = cosineSimilarity(embeddingVectors[i], embeddingVectors[j]);
                    similarity.push({
                        source: i,
                        target: j,
                        dist: dist
                    });
                }
            }

            // Create nodes for the force-directed graph
            const nodes = embeddingVectors.map((_, index) => ({
                id: index,
                color: colors[index],
                label: labels[index]
            }));

            const links = [];
            const threshold = 0.895; // Adjust the threshold value as needed

            // Iterate over each node
            for (let i = 0; i < nodes.length; i++) {
                const nodeLinks = similarity
                    .filter(link => (link.source === i || link.target === i) && link.dist >= threshold)
                    .map(link => ({
                        source: link.source,
                        target: link.target,
                        dist: link.dist
                    }));

                // If no connections above the threshold, connect to the closest node
                if (nodeLinks.length === 0) {
                    const closestLink = similarity
                        .filter(link => link.source === i || link.target === i)
                        .sort((a, b) => b.dist - a.dist)[0];

                    if (closestLink) {
                        nodeLinks.push({
                            source: closestLink.source,
                            target: closestLink.target,
                            dist: closestLink.dist
                        });
                    }
                }

                links.push(...nodeLinks);
            }
            // Select the existing slider element by its ID
            const slider = d3.select('#threshold-slider')
                .attr('min', 0.83)    // Assuming you want to change min to 80
                .attr('max', 0.93)   // Assuming you want to change max to 100
                .attr('step', 0.001)  // Assuming you want to change step to 0.5
                .attr('value', threshold) // Assuming 'threshold' is a pre-defined variable
                .on('input', function () {
                    const newThreshold = +this.value;
                    updateLinks(newThreshold);
                });

            function updateLinks(newThreshold) {
                // Filter links based on the new threshold
                const filteredLinks = similarity.filter(link => link.dist >= newThreshold);

                // Bind the filteredLinks data to the link elements
                const linkSelection = d3.select('.links-container') // Make sure to select the correct container for the links
                    .selectAll('line')
                    .data(filteredLinks, d => d.source.id + "-" + d.target.id); // Use a key function for object constancy

                // Enter + update
                linkSelection.enter()
                    .append('line')
                    .merge(linkSelection)
                    .attr('stroke-width', 1);

                // Exit
                linkSelection.exit().remove();

                // Update the simulation with new links
                simulation.force("link")
                    .links(filteredLinks)
                    // .distance(link => 100 * (1 - link.dist)) // Adjust distance based on similarity
                    // .strength(0.2); // Set strength to a higher value for more aggressive attraction

                // Restart the simulation with increased alpha for more movement
                simulation.alpha(1).restart();
            }


            // Create the SVG element
            const svg = d3.select('#graph')
                .append('svg')
                .attr('width', `100%`)
                .attr('height', `100%`);

            // Set up the dimensions for the SVG
            const width = svg.node().getBoundingClientRect().width;
            const height = svg.node().getBoundingClientRect().height;



            const simulation = d3.forceSimulation(nodes)
                .force("link", d3.forceLink(links).id(d => d.id))
                .force("charge", d3.forceManyBody().strength(-100))
                .force("x", d3.forceX())
                .force("y", d3.forceY())
                .force('center', d3.forceCenter(width / 2, height / 2).strength(0.7))



            const zoom = d3.zoom()
                .scaleExtent([0.5, 5]) // Set the minimum and maximum zoom levels
                .on('zoom', zoomed);

            svg.call(zoom)

            function zoomed(event) {
                svg.selectAll('g')
                    .attr('transform', event.transform);
            }

            // Create the links
            const link = svg.append('g')
                .selectAll('line')
                .data(links)
                .enter()
                .append('line')
                .attr('stroke-width', 1);

            const nodeGroup = svg.append("g")
                .attr("class", "nodes"); // Add a class for easier selection if needed

            // Create nodes
            const node = nodeGroup
                .selectAll("path")
                .data(nodes)
                .enter()
                .append("path")
                .attr('d', (d, i) => {
                    return d3.symbol().type(shapes[i]).size(200)(); // Adjust the size as needed
                })
                .attr('fill', d => d.color)
                .on('mouseover', showLabel)
                .on('mouseout', hideLabel)
                .call(drag(simulation));


            // Add labels to the nodes
            const label = svg.append('g')
                .attr('class', 'labels') // Add class to the <g> element for styling
                .selectAll('foreignObject')
                .data(nodes)
                .enter()
                .append('foreignObject')
                .attr('class', 'node-label') // Add class to the <foreignObject> element
                .style('visibility', 'hidden')
                .style('pointer-events', 'none') // Prevent labels from interfering with mouse events
                .html(d => `<div xmlns="http://www.w3.org/1999/xhtml" class="label-content">${d.label}</div>`)
                .each(function (d, i) {
                    const labelElement = this.querySelector('.label-content');
                    if (labelElement) {
                        const { width, height } = labelElement.getBoundingClientRect();
                        const nodeElement = node.nodes()[i];
                        const nodeBBox = nodeElement.getBBox();
                        d3.select(this)
                            .attr('width', 200)
                            .attr('height', '100%')
                        // .attr('x', -100)
                        // .attr('y', 0);
                    }
                });


            // Show label on mouseover
            function showLabel(event, d) {
                label.filter(node => node.id === d.id)
                    .style('visibility', 'visible')
                d3.select(this)
                    .style('stroke', 'hotpink')
                    .style('stroke-width', '3px');
            }

            // Hide label on mouseout
            function hideLabel(event, d) {
                label.filter(node => node.id === d.id)
                    .style('visibility', 'hidden');
                d3.select(this)
                    .style('stroke', null)
                    .style('stroke-width', null);

            }

            // Update the positions of nodes and links on each tick of the simulation
            simulation.on('tick', () => {
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);

                node.attr("transform", d => `translate(${d.x},${d.y})`);

                label
                    .attr('x', d => d.x + 10)
                    .attr('y', d => d.y + 10)
            });

            // Drag behavior for nodes
            function drag(simulation) {
                function dragstarted(event, d) {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                }

                function dragged(event, d) {
                    d.fx = event.x;
                    d.fy = event.y;
                
                    // Move linked nodes
                    simulation.force("link").links().forEach(function(link) {
                    if (link.source === d) {
                        link.target.fx = link.target.x + (event.x - d.x);
                        link.target.fy = link.target.y + (event.y - d.y);
                    } else if (link.target === d) {
                        link.source.fx = link.source.x + (event.x - d.x);
                        link.source.fy = link.source.y + (event.y - d.y);
                    }
                    });
                }

                function dragended(event, d) {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                
                    // Release linked nodes
                    simulation.force("link").links().forEach(function(link) {
                    if (link.source === d || link.target === d) {
                        link.source.fx = null;
                        link.source.fy = null;
                        link.target.fx = null;
                        link.target.fy = null;
                    }
                    });
                }

                return d3.drag()
                    .on('start', dragstarted)
                    .on('drag', dragged)
                    .on('end', dragended);
            }
        });
}
// Helper function to calculate cosine similarity between two vectors
function cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (normA * normB);
}