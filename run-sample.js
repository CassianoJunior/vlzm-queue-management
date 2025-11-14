#!/usr/bin/env node
import { spawn } from 'child_process';

const filename = process.argv[2];

if (!filename) {
  console.error('Please provide a filename');
  process.exit(1);
}

const filePath = `samples/${filename}`;

spawn('tsx', [filePath], { stdio: 'inherit' })
  .on('exit', (code) => process.exit(code));
