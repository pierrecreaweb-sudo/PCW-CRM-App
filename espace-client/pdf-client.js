// ========================================================================
//  PCW — Génération PDF côté client (devis & factures)
//  Repris de la même charte graphique que l'app admin.
// ========================================================================

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
const MENTION_TVA = "TVA non applicable, art. 293 B du CGI";
const PDF_BRAND = [44, 150, 216];
const PDF_COLORS = { success: [63, 167, 114], danger: [217, 83, 79], muted: [136, 144, 160], warning: [217, 154, 43] };
const DEVIS_STAMPS = { "Accepté": ["ACCEPTÉ", PDF_COLORS.success], "Refusé": ["REFUSÉ", PDF_COLORS.danger], "Expiré": ["EXPIRÉ", PDF_COLORS.muted] };
const FACTURE_STAMPS = { "Payée": ["PAYÉE", PDF_COLORS.success], "En retard": ["EN RETARD", PDF_COLORS.danger], "Annulée": ["ANNULÉE", PDF_COLORS.muted] };

function pdfFmtDateFR(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
function pdfTodayStr() { return new Date().toISOString().slice(0, 10); }
function pdfAddDaysISO(iso, days) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function pdfRound2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function pdfComputeLine(l) {
  const qte = Number(l.qte || 0), pu = Number(l.pu_ttc || 0), remise = Number(l.remise || 0);
  return { total: pdfRound2(pu * qte * (1 - remise / 100)) };
}
function pdfModePaiementShort(m) { return m === "Paiement mensuel" ? "Mensuel" : m === "Paiement annuel" ? "Annuel" : "Unique"; }
function pdfLightenRgb(rgb, amt) { return rgb.map(c => Math.round(c + (255 - c) * amt)); }

let _pcwLogoDataUrl = null;
async function getLogoDataUrl() {
  if (_pcwLogoDataUrl) return _pcwLogoDataUrl;
  try {
    const resp = await fetch("../logo.png");
    const blob = await resp.blob();
    _pcwLogoDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) { console.error("Logo introuvable pour le PDF", e); }
  return _pcwLogoDataUrl;
}
function drawStamp(doc, text, rgb) {
  const light = pdfLightenRgb(rgb, 0.84);
  doc.setTextColor(light[0], light[1], light[2]);
  doc.setFontSize(54); doc.setFont(undefined, "bold");
  doc.text(text, 105, 168, { align: "center", angle: 25 });
  doc.setTextColor(0); doc.setFontSize(11); doc.setFont(undefined, "normal");
}
function drawPdfBand(doc, logo, title, tag) {
  doc.setFillColor(PDF_BRAND[0], PDF_BRAND[1], PDF_BRAND[2]);
  doc.rect(0, 0, 210, 36, "F");
  if (logo) { try { doc.addImage(logo, "PNG", 16, 7, 22, 22); } catch (e) { console.error(e); } }
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
function drawFooter(doc) {
  const h = doc.internal.pageSize.getHeight();
  doc.setFontSize(8); doc.setTextColor(120);
  const legal = `${EMETTEUR.nom} — ${EMETTEUR.adresse} — ${EMETTEUR.siret} — ${EMETTEUR.email} — Tél : ${EMETTEUR.telephone} — ${EMETTEUR.site}`;
  doc.text(doc.splitTextToSize(legal, 175), 105, h - 12, { align: "center" });
  doc.setTextColor(0); doc.setFontSize(11);
}
function pdfContactLines(contact) {
  const fullName = [contact.prenom, contact.nom].filter(Boolean).join(" ");
  return [fullName, contact.societe, contact.email, contact.telephone, contact.adresse].filter(Boolean).flatMap(l => String(l).split("\n"));
}

async function generateDevisPDF(d, contact, mode) {
  if (!window.jspdf) { alert("Générateur PDF indisponible (hors-ligne)."); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const logo = await getLogoDataUrl();
  drawPdfBand(doc, logo, "DEVIS");
  const stamp = DEVIS_STAMPS[d.statut];
  if (stamp) drawStamp(doc, stamp[0], stamp[1]);

  doc.setFontSize(10); doc.setTextColor(90);
  doc.text("N° : " + (d.numero || "—") + "     Date : " + pdfFmtDateFR(d.date_creation || pdfTodayStr()) + "     Valable jusqu'au : " + pdfFmtDateFR(d.date_validite || pdfAddDaysISO(pdfTodayStr(), 30)), 16, 45);
  doc.setTextColor(0);

  const clientLines = pdfContactLines(contact);
  const boxY = 51, boxH = clientLines.length * 5.6 + 12;
  drawInfoBox(doc, 16, boxY, 179, boxH);
  doc.setFontSize(9.5); doc.setTextColor(120); doc.text("CLIENT", 21, boxY + 8); doc.setTextColor(0);
  doc.setFontSize(10.5);
  let cy = boxY + 15;
  clientLines.forEach(l => { doc.text(String(l), 21, cy); cy += 5.6; });

  let y = boxY + boxH + 10;
  const lignes = Array.isArray(d.lignes) ? d.lignes : [];
  doc.setFillColor(PDF_BRAND[0], PDF_BRAND[1], PDF_BRAND[2]);
  doc.rect(16, y - 5, 179, 8, "F");
  doc.setFontSize(8.5); doc.setTextColor(255);
  doc.text("DÉSIGNATION", 20, y); doc.text("QTÉ", 108, y); doc.text("PU (€)", 124, y);
  doc.text("REM.", 142, y); doc.text("PAIEMENT", 156, y); doc.text("TOTAL (€)", 178, y);
  doc.setTextColor(0); doc.setFontSize(10); y += 8;
  let totalUnique = 0, totalMensuel = 0, totalAnnuel = 0, rowIndex = 0;
  lignes.forEach(l => {
    const r = pdfComputeLine(l);
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
    doc.text(pdfModePaiementShort(modeP), 156, y);
    doc.text(r.total.toFixed(2) + " €", 178, y);
    y += rowH; rowIndex++;
    if (y > 250) { doc.addPage(); y = 20; }
  });
  y += 3; doc.setDrawColor(210); doc.line(16, y, 195, y); doc.setDrawColor(0); y += 9;
  doc.setFontSize(13); doc.text("TOTAL UNIQUE : " + pdfRound2(totalUnique).toFixed(2) + " €", 108, y); y += 7;
  if (totalMensuel > 0) { doc.text("TOTAL MENSUEL : " + pdfRound2(totalMensuel).toFixed(2) + " € /mois", 108, y); y += 7; }
  if (totalAnnuel > 0) { doc.text("TOTAL ANNUEL : " + pdfRound2(totalAnnuel).toFixed(2) + " € /an", 108, y); y += 7; }
  doc.setFontSize(9); doc.setTextColor(90); doc.text(MENTION_TVA, 108, y); doc.setTextColor(0); y += 10;

  if (Array.isArray(d.cgv) && d.cgv.length) {
    doc.setFontSize(11); doc.text("Conditions générales de vente :", 20, y); y += 6;
    doc.setFontSize(10);
    d.cgv.forEach((c2, i) => { const t = doc.splitTextToSize((i + 1) + ". " + c2, 175); doc.text(t, 20, y); y += t.length * 5 + 1; if (y > 255) { doc.addPage(); y = 20; } });
  }
  drawFooter(doc);
  if (mode === "preview") window.open(doc.output("bloburl"), "_blank");
  else doc.save((d.numero || "devis").replace(/\s+/g, "_") + ".pdf");
}

async function generateFacturePDF(f, contact, devisRef, mode) {
  if (!window.jspdf) { alert("Générateur PDF indisponible (hors-ligne)."); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const montant = Number(f.montant_ttc || 0);
  const logo = await getLogoDataUrl();
  const factureTag = f.type_facture === "Facture d'acompte (30%)" ? "ACOMPTE 30%" : (f.type_facture === "Facture de solde" ? "SOLDE" : null);
  drawPdfBand(doc, logo, "FACTURE", factureTag);
  const stamp = FACTURE_STAMPS[f.statut];
  if (stamp) drawStamp(doc, stamp[0], stamp[1]);

  doc.setFontSize(10); doc.setTextColor(90);
  let infoLine = "N° : " + (f.numero || "—") + "     Date : " + pdfFmtDateFR(f.date_facture || pdfTodayStr());
  if (f.date_echeance) infoLine += "     Échéance : " + pdfFmtDateFR(f.date_echeance);
  if (devisRef) infoLine += "     Réf. devis : " + (devisRef.numero || ("#" + devisRef.id));
  if (f.type_facture && f.type_facture !== "Facture unique") infoLine += "     " + f.type_facture.toUpperCase();
  doc.text(infoLine, 16, 45);
  doc.setTextColor(0);

  const clientLines = pdfContactLines(contact);
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
      const r = pdfComputeLine(l);
      const modeP = l.mode_paiement || "Paiement unique";
      const desig = doc.splitTextToSize(l.designation || "—", 82);
      const rowH = Math.max(7, desig.length * 5);
      if (rowIndex % 2 === 0) { doc.setFillColor(247, 248, 252); doc.rect(16, y - 5, 179, rowH, "F"); }
      doc.text(desig, 20, y);
      doc.text(String(l.qte ?? ""), 108, y);
      doc.text(Number(l.pu_ttc || 0).toFixed(2), 124, y);
      doc.text((l.remise ? l.remise + "%" : "—"), 142, y);
      doc.text(pdfModePaiementShort(modeP), 156, y);
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
  if (mode === "preview") window.open(doc.output("bloburl"), "_blank");
  else doc.save((f.numero || "facture").replace(/\s+/g, "_") + ".pdf");
}
