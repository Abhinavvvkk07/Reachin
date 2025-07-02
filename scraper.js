console.log("Cold Outreach Scraper: Module loaded");

// Global variables for scraper functionality
let scrapingButton = null;
let isScrapingInProgress = false;
let scrapedData = null;

// Check if current page supports scraping
function shouldShowScrapingButton() {
    const url = window.location.href;
    
    // LinkedIn profile pages (including various LinkedIn domains)
    if (url.includes('linkedin.com/in/') || url.includes('www.linkedin.com/in/')) {
        return true;
    }
    
    // Don't show on LinkedIn ad URLs or other LinkedIn non-profile pages
    if (url.includes('linkedin.com') && !url.includes('/in/')) {
        return false;
    }
    
    // Personal website indicators (can be expanded)
    const personalSiteIndicators = [
        'about', 'bio', 'resume', 'portfolio', 'profile',
        'contact', 'experience', 'work', 'cv'
    ];
    
    const hasPersonalContent = personalSiteIndicators.some(keyword => 
        url.toLowerCase().includes(keyword) ||
        document.title.toLowerCase().includes(keyword) ||
        document.querySelector('meta[name="description"]')?.content?.toLowerCase().includes(keyword)
    );
    
    return hasPersonalContent;
}

// Create the floating scraper button
function createScrapingButton() {
    if (scrapingButton || !shouldShowScrapingButton()) {
        return;
    }
    
    scrapingButton = document.createElement('div');
    scrapingButton.id = 'cold-outreach-scraper-btn';
    scrapingButton.innerHTML = `
        <div class="scraper-btn-content">
            <span class="scraper-icon">📥</span>
            <span class="scraper-text">Save Profile</span>
        </div>
    `;
    
    // Position in bottom-right corner
    scrapingButton.style.cssText = `
        position: fixed !important;
        bottom: 20px !important;
        right: 20px !important;
        z-index: 999998 !important;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        color: white !important;
        border: none !important;
        border-radius: 12px !important;
        padding: 12px 16px !important;
        cursor: pointer !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1) !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        user-select: none !important;
        max-width: 140px !important;
    `;
    
    // Hover effects
    scrapingButton.addEventListener('mouseenter', () => {
        scrapingButton.style.transform = 'translateY(-2px) scale(1.02)';
        scrapingButton.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.15)';
    });
    
    scrapingButton.addEventListener('mouseleave', () => {
        scrapingButton.style.transform = 'translateY(0) scale(1)';
        scrapingButton.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)';
    });
    
    // Make draggable
    makeDraggable(scrapingButton);
    
    // Click handler
    scrapingButton.addEventListener('click', handleScrapingClick);
    
    document.body.appendChild(scrapingButton);
    console.log('[Cold Outreach] Scraping button created');
}

// Make button draggable
function makeDraggable(element) {
    let isDragging = false;
    let startX, startY, initialX, initialY;
    
    element.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Only left click
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = element.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        
        element.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        let newX = initialX + deltaX;
        let newY = initialY + deltaY;
        
        // Keep within viewport bounds
        const rect = element.getBoundingClientRect();
        newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
        newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));
        
        element.style.left = `${newX}px`;
        element.style.right = 'auto';
        element.style.top = `${newY}px`;
        element.style.bottom = 'auto';
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            element.style.cursor = 'pointer';
            document.body.style.userSelect = '';
        }
    });
}

// Handle scraping button click
async function handleScrapingClick(e) {
    e.stopPropagation();
    
    if (isScrapingInProgress) {
        return;
    }
    
    isScrapingInProgress = true;
    updateButtonState('scraping');
    
    try {
        // Wait for dynamic content to load
        await waitForContent();
        
        // Scrape profile data
        const profileData = await scrapeProfileData();
        console.log('[Cold Outreach] Scraped profile data:', profileData);
        
        if (profileData) {
            console.log('[Cold Outreach] Profile data is valid, prompting for tag');
            // Prompt for custom tag
            const customTag = await promptForTag(profileData.name);
            console.log('[Cold Outreach] User entered tag:', customTag);
            
            if (customTag) {
                // Store data locally
                const stored = await storeProfileData(customTag, profileData);
                
                if (stored) {
                    updateButtonState('success');
                    setTimeout(() => updateButtonState('default'), 2000);
                } else {
                    // Storage failed - check if it's context invalidation
                    if (!chrome || !chrome.storage || !chrome.storage.local) {
                        updateButtonState('context-error');
                        setTimeout(() => updateButtonState('default'), 4000);
                    } else {
                        updateButtonState('error');
                        setTimeout(() => updateButtonState('default'), 2000);
                    }
                }
            } else {
                updateButtonState('default');
            }
        } else {
            updateButtonState('error');
            setTimeout(() => updateButtonState('default'), 2000);
        }
    } catch (error) {
        console.error('[Cold Outreach] Scraping failed:', error);
        updateButtonState('error');
        setTimeout(() => updateButtonState('default'), 2000);
    } finally {
        isScrapingInProgress = false;
    }
}

// Update button visual state
function updateButtonState(state) {
    if (!scrapingButton) return;
    
    const content = scrapingButton.querySelector('.scraper-btn-content');
    
    switch (state) {
        case 'scraping':
            content.innerHTML = '<span class="scraper-icon">⏳</span><span class="scraper-text">Scraping...</span>';
            scrapingButton.style.background = 'linear-gradient(135deg, #ffa726 0%, #fb8c00 100%)';
            break;
        case 'success':
            content.innerHTML = '<span class="scraper-icon">✅</span><span class="scraper-text">Saved!</span>';
            scrapingButton.style.background = 'linear-gradient(135deg, #66bb6a 0%, #43a047 100%)';
            break;
        case 'error':
            content.innerHTML = '<span class="scraper-icon">❌</span><span class="scraper-text">Failed</span>';
            scrapingButton.style.background = 'linear-gradient(135deg, #ef5350 0%, #d32f2f 100%)';
            break;
        case 'context-error':
            content.innerHTML = '<span class="scraper-icon">🔄</span><span class="scraper-text">Refresh Page</span>';
            scrapingButton.style.background = 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)';
            break;
        default:
            content.innerHTML = '<span class="scraper-icon">📥</span><span class="scraper-text">Save Profile</span>';
            scrapingButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
}

// Wait for dynamic content to load
function waitForContent(maxWait = 3000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        function checkContent() {
            const hasContent = document.querySelector('h1, .pv-text-details__left-panel, [data-generated-suggestion-target]');
            
            if (hasContent || Date.now() - startTime > maxWait) {
                resolve();
            } else {
                setTimeout(checkContent, 500);
            }
        }
        
        checkContent();
    });
}

