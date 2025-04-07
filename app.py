from flask import Flask, render_template, request, jsonify, send_from_directory
import os
from dotenv import load_dotenv
import requests

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Get Mistral API key from environment variable
MISTRAL_API_KEY = os.getenv('MISTRAL_API_KEY')

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/static/models/<path:filename>')
def serve_model(filename):
    return send_from_directory('static/models', filename)

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        if not MISTRAL_API_KEY:
            return jsonify({'error': 'Mistral API key not configured'}), 500

        message = request.json.get('message')
        if not message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Call Mistral AI API
        response = requests.post(
            'https://api.mistral.ai/v1/chat/completions',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {MISTRAL_API_KEY}'
            },
            json={
                'model': 'mistral-tiny',
                'messages': [{'role': 'user', 'content': message}]
            }
        )
        
        if response.status_code != 200:
            return jsonify({'error': 'Error from Mistral AI API'}), 500
        
        data = response.json()
        ai_response = data['choices'][0]['message']['content']
        
        return jsonify({'response': ai_response})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Ensure the static/models directory exists
    os.makedirs('static/models', exist_ok=True)
    app.run(debug=True, port=8000) 