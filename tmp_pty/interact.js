const pty = require('node-pty');

const ptyProcess = pty.spawn('npx', ['eas-cli', 'credentials', '-p', 'android'], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: '../apps/mobile',
  env: process.env
});

let state = 0;
let output = '';

ptyProcess.on('data', function(data) {
  process.stdout.write(data);
  output += data;
  
  if (state === 0 && output.includes('Which build profile do you want to configure?')) {
    state = 1;
    output = '';
    setTimeout(() => { ptyProcess.write('\r'); }, 2000);
  }
  
  else if (state === 1 && output.includes('What do you want to do?') && output.includes('Keystore: Manage everything')) {
    state = 2;
    output = '';
    setTimeout(() => { ptyProcess.write('\r'); }, 2000);
  }
  
  else if (state === 2 && output.includes('What do you want to do?') && output.includes('Set up a new keystore')) {
    state = 3;
    output = '';
    setTimeout(() => {
      ptyProcess.write('\x1B[B');
      setTimeout(() => {
        ptyProcess.write('\x1B[B');
        setTimeout(() => {
          ptyProcess.write('\r');
        }, 1000);
      }, 1000);
    }, 2000);
  }
  
  else if (state === 3 && output.includes('Do you want to display the sensitive information')) {
    state = 4;
    output = '';
    setTimeout(() => {
      ptyProcess.write('Y\r');
    }, 1000);
  }
});

setTimeout(() => ptyProcess.kill(), 40000);