// Scrape profile data from current page
async function scrapeProfileData() {
    const url = window.location.href;
    
    if (url.includes('linkedin.com/in/')) {
        return scrapeLinkedInProfile();
    } else {
        return scrapePersonalWebsite();
    }
}

// Scrape LinkedIn profile data
function scrapeLinkedInProfile() {
    try {
        const profileData = {
            platform: 'LinkedIn',
            url: window.location.href,
            timestamp: new Date().toISOString(),
            name: '',
            headline: '',
            about: '',
            experience: [],
            education: [],
            skills: [],
            location: ''
        };
        
        // Clean URL (remove tracking parameters)
        const cleanUrl = window.location.origin + window.location.pathname;
        profileData.url = cleanUrl;
        
        // Name - try multiple selectors for different LinkedIn layouts
        const nameSelectors = [
            'h1.text-heading-xlarge',
            '.pv-text-details__left-panel h1',
            '.ph5 h1',
            'h1[data-generated-suggestion-target]',
            '.artdeco-entity-lockup__title h1',
            '.pv-top-card-profile-picture__container + div h1',
            '.top-card-layout__title',  // New LinkedIn layout
            '.profile-topcard-person-entity__name'  // Another new layout variant
        ];
        
        for (const selector of nameSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                profileData.name = element.textContent.trim();
                break;
            }
        }
        
        // Headline - try multiple selectors
        const headlineSelectors = [
            '.text-body-medium.break-words',
            '.pv-text-details__left-panel .text-body-medium',
            '.pv-top-card-profile-picture__container + div .text-body-medium',
            '.artdeco-entity-lockup__subtitle',
            '[data-generated-suggestion-target] + div .text-body-medium',
            '.top-card-layout__headline',  // New LinkedIn layout
            '.profile-topcard-person-entity__headline'  // Another new layout variant
        ];
        
        for (const selector of headlineSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                profileData.headline = element.textContent.trim();
                break;
            }
        }
        
        // About section - try multiple selectors (updated for 2025 LinkedIn)
        // First, specifically exclude the Featured section
        const aboutSelectors = [
            // New 2025 LinkedIn structure - but exclude Featured section
            '[data-view-name="profile-component-about"]:not([data-view-name*="featured"]) .pv-shared-text-with-see-more',
            '[data-view-name="profile-component-about"]:not([data-view-name*="featured"]) .inline-show-more-text__text',
            '[data-view-name="profile-component-about"]:not([data-view-name*="featured"]) .pv-shared-text-with-see-more__text',
            // Try to find about section that's not featured
            '#about ~ .artdeco-card .pv-shared-text-with-see-more',
            '#about ~ .artdeco-card .inline-show-more-text__text',
            '#about ~ div:not([data-view-name*="featured"]) .pv-shared-text-with-see-more',
            // Fallback selectors
            '.pv-about-section .pv-shared-text-with-see-more',
            '.pv-about__summary-text',
            '.pv-about__summary-text .lt-line-clamp__raw-line',
            '.core-section-container__content .pv-shared-text-with-see-more'
        ];
        
        for (const selector of aboutSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                let aboutText = element.textContent.trim();
                // Skip if it contains "Featured" content markers
                if (aboutText.includes('Featured') || aboutText.includes('LinkLink') || aboutText.length > 1000) {
                    console.log(`[Cold Outreach] Skipping selector ${selector} - contains Featured content`);
                    continue;
                }
                // Clean up common LinkedIn artifacts
                aboutText = aboutText.replace(/^About\s*/, '').replace(/\s*…see more$/, '').trim();
                if (aboutText && aboutText.length > 10 && aboutText.length < 500) {
                    profileData.about = aboutText;
                    console.log(`[Cold Outreach] Found about text with selector: ${selector}`);
                    break;
                }
            }
        }
        
        // If still no about, try manual inspection of page sections
        if (!profileData.about) {
            console.log(`[Cold Outreach] No about text found with standard selectors, trying manual inspection`);
            
            // Look for long text blocks that might be the about section
            const allTextElements = document.querySelectorAll('.pv-shared-text-with-see-more, .inline-show-more-text__text, .pv-shared-text-with-see-more__text');
            for (const element of allTextElements) {
                const text = element.textContent.trim();
                if (text.length > 100 && text.length < 2000 &&
                    !text.includes('Featured') && !text.includes('LinkLink') &&
                    !text.includes('Top skills') && !text.includes('Experience') &&
                    // Check if it looks like a bio/about (contains personal pronouns or describes background)
                    (text.includes("I'm") || text.includes("I am") || text.includes("My") || 
                     text.includes("graduate") || text.includes("experience") || text.includes("background"))) {
                    console.log(`[Cold Outreach] Found potential about text via manual inspection: ${text.substring(0, 100)}...`);
                    profileData.about = text;
                    break;
                }
            }
        }
        
        // If still no about, try looking for any text in about section
        if (!profileData.about) {
            console.log(`[Cold Outreach] Still no about text found, trying section-based approaches`);
            const aboutSection = document.querySelector('#about');
            if (aboutSection) {
                // Try multiple approaches to find the about content
                const approaches = [
                    () => {
                        // Look for the actual about content after the About header
                        const aboutHeader = document.querySelector('#about');
                        if (aboutHeader) {
                            // Find the parent card/section containing the about header
                            const aboutCard = aboutHeader.closest('.artdeco-card, .pvs-header__container, .pvs-header');
                            if (aboutCard) {
                                // Look for text content in the same card but not in nested cards
                                const textElements = aboutCard.querySelectorAll('.pv-shared-text-with-see-more, .inline-show-more-text__text, .pv-shared-text-with-see-more__text');
                                for (const textElement of textElements) {
                                    const text = textElement.textContent.trim();
                                    if (text && text.length > 50 && text.length < 2000 && 
                                        !text.includes('Featured') && !text.includes('LinkLink') &&
                                        !text.includes('Top skills') && !text.includes('Experience')) {
                                        console.log(`[Cold Outreach] Found about text in card approach: ${text.substring(0, 100)}...`);
                                        return text;
                                    }
                                }
                            }
                        }
                        return null;
                    },
                    () => aboutSection.nextElementSibling?.textContent,
                    () => aboutSection.parentElement?.nextElementSibling?.textContent,
                    () => aboutSection.closest('.artdeco-card')?.querySelector('.pv-shared-text-with-see-more')?.textContent,
                    () => aboutSection.closest('.pvs-header')?.nextElementSibling?.textContent
                ];
                
                for (const approach of approaches) {
                    try {
                        const textContent = approach()?.trim();
                        if (textContent && textContent.length > 20 && textContent.length < 500 && 
                            !textContent.includes('Featured') && !textContent.includes('LinkLink') &&
                            !textContent.startsWith('About')) {
                            profileData.about = textContent.replace(/\s*…see more$/, '').trim();
                            console.log(`[Cold Outreach] Found about text via fallback approach`);
                            break;
                        }
                    } catch (e) {
                        // Ignore errors in fallback approaches
                    }
                }
            }
        }
        
        // Experience - improved for 2025 LinkedIn layout
        // First, try to find the actual Experience section specifically
        let experienceSection = null;
        const experienceHeader = document.querySelector('#experience');
        if (experienceHeader) {
            // Find the container that holds the experience items
            const containers = [
                experienceHeader.closest('.artdeco-card'),
                experienceHeader.parentElement?.nextElementSibling,
                experienceHeader.nextElementSibling
            ].filter(Boolean);
            
            for (const container of containers) {
                const items = container.querySelectorAll('.pvs-list__paged-list-item, .pvs-entity');
                if (items.length > 0) {
                    experienceSection = container;
                    console.log(`[Cold Outreach] Found experience section with ${items.length} items`);
                    break;
                }
            }
        }
        
        const experienceSelectors = [
            // If we found the experience section, search within it
            ...(experienceSection ? [
                () => experienceSection.querySelectorAll('.pvs-list__paged-list-item'),
                () => experienceSection.querySelectorAll('.pvs-entity')
            ] : []),
            // Standard selectors
            '[data-view-name="profile-component-experience"] .pvs-list__paged-list-item',
            '[data-view-name="profile-component-experience"] .pvs-entity',
            '#experience ~ * .pvs-list__paged-list-item',
            '#experience ~ * .pvs-entity',
            // Fallback selectors
            '#experience ~ div .pvs-list__paged-list-item',
            '[data-view-name="profile-component-entity"] .pvs-entity',
            '.pv-entity__summary-info',
            '#experience ~ .pvs-list .pvs-list__paged-list-item',
            '.experience-section .pv-entity__summary-info'
        ];
        
        let experienceElements = [];
        for (const selector of experienceSelectors) {
            if (typeof selector === 'function') {
                experienceElements = selector();
            } else {
                experienceElements = document.querySelectorAll(selector);
            }
            if (experienceElements.length > 0) {
                console.log(`[Cold Outreach] Found ${experienceElements.length} experience elements with selector: ${typeof selector === 'function' ? 'function' : selector}`);
                break;
            }
        }
        
        // If no experience elements found, try a broader search
        if (experienceElements.length === 0) {
            console.log(`[Cold Outreach] No experience elements found with standard selectors, trying broader search`);
            const allElements = document.querySelectorAll('[data-view-name], .pvs-entity, .artdeco-card');
            console.log(`[Cold Outreach] Found ${allElements.length} potential container elements to search`);
            
            // Look for elements that might contain experience data
            const potentialExperienceElements = Array.from(allElements).filter(el => {
                const text = el.textContent.toLowerCase();
                return text.includes('experience') || text.includes('work') || text.includes('job') || 
                       el.querySelector('[data-view-name*="experience"]') ||
                       (el.textContent.includes('@') && el.textContent.includes('·'));
            });
            
            if (potentialExperienceElements.length > 0) {
                console.log(`[Cold Outreach] Found ${potentialExperienceElements.length} potential experience containers`);
                experienceElements = potentialExperienceElements.slice(0, 5); // Limit to avoid too much processing
            }
        }
        
        profileData.experience = Array.from(experienceElements).slice(0, 3).map((exp, index) => {
            console.log(`[Cold Outreach] Processing experience item ${index + 1}:`, exp);
            
            // Try multiple selectors for job title
            const titleSelectors = [
                '.pvs-entity__path-node .t-bold span[aria-hidden="true"]',
                '.pvs-entity__path-node h3 span[aria-hidden="true"]',
                '.mr1.hoverable-link-text',
                '.pv-entity__summary-info-v2 h3',
                '.pvs-entity__path-node h3',
                '.t-bold span[aria-hidden="true"]',
                'h3 span[aria-hidden="true"]',
                '.t-bold',
                'h3'
            ];
            
            let title = '';
            for (const selector of titleSelectors) {
                const element = exp.querySelector(selector);
                if (element && element.textContent.trim()) {
                    title = element.textContent.trim();
                    console.log(`[Cold Outreach] Found title "${title}" with selector: ${selector}`);
                    break;
                }
            }
            
            // Try multiple selectors for company
            const companySelectors = [
                '.pvs-entity__path-node .t-14.t-normal span[aria-hidden="true"]',
                '.pvs-entity__caption-wrapper .t-14 span[aria-hidden="true"]',
                '.pv-entity__secondary-title',
                '.pv-entity__summary-info .pv-entity__secondary-title',
                '.pvs-entity__path-node .t-14',
                '.t-14.t-normal span[aria-hidden="true"]',
                '.pvs-entity__caption-wrapper .t-14',
                '.t-14.t-normal',
                '.t-14'
            ];
            
            let company = '';
            for (const selector of companySelectors) {
                const element = exp.querySelector(selector);
                if (element && element.textContent.trim()) {
                    company = element.textContent.trim();
                    console.log(`[Cold Outreach] Found company "${company}" with selector: ${selector}`);
                    break;
                }
            }
            
            // Try multiple selectors for duration
            const durationSelectors = [
                '.pv-entity__bullet-item',
                '.pv-entity__summary-info .pv-entity__bullet-item-v2',
                '.pvs-entity__caption-wrapper .t-12',
                '.t-12.t-normal span[aria-hidden="true"]'
            ];
            
            let duration = '';
            for (const selector of durationSelectors) {
                const element = exp.querySelector(selector);
                if (element && element.textContent.trim()) {
                    duration = element.textContent.trim();
                    break;
                }
            }
            
            // Clean up the data and validate it makes sense
            const result = {
                title: title,
                company: company,
                duration: duration
            };
            
            // If company text is too long (>200 chars), it's probably wrong content
            if (company && company.length > 200) {
                console.log(`[Cold Outreach] Company text too long (${company.length} chars), likely wrong content`);
                result.company = '';
            }
            
            // Filter out obvious non-job titles but keep legitimate long titles
            if (title && (
                title.toLowerCase().includes('top skills') || 
                title.toLowerCase().includes('featured') ||
                title.includes('...more') ||
                title.includes('see more') ||
                title.match(/^\d+\+?$/) ||  // Numbers like "500+"
                title.includes('connections') ||
                title.includes('mutual') ||
                // Skip if it looks like a person's name (First Last pattern) but allow job titles
                (title.split(' ').length === 2 && !title.includes('at') && !title.includes('&') && 
                 /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(title) && title.length < 20)
            )) {
                console.log(`[Cold Outreach] Skipping invalid title: ${title}`);
                return null;
            }
            
            // Clean up duplicate text in titles (like "Co-Founder...Co-Founder...")
            if (title && title.includes(title.substring(0, title.length/2))) {
                const halfLength = Math.floor(title.length / 2);
                const firstHalf = title.substring(0, halfLength);
                const secondHalf = title.substring(halfLength);
                if (firstHalf === secondHalf) {
                    result.title = firstHalf;
                    console.log(`[Cold Outreach] Cleaned duplicate title: ${firstHalf}`);
                }
            }
            
            return result;
        }).filter(exp => {
            if (!exp || !exp.title) return false;
            
            // Only reject if title is clearly invalid
            const invalidPatterns = [
                'top skills', 'featured', '...more', 'see more', 
                'connections', 'mutual', 'show more'
            ];
            
            const isInvalid = invalidPatterns.some(pattern => 
                exp.title.toLowerCase().includes(pattern.toLowerCase())
            );
            
            if (isInvalid) {
                console.log(`[Cold Outreach] Filtering out invalid experience: ${exp.title}`);
                return false;
            }
            
            return true;
        });
        
        // Education - scrape education details (updated for 2025)
        const educationSelectors = [
            // New 2025 LinkedIn structure
            '[data-view-name="profile-component-education"] .pvs-list__paged-list-item',
            '[data-view-name="profile-component-education"] .pvs-entity',
            '#education ~ * .pvs-list__paged-list-item',
            '#education ~ * .pvs-entity',
            // Fallback selectors
            '#education ~ div .pvs-list__paged-list-item',
            '[data-view-name="profile-component-entity"][data-section="educationsDetails"] .pvs-entity',
            '.education-section .pv-entity__summary-info',
            '#education ~ .pvs-list .pvs-list__paged-list-item'
        ];
        
        let educationElements = [];
        for (const selector of educationSelectors) {
            educationElements = document.querySelectorAll(selector);
            if (educationElements.length > 0) {
                console.log(`[Cold Outreach] Found ${educationElements.length} education elements with selector: ${selector}`);
                break;
            }
        }
        
        profileData.education = Array.from(educationElements).slice(0, 3).map(edu => {
            // Try multiple selectors for school name
            const schoolSelectors = [
                '.mr1.hoverable-link-text',
                '.pv-entity__summary-info-v2 h3',
                '.pvs-entity__path-node h3',
                '.t-bold span[aria-hidden="true"]',
                'h3 span[aria-hidden="true"]'
            ];
            
            let school = '';
            for (const selector of schoolSelectors) {
                const element = edu.querySelector(selector);
                if (element && element.textContent.trim()) {
                    school = element.textContent.trim();
                    break;
                }
            }
            
            // Try multiple selectors for degree/field
            const degreeSelectors = [
                '.pv-entity__secondary-title',
                '.pv-entity__summary-info .pv-entity__secondary-title',
                '.pvs-entity__path-node .t-14',
                '.t-14.t-normal span[aria-hidden="true"]',
                '.pvs-entity__caption-wrapper .t-14'
            ];
            
            let degree = '';
            for (const selector of degreeSelectors) {
                const element = edu.querySelector(selector);
                if (element && element.textContent.trim()) {
                    degree = element.textContent.trim();
                    break;
                }
            }
            
            // Try multiple selectors for years
            const yearSelectors = [
                '.pv-entity__bullet-item',
                '.pv-entity__summary-info .pv-entity__bullet-item-v2',
                '.pvs-entity__caption-wrapper .t-12',
                '.t-12.t-normal span[aria-hidden="true"]'
            ];
            
            let years = '';
            for (const selector of yearSelectors) {
                const element = edu.querySelector(selector);
                if (element && element.textContent.trim()) {
                    years = element.textContent.trim();
                    break;
                }
            }
            
            return {
                school: school,
                degree: degree,
                years: years
            };
        }).filter(edu => edu.school);
        
        // Location
        const locationElement = document.querySelector('.text-body-small.inline.t-black--light.break-words, .pv-text-details__left-panel .text-body-small');
        profileData.location = locationElement ? locationElement.textContent.trim() : '';
        
        // Debug: log what we found
        console.log('[Cold Outreach] LinkedIn profile scraped:', profileData);
        console.log('[Cold Outreach] Current URL:', window.location.href);
        console.log('[Cold Outreach] Page title:', document.title);
        console.log('[Cold Outreach] Available h1 elements:', document.querySelectorAll('h1'));
        
        // DEBUG VALID EXPERIENCES
        if (profileData.experience && profileData.experience.length > 0) {
            console.log('=== VALID EXPERIENCES FOUND ===');
            profileData.experience.forEach((exp, i) => {
                console.log(`Experience ${i + 1}:`);
                console.log(`- Title: "${exp.title}"`);
                console.log(`- Company: "${exp.company}"`);
                console.log(`- Duration: "${exp.duration}"`);
            });
        } else {
            console.log('=== NO VALID EXPERIENCES FOUND ===');
            console.log('This might indicate overly strict filtering or wrong selectors');
        }
        
        return profileData;
        
    } catch (error) {
        console.error('[Cold Outreach] LinkedIn scraping error:', error);
        return null;
    }
}

