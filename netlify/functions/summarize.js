const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialise le client AI avec la clé stockée sur Netlify
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.handler = async function (event, context) {
    // On ne permet que les requêtes POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { articleUrl } = JSON.parse(event.body);
        if (!articleUrl) {
            return { statusCode: 400, body: 'URL de l\'article manquante.' };
        }

        // 1. Scraper le contenu de l'article
        console.log(`Scraping de l'URL: ${articleUrl}`);
        const response = await axios.get(articleUrl);
        const $ = cheerio.load(response.data);
        // On essaie de trouver le corps principal de l'article (cela peut varier selon les sites)
        const articleText = $('article').text() || $('main').text() || $('body').text();
        // On nettoie un peu le texte et on le limite pour ne pas surcharger l'IA
        const cleanedText = articleText.replace(/\s\s+/g, ' ').trim().slice(0, 15000);

        if (cleanedText.length < 100) {
             return { statusCode: 400, body: 'Contenu de l\'article trop court ou introuvable.' };
        }

        // 2. Envoyer le texte à l'IA pour le résumé
        console.log('Envoi du texte à l\'IA pour résumé...');
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `Résume le texte suivant en 3 ou 4 phrases clés, en français :\n\n"${cleanedText}"`;
        
        const result = await model.generateContent(prompt);
        const summary = await result.response.text();
        console.log('Résumé reçu !');

        // 3. Renvoyer le résumé au frontend
        return {
            statusCode: 200,
            body: JSON.stringify({ summary: summary }),
        };
    } catch (error) {
        console.error('Erreur dans la fonction serverless:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Une erreur est survenue lors du traitement du résumé." }),
        };
    }
};