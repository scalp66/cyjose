// public/app.js

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('articles-container');

    // On va chercher notre fichier de données généré par le script de veille
    fetch('veille.json')
        .then(response => {
            // On vérifie si le fichier a bien été trouvé par le serveur
            if (!response.ok) {
                throw new Error(`Le fichier de données n'a pas été trouvé (Erreur: ${response.status})`);
            }
            // Si tout va bien, on essaie de lire le contenu JSON
            return response.json();
        })
        .then(articles => {
            // On vide le conteneur du message "Chargement..."
            container.innerHTML = '';

            // Si la liste d'articles est vide, on affiche un message
            if (articles.length === 0) {
                container.innerHTML = '<p>Aucun article trouvé pour le moment. La veille se mettra à jour automatiquement.</p>';
                return;
            }

            // Pour chaque article dans la liste, on crée un élément HTML
            articles.forEach(article => {
                const articleElement = document.createElement('div');
                articleElement.className = 'article';

                // --- LA CORRECTION EST ICI ---
                // On utilise des backticks (`) pour pouvoir injecter les variables
                // ${article.link} et ${article.title} dans la chaîne de caractères.
                articleElement.innerHTML = `
                    <a href="${article.link}" target="_blank" rel="noopener noreferrer">${article.title}</a>
                    <div class="source">Source : ${article.source}</div>
                `;

                // On ajoute le nouvel élément à notre page web
                container.appendChild(articleElement);
            });
        })
        .catch(error => {
            // Si une erreur survient à n'importe quelle étape, on l'affiche ici
            console.error('Erreur de chargement des articles:', error);
            container.innerHTML = '<p>Impossible de charger les articles. Le fichier de données est peut-être manquant ou corrompu.</p>';
        });
});