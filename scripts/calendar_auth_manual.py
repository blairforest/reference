import os, pickle, sys, json
from oauthlib.oauth2 import WebApplicationClient
import requests
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

creds_path = os.path.expanduser('~/.openclaw/workspace/credentials.json')
token_path = os.path.expanduser('~/.openclaw/workspace/calendar_token.pickle')
code_path = '/home/joel/.openclaw/vault/CALENDAR_AUTH_CODE'

with open(creds_path, 'r') as f:
    config = json.load(f)['installed']

def exchange_code(auth_code):
    data = {
        'code': auth_code,
        'client_id': config['client_id'],
        'client_secret': config['client_secret'],
        'redirect_uri': 'urn:ietf:wg:oauth:2.0:oob',
        'grant_type': 'authorization_code'
    }
    response = requests.post(config['token_uri'], data=data)
    if response.status_code == 200:
        token_data = response.json()
        creds = Credentials(
            token=token_data['access_token'],
            refresh_token=token_data.get('refresh_token'),
            token_uri=config['token_uri'],
            client_id=config['client_id'],
            client_secret=config['client_secret'],
            scopes=['https://www.googleapis.com/auth/calendar.events']
        )
        with open(token_path, 'wb') as token:
            pickle.dump(creds, token)
        
        service = build('calendar', 'v3', credentials=creds)
        start = '2026-03-09T08:30:00'
        end = '2026-03-09T10:30:00'
        event = {
            'summary': 'Workout',
            'location': 'Base Gym',
            'description': 'Scheduled workout session in Florida.',
            'start': {'dateTime': start, 'timeZone': 'America/Chicago'},
            'end': {'dateTime': end, 'timeZone': 'America/Chicago'},
            'attendees': [{'email': 'blair.joelblair@gmail.com'}],
        }
        event = service.events().insert(calendarId='primary', body=event).execute()
        print(f'SUCCESS: {event.get("htmlLink")}')
        return True
    else:
        print(f'ERROR: {response.text}')
        return False

if __name__ == "__main__":
    if os.path.exists(code_path):
        with open(code_path, 'r') as f:
            code = f.read().strip()
        if exchange_code(code):
            os.remove(code_path)
