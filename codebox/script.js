// Storage keys
const STORAGE_KEYS = {
    HTML: 'codebox_html',
    CSS: 'codebox_css',
    JS: 'codebox_js',
    THEME: 'codebox_theme',
    PROJECT_NAME: 'codebox_project_name'
};

// DOM elements
const htmlEditor = document.getElementById('htmlEditor');
const cssEditor = document.getElementById('cssEditor');
const jsEditor = document.getElementById('jsEditor');
const preview = document.getElementById('preview');
const tabs = document.querySelectorAll('.tab');
const editors = document.querySelectorAll('.editor');
const themeToggle = document.getElementById('themeToggle');
const formatBtn = document.getElementById('formatBtn');
const clearBtn = document.getElementById('clearBtn');
const refreshBtn = document.getElementById('refreshBtn');
const projectName = document.getElementById('projectName');
const consoleContent = document.getElementById('consoleContent');
const clearConsoleBtn = document.getElementById('clearConsole');
const resizeHandle = document.getElementById('resizeHandle');
const toast = document.getElementById('toast');

// State
let currentLang = 'html';
let updateTimeout;
let isResizing = false;

// Initialize
function init() {
    loadFromStorage();
    setupEventListeners();
    updatePreview();
    initTheme();
    setupConsoleCapture();
}

// Load saved code from localStorage
function loadFromStorage() {
    htmlEditor.value = localStorage.getItem(STORAGE_KEYS.HTML) || '';
    cssEditor.value = localStorage.getItem(STORAGE_KEYS.CSS) || '';
    jsEditor.value = localStorage.getItem(STORAGE_KEYS.JS) || '';
    projectName.textContent = localStorage.getItem(STORAGE_KEYS.PROJECT_NAME) || 'Untitled Project';
}

// Save to localStorage
function saveToStorage() {
    localStorage.setItem(STORAGE_KEYS.HTML, htmlEditor.value);
    localStorage.setItem(STORAGE_KEYS.CSS, cssEditor.value);
    localStorage.setItem(STORAGE_KEYS.JS, jsEditor.value);
    localStorage.setItem(STORAGE_KEYS.PROJECT_NAME, projectName.textContent);
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const lang = tab.dataset.lang;
            switchTab(lang);
        });
    });

    // Code input
    htmlEditor.addEventListener('input', debounceUpdate);
    cssEditor.addEventListener('input', debounceUpdate);
    jsEditor.addEventListener('input', debounceUpdate);

    // Project name
    projectName.addEventListener('input', saveToStorage);
    projectName.addEventListener('blur', saveToStorage);
    projectName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            projectName.blur();
        }
    });

    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);

    // Format code
    formatBtn.addEventListener('click', formatCode);

    // Clear code
    clearBtn.addEventListener('click', clearCode);

    // Refresh preview
    refreshBtn.addEventListener('click', () => {
        updatePreview();
        showToast('Preview refreshed');
    });

    // Clear console
    clearConsoleBtn.addEventListener('click', () => {
        consoleContent.innerHTML = '';
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Resize handle
    setupResizeHandle();

    // Auto-save on page unload
    window.addEventListener('beforeunload', saveToStorage);
}

// Switch active tab
function switchTab(lang) {
    currentLang = lang;
    
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.lang === lang);
    });
    
    editors.forEach(editor => {
        editor.classList.toggle('active', editor.id === `${lang}Editor`);
    });
}

// Debounce preview updates
function debounceUpdate() {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
        updatePreview();
        saveToStorage();
    }, 500);
}

