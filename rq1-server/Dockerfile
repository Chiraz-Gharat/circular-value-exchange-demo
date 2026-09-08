# Antigra CMRS-Extraktion - Flask-App
# Ollama laeuft bewusst NICHT in diesem Container, sondern auf dem Host
# (Modelle sind dort schon heruntergeladen, GPU-Zugriff funktioniert ohne
# Zusatzkonfiguration). Die App verbindet sich per OLLAMA_HOST ueber
# host.docker.internal mit dem nativen Ollama-Server.

FROM python:3.12-slim

WORKDIR /app

# Systemabhaengigkeiten fuer cryptography/grpcio-Build (falls kein Wheel passt)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
# Laufzeit-Dateien (Datenbank, Cache) werden per Volume von aussen gemountet,
# nicht ins Image gebacken - siehe docker-compose.yml
RUN rm -f database.db canonical_name_memory.json custom_categories.json

EXPOSE 5000

ENV FLASK_DEBUG=0

CMD ["python", "app.py"]
