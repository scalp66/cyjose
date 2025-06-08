const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// Le scraper va maintenant lire ce fichier pour trouver ses sources.
const SOURCES_FILE = 'sources.json';
const VEILLE_FILE = 'public/veille.json';

// ... (La fonction sendNotification ne change pas) ...
const sendNotification = async (title) => {
    if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) {
        console.log('Variables OneSignal non configurées, notification non envoyée.');
        return;
    }
    const notification = {
        app_id: process.env.ONESIGNAL_APP_ID,
        contents: { en: title },
        headings: { en: 'Nouvel article trouvé !' },
        included_segments: ["Total Subscriptions"]
    };
    try {
        await axios.post('https://onesignal.com/api/v1/notifications', notification, {
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`
            }
        });
        console.log('✔️ Notification envoyée pour :', title);
    } catch (error) {
        console.error('❌ Erreur OneSignal:', error.response.data);
    }
};


const fetchArticles = async () => {
    console.log('🤖 Démarrage de la veille...');

    // 1. Lire les sources à surveiller depuis sources.json
    let sourcesToScrape = [];
    try {
        if (fs.existsSync(SOURCES_FILE)) {
            const sourcesData = fs.readFileSync(SOURCES_FILE);
            sourcesToScrape = JSON.parse(sourcesData);
            console.log(`🔍 ${sourcesToScrape.length} source(s) à analyser.`);
        } else {
            console.log("❌ Fichier sources.json introuvable. Arrêt de la veille.");
            return;
        }
    } catch(e) { 
        console.log("❌ Erreur de lecture de sources.json. Arrêt.", e);
        return;
    }

    // 2. Lire les anciens articles (logique existante)
    let oldArticles = [];
    try {
        if (fs.existsSync(VEILLE_FILE)) {
            const oldData = fs.readFileSync(VEILLE_FILE);
            oldArticles = JSON.parse(oldData);
        }
    } catch(e) { console.log("Pas d'ancien fichier de veille.") }
    const oldLinks = new Set(oldArticles.map(a => a.link));

    // 3. Scraper les nouveaux articles (logique existante mais avec la nouvelle liste de sources)
    let newArticles = [];
    for (const source of sourcesToScrape) {
        try {
            const response = await axios.get(source.url);
            const $ = cheerio.load(response.data);
            $(source.selector).each((index, element) => {
                const title = $(element).text().trim();
                let link = $(element).attr('href');
                if (title && link) {
                    if (!link.startsWith('http')) {
                        link = new URL(link, source.url).href;
                    }
                    newArticles.push({ title, link, source: source.name, date: new Date() });
                }
            });
        } catch (error) { console.error(`Erreur sur la source ${source.name}:`, error.message); }
    }

    // 4. Comparer et notifier (logique existante)
    const trulyNewArticles = newArticles.filter(a => !oldLinks.has(a.link));
    if (trulyNewArticles.length > 0) {
        console.log(`📢 ${trulyNewArticles.length} vrais nouveaux articles trouvés !`);
        for (const article of trulyNewArticles) {
            await sendNotification(article.title);
        }
    } else {
        console.log('➡️ Pas de nouveaux articles cette fois.');
    }

    // 5. Écrire le nouveau fichier complet (logique existante)
    const articlesToSave = newArticles.slice(0, 30);
    fs.writeFileSync(VEILLE_FILE, JSON.stringify(articlesToSave, null, 2));
    console.log('✔️ Fichier veille.json mis à jour.');
};

fetchArticles();