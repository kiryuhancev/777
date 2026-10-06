"""Verify the deployed HTML against the exact build, allowing CDN propagation."""
import hashlib
import os
import time
import urllib.error
import urllib.parse
import urllib.request

url = os.environ['GAME_URL']
expected = os.environ['HTML_SHA256']
if urllib.parse.urlsplit(url).scheme != 'https' or len(expected) != 64:
    raise SystemExit('Expected an HTTPS Pages URL and SHA-256 from the build')
url += ('&' if '?' in url else '?') + urllib.parse.urlencode({
    'deployment': os.environ.get('GITHUB_SHA', expected),
})
for attempt in range(12):
    try:
        request = urllib.request.Request(url, headers={
            'User-Agent': 'Digital-Derby-deployment-check',
            'Cache-Control': 'no-cache',
        })
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read()
            actual = hashlib.sha256(body).hexdigest()
            if response.status == 200 and actual == expected:
                print('Published game verified: HTTP 200; HTML SHA-256 matches the build')
                break
            print(f'CDN propagation pending: HTTP {response.status}; SHA-256 {actual}')
    except (urllib.error.URLError, TimeoutError) as error:
        print(f'Publication check pending: {error}')
    if attempt == 11:
        raise SystemExit('Published HTML did not match the build within the verification window')
    time.sleep(10)
