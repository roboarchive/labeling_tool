import argparse
import asyncio
import os
from shutil import copy

import uvloop
from sanic import Sanic
from sanic.response import json
from tipsi_tools.python import rel_path
from tipsi_tools.unix import asucc, cd

PAGE_SIZE = 100
files = None


def list_files(request):
    global files
    if not files:
        files = os.listdir(request.app.args.directory)
    page = int(request.args.get("page", 0))
    start = page * PAGE_SIZE
    end = (page + 1) * PAGE_SIZE
    return json({"status": "ok", "page": page, "files": files[start:end]})


BROOM_PATH = "/home/kpi/devel/github/roboarchive-broom"
DENOIZE_CMD = "./venv/bin/python process_image.py -i {}"
RAW_BASE = rel_path("./train-bbox/raw/samples")
CLEAN_BASE = rel_path("./train-bbox/clean/samples")


async def denoize(request):
    name = request.args.get("name")
    full_name = rel_path(os.path.join(request.app.args.directory, name))
    if not os.path.exists(full_name):
        return json({}, status=404)
    async with request.app.denoize_lock:
        with cd(BROOM_PATH):
            ret, stdout, stderr = await asucc(DENOIZE_CMD.format(full_name), check_stderr=False)
            assert ret == 0
        src_output = os.path.join(BROOM_PATH, "output.png")
        dst_output = os.path.join(RAW_BASE, name)
        copy(src_output, dst_output)
        return json({"name": name})


ROUTES = {"/api/file": list_files}


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=9093, type=int)
    parser.add_argument(
        "-d", "--directory", default="./images", help="Directory with source images"
    )
    return parser.parse_args()


async def run_server(loop, args, host="127.0.0.1", port=9093):
    app = Sanic("label_tool")
    app.args = args
    app.denoize_lock = asyncio.Lock(loop=loop)

    for uri, func in ROUTES.items():
        app.add_route(func, uri)
    app.static("/api/static/", args.directory)
    await app.create_server(host, port)


def main(args):
    loop = uvloop.new_event_loop()
    asyncio.set_event_loop(loop)
    asyncio.ensure_future(run_server(loop, args))
    loop.run_forever()


if __name__ == "__main__":
    main(parse_args())
