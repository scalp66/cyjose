document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const GITHUB_OWNER = "scalp66";
    const GITHUB_REPO = "cyjose";
    const SOURCES_PATH = "sources.json";

    // --- ÉLÉMENTS DU DOM ---
    const patInput = document.getElementById('github-pat');
    const savePatBtn = document.getElementById('save-pat-btn');
    const sourcesList = document.getElementById('sources-list');
    const addSourceForm = document.getElementById('add-source-form');

    // --- SÉCURITÉ : AVERTISSEMENT ---
    console.warn("ATTENTION: Ce mode de fonctionnement stocke le Jeton d'Accès Personnel dans le localStorage du navigateur...");

    // --- FONCTIONS DE L'API GITHUB ---

    const getSourcesFile = async () => {
        const pat = localStorage.getItem('github_pat');
        if (!pat) {
            alert("Veuillez d'abord sauvegarder votre Jeton d'Accès Personnel (PAT).");
            return null;
        }
        try {
            // CORRECTION ICI : Utilisation des backticks ``
            const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${SOURCES_PATH}`, {
                headers: { 'Authorization': `token ${pat}` }
            });
            if (!response.ok) throw new Error('Erreur réseau ou droits insuffisants.');
            return await response.json();
        } catch (error) {
            console.error("Erreur lors de la récupération des sources:", error);
            alert("Impossible de charger les sources. Vérifiez votre jeton et les permissions.");
            return null;
        }
    };

    const updateSourcesFile = async (newContent, sha) => {
        const pat = localStorage.getItem('github_pat');
        const commitMessage = "Mise à jour des sources depuis l'application";
        const contentEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(newContent, null, 2))));
        try {
            // CORRECTION ICI : Utilisation des backticks ``
            const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${SOURCES_PATH}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${pat}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: commitMessage,
                    content: contentEncoded,
                    sha: sha
                })
            });
            if (!response.ok) throw new Error('La mise à jour a échoué.');
            alert('Sources mises à jour avec succès !');
            loadAndDisplaySources();
        } catch (error) {
            console.error("Erreur lors de la mise à jour des sources:", error);
            alert("La mise à jour a échoué.");
        }
    };
    
    const displaySources = (sources) => {
        sourcesList.innerHTML = '';
        sources.forEach((source, index) => {
            const li = document.createElement('li');
            li.textContent = `${source.name} (${source.url})`;
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Supprimer';
            deleteBtn.dataset.index = index;
            deleteBtn.className = 'delete-btn';
            li.appendChild(deleteBtn);
            sourcesList.appendChild(li);
        });
    };

    const loadAndDisplaySources = async () => {
        sourcesList.innerHTML = '<li>Chargement...</li>';
        const fileData = await getSourcesFile();
        if (fileData && fileData.content) {
            const decodedContent = decodeURIComponent(escape(atob(fileData.content)));
            const sources = JSON.parse(decodedContent);
            displaySources(sources);
        } else {
             sourcesList.innerHTML = '<li>Impossible de charger. Vérifiez votre jeton.</li>';
        }
    };

    // --- ÉCOUTEURS D'ÉVÉNEMENTS ---

    savePatBtn.addEventListener('click', () => {
        if (patInput.value) {
            localStorage.setItem('github_pat', patInput.value);
            alert('Jeton sauvegardé !');
            patInput.value = '';
            loadAndDisplaySources();
        } else {
            alert('Veuillez coller un jeton.');
        }
    });

    addSourceForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const newSource = {
            name: document.getElementById('source-name').value,
            url: document.getElementById('source-url').value,
            selector: document.getElementById('source-selector').value
        };
        const fileData = await getSourcesFile();
        if (fileData) {
            const sources = JSON.parse(decodeURIComponent(escape(atob(fileData.content))));
            sources.push(newSource);
            await updateSourcesFile(sources, fileData.sha);
            addSourceForm.reset();
        }
    });

    sourcesList.addEventListener('click', async (event) => {
        if (event.target.classList.contains('delete-btn')) {
            if (!confirm('Êtes-vous sûr de vouloir supprimer cette source ?')) return;
            const indexToDelete = parseInt(event.target.dataset.index, 10);
            const fileData = await getSourcesFile();
            if (fileData) {
                const sources = JSON.parse(decodeURIComponent(escape(atob(fileData.content))));
                sources.splice(indexToDelete, 1);
                await updateSourcesFile(sources, fileData.sha);
            }
        }
    });

    if (localStorage.getItem('github_pat')) {
        loadAndDisplaySources();
    }
});