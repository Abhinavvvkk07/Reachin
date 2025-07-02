console.log("Reachin: Content script loaded.");

// Add these utility functions at the top
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let typingTimer;
const doneTypingInterval = 2000;
let activeElement = null;
let currentTooltip = null;
let miniTooltip = null;

// Add this at the top of the file after the utility functions
function injectStyles() {
    if (document.getElementById('diy-grammar-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'diy-grammar-styles';
    style.textContent = `
        span.mistake {
            background-color: transparent !important;
            border-bottom: 2px solid #dc3545 !important;
            cursor: pointer !important;
            position: relative !important;
            text-decoration: underline !important;
            text-decoration-color: #dc3545 !important;
            text-decoration-style: wavy !important;
            text-underline-offset: 2px !important;
        }
        
        span.mistake:hover {
            background-color: rgba(220, 53, 69, 0.08) !important;
        }
        
        #diy-grammar-mini-tooltip {
            background: #fff !important;
            border: 1px solid #d1d5da !important;
            border-radius: 8px !important;
            padding: 12px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1) !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            font-size: 12px !important;
            line-height: 1.3 !important;
            max-width: 280px !important;
            min-width: 160px !important;
            width: auto !important;
            z-index: 999999 !important;
            position: absolute !important;
            display: block !important;
            visibility: visible !important;
            color: #24292f !important;
            opacity: 1 !important;
            transform: translateY(0) scale(1) !important;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        
        /* Compact size for small text areas (LinkedIn DMs, etc.) */
        #diy-grammar-mini-tooltip.compact {
            padding: 8px 10px !important;
            font-size: 11px !important;
            max-width: 200px !important;
            min-width: 120px !important;
            border-radius: 6px !important;
        }
        
        /* Large size for bigger text areas (Gmail compose, etc.) */
        #diy-grammar-mini-tooltip.large {
            padding: 14px 16px !important;
            font-size: 13px !important;
            max-width: 320px !important;
            min-width: 180px !important;
        }
        
        #diy-grammar-mini-tooltip::before {
            content: "" !important;
            position: absolute !important;
            border: 8px solid transparent !important;
            z-index: 1 !important;
        }
        
        #diy-grammar-mini-tooltip::after {
            content: "" !important;
            position: absolute !important;
            border: 9px solid transparent !important;
            z-index: 0 !important;
        }
        
        /* Arrow pointing down (tooltip above word) */
        #diy-grammar-mini-tooltip:not([data-show-below])::before {
            top: 100% !important;
            border-top-color: #fff !important;
        }
        
        #diy-grammar-mini-tooltip:not([data-show-below])::after {
            top: 100% !important;
            border-top-color: #e6e6e6 !important;
        }
        
        /* Arrow pointing up (tooltip below word) */
        #diy-grammar-mini-tooltip[data-show-below]::before {
            bottom: 100% !important;
            border-bottom-color: #fff !important;
        }
        
        #diy-grammar-mini-tooltip[data-show-below]::after {
            bottom: 100% !important;
            border-bottom-color: #e6e6e6 !important;
        }
        
        .mini-suggestion {
            margin-bottom: 8px !important;
            color: #0969da !important;
            font-weight: 500 !important;
            word-wrap: break-word !important;
            background: #f6f8fa !important;
            padding: 6px 8px !important;
            border-radius: 4px !important;
            border-left: 2px solid #0969da !important;
            font-size: inherit !important;
        }
        
        .compact .mini-suggestion {
            margin-bottom: 6px !important;
            padding: 4px 6px !important;
            font-size: 10px !important;
        }
        
        .large .mini-suggestion {
            margin-bottom: 10px !important;
            padding: 8px 10px !important;
        }
        
        .mini-buttons {
            display: flex !important;
            gap: 6px !important;
            justify-content: flex-end !important;
        }
        
        .compact .mini-buttons {
            gap: 4px !important;
        }
        
        .large .mini-buttons {
            gap: 8px !important;
        }
        
        .mini-accept {
            padding: 5px 10px !important;
            border: 1px solid #28a745 !important;
            border-radius: 4px !important;
            background: #28a745 !important;
            color: white !important;
            cursor: pointer !important;
            font-size: 11px !important;
            font-weight: 500 !important;
            transition: all 0.15s ease !important;
            min-width: 50px !important;
            height: 24px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-family: inherit !important;
            box-shadow: 0 1px 2px rgba(40, 167, 69, 0.2) !important;
        }
        
        .compact .mini-accept {
            padding: 3px 8px !important;
            font-size: 10px !important;
            min-width: 40px !important;
            height: 20px !important;
            border-radius: 3px !important;
        }
        
        .large .mini-accept {
            padding: 6px 12px !important;
            font-size: 12px !important;
            min-width: 60px !important;
            height: 28px !important;
        }
        
        .mini-dismiss {
            padding: 5px 10px !important;
            border: 1px solid #6c757d !important;
            border-radius: 4px !important;
            background: #6c757d !important;
            color: white !important;
            cursor: pointer !important;
            font-size: 11px !important;
            font-weight: 500 !important;
            transition: all 0.15s ease !important;
            min-width: 50px !important;
            height: 24px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-family: inherit !important;
            box-shadow: 0 1px 2px rgba(108, 117, 125, 0.2) !important;
        }
        
        .compact .mini-dismiss {
            padding: 3px 8px !important;
            font-size: 10px !important;
            min-width: 40px !important;
            height: 20px !important;
            border-radius: 3px !important;
        }
        
        .large .mini-dismiss {
            padding: 6px 12px !important;
            font-size: 12px !important;
            min-width: 60px !important;
            height: 28px !important;
        }
        
        .mini-accept:hover {
            background: #218838 !important;
            border-color: #218838 !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3) !important;
        }
        
        .mini-dismiss:hover {
            background: #5a6268 !important;
            border-color: #5a6268 !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 2px 6px rgba(108, 117, 125, 0.3) !important;
        }
        
        .mini-accept:active {
            transform: translateY(0) !important;
            box-shadow: 0 1px 3px rgba(40, 167, 69, 0.2) !important;
            background: #1e7e34 !important;
        }
        
        .mini-dismiss:active {
            transform: translateY(0) !important;
            box-shadow: 0 1px 2px rgba(108, 117, 125, 0.2) !important;
            background: #545b62 !important;
        }
    `;
    document.head.appendChild(style);
}

// Call this when the script loads
injectStyles();

// Robustly detect editor elements for Gmail, Outlook, LinkedIn, textarea, and generic contenteditable
function isEditorElement(el) {
    if (!el) return false;
    if (el.tagName === 'TEXTAREA' || el.isContentEditable) return true;
    // Gmail Compose
    if (el.classList && el.classList.contains('Am') && el.classList.contains('Al') && el.isContentEditable) return true;
    // Outlook Web
    if (el.getAttribute && el.getAttribute('aria-label') === 'Message body' && el.isContentEditable) return true;
    // LinkedIn DMs (role="textbox")
    if (el.getAttribute && el.getAttribute('role') === 'textbox' && el.isContentEditable) return true;
    return false;
}

// Attach input listeners to all editors in a given root (document or iframe)
function attachEditorListeners(root=document) {
    // Robust selectors for Gmail, LinkedIn, Outlook, textarea, and generic contenteditable
    const selectors = [
        'textarea',
        '[contenteditable="true"]',
        '.Am.Al[contenteditable="true"]', // Gmail
        '[aria-label="Message body"][contenteditable="true"]', // Outlook
        '[role="textbox"][contenteditable="true"]' // LinkedIn
    ];
    const editors = root.querySelectorAll(selectors.join(", "));
    editors.forEach(editor => {
        if (editor._diyGrammarGuardListenerAttached) return;
        editor.addEventListener('keyup', editorInputListener, true);
        editor.addEventListener('keydown', () => clearTimeout(typingTimer), true);
        editor._diyGrammarGuardListenerAttached = true;
    });
}

function editorInputListener(e) {
    if (isEditorElement(e.target)) {
        activeElement = e.target;
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => processText(activeElement), doneTypingInterval);
    }
}

// Recursively walk all frames and attach listeners
function walkAllFrames(win) {
    try {
        attachEditorListeners(win.document);
    } catch (e) {}
    // Recursively walk iframes
    const iframes = win.document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        try {
            if (iframe.contentWindow && iframe.contentDocument) {
                walkAllFrames(iframe.contentWindow);
            }
        } catch (e) {}
    });
}

