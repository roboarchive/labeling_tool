import asyncio
import json
from unittest.mock import MagicMock

import pytest

from app import denoize


@pytest.fixture
def req_mock(event_loop):
    with MagicMock() as mm:
        mm.app.args.directory = './images'
        mm.app.denoize_lock = asyncio.Lock(loop=event_loop)
        mm.args = {'name': 'l1-pic0.jpg'}
        yield mm


@pytest.mark.manual
@pytest.mark.asyncio
async def test_simple_denoize(req_mock):
    print(req_mock.args.get("name"))
    resp = await denoize(req_mock)
    resp = json.loads(resp.body)
    assert "name" in resp