// Scrape personal website data
function scrapePersonalWebsite() {
    try {
        const profileData = {
            platform: 'Personal Website',
            url: window.location.href,
            timestamp: new Date().toISOString(),
            name: '',
            headline: '',
            about: '',
            experience: [],
            skills: [],
            location: ''
        };
        
        // Name - try various selectors
        const nameSelectors = ['h1', '.name', '#name', '[itemprop="name"]', '.author', '.profile-name'];
        for (const selector of nameSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                profileData.name = element.textContent.trim();
                break;
            }
        }
        
        // Headline/Title
        const headlineSelectors = ['.subtitle', '.tagline', '.title', 'h2', '.bio-title', '[itemprop="jobTitle"]'];
        for (const selector of headlineSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                profileData.headline = element.textContent.trim();
                break;
            }
        }
        
        // About/Bio
        const aboutSelectors = ['.bio', '.about', '.description', '[itemprop="description"]', '.summary'];
        for (const selector of aboutSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                profileData.about = element.textContent.trim();
                break;
            }
        }
        
        // Fallback to meta description
        if (!profileData.about) {
            const metaDescription = document.querySelector('meta[name="description"]');
            if (metaDescription) {
                profileData.about = metaDescription.getAttribute('content');
            }
        }
        
        console.log('[Cold Outreach] Personal website scraped:', profileData);
        return profileData;
        
    } catch (error) {
        console.error('[Cold Outreach] Personal website scraping error:', error);
        return null;
    }
}

