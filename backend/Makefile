.PHONY=train

run:
	./venv/bin/python app.py

venv/bin/python:
	virtualenv --system-site-packages venv
	./venv/bin/pip install -r requirements.txt

train: venv/bin/python
	./venv/bin/python app.py -r train-bbox/raw/denoize-train -d ../../roboarchive-broom/train/raw/samples
