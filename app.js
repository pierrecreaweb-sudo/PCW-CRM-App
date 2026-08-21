// ========================================================================
//  PCW — GESTION CLIENT — PWA
//  Backend : Supabase (auth + base de données, synchronisé multi-appareils)
// ========================================================================

// ---- 1) CONFIGURATION ----
// ⚠️ À remplacer par les identifiants de TON NOUVEAU projet Supabase
// (voir README.md, section 1 et 2).
const SUPABASE_URL = "https://chlmceyretciqydrdpgp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JXUR4NfJQB4V5F8prZ3kjQ_RvVuNQ7q";
const EDGE_FUNCTIONS_URL = SUPABASE_URL + "/functions/v1";
// Stockage personnalisé : si "Rester connecté" est coché, la session est
// gardée dans localStorage (persiste après fermeture du navigateur/appli) ;
// sinon elle va dans sessionStorage (effacée à la fermeture).
const REMEMBER_KEY = "pcw_remember_me";
const authStorage = {
  getItem: (key) => localStorage.getItem(key) || sessionStorage.getItem(key),
  setItem: (key, value) => {
    const remember = localStorage.getItem(REMEMBER_KEY) !== "0";
    if (remember) { localStorage.setItem(key, value); sessionStorage.removeItem(key); }
    else { sessionStorage.setItem(key, value); localStorage.removeItem(key); }
  },
  removeItem: (key) => { localStorage.removeItem(key); sessionStorage.removeItem(key); },
};
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: authStorage, persistSession: true, autoRefreshToken: true },
});

// ---- 2) CONSTANTES ----
const TYPES_EVENEMENT = ["Site Web One Page", "Site Vitrine", "Site Vitrine +", "Pack SEO Démarrage", "Suivi SEO", "Gestion Google/Meta Ads", "Pack SEO + Ads Complet", "Application Essentielle", "Application Métier Standard", "Application Métier Complète", "Audit Express", "Audit Complet"];
const STATUTS_PROSPECT = ["Nouveau", "Contacté", "Qualifié", "Devis envoyé", "Converti", "Perdu"];
const STATUTS_DEVIS = ["En attente", "Envoyé", "Accepté", "Refusé", "Expiré"];
const STATUTS_FACTURE = ["Brouillon", "Envoyée", "Payée", "En retard", "Annulée"];
const STATUTS_EVENEMENT = ["Premier contact", "Devis en cours", "En cours", "Livré", "Annulé"];
const STATUTS_TODO = ["À faire", "En cours", "Terminé"];
const STATUTS_RDV = ["Prévu", "Confirmé", "Effectué", "Annulé"];
const PRIORITES = ["Basse", "Normale", "Haute", "Urgente"];
const SOURCES_PROSPECT = ["Site web", "Téléphone", "Bouche à oreille", "Réseaux sociaux", "Recommandation", "Autre"];
const CATEGORIES_CONTACT = ["Client", "Prospect", "Partenaire"];
const PROVENANCES = ["Bouche à oreille", "Site web", "Réseaux sociaux", "Google / SEO", "Recommandation", "Réseau professionnel", "Contact direct"];
const TYPES_PRESTATION = ["Prestation ponctuelle", "Forfait clé en main", "Abonnement mensuel"];
const FORMULES = ["Prestation ponctuelle", "Forfait clé en main", "Abonnement mensuel"];
const CATEGORIES_TARIF = ["Prestation", "Option / Supplément"];
const CATEGORIES_DEPENSE = ["Abonnement logiciel", "Hébergement / Nom de domaine", "Matériel informatique", "Marketing / Publicité", "Frais bancaires", "Sous-traitance", "Fournitures de bureau", "Formation", "Déplacement", "Assurance", "Impôts / Cotisations"];
const RECURRENCE_DEPENSE = ["Aucune", "Mensuelle", "Annuelle"];
const MODES_PAIEMENT = ["Paiement unique", "Paiement mensuel", "Paiement annuel"];
const MODE_PAIEMENT_COLORS = { "Paiement unique": "var(--muted)", "Paiement mensuel": "var(--warning)", "Paiement annuel": "var(--info)" };
function modePaiementShort(m) { return m === "Paiement mensuel" ? "Mensuel" : m === "Paiement annuel" ? "Annuel" : "Unique"; }
function modePaiementSuffix(m) { return m === "Paiement mensuel" ? "/mois" : m === "Paiement annuel" ? "/an" : ""; }
const MENTION_TVA = "TVA non applicable, art. 293 B du CGI";

// Options de projet, proposées selon le type de projet sélectionné
const TYPES_SITE = ["Site Web One Page", "Site Vitrine", "Site Vitrine +"];
const TYPES_APP = ["Application Essentielle", "Application Métier Standard", "Application Métier Complète"];
const OPTIONS_SITE = ["Nom de domaine", "Hébergement", "Maintenance & mise à jour", "Page supplémentaire", "Rédaction de contenu"];
const OPTIONS_APP = ["Module supplémentaire", "Accès multi-utilisateurs", "Maintenance & évolutions", "Hébergement base de données"];
function optionsListForType(type) {
  if (TYPES_SITE.includes(type)) return OPTIONS_SITE;
  if (TYPES_APP.includes(type)) return OPTIONS_APP;
  return null;
}
const CGV_CLAUSE_MAINTENANCE = "Le prestataire assure la gestion technique pendant toute la durée du contrat de maintenance. En cas de résiliation, le client peut récupérer l'ensemble de ses données et les accès à son site après règlement de toutes les sommes dues.";
const CGV_CLAUSE_ACOMPTE = "Un acompte de 30% du montant total TTC est dû à la validation du devis. Cet acompte est exigible immédiatement et non remboursable en cas d'annulation de la commande par le client, sauf cas de force majeure.";
const CGV_CLAUSE_ABONNEMENT = "Les abonnements sont conclus pour une durée de 12 mois. Sauf résiliation notifiée par écrit au moins 30 jours avant l'échéance, ils sont reconduits automatiquement pour une nouvelle période de 12 mois.";
// ⚠️ CGV_OPTIONS ne sert plus qu'à pré-remplir la table cgv_templates la toute
// première fois (voir seedCgvTemplates) — une fois en base, c'est la table
// cgv_templates (modifiable dans l'appli via le bouton "CGV") qui fait foi.
const CGV_OPTIONS = [
  "Paiement du solde à la livraison du projet.",
  "Paiement à réception de la facture, envoyée 7 jours avant la livraison.",
  "La propriété des livrables et les droits d'utilisation ne sont transférés au client qu'après paiement intégral de la facture.",
  CGV_CLAUSE_MAINTENANCE,
  CGV_CLAUSE_ACOMPTE,
  CGV_CLAUSE_ABONNEMENT,
];

const EMETTEUR = {
  nom: "P.C.W - Pierre Créa Web",
  adresse: "150 Route d'Agen, 82170 Grisolles",
  siret: "SIRET 108 153 982 00013",
  email: "pierre.creaweb@gmail.com",
  telephone: "06 45 33 43 28",
  site: "pierrecreaweb.fr",
  iban: "FR76 2823 3000 0163 7808 4990 503",
  bic: "REVOFRP2",
  banque: "Revolut",
};

const STATUT_COLORS = {
  "Nouveau": "var(--info)", "Contacté": "var(--warning)", "Qualifié": "var(--accent)",
  "Devis envoyé": "var(--warning)", "Converti": "var(--success)", "Perdu": "var(--danger)",
  "En attente": "var(--muted)", "Envoyé": "var(--warning)", "Accepté": "var(--success)",
  "Refusé": "var(--danger)", "Expiré": "var(--danger)",
  "Premier contact": "var(--info)", "Devis en cours": "var(--warning)", "Confirmé": "var(--success)",
  "Livré": "var(--success)", "Terminé": "var(--muted)", "Annulé": "var(--danger)",
  "À faire": "var(--info)", "En cours": "var(--warning)",
  "Prévu": "var(--info)", "Effectué": "var(--success)",
  "Client": "var(--success)", "Prospect": "var(--info)", "Partenaire": "var(--danger)",
  "Fournisseur": "var(--warning)", "Autre": "var(--muted)",
  "Envoyée": "var(--warning)", "Payée": "var(--success)",
  "En retard": "var(--danger)", "Annulée": "var(--danger)",
  "Basse": "var(--muted)", "Normale": "var(--muted)", "Haute": "var(--warning)", "Urgente": "var(--danger)",
  "Urgent": "var(--danger)", "Normal": "var(--muted)", "Faible": "var(--muted)",
  "Traité": "var(--success)",
};

const STATUTS_DEMANDES = ["Nouveau", "En cours", "Traité"];
const PRIORITES_DEMANDES = ["Urgent", "Normal", "Faible"];

const ETAPES_PROJET = [
  { value: "maquette", label: "Maquette" },
  { value: "developpement", label: "Développement" },
  { value: "revisions", label: "Révisions" },
  { value: "mise_en_ligne", label: "Mise en ligne" },
  { value: "termine", label: "Terminé" },
];
const ETAPE_COLORS = { maquette: "var(--info)", developpement: "var(--warning)", revisions: "var(--tertiary)", mise_en_ligne: "var(--accent)", termine: "var(--success)" };
function etapeSelectInline(id, value) {
  const v = value || "maquette";
  const color = ETAPE_COLORS[v] || "var(--muted)";
  return `<select class="badge-select" data-table="evenements" data-id="${id}" data-field="etape_projet" style="background:${color};" onclick="event.stopPropagation()" onchange="updateStatutInline(this)">
    ${ETAPES_PROJET.map(e => `<option value="${e.value}" ${e.value === v ? "selected" : ""}>${e.label}</option>`).join("")}
  </select>`;
}

// ---- 3) ETAT LOCAL ----
let currentUser = null;
let cache = { contacts: [], prospects: [], devis: [], evenements: [], todos: [], grille_tarifaire: [], rdv: [], factures: [], temps_passe: [], depenses: [], cgv_templates: [], demandes: [], messages: [], fichiers_clients: [] };
let currentPage = "dashboard";
let modalContext = null;
let calState = { year: new Date().getFullYear(), month: new Date().getMonth() + 1, selected: null };
let edState = { id: null, lignes: [] };

// ---- 4) HELPERS ----
function todayStr() { return new Date().toISOString().slice(0, 10); }
function nowStr() { const d = new Date(); return d.toISOString().slice(0, 16).replace("T", " "); }
function fmtDateFR(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
function fmtMoisFR(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  if (!y || !m) return ym;
  return `${MOIS_FR[Number(m) - 1]} ${y}`;
}
function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function addDaysISO(iso, days) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function addMonthsISO(iso, months) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00"); d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
function daysUntil(iso) {
  if (!iso) return Infinity;
  const a = new Date(iso + "T00:00:00"), b = new Date(todayStr() + "T00:00:00");
  return Math.round((a - b) / 86400000);
}
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}
function badge(text, color) {
  if (!text) return "";
  return `<span class="badge" style="background:${color || "var(--muted)"}">${text}</span>`;
}
function statusSelectInline(table, id, value, options, colors, field) {
  field = field || "statut";
  const color = colors[value] || "var(--muted)";
  return `<select class="badge-select" data-table="${table}" data-id="${id}" data-field="${field}" style="background:${color};" onclick="event.stopPropagation()" onchange="updateStatutInline(this)">
    ${options.map(o => `<option value="${escapeAttr(o)}" ${o === value ? "selected" : ""}>${o}</option>`).join("")}
  </select>`;
}
function statusSelectInlineSubtle(table, id, value, options, colors, field) {
  field = field || "statut";
  const color = colors[value] || "var(--muted)";
  return `<select class="badge-select-subtle" data-table="${table}" data-id="${id}" data-field="${field}" style="--sel-c:${color};" onclick="event.stopPropagation()" onchange="updateStatutInline(this)">
    ${options.map(o => `<option value="${escapeAttr(o)}" ${o === value ? "selected" : ""}>${o}</option>`).join("")}
  </select>`;
}
async function updateStatutInline(selectEl) {
  const table = selectEl.dataset.table;
  const id = Number(selectEl.dataset.id);
  const field = selectEl.dataset.field || "statut";
  const newValue = selectEl.value;
  if (table === "devis" && field === "statut") {
    const d = findDevis(id);
    const wasEnvoye = d && d.statut === "Envoyé";
    await updateRow("devis", id, { statut: newValue });
    await refreshCache();
    const updated = findDevis(id);
    if (newValue === "Envoyé" && !wasEnvoye && updated) await createDevisReminders(updated);
  } else {
    await updateRow(table, id, { [field]: newValue });
    await refreshCache();
  }
  showToast((field === "categorie" ? "Catégorie mise à jour : " : "Statut mis à jour : ") + newValue);
  renderPage(currentPage);
}
function badgeSubtle(text, color) {
  if (!text) return "";
  const c = color || "var(--muted)";
  return `<span class="badge subtle" style="--badge-c:${c};"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${c};margin-right:5px;vertical-align:1px;"></span>${text}</span>`;
}
function contactLabel(c) {
  if (!c) return "—";
  return [c.prenom, c.nom].filter(Boolean).join(" ") || c.societe || "Sans nom";
}
function findContact(id) { return cache.contacts.find(c => c.id === id); }
function findDevis(id) { return cache.devis.find(d => d.id === id); }
function findEvenement(id) { return cache.evenements.find(e => e.id === id); }
function findFacture(id) { return cache.factures.find(f => f.id === id); }
function findGrille(id) { return cache.grille_tarifaire.find(g => g.id === id); }

// Résolution des infos d'un devis via l'évènement lié
function devisEvent(d) { return d && d.evenement_id ? findEvenement(d.evenement_id) : null; }
function devisContact(d) {
  const e = devisEvent(d);
  const cid = (e && e.contact_id) || (d && d.contact_id);
  return findContact(cid);
}
function devisDateEvt(d) { const e = devisEvent(d); return (e && e.date_fin) || (d && d.date_evenement) || null; }
function devisNbInvites(d) { const e = devisEvent(d); return (e && e.nb_invites != null) ? e.nb_invites : (d && d.nb_invites); }

// ---- 5) SUPABASE CRUD GENERIQUE ----
async function fetchAll(table, orderCol = "id", ascending = false) {
  const { data, error } = await sb.from(table).select("*").order(orderCol, { ascending });
  if (error) { showToast("Erreur chargement " + table); console.error(error); return []; }
  return data;
}
async function insertRow(table, values) {
  values.user_id = currentUser.id;
  values.date_creation = values.date_creation || nowStr();
  const { data, error } = await sb.from(table).insert(values).select().single();
  if (error) { showToast("Échec enregistrement : " + (error.message || error.hint || "erreur inconnue")); console.error(error); return null; }
  return data;
}
async function updateRow(table, id, values) {
  const { data, error } = await sb.from(table).update(values).eq("id", id).select().single();
  if (error) { showToast("Échec mise à jour : " + (error.message || error.hint || "erreur inconnue")); console.error(error); return null; }
  return data;
}
async function deleteRow(table, id) {
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) { showToast("Erreur suppression"); console.error(error); return false; }
  return true;
}
async function refreshCache() {
  const [contacts, prospects, devisRows, evenements, todos, grille, rdv, factures, temps, depenses, cgvTemplates, demandes, messages, fichiersClients] = await Promise.all([
    fetchAll("contacts", "nom", true),
    fetchAll("prospects"),
    fetchAll("devis"),
    fetchAll("evenements"),
    fetchAll("todos"),
    fetchAll("grille_tarifaire", "nom_presta", true),
    fetchAll("rdv"),
    fetchAll("factures"),
    fetchAll("temps_passe"),
    fetchAll("depenses"),
    fetchAll("cgv_templates", "ordre", true),
    fetchAll("demandes"),
    fetchAll("messages", "id", true),
    fetchAll("fichiers_clients", "id", true),
  ]);
  cache = { contacts, prospects, devis: devisRows, evenements, todos, grille_tarifaire: grille, rdv, factures, temps_passe: temps, depenses, cgv_templates: cgvTemplates, demandes, messages, fichiers_clients: fichiersClients };
  updateNavBadgeMessages();
}

// ========================================================================
//  AUTHENTIFICATION
// ========================================================================
let authMode = "login";
function setAuthMode(mode) {
  authMode = mode;
  const t = document.getElementById("auth-title"), s = document.getElementById("auth-sub");
  const sub = document.getElementById("auth-submit"), st = document.getElementById("auth-switch-text"), sl = document.getElementById("auth-switch-link");
  const emailEl = document.getElementById("auth-email"), pwEl = document.getElementById("auth-password"), pw2El = document.getElementById("auth-password2");
  const optionsRow = document.getElementById("auth-options-row"), switchRow = document.getElementById("auth-switch-text").closest(".auth-switch");
  const backRow = document.getElementById("auth-back-login-row");
  document.getElementById("auth-error").style.display = "none";
  document.getElementById("auth-success").style.display = "none";
  pw2El.style.display = "none"; pw2El.value = "";
  pwEl.style.display = ""; emailEl.style.display = "";
  optionsRow.style.display = "flex"; switchRow.style.display = "block"; backRow.style.display = "none";

  if (mode === "login") {
    t.textContent = "Connexion"; s.textContent = "PCW — Gestion Client — accède à ton compte";
    sub.textContent = "Se connecter"; st.textContent = "Pas encore de compte ?"; sl.textContent = "Créer un compte";
  } else if (mode === "signup") {
    t.textContent = "Créer un compte"; s.textContent = "PCW — Gestion Client — synchronise tes données";
    sub.textContent = "Créer mon compte"; st.textContent = "Déjà un compte ?"; sl.textContent = "Se connecter";
  } else if (mode === "reset-request") {
    t.textContent = "Mot de passe oublié"; s.textContent = "Reçois un lien pour choisir un nouveau mot de passe";
    sub.textContent = "Envoyer le lien"; pwEl.style.display = "none"; optionsRow.style.display = "none";
    switchRow.style.display = "none"; backRow.style.display = "block";
  } else if (mode === "reset-confirm") {
    t.textContent = "Nouveau mot de passe"; s.textContent = "Choisis un nouveau mot de passe pour ton compte";
    sub.textContent = "Réinitialiser le mot de passe"; emailEl.style.display = "none"; pw2El.style.display = "";
    optionsRow.style.display = "none"; switchRow.style.display = "none"; backRow.style.display = "none";
    pwEl.placeholder = "Nouveau mot de passe"; pw2El.placeholder = "Confirmer le nouveau mot de passe";
  }
}
function authError(msg) { const el = document.getElementById("auth-error"); el.textContent = msg; el.style.display = "block"; document.getElementById("auth-success").style.display = "none"; }
function authSuccess(msg) { const el = document.getElementById("auth-success"); el.textContent = msg; el.style.display = "block"; document.getElementById("auth-error").style.display = "none"; }
async function handleAuthSubmit() {
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;

  if (authMode === "reset-request") {
    if (!email) { authError("Renseigne ton adresse email."); return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.href.split("#")[0].split("?")[0] });
    if (error) { authError(error.message); return; }
    authSuccess("Email envoyé ! Vérifie ta boîte mail (et tes spams) et clique sur le lien reçu.");
    return;
  }
  if (authMode === "reset-confirm") {
    const password2 = document.getElementById("auth-password2").value;
    if (!password || password.length < 6) { authError("Le mot de passe doit faire au moins 6 caractères."); return; }
    if (password !== password2) { authError("Les deux mots de passe ne correspondent pas."); return; }
    const { data, error } = await sb.auth.updateUser({ password });
    if (error) { authError(error.message); return; }
    showToast("Mot de passe mis à jour");
    if (data.user) onLoggedIn(data.user);
    return;
  }

  if (!email || !password) { authError("Renseigne un email et un mot de passe."); return; }
  localStorage.setItem(REMEMBER_KEY, document.getElementById("auth-remember").checked ? "1" : "0");
  if (authMode === "login") {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { authError(error.message); return; }
    onLoggedIn(data.user);
  } else {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) { authError(error.message); return; }
    if (data.user && !data.session) { authError("Compte créé — vérifie ta boîte mail pour confirmer, puis connecte-toi."); setAuthMode("login"); }
    else if (data.user) onLoggedIn(data.user);
  }
}
// Pré-remplit la Tarification avec les prestations/options PCW de base,
// uniquement si l'onglet est encore vide (ne touche jamais à des données
// déjà saisies). Les prix sont laissés vides — à compléter dans l'appli.
// Garde la Tarification synchronisée avec le catalogue de base PCW : ajoute
// uniquement les prestations/options qui n'existent pas encore (comparaison
// par nom), sans jamais toucher aux lignes déjà présentes ou à leurs prix.
async function seedDefaultTarification() {
  const prestations = TYPES_EVENEMENT.filter(nom => nom !== "Audit Express" && nom !== "Audit Complet").map(nom => ({ nom_presta: nom, categorie: "Prestation" }));
  const optionsUniques = [...new Set([...OPTIONS_SITE, ...OPTIONS_APP])];
  const options = optionsUniques.map(nom => ({ nom_presta: nom, categorie: "Option / Supplément" }));
  const packs = [
    { nom_presta: "Pack Lancement", categorie: "Prestation", pu_ttc: 790 },
    { nom_presta: "Pack Croissance", categorie: "Prestation", pu_ttc: 1280 },
    { nom_presta: "Pack Artisan Connecté", categorie: "Prestation", pu_ttc: 3200 },
    { nom_presta: "Audit Express", categorie: "Prestation", pu_ttc: 99 },
    { nom_presta: "Audit Complet", categorie: "Prestation", pu_ttc: 249 },
  ];
  const toCheck = [...prestations, ...options, ...packs];
  const existingNames = new Set(cache.grille_tarifaire.map(g => (g.nom_presta || "").trim().toLowerCase()));
  const toCreate = toCheck.filter(item => !existingNames.has(item.nom_presta.trim().toLowerCase()));
  if (!toCreate.length) return;
  for (const item of toCreate) {
    await insertRow("grille_tarifaire", { nom_presta: item.nom_presta, categorie: item.categorie, details: null, pu_ht: item.pu_ttc != null ? item.pu_ttc : null, tva: 0, montant_tva: 0, pu_ttc: item.pu_ttc != null ? item.pu_ttc : null, mode_paiement: "Paiement unique" });
  }
  await refreshCache();
  showToast(toCreate.length + " prestation(s)/option(s) ajoutée(s) à la Tarification");
}
async function seedCgvTemplates() {
  if (cache.cgv_templates.length) return; // déjà initialisé, on ne touche à rien
  for (let i = 0; i < CGV_OPTIONS.length; i++) {
    await insertRow("cgv_templates", { texte: CGV_OPTIONS[i], ordre: i, date_creation: todayStr() });
  }
  await refreshCache();
}
async function onLoggedIn(user) {
  currentUser = user;
  document.getElementById("auth-screen").style.display = "none";
  document.getElementById("app-screen").style.display = "block";
  document.getElementById("user-email-lbl").textContent = user.email;
  await refreshCache();
  await autoExpireDevis();
  await autoMarkLateFactures();
  await seedDefaultTarification();
  await seedCgvTemplates();
  await checkGoogleConnection();
  const params = new URLSearchParams(window.location.search);
  if (params.has("google_connected")) {
    showToast(params.get("google_connected") === "1" ? "Compte Google connecté ✔" : "Échec de la connexion Google");
    window.history.replaceState({}, "", window.location.pathname);
    await checkGoogleConnection();
  }
  showPage("dashboard");
}
async function handleLogout() {
  await sb.auth.signOut();
  currentUser = null;
  document.getElementById("app-screen").style.display = "none";
  document.getElementById("auth-screen").style.display = "flex";
  document.getElementById("auth-email").value = "";
  document.getElementById("auth-password").value = "";
  document.getElementById("auth-password2").value = "";
  setAuthMode("login");
}

