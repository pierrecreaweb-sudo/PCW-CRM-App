// Fonction Supabase "send-push" — envoie les notifications push (Web Push)
// Appelée par les déclencheurs SQL (événements) et par pg_cron (rappels du matin).
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") || "mailto:pierre.creaweb@gmail.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

type Msg = { title: string; body: string; tag?: string };
const cut = (s: string, n = 110) => (s || "").length > n ? s.slice(0, n - 1) + "…" : (s || "");
const nameOf = (c: any) => c ? ([c.prenom, c.nom].filter(Boolean).join(" ") || c.societe || "Un client") : "Un client";
const fmt = (iso: string) => iso ? iso.split("-").reverse().join("/") : "";

async function contact(id: number) {
  const { data } = await sb.from("contacts").select("*").eq("id", id).maybeSingle();
  return data;
}

// Envoie à une liste d'abonnements ; supprime ceux qui ne sont plus valides
async function sendTo(subs: any[], msg: Msg, url: string) {
  const payload = JSON.stringify({ ...msg, url });
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from("push_subscriptions").delete().eq("id", s.id);
      else console.error("push error", e?.statusCode, e?.body);
    }
  }));
}

async function clientUserIds(): Promise<Set<string>> {
  const { data } = await sb.from("contacts").select("client_user_id").not("client_user_id", "is", null);
  return new Set((data || []).map((c: any) => c.client_user_id));
}
// Administrateur = tout abonné qui n'est PAS relié à une fiche contact client
async function notifyAdmin(msg: Msg) {
  const clients = await clientUserIds();
  const { data } = await sb.from("push_subscriptions").select("*");
  await sendTo((data || []).filter((s: any) => !clients.has(s.user_id)), msg, "./");
}
async function notifyClient(contactId: number, msg: Msg) {
  const c = await contact(contactId);
  if (!c?.client_user_id) return;
  const { data } = await sb.from("push_subscriptions").select("*").eq("user_id", c.client_user_id);
  await sendTo(data || [], msg, "./dashboard.html");
}

// ---- Regroupement des notifications de fichiers ----
const FENETRE_MIN = 5; // minutes : les fichiers envoyés dans cet intervalle = 1 seule notification
const ilYa = (min: number) => new Date(Date.now() - min * 60000).toISOString().slice(0, 16).replace("T", " ");
// Vrai si un autre fichier du même client et du même sens a été ajouté juste avant
async function suiteDeLot(r: any, admin: boolean) {
  let q = sb.from("fichiers_clients").select("id, date_creation").eq("contact_id", r.contact_id).lt("id", r.id)
    .gte("date_creation", ilYa(FENETRE_MIN)).limit(1);
  q = admin ? q.eq("envoye_par", "admin") : q.neq("envoye_par", "admin");
  const { data } = await q;
  return !!(data && data.length);
}
// Vrai si un projet vient d'être créé pour ce client depuis une commande du site
async function vientDUneCommande(contactId: number) {
  const { data } = await sb.from("evenements").select("id").eq("contact_id", contactId)
    .not("commande_site_id", "is", null).gte("date_creation", ilYa(15)).limit(1);
  return !!(data && data.length);
}

async function onEvent(table: string, type: string, r: any, old: any) {
  if (table === "messages" && type === "INSERT") {
    if (r.expediteur === "client") await notifyAdmin({ title: "Message de " + nameOf(await contact(r.contact_id)), body: cut(r.contenu), tag: "msg-" + r.contact_id });
    else await notifyClient(r.contact_id, { title: "Nouveau message de PCW", body: cut(r.contenu), tag: "msg" });
  }
  if (table === "demandes") {
    if (type === "INSERT") {
      if (r.sens === "admin") await notifyClient(r.contact_id, { title: "PCW te demande : " + r.titre, body: cut(r.description || ""), tag: "demande-" + r.id });
      else await notifyAdmin({ title: "Nouvelle demande" + (r.priorite === "Urgent" ? " URGENTE" : ""), body: nameOf(await contact(r.contact_id)) + " : " + cut(r.titre), tag: "demande-" + r.id });
    } else if (type === "UPDATE" && old && old.statut !== r.statut) {
      if (r.sens === "admin" && r.statut === "Traité") await notifyAdmin({ title: "Demande traitée par le client", body: cut(r.titre), tag: "demande-" + r.id });
      else if (r.sens !== "admin" && r.statut === "Traité") await notifyClient(r.contact_id, { title: "Demande traitée", body: "PCW a terminé : " + cut(r.titre), tag: "demande-" + r.id });
    }
  }
  if (table === "fichiers_clients" && type === "INSERT") {
    // Une seule notification par envoi groupé : on ignore les fichiers qui suivent
    // de près un autre fichier du même client (même sens), et ceux d'une commande
    // du site (la commande a déjà sa propre notification « Nouvelle commande »).
    if (r.envoye_par === "admin") {
      if (await suiteDeLot(r, true)) return;
      await notifyClient(r.contact_id, { title: "Nouveaux fichiers de PCW", body: cut(r.nom_fichier), tag: "fichiers-" + r.contact_id });
    } else {
      if (await suiteDeLot(r, false) || await vientDUneCommande(r.contact_id)) return;
      await notifyAdmin({ title: "Fichiers reçus", body: nameOf(await contact(r.contact_id)) + " : " + cut(r.nom_fichier), tag: "fichiers-" + r.contact_id });
    }
  }
  if (table === "devis" && old && old.statut !== r.statut) {
    const num = r.numero || "";
    if (r.statut === "Envoyé" && r.contact_id) await notifyClient(r.contact_id, { title: "Nouveau devis " + num, body: r.montant_ttc ? Number(r.montant_ttc).toFixed(2) + " € TTC — à consulter dans ton espace" : "À consulter dans ton espace", tag: "devis-" + r.id });
    if (r.statut === "Accepté") await notifyAdmin({ title: "Devis accepté 🎉 " + num, body: r.signature_nom ? "Signé par " + r.signature_nom : "Le client a accepté le devis", tag: "devis-" + r.id });
    if (r.statut === "Refusé") await notifyAdmin({ title: "Devis refusé " + num, body: "Le client a refusé le devis", tag: "devis-" + r.id });
  }
  if (table === "factures" && old && old.statut !== r.statut) {
    const num = r.numero || "";
    if (r.statut === "Envoyée" && r.contact_id) await notifyClient(r.contact_id, { title: "Nouvelle facture " + num, body: r.montant_ttc ? Number(r.montant_ttc).toFixed(2) + " € TTC" : "À consulter dans ton espace", tag: "facture-" + r.id });
    if (r.statut === "Payée") await notifyAdmin({ title: "Facture payée " + num, body: nameOf(await contact(r.contact_id)) + " · " + Number(r.montant_ttc || 0).toFixed(2) + " €", tag: "facture-" + r.id });
  }
  if (table === "factures" && type === "INSERT" && (r.notes || "").includes("générée automatiquement")) {
    await notifyAdmin({ title: "Facture d'abonnement générée", body: (r.numero || "") + " · " + nameOf(await contact(r.contact_id)), tag: "facture-" + r.id });
  }
}

