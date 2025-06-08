// Fichier : public/service-worker.js

// On importe le script de OneSignal au tout début. C'est la ligne la plus importante.
// Elle permet à notre unique service worker de prendre en charge les notifications.
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// Pour l'instant, on ne met rien d'autre dans ce fichier.
// Plus tard, une fois que tout fonctionnera parfaitement, on pourra ajouter ici
// la logique pour la mise en cache des fichiers pour le mode hors-ligne.
// Garder ce fichier simple maintenant nous aide à trouver le problème.