const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios'); // Gardé pour OneSignal

// --- CONFIGURATION ---
const SOURCES_FILE = 'sources.json';
const VEILLE_FILE = 'public/veille.json';

// --- FONCTION ONESIGNAL (ne change pas) ---
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
        console.error('❌ Erreur OneSignal:', error.response ? error.response.data : error.message);
    }
};

const fetchArticles = async () => {
    console.log('🤖 Démarrage de la veille avec le moteur Puppeteer (version patiente)...');
    
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
    } catch (e) { /* Pas grave */ }
    const oldLinks = new Set(oldArticles.map(a => a.link));

    // --- LOGIQUE DE SCRAPING AVEC PUPPETEER ---
    let allFoundArticles = [];
    let browser;
    try {
        console.log('🚀 Lancement du navigateur headless...');
        browser = await puppeteer.launch({ 
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, // Important pour GitHub Actions
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        for (const source of sourcesToScrape) {
            try {
                console.log(`- Visite de ${source.name}...`);
                // --- LA CORRECTION EST ICI ---
                // On attend que la page soit complètement "calme"
                await page.goto(source.url, { waitUntil: 'networkidle2', timeout: 60000 });

                const articlesFromPage = await page.evaluate((selector) => {
                    const found = [];
                    document.querySelectorAll(selector).forEach(element => {
                        if (element.innerText && element.href) {
                            found.push({
                                title: element.innerText.trim(),
                                link: element.href
                            });
                        }
                    });
                    return found;
                }, source.selector);

                articlesFromPage.forEach(article => {
                    allFoundArticles.push({ ...article, source: source.name, date: new Date() });
                });
                console.log(`  -> ${articlesFromPage.length} articles trouvés sur ${source.name}.`);

            } catch (error) {
                console.error(`❌ Erreur sur la source ${source.name}:`, error.message);
            }
        }
    } catch (error) {
        console.error("❌ Erreur majeure de Puppeteer:", error);
    } finally {
        if (browser) {
            await browser.close();
            console.log(' navigateurs fermé.');
        }
    }
    
    // --- COMPARAISON, NOTIFICATION, SAUVEGARDE ---
    const trulyNewArticles = allFoundArticles.filter(a => !oldLinks.has(a.link));
    
    if (trulyNewArticles.length > 0) {
        console.log(`📢 ${trulyNewArticles.length} vrais nouveaux articles trouvés !`);
        for (const article of trulyNewArticles) {
            await sendNotification(article.title);
        }
    } else {
        console.log('➡️ Pas de nouveaux articles cette fois.');
    }

    // On sauvegarde la liste fraîchement récupérée, limitée aux 50 derniers
    const articlesToSave = allFoundArticles.slice(0, 50); 
    fs.writeFileSync(VEILLE_FILE, JSON.stringify(articlesToSave, null, 2));
    console.log(`✔️ Fichier veille.json mis à jour avec ${articlesToSave.length} articles.`);
};

fetchArticles();
