# backend/preprocess.py
import pandas as pd
import re
from transformers import MT5Tokenizer

# Sample dat

data = {
    "long_description": [
        "Aceasta este o descriere lungă a unei proprietăți imobiliare. Include toate detaliile necesare despre proprietate, cum ar fi suprafața, numărul de camere, facilități, locație și multe altele.",
        "Aceasta este o descriere lungă a unui produs. Include toate detaliile necesare despre produs, cum ar fi specificațiile tehnice, utilizările recomandate, instrucțiunile de întreținere și multe altele."
    ],
    "short_description": [
        "Descriere scurtă a proprietății imobiliare.",
        "Descriere scurtă a produsului."
    ]
}

# Creating a DataFrame
df = pd.DataFrame(data)


# Preprocessing function
def preprocess_text(text):
    text = text.lower()
    text = re.sub(r'[^a-zăîșțâéèâăîșț ]+', '', text)
    return text


# Apply preprocessing
df['long_description'] = df['long_description'].apply(preprocess_text)
df['short_description'] = df['short_description'].apply(preprocess_text)

# Tokenize the text
tokenizer = MT5Tokenizer.from_pretrained("google/mt5-small")

df['long_tokens'] = df['long_description'].apply(
    lambda x: tokenizer.encode(x, truncation=True, padding='max_length', max_length=512))
df['short_tokens'] = df['short_description'].apply(
    lambda x: tokenizer.encode(x, truncation=True, padding='max_length', max_length=128))

# Save preprocessed data to CSV
df.to_csv('data/preprocessed_romanian_descriptions.csv', index=False)

print("Preprocessed and tokenized data saved to 'data/preprocessed_romanian_descriptions.csv'")
