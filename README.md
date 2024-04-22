# visualizer-demo


Run `npm install`

Update the CSV
- TODO: Convert it to a google sheet fetch.

Run `node convert.js` to create output.json

Set the var: `export OPENAI_API_KEY=XXXXXXXXX`

Run `node abstract.js` to update output.json with embeddings etc.
 - Need to debug so that entries are upserted instead of overwritten (lots of API calls)


Run `serve` from the command line to serve the index.html locally
