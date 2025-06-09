teer = require('puppeteer');
const fs = require('fs');const puppe
const axios = require('axios'); // Gardé pour OneSignal

// --- CONFIGURATION ---
const SOURCES_FILE = 'sources.json';
const VEILLE_FILE = 'public/veille.json';

// --- FONCTION ONESIGNAL ---
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

// --- NOUVEAU : Fonction de gestion de cookies plus robuste ---
const handleCookieBanner = async (page) => {
    console.log('  -> Recherche d\'une bannière de cookies...');
    const acceptKeywords = ['accept', 'agree', 'accepter', 'consentir', 'yes, i agree', 'j\'accepte'];

    try {
        // Stratégie 1: Chercher un bouton directement sur la page principale
        const mainPageButtonHandle = await page.evaluateHandle((keywords) => {
            const buttons = Array.from(document.querySelectorAll('button, a[role="button"]'));
            return buttons.find(b => keywords.some(kw => b.innerText.toLowerCase().includes(kw)));
        }, acceptKeywords);

        if (mainPageButtonHandle && (await mainPageButtonHandle.asElement())) {
            console.log('  -> Bouton trouvé sur la page principale. Clic...');
            await mainPageButtonHandle.click();
            await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre que l'overlay disparaisse
            return;
        }

        // Stratégie 2: Chercher dans une iframe
        console.log('  -> Pas de bouton direct, recherche d\'une iframe de consentement...');
        const iframeElementHandle = await page.waitForSelector('iframe[id*="sp_message_iframe"], iframe[id*="cmp"]', { timeout: 5000 }).catch(() => null);

        if (iframeElementHandle) {
            const frame = await iframeElementHandle.contentFrame();
            if (frame) {
                console.log('  -> Iframe trouvée, recherche du bouton à l\'intérieur...');
                const buttonInFrameHandle = await frame.evaluateHandle((keywords) => {
                    const buttons = Array.from(document.querySelectorAll('button, a[role="button"]'));
                    return buttons.find(b => keywords.some(kw => b.innerText.toLowerCase().includes(kw) || (b.title && b.title.toLowerCase().includes(kw))));
                }, acceptKeywords);

                if (buttonInFrameHandle && (await buttonInFrameHandle.asElement())) {
                    console.log('  -> Bouton trouvé dans l\'iframe. Clic...');
                    await buttonInFrameHandle.click();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return;
                }
            }
        }
        console.log('  -> Aucune bannière de cookies gérable n\'a été trouvée.');
    } catch (error) {
        console.log(`  -> Erreur lors de la gestion des cookies : ${error.message}. On continue...`);
    }
};


const fetchArticles = async () => {
    console.log('🤖 Démarrage de la veille avec le moteur Puppeteer (version V3)...');
    
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

    let allFoundArticles = [];
    let browser;
    try {
        console.log('🚀 Lancement du navigateur headless...');
        browser = await puppeteer.launch({ 
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        for (const source of sourcesToScrape) {
            try {
                console.log(`- Visite de ${source.name}...`);
                await page.goto(source.url, { waitUntil: 'networkidle2', timeout: 60000 });

                await handleCookieBanner(page);
                
                console.log('  -> Défilement de la page pour charger plus de contenu...');
                await page.evaluate(async () => {
                    for (let i = 0; i < 3; i++) {
                        window.scrollBy(0, window.innerHeight);
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                });

                const articlesFromPage = await page.evaluate((selector) => {
                    const found = [];
                    document.querySelectorAll(selector).forEach(element => {
                        if (element.innerText && element.href && element.href.startsWith('http')) {
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
    
    const trulyNewArticles = allFoundArticles.filter(a => !oldLinks.has(a.link));
    
    if (trulyNewArticles.length > 0) {
        console.log(`📢 ${trulyNewArticles.length} vrais nouveaux articles trouvés !`);
        for (const article of trulyNewArticles) {
            await sendNotification(article.title);
        }
    } else {
        console.log('➡️ Pas de nouveaux articles cette fois.');
    }

    const articlesToSave = allFoundArticles.slice(0, 50); 
    fs.writeFileSync(VEILLE_FILE, JSON.stringify(articlesToSave, null, 2));
    console.log(`✔️ Fichier veille.json mis à jour avec ${articlesToSave.length} articles.`);
};

fetchArticles();
