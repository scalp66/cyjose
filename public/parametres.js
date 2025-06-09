document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const GITHUB_OWNER = "scalp66";
    const GITHUB_REPO = "cyjose";
    const SOURCES_PATH = "sources.json";

    // --- ÉLÉMENTS DU DOM ---
    const patInput = document.getElementById('github-pat');
    const savePatBtn = document.getElementById('save-pat-btn');
    const sourcesList = document.getElementById('sources-list');
    const findRssForm = document.getElementById('find-rss-form');
    const siteUrlInput = document.getElementById('site-url-input');
    const rssResultsContainer = document.getElementById('rss-results-container');
    const addSourceForm = document.getElementById('add-source-form');

    // --- FONCTIONS DE L'API GITHUB ---
    const getSourcesFile = async () => {
        const pat = localStorage.getItem('github_pat');
        if (!pat) {
            alert("Veuillez d'abord sauvegarder votre Jeton d'Accès Personnel (PAT).");
            return null;
        }
        try {
            const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${SOURCES_PATH}`, {
                headers: { 'Authorization': `token ${pat}` }
            });
            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.message || 'Erreur réseau ou droits insuffisants.');
            }
            return await response.json();
        } catch (error) {
            console.error("Erreur lors de la récupération des sources:", error);
            alert(`Impossible de charger les sources : ${error.message}`);
            return null;
        }
    };

    const updateSourcesFile = async (newContent, sha) => {
        const pat = localStorage.getItem('github_pat');
        const commitMessage = "Mise à jour des sources depuis l'application";
        const contentEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(newContent, null, 2))));
        try {
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
    
    // --- FONCTIONS D'AFFICHAGE ---
    const displaySources = (sources) => {
        sourcesList.innerHTML = '';
        sources.forEach((source, index) => {
            const li = document.createElement('li');
            li.textContent = `${source.name} (${source.type || 'scrape'})`;
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
            try {
                const decodedContent = decodeURIComponent(escape(atob(fileData.content)));
                const sources = JSON.parse(decodedContent);
                displaySources(sources);
            } catch (e) {
                console.error("Erreur de décodage ou de parsing des sources", e);
                sourcesList.innerHTML = '<li>Erreur de lecture du fichier de sources.</li>';
            }
        } else {
             sourcesList.innerHTML = '<li>Impossible de charger. Vérifiez votre jeton.</li>';
        }
    };

    // --- ÉCOUTEURS D'ÉVÉNEMENTS ---

    savePatBtn.addEventListener('click', () => {
        if (patInput.value) {
            localStorage.setItem('github_pat', patInput.value.trim());
            alert('Jeton sauvegardé ! Vous pouvez maintenant charger et gérer les sources.');
            patInput.value = '';
            loadAndDisplaySources();
        } else {
            alert('Veuillez coller un jeton.');
        }
    });

    findRssForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const siteUrl = siteUrlInput.value;
        rssResultsContainer.innerHTML = '<p>Analyse en cours...</p>';

        try {
            const response = await fetch('/.netlify/functions/find-rss', {
                method: 'POST',
                body: JSON.stringify({ siteUrl: siteUrl })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur inconnue du serveur');
            }
            const data = await response.json();
            
            // NOUVELLE LOGIQUE : On affiche un formulaire pré-rempli
            rssResultsContainer.innerHTML = `
                <p><strong>Flux RSS trouvé !</strong></p>
                <form id="confirm-rss-form">
                    <label for="rss-name">Nom de la source :</label>
                    <input type="text" id="rss-name" value="${data.siteTitle}" required>
                    <label for="rss-url">URL du flux :</label>
                    <input type="url" id="rss-url" value="${data.rssUrl}" required>
                    <button type="submit">Confirmer l'ajout</button>
                </form>
            `;
        } catch (error) {
            rssResultsContainer.innerHTML = `<p style="color: red;">Erreur : ${error.message}</p>`;
        }
    });

    // Écouteur pour la soumission du NOUVEAU formulaire de confirmation
    rssResultsContainer.addEventListener('submit', async (event) => {
        if (event.target.id === 'confirm-rss-form') {
            event.preventDefault();
            const newSource = {
                name: document.getElementById('rss-name').value,
                type: "rss",
                url: document.getElementById('rss-url').value,
                selector: ""
            };
            
            const fileData = await getSourcesFile();
            if (fileData) {
                const sources = JSON.parse(decodeURIComponent(escape(atob(fileData.content))));
                sources.push(newSource);
                await updateSourcesFile(sources, fileData.sha);
                rssResultsContainer.innerHTML = '';
                siteUrlInput.value = '';
            }
        }
    });

    // Ajouter une source manuellement (scraping)
    addSourceForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const newSource = {
            name: document.getElementById('source-name').value,
            type: "scrape",
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

    // Supprimer une source
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

    // --- DÉMARRAGE ---
    if (localStorage.getItem('github_pat')) {
        loadAndDisplaySources();
    }
});
