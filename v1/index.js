import { fetchSheet,abstract,convert } from "../src/index.js";

await convert('./data.csv','./output.json')

await abstract('./output.json')