// Prompt user for custom tag
function promptForTag(suggestedName) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.id = 'scraper-tag-modal';
        modal.innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-content">
                    <h3>Save Profile</h3>
                    <p>Enter a custom tag for this profile:</p>
                    <input type="text" id="custom-tag-input" placeholder="e.g., sarah-nvidia" />
                    <div class="modal-buttons">
                        <button id="save-tag-btn">Save</button>
                        <button id="cancel-tag-btn">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            z-index: 9999999 !important;
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .modal-backdrop {
                background: rgba(0,0,0,0.5) !important;
                width: 100% !important;
                height: 100% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            .modal-content {
                background: white !important;
                padding: 24px !important;
                border-radius: 12px !important;
                box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important;
                max-width: 400px !important;
                width: 90% !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            }
            .modal-content h3 {
                margin: 0 0 16px 0 !important;
                color: #333 !important;
                font-size: 18px !important;
            }
            .modal-content p {
                margin: 0 0 16px 0 !important;
                color: #666 !important;
            }
            #custom-tag-input {
                width: 100% !important;
                padding: 12px !important;
                border: 2px solid #e1e5e9 !important;
                border-radius: 6px !important;
                font-size: 14px !important;
                margin-bottom: 16px !important;
                box-sizing: border-box !important;
            }
            #custom-tag-input:focus {
                outline: none !important;
                border-color: #667eea !important;
            }
            .modal-buttons {
                display: flex !important;
                gap: 12px !important;
                justify-content: flex-end !important;
            }
            .modal-buttons button {
                padding: 8px 16px !important;
                border: none !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                font-weight: 500 !important;
            }
            #save-tag-btn {
                background: #667eea !important;
                color: white !important;
            }
            #cancel-tag-btn {
                background: #e1e5e9 !important;
                color: #333 !important;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(modal);
        
        const input = document.getElementById('custom-tag-input');
        const saveBtn = document.getElementById('save-tag-btn');
        const cancelBtn = document.getElementById('cancel-tag-btn');
        
        // Generate suggested tag
        if (suggestedName) {
            const suggestion = suggestedName.toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .replace(/\s+/g, '-')
                .substring(0, 20);
            input.value = suggestion;
        }
        
        input.focus();
        input.select();
        
        function cleanup() {
            modal.remove();
            style.remove();
        }
        
        saveBtn.addEventListener('click', () => {
            const tag = input.value.trim();
            if (tag) {
                cleanup();
                resolve(tag);
            }
        });
        
        cancelBtn.addEventListener('click', () => {
            cleanup();
            resolve(null);
        });
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const tag = input.value.trim();
                if (tag) {
                    cleanup();
                    resolve(tag);
                }
            } else if (e.key === 'Escape') {
                cleanup();
                resolve(null);
            }
        });
    });
}

