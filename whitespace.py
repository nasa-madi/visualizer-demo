import pandas as pd
from openai import OpenAI
import os
import re
import json
import math
import csv

data = pd.read_csv('data.csv')
num_iters = 3 # this includes the inital theme generation
num_ideas_start = 10

#extracting the prompts from the inputted data to be used for theme generation in stage 1 of whitespace generation
ideas = data.Prompt.values
whitespace_generated_df = pd.DataFrame()

openai_api_key = os.getenv('OPENAI_API_KEY')

client = OpenAI(api_key=openai_api_key)

MODEL="gpt-4o"
num_ideas_list = [num_ideas_start]

#loop to generate whitespace ideas in series 
#might break at 3 - need to do more work on API output standardization and total tokens
for i in range(num_iters):

  #call to gpt-4o for inital theme generation
  # will return 10 themes from the inputted data
  if i == 0:
    message_string = f"Hello! Could you use these ideas: {ideas} to pull out {num_ideas_list[i]} distinct key themes or keywords and return them in a json with a description for each. There should be {num_ideas_list[i]} in the final json output"
  else:
    message_string = f"Hello! Could you use these ideas {ideas} to pull out {num_ideas_list[i]} distinct key themes or related keywords for every idea there. Please return them in a json with a description for each, there should be {len(ideas)*num_ideas_list[i]} ideas in the final ouptput with a keyword and description."
  
  #call to API
  completion = client.chat.completions.create(
    model=MODEL,
    messages=[
      {"role": "system", "content": "You are an A.I. assistant with expert skill in whitespace analysis and idea generation. "},
      {"role": "user", "content": message_string}
      ],
    response_format = { "type": "json_object" }
  )

  #print output and load response into json object
  print(completion.choices[0].message.content)

  response = json.loads(completion.choices[0].message.content)  

  # keeping this here in case each stage's whitespace generation should be written as a separate object
  with open(f"theme{i+1}.json", "w") as outfile:
    json.dump(response, outfile)

  #updated number of ideas generated
  #this needs some updating
  if i == 0:
    #pulling out keywords from theme generation above and using those as the idea inputs for the next stage of idea generation
    data_temp = pd.DataFrame(response['themes'])
    ideas = data_temp['keyword'].values
    num_ideas_list += [int(num_ideas_list[i]/(i+2))]

  else:
    #data_temp = pd.json_normalize(response, sep='_')
    data_temp = pd.DataFrame()
    for col in pd.DataFrame(response).columns:
      df_temp_keyword = pd.json_normalize(response, col).assign(Category=col)
      data_temp = pd.concat([data_temp, df_temp_keyword], ignore_index=True)

    num_ideas_list += [num_ideas_list[i]-1]
    
  ideas = df_combined_temp['keyword'].values
  whitespace_generated_df = pd.concat([whitespace_generated_df, data_temp]).reset_index().drop(['index'], axis = 1)
  

  #writing dataframe from each round to csv if needed
  #data_temp.to_csv(f'themes{i+1}.csv', index=False)

  #writing combined dataframe with ideas to csv if needed
  #whitespace_generated_df.to_csv(f'combined_themes{i+1}.csv', index=False)


def update_data(df_new_whitespace, df_old):
  #take in column names for keyword and descriptions if needed
  append_source = ['whitespace generated' for x in range(len(df_new_whitespace))]
  append_maturity = ['whitespace' for x in range(len(df_new_whitespace))]

  append_df = pd.DataFrame({'Prompt': df_new_whitespace.keyword.values, 'Source': append_source, 'Maturity': append_maturity, 'Description': df_new_whitespace.description.values})

  full_data = pd.concat([df_old, append_df]).reset_index().drop(['index'], axis = 1)

  #full_data.to_csv('data.csv', index=False)

  return full_data

