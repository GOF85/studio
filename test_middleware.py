#!/usr/bin/env python3
import subprocess
import time
import requests
import sys
from threading import Thread
from queue import Queue

def read_output(pipe, queue):
    """Read output from pipe and put into queue"""
    for line in iter(pipe.readline, ''):
        if line:
            queue.put(line)

# Start the dev server
print("Starting Next.js dev server...")
process = subprocess.Popen(
    ['npm', 'run', 'dev'],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    cwd='/Users/guillermo/mc/studio',
    bufsize=1
)

# Queue to collect output
output_queue = Queue()

# Start thread to read output
output_thread = Thread(target=read_output, args=(process.stdout, output_queue), daemon=True)
output_thread.start()

# Wait for server to be ready
print("Waiting for server to be ready...")
ready = False
server_logs = []
max_wait = 30
start_time = time.time()

while not ready and (time.time() - start_time) < max_wait:
    try:
        # Check if output is available
        while not output_queue.empty():
            line = output_queue.get_nowait()
            server_logs.append(line)
            print(f"[SERVER] {line.rstrip()}")
            if 'Ready in' in line or 'started server' in line or 'localhost:3000' in line:
                ready = True
    except:
        pass
    
    # Try to connect
    try:
        response = requests.get('http://localhost:3000/', timeout=1)
        ready = True
        print("[SUCCESS] Server is ready!")
    except:
        pass
    
    time.sleep(0.5)

if not ready:
    print("[ERROR] Server did not start within 30 seconds")
    process.terminate()
    sys.exit(1)

# Give it a moment to fully stabilize
time.sleep(1)

print("\n" + "="*60)
print("Making HTTP requests...")
print("="*60 + "\n")

# Request 1: numero_expediente
print("[REQUEST 1] GET http://localhost:3000/os/2025-12345/test")
try:
    response1 = requests.get('http://localhost:3000/os/2025-12345/test', allow_redirects=False, timeout=5)
    print(f"Status Code: {response1.status_code}")
    print(f"Headers: {dict(response1.headers)}")
    if 'location' in response1.headers:
        print(f"Location Header: {response1.headers['location']}")
    print()
except Exception as e:
    print(f"Error: {e}\n")

time.sleep(0.5)

# Request 2: UUID
print("[REQUEST 2] GET http://localhost:3000/os/8935afe1-48bc-4669-b5c3-a6c4135fcac5/test")
try:
    response2 = requests.get('http://localhost:3000/os/8935afe1-48bc-4669-b5c3-a6c4135fcac5/test', allow_redirects=False, timeout=5)
    print(f"Status Code: {response2.status_code}")
    print(f"Headers: {dict(response2.headers)}")
    if 'location' in response2.headers:
        print(f"Location Header: {response2.headers['location']}")
    print()
except Exception as e:
    print(f"Error: {e}\n")

# Collect all server logs during requests
print("="*60)
print("Collecting middleware logs for 3 seconds...")
print("="*60 + "\n")
time.sleep(3)

# Print any middleware logs
print("[MIDDLEWARE LOGS]")
middleware_logs = []
while not output_queue.empty():
    line = output_queue.get_nowait()
    server_logs.append(line)
    print(line.rstrip())
    if any(keyword in line for keyword in ['[Middleware]', 'UUID', 'numero_expediente', 'detected', 'redirect', 'Resolved', 'resolveOsId']):
        middleware_logs.append(line)

# Terminate the process
process.terminate()
try:
    process.wait(timeout=5)
except subprocess.TimeoutExpired:
    process.kill()

print("\n" + "="*60)
print("SUMMARY")
print("="*60)
print(f"\nTotal server logs captured: {len(server_logs)}")
print(f"Middleware-related logs found: {len(middleware_logs)}")
if middleware_logs:
    print("\nMiddleware logs:")
    for log in middleware_logs:
        print(f"  {log.rstrip()}")
