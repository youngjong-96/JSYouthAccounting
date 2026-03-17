import requests

# Login as master
login_resp = requests.post('http://localhost:8000/api/accounts/login/', json={
    'username': 'master',
    'password': 'master1234!'
})

if login_resp.status_code != 200:
    print("Login failed:", login_resp.text)
    exit()

token = login_resp.json()['tokens']['access']
headers = {'Authorization': f'Bearer {token}'}

# Get users
users_resp = requests.get('http://localhost:8000/api/accounts/users/', headers=headers)
if users_resp.status_code != 200:
    print("Failed to get users:", users_resp.text)
    exit()

users = users_resp.json()
print("Users:", users)

# Find a non-master user to patch
target_user = next((u for u in users if u['username'] != 'master'), None)
if target_user:
    print(f"Patching user {target_user['id']}...")
    patch_resp = requests.patch(f"http://localhost:8000/api/accounts/users/{target_user['id']}/", json={
        'role': 'viewer'
    }, headers=headers)
    print("Patch response:", patch_resp.status_code, patch_resp.text)
else:
    print("No target user found to patch.")
