
def test_register_and_login(client):
    register = client.post(
        '/auth/register',
        json={'email': 'admin@example.com', 'password': 'pass1234'},
    )
    assert register.status_code == 200

    login = client.post(
        '/auth/login',
        json={'email': 'admin@example.com', 'password': 'pass1234'},
    )
    assert login.status_code == 200
    data = login.json()
    assert 'access_token' in data
    assert data['token_type'] == 'bearer'

    token_login = client.post(
        '/auth/token',
        data={'username': 'admin@example.com', 'password': 'pass1234'},
    )
    assert token_login.status_code == 200
    token_data = token_login.json()
    assert 'access_token' in token_data
    assert token_data['token_type'] == 'bearer'
