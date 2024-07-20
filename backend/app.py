import json
import os
from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from flask_session import Session
import logging
import pandas as pd
import numpy as np
import re
import markdown
from werkzeug.security import generate_password_hash, check_password_hash
import difflib
import fitz  # PyMuPDF for PDF processing
import cv2  # OpenCV for image processing

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
zones_file_path = os.path.join(os.path.dirname(__file__), 'zones.json')
try:
    with open(zones_file_path, 'r') as f:
        zones_data = json.load(f)
except Exception as e:
    logging.error(f"Error loading zones.json: {e}")

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
        matches = re.findall(r'\b(\d+)\s*mp\b', text, re.IGNORECASE)
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

def extract_details(description, zone_name):
    details = {
        "Adresa": None,
        "Zona": None,
        "Distante": [],
        "Dimensiuni": None,
        "TipZona": None,
        "SpatiuComercial": None,
        "Apartament": None,
        "Anexa": None,
        "Total": None,
        "GradSeismic": None,
        "IntrarileSeparate": None,
        "Racordari": [],
        "Acte": None,
        "Pret": None,
        "ZoneDetails": None
    }

    zone_details = get_zone_details(zone_name)
    if zone_details:
        details["ZoneDetails"] = zone_details

    # Extract address with "nr" and number
    address_pattern = re.compile(
        r'(strada|str|drumul|calea|bd|bulevardul|intrarea|piata|p-ta|al|aleea|Adresa)\s[\w\s-]+,?\s?nr\.?\s?\d+',
        re.IGNORECASE)
    address_match = address_pattern.search(description)
    if address_match:
        details["Adresa"] = address_match.group(0).strip()

    # Extract zone information
    zone_pattern = re.compile(r'zona\s([\w\s]+)', re.IGNORECASE)
    zone_match = zone_pattern.search(description)
    if zone_match:
        details["Zona"] = zone_match.group(1).strip()

    # Extract distances
    distance_pattern = re.compile(r'(\d+\s*m\s*de\s*[\w\s]+)', re.IGNORECASE)
    distances = distance_pattern.findall(description)
    details["Distante"] = distances

    # Extract dimensions
    dimensions_pattern = re.compile(
        r'(lungime(?: de)?\s*\d+\s*m)\s*si\s*(latime(?: de)?\s*\d+\s*m)', re.IGNORECASE)
    dimensions_match = dimensions_pattern.search(description)
    if dimensions_match:
        details["Dimensiuni"] = f"Lungime: {dimensions_match.group(1)}, Latime: {dimensions_match.group(2)}"

    # Extract type of residential area
    tip_zona_pattern = re.compile(r'zona rezidentiala de tip ([\w\s\-]+)', re.IGNORECASE)
    tip_zona_match = tip_zona_pattern.search(description)
    if tip_zona_match:
        details["TipZona"] = tip_zona_match.group(1).strip()

    # Extract commercial space details
    spatiu_comercial_pattern = re.compile(r'spatiul comercial(?: aproximativ)?\s*\d+\s*mp', re.IGNORECASE)
    spatiu_comercial_match = spatiu_comercial_pattern.search(description)
    if spatiu_comercial_match:
        details["SpatiuComercial"] = spatiu_comercial_match.group(0).strip()

    # Extract apartment details
    apartament_pattern = re.compile(r'apartamentul \d+ camere', re.IGNORECASE)
    apartament_match = apartament_pattern.search(description)
    if apartament_match:
        details["Apartament"] = apartament_match.group(0).strip()

    # Extract annex details
    anexa_pattern = re.compile(r'anexa in curte tip garsoniera formata din.*?(?=\.)', re.IGNORECASE)
    anexa_match = anexa_pattern.search(description)
    if anexa_match:
        details["Anexa"] = anexa_match.group(0).strip()

    # Extract total area
    total_pattern = re.compile(r'total \d+\s*mp', re.IGNORECASE)
    total_match = total_pattern.search(description)
    if total_match:
        details["Total"] = total_match.group(0).strip()

    # Extract seismic grade
    grad_seismic_pattern = re.compile(r'cladirea nu are grad seismic', re.IGNORECASE)
    grad_seismic_match = grad_seismic_pattern.search(description)
    if grad_seismic_match:
        details["GradSeismic"] = grad_seismic_match.group(0).strip()

    # Extract separate entries
    intrarile_separate_pattern = re.compile(r'intrarile sunt separate si pot avea continuitate daca se doreste', re.IGNORECASE)
    intrarile_separate_match = intrarile_separate_pattern.search(description)
    if intrarile_separate_match:
        details["IntrarileSeparate"] = intrarile_separate_match.group(0).strip()

    # Extract utility connections
    racordari_pattern = re.compile(r'racordate la (apa|gaze|lumina)', re.IGNORECASE)
    racordari = racordari_pattern.findall(description)
    details["Racordari"] = racordari

    # Extract document status
    acte_pattern = re.compile(r'acte la zi', re.IGNORECASE)
    acte_match = acte_pattern.search(description)
    if acte_match:
        details["Acte"] = acte_match.group(0).strip()

    # Extract price
    pret_pattern = re.compile(r'pret \d+\s*euro discutabil', re.IGNORECASE)
    pret_match = pret_pattern.search(description)
    if pret_match:
        details["Pret"] = pret_match.group(0).strip()

    return details

