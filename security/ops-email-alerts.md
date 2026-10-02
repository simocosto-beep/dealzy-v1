# Alertes administratives Dealzy

Configuration activée le 2 octobre 2026.

La tâche ChatGPT « Alertes admin Dealzy » vérifie toutes les heures les diagnostics enregistrés dans Supabase, puis envoie les alertes nécessaires par le connecteur Resend. Elle fonctionne séparément du chat intégré dans l’admin. Aucun secret de messagerie n’a été ajouté au frontend ni au dépôt.

Les règles couvrent les fournisseurs actifs signalés unhealthy avec une date de contrôle, les contrats actifs arrivant à échéance sous 7 jours (ou déjà échus), et les erreurs de synchronisation sans réussite ultérieure. Candidatures, fournisseurs désactivés et démos sont exclus des pannes. La santé n’est pas sondée activement auprès de chaque fournisseur : un diagnostic non instrumenté peut manquer une panne.

Destinataire : le compte superadmin actif unique, avec validation du destinataire autorisé par la tâche. Expéditeur choisi : alertes@dealzyai.com. Aucun CC/BCC. Email en français avec action proposée et lien admin, sans erreurs brutes ni identifiants de clients.

La file et les événements sont privés dans dealzy_ops, RLS activé, aucun droit anon/authenticated. Les fonctions sont SECURITY INVOKER et non accessibles aux clients. L’absence de politique RLS est intentionnelle : accès refusé aux rôles clients.

Une alerte persistante a un rappel quotidien au maximum. Les reprises utilisent le même lot et la même clé Resend. Les envois non confirmés depuis 23 heures passent unknown et bloquent les nouveaux envois jusqu’à examen manuel. accepted signifie accepté par Resend, pas livré ; delivered requiert confirmation fournisseur. Une connexion externe indisponible peut empêcher la vérification et doit produire une notification ChatGPT.

Tests transactionnels réussis : détection fournisseur, exclusion des erreurs brutes, même identifiant lors des reprises, déduplication quotidienne, refus anonyme. Tous les fixtures sont annulés. Email de test confirmé delivered par Resend.

Pour arrêter : désactiver la tâche ChatGPT « Alertes admin Dealzy ». Pour modifier seuils/règles : mettre à jour current_interventions() et tester avant déploiement.
