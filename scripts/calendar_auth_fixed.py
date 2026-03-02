import os, pickle, sys
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

creds_path = os.path.expanduser('~/.openclaw/workspace/credentials.json')
token_path = os.path.expanduser('~/.openclaw/workspace/calendar_token.pickle')
code_path = '/home/joel/.openclaw/vault/CALENDAR_AUTH_CODE'

def main():
    # Force a flow that doesn't use PKCE or uses a static redirect if possible
    # For OOB in a script, we need to handle the verifier manually if the lib enforces it.
    
    if len(sys.argv) > 1:
        auth_code = sys.argv[1]
    else:
        if os.path.exists(code_path):
            with open(code_path, 'r') as f:
                auth_code = f.read().strip()
        else:
            # Step 1: Generate URL and keep process alive
            flow = InstalledAppFlow.from_client_secrets_file(
                creds_path, 
                ['https://www.googleapis.com/auth/calendar.events'],
                redirect_uri='urn:ietf:wg:oauth:2.0:oob'
            )
            auth_url, _ = flow.authorization_url(access_type='offline')
            print(f'AUTHORIZATION_URL: {auth_url}')
            print('WAITING_FOR_CODE')
            
            # Use input() to wait for the user in the same process
            new_code = input('Enter the code: ').strip()
            flow.fetch_token(code=new_code)
            creds = flow.credentials
            
            with open(token_path, 'wb') as token:
                pickle.dump(creds, token)
            print('TOKEN_SAVED')
            return

    # If we already have the code and just want to try a legacy flow
    # (Note: Most Google apps now require PKCE for InstalledAppFlow)
    # The trick is to stay in one process.
    print('PROCESS_RESTART_REQUIRED')

if __name__ == "__main__":
    main()