// ========================================================================
//  NAVIGATION
// ========================================================================
function showPage(key) {
  currentPage = key;
  document.querySelectorAll(".nav-item").forEach(el => el.classList.toggle("active", el.dataset.page === key));
  document.querySelectorAll(".page").forEach(el => el.classList.toggle("active", el.id === "page-" + key));
  renderPage(key);
  closeMobileMenu();
}
function toggleDesktopSidebar() {
  const sidebar = document.getElementById("sidebar");
  const collapsed = sidebar.classList.toggle("collapsed");
  localStorage.setItem("pcw_sidebar_collapsed", collapsed ? "1" : "0");
}
function openMobileMenu() {
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("sidebar-overlay").classList.add("open");
}
function closeMobileMenu() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebar-overlay").classList.remove("open");
}
function wrapTablesForScroll() {
  document.querySelectorAll("table.data").forEach(t => {
    if (t.parentElement && t.parentElement.classList.contains("table-scroll")) return;
    const wrap = document.createElement("div");
    wrap.className = "table-scroll";
    t.parentNode.insertBefore(wrap, t);
    wrap.appendChild(t);
  });
}
function initSwipeGestures() {
  let startX = null, startY = null, tracking = false;
  document.addEventListener("touchstart", (e) => {
    if (window.innerWidth > 820 || e.touches.length !== 1) return;
    const t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    const isOpen = document.getElementById("sidebar").classList.contains("open");
    tracking = isOpen || startX < 24;
  }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    if (!tracking || startX === null || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - startX, dy = t.clientY - startY;
    if (Math.abs(dy) > Math.abs(dx)) return;
    const isOpen = document.getElementById("sidebar").classList.contains("open");
    if (!isOpen && dx > 60) { openMobileMenu(); tracking = false; }
    else if (isOpen && dx < -60) { closeMobileMenu(); tracking = false; }
  }, { passive: true });
  document.addEventListener("touchend", () => { startX = null; startY = null; tracking = false; });
}

// ========================================================================
//  RECHERCHE GLOBALE
// ========================================================================
// ========================================================================
//  NOTIFICATIONS (rappels et échéances)
// ========================================================================
function computeNotifications() {
  const today = todayStr();
  const items = [];

  cache.factures.filter(f => f.statut === "En retard").forEach(f => {
    items.push({ id: "facture-retard-" + f.id + "-" + (f.date_echeance || ""), urgent: true, color: "var(--danger)", icon: "icon-receipt", date: f.date_echeance || "",
      label: "Facture en retard : " + (f.numero || ""),
      sub: contactLabel(findContact(f.contact_id)) + (f.date_echeance ? " · échue le " + fmtDateFR(f.date_echeance) : ""),
      fn: () => { showPage("factures"); setTimeout(() => openFactureDialog(f.id), 150); } });
  });
  cache.factures.filter(f => f.statut === "Envoyée" && f.date_echeance && f.date_echeance >= today && f.date_echeance <= addDaysISO(today, 3)).forEach(f => {
    items.push({ id: "facture-bientot-" + f.id + "-" + f.date_echeance, urgent: f.date_echeance === today, color: "var(--warning)", icon: "icon-receipt", date: f.date_echeance,
      label: "Facture bientôt échue : " + (f.numero || ""),
      sub: contactLabel(findContact(f.contact_id)) + " · échéance le " + fmtDateFR(f.date_echeance),
      fn: () => { showPage("factures"); setTimeout(() => openFactureDialog(f.id), 150); } });
  });
  cache.devis.filter(d => ["En attente", "Envoyé"].includes(d.statut)).forEach(d => {
    const val = d.date_validite || (d.date_creation ? addDaysISO(d.date_creation.slice(0, 10), 30) : null);
    if (val && val >= today && val <= addDaysISO(today, 5)) {
      items.push({ id: "devis-expire-" + d.id + "-" + val, urgent: val <= addDaysISO(today, 1), color: "var(--info)", icon: "icon-file-text", date: val,
        label: "Devis bientôt expiré : " + (d.numero || ""),
        sub: contactLabel(devisContact(d)) + " · valable jusqu'au " + fmtDateFR(val),
        fn: () => { showPage("devis"); setTimeout(() => openDevisEditor(d.id), 150); } });
    }
  });
  cache.todos.filter(t => t.statut !== "Terminé" && t.date_echeance).forEach(t => {
    if (t.date_echeance < today) {
      items.push({ id: "todo-retard-" + t.id + "-" + t.date_echeance, urgent: true, color: "var(--danger)", icon: "icon-check-square", date: t.date_echeance,
        label: "Tâche en retard : " + t.titre, sub: "Échéance dépassée le " + fmtDateFR(t.date_echeance),
        fn: () => { showPage("todo"); setTimeout(() => openTodoDialog(t.id), 150); } });
    } else if (t.date_echeance === today) {
      items.push({ id: "todo-jour-" + t.id + "-" + t.date_echeance, urgent: true, color: "var(--warning)", icon: "icon-check-square", date: t.date_echeance,
        label: "Tâche à faire aujourd'hui : " + t.titre, sub: todoLieALabel(t),
        fn: () => { showPage("todo"); setTimeout(() => openTodoDialog(t.id), 150); } });
    }
  });
  cache.rdv.filter(r => r.statut !== "Annulé" && r.date_rdv && r.date_rdv >= today && r.date_rdv <= addDaysISO(today, 1)).forEach(r => {
    const isToday = r.date_rdv === today;
    items.push({ id: "rdv-" + r.id + "-" + r.date_rdv, urgent: isToday, color: "var(--tertiary)", icon: "icon-clock", date: r.date_rdv,
      label: (isToday ? "RDV aujourd'hui" : "RDV demain") + (r.objet ? " : " + r.objet : ""),
      sub: contactLabel(findContact(r.contact_id)) + (r.heure ? " · " + r.heure : ""),
      fn: () => { showPage("rdv"); setTimeout(() => openRdvDialog(r.id), 150); } });
  });
  cache.evenements.filter(e => e.facturation_recurrente && e.prochaine_facturation && e.prochaine_facturation <= addDaysISO(today, 7)).forEach(e => {
    items.push({ id: "recurrent-" + e.id + "-" + e.prochaine_facturation, urgent: e.prochaine_facturation <= today, color: "var(--success)", icon: "icon-repeat", date: e.prochaine_facturation,
      label: "Facturation récurrente à renouveler : " + eventLabel(e),
      sub: "Échéance le " + fmtDateFR(e.prochaine_facturation),
      fn: () => { showPage("dashboard"); } });
  });

  const dismissed = getDismissedNotifs();
  const filtered = items.filter(it => !dismissed.includes(it.id));
  filtered.sort((a, b) => (b.urgent - a.urgent) || (a.date || "9999").localeCompare(b.date || "9999"));
  return filtered;
}
function updateNotifBadge() {
  const badge = document.getElementById("notif-badge");
  if (!badge) return;
  const items = computeNotifications();
  const urgentCount = items.filter(i => i.urgent).length;
  const count = urgentCount || items.length;
  if (count > 0) { badge.style.display = "flex"; badge.textContent = count > 99 ? "99+" : count; }
  else { badge.style.display = "none"; }
}
const DISMISSED_NOTIFS_KEY = "pcw_dismissed_notifs";
function getDismissedNotifs() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_NOTIFS_KEY)) || []; } catch (e) { return []; }
}
function dismissNotif(id) {
  const list = getDismissedNotifs();
  if (!list.includes(id)) { list.push(id); localStorage.setItem(DISMISSED_NOTIFS_KEY, JSON.stringify(list)); }
}
function clearAllNotifs() {
  const ids = computeNotifications().map(it => it.id);
  const list = getDismissedNotifs();
  ids.forEach(id => { if (!list.includes(id)) list.push(id); });
  localStorage.setItem(DISMISSED_NOTIFS_KEY, JSON.stringify(list));
  updateNotifBadge();
  renderNotifPanelContent();
}
function renderNotifPanelContent() {
  const panel = document.getElementById("notif-panel");
  const items = computeNotifications();
  panel.innerHTML = `<div class="notif-panel-header" style="display:flex;justify-content:space-between;align-items:center;">
      <span>Notifications${items.length ? " (" + items.length + ")" : ""}</span>
      ${items.length ? `<a href="#" id="notif-clear-all" style="font-weight:600;color:var(--accent);text-transform:none;letter-spacing:0;font-size:11.5px;">Tout effacer</a>` : ""}
    </div>` +
    (items.length ? items.map((it, i) => `
      <div class="notif-item" data-i="${i}">
        <div class="ni-icon" style="background:${it.color};"><svg><use href="#${it.icon}"></use></svg></div>
        <div style="flex:1;min-width:0;"><div class="ni-label">${it.label}</div><div class="ni-sub">${it.sub || ""}</div></div>
        <button class="notif-dismiss" data-dismiss-i="${i}" title="Supprimer cette notification">✕</button>
      </div>`).join("") : `<div class="notif-empty">Rien à signaler pour l'instant 👍</div>`);
  panel.querySelectorAll(".notif-item").forEach(el => el.addEventListener("click", (e) => {
    if (e.target.closest(".notif-dismiss")) return;
    items[Number(el.dataset.i)].fn();
    panel.classList.remove("open");
  }));
  panel.querySelectorAll(".notif-dismiss").forEach(btn => btn.addEventListener("click", (e) => {
    e.stopPropagation();
    dismissNotif(items[Number(btn.dataset.dismissI)].id);
    updateNotifBadge();
    renderNotifPanelContent();
  }));
  const clearAll = document.getElementById("notif-clear-all");
  if (clearAll) clearAll.addEventListener("click", (e) => { e.preventDefault(); clearAllNotifs(); });
}
function toggleNotifPanel() {
  const panel = document.getElementById("notif-panel");
  const isOpen = panel.classList.contains("open");
  if (isOpen) { panel.classList.remove("open"); return; }
  renderNotifPanelContent();
  panel.classList.add("open");
}

function runGlobalSearch(qRaw) {
  const box = document.getElementById("global-search-results");
  const q = (qRaw || "").trim().toLowerCase();
  if (q.length < 2) { box.classList.remove("open"); box.innerHTML = ""; return; }
  const results = [];
  cache.contacts.forEach(c => {
    const hay = [c.nom, c.prenom, c.societe, c.email, c.telephone].filter(Boolean).join(" ").toLowerCase();
    if (hay.includes(q)) results.push({ type: "Contact", label: contactLabel(c), sub: c.email || c.telephone || "", fn: () => { showPage("contacts"); setTimeout(() => openContactDialog(c.id), 150); } });
  });
  cache.evenements.forEach(e => {
    const hay = [e.titre, e.type_evenement, contactLabel(findContact(e.contact_id))].filter(Boolean).join(" ").toLowerCase();
    if (hay.includes(q)) results.push({ type: "Projet", label: eventLabel(e), sub: e.type_evenement || "", fn: () => { showPage("evenements"); setTimeout(() => openEvenementDialog(e.id), 150); } });
  });
  cache.devis.forEach(d => {
    const hay = [d.numero, contactLabel(devisContact(d))].filter(Boolean).join(" ").toLowerCase();
    if (hay.includes(q)) results.push({ type: "Devis", label: (d.numero || "Devis") + " — " + contactLabel(devisContact(d)), sub: d.statut || "", fn: () => { showPage("devis"); setTimeout(() => openDevisEditor(d.id), 150); } });
  });
  cache.factures.forEach(f => {
    const hay = [f.numero, contactLabel(findContact(f.contact_id))].filter(Boolean).join(" ").toLowerCase();
    if (hay.includes(q)) results.push({ type: "Facture", label: (f.numero || "Facture") + " — " + contactLabel(findContact(f.contact_id)), sub: f.statut || "", fn: () => { showPage("factures"); setTimeout(() => openFactureDialog(f.id), 150); } });
  });
  box.classList.add("open");
  if (!results.length) { box.innerHTML = `<div class="gsr-empty">Aucun résultat pour « ${qRaw} »</div>`; return; }
  box.innerHTML = results.slice(0, 15).map((r, i) => `
    <div class="gsr-item" data-i="${i}">
      <span>${r.label}${r.sub ? `<br><span style="color:var(--muted);font-size:11.5px;">${r.sub}</span>` : ""}</span>
      <span class="gsr-type">${r.type}</span>
    </div>`).join("");
  box.querySelectorAll(".gsr-item").forEach(el => el.addEventListener("click", () => {
    results[Number(el.dataset.i)].fn();
    document.getElementById("global-search-input").value = "";
    box.classList.remove("open");
  }));
}
function renderPage(key) {
  updateNotifBadge();
  if (key === "dashboard") renderDashboard();
  else if (key === "todo") renderTodo();
  else if (key === "prospects") renderSuivi();
  else if (key === "contacts") renderContacts();
  else if (key === "devis") renderDevis();
  else if (key === "factures") renderFactures();
  else if (key === "evenements") renderEvenements();
  else if (key === "rdv") renderRdv();
  else if (key === "calendrier") renderCalendrier();
  else if (key === "relances") renderRelances();
  else if (key === "tarification") renderGrille();
  else if (key === "temps") renderTemps();
  else if (key === "stats") renderStats();
  else if (key === "demandes") renderDemandes();
  else if (key === "messages") renderMessages();
  else if (key === "fichiers") renderFichiersClients();
  else if (key === "paiements") renderPaiements();
}
function advanceDateBy(dateStr, freq) {
  const d = new Date(dateStr);
  if (freq === "Annuelle") d.setFullYear(d.getFullYear() + 1); else d.setMonth(d.getMonth() + 1);
  return isoOf(d);
}
function createRecurringInvoiceFor(evenementId) {
  const e = findEvenement(evenementId); if (!e) return;
  openModal({
    title: "Nouvelle facture récurrente — " + eventLabel(e),
    table: "factures", id: null,
    fields: factureFields({ contact_id: e.contact_id, type_evenement: e.type_evenement, montant_ttc: e.montant_recurrent, date_facture: todayStr() }),
    onRender: factureOnRender,
    onSaved: async () => {
      const next = advanceDateBy(e.prochaine_facturation || todayStr(), e.frequence_facturation);
      await updateRow("evenements", e.id, { prochaine_facturation: next });
      await refreshAll();
      showToast("Facture créée · prochaine échéance : " + fmtDateFR(next));
    },
  });
}
async function refreshAll() { await refreshCache(); renderPage(currentPage); }

// ========================================================================
//  STATISTIQUES
// ========================================================================
function renderStats() {
  const devisEmis = cache.devis.filter(d => d.statut !== "En attente");
  const devisAcceptes = cache.devis.filter(d => d.statut === "Accepté");
  const tauxConversion = devisEmis.length ? round2((devisAcceptes.length / devisEmis.length) * 100) : 0;
  const panierMoyen = devisAcceptes.length ? round2(devisAcceptes.reduce((s, d) => s + Number(d.montant_ttc || 0), 0) / devisAcceptes.length) : 0;
  const facturesPayees = cache.factures.filter(f => f.statut === "Payée");
  const caTotal = round2(facturesPayees.reduce((s, f) => s + Number(f.montant_ttc || 0), 0));
  const enCours = cache.evenements.filter(e => !["Livré", "Annulé"].includes(e.statut)).length;

  document.getElementById("stats-cards").innerHTML = `
    <div class="stat-card"><div class="stat-icon-wrap" style="background:var(--success);color:#fff;"><svg><use href="#icon-target"></use></svg></div><div class="num">${tauxConversion}%</div><div class="label">Taux de conversion devis → accepté</div></div>
    <div class="stat-card"><div class="stat-icon-wrap" style="background:var(--accent);color:#fff;"><svg><use href="#icon-file-text"></use></svg></div><div class="num">${panierMoyen} €</div><div class="label">Panier moyen (devis acceptés)</div></div>
    <div class="stat-card"><div class="stat-icon-wrap" style="background:var(--warning);color:#fff;"><svg><use href="#icon-receipt"></use></svg></div><div class="num">${caTotal} €</div><div class="label">CA total encaissé (payé)</div></div>
    <div class="stat-card"><div class="stat-icon-wrap" style="background:var(--tertiary);color:#fff;"><svg><use href="#icon-folder"></use></svg></div><div class="num">${enCours}</div><div class="label">Projets en cours</div></div>`;

  // Répartition par type de projet
  const byType = {};
  facturesPayees.forEach(f => {
    const type = f.type_evenement || "Non renseigné";
    if (!byType[type]) byType[type] = { ca: 0, n: 0 };
    byType[type].ca += Number(f.montant_ttc || 0);
    byType[type].n += 1;
  });
  const typeRows = Object.entries(byType).sort((a, b) => b[1].ca - a[1].ca);
  document.getElementById("stats-types-tbody").innerHTML = typeRows.length ? typeRows.map(([type, v]) => `<tr><td>${type}</td><td><strong>${round2(v.ca)} €</strong></td><td>${v.n}</td></tr>`).join("") : `<tr class="empty-row"><td colspan="3">Aucune facture payée pour l'instant</td></tr>`;

  // Top 5 clients
  const byClient = {};
  facturesPayees.forEach(f => {
    const key = f.contact_id || "?";
    if (!byClient[key]) byClient[key] = { ca: 0, n: 0, contact_id: f.contact_id };
    byClient[key].ca += Number(f.montant_ttc || 0);
    byClient[key].n += 1;
  });
  const clientRows = Object.values(byClient).sort((a, b) => b.ca - a.ca).slice(0, 5);
  document.getElementById("stats-clients-tbody").innerHTML = clientRows.length ? clientRows.map(v => `<tr><td>${contactLabel(findContact(v.contact_id))}</td><td><strong>${round2(v.ca)} €</strong></td><td>${v.n}</td></tr>`).join("") : `<tr class="empty-row"><td colspan="3">Aucune facture payée pour l'instant</td></tr>`;
}
function goToFilter(page, selectId, value) {
  showPage(page);
  const sel = document.getElementById(selectId);
  if (sel) { sel.value = value; renderPage(page); }
}

// ========================================================================
//  DASHBOARD
// ========================================================================
function effectivePriorite(t) {
  if (t.statut !== "Terminé" && t.date_echeance && daysUntil(t.date_echeance) <= 7) return "Urgente";
  return t.priorite || "Normale";
}
function todoLieALabel(t) {
  if (t.evenement_id) { const e = findEvenement(t.evenement_id); return e ? "📁 " + (eventLabel(e)) : "—"; }
  if (t.contact_id) { const c = findContact(t.contact_id); return c ? "👤 " + contactLabel(c) : "—"; }
  return t.categorie || "—";
}
function eventLabel(e) {
  if (e.titre) return e.titre;
  const c = findContact(e.contact_id);
  const d = e.date_flexible ? fmtMoisFR(e.mois_seul) : fmtDateFR(e.date_fin);
  return [d, contactLabel(c)].filter(x => x && x !== "—").join(" · ") || (e.type_evenement || "Projet");
}

function firstNameFromEmail(email) {
  if (!email) return "";
  const local = email.split("@")[0] || "";
  const first = local.split(/[.\-_0-9]+/).filter(Boolean)[0] || local;
  return first.charAt(0).toUpperCase() + first.slice(1);
}
function renderDashboardGreeting() {
  const h = new Date().getHours();
  const salut = h < 6 ? "Bonsoir" : h < 18 ? "Bonjour" : "Bonsoir";
  const name = currentUser ? firstNameFromEmail(currentUser.email) : "";
  document.getElementById("dash-greeting").textContent = `${salut}${name ? " " + name : ""} !`;
  const dateStr = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  document.getElementById("dash-greeting-sub").textContent = dateStr;
}
let dashChartView = "mois";
function mondayOf(d) {
  const dt = new Date(d); const day = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - day); dt.setHours(0, 0, 0, 0);
  return dt;
}
function isoOf(d) { return d.toISOString().slice(0, 10); }
function fmtEuroCompact(n) {
  const v = Math.round(n);
  if (Math.abs(v) >= 1000) return (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1).replace(".", ",") + "k€";
  return v + "€";
}
function computeCABuckets(view) {
  const now = new Date();
  const buckets = [];
  if (view === "semaine") {
    for (let i = 7; i >= 0; i--) {
      const from = mondayOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7));
      const to = new Date(from); to.setDate(to.getDate() + 6);
      buckets.push({ from, to, label: String(from.getDate()).padStart(2, "0") + "/" + String(from.getMonth() + 1).padStart(2, "0") });
    }
  } else if (view === "annee") {
    for (let i = 4; i >= 0; i--) {
      const y = now.getFullYear() - i;
      buckets.push({ from: new Date(y, 0, 1), to: new Date(y, 11, 31), label: String(y) });
    }
  } else { // mois
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      buckets.push({ from: d, to, label: MOIS_FR[d.getMonth()].slice(0, 3) + " " + String(d.getFullYear()).slice(2) });
    }
  }
  const paid = cache.factures.filter(f => f.statut === "Payée" && f.date_facture);
  const values = buckets.map(b => {
    const from = isoOf(b.from), to = isoOf(b.to);
    return round2(paid.filter(f => f.date_facture >= from && f.date_facture <= to).reduce((s, f) => s + Number(f.montant_ttc || 0), 0));
  });
  return { labels: buckets.map(b => b.label), values };
}
function bindDashChartTabs() {
  const wrap = document.getElementById("dash-chart-tabs");
  if (!wrap || wrap.dataset.bound) return;
  wrap.dataset.bound = "1";
  wrap.querySelectorAll(".cat-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      dashChartView = btn.dataset.view;
      wrap.querySelectorAll(".cat-tab").forEach(b => b.classList.toggle("active", b === btn));
      renderDashboardChart();
    });
  });
}
function renderDashboardChart() {
  bindDashChartTabs();
  const { labels, values } = computeCABuckets(dashChartView);
  const max = Math.max(1, ...values);
  const wrap = document.getElementById("dash-chart");
  const gridStyle = `grid-template-columns:repeat(${labels.length},1fr);`;
  const valsRow = values.map(v => `<div>${v ? fmtEuroCompact(v) : ""}</div>`).join("");
  const barsRow = values.map(v => `<div class="bar" style="height:${Math.round((v / max) * 54) + 4}px;"></div>`).join("");
  const lblsRow = labels.map(l => `<div>${l}</div>`).join("");
  wrap.innerHTML =
    `<div class="mc-row mc-vals" style="${gridStyle}">${valsRow}</div>` +
    `<div class="mc-row mc-bars-row" style="${gridStyle}">${barsRow}</div>` +
    `<div class="mc-row mc-lbls" style="${gridStyle}">${lblsRow}</div>`;
  const total = round2(values.reduce((s, v) => s + v, 0));
  document.getElementById("dash-chart-total").textContent = `Total sur la période affichée : ${total.toFixed(2)} € — calculé sur les factures au statut « Payée ».`;
}
function renderDashboard() {
  renderDashboardGreeting();
  const today = todayStr();
  const prospectsActifs = cache.contacts.filter(c => c.categorie === "Prospect").length;
  const devisEnAttente = cache.devis.filter(d => d.statut === "En attente").length;
  const facturesImpayees = cache.factures.filter(f => ["Envoyée", "En retard"].includes(f.statut)).length;
  const rdvAvenir = cache.rdv.filter(r => (r.date_rdv || "") >= today && r.statut !== "Annulé").length;
  const evenementsAvenir = cache.evenements.filter(e => (e.date_fin || "") >= today).length;
  const todosOuvertes = cache.todos.filter(t => t.statut !== "Terminé").length;

  const cards = [
    ["icon-target", "var(--accent)", prospectsActifs, "Prospects actifs", () => goToFilter("contacts", "contact-filter-categorie", "Prospect")],
    ["icon-file-text", "var(--info)", devisEnAttente, "Devis en attente", () => goToFilter("devis", "devis-filter-statut", "En attente")],
    ["icon-receipt", "var(--warning)", facturesImpayees, "Factures impayées", () => goToFilter("factures", "facture-filter-statut", "Envoyée")],
    ["icon-clock", "var(--tertiary)", rdvAvenir, "RDV à venir", () => showPage("rdv")],
    ["icon-folder", "var(--success)", evenementsAvenir, "Projets à venir", () => showPage("evenements")],
    ["icon-check-square", "var(--accent-dark)", todosOuvertes, "Tâches en cours", () => showPage("todo")],
  ];
  const wrap = document.getElementById("dash-cards");
  wrap.innerHTML = cards.map((c, i) => `
    <div class="stat-card clickable" data-i="${i}">
      <div class="stat-icon-wrap" style="background:${c[1]};color:#fff;"><svg><use href="#${c[0]}"></use></svg></div>
      <div class="num">${c[2]}</div>
      <div class="label">${c[3]}</div>
    </div>`).join("");
  wrap.querySelectorAll(".stat-card").forEach(el => el.addEventListener("click", () => cards[Number(el.dataset.i)][4]()));
  renderDashboardChart();

  const recurring = cache.evenements.filter(e => e.facturation_recurrente && e.prochaine_facturation && e.prochaine_facturation <= addDaysISO(today, 7));
  const recPanel = document.getElementById("dash-recurring-panel");
  if (recurring.length) {
    recPanel.style.display = "block";
    document.getElementById("dash-recurring-tbody").innerHTML = recurring.sort((a, b) => (a.prochaine_facturation || "").localeCompare(b.prochaine_facturation || "")).map(e => `
      <tr>
        <td>${eventLabel(e)}</td>
        <td>${contactLabel(findContact(e.contact_id))}</td>
        <td class="${e.prochaine_facturation <= today ? "due-today" : ""}">${fmtDateFR(e.prochaine_facturation)}</td>
        <td>${e.montant_recurrent ? e.montant_recurrent + " €" : "—"}</td>
        <td><button class="btn secondary" style="padding:5px 10px;font-size:11.5px;" onclick="createRecurringInvoiceFor(${e.id})">＋ Créer la facture</button></td>
      </tr>`).join("");
  } else { recPanel.style.display = "none"; }

  // Aperçu des tâches (échéance du jour en rouge)
  const todos = cache.todos.filter(t => t.statut !== "Terminé")
    .sort((a, b) => (a.date_echeance || "9999").localeCompare(b.date_echeance || "9999")).slice(0, 8);
  document.getElementById("dash-todos").innerHTML = todos.length ? todos.map(t => {
    const p = effectivePriorite(t);
    const echClass = t.date_echeance && daysUntil(t.date_echeance) <= 0 ? "due-today" : "";
    return `<tr onclick="openTodoDialog(${t.id})" style="cursor:pointer;">
      <td>${t.titre}</td><td>${todoLieALabel(t)}</td>
      <td>${badge(p, STATUT_COLORS[p])}</td>
      <td class="${echClass}">${fmtDateFR(t.date_echeance) || "—"}</td>
      <td>${statusSelectInline("todos", t.id, t.statut, STATUTS_TODO, STATUT_COLORS)}</td></tr>`;
  }).join("") : `<tr class="empty-row"><td colspan="5">Aucune tâche en cours</td></tr>`;

  // À venir : RDV + projets + tâches + devis + factures + abonnements, triés par date
  // (uniquement les échéances dans le mois qui vient — au-delà, ça n'a plus sa place ici)
  const dans1Mois = addDaysISO(today, 30);
  const items = [];
  cache.rdv.filter(r => (r.date_rdv || "") >= today && r.date_rdv <= dans1Mois && r.statut !== "Annulé")
    .forEach(r => items.push({ date: r.date_rdv, type: "RDV", detail: (r.heure ? r.heure + " · " : "") + (r.objet || "") + " — " + contactLabel(findContact(r.contact_id)), statut: r.statut, editTable: "rdv", editId: r.id, editField: "statut", editOptions: STATUTS_RDV, fn: `openRdvDialog(${r.id})` }));
  cache.evenements.filter(e => (e.date_fin || "") >= today && e.date_fin <= dans1Mois)
    .forEach(e => items.push({ date: e.date_fin, type: "Projet", detail: eventLabel(e), statut: e.statut, editTable: "evenements", editId: e.id, editField: "statut", editOptions: STATUTS_EVENEMENT, fn: `openEvenementDialog(${e.id})` }));
  cache.todos.filter(t => t.statut !== "Terminé" && t.date_echeance && t.date_echeance >= today && t.date_echeance <= dans1Mois)
    .forEach(t => items.push({ date: t.date_echeance, type: "Tâche", detail: t.titre, statut: t.statut, editTable: "todos", editId: t.id, editField: "statut", editOptions: STATUTS_TODO, fn: `openTodoDialog(${t.id})` }));
  cache.devis.filter(d => ["En attente", "Envoyé"].includes(d.statut)).forEach(d => {
    const val = d.date_validite || (d.date_creation ? addDaysISO(d.date_creation.slice(0, 10), 30) : null);
    if (val && val >= today && val <= dans1Mois) items.push({ date: val, type: "Devis", detail: "Expire : " + (d.numero || "—") + " — " + contactLabel(devisContact(d)), statut: d.statut, editTable: "devis", editId: d.id, editField: "statut", editOptions: STATUTS_DEVIS, fn: `openDevisEditor(${d.id})` });
  });
  cache.factures.filter(f => f.date_echeance && f.date_echeance >= today && f.date_echeance <= dans1Mois && !["Payée", "Annulée"].includes(f.statut))
    .forEach(f => items.push({ date: f.date_echeance, type: "Facture", detail: (f.numero || "—") + " à régler — " + contactLabel(findContact(f.contact_id)), statut: f.statut, editTable: "factures", editId: f.id, editField: "statut", editOptions: STATUTS_FACTURE, fn: `openFactureDialog(${f.id})` }));
  items.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const top = items.slice(0, 15);
  document.getElementById("dash-dates").innerHTML = top.length ? top.map(it => {
    const cls = daysUntil(it.date) <= 0 ? "due-today" : "";
    return `<tr onclick="${it.fn}" style="cursor:pointer;">
      <td class="${cls}">${fmtDateFR(it.date)}</td><td>${it.type}</td><td>${it.detail}</td>
      <td>${statusSelectInline(it.editTable, it.editId, it.statut, it.editOptions, STATUT_COLORS, it.editField)}</td></tr>`;
  }).join("") : `<tr class="empty-row"><td colspan="4">Rien à venir</td></tr>`;
}

