
import pandas as pd
from openai import OpenAI
import os
import re
import json
import math
import csv

#set API key and model to make calls to
openai_api_key = os.getenv('OPENAI_API_KEY')

client = OpenAI(api_key=openai_api_key)

MODEL="gpt-4o"

def make_api_call(i, ideas, num_ideas_list):
  if i == 0:
    message_string1 = f"Hello! Could you use these ideas: {ideas} to pull out {num_ideas_list[i]} distinct key themes or keywords and return them in a json. There should be {num_ideas_list[i]} in the final json output"
  else:
    message_string1 = f"Hello! Could you use these ideas {ideas} to pull out {num_ideas_list[i]} distinct key themes or related keywords for every idea there. Please return them in a json with only one layer, there should be no sublayer for the idea that it came from. At the end there should be {len(ideas)*num_ideas_list[i]} ideas in the final output with a keyword"
  
  completion = client.chat.completions.create(
    model=MODEL,
    messages=[
      {"role": "system", "content": "You are an A.I. assistant with expert skill in whitespace analysis and idea generation. "},
      {"role": "user", "content": message_string1}
      ],
    response_format = { "type": "json_object" }
  )

  keyword_obj = json.loads(completion.choices[0].message.content) 

  #formatted_output = format_gpt_output(i, keyword_obj)
  keywords = keyword_obj['themes']

  message_string2 = f"Hello! Could you provide a description for each of these keywords: {keywords}. Please return in a json with only one layer, there should be a total of {len(keywords)} descriptions in the output"
  #need to pull out keywords now
  completion_descriptions = client.chat.completions.create(
      model=MODEL,
      messages=[
        {"role": "system", "content": "You are an A.I. assistant with expert skill in whitespace analysis and idea generation. "},
        {"role": "user", "content": message_string2}
        ],
      response_format = { "type": "json_object" }
    )

  descriptions_obj = json.loads(completion_descriptions.choices[0].message.content)
  descriptions_df = pd.DataFrame([descriptions_obj]).T.reset_index().rename({'index': 'keyword', 0: 'description'}, axis = 1)
  
  return descriptions_df


def update_data(df_new_whitespace, df_old):
  #take in column names for keyword and descriptions if needed
  append_source = ['whitespace' for x in range(len(df_new_whitespace))]
  append_maturity = ['whitespace' for x in range(len(df_new_whitespace))]

  append_df = pd.DataFrame({'Prompt': df_new_whitespace.keyword.values, 'Source': append_source, 'Maturity': append_maturity, 'Description': df_new_whitespace.description.values})

  full_data = pd.concat([df_old, append_df]).reset_index().drop(['index'], axis = 1)

  #full_data.to_csv('data.csv', index=False)

  return full_data



#reading in data and setting number of iterations and number of initial themes
data = pd.read_csv('data.csv')
num_iters = 3 # this includes the inital theme generation
num_ideas_start = 3

#extracting the prompts from the inputted data to be used for theme generation in stage 1 of whitespace generation
ideas = data.Prompt.values
whitespace_generated_df = pd.DataFrame()

#this needs to be cleaned up
num_ideas_list = [num_ideas_start]

#loop to generate whitespace ideas in series 
#might break at 3 - need to do more work on API output standardization and total tokens
for i in range(num_iters):
  #check to see if themes for this round of iterations were already developed
  if os.path.exists(./f'themes{i}.csv'):
    data_curr_round = pd.read_csv(f'themes{i}.csv')

  #only hits this case if it hasnt already generated ideas for this round
  else:
    #call to API
    data_curr_round = make_api_call(i, ideas, num_ideas_list)

    # keeping this here in case each stage's whitespace generation should be written as a separate object
    #with open(f"theme{i+1}.json", "w") as outfile:
      #json.dump(response, outfile)

    #updated number of ideas generated
    #this needs some updating
    if i == 0:
      #pulling out keywords from theme generation above and using those as the idea inputs for the next stage of idea generation
      num_ideas_list += [int(num_ideas_list[i]/(2))]

    else:
      num_ideas_list += [num_ideas_list[i]-1]
    
    
    #writing dataframe from each round to csv 
    data_curr_round.to_csv(f'themes{i}.csv', index=False)


  #setting ideas for next round
  whitespace_generated_df = pd.concat([whitespace_generated_df, data_curr_round]).reset_index().drop(['index'], axis = 1)
  ideas = data_curr_round['keyword'].values

  #writing combined dataframe with ideas to csv if needed
  #whitespace_generated_df.to_csv(f'combined_themes0_{i}.csv', index=False)



#after loop call write to data function to use for visualizer
df_updated = update_data(whitespace_generated_df, data)
print(updated)

#full_data.to_csv('data.csv', index=False)






