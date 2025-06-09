document.addEventListener('DOMContentLoaded', () => {
    // Éléments du DOM
    const articlesContainer = document.getElementById('articles-container');
    const keywordFilterInput = document.getElementById('keyword-filter');
    const sourceFiltersContainer = document.getElementById('source-filters');

    // Variable globale pour stocker tous les articles
    let allArticles = [];
    let activeSourceFilter = 'all';

    // --- LOGIQUE DES FAVORIS ---
    const getFavorites = () => JSON.parse(localStorage.getItem('favoriteArticles') || '[]');
    const saveFavorites = (favorites) => localStorage.setItem('favoriteArticles', JSON.stringify(favorites));

    // --- FONCTION PRINCIPALE D'AFFICHAGE ---
    const displayArticles = (articlesToDisplay) => {
        articlesContainer.innerHTML = '';
        const favorites = getFavorites();
        const favoriteLinks = new Set(favorites.map(f => f.link));

        if (articlesToDisplay.length === 0) {
            articlesContainer.innerHTML = '<p>Aucun article à afficher pour le moment.</p>';
            return;
        }

        articlesToDisplay.forEach(article => {
            const articleElement = document.createElement('div');
            articleElement.className = 'article';
            const isFavorite = favoriteLinks.has(article.link);

            articleElement.innerHTML = `
                <div class="article-content">
                    <a href="${article.link}" target="_blank" rel="noopener noreferrer">${article.title}</a>
                    <div class="source">Source : ${article.source || article.name}</div>
                </div>
                <div class="article-actions">
                    <button class="summarize-btn" data-link="${article.link}">Résumer</button>
                    <span class="favorite-btn ${isFavorite ? 'is-favorite' : ''}" data-link="${article.link}" data-title="${article.title}" data-source="${article.source || article.name}">⭐</span>
                </div>
            `;
            articlesContainer.appendChild(articleElement);
        });
    };

    // --- FONCTION QUI APPLIQUE LES FILTRES ---
    const applyFilters = () => {
        const keyword = keywordFilterInput.value.toLowerCase();
        
        let filteredArticles = allArticles;

        if (activeSourceFilter !== 'all') {
            filteredArticles = filteredArticles.filter(article => (article.source || article.name) === activeSourceFilter);
        }

        if (keyword.length > 0) {
            filteredArticles = filteredArticles.filter(article => article.title.toLowerCase().includes(keyword));
        }

        displayArticles(filteredArticles);
    };

    // --- SETUP INITIAL (MODIFIÉ) ---
    const fetchVeille = fetch('veille.json').then(res => res.ok ? res.json() : []).catch(() => []);
    const fetchCustom = fetch('custom-articles.json').then(res => res.ok ? res.json() : []).catch(() => []);

    Promise.all([fetchVeille, fetchCustom])
        .then(([veilleArticles, customArticles]) => {
            const combinedArticles = [...customArticles, ...veilleArticles];

            const uniqueLinks = new Set();
            const uniqueArticles = combinedArticles.filter(article => {
                if (!article.link || uniqueLinks.has(article.link)) {
                    return false;
                }
                uniqueLinks.add(article.link);
                return true;
            });

            uniqueArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            allArticles = uniqueArticles; // Mise à jour de la variable globale

            const sources = ['all', ...new Set(allArticles.map(a => a.source || a.name))];
            sourceFiltersContainer.innerHTML = '';
            sources.forEach(source => {
                if(source) { // S'assurer que la source n'est pas vide
                    const btn = document.createElement('button');
                    btn.className = 'source-btn';
                    btn.dataset.source = source;
                    btn.textContent = source === 'all' ? 'Toutes les sources' : source;
                    if (source === 'all') btn.classList.add('active');
                    sourceFiltersContainer.appendChild(btn);
                }
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

    articlesContainer.addEventListener('click', async (event) => {
        const target = event.target;

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

        if (target.classList.contains('summarize-btn')) {
            const articleUrl = target.dataset.link;
            target.textContent = 'Chargement...';
            target.disabled = true;

            try {
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