// ========================================================================
//  FILTRES
// ========================================================================
function ensureFilterOptions(selectId, options) {
  const sel = document.getElementById(selectId);
  if (!sel || sel.dataset.filled) return;
  options.forEach(o => {
    const opt = document.createElement("option");
    opt.value = o.value !== undefined ? o.value : o;
    opt.textContent = o.label !== undefined ? o.label : o;
    sel.appendChild(opt);
  });
  sel.dataset.filled = "1";
  sel.addEventListener("change", () => renderPage(currentPage));
}
function bindSearch(id, fn) {
  const el = document.getElementById(id);
  if (el && !el.dataset.bound) { el.addEventListener("input", fn); el.dataset.bound = "1"; }
}

// ========================================================================
//  TODO
// ========================================================================
function contactOptionsHtml(selectedId) {
  return cache.contacts.map(c => `<option value="${c.id}" ${c.id === selectedId ? "selected" : ""}>${contactLabel(c)}</option>`).join("");
}
function devisOptionsHtml(selectedId) {
  return cache.devis.map(d => `<option value="${d.id}" ${d.id === selectedId ? "selected" : ""}>${d.numero || ("Devis #" + d.id)}</option>`).join("");
}
function evenementOptionsHtml(selectedId) {
  return cache.evenements.map(e => `<option value="${e.id}" ${e.id === selectedId ? "selected" : ""}>${eventLabel(e)}</option>`).join("");
}
function factureOptionsHtml(selectedId) {
  return cache.factures.map(f => `<option value="${f.id}" ${f.id === selectedId ? "selected" : ""}>${f.numero || ("Facture #" + f.id)}</option>`).join("");
}

function renderTodo() {
  ensureFilterOptions("todo-filter-statut", STATUTS_TODO);
  ensureFilterOptions("todo-filter-priorite", PRIORITES);
  const sortSel = document.getElementById("todo-sort");
  if (!sortSel.dataset.bound) { sortSel.addEventListener("change", renderTodo); sortSel.dataset.bound = "1"; }
  const fStatut = document.getElementById("todo-filter-statut").value;
  const fPrio = document.getElementById("todo-filter-priorite").value;
  const sort = sortSel.value;

  let rows = [...cache.todos].filter(t => t.statut !== "Terminé");
  if (fStatut) rows = rows.filter(t => t.statut === fStatut);
  if (fPrio) rows = rows.filter(t => effectivePriorite(t) === fPrio);
  const prioRank = { "Urgente": 0, "Haute": 1, "Normale": 2, "Basse": 3 };
  const statutRank = { "À faire": 0, "En cours": 1, "Terminé": 2 };
  rows.sort((a, b) => {
    if (sort === "priorite") return prioRank[effectivePriorite(a)] - prioRank[effectivePriorite(b)];
    if (sort === "statut") return (statutRank[a.statut] ?? 9) - (statutRank[b.statut] ?? 9);
    return (a.date_echeance || "9999").localeCompare(b.date_echeance || "9999");
  });

  const tbody = document.getElementById("todo-tbody");
  tbody.innerHTML = rows.length ? rows.map(t => {
    const p = effectivePriorite(t);
    const echClass = t.date_echeance && daysUntil(t.date_echeance) <= 0 && t.statut !== "Terminé" ? "due-today" : "";
    return `<tr>
      <td>${t.titre}</td>
      <td>${todoLieALabel(t)}</td>
      <td>${badge(p, STATUT_COLORS[p])}</td>
      <td class="${echClass}">${fmtDateFR(t.date_echeance) || "—"}</td>
      <td>${statusSelectInline("todos", t.id, t.statut, STATUTS_TODO, STATUT_COLORS)}</td>
      <td class="row-actions">
        <button onclick="openTodoDialog(${t.id})">✎</button>
        <button onclick="confirmDelete('todos', ${t.id}, renderTodo)">🗑</button>
      </td></tr>`;
  }).join("") : `<tr class="empty-row"><td colspan="6">Aucune tâche</td></tr>`;

  renderTodoTerminees();
  renderTodoRdvAvenir();
  renderTodoRdvPasses();
}
function renderTodoTerminees() {
  const tbody = document.getElementById("todo-terminees-tbody");
  if (!tbody) return;
  const rows = cache.todos.filter(t => t.statut === "Terminé")
    .sort((a, b) => (b.date_echeance || "").localeCompare(a.date_echeance || ""));
  tbody.innerHTML = rows.length ? rows.map(t => {
    const p = effectivePriorite(t);
    return `<tr>
      <td>${t.titre}</td>
      <td>${todoLieALabel(t)}</td>
      <td>${badge(p, STATUT_COLORS[p])}</td>
      <td>${fmtDateFR(t.date_echeance) || "—"}</td>
      <td>${statusSelectInline("todos", t.id, t.statut, STATUTS_TODO, STATUT_COLORS)}</td>
      <td class="row-actions">
        <button onclick="openTodoDialog(${t.id})">✎</button>
        <button onclick="confirmDelete('todos', ${t.id}, renderTodo)">🗑</button>
      </td></tr>`;
  }).join("") : `<tr class="empty-row"><td colspan="6">Aucune tâche terminée</td></tr>`;
}
function renderTodoRdvAvenir() {
  const tbody = document.getElementById("todo-rdv-avenir-tbody");
  if (!tbody) return;
  const today = todayStr();
  const rows = [...cache.rdv]
    .filter(r => r.date_rdv && r.date_rdv >= today && r.statut !== "Annulé")
    .sort((a, b) => (a.date_rdv || "").localeCompare(b.date_rdv || "") || (a.heure || "").localeCompare(b.heure || ""));
  tbody.innerHTML = rows.length ? rows.map(r => `
    <tr>
      <td>${fmtDateFR(r.date_rdv)}</td>
      <td>${r.heure || "—"}</td>
      <td>${r.objet || "—"}</td>
      <td>${contactLabel(findContact(r.contact_id))}</td>
      <td>${statusSelectInline("rdv", r.id, r.statut, STATUTS_RDV, STATUT_COLORS)}</td>
      <td class="row-actions">
        <button onclick="openRdvDialog(${r.id})">✎</button>
        <button onclick="deleteRdvWithGoogleSync(${r.id}, renderTodo)">🗑</button>
      </td>
    </tr>`).join("") : `<tr class="empty-row"><td colspan="6">Aucun RDV à venir</td></tr>`;
}
function renderTodoRdvPasses() {
  const tbody = document.getElementById("todo-rdv-passes-tbody");
  if (!tbody) return;
  const today = todayStr();
  const rows = [...cache.rdv]
    .filter(r => r.date_rdv && (r.date_rdv < today || r.statut === "Annulé"))
    .sort((a, b) => (b.date_rdv || "").localeCompare(a.date_rdv || "") || (b.heure || "").localeCompare(a.heure || ""));
  tbody.innerHTML = rows.length ? rows.map(r => `
    <tr>
      <td>${fmtDateFR(r.date_rdv)}</td>
      <td>${r.heure || "—"}</td>
      <td>${r.objet || "—"}</td>
      <td>${contactLabel(findContact(r.contact_id))}</td>
      <td>${statusSelectInline("rdv", r.id, r.statut, STATUTS_RDV, STATUT_COLORS)}</td>
      <td class="row-actions">
        <button onclick="openRdvDialog(${r.id})">✎</button>
        <button onclick="deleteRdvWithGoogleSync(${r.id}, renderTodo)">🗑</button>
      </td>
    </tr>`).join("") : `<tr class="empty-row"><td colspan="6">Aucun RDV passé</td></tr>`;
}

function openTodoDialog(id) {
  const row = id ? cache.todos.find(t => t.id === id) : {};
  openModal({
    title: id ? "Modifier la tâche" : "Nouvelle tâche",
    table: "todos", id,
    fields: [
      { key: "titre", label: "Titre", type: "text", required: true, value: row.titre },
      { key: "description", label: "Description", type: "textarea", value: row.description },
      { key: "evenement_id", label: "Lié à un projet", type: "select-raw", optionsHtml: `<option value="">— Aucun —</option>` + evenementOptionsHtml(row.evenement_id), value: row.evenement_id, numeric: true },
      { key: "contact_id", label: "Ou lié à un contact", type: "select-raw", optionsHtml: `<option value="">— Aucun —</option>` + contactOptionsHtml(row.contact_id), value: row.contact_id, numeric: true },
      { key: "priorite", label: "Priorité", type: "select", options: PRIORITES, value: row.priorite || "Normale" },
      { key: "statut", label: "Statut", type: "select", options: STATUTS_TODO, value: row.statut || "À faire" },
      { key: "date_echeance", label: "Échéance", type: "date", value: row.date_echeance },
    ],
    onSaved: refreshAll,
  });
}

// ========================================================================
//  SUIVI CLIENTS  (une ligne par évènement/dossier)
// ========================================================================
let prospectView = "tableau";
function bindProspectViewTabs() {
  const wrap = document.getElementById("prospect-view-tabs");
  if (!wrap || wrap.dataset.bound) return;
  wrap.dataset.bound = "1";
  wrap.querySelectorAll(".cat-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      prospectView = btn.dataset.view;
      wrap.querySelectorAll(".cat-tab").forEach(b => b.classList.toggle("active", b === btn));
      document.getElementById("prospect-table-view").style.display = prospectView === "tableau" ? "table" : "none";
      document.getElementById("prospect-kanban-view").style.display = prospectView === "kanban" ? "flex" : "none";
      renderSuivi();
    });
  });
}
function renderKanban(rows) {
  const wrap = document.getElementById("prospect-kanban-view");
  wrap.innerHTML = STATUTS_EVENEMENT.map(statut => {
    const items = rows.filter(e => e.statut === statut);
    const cards = items.map(e => {
      const dev = cache.devis.find(d => d.evenement_id === e.id);
      const fac = cache.factures.find(f => (e.facture_id && f.id === e.facture_id) || (dev && f.devis_id === dev.id));
      return `<div class="kanban-card" draggable="true" data-id="${e.id}" onclick="openEventRecap(${e.id})">
        <div class="kc-title">${e.titre || eventLabel(e)}</div>
        <div class="kc-sub">${contactLabel(findContact(e.contact_id))}</div>
        <div class="kc-badges">${dev ? badgeSubtle(dev.statut, STATUT_COLORS[dev.statut]) : ""}${fac ? badgeSubtle(fac.statut, STATUT_COLORS[fac.statut]) : ""}</div>
      </div>`;
    }).join("");
    return `<div class="kanban-col" data-statut="${statut}">
      <h4>${statut} <span>${items.length}</span></h4>
      <div class="kanban-col-body">${cards}</div>
    </div>`;
  }).join("");

  wrap.querySelectorAll(".kanban-card").forEach(card => {
    card.addEventListener("dragstart", (e) => { card.classList.add("dragging"); e.dataTransfer.setData("text/plain", card.dataset.id); });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
    card.addEventListener("click", (e) => { if (card.classList.contains("dragging")) e.preventDefault(); });
  });
  wrap.querySelectorAll(".kanban-col").forEach(col => {
    col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("drag-over"); });
    col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
    col.addEventListener("drop", async (e) => {
      e.preventDefault(); col.classList.remove("drag-over");
      const id = Number(e.dataTransfer.getData("text/plain"));
      const newStatut = col.dataset.statut;
      const ev = findEvenement(id);
      if (ev && ev.statut !== newStatut) {
        await updateRow("evenements", id, { statut: newStatut });
        await refreshCache();
        showToast("Statut mis à jour : " + newStatut);
        renderSuivi();
      }
    });
  });
}
function renderSuivi() {
  ensureFilterOptions("prospect-filter-statut", STATUTS_EVENEMENT);
  bindProspectViewTabs();
  const filter = document.getElementById("prospect-filter-statut").value;
  let rows = [...cache.evenements].sort((a, b) => (a.date_fin || "9999").localeCompare(b.date_fin || "9999"));
  if (filter) rows = rows.filter(e => e.statut === filter);

  if (prospectView === "kanban") { renderKanban(rows); return; }

  const tbody = document.getElementById("prospect-tbody");
  tbody.innerHTML = rows.length ? rows.map(e => {
    const dev = cache.devis.find(d => d.evenement_id === e.id);
    const fac = cache.factures.find(f => (e.facture_id && f.id === e.facture_id) || (dev && f.devis_id === dev.id));
    const tache = cache.todos.find(t => t.evenement_id === e.id && t.statut !== "Terminé");
    const dateTxt = e.date_flexible ? (fmtMoisFR(e.mois_seul) + " (flex.)") : fmtDateFR(e.date_fin);
    return `<tr>
      <td><strong>${e.titre || "—"}</strong></td>
      <td>${contactLabel(findContact(e.contact_id))}</td>
      <td>${dateTxt || "—"}</td>
      <td>${e.derniere_action || "—"}</td>
      <td>${tache ? tache.titre : "—"}</td>
      <td class="row-actions"><button title="Fiche récap" onclick="openEventRecap(${e.id})">📋</button></td>
      <td>${statusSelectInlineSubtle("evenements", e.id, e.statut, STATUTS_EVENEMENT, STATUT_COLORS)}</td>
      <td>${dev ? statusSelectInlineSubtle("devis", dev.id, dev.statut, STATUTS_DEVIS, STATUT_COLORS) : "—"}</td>
      <td>${fac ? statusSelectInlineSubtle("factures", fac.id, fac.statut, STATUTS_FACTURE, STATUT_COLORS) : "—"}</td>
      <td class="row-actions"><button onclick="openEvenementDialog(${e.id})">✎</button></td>
    </tr>`;
  }).join("") : `<tr class="empty-row"><td colspan="10">Aucun dossier — crée un projet</td></tr>`;
}

function openEventRecap(id) {
  const e = findEvenement(id);
  if (!e) return;
  const c = findContact(e.contact_id);
  const dev = cache.devis.find(d => d.evenement_id === e.id);
  const fac = cache.factures.find(f => (e.facture_id && f.id === e.facture_id) || (dev && f.devis_id === dev.id));
  const taches = cache.todos.filter(t => t.evenement_id === e.id);
  const tempsList = cache.temps_passe.filter(t => t.evenement_id === e.id).sort((a, b) => (b.date_travail || "").localeCompare(a.date_travail || ""));
  const dateTxt = e.date_flexible ? fmtMoisFR(e.mois_seul) + " (flexible)" : fmtDateFR(e.date_fin);
  const line = (l, v) => `<tr><td style="color:var(--muted);width:42%;">${l}</td><td>${v || "—"}</td></tr>`;
  const html = `
    <table class="data" style="margin-bottom:16px;"><tbody>
      ${line("Nom du projet", e.titre)}
      ${line("Date", dateTxt)}
      ${line("Contact", contactLabel(c))}
      ${line("Téléphone", c && c.telephone)}
      ${line("Email", c && c.email)}
      ${line("Provenance", c && c.provenance)}
      ${line("Type de projet", e.type_evenement)}
      ${line("Options", e.options)}
      ${line("Formule", e.type_prestation)}
      ${line("Statut", e.statut)}
      ${line("Devis", dev ? (dev.numero + " · " + dev.statut) : "—")}
      ${line("Facture", fac ? (fac.numero + " · " + fac.statut) : "—")}
      ${line("Dernière action", e.derniere_action)}
      ${line("Prochain RDV", fmtDateFR(e.prochain_rdv))}
    </tbody></table>
    <h3 style="font-size:14px;margin:0 0 8px;">📝 Notes</h3>
    <div style="font-size:16px;line-height:1.5;white-space:pre-wrap;background:#FAFAF8;border:1px solid var(--border);border-radius:8px;padding:12px;min-height:50px;">${e.notes || "—"}</div>
    <h3 style="font-size:14px;margin:16px 0 8px;">✅ Tâches liées</h3>
    <table class="data" style="margin-bottom:16px;"><tbody>${taches.length ? taches.map(t => `<tr><td>${t.titre}</td><td>${statusSelectInlineSubtle("todos", t.id, t.statut, STATUTS_TODO, STATUT_COLORS)}</td></tr>`).join("") : `<tr class="empty-row"><td colspan="2">Aucune</td></tr>`}</tbody></table>
    <h3 style="font-size:14px;margin:0 0 8px;display:flex;justify-content:space-between;align-items:center;">⏱ Temps passé (${round2(tempsList.reduce((s, t) => s + Number(t.duree_heures || 0), 0))} h)
      <button class="btn secondary" style="padding:6px 10px;font-size:11.5px;" onclick="closeModal();openTempsDialog(null, ${e.id});">＋ Ajouter</button></h3>
    <table class="data"><tbody>${tempsList.length ? tempsList.map(t => `<tr><td>${fmtDateFR(t.date_travail)}</td><td>${t.duree_heures} h</td><td>${t.description || "—"}</td></tr>`).join("") : `<tr class="empty-row"><td colspan="3">Aucune saisie</td></tr>`}</tbody></table>`;
  showInfoModal(e.titre ? `Fiche récap — ${e.titre}` : "Fiche récap projet", html);
}

