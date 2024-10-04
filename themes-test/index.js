import { fetchSheet,abstract,convert } from "../src/index.js";

await convert('./data.csv','./output.json')

await abstract('./output.json')

import { fetchSheet,abstract,convert } from "../src/index.js";
const tab = 'CAS Compost Data'
const path = './data.json'

await fetchSheet(id,tab,path)

await convert('./data.json','./output.json')

await abstract('./data.json')