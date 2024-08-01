import json
import os
from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from flask_session import Session
import logging
import pandas as pd
import numpy as np
import re
import difflib
import asyncio
from werkzeug.security import generate_password_hash, check_password_hash
from opencage.geocoder import OpenCageGeocode
from openai import OpenAI
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor

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

# Load the zones JSON file
zones_data = []
zones_file_path = os.path.join(os.path.dirname(__file__), 'zone_mapping.json')
try:
    with open(zones_file_path, 'r') as f:
        zones_data = json.load(f)
except Exception as e:
    logging.error(f"Error loading zone_mapping.json: {e}")


# Route to serve the zone_mapping.json file
@app.route('/zone_mapping')
def zone_mapping():
    try:
        return send_from_directory(os.path.dirname(__file__), 'zone_mapping.json')
    except Exception as e:
        app.logger.error(f"Error serving zone_mapping.json: {e}")
        return jsonify({'message': 'File not found'}), 404

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

# Initialize OpenAI API key using the new OpenAI client
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

@app.route('/api/data', methods=['POST'])
def get_data():
    if 'user' not in session:
        app.logger.warning("Unauthorized access attempt")
        return jsonify({'message': 'Unauthorized'}), 401

    data = request.get_json()
    if data.get('data') == 'trigger':
        app.logger.info('Special input received!')
        response = {'alert': 'Special input received!'}
    else:
        response = {'data': data.get('data')}
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

def get_zone_details(zone_name):
    zone_name_lower = zone_name.lower()
    closest_match = difflib.get_close_matches(zone_name_lower, [zone['zone'].lower() for zone in zones_data], n=1, cutoff=0.1)
    if closest_match:
        return next((zone for zone in zones_data if zone['zone'].lower() == closest_match[0]), None)
    return None

def extract_address(description):
    address_pattern = re.compile(
        r'\b(strada|str|drumul|calea|bd|bulevardul|intrarea|piata|p-ta|al|aleea|adresa|int|intrarea)\s+\w+(\s+nr\.?\s*\d+)?',
        re.IGNORECASE)
    address_match = address_pattern.search(description)
    if address_match:
        return address_match.group(0).strip()
    return None

@app.route('/api/update_validation_geocodes', methods=['POST'])
def update_validation_geocodes():
    if 'user' not in session or session.get('role') not in ['admin', 'employee']:
        return jsonify({'message': 'Unauthorized'}), 401

    validation_file_path = os.path.join(os.path.dirname(__file__), 'validation_terenuri.json')

    try:
        with open(validation_file_path, 'r') as json_file:
            validation_data = json.load(json_file)

        for property in validation_data:
            if 'latitude' not in property or 'longitude' not in property:
                address = property.get('short_description')
                lat, lon = geocode_address(address)
                if lat and lon:
                    property['latitude'] = lat
                    property['longitude'] = lon

        with open(validation_file_path, 'w') as json_file:
            json.dump(validation_data, json_file, indent=4)

        return jsonify(validation_data)
    except Exception as e:
        app.logger.error('Error updating validation_terenuri.json', exc_info=True)
        return jsonify({'error': str(e)}), 500

def geocode_address(address):
    try:
        if not opencage_api_key:
            app.logger.error("OpenCage API key is not set")
            return None, None
        app.logger.info(f"Geocoding address: {address}")
        result = geocoder.geocode(address)
        if result and len(result):
            location = result[0]['geometry']
            app.logger.info(f"Geocoding successful: {address} -> ({location['lat']}, {location['lng']})")
            return location['lat'], location['lng']
        else:
            app.logger.error(f"No geocoding result found for address: {address}")
            return None, None
    except Exception as e:
        app.logger.error(f"Error occurred during geocoding: {e}")
        return None, None

