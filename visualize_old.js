// Load the embeddings from output.json
fetch('./output.json')
  .then(response => response.json())
  .then(embeddings => {
    // Extract the embedding vectors from the loaded data
    const embeddingVectors = embeddings.map(item => item.embedding);
    const maturityLevels = embeddings.map(item => item.maturity);
    const prompts = embeddings.map(item => item.prompt);

    // Create a new instance of tSNE
    const tSNE = new TSNE({
      dim: 2,
      perplexity: 35,
      earlyExaggeration: 1,
      learningRate: 200,
      nIter: 2000,
      metric: 'cosine'
    });

    // Initialize the embedding vectors
    tSNE.init({
      data: embeddingVectors
    });

    // Run the tSNE optimization
    tSNE.run();

    // Get the resulting 2D embeddings
    const embeddings2D = tSNE.getOutput();

    // Extract the x and y coordinates from the 2D embeddings
    const x = embeddings2D.map(embedding => embedding[0]);
    const y = embeddings2D.map(embedding => embedding[1]);

    // Define a color scale based on maturity levels
    const colorScale = {
      'Low': 'blue',
      'Medium': 'green',
      'High': 'orange',
      'Super High': 'red'
    };

    // Map maturity levels to colors
    const colors = maturityLevels.map(maturity => colorScale[maturity]);

    // Create labels combining maturity levels and prompts
    const labels = maturityLevels.map((maturity, index) => {
      const promptWords = prompts[index].split(' ');
      const wrappedPrompt = promptWords.reduce((result, word, i) => {
        if (i > 0 && result.split('<br>').pop().length + word.length > 30) {
          return result + '<br>' + word;
        } else {
          return result + (i > 0 ? ' ' : '') + word;
        }
      }, '');
      return `${maturity}:<br>${wrappedPrompt}`;
    });

    // Calculate the similarity between embeddings
    const similarity = [];
    for (let i = 0; i < embeddingVectors.length; i++) {
      for (let j = i + 1; j < embeddingVectors.length; j++) {
        const dist = cosineSimilarity(embeddingVectors[i], embeddingVectors[j]);
        similarity.push({
          i: i,
          j: j,
          dist: dist
        });
      }
    }

    // Sort the similarity array in descending order
    similarity.sort((a, b) => b.dist - a.dist);

    // Create line traces for pairs of nodes with high similarity
    const lineTraces = [];
    const threshold = 0.91; // Adjust the threshold as needed
    for (let k = 0; k < similarity.length; k++) {
      if (similarity[k].dist >= threshold) {
        const i = similarity[k].i;
        const j = similarity[k].j;
        lineTraces.push({
          x: [x[i], x[j]],
          y: [y[i], y[j]],
          mode: 'lines',
          line: {
            color: 'gray',
            width: 1
          },
          hoverinfo: 'none'
        });
      }
    }

    // Create a scatter plot using Plotly
    const trace = {
      x: x,
      y: y,
      mode: 'markers',
      type: 'scatter',
      marker: {
        size: 15,
        opacity: 0.6,
        color: colors
      },
      text: labels,
      hoverinfo: 'text'
    };

    const layout = {
      title: 't-SNE Visualization of Embeddings',
      xaxis: { title: 'Dimension 1' },
      yaxis: { title: 'Dimension 2' },
      width: 1200,
      height: 800,
      aspectratio: {
        x: 1,
        y: 1,
        z: 1
      }
    };

    Plotly.newPlot('plot', [trace, ...lineTraces], layout);
  });

// Helper function to calculate cosine similarity between two vectors
function cosineSimilarity(a, b) {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (normA * normB);
}