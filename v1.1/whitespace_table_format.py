import pandas as pd
import json

data = pd.read_json('output.json')

space = data[245:]

source_list = []

#creating labels from what it was generated from
for i in range(len(space)):
	if i < 10:
		source_list += ['generated']

	elif i < 70:
		label = (i - 10) // 6 
		source_list += [space.prompt.values[label]]

	else:
		label = ((i - 70) // 3) + 10
		source_list += [space.prompt.values[label]]


space.loc[:, 'source'] = source_list



result = space.to_json(orient="records")

# Write JSON data to a file
with open('output.json', 'w') as file:
    file.write(result)