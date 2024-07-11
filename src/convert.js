// Prompt,Source,Maturity,Description,Transcript
// How might we leverage AI to enhance personalized learning experiences?,Wicked Wild,Super High,"Artificial Intelligence has the potential to revolutionize education by providing personalized learning experiences tailored to each student's unique needs, abilities, and learning styles. By analyzing data on student performance, engagement, and preferences, AI algorithms could dynamically adapt the content, pace, and delivery of educational materials to optimize learning outcomes. This could involve recommending specific resources, adjusting the difficulty level of assignments, or providing targeted feedback and support. Personalized AI-driven learning could help students stay motivated, address their weaknesses, and excel in their strengths, ultimately leading to improved academic performance and a more fulfilling educational journey.",


import fs from 'fs';
import crypto from 'crypto';
import csv from 'csv-parser';
import { generateHash } from './generateHash.js';


// Function to process CSV data and update output.json
export const convert = (pathCsvData, outputJsonPath)=>{
  const csvData = [];


  // Check if output.json exists, if not create it
  if (!fs.existsSync(outputJsonPath)) {
    fs.writeFileSync(outputJsonPath, JSON.stringify([], null, 2));
    console.log(`${outputJsonPath} has been created.`);
  }
  

  fs.createReadStream(pathCsvData)
    .pipe(csv())
    .on('data', (row) => {
      csvData.push({
        prompt: row['Prompt'],
        source: row['Source'],
        maturity: row['Maturity'],
        description: row['Description'],
        transcript: row['Transcript']
      });
    })
    .on('end', () => {
      fs.readFile(outputJsonPath, (err, jsonData) => {
        if (err) throw err;

        const outputData = JSON.parse(jsonData);
        const outputDataHashes = new Set(outputData.map(item => item.hash));

        // Add new entries from CSV to JSON
        csvData.forEach(csvEntry => {
          const hash = generateHash(csvEntry);
          if (!outputDataHashes.has(hash)) {
            outputData.push({
              ...csvEntry,
              hash: hash
            });
          }
        });

        // Remove orphan entries from output.json
        const csvDataHashes = new Set(csvData.map(generateHash));
        const updatedOutputData = outputData.filter(entry => csvDataHashes.has(entry.hash));

        // Save the updated JSON
        fs.writeFile(outputJsonPath, JSON.stringify(updatedOutputData, null, 2), (err) => {
          if (err) throw err;
          console.log('output.json has been updated.');
        });
      });
    });
}