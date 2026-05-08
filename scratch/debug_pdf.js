
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execFileAsync = promisify(execFile);

async function test() {
  const env = { 
    ...process.env, 
    PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin` 
  };
  
  try {
    const { stdout, stderr } = await execFileAsync('pdftotext', ['-v'], { env });
    console.log('SUCCESS with env. Stdout:', stdout, 'Stderr:', stderr);
  } catch (e) {
    console.log('FAILED with env:', e.message);
  }

  try {
    const { stdout, stderr } = await execFileAsync('/opt/homebrew/bin/pdftotext', ['-v']);
    console.log('SUCCESS with absolute path. Stdout:', stdout, 'Stderr:', stderr);
  } catch (e) {
    console.log('FAILED with absolute path:', e.message);
  }
}

test();
