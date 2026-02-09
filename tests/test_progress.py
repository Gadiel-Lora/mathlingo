
def _register_and_login(client, email='admin@example.com', password='pass1234'):
    register = client.post('/auth/register', json={'email': email, 'password': password})
    assert register.status_code == 200
    login = client.post('/auth/token', data={'username': email, 'password': password})
    assert login.status_code == 200
    return login.json()['access_token']


def test_progress_flow(client):
    token = _register_and_login(client)
    headers = {'Authorization': f'Bearer {token}'}

    module_res = client.post(
        '/modules/',
        json={'title': 'Algebra 1', 'description': 'Basics'},
        headers=headers,
    )
    assert module_res.status_code == 200
    module_id = module_res.json()['id']

    progress_res = client.post(
        '/progress/',
        json={'module_id': module_id, 'xp': 15},
        headers=headers,
    )
    assert progress_res.status_code == 200
    assert progress_res.json()['xp'] == 15

    progress_list = client.get('/progress/', headers=headers)
    assert progress_list.status_code == 200
    assert len(progress_list.json()) == 1

    summary = client.get('/progress/summary', headers=headers)
    assert summary.status_code == 200
    assert summary.json()['total_xp'] == 15

    progress_again = client.post(
        '/progress/',
        json={'module_id': module_id, 'xp': 5},
        headers=headers,
    )
    assert progress_again.status_code == 200
    assert progress_again.json()['xp'] == 20

    summary_again = client.get('/progress/summary', headers=headers)
    assert summary_again.status_code == 200
    assert summary_again.json()['total_xp'] == 20