// ========================================================================
//  CONTACTS
// ========================================================================
let contactView = "tableau";
let showDuplicatesOnly = false;
function toggleDuplicatesFilter() {
  showDuplicatesOnly = !showDuplicatesOnly;
  const btn = document.getElementById("btn-show-duplicates");
  if (btn) btn.classList.toggle("active", showDuplicatesOnly);
  renderContacts();
}
function bindContactViewTabs() {
  const wrap = document.getElementById("contact-view-tabs");
  if (!wrap || wrap.dataset.bound) return;
  wrap.dataset.bound = "1";
  wrap.querySelectorAll(".cat-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      contactView = btn.dataset.view;
      wrap.querySelectorAll(".cat-tab").forEach(b => b.classList.toggle("active", b === btn));
      document.getElementById("contact-table-view").style.display = contactView === "tableau" ? "table" : "none";
      document.getElementById("contact-kanban-view").style.display = contactView === "kanban" ? "flex" : "none";
      renderContacts();
    });
  });
}
function renderContactKanban(rows) {
  const wrap = document.getElementById("contact-kanban-view");
  wrap.innerHTML = CATEGORIES_CONTACT.map(cat => {
    const items = rows.filter(c => c.categorie === cat);
    const color = STATUT_COLORS[cat] || "var(--muted)";
    const cards = items.map(c => `<div class="kanban-card" draggable="true" data-id="${c.id}" onclick="openContactDialog(${c.id})" style="border-left:3px solid ${color};">
        <div class="kc-title">${contactLabel(c)}</div>
        <div class="kc-sub">${c.societe || c.email || c.telephone || ""}</div>
        ${c.provenance ? `<div class="kc-badges">${badgeSubtle(c.provenance, "var(--muted)")}</div>` : ""}
      </div>`).join("");
    return `<div class="kanban-col" data-cat="${cat}" style="border-top:3px solid ${color};">
      <h4><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px;"></span>${cat} <span>${items.length}</span></h4>
      <div class="kanban-col-body">${cards}</div>
    </div>`;
  }).join("");

  wrap.querySelectorAll(".kanban-card").forEach(card => {
    card.addEventListener("dragstart", (e) => { card.classList.add("dragging"); e.dataTransfer.setData("text/plain", card.dataset.id); });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
    card.addEventListener("click", (e) => { if (card.classList.contains("dragging")) e.preventDefault(); });
  });
  wrap.querySelectorAll(".kanban-col").forEach(col => {
    col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("drag-over"); });
    col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
    col.addEventListener("drop", async (e) => {
      e.preventDefault(); col.classList.remove("drag-over");
      const id = Number(e.dataTransfer.getData("text/plain"));
      const newCat = col.dataset.cat;
      const c = findContact(id);
      if (c && c.categorie !== newCat) {
        await updateRow("contacts", id, { categorie: newCat });
        await refreshCache();
        showToast("Catégorie mise à jour : " + newCat);
        renderContacts();
      }
    });
  });
}
function renderContacts() {
  ensureFilterOptions("contact-filter-categorie", CATEGORIES_CONTACT);
  bindSearch("contact-search", renderContacts);
  bindContactViewTabs();
  const search = (document.getElementById("contact-search").value || "").toLowerCase();
  const fCat = document.getElementById("contact-filter-categorie").value;
  let rows = [...cache.contacts];
  if (fCat) rows = rows.filter(c => c.categorie === fCat);
  if (search) rows = rows.filter(c => (contactLabel(c) + " " + (c.societe || "") + " " + (c.email || "")).toLowerCase().includes(search));
  if (showDuplicatesOnly) {
    const emailCounts = {};
    cache.contacts.forEach(c => { if (c.email) { const k = c.email.toLowerCase().trim(); emailCounts[k] = (emailCounts[k] || 0) + 1; } });
    rows = rows.filter(c => c.email && emailCounts[c.email.toLowerCase().trim()] > 1);
  }

  if (contactView === "kanban") { renderContactKanban(rows); return; }

  const tbody = document.getElementById("contact-tbody");
  tbody.innerHTML = rows.length ? rows.map(c => `
    <tr>
      <td>${contactLabel(c)}</td>
      <td>${statusSelectInline("contacts", c.id, c.categorie, CATEGORIES_CONTACT, STATUT_COLORS, "categorie")}</td>
      <td>${c.societe || "—"}${c.poste ? " · " + c.poste : ""}</td>
      <td>${c.email || "—"}</td>
      <td>${c.telephone || "—"}</td>
      <td>${c.provenance || "—"}</td>
      <td class="row-actions">
        <button title="Envoyer un email" onclick="openQuickEmailDialog(${c.id})"><svg class="nav-icon" style="width:14px;height:14px;vertical-align:-2px;"><use href="#icon-mail"></use></svg></button>
        <button title="Historique devis / factures" onclick="openContactHistory(${c.id})">📁</button>
        <button title="Fusionner avec un autre contact" onclick="openMergeContactDialog(${c.id})">🔀</button>
        <button onclick="openContactDialog(${c.id})">✎</button>
        <button onclick="confirmDelete('contacts', ${c.id}, renderContacts)">🗑</button>
      </td>
    </tr>`).join("") : `<tr class="empty-row"><td colspan="7">Aucun contact</td></tr>`;
}

function openQuickEmailDialog(id) {
  const c = findContact(id);
  if (!c) return;
  if (!c.email) { showToast("Impossible d'envoyer un email : aucune adresse renseignée sur ce contact"); return; }
  const prenom = contactLabel(c).split(" ")[0];
  const html = `
    <div class="field"><label>Destinataire</label><input type="text" value="${escapeAttr(c.email)}" disabled style="background:var(--surface-alt);color:var(--muted);"></div>
    <div class="field"><label>Objet</label><input type="text" id="qe-subject" placeholder="Objet de l'email"></div>
    <div class="field"><label>Message</label><textarea id="qe-body" rows="9">Bonjour ${prenom && prenom !== "—" ? prenom : ""},\n\n\n\nCordialement,\n${EMETTEUR.nom}</textarea></div>`;
  openRawModal("Envoyer un email à " + contactLabel(c), html, () => {
    const subject = document.getElementById("qe-subject").value || "";
    const body = document.getElementById("qe-body").value || "";
    window.location.href = `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    closeModal();
  });
  document.getElementById("modal-save").textContent = "Ouvrir dans la messagerie";
}
function openContactDialog(id) {
  const row = id ? cache.contacts.find(c => c.id === id) : {};
  openModal({
    title: id ? "Modifier le contact" : "Nouveau contact",
    table: "contacts", id,
    fields: [
      { key: "nom", label: "Nom", type: "text", value: row.nom },
      { key: "prenom", label: "Prénom", type: "text", value: row.prenom },
      { key: "categorie", label: "Catégorie de personne", type: "select-other", options: CATEGORIES_CONTACT, value: row.categorie || "Client", allowEmpty: false },
      { key: "societe", label: "Société / entreprise", type: "text", value: row.societe },
      { key: "poste", label: "Poste (si entreprise)", type: "text", value: row.poste },
      { key: "email", label: "Email", type: "text", value: row.email },
      { key: "telephone", label: "Téléphone", type: "text", value: row.telephone },
      { key: "adresse", label: "Adresse", type: "textarea", value: row.adresse },
      { key: "provenance", label: "Provenance", type: "select-other", options: PROVENANCES, value: row.provenance, allowEmpty: true },
      { key: "notes", label: "Notes", type: "textarea", value: row.notes },
    ],
    beforeSave: (values) => {
      if (!values.email) return true;
      const doublon = cache.contacts.find(c => c.id !== id && c.email && c.email.toLowerCase().trim() === values.email.toLowerCase().trim());
      if (doublon) {
        const continuer = confirm(
          `⚠️ Un contact existe déjà avec cet email : "${contactLabel(doublon)}" (${doublon.email}).\n\n` +
          `Créer un doublon risque de disperser ses devis/factures/projets sur deux fiches différentes, ` +
          `et peut empêcher son compte client de retrouver ses documents.\n\n` +
          `Continuer quand même ?`
        );
        if (!continuer) return false;
      }
      return true;
    },
    onSaved: refreshAll,
  });
}

// ========================================================================
//  FUSION DE CONTACTS EN DOUBLON
// ========================================================================
const CONTACT_FK_TABLES = ["evenements", "devis", "factures", "rdv", "demandes", "messages", "fichiers_clients", "prospects"];
function openMergeContactDialog(sourceId) {
  const source = findContact(sourceId);
  if (!source) return;
  const autres = cache.contacts.filter(c => c.id !== sourceId);
  if (!autres.length) { showToast("Aucun autre contact vers lequel fusionner"); return; }
  const html = `
    <div class="field">
      <label>Fusionner "${escapeAttr(contactLabel(source))}"${source.client_user_id ? " (a un compte client)" : ""} vers :</label>
      <select id="merge-target-select">
        ${autres.map(c => `<option value="${c.id}">${escapeAttr(contactLabel(c))}${c.email ? " — " + escapeAttr(c.email) : ""}${c.client_user_id ? " ⚡ a un compte client" : ""}</option>`).join("")}
      </select>
    </div>
    <div style="font-size:12.5px;color:var(--muted);margin-top:10px;">
      Tous les projets, devis, factures, RDV, demandes, messages et fichiers de "${escapeAttr(contactLabel(source))}"
      seront transférés vers le contact sélectionné, puis cette fiche sera supprimée. Cette action est irréversible.
      ${source.client_user_id ? "<br><br>⚡ Cette fiche a un compte client relié — s'il fusionne vers une fiche qui en a déjà un autre, tu seras prévenu(e) avant de valider." : ""}
    </div>`;
  openRawModal("Fusionner ce contact", html, async () => {
    const targetId = Number(document.getElementById("merge-target-select").value);
    if (!targetId) return;
    const target = findContact(targetId);

    // Sécurité : si la fiche source ET la fiche cible sont TOUTES LES DEUX reliées
    // à un compte client différent, on ne fusionne pas automatiquement — l'un des
    // deux liens serait perdu silencieusement. On demande confirmation explicite.
    if (source.client_user_id && target && target.client_user_id && target.client_user_id !== source.client_user_id) {
      const choix = confirm(
        `⚠️ Attention : "${contactLabel(source)}" ET "${contactLabel(target)}" ont chacun leur propre compte client relié.\n\n` +
        `Fusionner va GARDER le compte de "${contactLabel(target)}" et SUPPRIMER l'accès au compte de "${contactLabel(source)}" ` +
        `(son compte existera toujours mais ne sera plus relié à aucune fiche).\n\n` +
        `Continuer quand même ?`
      );
      if (!choix) return;
    }

    for (const table of CONTACT_FK_TABLES) {
      const { error } = await sb.from(table).update({ contact_id: targetId }).eq("contact_id", sourceId);
      if (error) { showToast("Erreur pendant la fusion (" + table + ") : " + error.message); return; }
    }
    // Si la fiche source était reliée à un compte client et que la cible ne l'est pas encore, on transfère le lien.
    if (source.client_user_id && target && !target.client_user_id) {
      await sb.from("contacts").update({ client_user_id: source.client_user_id }).eq("id", targetId);
    }
    const { error: delError } = await sb.from("contacts").delete().eq("id", sourceId);
    if (delError) { showToast("Fusion partielle : impossible de supprimer l'ancienne fiche (" + delError.message + ")"); }
    else { showToast("Fusion effectuée avec succès"); }
    closeModal();
    await refreshAll();
  });
}

