#!/usr/bin/env node
/**
 * Hardened Morning Brew Delivery Script (V3)
 * Ensures perfect HTML rendering via himalaya
 */
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const BREW_FILE = '/home/joel/.openclaw/workspace/MorningBrew/latest_brew.html';
const ACCOUNT = 'moltpuppet';
const RECIPIENTS = ['blair.joelblair@gmail.com', 'nmhans@gmail.com'];
const SUBJECT = `The Morning Brew - ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`;

try {
    if (!fs.existsSync(BREW_FILE)) {
        throw new Error('Brew file not found. Ensure TheBrewMaster has run.');
    }

    const htmlContent = fs.readFileSync(BREW_FILE, 'utf8');
    
    // Construct the raw email message
    const rawMessage = [
        `From: moltpuppet@gmail.com`,
        `To: ${RECIPIENTS.join(', ')}`,
        `Subject: ${SUBJECT}`,
        `Content-Type: text/html; charset=UTF-8`,
        ``,
        htmlContent
    ].join('\n');

    // Pipe directly into himalaya to avoid shell command expansion errors
    const himalayaPath = '/home/joel/.local/bin/himalaya';
    const command = `${himalayaPath} message send -a ${ACCOUNT} -`;
    
    execSync(command, { input: rawMessage, encoding: 'utf8' });
    console.log('Morning Brew delivered successfully.');
} catch (error) {
    console.error('Delivery failed:', error.message);
    process.exit(1);
}
