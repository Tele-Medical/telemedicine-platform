import { spawn } from 'child_process';
import path from 'path';

function run() {
  // We spawn the actual vitest CLI instead of using the Node API
  // This allows us to intercept its stdout and forcefully exit when it prints the final summary.
  const child = spawn('npx', ['vitest', 'run'], { 
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  });

  let hasExited = false;
  const exitGracefully = (code) => {
    if (hasExited) return;
    hasExited = true;
    child.kill('SIGKILL');
    process.exit(code);
  };

  child.stdout.on('data', (data) => {
    const text = data.toString();
    process.stdout.write(text);
    
    // Vitest prints "Test Files  x passed" at the end of a successful run.
    if (text.includes('Test Files') && text.includes('passed')) {
      console.log('\\n[run-vitest wrapper] Detected successful test completion, forcing exit...');
      // Give it a brief moment to flush stdout
      setTimeout(() => exitGracefully(0), 100);
    }
    // If there is a failure summary:
    if (text.includes('Test Files') && text.includes('failed')) {
      console.log('\\n[run-vitest wrapper] Detected test failure, forcing exit with error...');
      setTimeout(() => exitGracefully(1), 100);
    }
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
  });

  child.on('exit', (code) => {
    exitGracefully(code !== null ? code : 1);
  });
}

run();