// Store profile data locally
async function storeProfileData(tag, profileData) {
    console.log(`[Cold Outreach] Starting storage process for tag: ${tag}`);
    console.log(`[Cold Outreach] Profile data to store:`, profileData);
    
    // Validate input data
    if (!tag || typeof tag !== 'string') {
        console.error('[Cold Outreach] Invalid tag:', tag);
        return false;
    }
    
    if (!profileData || typeof profileData !== 'object') {
        console.error('[Cold Outreach] Invalid profile data:', profileData);
        return false;
    }
    
    try {
        // Check if chrome.storage is available
        if (!chrome || !chrome.storage || !chrome.storage.local) {
            console.error('[Cold Outreach] Chrome storage API not available - extension context may be invalidated');
            throw new Error('Chrome storage API not available');
        }

        console.log(`[Cold Outreach] Chrome storage API is available`);

        const storageKey = `profile_${tag}`;
        const dataToStore = {
            [storageKey]: {
                ...profileData,
                _lastUpdated: new Date().toISOString(),
                _version: '1.0.0'
            }
        };
        
        console.log(`[Cold Outreach] Attempting to store data with key: ${storageKey}`);
        await chrome.storage.local.set(dataToStore);
        console.log(`[Cold Outreach] Profile data stored under tag: ${tag}`);
        
        // Verify the data was stored
        const verification = await chrome.storage.local.get([storageKey]);
        if (!verification[storageKey]) {
            throw new Error('Storage verification failed - data not found after storage');
        }
        console.log(`[Cold Outreach] Verification - stored data:`, verification);
        
        // Also update the list of stored profiles
        console.log(`[Cold Outreach] Updating stored profiles list`);
        const result = await chrome.storage.local.get(['stored_profiles']);
        const storedProfiles = result.stored_profiles || [];
        console.log(`[Cold Outreach] Current stored profiles:`, storedProfiles);
        
        if (!storedProfiles.includes(tag)) {
            storedProfiles.push(tag);
            await chrome.storage.local.set({ stored_profiles: storedProfiles });
            console.log(`[Cold Outreach] Added ${tag} to stored profiles list`);
        } else {
            console.log(`[Cold Outreach] Tag ${tag} already exists in stored profiles`);
        }
        
        // Final verification
        const finalCheck = await chrome.storage.local.get(['stored_profiles']);
        if (!finalCheck.stored_profiles || !finalCheck.stored_profiles.includes(tag)) {
            throw new Error('Final verification failed - profile not found in stored_profiles list');
        }
        console.log(`[Cold Outreach] Final stored profiles list:`, finalCheck.stored_profiles);
        
        return true;
    } catch (error) {
        console.error('[Cold Outreach] Storage failed:', error);
        console.error('[Cold Outreach] Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        // If it's a context invalidation error, show user-friendly message and try fallback
        if (error.message && (
            error.message.includes('Extension context invalidated') ||
            error.message.includes('Chrome storage API not available')
        )) {
            console.log('[Cold Outreach] Extension was reloaded or storage unavailable. Trying fallback storage...');
            
            // Store data in localStorage as fallback
            try {
                const fallbackData = {
                    tag: tag,
                    profileData: profileData,
                    timestamp: Date.now(),
                    source: 'fallback',
                    _version: '1.0.0'
                };
                localStorage.setItem(`scraper_fallback_${tag}`, JSON.stringify(fallbackData));
                console.log('[Cold Outreach] Data saved to localStorage as fallback');
                
                // Verify fallback storage
                const fallbackVerification = localStorage.getItem(`scraper_fallback_${tag}`);
                if (!fallbackVerification) {
                    throw new Error('Fallback storage verification failed');
                }
                
                return true;
            } catch (localError) {
                console.error('[Cold Outreach] LocalStorage fallback also failed:', localError);
                return false;
            }
        }
        
        return false;
    }
}

// Function to verify storage functionality
async function verifyStorageFunctionality() {
    try {
        // Test chrome.storage.local
        const testData = { test: 'data_' + Date.now() };
        await chrome.storage.local.set({ 'test_key': testData });
        const result = await chrome.storage.local.get(['test_key']);
        
        if (!result.test_key) {
            throw new Error('Storage test failed - data not retrieved');
        }
        
        // Clean up test data
        await chrome.storage.local.remove(['test_key']);
        console.log('[Cold Outreach] Storage functionality verified');
        return true;
    } catch (error) {
        console.error('[Cold Outreach] Storage functionality test failed:', error);
        return false;
    }
}

// Add storage check to initialization
async function initializeScraper() {
    // Verify storage functionality first
    const storageWorks = await verifyStorageFunctionality();
    if (!storageWorks) {
        console.error('[Cold Outreach] Storage functionality not working - some features may be limited');
    }
    
    // Wait for page to stabilize
    setTimeout(() => {
        if (shouldShowScrapingButton()) {
            createScrapingButton();
        }
    }, 2000);
    
    // Re-check on navigation (for SPAs)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            
            // Remove old button
            if (scrapingButton) {
                scrapingButton.remove();
                scrapingButton = null;
            }
            
            // Add new button if needed
            setTimeout(() => {
                if (shouldShowScrapingButton()) {
                    createScrapingButton();
                }
            }, 2000);
        }
    }).observe(document, { subtree: true, childList: true });
}

