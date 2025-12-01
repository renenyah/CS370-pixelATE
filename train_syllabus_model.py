# Fine-tune LLaMA for Syllabus Parsing
# Install required packages first:
# pip install transformers datasets torch peft accelerate bitsandbytes

import json
import torch
from datasets import Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    BitsAndBytesConfig
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

# ============================================
# STEP 1: PREPARE YOUR TRAINING DATA
# ============================================

# Format your data like this - create a file called training_data.json
"""
[
  {
    "syllabus": "CS 101 - Introduction to Programming\n\nAssignments:\n| Assignment | Due Date |\n|------------|----------|\n| HW1        | 9/15/24  |\n| Project 1  | 10/1/24  |",
    "output": {
      "className": "CS 101 - Introduction to Programming",
      "assignments": [
        {"assignmentName": "HW1", "dueDate": "2024-09-15", "className": "CS 101"},
        {"assignmentName": "Project 1", "dueDate": "2024-10-01", "className": "CS 101"}
      ]
    }
  },
  {
    "syllabus": "MATH 201 - Calculus II\n\nHomework 1: Due September 20, 2024\nMidterm Exam: October 15, 2024",
    "output": {
      "className": "MATH 201 - Calculus II",
      "assignments": [
        {"assignmentName": "Homework 1", "dueDate": "2024-09-20", "className": "MATH 201"},
        {"assignmentName": "Midterm Exam", "dueDate": "2024-10-15", "className": "MATH 201"}
      ]
    }
  }
]
"""

def load_training_data(file_path="training_data.json"):
    """Load and format your syllabus training data"""
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    # Format for instruction tuning
    formatted_data = []
    for item in data:
        prompt = f"""Parse the following syllabus and extract all assignments with their due dates and class name. Return ONLY a JSON object.

Syllabus:
{item['syllabus']}

Output:"""
        
        completion = json.dumps(item['output'])
        
        formatted_data.append({
            "text": f"{prompt}\n{completion}"
        })
    
    return Dataset.from_list(formatted_data)

# ============================================
# STEP 2: CONFIGURE THE MODEL
# ============================================

MODEL_NAME = "microsoft/phi-2"  # Small, fast, open model (2.7B parameters)
# Alternative: "TinyLlama/TinyLlama-1.1B-Chat-v1.0" for even smaller
# Alternative: "meta-llama/Llama-3.2-1B" if you get Meta access

# Quantization config (makes model use less memory)
# Note: On Mac/CPU, we skip quantization as it requires CUDA
import platform
USE_QUANTIZATION = torch.cuda.is_available()

if USE_QUANTIZATION:
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )
else:
    bnb_config = None
    print("Running on CPU/Mac - quantization disabled")

# LoRA config (efficient fine-tuning)
lora_config = LoraConfig(
    r=16,  # Rank
    lora_alpha=32,
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)

# ============================================
# STEP 3: LOAD AND PREPARE MODEL
# ============================================

def setup_model():
    """Load and configure the LLaMA model"""
    print("Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"
    
    print("Loading model...")
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        quantization_config=bnb_config if USE_QUANTIZATION else None,
        device_map="auto" if USE_QUANTIZATION else None,
        trust_remote_code=True,
        torch_dtype=torch.float32  # Use float32 for CPU
    )
    
    model = prepare_model_for_kbit_training(model) if USE_QUANTIZATION else model
    model = get_peft_model(model, lora_config)
    
    print("Model ready for training!")
    model.print_trainable_parameters()
    
    return model, tokenizer

# ============================================
# STEP 4: TRAINING CONFIGURATION
# ============================================

training_args = TrainingArguments(
    output_dir="./syllabus-parser-model",
    num_train_epochs=3,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    fp16=True,
    save_steps=50,
    logging_steps=10,
    save_total_limit=2,
    warmup_steps=10,
    max_grad_norm=0.3,
    optim="paged_adamw_8bit",
)

# ============================================
# STEP 5: TRAIN THE MODEL
# ============================================

def train_model():
    """Main training function"""
    print("Loading training data...")
    train_dataset = load_training_data()
    
    print("Setting up model...")
    model, tokenizer = setup_model()
    
    # Tokenize the data
    def tokenize_function(examples):
        return tokenizer(
            examples["text"],
            padding="max_length",
            truncation=True,
            max_length=512
        )
    
    train_dataset = train_dataset.map(tokenize_function, batched=True)
    
    print("Starting training...")
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        tokenizer=tokenizer,
    )
    
    trainer.train()
    
    print("Saving final model...")
    trainer.save_model("./syllabus-parser-final")
    tokenizer.save_pretrained("./syllabus-parser-final")
    
    print("✅ Training complete!")
    return model, tokenizer

# ============================================
# STEP 6: USE YOUR TRAINED MODEL
# ============================================

def parse_syllabus(syllabus_text, model=None, tokenizer=None):
    """Use your trained model to parse a syllabus"""
    if model is None or tokenizer is None:
        # Load the trained model
        tokenizer = AutoTokenizer.from_pretrained("./syllabus-parser-final")
        model = AutoModelForCausalLM.from_pretrained(
            "./syllabus-parser-final",
            device_map="auto",
            torch_dtype=torch.float16
        )
    
    prompt = f"""Parse the following syllabus and extract all assignments with their due dates and class name. Return ONLY a JSON object.

Syllabus:
{syllabus_text}

Output:"""
    
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    
    outputs = model.generate(
        **inputs,
        max_new_tokens=500,
        temperature=0.1,
        do_sample=True,
        top_p=0.95
    )
    
    result = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    # Extract just the JSON part
    json_start = result.find("{")
    json_end = result.rfind("}") + 1
    json_str = result[json_start:json_end]
    
    return json.loads(json_str)

# ============================================
# RUN THE TRAINING
# ============================================

if __name__ == "__main__":
    # Step 1: Create your training_data.json file first!
    # Step 2: Run this script
    model, tokenizer = train_model()
    
    # Test it
    test_syllabus = """
    CS 150 - Data Structures
    
    | Assignment | Due Date |
    |------------|----------|
    | Lab 1      | 9/10/24  |
    | Project A  | 9/25/24  |
    """
    
    result = parse_syllabus(test_syllabus, model, tokenizer)
    print("\nTest Result:")
    print(json.dumps(result, indent=2))