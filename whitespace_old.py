import pandas as pd
from openai import OpenAI
import os
import re
import json
import math
import csv

data = pd.read_csv('data.csv')

#extracting the prompts from the inputted data to be used for theme generation in stage 1 of whitespace generation
ideas = data.Prompt.values

openai_api_key = os.getenv('OPENAI_API_KEY')

client = OpenAI(api_key=openai_api_key)

MODEL="gpt-4o"

#call to gpt-4o for inital theme generation
# will return 10 themes from the inputted data
completion = client.chat.completions.create(
  model=MODEL,
  messages=[
    {"role": "system", "content": "You are an A.I. assistant with expert skill in whitespace analysis and idea generation. "},
    {"role": "user", "content": f"Hello! Could you use these ideas {ideas} to pull out 10 distinct key themes or keywords that are one word and return them in a json with a description for each without new line characters. Thank you."}
    ],
  response_format = { "type": "json_object" }
)

#
print(completion.choices[0].message.content)

response = json.loads(completion.choices[0].message.content)

# keeping this here in case each stage's whitespace generation should be written as a separate object
# with open("10theme1.json", "w") as outfile:
#   json.dump(response, outfile)


# with open('10theme1.json', 'r') as openfile:
#   json_object = json.load(openfile)


#data_stage1 = pd.DataFrame(json_object['themes'])

data_stage1 = pd.DataFrame(response['themes'])

data_stage1.to_csv('themes1.csv', index=False)


#round 2 idea generation - from each of the 10 themes 6 more ideas will be developed from each one

#pulling out keywords from theme generation above and using those as the idea inputs for this stage of idea generation
ideas_2 = data_stage1['keyword'].values

completion2 = client.chat.completions.create(model=MODEL,messages=[{"role": "system", "content": "You are an A.I. assistant with expert skill in whitespace analysis and idea generation. "}, {"role": "user", "content": f"Hello! Could you use these ideas {ideas_2} to pull out 6 distinct key themes or related keywords for every idea there. Please return them in a json with a description for each, there should be {len(ideas_2)*6} ideas in the final ouptput with a keyword and description. Thank you."}],response_format = { "type": "json_object" })


print(completion2.choices[0].message.content)

response2 = json.loads(completion2.choices[0].message.content)

#keeping in case it should be written to json
# with open("10theme2.json", "w") as outfile:
#   json.dump(response2, outfile)


# with open('10theme2.json', 'r') as openfile:
#   json_object2 = json.load(openfile)


#data_stage2 = pd.DataFrame(json_object2)

#separating out json object to read as a csv
data_stage2 = pd.json_normalize(response2, sep='_')

#expanding on dataframe columns to have each idea be its own row
df_combined_stg2 = pd.DataFrame()
for col in pd.DataFrame(response2).columns:
  df_temp = pd.json_normalize(response2, col).assign(Category=col)
  df_combined_stg2 = pd.concat([df_combined_stg2, df_temp], ignore_index=True)

#writing dataframe with stage 2 ideas to csv if needed
# df_combined_stg2.to_csv('themes2.csv', index=False)


#round 3 ideas

#taking keywords from the second stage of idea generation and generating 3 more ideas for each
ideas_3 = df_combined_stg2['keyword'].values
output= []

#batching call to the API for better results
batch_size = 20
for i in range(math.ceil(len(ideas_3)/batch_size)):
  ideas_3_subset = ideas_3[(i*batch_size):((i+1)*batch_size)]
  completion3 = client.chat.completions.create(model=MODEL,messages=[{"role": "system", "content": "You are an A.I. assistant with expert skill in whitespace analysis and idea generation. "}, {"role": "user", "content": f"Hello! Could you use these ideas {ideas_3_subset} and come up with 3 distinct key themes or related keywords for every idea there. Please return them in a json with a description for each, there should be {len(ideas_3_subset)*3} ideas in the final ouptput with a keyword and description. Thank you."}],response_format = { "type": "json_object" })
  print(completion3.choices[0].message.content)
  output += [completion3.choices[0].message.content] 


df_combined_3 = pd.DataFrame()
for i in range(len(output)):
  temp=json.loads(output[i])
  data10 = pd.json_normalize(temp, sep='_')
  for col in data10.columns:
    print(col)
    df_temp = pd.json_normalize(temp, col).assign(Category=col)
    df_combined_3 = pd.concat([df_combined_3, df_temp], ignore_index=True)
  print(df_combined_3)

#in case idea generation 3 should be written to csv individually
# df_combined_3.to_csv('themes3.csv', index=False)

# print(df_combined_3)


final_df = pd.concat([data_stage1, df_combined_stg2, df_combined_3]).reset_index().drop(['index'], axis = 1)

final_df.to_csv('combinedstages_3.csv', index=False)


append_source = ['whitespace generated' for x in range(len(final_df))]
append_maturity = ['whitespace' for x in range(len(final_df))]

append_df = pd.DataFrame({'Prompt': final_df.keyword.values, 'Source': append_source, 'Maturity': append_maturity, 'Description': final_df.description.values})

full_data = pd.concat([data, append_df]).reset_index().drop(['index'], axis = 1)

full_data.to_csv('data.csv', index=False)