// Function to check stored profiles (for debugging)
async function checkStoredProfiles() {
    try {
        const result = await chrome.storage.local.get(null); // Get all stored data
        console.log('[Cold Outreach] All stored data:', result);
        
        const profiles = result.stored_profiles || [];
        console.log('[Cold Outreach] Stored profile tags:', profiles);
        
        // Log each profile's data
        for (const tag of profiles) {
            const profileKey = `profile_${tag}`;
            if (result[profileKey]) {
                console.log(`[Cold Outreach] Profile ${tag}:`, result[profileKey]);
            }
        }
        
        return result;
    } catch (error) {
        console.error('[Cold Outreach] Error checking stored profiles:', error);
        return null;
    }
}

// Make function available globally for debugging
window.checkStoredProfiles = checkStoredProfiles;

// ===== EMAIL GENERATOR FEATURE =====

// Email command pattern detection
const EMAIL_COMMAND_PATTERN = /email:\s*([a-zA-Z0-9\-_]+)(?:\s+note-\s*(.+))?/i;
// Message command pattern detection  
const MESSAGE_COMMAND_PATTERN = /message:\s*([a-zA-Z0-9\-_]+)(?:\s+note-\s*(.+))?/i;

// Store Abhinav's persona (cached)
let abhinavPersona = null;

// Initialize Abhinav's persona
async function loadAbhinavPersona() {
    if (abhinavPersona) return abhinavPersona;
    
    try {
        const result = await chrome.storage.sync.get(['abhinavPersona']);
        if (result.abhinavPersona) {
            abhinavPersona = result.abhinavPersona;
        } else {
            // Default persona if not set
            abhinavPersona = {
                name: "Abhinav Kumar",
                role: "CS and Engineering undergraduate at Penn State",
                interests: "internships and research in AI/ML",
                background: "Computer Science and Engineering student",
                university: "Penn State",
                goals: "Seeking opportunities in AI/ML research and development"
            };
            // Save default persona
            await chrome.storage.sync.set({ abhinavPersona: abhinavPersona });
        }
        console.log('[Cold Outreach] Loaded Abhinav persona:', abhinavPersona);
        return abhinavPersona;
    } catch (error) {
        console.error('[Cold Outreach] Error loading persona:', error);
        return null;
    }
}

// Email generation state management
let isGeneratingEmail = false;
let isGeneratingMessage = false;
let lastEmailCommand = null;
let lastMessageCommand = null;

// Detect email command in text
function detectEmailCommand(text) {
    const match = text.match(EMAIL_COMMAND_PATTERN);
    if (match) {
        return {
            fullMatch: match[0],
            tag: match[1],
            note: match[2] || null,
            index: match.index,
            type: 'email'
        };
    }
    return null;
}

// Detect message command in text
function detectMessageCommand(text) {
    const match = text.match(MESSAGE_COMMAND_PATTERN);
    if (match) {
        return {
            fullMatch: match[0],
            tag: match[1],
            note: match[2] || null,
            index: match.index,
            type: 'message'
        };
    }
    return null;
}

// Detect any command (email or message)
function detectCommand(text) {
    return detectEmailCommand(text) || detectMessageCommand(text);
}

// Generate email using LLM
async function generateColdEmail(profileData, persona, userNote) {
    console.log('[Cold Outreach] Generating email for profile:', profileData.name);
    
    try {
        // Construct the prompt
        const basePrompt = `You are ${persona.name}, a ${persona.role} interested in ${persona.interests}. You are writing a personalized cold email to the following person. Use a friendly, professional tone unless instructed otherwise.

RECIPIENT PROFILE:
- Name: ${profileData.name || 'Unknown'}
- Headline: ${profileData.headline || 'Not available'}
- Company/Location: ${profileData.location || 'Not specified'}
- About: ${profileData.about || 'No bio available'}
- Platform: ${profileData.platform || 'Unknown'}

${profileData.experience && profileData.experience.length > 0 ? 
`EXPERIENCE:
${profileData.experience.map(exp => `- ${exp.title} at ${exp.company}`).join('\n')}` : ''}

${userNote ? `SPECIAL INSTRUCTIONS: ${userNote}` : ''}

Generate both a subject line and email body. Format your response EXACTLY like this, including all line breaks:
SUBJECT: [Your subject line here]
---
Dear [Name],

[First paragraph introducing yourself and mentioning something specific from their background]

[Second paragraph explaining why you're reaching out and what you hope to learn]

[Final paragraph with a clear call to action - suggest a specific time frame for meeting]

Best regards,
${persona.name}
${persona.university}
[Your LinkedIn Profile URL]

The subject line should be concise and specific to the recipient's background.
The email body should:
1. Use proper spacing between paragraphs (double line breaks)
2. Reference something specific from their background
3. Explain why you're reaching out
4. Suggest a brief call or meeting
5. Sound authentic and not templated
6. Include proper signature with line breaks

Email:`;

        // Send to LLM via existing background script
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'generateEmail',
                prompt: basePrompt
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });

        if (response.error) {
            throw new Error(response.error);
        }

        return response.email || response.text || 'Email generation failed';
        
    } catch (error) {
        console.error('[Cold Outreach] Email generation failed:', error);
        throw error;
    }
}

