import pty
import os
import select
import sys
import time

pid, fd = pty.fork()

if pid == 0:
    os.chdir("apps/mobile")
    os.execvp("npx", ["npx", "eas-cli", "credentials", "-p", "android"])
else:
    def read_out():
        out = b""
        while True:
            r, _, _ = select.select([fd], [], [], 1.0)
            if fd in r:
                try:
                    data = os.read(fd, 1024)
                    if not data:
                        break
                    out += data
                except OSError:
                    break
            else:
                break
        return out

    out1 = read_out()
    print("OUT1:", out1.decode("utf-8", "ignore"))
    
    # We send arrow down or enter depending on the prompt
    # Just printing the first prompt to see what it asks
