import pytest


async def _register_and_login(async_client, email='admin@example.com', password='pass1234'):
    register = await async_client.post('/auth/register', json={'email': email, 'password': password})
    assert register.status_code == 200
    login = await async_client.post('/auth/token', data={'username': email, 'password': password})
    assert login.status_code == 200
    return login.json()['access_token']


@pytest.mark.anyio
async def test_progress_flow(async_client):
    token = await _register_and_login(async_client)
    headers = {'Authorization': f'Bearer {token}'}

    module_res = await async_client.post(
        '/modules/',
        json={'title': 'Algebra 1', 'description': 'Basics'},
        headers=headers,
    )
    assert module_res.status_code == 200
    module_id = module_res.json()['id']

    progress_res = await async_client.post(
        '/progress/',
        json={'module_id': module_id, 'xp': 15},
        headers=headers,
    )
    assert progress_res.status_code == 200
    assert progress_res.json()['xp'] == 15

    progress_list = await async_client.get('/progress/', headers=headers)
    assert progress_list.status_code == 200
    assert len(progress_list.json()) == 1

    summary = await async_client.get('/progress/summary', headers=headers)
    assert summary.status_code == 200
    assert summary.json()['total_xp'] == 15

    progress_again = await async_client.post(
        '/progress/',
        json={'module_id': module_id, 'xp': 5},
        headers=headers,
    )
    assert progress_again.status_code == 400

    summary_again = await async_client.get('/progress/summary', headers=headers)
    assert summary_again.status_code == 200
    assert summary_again.json()['total_xp'] == 15
