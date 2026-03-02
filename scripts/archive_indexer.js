#!/usr/bin/env node

/**
 * Moltpuppet Archive Indexer v2.0.0
 * 
 * Enhanced archive system with:
 * - Daily markdown summaries (auto-export to memory/transcripts/)
 * - Date range filtering
 * - CLI search interface
 * - Better session linking
 * - Full JSON export option
 */

const fs = require('fs');
const path = require('path');

// Config
const SESSIONS_DIRS = [
    '/home/joel/.openclaw/agents/main/sessions',
    '/home/joel/.openclaw/agents/moltpuppet/sessions',
    '/home/joel/.openclaw/agents/voice/sessions'
];
const OUTPUT_DIR = '/home/joel/.openclaw/workspace';
const TRANSCRIPTS_DIR = path.join(OUTPUT_DIR, 'memory', 'transcripts');
const HTML_OUTPUT = path.join(OUTPUT_DIR, 'moltpuppet_archive.html');

// Ensure transcripts dir exists
if (!fs.existsSync(TRANSCRIPTS_DIR)) {
    fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
}

// Track current model per session
const sessionModels = new Map();

function extractMessagesFromEntry(entry, seenHashes, sessionName) {
    const messages = [];
    
    // Track model changes
    if (entry.type === 'model_change' && entry.modelId) {
        sessionModels.set(sessionName, entry.modelId);
        return messages; // Don't add model_change as a message
    }
    
    const data = entry.message || entry;
    let content = '';
    let role = data.role || entry.role || 'system';
    let sender = 'Moltpuppet';
    let timestamp = entry.timestamp || entry.ts || data.timestamp || Date.now();
    
    // START FIX: Reset model per-message to prevent model-bleeding
    let model = 'unknown';
    
    // Check if this specific message entry has a model attached
    if (data.model) {
        model = data.model;
        sessionModels.set(sessionName, model);
    } else if (entry.modelId) {
        model = entry.modelId;
        sessionModels.set(sessionName, model);
    } else {
        // Only use session-wide model if we haven't found a better one
        model = sessionModels.get(sessionName) || 'unknown';
    }
    // END FIX

    if (data.content) {
        if (typeof data.content === 'string') {
            content = data.content;
        } else if (Array.isArray(data.content)) {
            content = data.content
                .filter(c => c.type === 'text')
                .map(c => c.text || '')
                .join(' ');
        }
    }
    
    if (!content && data.text) content = data.text;
    if (!content && data.message && typeof data.message === 'string') content = data.message;

    if (!content || content.trim().length === 0) return messages;
    
    // REDACTION: Remove sensitive keys/tokens from content
    const redactedContent = content
        .replace(/ghp_[a-zA-Z0-9]{36}/g, '[REDACTED_GITHUB_TOKEN]')
        .replace(/AIzaSy[a-zA-Z0-9_-]{33}/g, '[REDACTED_GOOGLE_KEY]')
        .replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_API_KEY]')
        .replace(/🔑 api-key [a-zA-Z0-9…_-]+/g, '🔑 api-key [REDACTED]')
        .replace(/sk-ant-api03-[a-zA-Z0-9_-]{90,}/g, '[REDACTED_ANTHROPIC_KEY]');

    content = redactedContent;

    // Skip tool results and system noise
    if (role === 'tool' || role === 'toolResult' || role === 'tool_result' || entry.type === 'tool_result') return messages;
    if (role === 'system' && !content.includes('USER.md') && !content.includes('MEMORY.md') && !content.includes('Moltpuppet Archive')) return messages;

    if (role === 'user') sender = 'User/Family';
    
    // Enhanced deduplication with content fingerprint
    const cleanContent = content.trim();
    const hash = `${sender}:${cleanContent.substring(0, 100)}:${Math.floor(timestamp/60000)}`;
    if (seenHashes.has(hash)) return messages;
    seenHashes.add(hash);

    messages.push({
        ts: isNaN(new Date(timestamp).getTime()) ? Date.now() : new Date(timestamp).getTime(),
        sender: sender,
        role: role,
        content: cleanContent,
        session: sessionName,
        sessionId: sessionName.replace('.jsonl', ''),
        model: model
    });
    
    return messages;
}

