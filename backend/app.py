import argparse
import asyncio
import uvloop
import os

from sanic import Sanic
from sanic.response import json


PAGE_SIZE = 100
files = None


def list_files(request):
    global files
    if not files:
        files = os.listdir(request.app.args.directory)
    page = int(request.args.get('page', 0))
    start = page * PAGE_SIZE
    end = (page + 1) * PAGE_SIZE
    return json({'status': 'ok', 'page': page, 'files': files[start:end]})


ROUTES = {
    '/api/file': list_files,
}


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', default=9093, type=int)
    parser.add_argument('-d', '--directory', default='./images', help='Directory with source images')
    return parser.parse_args()


async def run_server(loop, args, host='127.0.0.1', port=9093):
    app = Sanic('label_tool')
    app.args = args
    for uri, func in ROUTES.items():
        app.add_route(func, uri)
    app.static('/api/static/', args.directory)
    await app.create_server(host, port)


def main(args):
    loop = uvloop.new_event_loop()
    asyncio.set_event_loop(loop)
    asyncio.ensure_future(run_server(loop, args))
    loop.run_forever()


if __name__ == '__main__':
    main(parse_args())
