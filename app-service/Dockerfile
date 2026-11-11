FROM python:3.12-slim

# Install libmagic for file type detection
RUN apt-get update && apt-get install -y libmagic1 && rm -rf /var/lib/apt/lists/*

RUN groupadd -r ppapp && useradd -r -g ppapp ppapp
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create upload directory
RUN mkdir -p /data/uploads && chown -R ppapp:ppapp /data

USER ppapp
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
