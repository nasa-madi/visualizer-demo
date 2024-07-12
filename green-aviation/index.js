import { fetchSheet,abstract,convert } from "../src/index.js";
const id = '1YTIa2svFCJjWG0SdZN9OtAsdoK6LdrmClrF8hXVPs9Y'
const tab = 'Green Aviation only'
const path = './data-green.csv'

await fetchSheet(id,tab,path)

await convert('./data-green.csv','./output.json')

await abstract('./output.json')