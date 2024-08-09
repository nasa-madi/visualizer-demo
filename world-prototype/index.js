import { fetchSheet,abstract,convert } from "../src/index.js";
const id = '1YTIa2svFCJjWG0SdZN9OtAsdoK6LdrmClrF8hXVPs9Y'
const tab = 'World Prototype Data'
const path = './data-world.csv'

await fetchSheet(id,tab,path)

await convert('./data-world.csv','./output.json')

await abstract('./output.json')