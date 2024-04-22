# Visualizer Demo

## Installation
Execute the following command to install the required node modules:
```bash 
npm install
```

## Data Preparation
- Update the CSV file with your data.
    - Future enhancement: Automate data fetching from a Google Sheet.

## Data Conversion
Convert the updated CSV data into JSON format by running:

```bash 
node convert.js
```

This will generate the `output.json` file.

## OpenAI Configuration
Set your OpenAI API key as an environment variable:

```bash 
export OPENAI_API_KEY=your_api_key_here
```

## Data Enrichment
Enrich `output.json` with embeddings and other data by executing:

```bash 
node abstract.js
```

Note:
- Ensure that entries are upserted (updated or inserted) to avoid excessive API calls and potential data loss.
- Utilize hashes to track and manage data efficiently.

## Local Server
To view the `index.html` locally, run the following command:

```bash
serve
```

Navigate to the local server's address as prompted in the terminal to see the visualizer in action.