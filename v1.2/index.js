import { fetchSheet,abstract,convert } from "../src/index.js";
const id = '1YTIa2svFCJjWG0SdZN9OtAsdoK6LdrmClrF8hXVPs9Y'
const tab = 'CAS Mapping of Activities'
const path = './data-full.csv'

await fetchSheet(id,tab,path)

await convert('./data-full.csv','./output.json')

await abstract('./output.json')