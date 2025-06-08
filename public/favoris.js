document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('articles-container');
    const favorites = JSON.parse(localStorage.getItem('favoriteArticles') || '[]');

    container.innerHTML = '';

    if (favorites.length === 0) {
        container.innerHTML = '<p>Vous n\'avez encore aucun article en favori. Cliquez sur l\'étoile ⭐ sur la page d\'accueil pour en ajouter !</p>';
        return;
    }

    // On trie les favoris pour afficher les plus récents en premier (si on avait une date)
    // Pour l'instant, on les affiche dans l'ordre où ils ont été ajoutés.
    favorites.forEach(article => {
        const articleElement = document.createElement('div');
        // On n'a pas besoin de la classe 'flex' ici car il n'y a pas d'étoile
        articleElement.className = 'article'; 
        
        articleElement.innerHTML = `
            <div class="article-content">
                <a href="${article.link}" target="_blank" rel="noopener noreferrer">${article.title}</a>
                <div class="source">Source : ${article.source}</div>
            </div>
        `;
        container.appendChild(articleElement);
    });
});