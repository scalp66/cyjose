const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');
const Parser = require('rss-parser'); // <-- NOTRE NOUVEL OUTIL

// --- CONFIGURATION ---
const SOURCES_FILE = 'sources.json';
const VEILLE_FILE = 'public/veille.json';
const parser = new Parser(); // On initialise le lecteur RSS

// --- FONCTION ONESIGNAL (ne change pas) ---
const sendNotification = async (title) => {
    if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) {
        return; // Pas de log ici pour ne pas saturer le journal
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
        console.error('❌ Erreur OneSignal:', error.response ? error.response.data : error.message);
    }
};

const fetchArticles = async () => {
    console.log('🤖 Démarrage de la veille avec le moteur HYBRIDE...');
    
    // --- LECTURE DES SOURCES ET DES ANCIENS ARTICLES ---
    let sourcesToScrape = [];
    try {
        sourcesToScrape = JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf-8'));
        console.log(`🔍 ${sourcesToScrape.length} source(s) à analyser.`);
    } catch (e) {
        console.log("❌ Fichier sources.json introuvable. Arrêt.");
        return;
    }

    let oldArticles = [];
    try {
        oldArticles = JSON.parse(fs.readFileSync(VEILLE_FILE, 'utf-8'));
    } catch (e) { /* Pas grave si le fichier n'existe pas */ }
    const oldLinks = new Set(oldArticles.map(a => a.link));

    // --- LOGIQUE DE COLLECTE HYBRIDE ---
    let allFoundArticles = [];
    let browser = null; // On ne lance le navigateur que si nécessaire

    for (const source of sourcesToScrape) {
        console.log(`- Traitement de ${source.name}...`);

        if (source.type === 'rss') {
            // --- STRATÉGIE 1 : LECTURE DU FLUX RSS (Rapide et Fiable) ---
            try {
                const feed = await parser.parseURL(source.url);
                feed.items.forEach(item => {
                    if (item.title && item.link) {
                        allFoundArticles.push({
                            title: item.title,
                            link: item.link,
                            source: source.name,
                            date: item.isoDate || new Date()
                        });
                    }
                });
                console.log(`  -> RSS : ${feed.items.length} articles trouvés.`);
            } catch (error) {
                console.error(`❌ Erreur sur le flux RSS ${source.name}:`, error.message);
            }
        } else {
            // --- STRATÉGIE 2 : SCRAPING AVEC PUPPETEER (Solution de secours) ---
            try {
                // On s'assure que le navigateur est bien lancé (une seule fois)
                if (!browser) {
                    console.log('🚀 Lancement du navigateur headless pour le scraping...');
                    browser = await puppeteer.launch({ 
                        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
                        args: ['--no-sandbox', '--disable-setuid-sandbox']
                    });
                }
                const page = await browser.newPage();
                await page.setViewport({ width: 1280, height: 800 });
                await page.goto(source.url, { waitUntil: 'networkidle2', timeout: 60000 });
                
                // (Ici on pourrait remettre la logique pour les cookies si nécessaire)

                const articlesFromPage = await page.evaluate((selector) => {
                    const found = [];
                    document.querySelectorAll(selector).forEach(element => {
                        if (element.innerText && element.href && element.href.startsWith('http')) {
                            found.push({ title: element.innerText.trim(), link: element.href });
                        }
                    });
                    return found;
                }, source.selector);

                articlesFromPage.forEach(article => {
                    allFoundArticles.push({ ...article, source: source.name, date: new Date() });
                });
                console.log(`  -> Scraper : ${articlesFromPage.length} articles trouvés.`);
                await page.close();
            } catch (error) {
                console.error(`❌ Erreur de scraping sur ${source.name}:`, error.message);
            }
        }
    }

    if (browser) {
        await browser.close();
        console.log(' navigateurs fermé.');
    }
    
    // --- COMPARAISON, NOTIFICATION, SAUVEGARDE (ne change pas) ---
    const trulyNewArticles = allFoundArticles.filter(a => !oldLinks.has(a.link));
    
    if (trulyNewArticles.length > 0) {
        console.log(`📢 ${trulyNewArticles.length} vrais nouveaux articles trouvés !`);
        for (const article of trulyNewArticles) {
            await sendNotification(article.title);
        }
    } else {
        console.log('➡️ Pas de nouveaux articles cette fois.');
    }

    // On trie par date pour avoir les plus récents en haut et on garde les 50 premiers
    allFoundArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
    const articlesToSave = allFoundArticles.slice(0, 50); 
    
    fs.writeFileSync(VEILLE_FILE, JSON.stringify(articlesToSave, null, 2));
    console.log(`✔️ Fichier veille.json mis à jour avec ${articlesToSave.length} articles.`);
};

fetchArticles();
