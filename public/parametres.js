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
    // Nouveaux éléments pour la recherche RSS
    const findRssForm = document.getElementById('find-rss-form');
    const siteUrlInput = document.getElementById('site-url-input');
    const rssResultsContainer = document.getElementById('rss-results-container');


    // --- SÉCURITÉ : AVERTISSEMENT ---
    console.warn("ATTENTION: Ce mode de fonctionnement stocke le Jeton d'Accès Personnel dans le localStorage du navigateur...");

    // --- FONCTIONS DE L'API GITHUB (ne changent pas) ---
    const getSourcesFile = async () => { /* ... code identique à avant ... */ };
    const updateSourcesFile = async (newContent, sha) => { /* ... code identique à avant ... */ };
    const displaySources = (sources) => { /* ... code identique à avant ... */ };
    const loadAndDisplaySources = async () => { /* ... code identique à avant ... */ };
    
    // --- NOUVELLE LOGIQUE POUR L'AJOUT RAPIDE RSS ---
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
                throw new Error(errorData.error || 'Erreur inconnue');
            }

            const data = await response.json();
            rssResultsContainer.innerHTML = `
                <p><strong>Flux RSS trouvé !</strong></p>
                <p>Titre du site : ${data.siteTitle}</p>
                <p>URL du flux : ${data.rssUrl}</p>
                <button id="confirm-add-rss-btn" data-name="${data.siteTitle}" data-url="${data.rssUrl}">Ajouter cette source</button>
            `;

        } catch (error) {
            rssResultsContainer.innerHTML = `<p style="color: red;">Erreur : ${error.message}</p>`;
        }
    });

    // Écouteur pour le bouton de confirmation d'ajout RSS
    rssResultsContainer.addEventListener('click', async (event) => {
        if (event.target.id === 'confirm-add-rss-btn') {
            const button = event.target;
            const newSource = {
                name: button.dataset.name || "Source RSS",
                type: "rss",
                url: button.dataset.url,
                selector: "" // Inutile pour le RSS
            };
            
            const fileData = await getSourcesFile();
            if (fileData) {
                const sources = JSON.parse(decodeURIComponent(escape(atob(fileData.content))));
                sources.push(newSource);
                await updateSourcesFile(sources, fileData.sha);
                rssResultsContainer.innerHTML = ''; // Nettoyer les résultats
                siteUrlInput.value = '';
            }
        }
    });

    // --- ANCIENS ÉCOUTEURS D'ÉVÉNEMENTS (peu de changements) ---
    savePatBtn.addEventListener('click', () => { /* ... code identique à avant ... */ });
    addSourceForm.addEventListener('submit', async (event) => { /* ... code identique à avant, pour l'ajout manuel ... */ });
    sourcesList.addEventListener('click', async (event) => { /* ... code identique à avant, pour la suppression ... */ });

    // --- DÉMARRAGE ---
    if (localStorage.getItem('github_pat')) {
        loadAndDisplaySources();
    }
});


// On doit recopier ici les fonctions qui n'ont pas changé pour que le fichier soit complet
const getSourcesFile = async () => {
    const GITHUB_OWNER = "scalp66", GITHUB_REPO = "cyjose", SOURCES_PATH = "sources.json";
    const pat = localStorage.getItem('github_pat');
    if (!pat) { alert("Veuillez d'abord sauvegarder votre Jeton d'Accès Personnel (PAT)."); return null; }
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${SOURCES_PATH}`, { headers: { 'Authorization': `token ${pat}` } });
        if (!response.ok) throw new Error('Erreur réseau ou droits insuffisants.');
        return await response.json();
    } catch (error) { console.error("Erreur lors de la récupération des sources:", error); alert("Impossible de charger les sources."); return null; }
};
const updateSourcesFile = async (newContent, sha) => {
    const GITHUB_OWNER = "scalp66", GITHUB_REPO = "cyjose", SOURCES_PATH = "sources.json";
    const pat = localStorage.getItem('github_pat');
    const contentEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(newContent, null, 2))));
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${SOURCES_PATH}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${pat}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "Mise à jour des sources depuis l'application", content: contentEncoded, sha: sha })
        });
        if (!response.ok) throw new Error('La mise à jour a échoué.');
        alert('Sources mises à jour avec succès !');
        loadAndDisplaySources();
    } catch (error) { console.error("Erreur lors de la mise à jour des sources:", error); alert("La mise à jour a échoué."); }
};
const displaySources = (sources) => {
    const sourcesList = document.getElementById('sources-list');
    sourcesList.innerHTML = '';
    sources.forEach((source, index) => {
        const li = document.createElement('li');
        li.textContent = `${source.name} (${source.url}) [${source.type || 'scrape'}]`;
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Supprimer';
        deleteBtn.dataset.index = index;
        deleteBtn.className = 'delete-btn';
        li.appendChild(deleteBtn);
        sourcesList.appendChild(li);
    });
};
const loadAndDisplaySources = async () => {
    const sourcesList = document.getElementById('sources-list');
    sourcesList.innerHTML = '<li>Chargement...</li>';
    const fileData = await getSourcesFile();
    if (fileData && fileData.content) {
        const decodedContent = decodeURIComponent(escape(atob(fileData.content)));
        const sources = JSON.parse(decodedContent);
        displaySources(sources);
    } else { sourcesList.innerHTML = '<li>Impossible de charger. Vérifiez votre jeton.</li>'; }
};
const savePatBtn = document.getElementById('save-pat-btn');
savePatBtn.addEventListener('click', () => {
    const patInput = document.getElementById('github-pat');
    if (patInput.value) {
        localStorage.setItem('github_pat', patInput.value);
        alert('Jeton sauvegardé !');
        patInput.value = '';
        loadAndDisplaySources();
    } else { alert('Veuillez coller un jeton.'); }
});
const addSourceForm = document.getElementById('add-source-form');
addSourceForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const newSource = {
        name: document.getElementById('source-name').value,
        type: "scrape", // L'ajout manuel est de type "scrape"
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
const sourcesList = document.getElementById('sources-list');
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
