# backend/fine_tune.py
from transformers import MT5ForConditionalGeneration, MT5Tokenizer, Trainer, TrainingArguments, DataCollatorForSeq2Seq
import pandas as pd
import torch

# Load preprocessed data
df = pd.read_csv('data/preprocessed_romanian_descriptions.csv')


# Prepare dataset
class DescriptionDataset(torch.utils.data.Dataset):
    def __init__(self, long_tokens, short_tokens):
        self.long_tokens = long_tokens
        self.short_tokens = short_tokens

    def __len__(self):
        return len(self.long_tokens)

    def __getitem__(self, idx):
        return {
            'input_ids': torch.tensor(self.long_tokens[idx], dtype=torch.long),
            'labels': torch.tensor(self.short_tokens[idx], dtype=torch.long)
        }


train_dataset = DescriptionDataset(df['long_tokens'].tolist(), df['short_tokens'].tolist())

# Load tokenizer and model
model_name = "google/mt5-small"
tokenizer = MT5Tokenizer.from_pretrained(model_name)
model = MT5ForConditionalGeneration.from_pretrained(model_name)

# Training arguments
training_args = TrainingArguments(
    output_dir='./models/fine-tuned-mt5',
    num_train_epochs=3,
    per_device_train_batch_size=8,
    per_device_eval_batch_size=8,
    warmup_steps=500,
    weight_decay=0.01,
    logging_dir='./logs',
)

# Data collator
data_collator = DataCollatorForSeq2Seq(tokenizer, model=model)

# Trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    data_collator=data_collator,
)

# Train the model
trainer.train()

# Save the model
model.save_pretrained('./models/fine-tuned-mt5')
tokenizer.save_pretrained('./models/fine-tuned-mt5')
