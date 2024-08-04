import json
import os
from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from flask_session import Session
import logging
import pandas as pd
import numpy as np
import re
from werkzeug.security import generate_password_hash, check_password_hash
from opencage.geocoder import OpenCageGeocode
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')
CORS(app, supports_credentials=True, origins=["https://imm-a8ub.onrender.com"])
app.secret_key = os.environ.get('SECRET_KEY', 'supersecretkey')  # For session management

# Flask-Session configuration
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = True
app.config['SESSION_USE_SIGNER'] = True  # Encrypt session cookies
app.config['SESSION_KEY_PREFIX'] = 'sess:'
Session(app)

# Set up logging
logging.basicConfig(level=logging.INFO)
logging.getLogger('werkzeug').setLevel(logging.WARNING)

# In-memory user store for demo purposes
users = {
    "admin": generate_password_hash("adminpassword"),
    "employee": generate_password_hash("employeepassword")
}

# In-memory store for employee data, validation data, and additional details
employee_data = []
validation_data = []
admin_data = []
additional_details = {}

opencage_api_key = os.getenv('OPENCAGE_API_KEY')
if not opencage_api_key:
    raise ValueError("No OPENCAGE_API_KEY set for OpenCage API")

geocoder = OpenCageGeocode(opencage_api_key)

# Initialize OpenAI API key
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("No OPENAI_API_KEY set for OpenAI API")

client = OpenAI(api_key=openai_api_key)

@app.before_request
def log_session_info():
    app.logger.info(f"Session info: {dict(session)}")

@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if username in users and check_password_hash(users[username], password):
        session['user'] = username
        session['role'] = 'admin' if username == 'admin' else 'employee'
        app.logger.info(f"User '{username}' logged in with role '{session['role']}'")
        return jsonify({"message": "Login successful", "role": session['role']}), 200
    else:
        app.logger.warning(f"Invalid login attempt for user '{username}'")
        return jsonify({"message": "Invalid credentials"}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    session.pop('role', None)
    app.logger.info("User logged out")
    return jsonify({"message": "Logout successful"}), 200

@app.route('/api/data', methods=['GET'])
def get_data():
    if 'user' not in session:
        app.logger.warning("Unauthorized access attempt")
        return jsonify({'message': 'Unauthorized'}), 401

    # Example response, replace with your actual data source
    response = {
        'data': 'example data'
    }
    return jsonify(response)

def extract_numbers_before_mp(text):
    try:
        text = str(text)
        cleaned_text = re.sub(r'(?<=\d)\.(?=\d)', '', text)
        matches = re.findall(r'\b(\d+)\s*mp\b', cleaned_text, re.IGNORECASE)
        if matches:
            return int(matches[0])
        else:
            return None
    except Exception as e:
        app.logger.error(f"Error occurred while extracting numbers before 'mp': {e}")
        return None

def markdown_description(description):
    try:
        prompt = (
            "Te rog să formatezi și să structurezi următoarea descriere imobiliară în markdown, ca și "
            "cum ai fi un agent imobiliar profesionist. Asigură-te că incluzi secțiuni clare pentru "
            "Adresa, Locație, Facilități, Acte și alte detalii relevante. Nu pune titlu, nu folosi bold, "
            "nu fa resize la tabel, vreau să fie cât mai structurate și cât mai simple de citit. "
            "Ca exemplu de cum vreau să arate: \n"
            "Localizare: \n"
            "  - Adresa: \n"
            "  - Zona: \n"
            "Caracteristici: \n"
            "  - Suprafața terenului: \n"
            "  - Construcții existente: \n"
            "  - Posibilități: \n"
            "  - Certificate de urbanism: \n"
            "    - POT: \n"
            "    - CUT: \n"
            "    - Deschidere: \n"
            "Accesibilitate și facilități: \n"
            "  - Proximitate: \n"
            "Descriere zonă: \n"
            "  - Infrastructură și facilități: \n"
            "Informații suplimentare: \n\n"
            f"{description}"
        )
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "user", "content": prompt},
            ],
            max_tokens=500,
            n=1,
            stop=None,
            temperature=0.9
        )
        markdown_text = response.choices[0].message['content'].strip()
        return markdown_text
    except Exception as e:
        app.logger.error(f"Error generating markdown: {e}")
        return description  # Return the original description if there's an error

@app.route('/api/get_json_data', methods=['GET'])
def get_json_data():
    json_file_path = os.path.join(os.path.dirname(__file__), '123.json')

    if not os.path.exists(json_file_path):
        return jsonify({'message': 'JSON file not found'}), 404

    with open(json_file_path, 'r') as json_file:
        json_data = json.load(json_file)

    # Check for markdown_description and generate it if missing
    for entry in json_data:
        if not entry.get('markdown_description'):
            entry['markdown_description'] = markdown_description(entry['Description'])

    return jsonify(json_data)