// Process email command in text field
async function processEmailCommand(element, commandInfo) {
    if (isGeneratingEmail) {
        console.log('[Cold Outreach] Email generation already in progress');
        return;
    }

    isGeneratingEmail = true;
    lastEmailCommand = commandInfo;

    try {
        console.log('[Cold Outreach] Processing email command:', commandInfo);

        // Show loading state
        showLoadingState(element, commandInfo, 'email');

        // Get profile data
        const profileKey = `profile_${commandInfo.tag}`;
        const result = await chrome.storage.local.get([profileKey]);
        const profileData = result[profileKey];

        if (!profileData) {
            throw new Error(`Profile not found for tag: ${commandInfo.tag}`);
        }

        // Load persona
        const persona = await loadAbhinavPersona();
        if (!persona) {
            throw new Error('Failed to load persona data');
        }

        // Generate email content
        const generatedContent = await generateColdEmail(profileData, persona, commandInfo.note);
        
        // Check if we're in Gmail compose
        const isGmail = window.location.hostname === 'mail.google.com';
        // Check if we're in LinkedIn
        const isLinkedIn = window.location.hostname.includes('linkedin.com');
        
        if (isGmail) {
            // Gmail-specific handling
            const parts = generatedContent.split('---');
            if (parts.length === 2) {
                const subject = parts[0].replace('SUBJECT:', '').trim();
                const body = parts[1].trim();
                
                // Find Gmail subject input
                const subjectInput = document.querySelector('input[name="subjectbox"]');
                if (subjectInput) {
                    subjectInput.value = subject;
                    subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                
                // Format body with proper line breaks for Gmail
                const formattedBody = body
                    .replace(/\n\n/g, '<div><br></div>')
                    .replace(/\n/g, '<div>')
                    .replace(/Best regards,/, '<div><br></div>Best regards,');
                
                if (element.getAttribute('contenteditable') === 'true') {
                    element.innerHTML = formattedBody;
                } else {
                    replaceCommand(element, commandInfo, body);
                }
            } else {
                replaceCommand(element, commandInfo, generatedContent);
            }
        } else if (isLinkedIn) {
            // LinkedIn-specific handling
            // Clear any placeholder text
            if (element.getAttribute('contenteditable') === 'true') {
                element.innerHTML = '';
                // Force focus to clear placeholder
                element.focus();
                // Insert our content with proper formatting
                const formattedContent = generatedContent.split('---')[1].trim()
                    .replace(/\n\n/g, '<div><br></div>')
                    .replace(/\n/g, '<div>')
                    .replace(/Best regards,/, '<div><br></div>Best regards,');
                element.innerHTML = formattedContent;
            } else if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {
                // For regular input fields
                element.value = '';
                element.focus();
                replaceCommand(element, commandInfo, generatedContent.split('---')[1].trim());
            }
            // Dispatch input event to ensure LinkedIn registers the change
            element.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            // For non-Gmail/LinkedIn, keep the full format
            replaceCommand(element, commandInfo, generatedContent);
        }

    } catch (error) {
        console.error('[Cold Outreach] Email command processing failed:', error);
        showError(element, commandInfo, error.message);
    } finally {
        isGeneratingEmail = false;
    }
}

// Generate message using LLM (shorter, more casual format)
async function generateColdMessage(profileData, persona, userNote) {
    console.log('[Cold Outreach] Generating message for profile:', profileData.name);
    
    try {
        // Construct the prompt for messaging
        const basePrompt = `You are ${persona.name}, a ${persona.role} interested in ${persona.interests}. You are writing a personalized LinkedIn direct message or similar platform message to the following person. Keep it conversational, brief, and engaging.

RECIPIENT PROFILE:
- Name: ${profileData.name || 'Unknown'}
- Headline: ${profileData.headline || 'Not available'}
- Company/Location: ${profileData.location || 'Not specified'}
- About: ${profileData.about || 'No bio available'}
- Platform: ${profileData.platform || 'Unknown'}

${profileData.experience && profileData.experience.length > 0 ? 
`EXPERIENCE:
${profileData.experience.map(exp => `- ${exp.title} at ${exp.company}`).join('\n')}` : ''}

${userNote ? `SPECIAL INSTRUCTIONS: ${userNote}` : ''}

Write a brief, engaging message (1-2 short paragraphs, max 100 words) that:
1. Has a casual, friendly greeting
2. References something specific from their background
3. Explains why you're reaching out in 1-2 sentences
4. Ends with a simple question or call-to-action
5. Sounds natural and conversational, not formal

DO NOT include:
- Formal email signatures
- "Dear" or formal greetings
- Long paragraphs
- Business email formatting

Message:`;

        // Send to LLM via existing background script
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'generateMessage',
                prompt: basePrompt
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });

        if (response.error) {
            throw new Error(response.error);
        }

        return response.message || response.text || 'Message generation failed';
        
    } catch (error) {
        console.error('[Cold Outreach] Message generation failed:', error);
        throw error;
    }
}

