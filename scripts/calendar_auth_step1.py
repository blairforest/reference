import os, pickle
from google_auth_oauthlib.flow import InstalledAppFlow

creds_path = os.path.expanduser('~/.openclaw/workspace/credentials.json')
state_path = os.path.expanduser('~/.openclaw/workspace/calendar_flow_state.pickle')

flow = InstalledAppFlow.from_client_secrets_file(
    creds_path, 
    ['https://www.googleapis.com/auth/calendar.events'],
    redirect_uri='urn:ietf:wg:oauth:2.0:oob'
)
auth_url, _ = flow.authorization_url(access_type='offline', prompt='consent')

# Save the flow object to preserve the code_verifier
with open(state_path, 'wb') as f:
    pickle.dump(flow, f)

print(f'AUTHORIZATION_URL: {auth_url}')
