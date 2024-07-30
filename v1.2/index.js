import { fetchSheet,abstract,convert } from "../src/index.js";
const id = '1YTIa2svFCJjWG0SdZN9OtAsdoK6LdrmClrF8hXVPs9Y'
const tab = 'Whitespace Generation'
const path = './data.csv'

await fetchSheet(id,tab,path)

await convert('./data.csv','./output.json')

await abstract('./data.json')