// Update preview iframe
function updatePreview() {
    const html = htmlEditor.value;
    const css = cssEditor.value;
    const js = jsEditor.value;
    
    const content = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: system-ui, -apple-system, sans-serif; }
                ${css}
            </style>
        </head>
        <body>
            ${html}
            <script>
                // Capture console output
                (function() {
                    const originalLog = console.log;
                    const originalError = console.error;
                    const originalWarn = console.warn;
                    const originalInfo = console.info;
                    
                    function sendToParent(type, args) {
                        window.parent.postMessage({
                            type: 'console',
                            level: type,
                            message: Array.from(args).map(arg => {
                                try {
                                    return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
                                } catch {
                                    return String(arg);
                                }
                            }).join(' ')
                        }, '*');
                    }
                    
                    console.log = function(...args) {
                        sendToParent('log', args);
                        originalLog.apply(console, args);
                    };
                    
                    console.error = function(...args) {
                        sendToParent('error', args);
                        originalError.apply(console, args);
                    };
                    
                    console.warn = function(...args) {
                        sendToParent('warn', args);
                        originalWarn.apply(console, args);
                    };
                    
                    console.info = function(...args) {
                        sendToParent('info', args);
                        originalInfo.apply(console, args);
                    };
                    
                    // Capture runtime errors
                    window.onerror = function(msg, url, line, col, error) {
                        sendToParent('error', [msg + ' (Line ' + line + ')']);
                        return false;
                    };
                    
                    window.addEventListener('unhandledrejection', function(e) {
                        sendToParent('error', ['Unhandled Promise Rejection: ' + e.reason]);
                    });
                })();
                
                try {
                    ${js}
                } catch (error) {
                    console.error('JavaScript Error: ' + error.message);
                }
            </script>
        </body>
        </html>
    `;
    
    // Write to iframe
    const iframeDoc = preview.contentDocument || preview.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(content);
    iframeDoc.close();
}

// Console capture setup
function setupConsoleCapture() {
    window.addEventListener('message', (event) => {
        if (event.data.type === 'console') {
            addConsoleMessage(event.data.level, event.data.message);
        }
    });
}

// Add message to console
function addConsoleMessage(level, message) {
    const messageEl = document.createElement('div');
    messageEl.className = `console-message ${level}`;
    messageEl.textContent = message;
    consoleContent.appendChild(messageEl);
    consoleContent.scrollTop = consoleContent.scrollHeight;
}

// Theme management
function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEYS.THEME, next);
    
    showToast(`${next === 'dark' ? 'Dark' : 'Light'} mode enabled`);
}

// Format code (basic implementation)
function formatCode() {
    const editor = document.querySelector('.editor.active');
    const lang = currentLang;
    
    try {
        let formatted = editor.value;
        
        if (lang === 'html') {
            formatted = formatHTML(formatted);
        } else if (lang === 'css') {
            formatted = formatCSS(formatted);
        } else if (lang === 'js') {
            formatted = formatJS(formatted);
        }
        
        editor.value = formatted;
        saveToStorage();
        updatePreview();
        showToast('Code formatted');
    } catch (error) {
        showToast('Format error: ' + error.message);
    }
}

// Basic HTML formatter
function formatHTML(html) {
    let formatted = '';
    let indent = 0;
    const tab = '  ';
    
    html.split(/>\s*</).forEach((element) => {
        if (element.match(/^\/\w/)) {
            indent--;
        }
        
        formatted += tab.repeat(indent < 0 ? 0 : indent);
        formatted += '<' + element + '>\n';
        
        if (element.match(/^<?\w[^>]*[^\/]$/) && !element.startsWith('input') && !element.startsWith('img') && !element.startsWith('br') && !element.startsWith('hr')) {
            indent++;
        }
    });
    
    return formatted.substring(1, formatted.length - 2);
}

// Basic CSS formatter
function formatCSS(css) {
    return css
        .replace(/\s*{\s*/g, ' {\n  ')
        .replace(/;\s*/g, ';\n  ')
        .replace(/\s*}\s*/g, '\n}\n\n')
        .replace(/,\s*/g, ',\n')
        .trim();
}

// Basic JS formatter
function formatJS(js) {
    return js
        .replace(/\s*{\s*/g, ' {\n  ')
        .replace(/;\s*/g, ';\n  ')
        .replace(/\s*}\s*/g, '\n}\n\n')
        .trim();
}

// Clear all code
function clearCode() {
    if (confirm('Clear all code? This cannot be undone.')) {
        htmlEditor.value = '';
        cssEditor.value = '';
        jsEditor.value = '';
        consoleContent.innerHTML = '';
        saveToStorage();
        updatePreview();
        showToast('Code cleared');
    }
}

// Keyboard shortcuts
function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + S: Save (already auto-saved, just show toast)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveToStorage();
        showToast('Saved');
    }
    
    // Ctrl/Cmd + Shift + F: Format
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        formatCode();
    }
    
    // Ctrl/Cmd + /: Toggle comment (basic)
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        toggleComment();
    }
    
    // Tab key handling
    if (e.key === 'Tab') {
        const editor = document.activeElement;
        if (editor.classList.contains('editor')) {
            e.preventDefault();
            insertTab(editor);
        }
    }
}

// Insert tab in editor
function insertTab(editor) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    
    editor.value = value.substring(0, start) + '  ' + value.substring(end);
    editor.selectionStart = editor.selectionEnd = start + 2;
}

// Toggle comment (basic)
function toggleComment() {
    const editor = document.querySelector('.editor.active');
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = value.indexOf('\n', end);
    const line = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);
    
    let commentChars = '//';
    if (currentLang === 'html') commentChars = '<!--';
    if (currentLang === 'css') commentChars = '/*';
    
    let newLine;
    if (line.trim().startsWith(commentChars)) {
        newLine = line.replace(commentChars, '').replace(/-->/g, '').replace(/\*\//g, '');
    } else {
        if (currentLang === 'html') {
            newLine = `<!-- ${line} -->`;
        } else if (currentLang === 'css') {
            newLine = `/* ${line} */`;
        } else {
            newLine = `// ${line}`;
        }
    }
    
    editor.value = value.substring(0, lineStart) + newLine + value.substring(lineEnd === -1 ? value.length : lineEnd);
    saveToStorage();
    updatePreview();
}

// Resize handle
function setupResizeHandle() {
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizeHandle.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const containerWidth = document.querySelector('.main').offsetWidth;
        const newWidth = (e.clientX / containerWidth) * 100;
        
        if (newWidth > 20 && newWidth < 80) {
            document.querySelector('.editor-panel').style.flex = `0 0 ${newWidth}%`;
            document.querySelector('.preview-panel').style.flex = `0 0 ${100 - newWidth}%`;
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizeHandle.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

// Toast notification
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
