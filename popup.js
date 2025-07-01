document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const saveButton = document.getElementById('saveButton');
    const statusDiv = document.getElementById('status');
    const userContextInput = document.getElementById('userContext');
    const saveContextButton = document.getElementById('saveContextButton');
    
    // Persona elements
    const personaNameInput = document.getElementById('personaName');
    const personaRoleInput = document.getElementById('personaRole');
    const personaInterestsInput = document.getElementById('personaInterests');
    const personaGoalsInput = document.getElementById('personaGoals');
    const savePersonaButton = document.getElementById('savePersonaButton');
    const viewProfilesButton = document.getElementById('viewProfilesButton');

    // Load the saved API key, context, and persona when the popup opens
    chrome.storage.sync.get(['apiKey', 'userContext', 'abhinavPersona'], (result) => {
        if (result.apiKey) {
            apiKeyInput.value = result.apiKey;
        }
        if (result.userContext) {
            userContextInput.value = result.userContext;
        }
        
        // Load persona data
        if (result.abhinavPersona) {
            const persona = result.abhinavPersona;
            personaNameInput.value = persona.name || '';
            personaRoleInput.value = persona.role || '';
            personaInterestsInput.value = persona.interests || '';
            personaGoalsInput.value = persona.goals || '';
        }
    });

    // Save the API key when the button is clicked
    saveButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value;
        chrome.storage.sync.set({ apiKey: apiKey }, () => {
            showStatus('API Key saved!', 'success');
        });
    });

    // Save the context when the button is clicked
    saveContextButton.addEventListener('click', () => {
        const userContext = userContextInput.value;
        chrome.storage.sync.set({ userContext: userContext }, () => {
            showStatus('Context saved!', 'success');
        });
    });

    // Save the persona when the button is clicked
    savePersonaButton.addEventListener('click', () => {
        const persona = {
            name: personaNameInput.value.trim(),
            role: personaRoleInput.value.trim(),
            interests: personaInterestsInput.value.trim(),
            goals: personaGoalsInput.value.trim(),
            background: personaRoleInput.value.trim(),
            university: personaRoleInput.value.includes('Penn State') ? 'Penn State' : 
                       personaRoleInput.value.includes('university') ? personaRoleInput.value : ''
        };

        if (!persona.name || !persona.role) {
            showStatus('Please fill in at least your name and role!', 'error');
            return;
        }

        chrome.storage.sync.set({ abhinavPersona: persona }, () => {
            showStatus('Persona saved! You can now use email generation commands.', 'success');
        });
    });

    // View saved profiles
    viewProfilesButton.addEventListener('click', async () => {
        try {
            // Get stored profiles from chrome.storage.local
            chrome.storage.local.get(['stored_profiles'], (result) => {
                const profiles = result.stored_profiles || [];
                
                if (profiles.length === 0) {
                    showStatus('No profiles saved yet. Visit LinkedIn profiles and click "Save Profile"!', 'info');
                    return;
                }

                // Create a simple display of profiles
                let profileList = `Saved Profiles (${profiles.length}):\n\n`;
                profiles.forEach((tag, index) => {
                    profileList += `${index + 1}. ${tag}\n`;
                });
                
                profileList += `\nTo use: Type "email: ${profiles[0]} note- make it casual" in any text field`;
                
                // Show profiles in an alert (simple solution)
                alert(profileList);
                
                showStatus(`Found ${profiles.length} saved profiles!`, 'success');
            });
            
        } catch (error) {
            showStatus('Error loading profiles: ' + error.message, 'error');
        }
    });

    // Utility function to show status messages
    function showStatus(message, type = 'success') {
        statusDiv.textContent = message;
        statusDiv.style.color = type === 'error' ? '#dc3545' : 
                               type === 'info' ? '#007bff' : '#28a745';
        
        // Clear the status message after 3 seconds
        setTimeout(() => {
            statusDiv.textContent = '';
        }, 3000);
    }
});
