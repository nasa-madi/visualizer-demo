import pandas as pd
from openai import OpenAI
import os
import re
import json
import math
import csv

data = pd.read_csv('data.csv')


ideas = data.Prompt.values

openai_api_key = os.getenv('OPENAI_API_KEY')

client = OpenAI(api_key=openai_api_key)

MODEL="gpt-4o"

#call to gpt-4o for inital theme generation
completion = client.chat.completions.create(
  model=MODEL,
  messages=[
    {"role": "system", "content": "You are an A.I. assistant with expert skill in whitespace analysis and idea generation. "},
    {"role": "user", "content": f"Hello! Could you use these ideas {ideas} to pull out 10 distinct key themes or keywords that are one word and return them in a json with a description for each without new line characters. Thank you."}
    ],
  response_format = { "type": "json_object" }
)

print(completion.choices[0].message.content)


# response = json.loads(completion.choices[0].message.content)


# with open("10theme1.json", "w") as outfile:
#   json.dump(response, outfile)


with open('10theme1.json', 'r') as openfile:
  json_object = json.load(openfile)



# print(json_object)
data3 = pd.DataFrame(json_object['themes'])

#data3.to_csv('themes1.csv', index=False)

#round 2 ideas

# ideas_2 = data3['keyword'].values

# completion2 = client.chat.completions.create(model=MODEL,messages=[{"role": "system", "content": "You are an A.I. assistant with expert skill in whitespace analysis and idea generation. "}, {"role": "user", "content": f"Hello! Could you use these ideas {ideas_2} to pull out 6 distinct key themes or related keywords for every idea there. Please return them in a json with a description for each, there should be {len(ideas_2)*6} ideas in the final ouptput with a keyword and description. Thank you."}],response_format = { "type": "json_object" })


# print(completion2.choices[0].message.content)

# response2 = json.loads(completion2.choices[0].message.content)

# with open("10theme2.json", "w") as outfile:
#   json.dump(response2, outfile)



# with open('10theme2.json', 'r') as openfile:
#   json_object2 = json.load(openfile)


# data4 = pd.DataFrame(json_object2)


# data8 = pd.json_normalize(json_object2, sep='_')

# df_combined_2 = pd.DataFrame()
# for col in data8.columns:
#   print(col)
#   df_temp = pd.json_normalize(json_object2, col).assign(Category=col)
#   df_combined_2 = pd.concat([df_combined_2, df_temp], ignore_index=True)



# df_combined_2.to_csv('themes2.csv', index=False)


#round 3 ideas

# ideas_3 = df_combined_2['keyword'].values
# output= []

# batch_size = 20
# for i in range(math.ceil(len(ideas_3)/batch_size)):
#   ideas_3_subset = ideas_3[(i*batch_size):((i+1)*batch_size)]
#   completion3 = client.chat.completions.create(model=MODEL,messages=[{"role": "system", "content": "You are an A.I. assistant with expert skill in whitespace analysis and idea generation. "}, {"role": "user", "content": f"Hello! Could you use these ideas {ideas_3_subset} and come up with 3 distinct key themes or related keywords for every idea there. Please return them in a json with a description for each, there should be {len(ideas_3_subset)*3} ideas in the final ouptput with a keyword and description. Thank you."}],response_format = { "type": "json_object" })
#   print(completion3.choices[0].message.content)
#   output += [completion3.choices[0].message.content] 


# df_combined_3 = pd.DataFrame()
# for i in range(len(output)):
#   temp=json.loads(output[i])
#   data10 = pd.json_normalize(temp, sep='_')
#   for col in data10.columns:
#     print(col)
#     df_temp = pd.json_normalize(temp, col).assign(Category=col)
#     df_combined_3 = pd.concat([df_combined_3, df_temp], ignore_index=True)
#   print(df_combined_3)

# df_combined_3.to_csv('themes3.csv', index=False)

# print(df_combined_3)


# # Round 3 Idea Generation
# ideas_4 = df_combined_3['keyword'].values
# output= []

# batch_size = 20
# for i in range(math.ceil(len(ideas_4)/batch_size)):
#   ideas_4_subset = ideas_4[(i*batch_size):((i+1)*batch_size)]
#   completion4 = client.chat.completions.create(model=MODEL,messages=[{"role": "system", "content": "You are an A.I. assistant with expert skill in whitespace analysis and idea generation. "}, {"role": "user", "content": f"Hello! Could you use these ideas {ideas_4_subset} and come up with 3 distinct key themes or related keywords for every idea there. Please return them in a json with a description for each, there should be {len(ideas_4_subset)*3} ideas in the final ouptput with a keyword and description. Thank you."}],response_format = { "type": "json_object" })
#   print(completion4.choices[0].message.content)
#   output += [completion4.choices[0].message.content] 


# df_combined_5 = pd.DataFrame()
# for i in [3]:
#   temp=json.loads(output[i])
#   for col in pd.json_normalize(temp, sep='_'):
#     print(col)
#     df_temp = pd.json_normalize(temp, col).assign(Category=col)
#     df_combined_5 = pd.concat([df_combined_5, df_temp], ignore_index=True)
#   print(df_combined_5)

# #df_combined_4.to_csv('themes4.csv', index=False)

# #print(df_combined_4)

# output.to_csv('round4_rawoutput.csv', index=False)

# temporary.to_csv('round4_first180.csv', index=False)

# pd.concat([data3, df_combined_2, df_combined_3]).reset_index().drop(['index'], axis = 1)


#final_df.to_csv('final2rounds.csv', index=False)

final_df = pd.read_csv('final2rounds.csv')


append_source = ['whitespace generated' for x in range(len(final_df))]
append_maturity = ['whitespace' for x in range(len(final_df))]

append_df = pd.DataFrame({'Prompt': final_df.keyword.values, 'Source': append_source, 'Maturity': append_maturity, 'Description': final_df.description.values})

full_data = pd.concat([data, append_df]).reset_index().drop(['index'], axis = 1)

full_data.to_csv('data.csv', index=False)