// ========================================================================
//  DEVIS
// ========================================================================
async function autoExpireDevis() {
  const today = todayStr();
  const expiring = cache.devis.filter(d => {
    if (!["En attente", "Envoyé"].includes(d.statut)) return false;
    const val = d.date_validite || (d.date_creation ? addDaysISO(d.date_creation.slice(0, 10), 30) : null);
    return val && val < today;
  });
  if (!expiring.length) return [];
  for (const d of expiring) await updateRow("devis", d.id, { statut: "Expiré" });
  await refreshCache();
  return expiring;
}
// ---- Intégration Google (Gmail + Agenda) ----
let googleConnected = false; // mis à jour par checkGoogleConnection() après connexion
async function callEdgeFunction(name, body) {
  const { data: sessionData } = await sb.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  const res = await fetch(`${EDGE_FUNCTIONS_URL}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify(body || {}),
  });
  return res.json();
}
async function checkGoogleConnection() {
  const { data } = await sb.from("google_tokens").select("gmail_address").maybeSingle();
  googleConnected = !!data;
  const lbl = document.getElementById("google-connect-lbl");
  if (lbl) lbl.textContent = googleConnected ? "Google connecté (" + (data.gmail_address || "") + ")" : "Connecter Google";
  const btn = document.getElementById("google-connect-btn");
  if (btn) btn.classList.toggle("connected", googleConnected);
}
async function startGoogleConnect() {
  showToast("Redirection vers Google…");
  const res = await callEdgeFunction("google-oauth-start", {});
  if (res && res.url) window.location.href = res.url;
  else showToast("Impossible de démarrer la connexion Google");
}

async function autoMarkLateFactures() {
  const today = todayStr();
  const late = cache.factures.filter(f => f.statut === "Envoyée" && f.date_echeance && f.date_echeance < today);
  if (!late.length) return [];
  for (const f of late) await updateRow("factures", f.id, { statut: "En retard" });
  await refreshCache();
  return late;
}
function factureRelanceUrl(f) {
  const c = findContact(f.contact_id);
  const email = c && c.email ? c.email : "";
  const nom = contactLabel(c);
  const montant = f.montant_ttc != null ? f.montant_ttc + " €" : "";
  const subject = `Relance — Facture ${f.numero || ""} — PCW`;
  const body = `Bonjour ${nom !== "—" ? nom : ""},\n\nSauf erreur de notre part, la facture ${f.numero || ""}${montant ? " d'un montant de " + montant : ""}${f.date_echeance ? ", échue le " + fmtDateFR(f.date_echeance) : ""}, reste impayée à ce jour.\n\nPourriez-vous nous indiquer un délai de règlement ? N'hésitez pas à nous contacter pour toute question.\n\nCordialement,\n${EMETTEUR.nom}`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
async function relancerFacture(id) {
  const f = findFacture(id); if (!f) return;
  const c = findContact(f.contact_id);
  if (!c || !c.email) {
    showToast("Impossible d'envoyer la relance : aucun email renseigné sur ce contact");
    return;
  }
  if (!googleConnected) {
    // Repli : ouvre un brouillon dans le client mail par défaut (comportement historique)
    window.location.href = factureRelanceUrl(f);
    return;
  }
  const nom = contactLabel(c);
  const montant = f.montant_ttc != null ? f.montant_ttc + " €" : "";
  const subject = `Relance — Facture ${f.numero || ""} — PCW`;
  const body = `Bonjour ${nom !== "—" ? nom : ""},\n\nSauf erreur de notre part, la facture ${f.numero || ""}${montant ? " d'un montant de " + montant : ""}${f.date_echeance ? ", échue le " + fmtDateFR(f.date_echeance) : ""}, reste impayée à ce jour.\n\nPourriez-vous nous indiquer un délai de règlement ? N'hésitez pas à nous contacter pour toute question.\n\nCordialement,\n${EMETTEUR.nom}`;
  showToast("Envoi de la relance via Gmail…");
  const res = await callEdgeFunction("send-gmail-relance", { to: c.email, subject, body });
  if (res && res.ok) showToast("Relance envoyée avec succès ✔");
  else { showToast(res?.error || "Échec de l'envoi — ouverture du brouillon"); window.location.href = factureRelanceUrl(f); }
}

// ========================================================================
//  RELANCES CLIENTS
// ========================================================================
let relanceSelectedFactureId = null;
function facturesARelancer() {
  const today = todayStr();
  return cache.factures.filter(f => ["Envoyée", "En retard"].includes(f.statut));
}
function renderRelances() {
  const factures = facturesARelancer();
  const enRetard = factures.filter(f => f.statut === "En retard").length;
  document.getElementById("relances-summary").innerHTML =
    `${enRetard} facture(s) en retard · ${factures.length} à relancer`;

  const listEl = document.getElementById("relances-liste");
  listEl.innerHTML = factures.length ? factures.map(f => {
    const c = findContact(f.contact_id);
    const color = f.statut === "En retard" ? "var(--danger)" : "var(--warning)";
    return `<div class="relance-item" onclick="selectFactureForRelance(${f.id})" style="display:flex;align-items:center;justify-content:space-between;padding:12px 4px;border-bottom:1px solid var(--border);cursor:pointer;">
      <div>
        <strong>${f.numero || "—"}</strong> — ${contactLabel(c)}
        <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">${f.montant_ttc != null ? f.montant_ttc + " €" : ""} ${f.date_echeance ? "· échue le " + fmtDateFR(f.date_echeance) : ""}</div>
      </div>
      ${badge(f.statut, color)}
    </div>`;
  }).join("") : `<div style="text-align:center;padding:30px;color:var(--muted);">Aucune relance en attente 🎉</div>`;

  if (relanceSelectedFactureId && !factures.find(f => f.id === relanceSelectedFactureId)) relanceSelectedFactureId = null;
  const hint = document.getElementById("relance-hint");
  hint.textContent = googleConnected
    ? "L'email est envoyé directement depuis votre compte Gmail connecté."
    : "Google non connecté — l'envoi ouvrira un brouillon dans votre messagerie par défaut.";
}
function selectFactureForRelance(id) {
  const f = findFacture(id); if (!f) return;
  relanceSelectedFactureId = id;
  const c = findContact(f.contact_id);
  const nom = contactLabel(c);
  const montant = f.montant_ttc != null ? f.montant_ttc + " €" : "";
  document.getElementById("relance-to").value = (c && c.email) || "";
  document.getElementById("relance-subject").value = `Relance — Facture ${f.numero || ""} — ${EMETTEUR.nom}`;
  document.getElementById("relance-body").value = `Bonjour ${nom !== "—" ? nom : ""},\n\nSauf erreur de notre part, la facture ${f.numero || ""}${montant ? " d'un montant de " + montant : ""}${f.date_echeance ? ", échue le " + fmtDateFR(f.date_echeance) : ""}, reste impayée à ce jour.\n\nPourriez-vous nous indiquer un délai de règlement ? N'hésitez pas à nous contacter pour toute question.\n\nCordialement,\n${EMETTEUR.nom}`;
}
async function sendRelanceFromForm() {
  const to = document.getElementById("relance-to").value.trim();
  const subject = document.getElementById("relance-subject").value.trim();
  const body = document.getElementById("relance-body").value.trim();
  if (!to || !subject || !body) { showToast("Destinataire, objet et message sont requis"); return; }
  if (!googleConnected) {
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return;
  }
  showToast("Envoi en cours…");
  const res = await callEdgeFunction("send-gmail-relance", { to, subject, body });
  if (res && res.ok) {
    showToast("Email envoyé ✔");
    document.getElementById("relance-to").value = "";
    document.getElementById("relance-subject").value = "";
    document.getElementById("relance-body").value = "";
    relanceSelectedFactureId = null;
  } else {
    showToast(res?.error || "Échec de l'envoi");
  }
}

// ========================================================================
//  CALENDRIER GOOGLE (liste des événements à venir)
// ========================================================================
function bindCalViewTabs() {
  const wrap = document.getElementById("cal-view-tabs");
  if (!wrap || wrap.dataset.bound) return;
  wrap.dataset.bound = "1";
  wrap.querySelectorAll(".cat-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      wrap.querySelectorAll(".cat-tab").forEach(b => b.classList.toggle("active", b === btn));
      const isGoogle = btn.dataset.view === "google";
      document.getElementById("cal-view-mensuel").style.display = isGoogle ? "none" : "block";
      document.getElementById("cal-view-google").style.display = isGoogle ? "block" : "none";
      if (isGoogle) loadGoogleCalendarList();
    });
  });
}
async function loadGoogleCalendarList() {
  const listEl = document.getElementById("google-cal-list");
  if (!googleConnected) {
    listEl.innerHTML = `<div style="text-align:center;padding:30px;color:var(--muted);">Connecte ton compte Google (en bas de la sidebar) pour voir ton agenda ici.</div>`;
    return;
  }
  listEl.innerHTML = `<div style="text-align:center;padding:30px;color:var(--muted);">Chargement…</div>`;
  const res = await callEdgeFunction("sync-google-calendar", { action: "list" });
  if (!res || !res.ok) { listEl.innerHTML = `<div style="text-align:center;padding:30px;color:var(--muted);">Impossible de charger l'agenda Google.</div>`; return; }
  const events = res.events || [];
  if (!events.length) { listEl.innerHTML = `<div style="text-align:center;padding:30px;color:var(--muted);">Aucun événement à venir.</div>`; return; }

  const groups = {};
  events.forEach(e => {
    const day = (e.debut || "").slice(0, 10);
    (groups[day] = groups[day] || []).push(e);
  });
  listEl.innerHTML = Object.keys(groups).sort().map(day => {
    const items = groups[day].map(e => {
      const heure = e.journeeEntiere ? "Toute la journée" : `${fmtHeure(e.debut)} – ${fmtHeure(e.fin)}`;
      return `<div class="panel" style="margin-bottom:10px;padding:14px 16px;border-left:3px solid var(--accent);">
        <strong>${e.titre}</strong>
        <div style="font-size:12px;color:var(--muted);margin-top:4px;">🕐 ${heure}${e.lieu ? " · 📍 " + e.lieu : ""}</div>
      </div>`;
    }).join("");
    return `<div style="font-size:11px;font-weight:700;letter-spacing:.04em;color:var(--muted);text-transform:uppercase;margin:16px 0 8px;">${fmtDateFR(day)}</div>${items}`;
  }).join("");
}
function fmtHeure(iso) {
  if (!iso || iso.length <= 10) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function nextDevisNumero() {
  let max = 0;
  cache.devis.forEach(d => { const m = (d.numero || "").match(/\d+/g); if (m) { const n = parseInt(m[m.length - 1], 10); if (n > max) max = n; } });
  return "DEV-" + String(max + 1).padStart(3, "0");
}
function lastDevisNumero() {
  if (!cache.devis.length) return null;
  return [...cache.devis].sort((a, b) => (b.date_creation || "").localeCompare(a.date_creation || ""))[0].numero;
}

function exportCSV(filename, headers, rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(";"), ...rows.map(r => r.map(esc).join(";"))];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function exportDevisCSV() {
  const rows = cache.devis.map(d => [d.numero, fmtDateFR((d.date_creation || "").slice(0, 10)), contactLabel(devisContact(d)), d.montant_ttc, d.statut]);
  exportCSV("PCW_devis_" + todayStr() + ".csv", ["Numéro", "Date", "Client", "Montant (€)", "Statut"], rows);
}
function exportFacturesCSV() {
  const rows = cache.factures.map(f => [f.numero, fmtDateFR(f.date_facture), contactLabel(findContact(f.contact_id)), f.montant_ttc, f.statut]);
  exportCSV("PCW_factures_" + todayStr() + ".csv", ["Numéro", "Date", "Client", "Montant (€)", "Statut"], rows);
}

function renderDevis() {
  ensureFilterOptions("devis-filter-statut", STATUTS_DEVIS);
  bindSearch("devis-search", renderDevis);
  const last = lastDevisNumero();
  document.getElementById("devis-last").innerHTML = last ? `Dernier devis créé : <strong>${last}</strong>` : "Aucun devis pour l'instant.";
  const expiredCount = cache.devis.filter(d => d.statut === "Expiré").length;
  document.getElementById("devis-warn").innerHTML = expiredCount
    ? `<div class="warn-banner">⚠️ ${expiredCount} devis ${expiredCount > 1 ? "sont expirés" : "est expiré"} (date de validité dépassée). Pense à les relancer ou les renouveler.</div>` : "";

  const search = (document.getElementById("devis-search").value || "").toLowerCase();
  const filter = document.getElementById("devis-filter-statut").value;
  let rows = [...cache.devis].sort((a, b) => (b.date_creation || "").localeCompare(a.date_creation || ""));
  if (filter) rows = rows.filter(d => d.statut === filter);
  if (search) rows = rows.filter(d => (contactLabel(devisContact(d)) + " " + (d.numero || "")).toLowerCase().includes(search));

  const tbody = document.getElementById("devis-tbody");
  tbody.innerHTML = rows.length ? rows.map(d => {
    const e = devisEvent(d);
    return `<tr>
      <td>${d.numero || "—"}${d.finalise ? " ✅" : ""}</td>
      <td>${e ? eventLabel(e) : "—"}</td>
      <td>${contactLabel(devisContact(d))}</td>
      <td>${fmtDateFR(devisDateEvt(d))}</td>
      <td>${d.montant_ttc ? d.montant_ttc + " €" : "—"}</td>
      <td>${statusSelectInline("devis", d.id, d.statut, STATUTS_DEVIS, STATUT_COLORS)}</td>
      <td class="row-actions">
        <button title="Éditer le devis" onclick="openDevisEditor(${d.id})">✎</button>
        <button title="Visualiser" onclick="generateDevisPDF(${d.id}, 'preview')">👁</button>
        <button title="Télécharger le PDF" onclick="generateDevisPDF(${d.id})">⬇</button>
        <button title="Créer une facture" onclick="createFactureFromDevis(${d.id})">🧾</button>
        <button onclick="confirmDelete('devis', ${d.id}, renderDevis)">🗑</button>
      </td></tr>`;
  }).join("") : `<tr class="empty-row"><td colspan="7">Aucun devis</td></tr>`;
}

// Nouveau devis : mini-dialogue (numéro, évènement, statut) puis éditeur
function openDevisDialog(id) {
  const row = id ? findDevis(id) : {};
  if (id) { openDevisEditor(id); return; }
  openModal({
    title: "Nouveau devis",
    table: "devis", id: null,
    fields: [
      { key: "numero", label: "Numéro", type: "text", value: nextDevisNumero() },
      { key: "evenement_id", label: "Projet concerné", type: "select-raw", optionsHtml: `<option value="">— Sélectionner —</option>` + evenementOptionsHtml(row.evenement_id), value: row.evenement_id, numeric: true },
      { key: "statut", label: "Statut", type: "select", options: STATUTS_DEVIS, value: "En attente" },
    ],
    beforeSave: (v) => {
      v.date_validite = addDaysISO(todayStr(), 30);
      v.lignes = [];
    },
    onSaved: async (saved) => {
      await refreshCache();
      renderPage("devis");
      if (saved) openDevisEditor(saved.id);
    },
  });
}

// ---- Éditeur de devis (A4) ----
function openDevisEditor(id) {
  const d = findDevis(id);
  if (!d) return;
  edState = { id, lignes: Array.isArray(d.lignes) ? JSON.parse(JSON.stringify(d.lignes)) : [] };
  if (!edState.lignes.length) edState.lignes.push({ designation: "", qte: 1, pu_ttc: "", remise: 0, mode_paiement: "Paiement unique" });

  const e = devisEvent(d);
  const c = devisContact(d);
  document.getElementById("ed-numero").innerHTML =
    `N° <strong>${d.numero || "—"}</strong> · Date ${fmtDateFR((d.date_creation || todayStr()).slice(0, 10))} · Valable jusqu'au
      <input type="date" id="ed-validite" value="${d.date_validite || addDaysISO(todayStr(), 30)}" style="padding:3px 6px;border:1px solid var(--border);border-radius:5px;font-size:13px;color:#1A1D24;background:#fff;">`;
  document.getElementById("ed-client").innerHTML =
    `<strong>Client :</strong> ${contactLabel(c)}${c && c.telephone ? " · " + c.telephone : ""}${c && c.email ? " · " + c.email : ""}<br>` +
    `<strong>Projet :</strong> ${e ? eventLabel(e) : "—"}` +
    `<div style="margin-top:8px;"><label style="font-size:12px;color:var(--muted);">Statut : </label>
      <select id="ed-statut" style="padding:5px 8px;border:1px solid var(--border);border-radius:5px;color:#1A1D24;background:#fff;">
      ${STATUTS_DEVIS.map(s => `<option value="${s}" ${s === d.statut ? "selected" : ""}>${s}</option>`).join("")}</select></div>`;
  document.getElementById("ed-emetteur").innerHTML =
    `<strong>${EMETTEUR.nom}</strong><br>${EMETTEUR.adresse}<br>${EMETTEUR.siret}<br>${EMETTEUR.email}<br>Tél : ${EMETTEUR.telephone}<br>${EMETTEUR.site}`;
  const logoEl = document.getElementById("ed-logo");
  if (logoEl) logoEl.src = "logo.png";

  renderEditorLines();
  renderCgvPreview(d);
  document.getElementById("devis-editor").classList.add("open");
}

function grillePickerOptionsHtml() {
  const prestas = cache.grille_tarifaire.filter(g => (g.categorie || "Prestation") === "Prestation").sort((a, b) => (a.nom_presta || "").localeCompare(b.nom_presta || ""));
  const options = cache.grille_tarifaire.filter(g => g.categorie === "Option / Supplément").sort((a, b) => (a.nom_presta || "").localeCompare(b.nom_presta || ""));
  const optHtml = list => list.map(g => `<option value="${escapeAttr(g.nom_presta || "")}">${g.nom_presta || ""}${g.pu_ttc != null ? " — " + g.pu_ttc + " €" + modePaiementSuffix(g.mode_paiement) : ""}</option>`).join("");
  return `<option value="">— Choisir dans le catalogue —</option>` +
    (prestas.length ? `<optgroup label="🔵 Prestations">${optHtml(prestas)}</optgroup>` : "") +
    (options.length ? `<optgroup label="🟣 Options / Suppléments">${optHtml(options)}</optgroup>` : "") +
    `<option value="__custom__">✎ Texte libre…</option>`;
}

function renderEditorLines() {
  const tb = document.getElementById("ed-lines");
  const pickerOptions = grillePickerOptionsHtml();
  tb.innerHTML = edState.lignes.map((l, i) => `
    <tr data-i="${i}">
      <td>
        <select data-k="designation-picker" style="margin-bottom:5px;">${pickerOptions}</select>
        <input type="text" data-k="designation" placeholder="Désignation" value="${(l.designation || "").replace(/"/g, "&quot;")}">
      </td>
      <td><input type="number" data-k="qte" min="0" step="1" value="${l.qte != null ? l.qte : 1}" style="width:60px;"></td>
      <td><input type="number" data-k="pu_ttc" min="0" step="0.01" value="${l.pu_ttc != null ? l.pu_ttc : ""}" style="width:90px;"></td>
      <td><input type="number" data-k="remise" min="0" max="100" step="1" value="${l.remise != null ? l.remise : 0}" style="width:60px;"></td>
      <td><select data-k="mode_paiement" style="width:100px;">${MODES_PAIEMENT.map(m => `<option value="${m}" ${(l.mode_paiement || "Paiement unique") === m ? "selected" : ""}>${modePaiementShort(m)}</option>`).join("")}</select></td>
      <td class="ro" data-ro="total"></td>
      <td><button class="del" title="Supprimer" onclick="removeEditorLine(${i})">✕</button></td>
    </tr>`).join("");
  recomputeEditor();
}
function readEditorToState() {
  document.querySelectorAll("#ed-lines tr").forEach(tr => {
    const i = Number(tr.dataset.i);
    const l = edState.lignes[i]; if (!l) return;
    tr.querySelectorAll("[data-k]").forEach(inp => {
      const k = inp.dataset.k;
      if (k === "designation-picker") return;
      l[k] = (inp.type === "number") ? (inp.value === "" ? "" : Number(inp.value)) : inp.value;
    });
  });
}
function computeLine(l) {
  const qte = Number(l.qte || 0), pu = Number(l.pu_ttc || 0), remise = Number(l.remise || 0);
  const total = round2(pu * qte * (1 - remise / 100));
  return { total };
}
function recomputeEditor() {
  let totalUnique = 0, totalMensuel = 0, totalAnnuel = 0;
  document.querySelectorAll("#ed-lines tr").forEach(tr => {
    const i = Number(tr.dataset.i);
    const l = edState.lignes[i]; if (!l) return;
    const r = computeLine(l);
    tr.querySelector('[data-ro="total"]').textContent = r.total.toFixed(2) + " €";
    const mode = l.mode_paiement || "Paiement unique";
    if (mode === "Paiement mensuel") totalMensuel += r.total;
    else if (mode === "Paiement annuel") totalAnnuel += r.total;
    else totalUnique += r.total;
  });
  let html = `<span class="grand">Total unique : ${round2(totalUnique).toFixed(2)} €</span>`;
  if (totalMensuel > 0) html += `<br><span class="grand" style="color:var(--warning);">Total mensuel : ${round2(totalMensuel).toFixed(2)} € /mois</span>`;
  if (totalAnnuel > 0) html += `<br><span class="grand" style="color:var(--info);">Total annuel : ${round2(totalAnnuel).toFixed(2)} € /an</span>`;
  html += `<br><span style="font-size:11.5px;color:var(--muted);font-weight:normal;">${MENTION_TVA}</span>`;
  document.getElementById("ed-totaux").innerHTML = html;
}
function removeEditorLine(i) { readEditorToState(); edState.lignes.splice(i, 1); if (!edState.lignes.length) edState.lignes.push({ designation: "", qte: 1, pu_ttc: "", remise: 0, mode_paiement: "Paiement unique" }); renderEditorLines(); }
function addEditorLine() { readEditorToState(); edState.lignes.push({ designation: "", qte: 1, pu_ttc: "", remise: 0, mode_paiement: "Paiement unique" }); renderEditorLines(); }
function editorTotals() {
  let totalUnique = 0, totalMensuel = 0, totalAnnuel = 0;
  edState.lignes.forEach(l => {
    const t = computeLine(l).total;
    const mode = l.mode_paiement || "Paiement unique";
    if (mode === "Paiement mensuel") totalMensuel += t;
    else if (mode === "Paiement annuel") totalAnnuel += t;
    else totalUnique += t;
  });
  return { ttc: round2(totalUnique + totalMensuel + totalAnnuel), unique: round2(totalUnique), mensuel: round2(totalMensuel), annuel: round2(totalAnnuel) };
}
async function saveDevisEditor(closeAfter) {
  readEditorToState();
  const d = findDevis(edState.id); if (!d) return;
  const tot = editorTotals();
  const newStatut = document.getElementById("ed-statut") ? document.getElementById("ed-statut").value : d.statut;
  const validiteEl = document.getElementById("ed-validite");
  const newValidite = validiteEl && validiteEl.value ? validiteEl.value : d.date_validite;
  const wasEnvoye = d.statut === "Envoyé";
  await updateRow("devis", edState.id, {
    lignes: edState.lignes, montant_ht: tot.ttc, tva: 0, montant_ttc: tot.ttc, statut: newStatut, date_validite: newValidite,
  });
  await refreshCache();
  const updated = findDevis(edState.id);
  if (newStatut === "Envoyé" && !wasEnvoye) await createDevisReminders(updated);
  showToast("Devis enregistré");
  if (closeAfter) closeDevisEditor(); else { renderCgvPreview(updated); }
  renderPage(currentPage === "devis" ? "devis" : currentPage);
}
function closeDevisEditor() { document.getElementById("devis-editor").classList.remove("open"); }

function renderCgvPreview(d) {
  const el = document.getElementById("ed-cgv-preview");
  if (d && Array.isArray(d.cgv) && d.cgv.length) {
    el.innerHTML = "<strong>Conditions générales de vente :</strong><br>" + d.cgv.map((c, i) => `${i + 1}. ${c}`).join("<br>");
  } else { el.innerHTML = "<em>Aucune condition sélectionnée — clique sur « Finaliser (CGV) ».</em>"; }
}

// Sélection ordonnée des CGV
function openCgvManagerDialog() {
  const rows = [...cache.cgv_templates].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  const html = `
    <p style="font-size:12.5px;color:var(--muted);margin:0 0 12px;">Modifie le texte d'une clause, supprime-la, ou ajoute-en une nouvelle en bas. Ces clauses sont celles proposées lors de la finalisation d'un devis.</p>
    <div id="cgv-manager-list">
      ${rows.map(t => `
        <div class="field" data-cgv-row="${t.id}" style="margin-bottom:10px;">
          <textarea rows="2" data-cgv-text="${t.id}">${(t.texte || "").replace(/</g, "&lt;")}</textarea>
          <button type="button" class="btn secondary" style="margin-top:4px;padding:5px 10px;font-size:11.5px;" onclick="deleteCgvTemplate(${t.id})">🗑 Supprimer cette clause</button>
        </div>`).join("")}
    </div>
    <div class="field" style="border-top:1px solid var(--border);padding-top:12px;margin-top:6px;">
      <label>Nouvelle clause</label>
      <textarea rows="2" id="cgv-new-text" placeholder="Texte de la nouvelle condition générale de vente…"></textarea>
    </div>`;
  openRawModal("Gérer les modèles de CGV", html, async () => {
    for (const t of rows) {
      const ta = document.querySelector(`[data-cgv-text="${t.id}"]`);
      const val = ta ? ta.value.trim() : "";
      if (val && val !== t.texte) await updateRow("cgv_templates", t.id, { texte: val });
    }
    const newVal = (document.getElementById("cgv-new-text").value || "").trim();
    if (newVal) {
      const maxOrdre = rows.reduce((m, t) => Math.max(m, t.ordre ?? 0), -1);
      await insertRow("cgv_templates", { texte: newVal, ordre: maxOrdre + 1, date_creation: todayStr() });
    }
    await refreshCache();
    closeModal();
    showToast("Modèles de CGV mis à jour");
  });
  document.getElementById("modal-save").textContent = "Enregistrer";
}
async function deleteCgvTemplate(id) {
  if (!confirm("Supprimer définitivement cette clause de CGV ?")) return;
  await deleteRow("cgv_templates", id);
  await refreshCache();
  closeModal();
  showToast("Clause supprimée");
  openCgvManagerDialog();
}
function openCgvPicker() {
  readEditorToState();
  const d = findDevis(edState.id);
  const availableCgv = cache.cgv_templates.length ? cache.cgv_templates.map(t => t.texte) : CGV_OPTIONS;
  let already = (d && Array.isArray(d.cgv)) ? d.cgv.slice() : [];
  // Suggestion automatique (une seule fois, avant toute finalisation) si le
  // projet lié comporte une option de maintenance.
  if (!d || !Array.isArray(d.cgv)) {
    const e = devisEvent(d);
    const opts = (e && e.options) ? e.options.split(",").map(s => s.trim()) : [];
    const hasMaintenance = opts.includes("Maintenance & mise à jour") || opts.includes("Maintenance & évolutions");
    if (hasMaintenance && !already.includes(CGV_CLAUSE_MAINTENANCE)) already.push(CGV_CLAUSE_MAINTENANCE);
  }
  const html = `<p style="font-size:12.5px;color:var(--muted);margin:0 0 10px;">Coche les conditions dans l'ordre où elles doivent apparaître sur le devis. <a href="#" onclick="closeModal();openCgvManagerDialog();return false;">Gérer les modèles de CGV</a></p>
    <div class="cgv-list" id="cgv-list">${availableCgv.map((c, i) => {
      const pos = already.indexOf(c);
      return `<label><span class="cgv-order" data-cgv="${i}">${pos >= 0 ? (pos + 1) : ""}</span>
        <input type="checkbox" data-cgv-cb="${i}" ${pos >= 0 ? "checked" : ""}> ${c}</label>`;
    }).join("")}</div>`;
  openRawModal("Conditions générales de vente", html, async () => {
    // recueille l'ordre de sélection
    const order = window._cgvOrder || already.map(c => availableCgv.indexOf(c)).filter(x => x >= 0);
    const chosen = order.map(i => availableCgv[i]);
    await updateRow("devis", edState.id, { cgv: chosen, finalise: true });
    await refreshCache();
    closeModal();
    const upd = findDevis(edState.id);
    renderCgvPreview(upd);
    showToast("Devis finalisé");
    generateDevisPDF(edState.id);
  });
  // gestion de l'ordre de clic
  window._cgvOrder = already.map(c => availableCgv.indexOf(c)).filter(x => x >= 0);
  document.querySelectorAll("[data-cgv-cb]").forEach(cb => {
    cb.addEventListener("change", () => {
      const i = Number(cb.dataset.cgvCb);
      if (cb.checked) { if (!window._cgvOrder.includes(i)) window._cgvOrder.push(i); }
      else { window._cgvOrder = window._cgvOrder.filter(x => x !== i); }
      window._cgvOrder.forEach((idx, pos) => { const s = document.querySelector(`[data-cgv="${idx}"]`); if (s) s.textContent = pos + 1; });
      document.querySelectorAll("[data-cgv]").forEach(s => { if (!window._cgvOrder.includes(Number(s.dataset.cgv))) s.textContent = ""; });
    });
  });
}

// Rappels automatiques ajoutés à la to-do quand un devis passe en "Envoyé"
async function createDevisReminders(d) {
  const cgv = Array.isArray(d.cgv) ? d.cgv : [];
  if (!cgv.length) return;
  const e = devisEvent(d);
  const evDate = e ? e.date_fin : null;
  const num = d.numero || ("#" + d.id);
  const evId = e ? e.id : null;
  const toCreate = [];
  if (cgv.includes(CGV_CLAUSE_ACOMPTE)) {
    toCreate.push({ titre: `Envoyer facture d'acompte (30%) du devis ${num}`, priorite: "Haute", date_echeance: todayStr() });
  }
  if (cgv.includes("Paiement à réception de la facture, envoyée 7 jours avant la livraison.")) {
    toCreate.push({ titre: `Envoyer facture devis ${num}`, priorite: "Haute", date_echeance: addDaysISO(evDate, -7) });
  }
  for (const t of toCreate) {
    const exists = cache.todos.some(x => x.titre === t.titre && x.evenement_id === evId);
    if (exists) continue;
    await insertRow("todos", { titre: t.titre, priorite: t.priorite, statut: "À faire", evenement_id: evId, date_echeance: t.date_echeance || null });
  }
  await refreshCache();
  if (toCreate.length) showToast(toCreate.length + " rappel(s) ajouté(s) à la To Do List");
}

// ---- PDF devis ----
let _logoDataUrl = null;
async function getLogoDataUrl() {
  if (_logoDataUrl) return _logoDataUrl;
  try {
    const resp = await fetch("logo.png");
    const blob = await resp.blob();
    _logoDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) { console.error("Logo introuvable pour le PDF", e); }
  return _logoDataUrl;
}
const PDF_BRAND = [44, 150, 216]; // #2C96D8 — aligné sur la palette de l'app
const PDF_COLORS = { success: [63, 167, 114], danger: [217, 83, 79], muted: [136, 144, 160], warning: [217, 154, 43] };
function lightenRgb(rgb, amt) { return rgb.map(c => Math.round(c + (255 - c) * amt)); }
function drawRoundedImage(doc, img, x, y, w, h, r) {
  // Simple et fiable : pas de clip ni de graphics state (source du bug d'affichage).
  try { doc.addImage(img, "PNG", x, y, w, h); } catch (e2) { console.error(e2); }
}
function drawStamp(doc, text, rgb) {
  // Dessiné en tout premier (avant le contenu) : le contenu peint ensuite
  // par-dessus recouvre naturellement le tampon aux endroits chargés,
  // qui ne reste visible que dans les zones vides — sans dépendre d'API
  // de transparence PDF qui posaient problème sur certains rendus.
  const light = lightenRgb(rgb, 0.84);
  doc.setTextColor(light[0], light[1], light[2]);
  doc.setFontSize(54); doc.setFont(undefined, "bold");
  doc.text(text, 105, 168, { align: "center", angle: 25 });
  doc.setTextColor(0); doc.setFontSize(11); doc.setFont(undefined, "normal");
}
function drawPdfBand(doc, logo, title, tag) {
  doc.setFillColor(PDF_BRAND[0], PDF_BRAND[1], PDF_BRAND[2]);
  doc.rect(0, 0, 210, 36, "F");
  if (logo) drawRoundedImage(doc, logo, 16, 7, 22, 22, 4);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22); doc.setFont(undefined, "bold");
  doc.text(title, 44, 23);
  if (tag) {
    const tagX = 44 + doc.getTextWidth(title) + 6;
    doc.setFontSize(10.5); doc.setFont(undefined, "bold");
    const tw = doc.getTextWidth(tag);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(tagX, 16.5, tw + 8, 8, 3, 3, "F");
    doc.setTextColor(PDF_BRAND[0], PDF_BRAND[1], PDF_BRAND[2]);
    doc.text(tag, tagX + 4, 22);
    doc.setTextColor(255, 255, 255);
  }
  doc.setFont(undefined, "normal"); doc.setFontSize(8.3);
  let ey = 10;
  [EMETTEUR.nom, EMETTEUR.adresse, EMETTEUR.siret, EMETTEUR.email, "Tél : " + EMETTEUR.telephone, EMETTEUR.site].forEach(l => { doc.text(l, 194, ey, { align: "right" }); ey += 4.2; });
  doc.setTextColor(0); doc.setFontSize(11);
}
function drawInfoBox(doc, x, y, w, h) {
  doc.setDrawColor(224, 227, 235); doc.setFillColor(247, 248, 252);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, "FD");
  doc.setDrawColor(0);
}
const DEVIS_STAMPS = { "Accepté": ["ACCEPTÉ", PDF_COLORS.success], "Refusé": ["REFUSÉ", PDF_COLORS.danger], "Expiré": ["EXPIRÉ", PDF_COLORS.muted] };
const FACTURE_STAMPS = { "Payée": ["PAYÉE", PDF_COLORS.success], "En retard": ["EN RETARD", PDF_COLORS.danger], "Annulée": ["ANNULÉE", PDF_COLORS.muted] };
function drawEmetteur(doc) {
  doc.setFontSize(10);
  let y = 16;
  [EMETTEUR.nom, EMETTEUR.adresse, EMETTEUR.siret, EMETTEUR.email, "Tél : " + EMETTEUR.telephone, EMETTEUR.site].forEach(l => { doc.text(l, 200, y, { align: "right" }); y += 5; });
  doc.setFontSize(11);
}
function drawFooter(doc) {
  const h = doc.internal.pageSize.getHeight();
  doc.setFontSize(8); doc.setTextColor(120);
  const legal = `${EMETTEUR.nom} — ${EMETTEUR.adresse} — ${EMETTEUR.siret} — ${EMETTEUR.email} — Tél : ${EMETTEUR.telephone} — ${EMETTEUR.site}`;
  doc.text(doc.splitTextToSize(legal, 175), 105, h - 12, { align: "center" });
  doc.setTextColor(0); doc.setFontSize(11);
}
async function generateDevisPDF(id, mode) {
  const d = findDevis(id);
  if (!d) return;
  if (!window.jspdf) { showToast("Générateur PDF indisponible (hors-ligne)"); return; }
  const c = devisContact(d), e = devisEvent(d);
  const lignes = Array.isArray(d.lignes) ? d.lignes : [];
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const logo = await getLogoDataUrl();
  drawPdfBand(doc, logo, "DEVIS");
  const stamp = DEVIS_STAMPS[d.statut];
  if (stamp) drawStamp(doc, stamp[0], stamp[1]);

  doc.setFontSize(10); doc.setTextColor(90);
  doc.text("N° : " + (d.numero || "—") + "     Date : " + fmtDateFR((d.date_creation || todayStr()).slice(0, 10)) + "     Valable jusqu'au : " + fmtDateFR(d.date_validite || addDaysISO(todayStr(), 30)), 16, 45);
  doc.setTextColor(0);

  const clientLines = [contactLabel(c), c && c.societe, c && c.email, c && c.telephone, c && c.adresse, e ? ("Projet : " + eventLabel(e)) : ""].filter(Boolean).flatMap(l => String(l).split("\n"));
  const boxY = 51, boxH = clientLines.length * 5.6 + 12;
  drawInfoBox(doc, 16, boxY, 179, boxH);
  doc.setFontSize(9.5); doc.setTextColor(120); doc.text("CLIENT", 21, boxY + 8); doc.setTextColor(0);
  doc.setFontSize(10.5);
  let cy = boxY + 15;
  clientLines.forEach(l => { doc.text(String(l), 21, cy); cy += 5.6; });

  let y = boxY + boxH + 10;
  doc.setFillColor(PDF_BRAND[0], PDF_BRAND[1], PDF_BRAND[2]);
  doc.rect(16, y - 5, 179, 8, "F");
  doc.setFontSize(8.5); doc.setTextColor(255);
  doc.text("DÉSIGNATION", 20, y); doc.text("QTÉ", 108, y); doc.text("PU (€)", 124, y);
  doc.text("REM.", 142, y); doc.text("PAIEMENT", 156, y); doc.text("TOTAL (€)", 178, y);
  doc.setTextColor(0); doc.setFontSize(10); y += 8;
  let totalUnique = 0, totalMensuel = 0, totalAnnuel = 0, rowIndex = 0;
  lignes.forEach(l => {
    const r = computeLine(l);
    const modeP = l.mode_paiement || "Paiement unique";
    if (modeP === "Paiement mensuel") totalMensuel += r.total;
    else if (modeP === "Paiement annuel") totalAnnuel += r.total;
    else totalUnique += r.total;
    const desig = doc.splitTextToSize(l.designation || "—", 82);
    const rowH = Math.max(7, desig.length * 5);
    if (rowIndex % 2 === 0) { doc.setFillColor(247, 248, 252); doc.rect(16, y - 5, 179, rowH, "F"); }
    doc.text(desig, 20, y);
    doc.text(String(l.qte ?? ""), 108, y);
    doc.text(Number(l.pu_ttc || 0).toFixed(2), 124, y);
    doc.text((l.remise ? l.remise + "%" : "—"), 142, y);
    doc.text(modePaiementShort(modeP), 156, y);
    doc.text(r.total.toFixed(2) + " €", 178, y);
    y += rowH; rowIndex++;
    if (y > 250) { doc.addPage(); y = 20; }
  });
  y += 3; doc.setDrawColor(210); doc.line(16, y, 195, y); doc.setDrawColor(0); y += 9;
  doc.setFontSize(13); doc.text("TOTAL UNIQUE : " + round2(totalUnique).toFixed(2) + " €", 108, y); y += 7;
  if (totalMensuel > 0) { doc.text("TOTAL MENSUEL : " + round2(totalMensuel).toFixed(2) + " € /mois", 108, y); y += 7; }
  if (totalAnnuel > 0) { doc.text("TOTAL ANNUEL : " + round2(totalAnnuel).toFixed(2) + " € /an", 108, y); y += 7; }
  doc.setFontSize(9); doc.setTextColor(90); doc.text(MENTION_TVA, 108, y); doc.setTextColor(0); y += 10;

  if (Array.isArray(d.cgv) && d.cgv.length) {
    doc.setFontSize(11); doc.text("Conditions générales de vente :", 20, y); y += 6;
    doc.setFontSize(10);
    d.cgv.forEach((c2, i) => { const t = doc.splitTextToSize((i + 1) + ". " + c2, 175); doc.text(t, 20, y); y += t.length * 5 + 1; if (y > 255) { doc.addPage(); y = 20; } });
  }
  drawFooter(doc);
  if (mode === "preview") { window.open(doc.output("bloburl"), "_blank"); }
  else { doc.save((d.numero || "devis").replace(/\s+/g, "_") + ".pdf"); }
}

