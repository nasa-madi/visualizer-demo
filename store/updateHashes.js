import fs from 'fs';
import { generateHash } from './generateHash.js';

// Function to add hashes to the output.json file
function addHashesToOutputJson() {
    fs.readFile('./output.json', (err, jsonData) => {
      if (err) {
        console.error('Error reading JSON file:', err);
        return;
      }
  
      const outputData = JSON.parse(jsonData);
      let updated = false;
  
      // Add a hash to each entry that doesn't have one, using the specified fields
      outputData.forEach(entry => {
          entry.hash = generateHash(entry);
          updated = true;
      });
  
      // Write the updates back to output.json if there were any changes
      if (updated) {
        fs.writeFile('./output.json', JSON.stringify(outputData, null, 2), (err) => {
          if (err) {
            console.error('Error writing JSON file:', err);
          } else {
            console.log('output.json has been updated with hashes.');
          }
        });
      } else {
        console.log('No updates were necessary; all entries already have hashes.');
      }
    });
  }

addHashesToOutputJson();