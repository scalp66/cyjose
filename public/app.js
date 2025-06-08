document.addEventListener('DOMContentLoaded', () => {
    // Éléments du DOM
    const articlesContainer = document.getElementById('articles-container');
    const keywordFilterInput = document.getElementById('keyword-filter');
    const sourceFiltersContainer = document.getElementById('source-filters');

    // Variable pour stocker tous les articles chargés une seule fois
    let allArticles = [];
    let activeSourceFilter = 'all'; // Par défaut, on affiche tout

    // --- LOGIQUE DES FAVORIS (ne change pas) ---
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
    // Charger les articles depuis veille.json au démarrage
    fetch('veille.json')
        .then(response => response.ok ? response.json() : Promise.reject('Fichier non trouvé'))
        .then(articles => {
            allArticles = articles; // On sauvegarde tous les articles

            // Créer les boutons de filtre par source dynamiquement
            const sources = ['all', ...new Set(allArticles.map(a => a.source))];
            sourceFiltersContainer.innerHTML = ''; // Vider le conteneur
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

            displayArticles(allArticles); // Afficher tous les articles au début
        })
        .catch(error => {
            console.error('Erreur de chargement des articles:', error);
            articlesContainer.innerHTML = '<p>Impossible de charger les articles.</p>';
        });

    // --- ÉCOUTEURS D'ÉVÉNEMENTS ---

    // Écouteur pour le champ de recherche par mot-clé
    keywordFilterInput.addEventListener('input', applyFilters);

    // Écouteur pour les clics sur les boutons de source
    sourceFiltersContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('source-btn')) {
            // Mettre à jour le style des boutons
            document.querySelectorAll('.source-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            // Mettre à jour le filtre actif et ré-afficher les articles
            activeSourceFilter = event.target.dataset.source;
            applyFilters();
        }
    });

    // Écouteur pour la gestion des favoris (ne change pas)
    articlesContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('favorite-btn')) {
            const button = event.target;
            const articleData = { link: button.dataset.link, title: button.dataset.title, source: button.dataset.source };
            let favorites = getFavorites();
            const existingIndex = favorites.findIndex(fav => fav.link === articleData.link);
            if (existingIndex > -1) {
                favorites.splice(existingIndex, 1);
                button.classList.remove('is-favorite');
            } else {
                favorites.push(articleData);
                button.classList.add('is-favorite');
            }
            saveFavorites(favorites);
        }
    });
});