// ========================================================================
//  FACTURATION
// ========================================================================
function nextFactureNumero() {
  let max = 0;
  cache.factures.forEach(f => { const m = (f.numero || "").match(/\d+/g); if (m) { const n = parseInt(m[m.length - 1], 10); if (n > max) max = n; } });
  return "FAC-" + String(max + 1).padStart(3, "0");
}
function renderFactures() {
  ensureFilterOptions("facture-filter-statut", STATUTS_FACTURE);
  bindSearch("facture-search", renderFactures);
  const search = (document.getElementById("facture-search").value || "").toLowerCase();
  const filter = document.getElementById("facture-filter-statut").value;
  let rows = [...cache.factures].sort((a, b) => (b.date_creation || "").localeCompare(a.date_creation || ""));
  if (filter) rows = rows.filter(f => f.statut === filter);
  if (search) rows = rows.filter(f => (contactLabel(findContact(f.contact_id)) + " " + (f.numero || "")).toLowerCase().includes(search));

  const tbody = document.getElementById("facture-tbody");
  tbody.innerHTML = rows.length ? rows.map(f => {
    const dev = f.devis_id ? findDevis(f.devis_id) : null;
    const pdfBtn = f.pdf_path ? `<button title="Voir le PDF joint" onclick="downloadAttachment(findFacture(${f.id}).pdf_path)">📎</button>` : "";
    const relanceBtn = ["Envoyée", "En retard"].includes(f.statut) ? `<button title="Relancer par email" onclick="relancerFacture(${f.id})"><svg class="nav-icon" style="width:14px;height:14px;vertical-align:-2px;"><use href="#icon-mail"></use></svg></button>` : "";
    return `<tr>
      <td>${f.numero || "—"}</td>
      <td>${contactLabel(findContact(f.contact_id))}</td>
      <td>${dev ? (dev.numero || ("Devis #" + dev.id)) : "—"}</td>
      <td>${f.type_facture && f.type_facture !== "Facture unique" ? badgeSubtle(f.type_facture.replace(" (30%)", ""), f.type_facture.includes("Acompte") ? "var(--tertiary)" : "var(--success)") : "—"}</td>
      <td>${fmtDateFR(f.date_facture)}</td>
      <td>${f.montant_ttc ? f.montant_ttc + " €" : "—"}</td>
      <td>${statusSelectInline("factures", f.id, f.statut, STATUTS_FACTURE, STATUT_COLORS)}</td>
      <td class="row-actions">
        <button title="Visualiser" onclick="generateFacturePDF(${f.id}, 'preview')">👁</button>
        <button title="Télécharger la facture (PDF)" onclick="generateFacturePDF(${f.id})">⬇</button>
        ${pdfBtn}
        ${relanceBtn}
        <button onclick="openFactureDialog(${f.id})">✎</button>
        <button onclick="confirmDelete('factures', ${f.id}, renderFactures)">🗑</button>
      </td></tr>`;
  }).join("") : `<tr class="empty-row"><td colspan="8">Aucune facture — crée-la ici ou depuis un devis (🧾)</td></tr>`;
}
const TYPES_FACTURE = ["Facture unique", "Facture d'acompte (30%)", "Facture de solde"];
const ACOMPTE_PERCENT = 30;
function computeMontantParType(devisId, type, excludeFactureId) {
  const d = findDevis(Number(devisId));
  if (!d || d.montant_ttc == null) return null;
  const total = Number(d.montant_ttc);
  if (type === "Facture d'acompte (30%)") return round2(total * ACOMPTE_PERCENT / 100);
  if (type === "Facture de solde") {
    const dejaFacture = cache.factures
      .filter(f => f.devis_id === Number(devisId) && f.id !== excludeFactureId && f.type_facture === "Facture d'acompte (30%)")
      .reduce((s, f) => s + Number(f.montant_ttc || 0), 0);
    return round2(total - dejaFacture);
  }
  return total;
}
function factureFields(row) {
  return [
    { key: "numero", label: "Numéro", type: "text", value: row.numero != null ? row.numero : nextFactureNumero() },
    { key: "contact_id", label: "Client / contact", type: "select-raw", optionsHtml: `<option value="">—</option>` + contactOptionsHtml(row.contact_id), value: row.contact_id, numeric: true },
    { key: "devis_id", label: "Devis lié", type: "select-raw", optionsHtml: `<option value="">— Aucun —</option>` + devisOptionsHtml(row.devis_id), value: row.devis_id, numeric: true },
    { key: "type_facture", label: "Type de facture", type: "select", options: TYPES_FACTURE, value: row.type_facture || "Facture unique" },
    { key: "type_evenement", label: "Type de projet", type: "select-other", options: TYPES_EVENEMENT, value: row.type_evenement, allowEmpty: true },
    { key: "date_facture", label: "Date de la facture", type: "date", value: row.date_facture || todayStr() },
    { key: "date_echeance", label: "Date d'échéance", type: "date", value: row.date_echeance },
    { key: "montant_ttc", label: "Montant (€)", type: "number", value: row.montant_ttc },
    { key: "statut", label: "Statut", type: "select", options: STATUTS_FACTURE, value: row.statut || "Brouillon" },
    { key: "pdf_signe_file", label: "Joindre un PDF (facture signée / preuve)", type: "file", accept: "application/pdf" },
    { key: "notes", label: "Notes", type: "textarea", value: row.notes },
  ];
}
function factureOnRender(form, currentId) {
  const recompute = () => {
    const devisId = form.elements["devis_id"].value;
    const type = form.elements["type_facture"].value;
    if (!devisId || type === "Facture unique") return;
    const m = computeMontantParType(devisId, type, currentId);
    if (m != null) form.elements["montant_ttc"].value = m;
  };
  form.elements["devis_id"].addEventListener("change", () => {
    const d = findDevis(Number(form.elements["devis_id"].value)); if (!d) return;
    const c = devisContact(d);
    if (!form.elements["contact_id"].value && c) form.elements["contact_id"].value = c.id;
    recompute();
    if (!form.elements["montant_ttc"].value && d.montant_ttc != null) form.elements["montant_ttc"].value = d.montant_ttc;
  });
  form.elements["type_facture"].addEventListener("change", recompute);
}
function openFactureDialog(id, prefill) {
  const row = id ? (findFacture(id) || {}) : (prefill || {});
  openModal({
    title: id ? "Modifier la facture" : "Nouvelle facture", table: "factures", id, fields: factureFields(row), onRender: (form) => factureOnRender(form, id),
    beforeSave: (v) => {
      const linked = v.devis_id ? findDevis(Number(v.devis_id)) : null;
      v.lignes = (linked && Array.isArray(linked.lignes) && linked.lignes.length) ? linked.lignes : (row.lignes || null);
    },
    onSaved: refreshAll,
  });
}
function createFactureFromDevis(devisId) {
  const d = findDevis(devisId); if (!d) return;
  const c = devisContact(d);
  openFactureDialog(null, {
    devis_id: d.id, contact_id: c ? c.id : null,
    montant_ttc: d.montant_ttc, notes: d.notes,
    lignes: Array.isArray(d.lignes) ? JSON.parse(JSON.stringify(d.lignes)) : null,
  });
  showToast("Facture pré-remplie depuis " + (d.numero || "le devis") + (Array.isArray(d.lignes) && d.lignes.length ? " — détail des lignes repris" : ""));
}
async function generateFacturePDF(id, mode) {
  const f = findFacture(id); if (!f) return;
  if (!window.jspdf) { showToast("Générateur PDF indisponible (hors-ligne)"); return; }
  const c = findContact(f.contact_id), dev = f.devis_id ? findDevis(f.devis_id) : null;
  const { jsPDF } = window.jspdf; const doc = new jsPDF();
  const montant = Number(f.montant_ttc || 0);
  const logo = await getLogoDataUrl();
  const factureTag = f.type_facture === "Facture d'acompte (30%)" ? "ACOMPTE 30%" : (f.type_facture === "Facture de solde" ? "SOLDE" : null);
  drawPdfBand(doc, logo, "FACTURE", factureTag);
  const stamp = FACTURE_STAMPS[f.statut];
  if (stamp) drawStamp(doc, stamp[0], stamp[1]);

  doc.setFontSize(10); doc.setTextColor(90);
  let infoLine = "N° : " + (f.numero || "—") + "     Date : " + fmtDateFR(f.date_facture || todayStr());
  if (f.date_echeance) infoLine += "     Échéance : " + fmtDateFR(f.date_echeance);
  if (dev) infoLine += "     Réf. devis : " + (dev.numero || ("#" + dev.id));
  if (f.type_facture && f.type_facture !== "Facture unique") infoLine += "     " + f.type_facture.toUpperCase();
  doc.text(infoLine, 16, 45);
  doc.setTextColor(0);

  const clientLines = [contactLabel(c), c && c.societe, c && c.email, c && c.telephone, c && c.adresse].filter(Boolean).flatMap(l => String(l).split("\n"));
  const boxY = 51, boxH = clientLines.length * 5.6 + 12;
  drawInfoBox(doc, 16, boxY, 179, boxH);
  doc.setFontSize(9.5); doc.setTextColor(120); doc.text("FACTURÉ À", 21, boxY + 8); doc.setTextColor(0);
  doc.setFontSize(10.5);
  let cy = boxY + 15;
  clientLines.forEach(l => { doc.text(String(l), 21, cy); cy += 5.6; });

  let y = boxY + boxH + 12;
  const lignes = Array.isArray(f.lignes) ? f.lignes : [];
  doc.setFontSize(12); doc.text("Détail", 16, y); y += 9; doc.setFontSize(11);

  if (lignes.length) {
    doc.setFillColor(PDF_BRAND[0], PDF_BRAND[1], PDF_BRAND[2]);
    doc.rect(16, y - 5, 179, 8, "F");
    doc.setFontSize(8.5); doc.setTextColor(255);
    doc.text("DÉSIGNATION", 20, y); doc.text("QTÉ", 108, y); doc.text("PU (€)", 124, y);
    doc.text("REM.", 142, y); doc.text("PAIEMENT", 156, y); doc.text("TOTAL (€)", 178, y);
    doc.setTextColor(0); doc.setFontSize(10); y += 8;
    let rowIndex = 0;
    lignes.forEach(l => {
      const r = computeLine(l);
      const modeP = l.mode_paiement || "Paiement unique";
      const desig = doc.splitTextToSize(l.designation || "—", 82);
      const rowH = Math.max(7, desig.length * 5);
      if (rowIndex % 2 === 0) { doc.setFillColor(247, 248, 252); doc.rect(16, y - 5, 179, rowH, "F"); }
      doc.text(desig, 20, y);
      doc.text(String(l.qte ?? ""), 108, y);
      doc.text(Number(l.pu_ttc || 0).toFixed(2), 124, y);
      doc.text((l.remise ? l.remise + "%" : "—"), 142, y);
      doc.text(modePaiementShort(modeP), 156, y);
      doc.text(r.total.toFixed(2) + " €", 178, y);
      y += rowH; rowIndex++;
      if (y > 250) { doc.addPage(); y = 20; }
    });
    y += 2; doc.setDrawColor(210); doc.line(16, y, 195, y); doc.setDrawColor(0); y += 9;
  } else {
    const rows = [["Type de projet", f.type_evenement || "—"], ["Montant", montant ? montant.toFixed(2) + " €" : "—"]];
    rows.forEach(([k, v], i) => {
      if (i % 2 === 0) { doc.setFillColor(247, 248, 252); doc.rect(16, y - 5, 179, 7, "F"); }
      doc.text(k, 20, y); doc.text(v, 130, y); y += 7;
    });
  }
  y += 2; doc.setFontSize(9); doc.setTextColor(90); doc.text(MENTION_TVA, 20, y); doc.setTextColor(0); y += 10;
  if (f.type_facture === "Facture d'acompte (30%)" && dev && dev.montant_ttc != null) {
    doc.setFontSize(9.5); doc.setTextColor(90);
    doc.text(`Montant total du projet : ${Number(dev.montant_ttc).toFixed(2)} €   —   Acompte de 30% facturé ce jour : ${montant.toFixed(2)} €`, 20, y);
    doc.setTextColor(0); y += 9;
  }
  if (f.type_facture === "Facture de solde" && dev && dev.montant_ttc != null) {
    const acomptesFacturees = cache.factures.filter(x => x.devis_id === f.devis_id && x.type_facture === "Facture d'acompte (30%)");
    const totalAcompte = round2(acomptesFacturees.reduce((s, x) => s + Number(x.montant_ttc || 0), 0));
    doc.setFontSize(9.5); doc.setTextColor(90);
    doc.text(`Montant total du projet : ${Number(dev.montant_ttc).toFixed(2)} €   —   Acompte déjà facturé : ${totalAcompte.toFixed(2)} € ${acomptesFacturees.length ? "(" + acomptesFacturees.map(x => x.numero).filter(Boolean).join(", ") + ")" : ""}`, 20, y);
    doc.setTextColor(0); y += 9;
  }
  if (f.type_facture === "Facture d'acompte (30%)") {
    doc.setFontSize(13); doc.text("ACOMPTE À PAYER (30%) : " + montant.toFixed(2) + " €", 20, y);
  } else {
    doc.setFontSize(13); doc.text("NET À PAYER : " + montant.toFixed(2) + " €", 20, y);
  }
  y += 14;
  if (f.statut !== "Payée") {
    doc.setFontSize(9); doc.setTextColor(90);
    const mentions = [
      "Le solde de la prestation est exigible à la livraison du projet.",
      "La propriété des livrables et les droits d'utilisation ne sont transférés au client qu'après paiement intégral de la facture.",
    ];
    mentions.forEach(m => { const t = doc.splitTextToSize(m, 175); doc.text(t, 20, y); y += t.length * 4.5 + 2; });
    doc.setTextColor(0); y += 6;
  }
  drawInfoBox(doc, 16, y, 179, 30);
  doc.setFontSize(9.5); doc.setTextColor(120); doc.text("COORDONNÉES BANCAIRES POUR LE RÈGLEMENT PAR VIREMENT", 21, y + 8); doc.setTextColor(0);
  doc.setFontSize(11);
  doc.text("IBAN : " + EMETTEUR.iban, 21, y + 17);
  doc.text("BIC : " + EMETTEUR.bic + (EMETTEUR.banque ? "   ·   " + EMETTEUR.banque : ""), 21, y + 24);
  y += 38;
  if (f.notes) { doc.setFontSize(10); doc.text(doc.splitTextToSize("Notes : " + f.notes, 170), 20, y); y += 14; }
  drawFooter(doc);
  if (mode === "preview") { window.open(doc.output("bloburl"), "_blank"); }
  else { doc.save((f.numero || "facture").replace(/\s+/g, "_") + ".pdf"); }
}

async function downloadAttachment(pdf_path) {
  if (!pdf_path) { showToast("Aucun PDF joint"); return; }
  const { data, error } = await sb.storage.from("devis-signes").createSignedUrl(pdf_path, 60);
  if (error) { showToast("PDF introuvable"); console.error(error); return; }
  window.open(data.signedUrl, "_blank");
}

function openContactHistory(contactId) {
  const c = findContact(contactId);
  const items = [];
  cache.evenements.filter(e => e.contact_id === contactId).forEach(e => {
    items.push({ date: e.date_fin || e.date_creation || "", icon: "icon-folder", label: "Projet créé : " + eventLabel(e), sub: e.statut, color: "var(--success)", fn: `openEvenementDialog(${e.id})` });
  });
  cache.devis.filter(d => { const cc = devisContact(d); return cc && cc.id === contactId; }).forEach(d => {
    items.push({ date: (d.date_creation || "").slice(0, 10), icon: "icon-file-text", label: "Devis " + (d.numero || "") + (d.montant_ttc ? " — " + d.montant_ttc + " €" : ""), sub: d.statut, color: "var(--info)", fn: `openDevisEditor(${d.id})` });
  });
  cache.factures.filter(f => f.contact_id === contactId).forEach(f => {
    items.push({ date: f.date_facture || "", icon: "icon-receipt", label: "Facture " + (f.numero || "") + (f.montant_ttc ? " — " + f.montant_ttc + " €" : ""), sub: f.statut, color: "var(--warning)", fn: `openFactureDialog(${f.id})` });
  });
  cache.rdv.filter(r => r.contact_id === contactId).forEach(r => {
    items.push({ date: r.date_rdv || "", icon: "icon-clock", label: "RDV" + (r.objet ? " — " + r.objet : ""), sub: r.statut, color: "var(--tertiary)", fn: `openRdvDialog(${r.id})` });
  });
  cache.todos.filter(t => t.contact_id === contactId).forEach(t => {
    items.push({ date: t.date_echeance || t.date_creation || "", icon: "icon-check-square", label: "Tâche : " + t.titre, sub: t.statut, color: "var(--accent-dark)", fn: `openTodoDialog(${t.id})` });
  });
  items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const totalPaye = cache.factures.filter(f => f.contact_id === contactId && f.statut === "Payée").reduce((s, f) => s + Number(f.montant_ttc || 0), 0);
  const summary = `<div class="page-note" style="margin:0 0 16px;">
    <strong>${contactLabel(c)}</strong>${c && c.email ? " · " + c.email : ""}${c && c.telephone ? " · " + c.telephone : ""}
    ${totalPaye ? `<br>💶 Total facturé payé : <strong>${round2(totalPaye).toFixed(2)} €</strong>` : ""}
  </div>`;

  const timeline = items.length ? `<div style="border-left:2px solid var(--border);margin-left:6px;">` + items.map(it => `
    <div onclick="${it.fn}" style="position:relative;padding:0 0 18px 22px;cursor:pointer;">
      <div style="position:absolute;left:-7px;top:2px;width:12px;height:12px;border-radius:50%;background:${it.color};border:2px solid var(--card);"></div>
      <div style="font-size:11.5px;color:var(--muted);margin-bottom:2px;">${fmtDateFR(it.date) || "Date inconnue"}</div>
      <div style="font-size:13.5px;font-weight:600;">${it.label}</div>
      ${it.sub ? badge(it.sub, STATUT_COLORS[it.sub] || "var(--muted)") : ""}
    </div>`).join("") + `</div>`
    : `<div class="gsr-empty">Aucun historique pour ce contact pour l'instant.</div>`;

  showInfoModal("Historique client", summary + timeline);
}

// ========================================================================
//  EVENEMENTS
// ========================================================================
function renderEvenements() {
  ensureFilterOptions("evenement-filter-type", TYPES_EVENEMENT);
  ensureFilterOptions("evenement-filter-statut", STATUTS_EVENEMENT);
  ensureFilterOptions("evenement-filter-mois", MOIS_FR.map((m, i) => ({ value: String(i + 1).padStart(2, "0"), label: m })));
  const fType = document.getElementById("evenement-filter-type").value;
  const fMois = document.getElementById("evenement-filter-mois").value;
  const fStatut = document.getElementById("evenement-filter-statut").value;

  let rows = [...cache.evenements].sort((a, b) => (a.date_fin || "9999").localeCompare(b.date_fin || "9999"));
  if (fType) rows = rows.filter(e => e.type_evenement === fType);
  if (fStatut) rows = rows.filter(e => e.statut === fStatut);
  if (fMois) rows = rows.filter(e => ((e.date_fin || e.mois_seul || "") + "").slice(5, 7) === fMois);

  const tbody = document.getElementById("evenement-tbody");
  tbody.innerHTML = rows.length ? rows.map(e => {
    const c = findContact(e.contact_id);
    const dev = cache.devis.find(d => d.evenement_id === e.id);
    const fac = cache.factures.find(f => (e.facture_id && f.id === e.facture_id) || (dev && f.devis_id === dev.id));
    const dateTxt = e.date_flexible ? (fmtMoisFR(e.mois_seul) + " (flex.)") : fmtDateFR(e.date_fin);
    return `<tr>
      <td><strong>${e.titre || "—"}</strong></td>
      <td>${dateTxt || "—"}</td>
      <td>${contactLabel(c)}</td>
      <td>${(c && c.provenance) || "—"}</td>
      <td>${e.type_evenement || "—"}</td>
      <td>${e.type_prestation || "—"}</td>
      <td>${statusSelectInline("evenements", e.id, e.statut, STATUTS_EVENEMENT, STATUT_COLORS)}</td>
      <td>${etapeSelectInline(e.id, e.etape_projet)}</td>
      <td>${dev ? statusSelectInlineSubtle("devis", dev.id, dev.statut, STATUTS_DEVIS, STATUT_COLORS) : "—"}</td>
      <td>${fac ? statusSelectInlineSubtle("factures", fac.id, fac.statut, STATUTS_FACTURE, STATUT_COLORS) : "—"}</td>
      <td>${e.derniere_action || "—"}</td>
      <td class="row-actions">
        <button title="Fiche récap" onclick="openEventRecap(${e.id})">📋</button>
        <button onclick="openEvenementDialog(${e.id})">✎</button>
        <button onclick="confirmDelete('evenements', ${e.id}, renderEvenements)">🗑</button>
      </td></tr>`;
  }).join("") : `<tr class="empty-row"><td colspan="12">Aucun projet</td></tr>`;
}