// Rappels du matin : un seul résumé pour l'admin, un message par client concerné
async function daily() {
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const t0 = iso(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())));
  const plus = (n: number) => { const d = new Date(t0); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

  const [{ data: factures }, { data: todos }, { data: rdv }, { data: devis }] = await Promise.all([
    sb.from("factures").select("*").in("statut", ["Envoyée", "En retard"]),
    sb.from("todos").select("*").neq("statut", "Terminé").not("date_echeance", "is", null).lte("date_echeance", t0),
    sb.from("rdv").select("*").neq("statut", "Annulé").gte("date_rdv", t0).lte("date_rdv", plus(1)),
    sb.from("devis").select("*").in("statut", ["En attente", "Envoyé"]),
  ]);

  const lines: string[] = [];
  const retard = (factures || []).filter((f: any) => f.statut === "En retard" || (f.date_echeance && f.date_echeance < t0));
  const bientot = (factures || []).filter((f: any) => f.date_echeance && f.date_echeance >= t0 && f.date_echeance <= plus(3));
  if (retard.length) lines.push(retard.length + " facture(s) en retard");
  if (bientot.length) lines.push(bientot.length + " facture(s) bientôt échue(s)");
  const rToday = (rdv || []).filter((r: any) => r.date_rdv === t0), rTom = (rdv || []).filter((r: any) => r.date_rdv !== t0);
  if (rToday.length) lines.push(rToday.length + " RDV aujourd'hui" + (rToday[0].heure ? " (" + rToday[0].heure + ")" : ""));
  if (rTom.length) lines.push(rTom.length + " RDV demain");
  if ((todos || []).length) lines.push((todos || []).length + " tâche(s) à faire / en retard");
  const exp = (devis || []).filter((d: any) => { const v = d.date_validite; return v && v >= t0 && v <= plus(5); });
  if (exp.length) lines.push(exp.length + " devis bientôt expiré(s)");
  if (lines.length) await notifyAdmin({ title: "PCW — à faire aujourd'hui", body: lines.join(" · "), tag: "daily" });

  // Côté client : factures en retard ou à échéance sous 3 jours
  const byContact = new Map<number, any[]>();
  [...retard, ...bientot].forEach((f: any) => { if (f.contact_id) byContact.set(f.contact_id, [...(byContact.get(f.contact_id) || []), f]); });
  for (const [cid, fs] of byContact) {
    const uniq = [...new Map(fs.map((f: any) => [f.id, f])).values()];
    await notifyClient(cid, {
      title: uniq.some((f: any) => f.date_echeance < t0) ? "Facture en retard" : "Facture bientôt échue",
      body: uniq.map((f: any) => (f.numero || "") + (f.date_echeance ? " (échéance " + fmt(f.date_echeance) + ")" : "")).join(", "),
      tag: "daily-factures",
    });
  }
}

Deno.serve(async (req) => {
  if (req.headers.get("x-push-secret") !== Deno.env.get("PUSH_SECRET")) return new Response("forbidden", { status: 403 });
  try {
    const body = await req.json();
    if (body.type === "daily") await daily();
    else if (body.type === "commande") {
      // Envoyée par import-commande-site : UNE notification par commande du site
      const n = Number(body.nb_fichiers || 0);
      await notifyAdmin({
        title: "🟢 Nouvelle commande",
        body: cut([body.entreprise, body.formule, body.montant ? body.montant + " €" : "", n ? n + " fichier" + (n > 1 ? "s" : "") : ""].filter(Boolean).join(" · ")),
        tag: "commande-" + (body.commande_id || ""),
      });
    }
    else if (body.table) await onEvent(body.table, body.type, body.record || {}, body.old_record || null);
    return new Response("ok");
  } catch (e) {
    console.error(e);
    return new Response("error", { status: 500 });
  }
});