@app.route('/api/convert', methods=['GET'])
def convert_xlsx_to_json():
    if 'user' not in session:
        app.logger.warning("Unauthorized access attempt")
        return jsonify({'message': 'Unauthorized'}), 401

    xlsx_path = os.path.join(os.path.dirname(__file__), '123.xlsx')
    app.logger.info(f"Loading Excel file from path: {xlsx_path}")

    try:
        if not os.path.exists(xlsx_path):
            app.logger.error(f"Excel file does not exist at path: {xlsx_path}")
            return jsonify({'error': 'Excel file not found'}), 404

        df = pd.read_excel(xlsx_path, engine='openpyxl')
        app.logger.info("Excel file loaded successfully")

        df.columns = ['ID', 'Zone', 'Price', 'Type', 'Square Meters', 'Description', 'Proprietor', 'Phone Number',
                      'Days Since Posted', 'Date and Time Posted']

        def clean_price(price):
            try:
                return float(price.replace(' EUR', '').replace('.', '').replace(',', '').strip())
            except (ValueError, AttributeError):
                app.logger.error(f"Error cleaning price: {price}")
                return None  # Handle non-numeric prices gracefully

        df['Price'] = df['Price'].apply(clean_price)
        df['Square Meters'] = df['Square Meters'].apply(extract_numbers_before_mp)

        df['short_description'] = df.apply(
            lambda row: generate_short_description(row['Description']) if row['Type'] == 'Teren intravilan' else row['Description'],
            axis=1
        )

        async def generate_markdown(description):
            return markdown_description(description)

        async def process_markdown_descriptions(descriptions):
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                futures = [loop.run_in_executor(executor, asyncio.wait_for(generate_markdown(desc), timeout=120)) for desc in descriptions]
                return await asyncio.gather(*futures)

        # Get list of descriptions
        descriptions = df['Description'].tolist()

        # Run the asynchronous processing
        markdown_descriptions = asyncio.run(process_markdown_descriptions(descriptions))

        df['markdown_description'] = markdown_descriptions

        df = df.replace({np.nan: None})

        json_data = df.to_dict(orient='records')

        app.logger.info("Saving JSON data to file")
        json_file_path = os.path.join(os.path.dirname(__file__), '123.json')
        teren_intravilan_file_path = os.path.join(os.path.dirname(__file__), 'teren_intravilan.json')
        validation_terenuri_file_path = os.path.join(os.path.dirname(__file__), 'validation_terenuri.json')

        with open(json_file_path, 'w') as json_file:
            json.dump(json_data, json_file, indent=4)

        df_teren_intravilan = df[df['Type'] == 'Teren intravilan']
        json_data_teren_intravilan = df_teren_intravilan.to_dict(orient='records')

        with open(teren_intravilan_file_path, 'w') as json_file:
            json.dump(json_data_teren_intravilan, json_file, indent=4)

        global admin_data
        admin_data = json_data

        return jsonify(json_data)
    except Exception as e:
        app.logger.error(f'Error processing the XLSX file: {e}', exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/get_json_data', methods=['GET'])
def get_json_data():
    file_type = request.args.get('type', 'all')
    if file_type == 'teren_intravilan':
        json_file_path = os.path.join(os.path.dirname(__file__), 'teren_intravilan.json')
    elif file_type == 'casa_single':
        json_file_path = os.path.join(os.path.dirname(__file__), 'casa_single.json')
    elif file_type == 'spatiu_comercial':
        json_file_path = os.path.join(os.path.dirname(__file__), 'spatiu_comercial.json')
    elif file_type == 'validation_terenuri':
        json_file_path = os.path.join(os.path.dirname(__file__), 'validation_terenuri.json')
    else:
        json_file_path = os.path.join(os.path.dirname(__file__), '123.json')

    if not os.path.exists(json_file_path):
        return jsonify({'message': 'JSON file not found'}), 404

    with open(json_file_path, 'r') as json_file:
        json_data = json.load(json_file)

    # Check for markdown_description and generate it if missing
    for entry in json_data:
        if not entry.get('markdown_description'):
            entry['markdown_description'] = markdown_description(entry['Description'])

    # Save the updated JSON data
    with open(json_file_path, 'w') as json_file:
        json.dump(json_data, json_file, indent=4)

    return jsonify(json_data)


@app.route('/api/delete_row', methods=['POST'])
def delete_row():
    if 'user' not in session:
        app.logger.warning("Unauthorized access attempt")
        return jsonify({'message': 'Unauthorized'}), 401

    data = request.get_json()
    row_id = data.get('id')

    xlsx_path = os.path.join(os.path.dirname(__file__), '123.xlsx')
    try:
        df = pd.read_excel(xlsx_path)
        df.columns = ['ID', 'Zone', 'Price', 'Type', 'Square Meters', 'Description', 'Proprietor', 'Phone Number',
                      'Days Since Posted', 'Date and Time Posted']

        df = df[df['ID'] != row_id]

        df.to_excel(xlsx_path, index=False)

        global admin_data
        admin_data = df.to_dict(orient='records')

        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error('Error deleting row from the XLSX file', exc_info=True)
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

@app.route('/api/send_to_validation', methods['POST'])
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
    # Add any logic needed to mark the data as new
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
            model="gpt-4o",
            messages=[
                {"role": "user", "content": prompt},
            ],
            max_tokens=500,
            n=1,
            stop=None,
            temperature=0.9
        )
        markdown_text = response.choices[0].message.content.strip()
        return markdown_text
    except Exception as e:
        app.logger.error(f"Error generating markdown: {e}")
        return description  # Return the original description if there's an error


if __name__ == '__main__':
    app.run(debug=True)
