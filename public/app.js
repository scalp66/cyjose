document.addEventListener('DOMContentLoaded', () => {
    // Éléments du DOM
    const articlesContainer = document.getElementById('articles-container');
    const keywordFilterInput = document.getElementById('keyword-filter');
    const sourceFiltersContainer = document.getElementById('source-filters');

    // Variable pour stocker tous les articles chargés une seule fois
    let allArticles = [];
    let activeSourceFilter = 'all'; // Par défaut, on affiche tout

    // --- LOGIQUE DES FAVORIS ---
    const getFavorites = () => JSON.parse(localStorage.getItem('favoriteArticles') || '[]');
    const saveFavorites = (favorites) => localStorage.setItem('favoriteArticles', JSON.stringify(favorites));

    // --- FONCTION PRINCIPALE D'AFFICHAGE ---
    const displayArticles = (articlesToDisplay) => {
        articlesContainer.innerHTML = '';
        const favorites = getFavorites();
        const favoriteLinks = new Set(favorites.map(f => f.link));

        if (articlesToDisplay.length === 0) {
            articlesContainer.innerHTML = '<p>Aucun article ne correspond à vos filtres.</p>';
            return;
        }

        articlesToDisplay.forEach(article => {
            const articleElement = document.createElement('div');
            articleElement.className = 'article';
            const isFavorite = favoriteLinks.has(article.link);

            articleElement.innerHTML = `
                <div class="article-content">
                    <a href="${article.link}" target="_blank" rel="noopener noreferrer">${article.title}</a>
                    <div class="source">Source : ${article.source}</div>
                </div>
                <div class="article-actions">
                    <button class="summarize-btn" data-link="${article.link}">Résumer</button>
                    <span class="favorite-btn ${isFavorite ? 'is-favorite' : ''}" data-link="${article.link}" data-title="${article.title}" data-source="${article.source}">⭐</span>
                </div>
            `;
            articlesContainer.appendChild(articleElement);
        });
    };

    // --- FONCTION QUI APPLIQUE LES FILTRES ---
    const applyFilters = () => {
        const keyword = keywordFilterInput.value.toLowerCase();
        
        let filteredArticles = allArticles;

        // 1. Filtre par source
        if (activeSourceFilter !== 'all') {
            filteredArticles = filteredArticles.filter(article => article.source === activeSourceFilter);
        }

        // 2. Filtre par mot-clé
        if (keyword.length > 0) {
            filteredArticles = filteredArticles.filter(article => article.title.toLowerCase().includes(keyword));
        }

        displayArticles(filteredArticles);
    };

    // --- SETUP INITIAL ---
    fetch('veille.json')
        .then(response => response.ok ? response.json() : Promise.reject('Fichier non trouvé'))
        .then(articles => {
            allArticles = articles; 

            // Créer les boutons de filtre par source dynamiquement
            const sources = ['all', ...new Set(allArticles.map(a => a.source))];
            sourceFiltersContainer.innerHTML = '';
            sources.forEach(source => {
                const btn = document.createElement('button');
                btn.className = 'source-btn';
                btn.dataset.source = source;
                btn.textContent = source === 'all' ? 'Toutes les sources' : source;
                if (source === 'all') {
                    btn.classList.add('active');
                }
                sourceFiltersContainer.appendChild(btn);
            });

            displayArticles(allArticles);
        })
        .catch(error => {
            console.error('Erreur de chargement des articles:', error);
            articlesContainer.innerHTML = '<p>Impossible de charger les articles.</p>';
        });

    // --- ÉCOUTEURS D'ÉVÉNEMENTS ---

    keywordFilterInput.addEventListener('input', applyFilters);

    sourceFiltersContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('source-btn')) {
            document.querySelectorAll('.source-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            activeSourceFilter = event.target.dataset.source;
            applyFilters();
        }
    });

    // Écouteur principal pour les actions sur les articles (Favoris et Résumé)
    articlesContainer.addEventListener('click', async (event) => {
        const target = event.target;

        // --- GESTION DU CLIC SUR LES FAVORIS ---
        if (target.classList.contains('favorite-btn')) {
            const articleData = { link: target.dataset.link, title: target.dataset.title, source: target.dataset.source };
            let favorites = getFavorites();
            const existingIndex = favorites.findIndex(fav => fav.link === articleData.link);
            
            if (existingIndex > -1) {
                favorites.splice(existingIndex, 1);
                target.classList.remove('is-favorite');
            } else {
                favorites.push(articleData);
                target.classList.add('is-favorite');
            }
            saveFavorites(favorites);
        }

        // --- GESTION DU CLIC SUR LE BOUTON RÉSUMER ---
        if (target.classList.contains('summarize-btn')) {
            const articleUrl = target.dataset.link;
            
            target.textContent = 'Chargement...';
            target.disabled = true;

            try {
                // On appelle notre fonction serverless hébergée sur Netlify
                const response = await fetch('/.netlify/functions/summarize', {
                    method: 'POST',
                    body: JSON.stringify({ articleUrl: articleUrl })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Erreur du serveur (${response.status})`);
                }

                const data = await response.json();
                alert(`Résumé de l'article :\n\n${data.summary}`);

            } catch (error) {
                console.error('Erreur lors de la demande de résumé:', error);
                alert(`Impossible d'obtenir le résumé : ${error.message}`);
            } finally {
                target.textContent = 'Résumer';
                target.disabled = false;
            }
        }
    });
});
