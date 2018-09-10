import argparse
import asyncio
import os
from shutil import copy

import uvloop
import yaml
from sanic import Sanic
from sanic.response import json
from tipsi_tools.python import rel_path
from tipsi_tools.unix import asucc, cd


def mkdirp(path):
    os.makedirs(path, exist_ok=True)
    return path


PAGE_SIZE = 100
files = None
processed_files = None
BROOM_PATH = rel_path('../../roboarchive-broom')
DENOIZE_CMD = "./venv/bin/python process_image.py -i {}"
RAW_BASE = rel_path("./train-bbox/raw/samples", check=False)
CLEAN_BASE = rel_path("./train-bbox/clean/samples", check=False)
STATIC_SRC = 'static/{}'
STATIC_DST = '{}'


def list_files(request):
    global files, processed_files
    if not files:
        files = sorted(os.listdir(request.app.args.directory))
    if not processed_files:
        processed_files = os.listdir(RAW_BASE)

    page = int(request.args.get("page", 0))
    start = page * PAGE_SIZE
    end = (page + 1) * PAGE_SIZE
    tgt_files = files[start:end]
    out_files = []
    for fname in tgt_files:
        out_files.append({'processed': fname in processed_files, 'name': fname})
    return json({"status": "ok", "page": page, "files": out_files})


async def denoize(request):
    global processed_files
    if not processed_files:
        processed_files = os.listdir(RAW_BASE)

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
        processed_files.append(name)
        return json({"name": name, 'src': STATIC_SRC.format(name), 'dst': STATIC_DST.format(name)})


async def bbox_handler(request, image_name):
    path = os.path.join(CLEAN_BASE, f'{image_name}.yaml')
    if request.method == 'GET':
        if not os.path.exists(path):
            bboxes = {}
        else:
            with open(path) as f:
                bboxes = yaml.load(f)
        return json({'bboxes': bboxes})
        return json({'method': 'GET'})
    elif request.method == 'POST':
        bboxes = request.json['bboxes']
        if not bboxes and os.path.exists(path):
            os.unlink(path)
        else:
            with open(path, 'w') as f:
                yaml.dump(bboxes, f)
        return json({'bboxes': bboxes})
    raise NotImplementedError


ROUTES = {
    '/api/file': list_files,
    '/api/denoize': denoize,
    '/api/bbox/<image_name>': {'handler': bbox_handler, 'methods': ['GET', 'POST']},
}


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=9093, type=int)
    parser.add_argument(
        "-d", "--directory", default="./images", help="Directory with source images"
    )
    parser.add_argument('-r', '--raw-base', default='./train-bbox/raw/samples')
    return parser.parse_args()


async def run_server(loop, args, host="127.0.0.1", port=9093):
    app = Sanic("label_tool")
    app.args = args
    app.denoize_lock = asyncio.Lock(loop=loop)

    for uri, func in ROUTES.items():
        if isinstance(func, dict):
            params = {'uri': uri, **func}
            app.add_route(**params)
        else:
            app.add_route(func, uri)
    app.static("/api/static/", args.directory)
    app.static("/api/train-bbox/", RAW_BASE)
    await app.create_server(host, port)


def main(args):
    loop = uvloop.new_event_loop()
    asyncio.set_event_loop(loop)
    asyncio.ensure_future(run_server(loop, args))
    loop.run_forever()


if __name__ == "__main__":
    args = parse_args()
    RAW_BASE = mkdirp(rel_path(args.raw_base, check=False))
    CLEAN_BASE = mkdirp(rel_path(RAW_BASE.replace('raw', 'clean'), check=False))

    main(args)