// Initial attachment in all frames
walkAllFrames(window);

// MutationObserver to handle dynamically loaded editors in all frames
function observeAllFrames(win) {
    try {
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        attachEditorListeners(node);
                        // If a new iframe is added, observe it too
                        if (node.tagName === 'IFRAME' && node.contentWindow) {
                            try { walkAllFrames(node.contentWindow); observeAllFrames(node.contentWindow); } catch (e) {}
                        }
                    }
                });
            }
        });
        observer.observe(win.document.body, { childList: true, subtree: true });
    } catch (e) {}
    // Recursively observe iframes
    const iframes = win.document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        try {
            if (iframe.contentWindow && iframe.contentDocument) {
                observeAllFrames(iframe.contentWindow);
            }
        } catch (e) {}
    });
}
observeAllFrames(window);

async function processText(element) {
    if (!element) return;
    removeCurrentTooltip();
    removeHighlights(element);

    const text = element.value !== undefined ? element.value : element.innerText;
    if (text.trim().length < 15) return;

    console.log('[Grammar Guard] Processing text:', text.substring(0, 100) + '...');
    
    try {
        // Check if extension context is still valid
        if (!chrome.runtime?.id) {
            console.log('[Grammar Guard] Extension context invalidated, reloading page...');
            window.location.reload();
            return;
        }
        
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'checkGrammar',
                text: text
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });

        console.log('Gemini response:', response); // Debug log
        if (response.error) {
            displayErrorTooltip(element, response.error);
            return;
        }
        // 1. Apply inline corrections first
        if (response.inlineCorrections && response.inlineCorrections.length > 0 && element.isContentEditable) {
            highlightInlineCorrections(element, response.inlineCorrections);
        }
        // 2. Then show the full rewrite suggestion popup
        if (response.fullRewrite) {
            displayFullRewritePopup(element, response.fullRewrite, element.tagName === 'TEXTAREA');
        }
    } catch (error) {
        console.error('[Grammar Guard] Error processing text:', error);
        
        // If it's an extension context error, reload the page
        if (error.message.includes('Extension context invalidated') || 
            error.message.includes('message port closed') ||
            !chrome.runtime?.id) {
            console.log('[Grammar Guard] Extension context lost, reloading page...');
            window.location.reload();
        }
    }
}

