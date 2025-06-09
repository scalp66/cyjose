const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios'); // On le garde pour OneSignal

// --- CONFIGURATION (ne change pas) ---
const SOURCES_FILE = 'sources.json';
const VEILLE_FILE = 'public/veille.json';

// --- FONCTION ONESIGNAL (ne change pas) ---
const sendNotification = async (title) => {
    if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) {
        console.log('Variables OneSignal non configurées, notification non envoyée.');
        return;
    }
    // ... (le reste de la fonction est identique)
};

const fetchArticles = async () => {
    console.log('🤖 Démarrage de la veille avec le moteur Puppeteer...');
    
    // --- LECTURE DES SOURCES ET DES ANCIENS ARTICLES (ne change pas) ---
    let sourcesToScrape = [];
    try {
        sourcesToScrape = JSON.parse(fs.readFileSync(SOURCES_FILE));
        console.log(`🔍 ${sourcesToScrape.length} source(s) à analyser.`);
    } catch (e) {
        console.log("❌ Fichier sources.json introuvable. Arrêt.");
        return;
    }

    let oldArticles = [];
    try {
        oldArticles = JSON.parse(fs.readFileSync(VEILLE_FILE));
    } catch (e) { /* Pas grave si le fichier n'existe pas */ }
    const oldLinks = new Set(oldArticles.map(a => a.link));

    // --- NOUVELLE LOGIQUE DE SCRAPING AVEC PUPPETEER ---
    let newArticles = [];
    let browser;
    try {
        console.log('🚀 Lancement du navigateur headless...');
        browser = await puppeteer.launch({ 
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Nécessaire pour les serveurs comme GitHub Actions
        });
        const page = await browser.newPage();

        for (const source of sourcesToScrape) {
            try {
                console.log(`- Visite de ${source.name}...`);
                await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

                const articlesFromPage = await page.evaluate((selector) => {
                    const foundArticles = [];
                    // On interroge la page une fois qu'elle est chargée par le navigateur
                    document.querySelectorAll(selector).forEach(element => {
                        if (element.innerText && element.href) {
                            foundArticles.push({
                                title: element.innerText.trim(),
                                link: element.href
                            });
                        }
                    });
                    return foundArticles;
                }, source.selector); // On passe notre sélecteur à la page

                articlesFromPage.forEach(article => {
                    newArticles.push({ ...article, source: source.name, date: new Date() });
                });

            } catch (error) {
                console.error(`❌ Erreur sur la source ${source.name}:`, error.message);
            }
        }
    } catch (error) {
        console.error("❌ Erreur majeure de Puppeteer:", error);
    } finally {
        if (browser) {
            await browser.close();
            console.log(' navigateur fermé.');
        }
    }
    
    // --- COMPARAISON, NOTIFICATION, SAUVEGARDE (ne change pas) ---
    const trulyNewArticles = newArticles.filter(a => !oldLinks.has(a.link));
    if (trulyNewArticles.length > 0) {
        console.log(`📢 ${trulyNewArticles.length} vrais nouveaux articles trouvés !`);
        for (const article of trulyNewArticles) {
            // await sendNotification(article.title); // Temporairement désactivé pour les tests
        }
    } else {
        console.log('➡️ Pas de nouveaux articles cette fois.');
    }

    const articlesToSave = [...trulyNewArticles, ...oldArticles].slice(0, 50); // On sauvegarde les nouveaux + les anciens
    fs.writeFileSync(VEILLE_FILE, JSON.stringify(articlesToSave, null, 2));
    console.log(`✔️ Fichier veille.json mis à jour avec ${articlesToSave.length} articles.`);
};

fetchArticles();
