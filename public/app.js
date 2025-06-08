document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('articles-container');

    // Fonction pour récupérer les favoris depuis la mémoire du navigateur (localStorage)
    const getFavorites = () => {
        // '|| "[]"' évite une erreur si 'favoriteArticles' n'existe pas encore
        return JSON.parse(localStorage.getItem('favoriteArticles') || '[]');
    };

    // Fonction pour sauvegarder la liste des favoris mise à jour
    const saveFavorites = (favorites) => {
        localStorage.setItem('favoriteArticles', JSON.stringify(favorites));
    };

    // Fonction qui affiche les articles sur la page
    const renderArticles = (articles) => {
        container.innerHTML = '';
        const favorites = getFavorites();
        // On crée un Set des liens favoris pour une recherche plus rapide
        const favoriteLinks = new Set(favorites.map(f => f.link));

        if (articles.length === 0) {
            container.innerHTML = '<p>Aucun article trouvé pour le moment.</p>';
            return;
        }

        articles.forEach(article => {
            const articleElement = document.createElement('div');
            articleElement.className = 'article';
            // On vérifie si l'article actuel est dans nos favoris
            const isFavorite = favoriteLinks.has(article.link);

            articleElement.innerHTML = `
                <div class="article-content">
                    <a href="${article.link}" target="_blank" rel="noopener noreferrer">${article.title}</a>
                    <div class="source">Source : ${article.source}</div>
                </div>
                <div class="article-actions">
                    <span 
                        class="favorite-btn ${isFavorite ? 'is-favorite' : ''}" 
                        data-link="${article.link}" 
                        data-title="${article.title}" 
                        data-source="${article.source}"
                    >⭐</span>
                </div>
            `;
            container.appendChild(articleElement);
        });
    };

    // On écoute les clics sur toute la zone des articles
    container.addEventListener('click', (event) => {
        // Si l'élément cliqué a la classe 'favorite-btn'
        if (event.target.classList.contains('favorite-btn')) {
            const button = event.target;
            const articleData = {
                link: button.dataset.link,
                title: button.dataset.title,
                source: button.dataset.source
            };

            let favorites = getFavorites();
            const existingIndex = favorites.findIndex(fav => fav.link === articleData.link);

            if (existingIndex > -1) {
                // S'il est déjà en favori, on le retire de la liste
                favorites.splice(existingIndex, 1);
                button.classList.remove('is-favorite');
            } else {
                // Sinon, on l'ajoute à la liste
                favorites.push(articleData);
                button.classList.add('is-favorite');
            }
            // On sauvegarde la nouvelle liste dans le localStorage
            saveFavorites(favorites);
        }
    });

    // Charger les articles depuis veille.json au démarrage
    fetch('veille.json')
        .then(response => response.ok ? response.json() : Promise.reject('Fichier non trouvé'))
        .then(renderArticles)
        .catch(error => {
            console.error('Erreur de chargement des articles:', error);
            container.innerHTML = '<p>Impossible de charger les articles.</p>';
        });
});