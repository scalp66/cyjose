document.addEventListener('DOMContentLoaded', async () => {
    const statusMessage = document.getElementById('status-message');
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get('url');
    const sharedTitle = params.get('title') || 'Article partagé';

    if (!sharedUrl) {
        statusMessage.textContent = "Erreur : URL manquante. Vous pouvez fermer cette fenêtre.";
        return;
    }

    const GITHUB_OWNER = "scalp66";
    const GITHUB_REPO = "cyjose";
    const CUSTOM_ARTICLES_PATH = "custom-articles.json";
    const pat = localStorage.getItem('github_pat');

    if (!pat) {
        statusMessage.textContent = "Erreur : Jeton d'accès GitHub non trouvé. Veuillez vous authentifier sur la page des paramètres de l'application.";
        return;
    }

    try {
        const fileResponse = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CUSTOM_ARTICLES_PATH}`, {
            headers: { 'Authorization': `token ${pat}` }
        });
        if (!fileResponse.ok) throw new Error("Impossible de récupérer le fichier des articles personnalisés.");
        
        const fileData = await fileResponse.json();
        const sha = fileData.sha;
        const decodedContent = decodeURIComponent(escape(atob(fileData.content)));
        const customArticles = JSON.parse(decodedContent);

        const newArticle = {
            name: "Article Partagé",
            type: "shared",
            title: sharedTitle,
            link: sharedUrl,
            date: new Date().toISOString()
        };
        customArticles.unshift(newArticle);

        const contentEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(customArticles, null, 2))));
        const updateResponse = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CUSTOM_ARTICLES_PATH}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${pat}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "Ajout d'un nouvel article partagé", content: contentEncoded, sha: sha })
        });

        if (!updateResponse.ok) throw new Error("La mise à jour du fichier sur GitHub a échoué.");

        statusMessage.textContent = "Article ajouté avec succès ! Vous pouvez fermer cette fenêtre.";
        setTimeout(() => window.close(), 2000);

    } catch (error) {
        console.error("Erreur lors de l'ajout de l'article partagé:", error);
        statusMessage.textContent = `Erreur : ${error.message}`;
    }
});