import fetch from 'node-fetch';
import fs from 'fs';
import { json2csv } from 'json-2-csv';
// const PublicGoogleSheetsParser = require('public-google-sheets-parser')
import PublicGoogleSheetsParser from 'public-google-sheets-parser';


export const fetchSheet = async (spreadsheetId, sheetName, csvFilePath)=>{
    try {
        const options = { sheetName, useFormat: true }
        const parser = new PublicGoogleSheetsParser(spreadsheetId, options)
        let data = await parser.parse()
        
        
        // Escape newline characters in each field
        const escapedData = data.map(row => {
            const escapedRow = {};
            for (const key in row) {
            if (row.hasOwnProperty(key)) {
                escapedRow[key] = String(row[key])
                .replace(/[^a-zA-Z0-9 .,!?'"()\-]/g, ' ')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
            }
            }
            return escapedRow;
        });


        fs.writeFileSync('test-parser.json', JSON.stringify(escapedData, null, 2));

        console.log(escapedData.slice(0, 5));
        const csv =json2csv(escapedData,{
            emptyFieldValue: '' // This option replaces undefined with empty spaces
        });
        fs.writeFileSync(csvFilePath, csv);
        console.log(`Data saved to ${csvFilePath}`);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// // Example usage

// fetchGoogleSheetData(id, tab, path);