function removeCurrentTooltip() {
    if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
    }
}

// --- Draggable Popup Logic ---
function createPopup() {
    removeCurrentTooltip();
    const popup = document.createElement('div');
    popup.id = 'diy-grammar-tooltip';
    popup.innerHTML = `
        <div class="tooltip-header">
            <span>Suggestion</span>
            <button class="tooltip-close" aria-label="Close">&times;</button>
        </div>
        <div class="tooltip-pointer"></div>
        <div class="suggestion-text"></div>
        <div class="tooltip-buttons"></div>
    `;
    document.body.appendChild(popup);
    currentTooltip = popup;
    popup.querySelector('.tooltip-close').onclick = () => removeCurrentTooltip();
    return popup;
}

function makePopupDraggable(popup) {
    const header = popup.querySelector('.tooltip-header');
    let isDragging = false;
    let offsetX = 0, offsetY = 0;

    header.style.cursor = 'move';

    function onMouseMove(e) {
        if (!isDragging) return;
        let left = e.clientX - offsetX;
        let top = e.clientY - offsetY;
        if (left < 0) left = 0;
        if (top < 0) top = 0;
        if (left + popup.offsetWidth > window.innerWidth) left = window.innerWidth - popup.offsetWidth;
        if (top + popup.offsetHeight > window.innerHeight) top = window.innerHeight - popup.offsetHeight;
        popup.style.left = `${left + window.scrollX}px`;
        popup.style.top = `${top + window.scrollY}px`;
        popup.style.right = '';
        popup.style.bottom = '';
    }

    function onMouseUp() {
        isDragging = false;
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    header.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isDragging = true;
        const rect = popup.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

// Patch createPopup to make the popup draggable (self-contained, safe)
(function() {
    const originalCreatePopup = createPopup;
    window.createPopup = function() {
        const popup = originalCreatePopup.apply(this, arguments);
        makePopupDraggable(popup);
        return popup;
    };
})();

function positionPopup(popup, element) {
    const rect = element.getBoundingClientRect();
    // Temporarily show the popup to measure its size
    popup.style.visibility = 'hidden';
    popup.style.display = 'block';
    const popupRect = popup.getBoundingClientRect();

    let top = window.scrollY + rect.bottom + 10;
    let left = window.scrollX + rect.left;

    // If off right edge, shift left
    if (left + popupRect.width > window.scrollX + window.innerWidth) {
        left = window.scrollX + window.innerWidth - popupRect.width - 10;
    }
    // If off bottom edge, show above the editor
    if (top + popupRect.height > window.scrollY + window.innerHeight) {
        top = window.scrollY + rect.top - popupRect.height - 10;
    }
    // Prevent negative left/top
    if (left < 0) left = 10;
    if (top < 0) top = 10;

    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
    popup.style.visibility = 'visible';
}

function displayFullRewritePopup(element, suggestion, isTextarea = false) {
    const popup = createPopup();
    popup.querySelector('.suggestion-text').innerText = suggestion;
    let extraMsg = '';
    if (isTextarea) {
        extraMsg = '<div style="color:#d9534f;font-size:13px;margin-top:8px;">Inline suggestions are only available in rich text editors.</div>';
    }
    popup.querySelector('.tooltip-buttons').innerHTML = `
        <button id="accept-full-rewrite" class="tooltip-button accept">Accept</button>
        <button id="dismiss-full-rewrite" class="tooltip-button dismiss">Dismiss</button>
        ${extraMsg}
    `;
    positionPopup(popup, element);
    document.getElementById('accept-full-rewrite').onclick = () => {
        if (element.value !== undefined) {
            element.value = suggestion;
        } else {
            element.innerText = suggestion;
        }
        removeCurrentTooltip();
        removeHighlights(element);
    };
    document.getElementById('dismiss-full-rewrite').onclick = () => {
        removeCurrentTooltip();
    };
}

function displayErrorTooltip(element, errorMessage) {
    const popup = createPopup();
    popup.className = 'error-tooltip';
    popup.querySelector('.suggestion-text').innerText = errorMessage;
    popup.querySelector('.tooltip-buttons').innerHTML = '';
    positionPopup(popup, element);
    setTimeout(() => removeCurrentTooltip(), 8000);
}

function highlightInlineCorrections(element, corrections) {
    // Convert &nbsp; to normal spaces for matching
    let content = element.innerHTML.replace(/&nbsp;/g, ' ');
    console.log('Before highlight:', content);
    corrections.forEach(corr => {
        const regex = new RegExp(escapeRegex(corr.original), 'g');
        content = content.replace(regex, `<span class="mistake" data-suggestion="${escapeHtml(corr.suggestion)}">${corr.original}</span>`);
    });
    console.log('After highlight:', content);
    element.innerHTML = content;
}

function removeHighlights(element) {
    if (element && element.isContentEditable) {
        element.querySelectorAll('span.mistake').forEach(mistake => {
            mistake.outerHTML = mistake.innerText;
        });
        element.normalize();
    }
}

// --- Inline Correction Tooltip Logic ---
let tooltipHovering = false;
let mistakeHovering = false;
let currentMistakeElement = null; // Store reference to current mistake

function determineTooltipSize(textArea) {
    if (!textArea) return '';
    
    const rect = textArea.getBoundingClientRect();
    const area = rect.width * rect.height;
    
    // Check for specific platforms
    const isLinkedInDM = textArea.closest('[data-test-editor-contenteditable]') || 
                        textArea.getAttribute('aria-label')?.includes('Write a message') ||
                        textArea.closest('.msg-form__contenteditable');
    
    const isSmallTextArea = textArea.tagName === 'TEXTAREA' && (rect.height < 100 || rect.width < 300);
    
    const isGmailCompose = textArea.closest('.Am.Al') || 
                          textArea.getAttribute('aria-label')?.includes('Message Body');
    
    // Size determination logic
    if (isLinkedInDM || isSmallTextArea || area < 30000) {
        return 'compact';
    } else if (isGmailCompose || area > 100000) {
        return 'large';
    }
    
    return ''; // Default medium size
}

function showMiniTooltip(target) {
    hideMiniTooltip();
    currentMistakeElement = target; // Store reference
            miniTooltip = document.createElement('div');
            miniTooltip.id = 'diy-grammar-mini-tooltip';
    
    // Determine tooltip size based on context
    const textArea = target.closest('textarea, [contenteditable], [role="textbox"]');
    const sizeClass = determineTooltipSize(textArea);
    if (sizeClass) {
        miniTooltip.classList.add(sizeClass);
    }
    
    miniTooltip.innerHTML = `
        <div class="mini-suggestion">${target.dataset.suggestion}</div>
        <div class="mini-buttons">
            <button class="mini-accept">Accept</button>
            <button class="mini-dismiss">Dismiss</button>
        </div>
    `;
    
    // Append to document.body for proper positioning
            document.body.appendChild(miniTooltip);
    
    // Position the tooltip above the mistake span
    const rect = target.getBoundingClientRect();
    
    // Adjust tooltip dimensions based on size class
    let tooltipWidth = 280;
    let tooltipHeight = 70;
    
    if (miniTooltip.classList.contains('compact')) {
        tooltipWidth = 200;
        tooltipHeight = 50;
    } else if (miniTooltip.classList.contains('large')) {
        tooltipWidth = 320;
        tooltipHeight = 80;
    }
    
    const arrowOffset = 20;
    
    // Center the tooltip above the word
    let left = window.scrollX + rect.left + (rect.width / 2) - (tooltipWidth / 2);
    let top = window.scrollY + rect.top - tooltipHeight - 10;
    
    // Keep tooltip on screen horizontally
    if (left < 10) {
        left = 10;
    } else if (left + tooltipWidth > window.innerWidth - 10) {
        left = window.innerWidth - tooltipWidth - 10;
    }
    
    // If tooltip would go off top of screen, show it below the word
    let showBelow = false;
    if (top < window.scrollY + 10) {
        top = window.scrollY + rect.bottom + 10;
        showBelow = true;
    }
    
    // Calculate arrow position relative to the word center
    const wordCenterX = window.scrollX + rect.left + (rect.width / 2);
    const tooltipLeftEdge = left;
    let arrowLeft = wordCenterX - tooltipLeftEdge;
    
    // Constrain arrow position within tooltip bounds
    arrowLeft = Math.max(15, Math.min(arrowLeft, tooltipWidth - 15));
    
    // Store positioning info for arrow placement
    miniTooltip.setAttribute('data-show-below', showBelow);
    miniTooltip.setAttribute('data-arrow-left', arrowLeft);
    
    miniTooltip.style.top = `${top}px`;
    miniTooltip.style.left = `${left}px`;
    
    // Force visibility with inline styles as backup
    miniTooltip.style.opacity = '1';
    miniTooltip.style.visibility = 'visible';
    miniTooltip.style.display = 'block';
    
    // Position the arrow dynamically
    setTimeout(() => {
        const arrowLeftPos = miniTooltip.getAttribute('data-arrow-left');
        if (arrowLeftPos) {
            const beforeArrow = `
                #diy-grammar-mini-tooltip::before {
                    left: ${arrowLeftPos}px !important;
                }
                #diy-grammar-mini-tooltip::after {
                    left: ${arrowLeftPos}px !important;
                }
            `;
            
            // Add or update arrow positioning styles
            let arrowStyle = document.getElementById('diy-grammar-arrow-style');
            if (!arrowStyle) {
                arrowStyle = document.createElement('style');
                arrowStyle.id = 'diy-grammar-arrow-style';
                document.head.appendChild(arrowStyle);
            }
            arrowStyle.textContent = beforeArrow;
        }
    }, 0);
    
    // Add hover events to prevent disappearing
    miniTooltip.addEventListener('mouseenter', () => {
        tooltipHovering = true;
    });
    
    miniTooltip.addEventListener('mouseleave', () => {
        tooltipHovering = false;
        setTimeout(() => {
            if (!mistakeHovering && !tooltipHovering) {
                hideMiniTooltip();
            }
        }, 150); // Increased delay to allow moving to tooltip
    });
    
    console.log('[Grammar Guard] Mini tooltip created for:', target.dataset.suggestion);
    console.log('[Grammar Guard] Tooltip positioned at:', {top, left});
    console.log('[Grammar Guard] Tooltip element:', miniTooltip);
}

function hideMiniTooltip() {
    if (miniTooltip) {
        miniTooltip.remove();
        miniTooltip = null;
    }
    tooltipHovering = false;
    mistakeHovering = false;
    currentMistakeElement = null; // Clear reference
}

// Event delegation for mistake span hover tooltips - Updated version
document.addEventListener('mouseenter', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('mistake')) {
        mistakeHovering = true;
        console.log('[Grammar Guard] Mouse entered mistake span:', e.target.dataset.suggestion);
        showMiniTooltip(e.target);
    }
}, true);

