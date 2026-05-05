# 📘 Documentation Technique : Plateforme Mynds Finance

Ce document présente la conception technique, l'architecture logicielle et la structure de la base de données de la plateforme **Mynds Finance**.

---

## 1. Vue d'Ensemble
**Mynds Finance** est un tableau de bord financier de pointe conçu pour automatiser la facturation, le suivi de trésorerie et la gestion des ressources humaines. La plateforme est passée d'un stockage local navigateur à une architecture persistante robuste basée sur **PostgreSQL**.

---

## 2. Architecture Logicielle
La plateforme suit une architecture **Client-Serveur** moderne :

### 🏗️ Frontend (Client)
*   **Framework :** React 18+ (Vite)
*   **Styling :** CSS Moderne (Glassmorphism, Design Premium)
*   **Gestion d'État :** Hooks React (useState, useEffect, useMemo)
*   **Synchronisation :** Système hybride (LocalStorage pour la réactivité + API PostgreSQL pour la persistance).

### ⚙️ Backend (Serveur)
*   **Runtime :** Node.js
*   **Framework :** Express.js
*   **ORM :** Prisma (v6) pour une interaction typée avec la base de données.
*   **Authentification :** Gestion de sessions sécurisée avec hachage de mots de passe.

---

## 3. Conception Profonde de la Base de Données (PostgreSQL)

L'architecture de données a été conçue pour garantir l'intégrité financière et la traçabilité complète.

### 🏛️ Schéma Relationnel Détaillé

#### A. Table `Client` (Référentiel Central)
*   **ID (UUID/String) :** Clé primaire unique.
*   **Champs Fiscaux :** `mf` (Matricule Fiscal), `adresse`.
*   **Logique de Cycle :** `jourCycle`, `modeCycle` permettent au moteur de facturation de calculer automatiquement les échéances.
*   **Status :** `etatClient` (Enum : Actif, Archivé).
*   **Contraintes :** Index unique sur `enseigne` pour éviter les doublons de noms.

#### B. Table `Invoice` (Cœur Transactionnel)
*   **Relations :** Clé étrangère `clientId` pointant vers `Client` avec suppression en cascade (optionnelle).
*   **Typage Monétaire :** Utilisation de `Float` et `Int` pour les calculs, mais stockage des montants finaux en `String` pour la compatibilité avec les exports PDF.
*   **JSONB (Lines) :** Les lignes de facture sont stockées au format JSON structuré, permettant une flexibilité totale sur les libellés et les quantités sans alourdir le schéma.
*   **Historique :** Champ `history` (JSONB) stockant chaque changement d'état (Émise -> Envoyée -> Payée).

#### C. Table `BankTransaction` (Flux de Trésorerie)
*   **Banques (Enum) :** BIAT (Officiel), QNB (Perso), Espèces, Carte Technologique.
*   **Catégorisation :** `category` (Facture, Charges, RH, Perso).
*   **Lien Facture :** `originalId` permet de lier une transaction automatique à sa facture source (Rapprochement).

#### D. Table `AuditHistory` (Traçabilité)
*   Cette table ne permet pas la suppression. Elle enregistre chaque événement système crucial (Synchronisation, Migration, Suppression de masse).
*   **Structure :** Clé (`key`), Valeur (`value` - JSONB), Horodatage automatique.

---

## 4. Logique Métier & Algorithmes

### 🔄 Système de Migration Atomique
Lors du passage au SQL, un contrôleur de migration a été développé pour garantir qu'aucune donnée ne soit perdue ou dupliquée.
*   **Dédoublonnage :** Algorithme de vérification des clés composites (Client + Date + Montant).
*   **Atomicité :** Utilisation de `prisma.$transaction` pour assurer que soit tout est migré, soit rien (en cas d'erreur).

### 🤖 Automatisation de la Facturation
Le système calcule dynamiquement les factures manquantes basées sur le `jourCycle` et la `dateDebut` du client. 
*   **Rattrapage Historique :** Algorithme spécial pour générer rétroactivement les factures (ex: Elkindy 2024-2025).

### 🏦 Rapprochement Bancaire
Logique permettant de lier une transaction bancaire (Entrée) à une facture émise pour valider le flux financier réel.

---

## 5. Sécurité et Performance
*   **Variables d'Environnement :** Isolation des secrets (DATABASE_URL, JWT_SECRET).
*   **CORS :** Limitation des accès API au domaine frontal uniquement.
*   **Optimisation SQL :** Utilisation d'index sur les IDs et les dates pour des rapports ultra-rapides.

---

## 6. Stack Technique Résumée
| Composant | Technologie |
| :--- | :--- |
| **Langage** | JavaScript (ES6+) |
| **Base de Données** | PostgreSQL 16 |
| **Serveur API** | Express.js |
| **Interface** | React.js |
| **Iconographie** | Lucide-React |
| **Rapports** | Recharts (Visualisation de données) |

---
*Documentation rédigée pour le projet Mynds Finance - Version 1.0 (2026).*
