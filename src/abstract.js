import fs from 'fs';
import OpenAI from 'openai';
import pMap from 'p-map';
import TSNE from 'tsne-js';



export const abstract = async (path)=>{

  // Read the JSON file
  const jsonData = fs.readFileSync(path, 'utf8');
  const data = JSON.parse(jsonData);

  // OpenAI API configuration
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  // Throttle the number of concurrent requests to 10
  const concurrency = 5;

  // data = data.slice(0, 50);
  // console.log(data);

  // Iterate through each element in the array with throttling
  const updatedData = await pMap(
    data,
    async (element) => {
      const { prompt, source, maturity, description, transcript } = element;
      if (!element.embedding) {
        try {
          // Combine all the fields into a single string
          const combinedContent = `Prompt: ${prompt}\nDescription: ${description}\nTranscript: ${transcript}`;

          // Make a request to the OpenAI API to create embeddings
          const response = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: combinedContent.slice(0,8000)
          });

          // Extract the generated embeddings from the API response
          const embedding = response.data[0].embedding;

          // Add the embedding to the element
          element.embedding = embedding;

          // Print the metadata
          console.log('\n\n\n---\nPrompt:', element.prompt);
          console.log('Source:', element.source);
          console.log('---');

          // Write the updated data back to the JSON file
          fs.writeFileSync(path, JSON.stringify(data, null, 2));

          return element;
        } catch (error) {
          console.error('Error:', error.message);
          return element;
        }
      } else {
        return element;
      }
    },
    { concurrency }
  );

  console.log(`... completed ${data.length} embeddings`);

  // Create a new t-SNE instance
  const tsne = new TSNE({
    dim: 2, // Specify the desired output dimensionality (2D in this case)
    perplexity: 30, // Adjust the perplexity parameter as needed
    earlyExaggeration: 4, // Adjust the early exaggeration parameter as needed
    learningRate: 100, // Adjust the learning rate parameter as needed
    nIter: 1000, // Specify the number of iterations
    metric: 'euclidean' // Specify the distance metric to use
  });

  // Extract the embeddings from the updatedData
  const embeddings = updatedData.map(element => element.embedding);

  // Run the t-SNE algorithm on the embeddings
  tsne.init({
    data: embeddings,
    type: 'dense'
  })

  // Retrieve the 2D vectors
  const output = tsne.getOutputScaled();

  // Add the 2D vectors to the updatedData
  updatedData.forEach((element, index) => {
    element.vector2d = output[index];
  });

  // Write the final updated data back to the JSON file
  fs.writeFileSync(path, JSON.stringify(updatedData, null, 2));

  console.log('Added 2D vectors to the JSON file.');
}