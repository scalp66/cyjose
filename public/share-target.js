document.addEventListener('DOMContentLoaded', async () => {
    const statusTitle = document.getElementById('status-title');
    const statusMessage = document.getElementById('status-message');
    const sharedUrlElement = document.getElementById('shared-url');

    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get('shared_url') || params.get('shared_text');
    const sharedTitle = params.get('shared_title') || 'Article partagé';

    if (!sharedUrl) {
        statusTitle.textContent = "Erreur";
        statusMessage.textContent = "URL manquante. Vous pouvez fermer cette fenêtre.";
        sharedUrlElement.textContent = `Info de débogage : ${window.location.href}`;
        return;
    }

    sharedUrlElement.textContent = `URL : ${sharedUrl}`;

    const GITHUB_OWNER = "scalp66";
    const GITHUB_REPO = "cyjose";
    const CUSTOM_ARTICLES_PATH = "public/custom-articles.json"; 
    
    statusMessage.textContent = "Recherche du jeton d'accès...";
    const pat = localStorage.getItem('github_pat');

    if (!pat) {
        statusTitle.textContent = "Erreur d'Authentification";
        statusMessage.textContent = "Jeton d'accès GitHub non trouvé. Veuillez vous authentifier sur la page des paramètres de l'application.";
        return;
    }
    
    statusMessage.textContent = "Authentification... Connexion à GitHub...";

    try {
        const fileResponse = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CUSTOM_ARTICLES_PATH}`, {
            headers: { 'Authorization': `token ${pat}` }
        });
        
        statusMessage.textContent = "Lecture du fichier distant...";

        if (!fileResponse.ok) {
             const errorData = await fileResponse.json();
             throw new Error(`Impossible de lire le fichier (Erreur: ${fileResponse.status}). ${errorData.message}`);
        }
        
        const fileData = await fileResponse.json();
        const sha = fileData.sha;
        const decodedContent = decodeURIComponent(escape(atob(fileData.content)));
        const customArticles = JSON.parse(decodedContent);

        statusMessage.textContent = "Préparation de la mise à jour...";
        const newArticle = {
            name: "Article Partagé",
            type: "shared",
            title: sharedTitle,
            link: sharedUrl,
            date: new Date().toISOString()
        };
        customArticles.unshift(newArticle);

        statusMessage.textContent = "Sauvegarde du nouveau fichier...";
        const contentEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(customArticles, null, 2))));
        const updateResponse = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CUSTOM_ARTICLES_PATH}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${pat}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "Ajout d'un nouvel article partagé", content: contentEncoded, sha: sha })
        });

        if (!updateResponse.ok) throw new Error("La mise à jour du fichier sur GitHub a échoué.");

        statusTitle.textContent = "Succès !";
        statusMessage.textContent = "Article ajouté à votre veille.";
        setTimeout(() => window.close(), 2500);

    } catch (error) {
        console.error("Erreur lors de l'ajout de l'article partagé:", error);
        statusTitle.textContent = "Erreur Finale";
        statusMessage.textContent = error.message;
    }
});