document.addEventListener('mouseleave', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('mistake')) {
        mistakeHovering = false;
        console.log('[Grammar Guard] Mouse left mistake span');
        setTimeout(() => {
            if (!mistakeHovering && !tooltipHovering) {
                hideMiniTooltip();
            }
        }, 150); // Increased delay to allow moving to tooltip
    }
}, true);

document.addEventListener('click', (e) => {
    if (e.target && e.target.classList) {
        if (e.target.classList.contains('mini-accept')) {
            console.log('[Grammar Guard] Accept clicked');
            e.preventDefault();
            e.stopPropagation();
            if (currentMistakeElement && currentMistakeElement.parentNode) {
                console.log('[Grammar Guard] Replacing:', currentMistakeElement.innerText, 'with:', currentMistakeElement.dataset.suggestion);
                currentMistakeElement.outerHTML = currentMistakeElement.dataset.suggestion;
                hideMiniTooltip();
            } else {
                console.log('[Grammar Guard] No current mistake element found');
            }
        } else if (e.target.classList.contains('mini-dismiss')) {
            console.log('[Grammar Guard] Dismiss clicked');
            e.preventDefault();
            e.stopPropagation();
            if (currentMistakeElement && currentMistakeElement.parentNode) {
                console.log('[Grammar Guard] Removing highlight from:', currentMistakeElement.innerText);
                currentMistakeElement.outerHTML = currentMistakeElement.innerText;
                hideMiniTooltip();
            } else {
                console.log('[Grammar Guard] No current mistake element found');
            }
        }
    }
});