import pytest


async def _register(async_client, email, password):
    return await async_client.post('/auth/register', json={'email': email, 'password': password})


async def _login(async_client, email, password):
    return await async_client.post('/auth/token', data={'username': email, 'password': password})


@pytest.mark.anyio
async def test_register_login(async_client):
    res = await _register(async_client, 'admin@example.com', 'pass1234')
    assert res.status_code == 200

    login = await _login(async_client, 'admin@example.com', 'pass1234')
    assert login.status_code == 200
    data = login.json()
    assert 'access_token' in data
    assert data['token_type'] == 'bearer'


@pytest.mark.anyio
async def test_protected_endpoints_401(async_client):
    res = await async_client.get('/progress/')
    assert res.status_code == 401


@pytest.mark.anyio
async def test_admin_actions(async_client):
    res_admin = await _register(async_client, 'admin@example.com', 'pass1234')
    assert res_admin.status_code == 200
    res_user = await _register(async_client, 'user@example.com', 'pass1234')
    assert res_user.status_code == 200

    admin_login = await _login(async_client, 'admin@example.com', 'pass1234')
    admin_token = admin_login.json()['access_token']

    user_login = await _login(async_client, 'user@example.com', 'pass1234')
    user_token = user_login.json()['access_token']

    user_create = await async_client.post(
        '/modules/',
        json={'title': 'Algebra 1', 'description': 'Basics'},
        headers={'Authorization': f'Bearer {user_token}'},
    )
    assert user_create.status_code == 403

    admin_create = await async_client.post(
        '/modules/',
        json={'title': 'Algebra 1', 'description': 'Basics'},
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert admin_create.status_code == 200

    promote = await async_client.post(
        '/users/promote',
        json={'email': 'user@example.com'},
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert promote.status_code == 200


@pytest.mark.anyio
async def test_progress_summary(async_client):
    res_admin = await _register(async_client, 'admin@example.com', 'pass1234')
    assert res_admin.status_code == 200

    login = await _login(async_client, 'admin@example.com', 'pass1234')
    token = login.json()['access_token']
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

    summary = await async_client.get('/progress/summary', headers=headers)
    assert summary.status_code == 200
    assert summary.json()['total_xp'] == 15
