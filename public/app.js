// public/app.js
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('articles-container');

    fetch('veille.json')
        .then(response => response.json())
        .then(articles => {
            container.innerHTML = ''; // Vide le message de chargement
            if (articles.length === 0) {
                container.innerHTML = '<p>Aucun article trouvé pour le moment.</p>';
                return;
            }
            articles.forEach(article => {
                const articleElement = document.createElement('div');
                articleElement.className = 'article';
                articleElement.innerHTML = `
                    <a href="<span class="math-inline">\{article\.link\}" target\="\_blank" rel\="noopener noreferrer"\></span>{article.title}</a>
                    <div class="source">Source : ${article.source}</div>
                `;
                container.appendChild(articleElement);
            });
        })
        .catch(error => {
            console.error('Erreur de chargement des articles:', error);
            container.innerHTML = '<p>Impossible de charger les articles.</p>';
        });
});