def format_description(description, zone_name):
    if len(description.split()) < 20:  # Assuming short description is less than 20 words
        return description

    details = extract_details(description, zone_name)
    formatted_description = ""

    if details["Adresa"]:
        formatted_description += f"- **Adresa postala:** {details['Adresa']}\n"
    if details["Zona"]:
        formatted_description += f"- **Zona:** {details['Zona']}\n"
    if details["Distante"]:
        formatted_description += "- **Distante:**\n"
        for distanta in details["Distante"]:
            formatted_description += f"  - {distanta}\n"
    if details["Dimensiuni"]:
        formatted_description += f"- **Dimensiuni:** {details['Dimensiuni']}\n"
    if details["TipZona"]:
        formatted_description += f"- **TipZona:** {details['TipZona']}\n"
    if details["SpatiuComercial"]:
        formatted_description += f"- **Spatiu Comercial:** {details['SpatiuComercial']}\n"
    if details["Apartament"]:
        formatted_description += f"- **Apartament:** {details['Apartament']}\n"
    if details["Anexa"]:
        formatted_description += f"- **Anexa:** {details['Anexa']}\n"
    if details["Total"]:
        formatted_description += f"- **Total:** {details['Total']}\n"
    if details["GradSeismic"]:
        formatted_description += f"- **Grad Seismic:** {details['GradSeismic']}\n"
    if details["IntrarileSeparate"]:
        formatted_description += f"- **Intrarile Separate:** {details['IntrarileSeparate']}\n"
    if details["Racordari"]:
        formatted_description += "- **Racordari:**\n"
        for racordare in details["Racordari"]:
            formatted_description += f"  - {racordare}\n"
    if details["Acte"]:
        formatted_description += f"- **Acte:** {details['Acte']}\n"
    if details["Pret"]:
        formatted_description += f"- **Pret:** {details['Pret']}\n"
    if details["ZoneDetails"]:
        formatted_description += f"- **POT:** {details['ZoneDetails']['pot']}\n"
        formatted_description += f"- **CUT:** {details['ZoneDetails']['cut']}\n"
        formatted_description += f"- **Obiecții:** {details['ZoneDetails']['obiectii']}\n"
        formatted_description += f"- **Delimitare:** {details['ZoneDetails']['delimitare']}\n"

    # Convert Markdown to HTML
    html_description = markdown.markdown(formatted_description)

    return html_description