// Process message command in text field
async function processMessageCommand(element, commandInfo) {
    if (isGeneratingMessage) {
        console.log('[Cold Outreach] Message generation already in progress');
        return;
    }

    isGeneratingMessage = true;
    lastMessageCommand = commandInfo;

    try {
        console.log('[Cold Outreach] Processing message command:', commandInfo);

        // Show loading state
        showLoadingState(element, commandInfo, 'message');

        // Get profile data
        const profileKey = `profile_${commandInfo.tag}`;
        const result = await chrome.storage.local.get([profileKey]);
        const profileData = result[profileKey];

        if (!profileData) {
            throw new Error(`Profile not found for tag: ${commandInfo.tag}`);
        }

        // Load persona
        const persona = await loadAbhinavPersona();
        if (!persona) {
            throw new Error('Failed to load persona data');
        }

        // Generate message content
        const generatedContent = await generateColdMessage(profileData, persona, commandInfo.note);
        
        // Check if we're in LinkedIn
        const isLinkedIn = window.location.hostname.includes('linkedin.com');
        if (isLinkedIn) {
            // Clear any placeholder text first
            if (element.getAttribute('contenteditable') === 'true') {
                element.innerHTML = '';
                element.focus();
                // Format content for LinkedIn
                const formattedContent = generatedContent
                    .replace(/\n\n/g, '<div><br></div>')
                    .replace(/\n/g, '<div>');
                element.innerHTML = formattedContent;
            } else if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {
                element.value = '';
                element.focus();
                replaceCommand(element, commandInfo, generatedContent);
            }
            // Ensure LinkedIn registers the change
            element.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            // For non-LinkedIn platforms
            replaceCommand(element, commandInfo, generatedContent);
        }

    } catch (error) {
        console.error('[Cold Outreach] Message command processing failed:', error);
        showError(element, commandInfo, error.message);
    } finally {
        isGeneratingMessage = false;
    }
}

// Get list of available profile tags
async function getAvailableProfileTags() {
    try {
        const result = await chrome.storage.local.get(['stored_profiles']);
        return result.stored_profiles ? result.stored_profiles.join(', ') : 'none';
    } catch (error) {
        return 'error loading profiles';
    }
}

// Show loading state while generating content
function showLoadingState(element, commandInfo, type) {
    const loadingText = `${commandInfo.fullMatch} → Generating ${type}...`;
    
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        const currentText = element.value;
        const newText = currentText.substring(0, commandInfo.index) + 
                       loadingText + 
                       currentText.substring(commandInfo.index + commandInfo.fullMatch.length);
        element.value = newText;
    } else if (element.isContentEditable) {
        // For contenteditable elements, we'll update after generation
        console.log(`[Cold Outreach] Loading state for contenteditable element (${type})`);
    }
}

// Replace command with generated content
function replaceCommand(element, commandInfo, generatedContent) {
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        const currentText = element.value;
        const beforeCommand = currentText.substring(0, commandInfo.index);
        const afterCommand = currentText.substring(commandInfo.index + currentText.indexOf('Generating') !== -1 ? 
            currentText.indexOf('Generating') + currentText.substring(currentText.indexOf('Generating')).indexOf('...') + 3 :
            commandInfo.index + commandInfo.fullMatch.length);
        
        element.value = beforeCommand + generatedContent + afterCommand;
        
        // Position cursor at end of generated content
        const newCursorPos = beforeCommand.length + generatedContent.length;
        element.setSelectionRange(newCursorPos, newCursorPos);
        
    } else if (element.isContentEditable) {
        // For contenteditable, we need to find and replace the text
        const currentText = element.textContent || element.innerText;
        const beforeCommand = currentText.substring(0, commandInfo.index);
        const afterCommand = currentText.substring(commandInfo.index + commandInfo.fullMatch.length);
        
        element.textContent = beforeCommand + generatedContent + afterCommand;
        
        // Trigger input event to notify other listeners
        element.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

// Show error message
function showError(element, commandInfo, errorMessage) {
    const errorText = `${commandInfo.fullMatch} → Error: ${errorMessage}`;
    
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        const currentText = element.value;
        const newText = currentText.replace(/Generating (email|message)\.\.\./, `Error: ${errorMessage}`);
        element.value = newText;
    } else if (element.isContentEditable) {
        console.error('[Cold Outreach] Generation error:', errorMessage);
    }
    
    // Auto-clear error after 5 seconds
    setTimeout(() => {
        if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            element.value = element.value.replace(errorText, commandInfo.fullMatch);
        }
    }, 5000);
}

// Command listener for text fields (handles both email and message commands)
function attachCommandListener(element) {
    let commandTimeout;
    
    const handleInput = () => {
        clearTimeout(commandTimeout);
        
        commandTimeout = setTimeout(() => {
            if (isGeneratingEmail || isGeneratingMessage) return;
            
            const text = element.value || element.textContent || element.innerText || '';
            const commandInfo = detectCommand(text);
            
            if (commandInfo) {
                console.log('[Cold Outreach] Command detected:', commandInfo);
                
                if (commandInfo.type === 'email') {
                    processEmailCommand(element, commandInfo);
                } else if (commandInfo.type === 'message') {
                    processMessageCommand(element, commandInfo);
                }
            }
        }, 1500); // 1.5 second debounce
    };
    
    element.addEventListener('input', handleInput);
    element.addEventListener('keyup', handleInput);
    
    // Mark element as having command listener
    element.setAttribute('data-command-listener', 'true');
}

// Initialize command detection on all text fields
function initializeCommandDetection() {
    // Find all text input elements
    const textElements = document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
    
    textElements.forEach(element => {
        // Skip if already has listener
        if (element.getAttribute('data-command-listener')) return;
        
        // Skip if it's a small input (likely not for email composition)
        if (element.tagName === 'INPUT' && element.type === 'text') {
            const rect = element.getBoundingClientRect();
            if (rect.width < 200 || rect.height < 30) return;
        }
        
        attachCommandListener(element);
        console.log('[Cold Outreach] Added command listener to:', element.tagName);
    });
}

// Re-initialize command detection when new elements are added
const commandObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
                // Check if the node itself is a text input
                if (node.matches && node.matches('textarea, input[type="text"], [contenteditable="true"]')) {
                    if (!node.getAttribute('data-command-listener')) {
                        attachCommandListener(node);
                    }
                }
                
                // Check for text inputs within the added node
                const textInputs = node.querySelectorAll && node.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
                if (textInputs) {
                    textInputs.forEach(input => {
                        if (!input.getAttribute('data-command-listener')) {
                            attachCommandListener(input);
                        }
                    });
                }
            }
        });
    });
});

// Start observing for command functionality
if (document.body) {
    commandObserver.observe(document.body, { childList: true, subtree: true });
    initializeCommandDetection();
} else {
    document.addEventListener('DOMContentLoaded', () => {
        commandObserver.observe(document.body, { childList: true, subtree: true });
        initializeCommandDetection();
    });
}

console.log('[Cold Outreach] Email and Message command detection initialized');

// ===== END EMAIL GENERATOR FEATURE =====

// Start the scraper
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeScraper);
} else {
    initializeScraper();
}

console.log("[Cold Outreach] Scraper module ready");
console.log("[Cold Outreach] To check stored profiles, run: checkStoredProfiles()"); 