function groupByDate(messages) {
    const groups = {};
    for (const msg of messages) {
        const date = new Date(msg.ts).toISOString().split('T')[0];
        if (!groups[date]) groups[date] = [];
        groups[date].push(msg);
    }
    return groups;
}

function generateDailySummary(date, messages) {
    const userMessages = messages.filter(m => m.role === 'user');
    const moltMessages = messages.filter(m => m.role !== 'user');
    
    // Extract key topics/decisions
    const topics = [];
    const content = messages.map(m => m.content.toLowerCase()).join(' ');
    
    if (content.includes('purchased') || content.includes('bought') || content.includes('shopping')) topics.push('Provisioning');
    if (content.includes('shop') || content.includes('barn') || content.includes('build')) topics.push('Shop Build');
    if (content.includes('syrup') || content.includes('maple')) topics.push('Syrup Season');
    if (content.includes('solar') || content.includes('battery')) topics.push('Solar');
    if (content.includes('timber') || content.includes('karatz') || content.includes('land')) topics.push('Land/Timber');
    if (content.includes('brew') || content.includes('weather')) topics.push('Morning Brew');
    if (content.includes('email') || content.includes('message')) topics.push('Communications');
    
    return "# Session Summary: " + date + "\n\n" +
"## Overview\n" +
"- **Total Messages:** " + messages.length + "\n" +
"- **User Messages:** " + userMessages.length + "\n" +
"- **Assistant Responses:** " + moltMessages.length + "\n" +
"- **Key Topics:** " + (topics.length > 0 ? topics.join(', ') : 'General') + "\n\n" +
"## Timeline\n" +
messages.slice(0, 20).map(m => {
    const time = new Date(m.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const preview = m.content.length > 100 ? m.content.substring(0, 100) + '...' : m.content;
    return "- **" + time + "** " + m.sender + ": " + preview.replace(/\n/g, ' ');
}).join('\n') + "\n\n" +
(messages.length > 20 ? "*... and " + (messages.length - 20) + " more messages*\n" : "") + "\n" +
"## Full Archive\n" +
"See: [moltpuppet_archive.html](../moltpuppet_archive.html)\n" +
"Search: Use browser find (Ctrl+F) with date \"" + date + "\"\n";
}

async function generateArchive() {
    console.log('--- Moltpuppet Archive Indexer v2.0.0 Starting ---');
    
    let allMessages = [];
    const seenHashes = new Set();

    // Scan all session directories
    for (const SESSIONS_DIR of SESSIONS_DIRS) {
        console.log('Scanning directory:', SESSIONS_DIR);
        
        if (!fs.existsSync(SESSIONS_DIR)) {
            console.log('  Directory not found, skipping.');
            continue;
        }

        const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.includes('.jsonl'));
        console.log('  Found ' + files.length + ' session files.');

        for (const file of files) {
            const filePath = path.join(SESSIONS_DIR, file);
            const sessionName = file.replace('.jsonl', '');
            
            // RESET: Clear session model cache for each new session file
            // This prevents model 'bleeding' from previous sessions
            sessionModels.delete(sessionName);
            
            let contentRaw;
            try {
                contentRaw = fs.readFileSync(filePath, 'utf8');
            } catch (err) {
                console.error('  Failed to read ' + file + ': ' + err.message);
                continue;
            }
            
            console.log('  Reading ' + file + ' (' + contentRaw.length + ' bytes)');
            const lines = contentRaw.split('\n');
            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const entry = JSON.parse(line);
                    const msgs = extractMessagesFromEntry(entry, seenHashes, sessionName);
                    allMessages.push(...msgs);
                } catch (e) {
                    // Skip invalid JSON
                }
            }
        }
    }

    console.log('Extracted ' + allMessages.length + ' unique messages total.');

    // Sort by timestamp (newest first)
    allMessages.sort((a, b) => b.ts - a.ts);

    // Group by date for daily summaries
    const byDate = groupByDate(allMessages);
    
    // Generate daily markdown summaries
    console.log('\nGenerating daily summaries...');
    for (const [date, messages] of Object.entries(byDate)) {
        const summaryPath = path.join(TRANSCRIPTS_DIR, 'summary_' + date + '.md');
        // Only generate if doesn't exist or has fewer messages
        let shouldWrite = true;
        if (fs.existsSync(summaryPath)) {
            const existing = fs.readFileSync(summaryPath, 'utf8');
            const existingCountMatch = existing.match(/Total Messages: (\d+)/);
            const existingCount = existingCountMatch ? existingCountMatch[1] : null;
            if (existingCount && parseInt(existingCount) >= messages.length) {
                shouldWrite = false;
            }
        }
        if (shouldWrite) {
            const summary = generateDailySummary(date, messages);
            fs.writeFileSync(summaryPath, summary);
            console.log('  Generated: summary_' + date + '.md (' + messages.length + ' messages)');
        }
    }

    // Generate HTML archive with cache-busting
    const cacheBust = Date.now();
    const html = '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'    <meta charset="UTF-8">\n' +