function syncRecurringFromOptions(form, pickedOptions) {
  const recFld = form.elements["facturation_recurrente"];
  const freqFld = form.elements["frequence_facturation"];
  const montantFld = form.elements["montant_recurrent"];
  if (!recFld || !freqFld || !montantFld) return;
  const matches = cache.grille_tarifaire.filter(g => pickedOptions.includes(g.nom_presta) && g.mode_paiement && g.mode_paiement !== "Paiement unique");
  if (matches.length) {
    recFld.checked = true;
    freqFld.value = matches.some(g => g.mode_paiement === "Paiement mensuel") ? "Mensuelle" : "Annuelle";
    const total = round2(matches.reduce((s, g) => s + Number(g.pu_ttc || 0), 0));
    montantFld.value = total || "";
  } else {
    recFld.checked = false;
  }
}
function renderOptionsUI(form, type, checkedCsv) {
  const container = form.querySelector("#options-ui");
  const hidden = form.elements["options"];
  if (!container || !hidden) return;
  const list = optionsListForType(type);
  if (!list) {
    container.innerHTML = `<div style="font-size:12px;color:var(--muted);">Choisis un type de projet Site web ou Application pour voir les options disponibles.</div>`;
    hidden.value = "";
    return;
  }
  const checked = (checkedCsv || "").split(",").map(s => s.trim()).filter(Boolean);
  container.innerHTML = `<div class="inline-checks">` + list.map(o => {
    const g = cache.grille_tarifaire.find(x => x.nom_presta === o);
    const priceLbl = g && g.pu_ttc != null ? ` <span style="color:var(--muted);font-weight:normal;">(${g.pu_ttc} €${modePaiementSuffix(g.mode_paiement)})</span>` : "";
    return `<label><input type="checkbox" data-opt="${escapeAttr(o)}" ${checked.includes(o) ? "checked" : ""}>${o}${priceLbl}</label>`;
  }).join("") + `</div>`;
  syncRecurringFromOptions(form, checked);
  container.querySelectorAll("[data-opt]").forEach(cb => {
    cb.addEventListener("change", () => {
      const picked = Array.from(container.querySelectorAll("[data-opt]")).filter(x => x.checked).map(x => x.dataset.opt);
      hidden.value = picked.join(", ");
      syncRecurringFromOptions(form, picked);
    });
  });
}
function openEvenementDialog(id, defaultDate) {
  const row = id ? cache.evenements.find(e => e.id === id) : {};
  openModal({
    title: id ? "Modifier le projet" : "Nouveau projet",
    table: "evenements", id,
    fields: [
      { key: "titre", label: "Nom du projet", type: "text", value: row.titre, placeholder: "Ex. Refonte site — Boulangerie Martin" },
      { key: "date_fin", label: "Date de livraison prévue", type: "date", value: row.date_fin || defaultDate },
      { key: "contact_id", label: "Contact / client", type: "select-raw", optionsHtml: `<option value="">—</option>` + contactOptionsHtml(row.contact_id), value: row.contact_id, numeric: true },
      { key: "provenance", label: "Provenance (reprise du contact)", type: "text", value: row.provenance },
      { key: "type_evenement", label: "Type de projet", type: "select-other", options: TYPES_EVENEMENT, value: row.type_evenement, allowEmpty: true },
      { key: "options", label: "Options du projet", type: "options-picker", value: row.options },
      { key: "type_prestation", label: "Formule(s)", type: "checklist", options: TYPES_PRESTATION, value: row.type_prestation },
      { key: "statut", label: "Statut", type: "select", options: STATUTS_EVENEMENT, value: row.statut || "Premier contact" },
      { key: "etape_projet", label: "Étape (visible par le client)", type: "select-raw", optionsHtml: ETAPES_PROJET.map(e => `<option value="${e.value}" ${e.value === (row.etape_projet || "maquette") ? "selected" : ""}>${e.label}</option>`).join(""), value: row.etape_projet || "maquette" },
      { key: "date_livraison_estimee", label: "Date de livraison estimée (visible par le client)", type: "date", value: row.date_livraison_estimee },
      { key: "devis_id", label: "Devis lié", type: "select-raw", optionsHtml: `<option value="">—</option>` + devisOptionsHtml(row.devis_id), value: row.devis_id, numeric: true },
      { key: "facture_id", label: "Facture liée", type: "select-raw", optionsHtml: `<option value="">—</option>` + factureOptionsHtml(row.facture_id), value: row.facture_id, numeric: true },
      { key: "facturation_recurrente", label: "Facturation récurrente (mensuelle/annuelle)", type: "checkbox", value: row.facturation_recurrente },
      { key: "frequence_facturation", label: "Fréquence", type: "select", options: ["Mensuelle", "Annuelle"], value: row.frequence_facturation || "Mensuelle" },
      { key: "montant_recurrent", label: "Montant à refacturer à chaque échéance (€)", type: "number", value: row.montant_recurrent },
      { key: "prochaine_facturation", label: "Prochaine date de facturation", type: "date", value: row.prochaine_facturation },
      { key: "derniere_action", label: "Dernière action", type: "text", value: row.derniere_action },
      { key: "prochain_rdv", label: "Prochain RDV", type: "date", value: row.prochain_rdv },
      { key: "notes", label: "Notes", type: "textarea", value: row.notes },
    ],
    onRender: (form) => {
      form.elements["contact_id"].addEventListener("change", () => { const c = findContact(Number(form.elements["contact_id"].value)); if (c && c.provenance && !form.elements["provenance"].value) form.elements["provenance"].value = c.provenance; });
      const typeSel = form.elements["type_evenement__sel"];
      renderOptionsUI(form, typeSel.value === "__other__" ? "" : typeSel.value, row.options);
      typeSel.addEventListener("change", () => renderOptionsUI(form, typeSel.value === "__other__" ? "" : typeSel.value, ""));
    },
    onSaved: refreshAll,
  });
}

// ========================================================================
//  RDV
// ========================================================================
function renderRdv() {
  ensureFilterOptions("rdv-filter-statut", STATUTS_RDV);
  const filter = document.getElementById("rdv-filter-statut").value;
  let rows = [...cache.rdv].sort((a, b) => ((a.date_rdv || "9999") + (a.heure || "")).localeCompare((b.date_rdv || "9999") + (b.heure || "")));
  if (filter) rows = rows.filter(r => r.statut === filter);
  const tbody = document.getElementById("rdv-tbody");
  tbody.innerHTML = rows.length ? rows.map(r => `
    <tr>
      <td>${fmtDateFR(r.date_rdv)}</td><td>${r.heure || "—"}</td><td>${r.objet || "—"}</td>
      <td>${contactLabel(findContact(r.contact_id))}</td><td>${statusSelectInline("rdv", r.id, r.statut, STATUTS_RDV, STATUT_COLORS)}</td>
      <td class="row-actions"><button onclick="openRdvDialog(${r.id})">✎</button><button onclick="deleteRdvWithGoogleSync(${r.id})">🗑</button></td>
    </tr>`).join("") : `<tr class="empty-row"><td colspan="6">Aucun rendez-vous</td></tr>`;
}
function openRdvDialog(id) {
  const row = id ? cache.rdv.find(r => r.id === id) : {};
  openModal({
    title: id ? "Modifier le RDV" : "Nouveau RDV", table: "rdv", id,
    fields: [
      { key: "objet", label: "Objet", type: "text", required: true, value: row.objet },
      { key: "contact_id", label: "Contact", type: "select-raw", optionsHtml: `<option value="">—</option>` + contactOptionsHtml(row.contact_id), value: row.contact_id, numeric: true },
      { key: "date_rdv", label: "Date", type: "date", value: row.date_rdv },
      { key: "heure", label: "Heure", type: "time", value: row.heure },
      { key: "statut", label: "Statut", type: "select", options: STATUTS_RDV, value: row.statut || "Prévu" },
      { key: "notes", label: "Notes", type: "textarea", value: row.notes },
    ],
    onSaved: async (saved) => {
      await refreshAll();
      syncRdvToGoogleCalendar(saved).catch(e => console.error("Sync Google Agenda", e));
    },
  });
}
async function syncRdvToGoogleCalendar(rdv) {
  if (!googleConnected || !rdv || rdv.statut === "Annulé") return;
  const c = findContact(rdv.contact_id);
  const res = await callEdgeFunction("sync-google-calendar", {
    action: rdv.google_event_id ? "update" : "create",
    rdvId: rdv.id,
    googleEventId: rdv.google_event_id || null,
    titre: rdv.objet || "Rendez-vous",
    date: rdv.date_rdv,
    heure: rdv.heure,
    dureeMinutes: 60,
    description: (c ? "Contact : " + contactLabel(c) + "\n" : "") + (rdv.notes || ""),
  });
  if (res && res.googleEventId && !rdv.google_event_id) {
    await refreshCache(); // récupère le google_event_id enregistré côté serveur
  }
}
async function deleteRdvWithGoogleSync(id, renderFn) {
  const r = cache.rdv.find(x => x.id === id);
  if (googleConnected && r && r.google_event_id) {
    callEdgeFunction("sync-google-calendar", { action: "delete", googleEventId: r.google_event_id }).catch(e => console.error(e));
  }
  await confirmDelete("rdv", id, renderFn || renderRdv);
}

// ========================================================================
//  PORTAIL CLIENT — DEMANDES
// ========================================================================
function renderDemandes() {
  ensureFilterOptions("demande-filter-priorite", PRIORITES_DEMANDES);
  ensureFilterOptions("demande-filter-statut", STATUTS_DEMANDES);
  const fp = document.getElementById("demande-filter-priorite").value;
  const fs = document.getElementById("demande-filter-statut").value;
  const prioOrder = { "Urgent": 0, "Normal": 1, "Faible": 2 };
  let rows = [...cache.demandes].sort((a, b) =>
    (prioOrder[a.priorite] ?? 1) - (prioOrder[b.priorite] ?? 1) ||
    (b.date_creation || "").localeCompare(a.date_creation || "")
  );
  if (fp) rows = rows.filter(d => d.priorite === fp);
  if (fs) rows = rows.filter(d => d.statut === fs);
  const tbody = document.getElementById("demandes-tbody");
  tbody.innerHTML = rows.length ? rows.map(d => `
    <tr>
      <td>${statusSelectInline("demandes", d.id, d.priorite, PRIORITES_DEMANDES, STATUT_COLORS, "priorite")}</td>
      <td>${escapeHtml(d.titre)}</td>
      <td>${contactLabel(findContact(d.contact_id))}</td>
      <td>${escapeHtml(d.description || "—")}</td>
      <td>${d.date_creation ? d.date_creation.slice(0, 10).split("-").reverse().join("/") : "—"}</td>
      <td>${statusSelectInline("demandes", d.id, d.statut, STATUTS_DEMANDES, STATUT_COLORS, "statut")}</td>
    </tr>`).join("") : `<tr class="empty-row"><td colspan="6">Aucune demande client</td></tr>`;
}
function escapeHtml(str) {
  if (str == null) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ========================================================================
//  PORTAIL CLIENT — MESSAGERIE
// ========================================================================
let selectedMessageContactId = null;
function clientsWithPortailAccount() {
  return cache.contacts.filter(c => c.client_user_id);
}
function lastMessageFor(contactId) {
  const msgs = cache.messages.filter(m => m.contact_id === contactId);
  return msgs.length ? msgs[msgs.length - 1] : null;
}
function renderMessages() {
  const list = document.getElementById("messages-contacts-list");
  const clients = clientsWithPortailAccount();
  if (!clients.length) {
    list.innerHTML = `<div class="page-note" style="margin:14px;">Aucun client n'a encore de compte sur le portail.</div>`;
  } else {
    list.innerHTML = clients.map(c => {
      const last = lastMessageFor(c.id);
      const nonLus = cache.messages.filter(m => m.contact_id === c.id && m.expediteur === "client" && !m.lu).length;
      return `<div class="messages-contact-item ${c.id === selectedMessageContactId ? "active" : ""}" onclick="selectMessageContact(${c.id})">
        <div class="mc-name">${contactLabel(c)}${nonLus ? ` <span class="nav-badge" style="position:relative;top:-1px;">${nonLus}</span>` : ""}</div>
        <div class="mc-preview">${last ? escapeHtml(last.contenu) : "Aucun message"}</div>
      </div>`;
    }).join("");
  }
  if (selectedMessageContactId) renderMessageThread(selectedMessageContactId);
}
function selectMessageContact(contactId) {
  selectedMessageContactId = contactId;
  document.getElementById("messages-compose").style.display = "flex";
  renderMessages();
  marquerMessagesLusAdmin(contactId);
}
function renderMessageThread(contactId) {
  const thread = document.getElementById("messages-thread");
  const msgs = cache.messages.filter(m => m.contact_id === contactId);
  thread.innerHTML = msgs.length ? msgs.map(m => `
    <div class="msg-bubble ${m.expediteur === "admin" ? "admin" : "client"}">
      ${escapeHtml(m.contenu)}
      <span class="msg-time">${m.date_creation ? m.date_creation.slice(0, 16).replace("T", " ") : ""}</span>
    </div>`).join("") : `<div class="page-note">Aucun message pour l'instant.</div>`;
  thread.scrollTop = thread.scrollHeight;
}
async function sendAdminMessage() {
  if (!selectedMessageContactId) return;
  const input = document.getElementById("messages-input");
  const contenu = input.value.trim();
  if (!contenu) return;
  const saved = await insertRow("messages", { contact_id: selectedMessageContactId, expediteur: "admin", contenu, lu: false });
  if (saved) {
    input.value = "";
    await refreshCache();
    renderMessages();
  }
}

// ========================================================================
//  MESSAGES NON LUS — badge de navigation
// ========================================================================
function updateNavBadgeMessages() {
  const badge = document.getElementById("nav-badge-messages");
  if (!badge) return;
  const count = cache.messages.filter(m => m.expediteur === "client" && !m.lu).length;
  if (count > 0) { badge.textContent = count > 9 ? "9+" : count; badge.style.display = "inline-flex"; }
  else { badge.style.display = "none"; }
}

async function marquerMessagesLusAdmin(contactId) {
  const nonLus = cache.messages.filter(m => m.contact_id === contactId && m.expediteur === "client" && !m.lu);
  if (!nonLus.length) return;
  await sb.from("messages").update({ lu: true }).eq("contact_id", contactId).eq("expediteur", "client").eq("lu", false);
  nonLus.forEach(m => { m.lu = true; });
  updateNavBadgeMessages();
}

// ========================================================================
//  FICHIERS CLIENTS
// ========================================================================
function formatTailleAdmin(octets) {
  if (!octets) return "";
  if (octets < 1024) return octets + " o";
  if (octets < 1024 * 1024) return (octets / 1024).toFixed(0) + " Ko";
  return (octets / (1024 * 1024)).toFixed(1) + " Mo";
}
async function renderFichiersClients() {
  const el = document.getElementById("files-by-client");
  const parContact = {};
  cache.fichiers_clients.forEach(f => {
    if (!parContact[f.contact_id]) parContact[f.contact_id] = [];
    parContact[f.contact_id].push(f);
  });
  const contactIds = Object.keys(parContact);
  if (!contactIds.length) {
    el.innerHTML = `<div class="page-note">Aucun fichier envoyé par un client pour l'instant.</div>`;
    return;
  }
  el.innerHTML = contactIds.map(cid => {
    const contact = findContact(Number(cid));
    const fichiers = parContact[cid].sort((a, b) => b.id - a.id);
    return `
    <div class="files-client-group">
      <h4>${contactLabel(contact)}</h4>
      ${fichiers.map(f => `
        <div class="file-row">
          <div>
            <div class="fr-name">${escapeAttr(f.nom_fichier)}</div>
            <div class="fr-meta">${formatTailleAdmin(f.taille_octets)} — ${f.date_creation ? f.date_creation.slice(0, 10).split("-").reverse().join("/") : ""}</div>
          </div>
          <button class="btn" onclick="telechargerFichierAdmin('${f.chemin}')">Télécharger</button>
        </div>`).join("")}
    </div>`;
  }).join("");
}
async function telechargerFichierAdmin(chemin) {
  const { data, error } = await sb.storage.from("photos-clients").createSignedUrl(chemin, 60);
  if (error) { showToast("Fichier introuvable"); return; }
  window.open(data.signedUrl, "_blank");
}

// ========================================================================
//  PAIEMENTS — factures impayées + abonnements récurrents
// ========================================================================
function renderPaiements() {
  const today = new Date().toISOString().slice(0, 10);
  const addDays = (iso, days) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };

  const impayees = cache.factures
    .filter(f => f.statut !== "Payée" && f.statut !== "Annulée")
    .sort((a, b) => (a.date_echeance || "9999").localeCompare(b.date_echeance || "9999"));

  const tbody = document.getElementById("paiements-tbody");
  tbody.innerHTML = impayees.length ? impayees.map(f => {
    const contact = findContact(f.contact_id);
    let flagClass = "payments-flag-ok", flagText = f.date_echeance ? f.date_echeance.slice(0, 10).split("-").reverse().join("/") : "—";
    if (f.date_echeance) {
      if (f.date_echeance < today) { flagClass = "payments-flag-late"; flagText = "En retard — " + flagText; }
      else if (f.date_echeance <= addDays(today, 7)) { flagClass = "payments-flag-soon"; flagText = "Bientôt — " + flagText; }
    }
    return `<tr>
      <td>${contactLabel(contact)}</td>
      <td>${escapeAttr(f.numero || "—")}</td>
      <td>${f.montant_ttc ? Number(f.montant_ttc).toFixed(2) + " €" : "—"}</td>
      <td class="${flagClass}">${flagText}</td>
      <td>${statusSelectInline("factures", f.id, f.statut, ["Envoyée", "Payée", "En retard", "Annulée"], STATUT_COLORS, "statut")}</td>
    </tr>`;
  }).join("") : `<tr class="empty-row"><td colspan="5">Aucune facture impayée 🎉</td></tr>`;

  const recurrents = cache.evenements.filter(e => e.facturation_recurrente);
  const recTbody = document.getElementById("recurrents-tbody");
  recTbody.innerHTML = recurrents.length ? recurrents
    .sort((a, b) => (a.prochaine_facturation || "9999").localeCompare(b.prochaine_facturation || "9999"))
    .map(e => {
      const contact = findContact(e.contact_id);
      let flagClass = "payments-flag-ok";
      if (e.prochaine_facturation) {
        if (e.prochaine_facturation < today) flagClass = "payments-flag-late";
        else if (e.prochaine_facturation <= addDays(today, 7)) flagClass = "payments-flag-soon";
      }
      return `<tr>
        <td>${contactLabel(contact)}</td>
        <td>${escapeAttr(eventLabel(e))}</td>
        <td>${e.montant_recurrent ? Number(e.montant_recurrent).toFixed(2) + " €" : "—"}</td>
        <td>${escapeAttr(e.frequence_facturation || "—")}</td>
        <td class="${flagClass}">${e.prochaine_facturation ? e.prochaine_facturation.slice(0, 10).split("-").reverse().join("/") : "—"}</td>
      </tr>`;
    }).join("") : `<tr class="empty-row"><td colspan="5">Aucun abonnement récurrent</td></tr>`;
}

// ========================================================================
//  TARIFICATION (grille tarifaire)
// ========================================================================
const TARIF_CAT_COLORS = { "Prestation": "var(--accent)", "Option / Supplément": "var(--tertiary)" };
let grilleCatFilter = "";
function bindGrilleCatTabs() {
  const wrap = document.getElementById("grille-cat-tabs");
  if (!wrap || wrap.dataset.bound) return;
  wrap.dataset.bound = "1";
  wrap.querySelectorAll(".cat-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      grilleCatFilter = btn.dataset.cat;
      wrap.querySelectorAll(".cat-tab").forEach(b => b.classList.toggle("active", b === btn));
      renderGrille();
    });
  });
}
function renderGrille() {
  bindSearch("grille-search", renderGrille);
  bindGrilleCatTabs();
  const search = (document.getElementById("grille-search").value || "").toLowerCase();
  let rows = [...cache.grille_tarifaire];
  if (grilleCatFilter) rows = rows.filter(g => (g.categorie || "Prestation") === grilleCatFilter);
  if (search) rows = rows.filter(g => ((g.nom_presta || "") + " " + (g.details || "")).toLowerCase().includes(search));
  rows.sort((a, b) => (a.categorie || "Prestation").localeCompare(b.categorie || "Prestation") || (a.nom_presta || "").localeCompare(b.nom_presta || ""));
  const tbody = document.getElementById("grille-tbody");
  tbody.innerHTML = rows.length ? rows.map(g => {
    const cat = g.categorie || "Prestation";
    const mode = g.mode_paiement || "Paiement unique";
    return `<tr>
      <td>${statusSelectInline("grille_tarifaire", g.id, cat, CATEGORIES_TARIF, TARIF_CAT_COLORS, "categorie")}</td>
      <td>${g.nom_presta || "—"}</td>
      <td>${statusSelectInline("grille_tarifaire", g.id, mode, MODES_PAIEMENT, MODE_PAIEMENT_COLORS, "mode_paiement")}</td>
      <td><strong>${g.pu_ttc != null ? g.pu_ttc + " €" : "—"}</strong><span style="color:var(--muted);font-weight:normal;">${modePaiementSuffix(mode)}</span></td>
      <td class="row-actions"><button onclick="openGrilleDialog(${g.id})">✎</button><button onclick="confirmDelete('grille_tarifaire', ${g.id}, renderGrille)">🗑</button></td>
    </tr>`;
  }).join("") : `<tr class="empty-row"><td colspan="5">Aucune prestation — ajoute ta première ligne</td></tr>`;
}
function openGrilleDialog(id, defaultCategorie) {
  const row = id ? findGrille(id) : {};
  openModal({
    title: id ? "Modifier la prestation" : "Nouvelle prestation", table: "grille_tarifaire", id,
    fields: [
      { key: "categorie", label: "Catégorie", type: "radioset", options: CATEGORIES_TARIF, colors: TARIF_CAT_COLORS, value: row.categorie || defaultCategorie || "Prestation" },
      { key: "nom_presta", label: "Nom de la prestation / option", type: "text", required: true, value: row.nom_presta },
      { key: "mode_paiement", label: "Mode de paiement", type: "radioset", options: MODES_PAIEMENT, colors: MODE_PAIEMENT_COLORS, value: row.mode_paiement || "Paiement unique" },
      { key: "pu_ttc", label: "Prix (€)", type: "number", value: row.pu_ttc },
    ],
    beforeSave: (v) => { v.pu_ht = v.pu_ttc; v.tva = 0; v.montant_tva = 0; },
    onSaved: refreshAll,
  });
}

// ========================================================================
//  CALENDRIER
// ========================================================================
const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DOW_FR = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
// ========================================================================
//  TEMPS PASSÉ
// ========================================================================
// ========================================================================
//  CHRONOMÈTRE (temps passé)
// ========================================================================
const CHRONO_KEY = "pcw_chrono_state";
function getChronoState() {
  try { return JSON.parse(localStorage.getItem(CHRONO_KEY)); } catch (e) { return null; }
}
function setChronoState(state) {
  if (state) localStorage.setItem(CHRONO_KEY, JSON.stringify(state)); else localStorage.removeItem(CHRONO_KEY);
}
function fmtHMS(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}
function tickChrono() {
  const st = getChronoState();
  const indicator = document.getElementById("chrono-indicator");
  const appVisible = document.getElementById("app-screen") && document.getElementById("app-screen").style.display === "block";
  const running = !!(st && st.running && appVisible);
  if (indicator) {
    indicator.style.display = running ? "flex" : "none";
    if (running) indicator.querySelector(".ci-time").textContent = fmtHMS(Date.now() - st.startTime);
  }
  const disp = document.getElementById("chrono-display");
  if (disp) {
    const btn = document.getElementById("chrono-toggle-btn");
    const note = document.getElementById("chrono-running-note");
    const sel = document.getElementById("chrono-projet");
    if (running) {
      disp.textContent = fmtHMS(Date.now() - st.startTime);
      btn.textContent = "⏹ Arrêter"; btn.classList.add("danger");
      sel.disabled = true; if (st.evenementId) sel.value = st.evenementId;
      const e = st.evenementId ? findEvenement(Number(st.evenementId)) : null;
      note.style.display = "block";
      note.textContent = "Démarré à " + new Date(st.startTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) + (e ? " sur : " + eventLabel(e) : " (aucun projet précisé)");
    } else {
      disp.textContent = "00:00:00";
      btn.textContent = "▶ Démarrer"; btn.classList.remove("danger");
      sel.disabled = false; note.style.display = "none";
    }
  }
}
function toggleChrono() {
  const st = getChronoState();
  if (st && st.running) {
    const elapsedMs = Date.now() - st.startTime;
    const hours = round2(elapsedMs / 3600000);
    const evId = st.evenementId ? Number(st.evenementId) : null;
    setChronoState(null);
    tickChrono();
    if (hours < 0.01) { showToast("Chrono arrêté — durée trop courte pour être enregistrée"); return; }
    openTempsDialog(null, evId);
    setTimeout(() => { const el = document.querySelector('#modal-form [name="duree_heures"]'); if (el) el.value = hours; }, 30);
  } else {
    const sel = document.getElementById("chrono-projet");
    setChronoState({ evenementId: sel ? sel.value : null, startTime: Date.now(), running: true });
    tickChrono();
    showToast("Chrono démarré");
  }
}

function renderTemps() {
  ensureFilterOptions("chrono-projet", cache.evenements.map(e => ({ value: e.id, label: eventLabel(e) })));
  tickChrono();
  ensureFilterOptions("temps-filter-projet", cache.evenements.map(e => ({ value: e.id, label: eventLabel(e) })));
  const fProjet = document.getElementById("temps-filter-projet").value;
  let rows = [...cache.temps_passe].sort((a, b) => (b.date_travail || "").localeCompare(a.date_travail || ""));
  if (fProjet) rows = rows.filter(t => String(t.evenement_id) === String(fProjet));

  const totalH = round2(rows.reduce((s, t) => s + Number(t.duree_heures || 0), 0));
  document.getElementById("temps-summary").innerHTML = `
    <div class="stat-card"><div class="stat-icon-wrap" style="background:var(--accent);color:#fff;"><svg><use href="#icon-stopwatch"></use></svg></div><div class="num">${totalH} h</div><div class="label">Total ${fProjet ? "sur ce projet" : "toutes saisies"}</div></div>
    <div class="stat-card"><div class="stat-icon-wrap" style="background:var(--tertiary);color:#fff;"><svg><use href="#icon-list"></use></svg></div><div class="num">${rows.length}</div><div class="label">Saisie(s)</div></div>`;

  const tbody = document.getElementById("temps-tbody");
  tbody.innerHTML = rows.length ? rows.map(t => {
    const e = t.evenement_id ? findEvenement(t.evenement_id) : null;
    const c = t.contact_id ? findContact(t.contact_id) : (e ? findContact(e.contact_id) : null);
    return `<tr>
      <td>${fmtDateFR(t.date_travail) || "—"}</td>
      <td>${e ? eventLabel(e) : "—"}</td>
      <td>${c ? contactLabel(c) : "—"}</td>
      <td><strong>${t.duree_heures != null ? t.duree_heures + " h" : "—"}</strong></td>
      <td>${t.description || "—"}</td>
      <td class="row-actions"><button onclick="openTempsDialog(${t.id})">✎</button><button onclick="confirmDelete('temps_passe', ${t.id}, renderTemps)">🗑</button></td>
    </tr>`;
  }).join("") : `<tr class="empty-row"><td colspan="6">Aucune saisie de temps</td></tr>`;
}
function openTempsDialog(id, defaultEvenementId) {
  const row = id ? cache.temps_passe.find(t => t.id === id) : {};
  openModal({
    title: id ? "Modifier la saisie" : "Saisir du temps", table: "temps_passe", id,
    fields: [
      { key: "date_travail", label: "Date", type: "date", value: row.date_travail || todayStr() },
      { key: "evenement_id", label: "Projet", type: "select-raw", optionsHtml: `<option value="">—</option>` + evenementOptionsHtml(row.evenement_id || defaultEvenementId), value: row.evenement_id || defaultEvenementId, numeric: true },
      { key: "duree_heures", label: "Durée (heures, ex. 1.5)", type: "number", required: true, value: row.duree_heures },
      { key: "description", label: "Description", type: "textarea", value: row.description },
    ],
    onRender: (form) => {
      form.elements["evenement_id"].addEventListener("change", () => {
        const e = findEvenement(Number(form.elements["evenement_id"].value));
        row.contact_id = e ? e.contact_id : null;
      });
    },
    beforeSave: (v) => { const e = v.evenement_id ? findEvenement(Number(v.evenement_id)) : null; v.contact_id = e ? e.contact_id : null; },
    onSaved: refreshAll,
  });
}