@app.route('/api/delete_row', methods=['POST'])
def delete_row():
    if 'user' not in session:
        app.logger.warning("Unauthorized access attempt")
        return jsonify({'message': 'Unauthorized'}), 401

    data = request.get_json()
    row_id = data.get('id')

    json_file_path = os.path.join(os.path.dirname(__file__), '123.json')
    try:
        with open(json_file_path, 'r') as json_file:
            json_data = json.load(json_file)

        json_data = [row for row in json_data if row['ID'] != row_id]

        with open(json_file_path, 'w') as json_file:
            json.dump(json_data, json_file, indent=4)

        global admin_data
        admin_data = json_data

        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error('Error deleting row from the JSON file', exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/send_to_employee', methods=['POST'])
def send_to_employee():
    if 'user' not in session or session.get('role') != 'admin':
        app.logger.warning("Unauthorized access attempt")
        return jsonify({'message': 'Unauthorized'}), 401

    data = request.get_json()

    custom_questions = data.get('questions', [])
    row_to_send = {**data, 'questions': custom_questions}

    global admin_data, employee_data
    admin_data = [row for row in admin_data if row['ID'] != data['ID']]

    employee_data.append(row_to_send)

    return jsonify({'status': 'success'})

@app.route('/api/send_to_validation', methods=['POST'])
def send_to_validation():
    if 'user' not in session or session.get('role') != 'employee':
        app.logger.warning("Unauthorized access attempt")
        return jsonify({'message': 'Unauthorized'}), 401

    data = request.get_json()

    global employee_data, validation_data
    employee_data = [row for row in employee_data if row['ID'] != data['ID']]

    validation_data.append(data)

    return jsonify({'status': 'success'})

def markAsNew(data):
    data['status'] = 'new'
    return data

@app.route('/api/save_details', methods=['POST'])
def save_details():
    if 'user' not in session or session.get('role') != 'employee':
        app.logger.warning("Unauthorized access attempt")
        return jsonify({'message': 'Unauthorized'}), 401
    data = request.get_json()
    app.logger.info(f"Received data for saving: {data}")

    for i, row in enumerate(employee_data):
        if row['ID'] == data['ID']:
            data = markAsNew(data)
            employee_data[i] = data
            validation_data.append(data)
            employee_data.pop(i)
            app.logger.info(f"Updated data sent back to validation: {data}")
            break

    additional_details[data['ID']] = {
        "streetNumber": data.get('streetNumber'),
        "additionalDetails": data.get('additionalDetails')
    }
    app.logger.info(f"Additional details saved: {additional_details[data['ID']]}")
    return jsonify({'status': 'success'})

@app.route('/api/get_additional_details', methods=['GET'])
def get_additional_details():
    if 'user' not in session:
        app.logger.warning("Unauthorized access attempt")
        return jsonify({'message': 'Unauthorized'}), 401
    row_id = request.args.get('id')
    details = additional_details.get(int(row_id), {})
    app.logger.info(f"Fetched additional details for ID {row_id}: {details}")
    return jsonify(details)

@app.route('/api/delete_validation_row', methods=['POST'])
def delete_validation_row():
    if 'user' not in session:
        app.logger.warning("Unauthorized access attempt")
        return jsonify({'message': 'Unauthorized'}), 401

    data = request.get_json()
    row_id = data.get('id')

    global validation_data
    validation_data = [row for row in validation_data if row['ID'] != row_id]

    return jsonify({'status': 'success'})

@app.route('/api/admin_data', methods=['GET'])
def get_admin_data():
    if 'user' not in session or session.get('role') != 'admin':
        app.logger.warning("Unauthorized access attempt")
        return jsonify({'message': 'Unauthorized'}), 401
    return jsonify(admin_data)

@app.route('/api/employee_data', methods=['GET'])
def get_employee_data():
    if 'user' not in session or session.get('role') != 'employee':
        app.logger.warning("Unauthorized access attempt")
        return jsonify({'message': 'Unauthorized'}), 401
    return jsonify(employee_data)

@app.route('/api/validation_data', methods=['GET'])
def get_validation_data():
    if 'user' not in session or session.get('role') not in ['employee', 'admin']:
        app.logger.warning("Unauthorized access attempt")
        return jsonify({'message': 'Unauthorized'}), 401

    global validation_data
    if not validation_data:
        # Load validation data from JSON file
        try:
            validation_file_path = os.path.join(os.path.dirname(__file__), 'validation_terenuri.json')
            with open(validation_file_path, 'r') as json_file:
                validation_data = json.load(json_file)
            app.logger.info(f"Loaded validation data from {validation_file_path}")
        except Exception as e:
            app.logger.error('Error loading validation_terenuri.json', exc_info=True)
            return jsonify({'error': str(e)}), 500

    return jsonify(validation_data)

@app.route('/api/markdown_description', methods=['POST'])
def get_markdown_description():
    if 'user' not in session:
        return jsonify({'message': 'Unauthorized'}), 401

    data = request.get_json()
    description = data.get('description', '')

    if not description:
        return jsonify({'message': 'Description is required'}), 400

    markdown_text = markdown_description(description)
    return jsonify({'markdown': markdown_text})

@app.route('/api/markdown', methods=['POST'])
def generate_markdown():
    if 'user' not in session:
        return jsonify({'message': 'Unauthorized'}), 401

    data = request.get_json()
    description = data.get('description', '')

    if not description:
        return jsonify({'message': 'Description is required'}), 400

    markdown_text = markdown_description(description)
    return jsonify({'markdown': markdown_text})

# Fallback route for React Router
@app.errorhandler(404)
def not_found(e):
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True)
