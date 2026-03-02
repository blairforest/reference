import os, pickle, sys
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

def main(auth_code):
    creds_path = os.path.expanduser('~/.openclaw/workspace/credentials.json')
    token_path = os.path.expanduser('~/.openclaw/workspace/calendar_token.pickle')
    
    # We must use a flow WITHOUT PKCE (code_challenge) because we can't persist the verifier easily between shell calls
    # or we use a custom flow that doesn't enforce it if the server allows.
    # Alternatively, we just use the simple flow.
    try:
        # Note: newer versions of google-auth-oauthlib might require a different approach for OOB
        # Let's try the most basic flow construction
        flow = InstalledAppFlow.from_client_secrets_file(
            creds_path, 
            ['https://www.googleapis.com/auth/calendar.events'],
            redirect_uri='urn:ietf:wg:oauth:2.0:oob'
        )
        
        # Manually set the flow state to skip the internal fetch_token PKCE check if possible
        # Or better: just try to fetch it.
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
            'start': {
                'dateTime': start,
                'timeZone': 'America/Chicago',
            },
            'end': {
                'dateTime': end,
                'timeZone': 'America/Chicago',
            },
            'attendees': [
                {'email': 'blair.joelblair@gmail.com'},
            ],
        }
        event = service.events().insert(calendarId='primary', body=event).execute()
        print(f'SUCCESS: {event.get("htmlLink")}')
        return True
    except Exception as e:
        print(f'ERROR: {str(e)}')
        return False

if __name__ == "__main__":
    code_path = '/home/joel/.openclaw/vault/CALENDAR_AUTH_CODE'
    if os.path.exists(code_path):
        with open(code_path, 'r') as f:
            code = f.read().strip()
        if main(code):
            os.remove(code_path)
    else:
        print('CODE_FILE_MISSING')
