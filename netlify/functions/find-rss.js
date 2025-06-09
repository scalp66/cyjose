const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { siteUrl } = JSON.parse(event.body);
        if (!siteUrl) {
            return { statusCode: 400, body: 'URL du site manquante.' };
        }

        console.log(`Analyse RSS pour : ${siteUrl}`);
        const response = await axios.get(siteUrl);
        const $ = cheerio.load(response.data);

        let rssUrl = null;

        // Stratégie 1: Chercher la balise <link> standard
        $('link[type="application/rss+xml"]').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
                rssUrl = new URL(href, siteUrl).href;
                return false; // Arrête la boucle dès qu'on trouve
            }
        });

        if (rssUrl) {
            console.log(`Flux RSS trouvé via la balise <link>: ${rssUrl}`);
            return {
                statusCode: 200,
                body: JSON.stringify({ rssUrl: rssUrl, siteTitle: $('title').first().text() }),
            };
        }
        
        // (On pourrait ajouter d'autres stratégies de devinette ici plus tard)

        console.log('Aucun flux RSS trouvé.');
        return {
            statusCode: 404,
            body: JSON.stringify({ error: "Impossible de trouver un flux RSS sur cette page." }),
        };

    } catch (error) {
        console.error('Erreur dans la fonction find-rss:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Une erreur est survenue lors de l'analyse du site." }),
        };
    }
};