const CAL_TYPE_COLORS = { "Projet": "var(--success)", "RDV": "var(--tertiary)", "Devis": "var(--info)", "Facture": "var(--warning)", "Tâche": "var(--danger)" };
function collectCalendarItems() {
  const items = [];
  cache.evenements.filter(e => e.date_fin).forEach(e => items.push({ date: e.date_fin, type: "Projet", label: eventLabel(e), fn: `openEvenementDialog(${e.id})` }));
  cache.rdv.filter(r => r.date_rdv).forEach(r => items.push({ date: r.date_rdv, type: "RDV", label: (r.heure ? r.heure + " · " : "") + (r.objet || "RDV") + " — " + contactLabel(findContact(r.contact_id)), fn: `openRdvDialog(${r.id})` }));
  cache.devis.filter(d => ["En attente", "Envoyé"].includes(d.statut)).forEach(d => {
    const val = d.date_validite || (d.date_creation ? addDaysISO(d.date_creation.slice(0, 10), 30) : null);
    if (val) items.push({ date: val, type: "Devis", label: "Expire : " + (d.numero || "—") + " — " + contactLabel(devisContact(d)), fn: `openDevisEditor(${d.id})` });
  });
  cache.factures.filter(f => f.date_echeance && !["Payée", "Annulée"].includes(f.statut)).forEach(f => {
    items.push({ date: f.date_echeance, type: "Facture", label: (f.numero || "—") + " à régler — " + contactLabel(findContact(f.contact_id)), fn: `openFactureDialog(${f.id})` });
  });
  cache.todos.filter(t => t.statut !== "Terminé" && t.date_echeance).forEach(t => {
    items.push({ date: t.date_echeance, type: "Tâche", label: t.titre, fn: `openTodoDialog(${t.id})` });
  });
  return items;
}
function renderCalendrier() {
  bindCalViewTabs();
  const { year, month } = calState;
  document.getElementById("cal-month-lbl").textContent = `${MOIS_FR[month - 1]} ${year}`;
  const allItems = collectCalendarItems();
  const eventsByDay = {};
  allItems.forEach(it => {
    if (!it.date) return;
    const [y, m, d] = it.date.split("-").map(Number);
    if (y === year && m === month) (eventsByDay[d] = eventsByDay[d] || []).push(it);
  });
  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayIso = todayStr();
  let html = DOW_FR.map(d => `<div class="cal-dow">${d}</div>`).join("");
  for (let i = 0; i < firstDow; i++) html += `<div class="cal-cell empty"></div>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isToday = iso === todayIso, isSelected = iso === calState.selected;
    const n = eventsByDay[day] ? eventsByDay[day].length : 0;
    html += `<div class="cal-cell ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}" onclick="selectCalDay('${iso}')"><div>${day}</div>${n ? `<div class="evt-dot">● ${n} échéance${n > 1 ? "s" : ""}</div>` : ""}</div>`;
  }
  document.getElementById("cal-grid").innerHTML = html;
  if (!calState.selected || !calState.selected.startsWith(`${year}-${String(month).padStart(2, "0")}`)) {
    calState.selected = (month === new Date().getMonth() + 1 && year === new Date().getFullYear()) ? todayIso : null;
  }
  renderCalDay();
}
function selectCalDay(iso) { calState.selected = iso; renderCalendrier(); }
function renderCalDay() {
  const lbl = document.getElementById("cal-day-lbl"), tbody = document.getElementById("cal-day-tbody");
  if (!calState.selected) { lbl.textContent = "Échéances du jour"; tbody.innerHTML = `<tr class="empty-row"><td colspan="2">Sélectionne un jour</td></tr>`; return; }
  lbl.textContent = "Échéances du " + fmtDateFR(calState.selected);
  const rows = collectCalendarItems().filter(it => it.date === calState.selected);
  tbody.innerHTML = rows.length ? rows.map(it => `<tr onclick="${it.fn}" style="cursor:pointer;"><td>${badge(it.type, CAL_TYPE_COLORS[it.type] || "var(--muted)")}</td><td>${it.label}</td></tr>`).join("") : `<tr class="empty-row"><td colspan="2">Rien à cette date — clique sur un jour marqué d'un point</td></tr>`;
}

// ========================================================================
//  MODAL GENERIQUE
// ========================================================================
function escapeAttr(v) { return String(v).replace(/"/g, "&quot;"); }

// Filtres/recherches par table — remis à zéro après une création pour
// garantir que le nouvel élément soit visible (sinon un filtre actif,
// ex. "Envoyée", masquerait une nouvelle facture "Brouillon").
const PAGE_FILTERS = {
  factures: ["facture-filter-statut", "facture-search"],
  devis: ["devis-filter-statut", "devis-search"],
  contacts: ["contact-filter-categorie", "contact-search"],
  evenements: ["evenement-filter-type", "evenement-filter-mois", "evenement-filter-statut"],
  todos: ["todo-filter-statut", "todo-filter-priorite"],
  rdv: ["rdv-filter-statut"],
  grille_tarifaire: ["grille-search"],
  prospects: ["prospect-filter-statut"],
  temps_passe: ["temps-filter-projet"],
};
function clearTableFilters(table) {
  (PAGE_FILTERS[table] || []).forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  if (table === "grille_tarifaire") {
    grilleCatFilter = "";
    const wrap = document.getElementById("grille-cat-tabs");
    if (wrap) wrap.querySelectorAll(".cat-tab").forEach(b => b.classList.toggle("active", b.dataset.cat === ""));
  }
}
function openModal({ title, table, id, fields, onSaved, onRender, beforeSave }) {
  modalContext = { table, id, fields, onSaved, onRender, beforeSave };
  document.getElementById("modal-title").textContent = title;
  const form = document.getElementById("modal-form");
  form.innerHTML = fields.map(f => {
    let input;
    if (f.type === "select") {
      input = `<select name="${f.key}">${(f.options || []).map(o => `<option value="${o}" ${String(o) === String(f.value) ? "selected" : ""}>${o}</option>`).join("")}</select>`;
    } else if (f.type === "select-raw") {
      input = `<select name="${f.key}">${f.optionsHtml}</select>`;
    } else if (f.type === "select-other") {
      const opts = f.options || [];
      const isOther = f.value != null && f.value !== "" && !opts.includes(f.value);
      input = `<select name="${f.key}__sel">` +
        (f.allowEmpty !== false ? `<option value="">—</option>` : ``) +
        opts.map(o => `<option value="${escapeAttr(o)}" ${o === f.value ? "selected" : ""}>${o}</option>`).join("") +
        `<option value="__other__" ${isOther ? "selected" : ""}>Autre…</option></select>` +
        `<input name="${f.key}__txt" placeholder="Préciser…" value="${isOther ? escapeAttr(f.value) : ""}" style="margin-top:6px;${isOther ? "" : "display:none;"}">`;
    } else if (f.type === "radioset") {
      input = `<div class="inline-checks">` + (f.options || []).map(o => `<label>${f.colors && f.colors[o] ? `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${f.colors[o]};"></span>` : ""}<input type="checkbox" data-radio="${f.key}" name="${f.key}__${o}" ${f.value === o ? "checked" : ""}>${o}</label>`).join("") + `</div>`;
    } else if (f.type === "checklist") {
      const selected = (f.value || "").split(",").map(s => s.trim()).filter(Boolean);
      input = `<div class="inline-checks">` + (f.options || []).map(o => `<label><input type="checkbox" name="${f.key}__${escapeAttr(o)}" ${selected.includes(o) ? "checked" : ""}>${o}</label>`).join("") + `</div>`;
    } else if (f.type === "options-picker") {
      input = `<input type="hidden" name="${f.key}" value="${f.value != null ? escapeAttr(f.value) : ""}"><div id="options-ui" style="margin-top:2px;"></div>`;
    } else if (f.type === "textarea") {
      input = `<textarea name="${f.key}">${f.value || ""}</textarea>`;
    } else if (f.type === "checkbox") {
      input = `<input type="checkbox" name="${f.key}" ${f.value ? "checked" : ""} style="width:auto;">`;
    } else if (f.type === "file") {
      input = `<input type="file" name="${f.key}" accept="${f.accept || "*"}">`;
    } else if (f.type === "computed") {
      input = `<input type="number" name="${f.key}" value="${f.value != null ? escapeAttr(f.value) : ""}" readonly style="background:#F3F2EE;color:var(--muted);">`;
    } else {
      input = `<input type="${f.type}" name="${f.key}" ${f.list ? `list="${f.list}"` : ""} ${f.placeholder ? `placeholder="${escapeAttr(f.placeholder)}"` : ""} value="${f.value != null ? escapeAttr(f.value) : ""}" ${f.required ? "required" : ""}>`;
    }
    return `<div class="field"><label>${f.label}${f.required ? " *" : ""}</label>${input}</div>`;
  }).join("");

  // select-other : bascule du champ texte
  form.querySelectorAll('select[name$="__sel"]').forEach(sel => {
    sel.addEventListener("change", () => {
      const txt = form.elements[sel.name.replace("__sel", "__txt")];
      if (txt) txt.style.display = sel.value === "__other__" ? "" : "none";
    });
  });
  // radioset : comportement bouton radio
  form.querySelectorAll('input[data-radio]').forEach(cb => {
    cb.addEventListener("change", () => {
      if (cb.checked) form.querySelectorAll(`input[data-radio="${cb.dataset.radio}"]`).forEach(o => { if (o !== cb) o.checked = false; });
    });
  });

  document.getElementById("modal-save").style.display = "inline-block";
  document.getElementById("modal-save").onclick = saveModal;
  document.getElementById("modal-cancel").textContent = "Annuler";
  document.getElementById("modal-delete").style.display = id ? "inline-block" : "none";
  document.getElementById("modal-overlay").classList.add("open");
  if (onRender) onRender(form);
}
// Modal "brut" avec html custom + un bouton de confirmation
function openRawModal(title, html, onConfirm) {
  modalContext = null;
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-form").innerHTML = html;
  document.getElementById("modal-delete").style.display = "none";
  document.getElementById("modal-cancel").textContent = "Annuler";
  const save = document.getElementById("modal-save");
  save.style.display = "inline-block"; save.textContent = "Valider"; save.onclick = onConfirm;
  document.getElementById("modal-overlay").classList.add("open");
}
function showInfoModal(title, html) {
  modalContext = null;
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-form").innerHTML = html;
  document.getElementById("modal-save").style.display = "none";
  document.getElementById("modal-delete").style.display = "none";
  document.getElementById("modal-cancel").textContent = "Fermer";
  document.getElementById("modal-overlay").classList.add("open");
}
function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
  document.getElementById("modal-save").textContent = "Enregistrer";
  document.getElementById("modal-save").onclick = saveModal;
  modalContext = null;
}
async function saveModal() {
  if (!modalContext) return;
  const { table, id, fields, onSaved, beforeSave } = modalContext;
  const form = document.getElementById("modal-form");
  const values = {}; const fileFields = []; let missingRequired = false;
  fields.forEach(f => {
    if (f.type === "file") { fileFields.push({ f, el: form.elements[f.key] }); return; }
    if (f.type === "select-other") {
      const sel = form.elements[f.key + "__sel"], txt = form.elements[f.key + "__txt"];
      values[f.key] = sel.value === "__other__" ? (txt.value || null) : (sel.value || null);
      return;
    }
    if (f.type === "radioset") {
      let picked = null; (f.options || []).forEach(o => { const el = form.elements[f.key + "__" + o]; if (el && el.checked) picked = o; });
      values[f.key] = picked; return;
    }
    if (f.type === "checklist") {
      const picked = (f.options || []).filter(o => form.elements[f.key + "__" + o] && form.elements[f.key + "__" + o].checked);
      values[f.key] = picked.join(", "); return;
    }
    const el = form.elements[f.key]; if (!el) return;
    if (f.type === "checkbox") { values[f.key] = el.checked; return; }
    let val = el.value;
    if (f.required && !val) missingRequired = true;
    if (val === "") val = null;
    if (val !== null && (f.type === "number" || f.type === "computed" || f.numeric)) val = Number(val);
    values[f.key] = val;
  });
  if (missingRequired) { showToast("Merci de remplir les champs obligatoires"); return; }
  if (beforeSave) {
    const result = await beforeSave(values);
    if (result === false) return;
  }

  let saved;
  if (id) saved = await updateRow(table, id, values);
  else saved = await insertRow(table, values);

  // Échec : l'erreur réelle a déjà été affichée ; on garde le formulaire ouvert.
  if (!saved) return;

  // Après une création, on enlève les filtres actifs pour que le nouvel élément soit visible
  if (!id) clearTableFilters(table);

  for (const { f, el } of fileFields) {
    if (el && el.files && el.files[0]) {
      const path = `${currentUser.id}/${table}-${saved.id}.pdf`;
      const { error } = await sb.storage.from("devis-signes").upload(path, el.files[0], { upsert: true, contentType: "application/pdf" });
      if (error) { showToast("Erreur envoi PDF"); console.error(error); }
      else await updateRow(table, saved.id, { pdf_path: path });
    }
  }
  showToast(id ? "Modifications enregistrées" : "Ajouté avec succès");
  closeModal();
  if (onSaved) await onSaved(saved);
}
function confirmDelete(table, id, afterFn) {
  if (!confirm("Supprimer cet élément ? Cette action est irréversible.")) return;
  deleteRow(table, id).then(async ok => {
    if (ok) { showToast("Supprimé"); await refreshCache(); if (afterFn) afterFn(); else renderPage(currentPage); }
  });
}

// ========================================================================
//  INIT
// ========================================================================
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("pcw_theme", theme);
  const use = document.querySelector("#theme-toggle-icon use");
  const label = document.getElementById("theme-toggle-label");
  if (use) use.setAttribute("href", theme === "dark" ? "#icon-sun" : "#icon-moon");
  if (label) label.textContent = theme === "dark" ? "Mode clair" : "Mode sombre";
}
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  applyTheme(current === "dark" ? "light" : "dark");
}
document.addEventListener("DOMContentLoaded", () => {
  // Priorité absolue : la navigation doit toujours fonctionner, même si
  // une autre fonctionnalité plus bas plante à l'initialisation.
  document.getElementById("menu-toggle-btn").addEventListener("click", openMobileMenu);
  document.getElementById("sidebar-collapse-btn").addEventListener("click", toggleDesktopSidebar);
  if (localStorage.getItem("pcw_sidebar_collapsed") === "1") document.getElementById("sidebar").classList.add("collapsed");
  document.getElementById("sidebar-overlay").addEventListener("click", closeMobileMenu);
  document.querySelectorAll(".nav-item").forEach(el => el.addEventListener("click", () => showPage(el.dataset.page)));

  try {

  try { applyTheme(localStorage.getItem("pcw_theme") || "light"); } catch (e) { console.error("applyTheme", e); }
  document.getElementById("theme-toggle-btn").addEventListener("click", toggleTheme);
  try { wrapTablesForScroll(); } catch (e) { console.error("wrapTablesForScroll", e); }
  try { initSwipeGestures(); } catch (e) { console.error("initSwipeGestures", e); }
  document.getElementById("global-search-input").addEventListener("input", (e) => runGlobalSearch(e.target.value));
  document.getElementById("notif-bell-btn").addEventListener("click", (e) => { e.stopPropagation(); toggleNotifPanel(); });
  document.addEventListener("click", (e) => {
    const wrap = document.querySelector(".global-search-wrap");
    if (wrap && !wrap.contains(e.target)) document.getElementById("global-search-results").classList.remove("open");
    const notifWrap = document.getElementById("notif-wrap");
    if (notifWrap && !notifWrap.contains(e.target)) document.getElementById("notif-panel").classList.remove("open");
  });
  document.getElementById("auth-submit").addEventListener("click", handleAuthSubmit);
  document.getElementById("auth-switch-link").addEventListener("click", () => setAuthMode(authMode === "login" ? "signup" : "login"));
  document.getElementById("auth-forgot-link").addEventListener("click", () => setAuthMode("reset-request"));
  document.getElementById("auth-back-login-link").addEventListener("click", () => setAuthMode("login"));
  document.getElementById("auth-password").addEventListener("keydown", e => { if (e.key === "Enter") handleAuthSubmit(); });
  document.getElementById("auth-password2").addEventListener("keydown", e => { if (e.key === "Enter") handleAuthSubmit(); });
  document.getElementById("auth-email").addEventListener("keydown", e => { if (e.key === "Enter" && authMode === "reset-request") handleAuthSubmit(); });
  document.getElementById("logout-btn").addEventListener("click", handleLogout);
  document.getElementById("google-connect-btn").addEventListener("click", startGoogleConnect);
  document.getElementById("btn-send-relance").addEventListener("click", sendRelanceFromForm);
  document.getElementById("btn-refresh-google-cal").addEventListener("click", loadGoogleCalendarList);
  document.getElementById("btn-new-google-event").addEventListener("click", () => openRdvDialog(null));
  document.getElementById("messages-send-btn").addEventListener("click", sendAdminMessage);
  document.getElementById("messages-input").addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAdminMessage(); }
  });
  document.getElementById("demande-filter-priorite").addEventListener("change", renderDemandes);
  document.getElementById("demande-filter-statut").addEventListener("change", renderDemandes);

  document.getElementById("sc-devis").addEventListener("click", () => openDevisDialog(null));
  document.getElementById("sc-facture").addEventListener("click", () => openFactureDialog(null));
  document.getElementById("sc-contact").addEventListener("click", () => openContactDialog(null));
  document.getElementById("sc-evenement").addEventListener("click", () => openEvenementDialog(null));
  document.getElementById("sc-rdv").addEventListener("click", () => openRdvDialog(null));
  document.getElementById("sc-todo").addEventListener("click", () => openTodoDialog(null));

  document.getElementById("btn-new-todo").addEventListener("click", () => openTodoDialog(null));
  document.getElementById("btn-new-temps").addEventListener("click", () => openTempsDialog(null));
  document.getElementById("chrono-toggle-btn").addEventListener("click", toggleChrono);
  setInterval(tickChrono, 1000);
  tickChrono();
  document.getElementById("btn-new-prospect").addEventListener("click", () => openEvenementDialog(null));
  document.getElementById("btn-new-devis").addEventListener("click", () => openDevisDialog(null));
  document.getElementById("btn-cgv-manager").addEventListener("click", openCgvManagerDialog);
  document.getElementById("btn-export-devis").addEventListener("click", exportDevisCSV);
  document.getElementById("btn-new-facture").addEventListener("click", () => openFactureDialog(null));
  document.getElementById("btn-export-factures").addEventListener("click", exportFacturesCSV);
  document.getElementById("btn-new-contact").addEventListener("click", () => openContactDialog(null));
  document.getElementById("btn-new-evenement").addEventListener("click", () => openEvenementDialog(null));
  document.getElementById("btn-new-rdv").addEventListener("click", () => openRdvDialog(null));
  document.getElementById("btn-new-grille").addEventListener("click", () => openGrilleDialog(null, "Prestation"));
  document.getElementById("btn-new-grille-option").addEventListener("click", () => openGrilleDialog(null, "Option / Supplément"));

  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  // NB : le bouton "Enregistrer" utilise la propriété onclick (définie dans openModal/
  // openRawModal) pour pouvoir changer d'action selon le contexte — pas d'addEventListener ici.
  document.getElementById("modal-delete").addEventListener("click", () => {
    if (modalContext && modalContext.id) { confirmDelete(modalContext.table, modalContext.id, () => renderPage(currentPage)); closeModal(); }
  });
  document.getElementById("modal-overlay").addEventListener("click", e => { if (e.target.id === "modal-overlay") closeModal(); });

  // éditeur de devis
  document.getElementById("ed-add-line").addEventListener("click", addEditorLine);
  document.getElementById("ed-close").addEventListener("click", closeDevisEditor);
  document.getElementById("ed-save").addEventListener("click", () => saveDevisEditor(false));
  document.getElementById("ed-view").addEventListener("click", () => { readEditorToState(); generateDevisPDF(edState.id, "preview"); });
  document.getElementById("ed-pdf").addEventListener("click", () => { readEditorToState(); generateDevisPDF(edState.id); });
  document.getElementById("ed-finaliser").addEventListener("click", openCgvPicker);
  document.getElementById("ed-lines").addEventListener("input", () => { readEditorToState(); recomputeEditor(); });
  document.getElementById("ed-lines").addEventListener("change", (e) => {
    if (e.target.dataset.k === "designation-picker") {
      readEditorToState();
      const tr = e.target.closest("tr"); const i = Number(tr.dataset.i);
      const val = e.target.value;
      if (val === "__custom__") {
        renderEditorLines();
        const input = document.querySelector(`#ed-lines tr[data-i="${i}"] input[data-k="designation"]`);
        if (input) input.focus();
        return;
      }
      if (!val) return;
      const g = cache.grille_tarifaire.find(x => (x.nom_presta || "") === val);
      edState.lignes[i].designation = val;
      if (g) edState.lignes[i].mode_paiement = g.mode_paiement || "Paiement unique";
      if (g && g.pu_ttc != null) edState.lignes[i].pu_ttc = g.pu_ttc;
      renderEditorLines();
    } else if (e.target.dataset.k === "designation") {
      const tr = e.target.closest("tr"); const i = Number(tr.dataset.i);
      const g = cache.grille_tarifaire.find(x => (x.nom_presta || "").toLowerCase() === e.target.value.toLowerCase());
      if (g && g.pu_ttc != null) { edState.lignes[i].pu_ttc = g.pu_ttc; renderEditorLines(); }
    }
  });

  document.getElementById("cal-prev").addEventListener("click", () => { calState.month--; if (calState.month < 1) { calState.month = 12; calState.year--; } calState.selected = null; renderCalendrier(); });
  document.getElementById("cal-next").addEventListener("click", () => { calState.month++; if (calState.month > 12) { calState.month = 1; calState.year++; } calState.selected = null; renderCalendrier(); });

  document.addEventListener("keydown", e => {
    if (!currentUser) return;
    if (e.ctrlKey && e.key === "d") { e.preventDefault(); openDevisDialog(null); }
    if (e.ctrlKey && e.key === "k") { e.preventDefault(); openContactDialog(null); }
    if (e.ctrlKey && e.key === "e") { e.preventDefault(); openEvenementDialog(null); }
    if (e.ctrlKey && e.key === "t") { e.preventDefault(); openTodoDialog(null); }
  });

  sb.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      document.getElementById("app-screen").style.display = "none";
      document.getElementById("auth-screen").style.display = "flex";
      setAuthMode("reset-confirm");
    }
  });
  sb.auth.getSession().then(({ data }) => { if (data.session) onLoggedIn(data.session.user); });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  } catch (e) { console.error("Erreur d'initialisation (non bloquante pour la navigation)", e); }
});
