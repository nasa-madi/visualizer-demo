// Load the embeddings from output.json
fetch('./output.json')
    .then(response => response.json())
    .then(embeddings => {
        // Extract the embedding vectors from the loaded data
        const embeddingVectors = embeddings.map(item => item.embedding);
        const maturityLevels = embeddings.map(item => item.maturity);
        const prompts = embeddings.map(item => item.prompt);
        const sources = embeddings.map(item => item.source);

        const nodeShapes = [
            d3.symbolDiamond,
            d3.symbolCircle,
            d3.symbolSquare,
            d3.symbolStar,
            d3.symbolCross,
            d3.symbolTriangle,
            d3.symbolWye,
            d3.symbolX
        ];
        // Create an object to map sources to node shapes
        const sourceShapeMap = {};
        const uniqueSources = [...new Set(sources)];
        uniqueSources.forEach((source, index) => {
            sourceShapeMap[source] = nodeShapes[index % nodeShapes.length];
        });


        // Define a color scale based on maturity levels
        const colorScale = {
            'Low': '#90c4a2',
            'Medium': '#41b6c4',
            'High': '#2c7fb8',
            'Super High': '#253494'
        };
        const sourceList = {
            'Low': '#90c4a2',
            'Medium': '#41b6c4',
            'High': '#2c7fb8',
            'Super High': '#253494'
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
        const threshold = 0.89; // Adjust the threshold value as needed

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
            .force("charge", d3.forceManyBody().strength(-150))
            .force("x", d3.forceX())
            .force("y", d3.forceY())
            .force('center', d3.forceCenter(width / 2, height / 2).strength(0.7))


        // Bounding box constraint
        function boundingBox() {
            const padding = 10; // Adjust the padding as needed
            const minX = padding;
            const minY = padding;
            const maxX = width-padding;
            const maxY = height-padding;
     
            return () => {
                for (const node of nodes) {
                    node.x = Math.max(minX, Math.min(maxX, node.x));
                    node.y = Math.max(minY, Math.min(maxY, node.y));
                }
            };
        }
        const zoom = d3.zoom()
            .scaleExtent([0.3, 3]) // Set the minimum and maximum zoom levels
            .on('zoom', zoomed);

        svg.call(zoom);

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

        // Create nodes
        const node = svg.append("g")
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
        .selectAll('foreignObject')
        .data(nodes)
        .enter()
        .append('foreignObject')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('class', 'node-label') // Add class to the <foreignObject> element
        .style('visibility', 'hidden')
        .style('pointer-events', 'none') // Prevent labels from interfering with mouse events
        .append('xhtml:div')
        .attr('class', 'label-content') // Add class to the <div> element
        .html(d => d.label);
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

            // node
            //     .attr('cx', d => d.x)
            //     .attr('cy', d => d.y);

             node.attr("transform", d => `translate(${d.x},${d.y})`);


            label
                // .attr('x', d => d.x + 10) // Adjust the x position of the label relative to the node
                // .attr('y', d => d.y + 10); // Adjust the y position of the label relative to the node
                .style('top',d=> `${d.y+10}px`)
                .style('left',d=> `${d.x+10}px`)
        });

        // Drag behavior for nodes
        function drag(simulation) {
            function dragstarted(event) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            }

            function dragged(event) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            }

            function dragended(event) {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            }

            return d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended);
        }
    });

// Helper function to calculate cosine similarity between two vectors
function cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (normA * normB);
}