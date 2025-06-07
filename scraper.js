// scraper.js
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// --- À CONFIGURER ---
// La liste des sites que tu veux surveiller.
const SOURCES = [
    {
        name: 'Hacker News',
        url: 'https://news.ycombinator.com/',
        // Le sélecteur CSS pour trouver les liens des articles.
        // Fais un clic droit -> "Inspecter" sur le site pour trouver le bon sélecteur.
        selector: '.titleline > a',
    },
    // Ajoute d'autres sources ici si tu le souhaites
    // {
    //     name: 'Mon Autre Site',
    //     url: 'https://example.com',
    //     selector: '.article-link',
    // }
];

const fetchArticles = async () => {
    console.log('🤖 Démarrage de la veille...');
    let allArticles = [];

    for (const source of SOURCES) {
        try {
            const response = await axios.get(source.url);
            const $ = cheerio.load(response.data);

            console.log(`🔍 Analyse de ${source.name}...`);

            $(source.selector).each((index, element) => {
                const title = $(element).text().trim();
                const link = $(element).attr('href');

                // On s'assure d'avoir un titre et un lien
                if (title && link) {
                    allArticles.push({
                        title,
                        link: new URL(link, source.url).href, // Construit une URL complète
                        source: source.name,
                        date: new Date()
                    });
                }
            });
        } catch (error) {
            console.error(`❌ Erreur en récupérant les données de ${source.name}:`, error.message);
        }
    }

    // On ne garde que les 30 articles les plus récents pour ne pas avoir un fichier énorme
    const articlesRecents = allArticles.slice(0, 30);
    console.log(`✅ ${articlesRecents.length} articles trouvés.`);

    // On écrit le résultat dans un fichier JSON que notre application lira
    // On le met dans un dossier 'public' pour que Netlify puisse y accéder
    if (!fs.existsSync('public')){
        fs.mkdirSync('public');
    }
    fs.writeFileSync('public/veille.json', JSON.stringify(articlesRecents, null, 2));
    console.log('✔️ Fichier veille.json sauvegardé !');
};

fetchArticles();