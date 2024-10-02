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

data = pd.read_json('output_new_8.json')

threshold = 0.85
nodes = []

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
				links += [{'source': data.prompt.values[i], 'target': data.prompt.values[j], 'value': similarity}]
				curr_links_num += 1
		if curr_links_num == 0:
			links += [{'source': data.prompt.values[i], 'target': data.prompt.values[np.argmax(curr_links) + i], 'value': np.max(curr_links)}]
		print(i)
		print(links)
	return links


nodes = data[['prompt', 'label']].rename({'prompt': 'id', 'label': 'group'}, axis = 1)
print(nodes)


links_for_plot = edge_weights(data, links)

data_dict = {'nodes': nodes.to_dict(orient='records'), 'links': links_for_plot}

with open('data.json', 'w') as fp:json.dump(data_dict, fp)






