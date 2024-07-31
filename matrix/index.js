import { fetchSheet,abstract,convert } from "../src/index.js";
const id = '1YTIa2svFCJjWG0SdZN9OtAsdoK6LdrmClrF8hXVPs9Y'
const tab = 'CAS Matrix'
const path = './data.json'

await fetchSheet(id,tab,path)

await convert('./data.json','./output.json')

await abstract('./data.json')