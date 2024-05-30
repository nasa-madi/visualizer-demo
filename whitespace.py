import pandas as pd
from openai import OpenAI
import os
import re

data = pd.read_csv('data.csv')

client = OpenAI(api_key="your_api_key_here")

# const openai = new OpenAI({
#   apiKey: process.env.OPENAI_API_KEY
# });

ideas = data.Prompt.values

openai_api_key = os.getenv('OPENAI_API_KEY')

client = OpenAI(api_key=openai_api_key)

MODEL="gpt-4o"


completion = client.chat.completions.create(
  model=MODEL,
  messages=[
    {"role": "system", "content": "You are an A.I. assistant with expert skill in whitespace analysis and idea generation.  You will follow the three stages of analysis below and complete them sequentially, make sure to add an aeronautics lens as well. STAGE 1: Evaluation Against the SDGs. Analyze the question and topic provided and generate ideas that answer that question while also considering the Sustainable Devleopment Goals (SDGs). The 17 SDGs are : No poverty, Zero hunger, Good health and well-being, Quality education, Gender equality, Clean water and sanitation, Affordable and clean energy, Decent work and economic growth, Industry, innovation and infrastructure, Reduced inequalities, Sustainable cities and communities, Responsible consumption and production, Climate action, Life below water, Life on land, Peace, justice and strong institutions, partnerships for the goals. STAGE 2:Evaluation Against a DVF Framework. Now analyze the previous ideas generated and the topics and questions put in to come up with new ideas and furher revise and refine existing ideas. Now analyze those against a desirable, viable, feasible framework. STAGE 3:Projected into the Future Using Needs, Trends and Capabilities.Now analyze the previous ideas generated and the topics and questions put in to come up with new ideas and push ideas futher. Try using the framework of trends, capabilities, and needs both now and in the future. And please try to decenter AI in the idea geneartion, it will be important but not the main focus. Thank you. "},
    {"role": "user", "content": f"Hello! Could you use these ideas {ideas} to generate new ideasand return the top 20 ideas from Stage 3 that are not present in the ideas list. Thank you"}
    ]
)
print("Assistant: " + completion.choices[0].message.content)


print(completion.choices[0].message.content)

# Specify the file path and name
file_path = 'whitespace_generation_gpt4o.txt'

# Open the file in write mode and write the text
with open(file_path, 'w') as file: 
	file.write(completion.choices[0].message.content)

input_string = completion.choices[0].message.content

# # Specify the file path and name
# file_path = 'whitespace_generation_gpt4o.txt'

# # Open the file in read mode and read the content
# with open(file_path, 'r') as file:
#     generated_content = file.read()

# print(generated_content)




# Extract everything after "top 20"
if start_pos != -1:
    temp_result = input_string[start_pos + len("Top 20"):]
else:
	#fix this
    temp_result = ""

print(temp_result)

# stopping_character = "1."

# result = temp_result.split(stopping_character)[1]

pattern = r'\n\d+\.'

formatted_data = re.split(pattern, temp_result)
formatted_data = formatted_data[1:]
formatted_data[-1] = formatted_data[-1].splitlines()[0]
#split_result = result.splitlines()

#print(result)
#append_prompts = formatted_data
append_source = ['whitespace generated' for x in range(len(formatted_data))]
append_maturity = ['whitespace' for x in range(len(formatted_data))]
# append_description = []
# append_transcript = []

append_df = pd.DataFrame({'Prompt': formatted_data, 'Source': append_source, 'Maturity': append_maturity})

full_data = pd.concat([data, append_df]).reset_index().drop(['index'], axis = 1)

full_data.iloc[15].Prompt = full_data.iloc[15].Prompt.split('\r')[0]

full_data.to_csv('data.csv', index=False)


data_2 = pd.read_csv('data.csv')