# Convert XLSX to JSON endpoint
@app.route('/api/convert', methods=['GET'])
def convert_xlsx_to_json():
    if 'user' not in session:
        app.logger.warning("Unauthorized access attempt")
        return jsonify({'message': 'Unauthorized'}), 401

    xlsx_path = os.path.join(os.path.dirname(__file__), '123.xlsx')
    try:
        df = pd.read_excel(xlsx_path)

        # Ensure correct column headers
        df.columns = ['ID', 'Zone', 'Price', 'Type', 'Square Meters', 'Description', 'Proprietor', 'Phone Number',
                      'Days Since Posted', 'Date and Time Posted']

        # Remove "EUR" from the Price column and keep only digits
        def clean_price(price):
            try:
                return float(price.replace(' EUR', '').replace('.', '').replace(',', '').strip())
            except (ValueError, AttributeError):
                return None  # Handle non-numeric prices gracefully

        df['Price'] = df['Price'].apply(clean_price)

        # Use extract_numbers_before_mp to clean "Square Meters" column
        df['Square Meters'] = df['Square Meters'].apply(extract_numbers_before_mp)

        # Format the Description column
        df['Description'] = df.apply(lambda row: format_description(row['Description'], row['Zone']), axis=1)

        # Replace NaN values with None (null in JSON)
        df = df.replace({np.nan: None})

        # Convert DataFrame to JSON
        json_data = df.to_dict(orient='records')

        # Save the JSON data to a file
        json_file_path = os.path.join(os.path.dirname(__file__), '123.json')
        with open(json_file_path, 'w') as json_file:
            json.dump(json_data, json_file, indent=4)

        # Update the in-memory admin_data
        global admin_data
        admin_data = json_data

        return jsonify(json_data)
    except Exception as e:
        app.logger.error('Error processing the XLSX file', exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/get_json_data', methods=['GET'])
def get_json_data():
    json_file_path = os.path.join(os.path.dirname(__file__), '123.json')
    if not os.path.exists(json_file_path):
        return jsonify({'message': 'JSON file not found'}), 404
    with open(json_file_path, 'r') as json_file:
        json_data = json.load(json_file)
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

        # Delete the row from the DataFrame
        df = df[df['ID'] != row_id]

        # Save the updated DataFrame back to the Excel file
        df.to_excel(xlsx_path, index=False)

        # Update the in-memory admin_data
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

    # Ensure the custom questions are added to the employee data
    custom_questions = data.get('questions', [])
    row_to_send = {**data, 'questions': custom_questions}

    global admin_data, employee_data
    admin_data = [row for row in admin_data if row['ID'] != data['ID']]

    employee_data.append(row_to_send)  # Also add to employee_data

    return jsonify({'status': 'success'})

@app.route('/api/send_to_validation', methods=['POST'])
def send_to_validation():
    if 'user' not in session or session.get('role') != 'employee':
        app.logger.warning("Unauthorized access attempt")
        return jsonify({'message': 'Unauthorized'}), 401

    data = request.get_json()

    global employee_data, validation_data
    employee_data = [row for row in employee_data if row['ID'] != data['ID']]

    validation_data.append(data)  # Add to validation_data

    return jsonify({'status': 'success'})

@app.route('/api/save_details', methods=['POST'])
def save_details():
    if 'user' not in session or session.get('role') != 'employee':
        app.logger.warning("Unauthorized access attempt")
        return jsonify({'message': 'Unauthorized'}), 401
    data = request.get_json()
    app.logger.info(f"Received data for saving: {data}")
    # Update the corresponding row in employee_data
    for i, row in enumerate(employee_data):
        if row['ID'] == data['ID']:
            data = markAsNew(data)
            employee_data[i] = data
            validation_data.append(data)
            employee_data.pop(i)  # Remove the updated row from employee_data
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
    return jsonify(validation_data)

@app.route('/api/get_zone_info', methods=['POST'])
def get_zone_info():
    if 'user' not in session:
        app.logger.warning("Unauthorized access attempt")
        return jsonify({'message': 'Unauthorized'}), 401

    data = request.get_json()
    zone_name = data.get('zone')

    if not zone_name:
        return jsonify({'message': 'Zone name is required'}), 400

    zone_name_lower = zone_name.lower()
    all_zones = [zone['zone'].lower() for zone in zones_data]
    closest_match = difflib.get_close_matches(zone_name_lower, all_zones, n=1, cutoff=0.1)

    if closest_match:
        matching_zone = next((zone for zone in zones_data if zone['zone'].lower() == closest_match[0]), None)
        if matching_zone:
            app.logger.info(f"Found zone: {matching_zone}")
            return jsonify(matching_zone), 200
        else:
            app.logger.warning("Zone not found")
            return jsonify({'message': 'Zone not found'}), 404
    else:
        app.logger.warning("Zone not found")
        return jsonify({'message': 'Zone not found'}), 404

def markAsNew(data):
    data['isNew'] = True
    return data

@app.route('/api/extract_zones_from_pdf', methods=['POST'])
def extract_zones_from_pdf():
    if 'user' not in session:
        return jsonify({'message': 'Unauthorized'}), 401

    file = request.files['file']
    file_path = os.path.join(os.path.dirname(__file__), 'uploads', file.filename)
    file.save(file_path)

    zones = []

    try:
        pdf_document = fitz.open(file_path)
        for page_number in range(pdf_document.page_count):
            page = pdf_document.load_page(page_number)
            pix = page.get_pixmap()
            image_path = f"/tmp/page_{page_number}.png"
            pix.save(image_path)

            # Convert image to OpenCV format
            image = cv2.imread(image_path)
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150, apertureSize=3)

            contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            for contour in contours:
                epsilon = 0.02 * cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, epsilon, True)

                if len(approx) > 5:  # Assuming the red zones are complex polygons
                    coordinates = [(point[0][1], point[0][0]) for point in approx]  # Convert to (lat, lng)
                    zones.append({
                        'zone': f'Page {page_number + 1}',
                        'coordinates': coordinates
                    })

        return jsonify({'zones': zones}), 200
    except Exception as e:
        app.logger.error(f"Error processing PDF: {e}")
        return jsonify({'message': f'Error processing PDF: {str(e)}'}), 500

# Endpoint to serve uploaded files
@app.route('/uploads/<path:filename>', methods=['GET'])
def download_file(filename):
    return send_from_directory('uploads', filename)

if __name__ == "__main__":
    if not os.path.exists('uploads'):
        os.makedirs('uploads')
    app.run(host='0.0.0.0', port=5000)