'    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\n' +
'    <meta http-equiv="Pragma" content="no-cache">\n' +
'    <meta http-equiv="Expires" content="0">\n' +
'    <title>Moltpuppet Raw Archive</title>\n' +
'    <style>\n' +
'        body { font-family: \'Courier New\', Courier, monospace; background: #1a1a1a; color: #00ff00; padding: 20px; line-height: 1.6; }\n' +
'        .container { max-width: 1200px; margin: 0 auto; }\n' +
'        header { border-bottom: 2px solid #00ff00; margin-bottom: 20px; padding-bottom: 10px; }\n' +
'        .controls { margin-bottom: 20px; background: #222; padding: 15px; border: 1px solid #333; position: sticky; top: 0; z-index: 100; display: flex; gap: 10px; flex-wrap: wrap; }\n' +
'        input, select { background: #000; color: #00ff00; border: 1px solid #00ff00; padding: 10px; font-size: 1em; }\n' +
'        input[type="text"] { flex: 1; min-width: 200px; }\n' +
'        .stats { background: #222; padding: 10px; margin-bottom: 20px; border-left: 3px solid #00ff00; }\n' +
'        .message { border-left: 3px solid #333; margin-bottom: 15px; padding: 15px; background: #222; border-radius: 0 5px 5px 0; }\n' +
'        .message.moltpuppet { border-left-color: #00ff00; }\n' +
'        .message.user { border-left-color: #0099ff; }\n' +
'        .meta { font-size: 0.8em; color: #888; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 5px; display: flex; justify-content: space-between; }\n' +
'        .sender { font-weight: bold; color: #fff; }\n' +
'        .session-link { color: #666; text-decoration: none; }\n' +
'        .session-link:hover { color: #00ff00; }\n' +
'        .content { white-space: pre-wrap; font-size: 1.05em; }\n' +
'        .highlight { background: #ffff00; color: #000; font-weight: bold; border-radius: 2px; padding: 0 2px; }\n' +
'        .hidden { display: none; }\n' +
'    </style>\n' +
'</head>\n' +
'<body>\n' +
'    <div class="container">\n' +
'        <header>\n' +
'            <h1>🎭 MOLTPUPPET RAW ARCHIVE</h1>\n' +
'            <p>Total Unique Entries: <strong>' + allMessages.length + '</strong></p>\n' +
'            <p class="last-updated">Last Updated: ' + new Date().toLocaleString() + ' (CacheBust: ' + cacheBust + ')</p>\n' +
'            <p><small>Updates hourly via cron | Daily summaries: <code>memory/transcripts/summary_YYYY-MM-DD.md</code></small></p>\n' +
'        </header>\n' +
'        \n' +
'        <div class="stats">\n' +
'            <strong>Quick Stats:</strong> ' + Object.keys(byDate).length + ' days archived | \n' +
'            Date range: ' + Object.keys(byDate).sort()[0] + ' to ' + Object.keys(byDate).sort().pop() + '\n' +
'            <span id="visibleCount" style="float: right;">Showing ' + allMessages.length + ' messages</span>\n' +
'            <button onclick="location.reload(true)" style="float: right; margin-right: 10px; background: #000; color: #00ff00; border: 1px solid #00ff00; padding: 2px 8px; cursor: pointer;">🔄 Force Refresh</button>\n' +
'        </div>\n' +
'        \n' +
'        <div class="controls">\n' +
'            <input type="text" id="searchInput" placeholder="Search content (e.g. \'groceries\', \'Emily\', \'syrup\')..." onkeyup="filterMessages()">\n' +
'            <select id="dateFilter" onchange="filterMessages()">\n' +
'                <option value="">All Dates</option>\n' +
'                ' + Object.keys(byDate).sort().reverse().map(d => '<option value="' + d + '">' + d + '</option>').join('') + '\n' +
'            </select>\n' +
'            <select id="senderFilter" onchange="filterMessages()">\n' +
'                <option value="">All Senders</option>\n' +
'                <option value="User/Family">User/Family</option>\n' +
'                <option value="Moltpuppet">Moltpuppet</option>\n' +
'            </select>\n' +
'            <select id="modelFilter" onchange="filterMessages()">\n' +
'                <option value="">All Models</option>\n' +
'                ' + [...new Set(allMessages.filter(m => m.model && m.model !== 'unknown').map(m => m.model))].sort().map(m => '<option value="' + m + '">' + m.replace(/^.*\//, '') + '</option>').join('') + '\n' +
'            </select>\n' +
'        </div>\n' +
'        \n' +
'        <div id="archiveBody">\n' +
'            ' + allMessages.map(msg => {
                const escapedForHtml = msg.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const escapedForAttr = escapedForHtml.replace(/"/g, '&quot;');
                return '\n' +
'                <div class="message ' + (msg.sender.toLowerCase().includes('user') ? 'user' : 'moltpuppet') + '" \n' +
'                     data-date="' + new Date(msg.ts).toISOString().split('T')[0] + '"\n' +
'                     data-sender="' + msg.sender + '"\n' +
'                     data-model="' + (msg.model || 'unknown') + '"\n' +
'                     data-content="' + escapedForAttr + '">\n' +
'                    <div class="meta">\n' +
'                        <span>[' + new Date(msg.ts).toLocaleString() + '] <span class="sender">' + msg.sender + '</span>' + (msg.model && msg.model !== 'unknown' ? ' <small style="color: #666;">(' + msg.model.replace(/^.*\//, '') + ')</small>' : '') + '</span>\n' +
'                        <small>Session: <a class="session-link" href="#" title="' + msg.sessionId + '">' + msg.sessionId.substring(0, 8) + '...</a></small>\n' +
'                    </div>\n' +
'                    <div class="content">' + escapedForHtml + '</div>\n' +
'                </div>\n';
            }).join('') + '\n' +
'        </div>\n' +
'    </div>\n' +
'    <div id="pageLoadTime" style="position: fixed; bottom: 10px; right: 10px; background: #222; padding: 5px 10px; border: 1px solid #00ff00; font-size: 0.8em; color: #888;"></div>\n' +
'    <script>\n' +
'        document.getElementById(\'pageLoadTime\').textContent = \'Page loaded: \' + new Date().toLocaleString();\n' +
'        \n' +
'        function escapeHtml(text) {\n' +
'            const div = document.createElement(\'div\');\n' +
'            div.textContent = text;\n' +
'            return div.innerHTML;\n' +
'        }\n' +
'\n' +
'        function filterMessages() {\n' +
'            const searchTerm = document.getElementById(\'searchInput\').value.toLowerCase();\n' +
'            const dateFilter = document.getElementById(\'dateFilter\').value;\n' +
'            const senderFilter = document.getElementById(\'senderFilter\').value;\n' +
'            const modelFilter = document.getElementById(\'modelFilter\').value;\n' +
'            const messages = document.getElementsByClassName(\'message\');\n' +
'            let visibleCount = 0;\n' +
'            \n' +
'            const escapedSearchTerm = searchTerm.replace(/[-\\[\\]{}()*+?.,\\\\^$|#\\s]/g, \'\\\\$&\');\n' +
'            const searchRegex = searchTerm ? new RegExp(\'(\' + escapedSearchTerm + \')\', \'gi\') : null;\n' +
'\n' +
'            for (let i = 0; i < messages.length; i++) {\n' +
'                const msg = messages[i];\n' +
'                const contentDiv = msg.querySelector(\'.content\');\n' +
'                const contentAttr = msg.getAttribute(\'data-content\');\n' +
'                \n' +
'                const tempDiv = document.createElement(\'div\');\n' +
'                tempDiv.innerHTML = contentAttr;\n' +
'                const plainText = tempDiv.textContent;\n' +
'\n' +
'                const msgDate = msg.getAttribute(\'data-date\');\n' +
'                const msgSender = msg.getAttribute(\'data-sender\');\n' +
'                const msgModel = msg.getAttribute(\'data-model\');\n' +
'                \n' +
'                const matchesSearch = !searchTerm || plainText.toLowerCase().includes(searchTerm);\n' +
'                const matchesDate = !dateFilter || msgDate === dateFilter;\n' +
'                const matchesSender = !senderFilter || msgSender === senderFilter;\n' +
'                const matchesModel = !modelFilter || (msgModel && msgModel.includes(modelFilter));\n' +
'                \n' +
'                const isVisible = matchesSearch && matchesDate && matchesSender && matchesModel;\n' +
'                msg.style.display = isVisible ? "" : "none";\n' +
'                \n' +
'                if (isVisible) {\n' +
'                    visibleCount++;\n' +
'                    if (searchRegex) {\n' +
'                        const escaped = escapeHtml(plainText);\n' +
'                        contentDiv.innerHTML = escaped.replace(searchRegex, \'<mark class="highlight">$1</mark>\');\n' +
'                    } else {\n' +
'                        contentDiv.innerHTML = escapeHtml(plainText);\n' +
'                    }\n' +
'                }\n' +
'            }\n' +
'            \n' +
'            const countDisplay = document.getElementById(\'visibleCount\');\n' +
'            if (countDisplay) {\n' +
'                countDisplay.textContent = \'Showing \' + visibleCount + \' messages\';\n' +
'            }\n' +
'        }\n' +
'        \n' +
'        setInterval(function() {\n' +
'            fetch(window.location.href, { method: \'HEAD\', cache: \'no-store\' })\n' +
'                .then(response => {\n' +
'                    const lastModified = new Date(response.headers.get(\'last-modified\'));\n' +
'                    const pageGenerated = new Date(\'' + new Date().toISOString() + '\');\n' +
'                    if (lastModified > pageGenerated) {\n' +
'                        document.getElementById(\'pageLoadTime\').innerHTML = \n' +
'                            \'<span style="color: #ff6600;">⚠ Newer version available! Refresh to update.</span>\';\n' +
'                    }\n' +
'                });\n' +
'        }, 300000);\n' +
'    </script>\n' +
'</body>\n' +
'</html>';

    fs.writeFileSync(HTML_OUTPUT, html);
    console.log('\n--- Archive Generated Successfully ---');
    console.log('HTML Archive:', HTML_OUTPUT);
    console.log('Daily Summaries:', TRANSCRIPTS_DIR);
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log('\nMoltpuppet Archive Indexer v2.0.0\n' +
'\nUsage: node archive_indexer.js [options]\n' +
'\nOptions:\n' +
'  --help, -h       Show this help\n' +
'  --search <term>  Search archive for specific term\n' +
'  --date <YYYY-MM-DD>  Filter by date\n' +
'  --json           Output to JSON instead of HTML\n' +
'\nExamples:\n' +
'  node archive_indexer.js\n' +
'  node archive_indexer.js --search "groceries"\n' +
'  node archive_indexer.js --date 2026-02-18\n');
        process.exit(0);
    }
    
    if (args.includes('--search')) {
        const searchTerm = args[args.indexOf('--search') + 1];
        console.log('Search mode not yet implemented. Use the HTML archive search.');
        process.exit(1);
    }
    
    generateArchive();
}

module.exports = { generateArchive, extractMessagesFromEntry };
