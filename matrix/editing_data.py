
import pandas as pd
from openai import OpenAI
import numpy as np
import os
import re
import json
import math
import csv
import ast


#set API key and model to make calls to
openai_api_key = os.getenv('OPENAI_API_KEY')

client = OpenAI(api_key=openai_api_key)

MODEL="gpt-4o"

data = pd.read_json('output_new_100.json')

threshold = 0.8
nodes = []

data = data[:100]


print('generating keywords...')

message_string1 = f"Hello! Could you use generate a 2-3 word summary of each of these prompts: {data.prompt.values} and return them as a flat list in a json file"
  
completion = client.chat.completions.create(
	model=MODEL,
    messages=[
      {"role": "system", "content": "You are an A.I. assistant with expert skill in summarization."},
      {"role": "user", "content": message_string1}
      ],
    response_format = { "type": "json_object" }
)

keyword_obj = json.loads(completion.choices[0].message.content) 
print(keyword_obj)

data['id'] = keyword_obj['summaries']

def cosine_similarity(vec1,vec2):
	dot_product= np.dot(vec1,vec2)
	magnitude_1 = np.linalg.norm(vec1)
	magnitude_2 = np.linalg.norm(vec2)
	similarity = dot_product / (magnitude_1 * magnitude_2)
	return similarity

links=[]

def edge_weights(data, links = []):
	for i in range(len(data)):
		curr_links_num = 0
		curr_links = []
		for j in range(i, len(data)):
			similarity = cosine_similarity(data.embedding.values[i], data.embedding.values[j])
			curr_links += [similarity]
			if similarity >= threshold:
				links += [{'source': data.id.values[i], 'target': data.id.values[j], 'value': similarity}]
				curr_links_num += 1
		if curr_links_num == 0:
			links += [{'source': data.id.values[i], 'target': data.id.values[np.argmax(curr_links) + i], 'value': np.max(curr_links)}]
		# print(i)
		# print(links)
	return links

#data['id'] = keyword_obj['summaries']

#result = data.to_json(orient="records")

# Write JSON data to a file
#with open('output_new_100.json', 'w') as file:file.write(result)

nodes = data[['id', 'label']].rename({'label': 'group'}, axis = 1)
print(nodes)


links_for_plot = edge_weights(data, links)

data_dict = {'nodes': nodes.to_dict(orient='records'), 'links': links_for_plot}

with open('data.json', 'w') as fp:json.dump(data_dict, fp)