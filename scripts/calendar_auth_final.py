import os, pickle, sys
import google_auth_oauthlib.flow
from googleapiclient.discovery import build

# Hardcode the redirect URI for OOB
REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'

def get_creds_and_event(auth_code):
    creds_path = os.path.expanduser('~/.openclaw/workspace/credentials.json')
    token_path = os.path.expanduser('~/.openclaw/workspace/calendar_token.pickle')
    
    # Use the lower-level Flow class to avoid PKCE enforcement if possible, 
    # or at least try to exchange the code.
    flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(
        creds_path,
        scopes=['https://www.googleapis.com/auth/calendar.events'],
        redirect_uri=REDIRECT_URI
    )
    
    try:
        flow.fetch_token(code=auth_code)
        creds = flow.credentials
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
    except Exception as e:
        print(f'ERROR: {str(e)}')

if __name__ == "__main__":
    code_path = '/home/joel/.openclaw/vault/CALENDAR_AUTH_CODE'
    if os.path.exists(code_path):
        with open(code_path, 'r') as f:
            code = f.read().strip()
        get_creds_and_event(code)
