import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { COMPANY, formatOrderNumber } from "@/lib/constants";
import { fmtTime, fmtTravel } from "@/lib/format";
import { DEFAULT_LANG, type Lang, localeOf, tFor } from "@/lib/i18n";
import { pickText } from "@/lib/i18n/content";
import type { RepairOrderWithNames, TranslatedField } from "@/lib/types";

const GREEN = "#00853E";
const INK = "#1a1a1a";
const MUTED = "#555555";
const RULE = "#9a9a9a";

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 44, paddingHorizontal: 44, fontFamily: "Helvetica", fontSize: 10, color: INK },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  title: { fontFamily: "Times-Bold", fontSize: 22, marginBottom: 2 },
  addr: { fontSize: 8.5, color: MUTED, lineHeight: 1.35 },
  logo: { width: 200, height: 46, objectFit: "contain" },
  orderNo: { fontFamily: "Helvetica-Bold", fontSize: 11, color: GREEN, marginTop: 4 },
  status: { fontSize: 8, color: MUTED, marginTop: 2 },

  row: { flexDirection: "row", marginBottom: 7 },
  field: { flexDirection: "row", alignItems: "flex-end", marginRight: 18 },
  label: { fontSize: 9.5, marginRight: 5 },
  value: { fontFamily: "Helvetica-Bold", fontSize: 10, borderBottomWidth: 0.8, borderBottomColor: INK, paddingBottom: 1.5, paddingHorizontal: 3, minWidth: 90 },

  sectionLabel: { fontSize: 10, marginTop: 10, marginBottom: 4 },
  box: { borderWidth: 0.8, borderColor: RULE, borderRadius: 2, padding: 7, minHeight: 60, lineHeight: 1.4, fontSize: 9.5 },
  boxText: { lineHeight: 1.4, fontSize: 9.5 },
  original: { marginTop: 5, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: RULE, fontSize: 8, color: MUTED, lineHeight: 1.35 },
  originalLabel: { fontFamily: "Helvetica-Oblique", fontSize: 7.5, color: MUTED, marginBottom: 1 },

  timesRow: { flexDirection: "row", marginTop: 12 },
  sigBlock: { marginTop: 16, flexDirection: "row", alignItems: "flex-end" },
  sigImg: { width: 190, height: 60, borderBottomWidth: 0.8, borderBottomColor: INK, marginLeft: 6 },
  sigMissing: { width: 190, borderBottomWidth: 0.8, borderBottomColor: INK, marginLeft: 6, height: 20 },

  review: { marginTop: 14, padding: 7, backgroundColor: "#f1f7f3", borderRadius: 2, fontSize: 9 },
  footer: { position: "absolute", bottom: 20, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: MUTED },

  photosTitle: { fontFamily: "Helvetica-Bold", fontSize: 12, marginBottom: 10 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoCell: { width: 246, marginBottom: 10 },
  photo: { width: 246, height: 184, objectFit: "cover", borderWidth: 0.5, borderColor: RULE },
  caption: { fontSize: 8, color: MUTED, marginTop: 3 },
});

export interface PdfAssets {
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  photos: { dataUrl: string; caption: string | null }[];
}

function fmtDate(d: string | null | undefined, lang: Lang): string {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  // Keep the paper form's numeric style; Spanish readers expect day/month.
  return lang === "es" ? `${day}/${m}/${y}` : `${m}/${day}/${y}`;
}

function Field({ label, value, width }: { label: string; value: string; width?: number }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <Text style={[s.value, width ? { minWidth: width } : {}]}>{value || " "}</Text>
    </View>
  );
}

export function RepairOrderPdf({ order, assets, lang = DEFAULT_LANG }: { order: RepairOrderWithNames; assets: PdfAssets; lang?: Lang }) {
  const t = tFor(lang);
  const locale = localeOf(lang);
  const orderNo = formatOrderNumber(order.order_number);
  const langName = (l: Lang) => t(l === "es" ? "tr.langName.es" : "tr.langName.en");

  /** A boxed free-text section: the reader's language first, the original (if different) beneath. */
  const TextBox = ({ field, minHeight }: { field: TranslatedField; minHeight?: number }) => {
    const p = pickText(order, field, lang);
    return (
      <View style={[s.box, minHeight ? { minHeight } : {}]}>
        <Text style={s.boxText}>{p.text || " "}</Text>
        {p.translatedFrom && p.original ? (
          <View style={s.original}>
            <Text style={s.originalLabel}>{t("pdf.originalLabel", { lang: langName(p.translatedFrom) })}</Text>
            <Text>{p.original}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  const location = pickText(order, "location", lang);
  const notes = pickText(order, "manager_notes", lang);
  const pageFooter = (
    <View style={s.footer} fixed>
      <Text>{COMPANY.name}</Text>
      <Text render={({ pageNumber, totalPages }) => `${orderNo} · ${t("pdf.page", { n: pageNumber, total: totalPages })}`} />
    </View>
  );

  return (
    <Document title={`${orderNo} ${t("pdf.title")}`} author={COMPANY.name} language={lang}>
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>{t("pdf.title")}</Text>
            <Text style={s.addr}>{COMPANY.address}</Text>
            <Text style={s.addr}>P:{COMPANY.phone} F:{COMPANY.fax}</Text>
            <Text style={s.orderNo}>{orderNo}</Text>
            <Text style={s.status}>
              {order.status === "reviewed"
                ? t("pdf.reviewedOn", {
                    name: order.reviewer?.full_name ?? t("common.manager").toLowerCase(),
                    date: new Date(order.reviewed_at ?? "").toLocaleDateString(locale),
                  })
                : t("pdf.awaiting")}
            </Text>
          </View>
          {assets.logoDataUrl ? <Image style={s.logo} src={assets.logoDataUrl} /> : null}
        </View>

        <View style={s.row}>
          <Field label={t("form.mechanic")} value={order.mechanic?.full_name ?? ""} width={180} />
          <Field label={t("form.date")} value={fmtDate(order.work_date, lang)} width={90} />
        </View>
        <View style={s.row}>
          <Field label={t("mgr.col.truck")} value={order.truck_number} width={70} />
          <Field label={t("form.branch")} value={order.branch ?? ""} width={120} />
        </View>
        <View style={s.row}>
          <Field label={t("form.location")} value={location.text ?? ""} width={200} />
          <Field label={t("form.mileage")} value={order.mileage !== null ? order.mileage.toLocaleString(locale) : ""} width={90} />
        </View>
        <View style={s.row}>
          <Field label={t("form.totalHours")} value={order.total_hours !== null ? String(order.total_hours) : ""} width={90} />
          {order.travel_time_minutes !== null ? <Field label={t("detail.travelTime")} value={fmtTravel(order.travel_time_minutes)} width={90} /> : null}
        </View>

        <Text style={s.sectionLabel}>{t("form.summary")}</Text>
        <TextBox field="summary" />

        <Text style={s.sectionLabel}>{t("form.workPerformed")}</Text>
        <TextBox field="work_performed" minHeight={80} />

        <Text style={s.sectionLabel}>{t("form.parts")}</Text>
        <TextBox field="parts_materials" />

        {order.start_time || order.finish_time ? (
          <View style={s.timesRow}>
            {order.start_time ? <Field label={t("pdf.startTime")} value={fmtTime(order.start_time)} width={80} /> : null}
            {order.finish_time ? <Field label={t("pdf.finishTime")} value={fmtTime(order.finish_time)} width={80} /> : null}
          </View>
        ) : null}

        <View style={s.sigBlock}>
          <Text style={s.label}>{t("pdf.signature")}</Text>
          {assets.signatureDataUrl ? <Image style={s.sigImg} src={assets.signatureDataUrl} /> : <View style={s.sigMissing} />}
        </View>

        {notes.text ? (
          <View style={s.review}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>{t("pdf.managerNotes")}</Text>
            <Text>{notes.text}</Text>
            {notes.translatedFrom && notes.original ? (
              <View style={s.original}>
                <Text style={s.originalLabel}>{t("pdf.originalLabel", { lang: langName(notes.translatedFrom) })}</Text>
                <Text>{notes.original}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {pageFooter}
      </Page>

      {assets.photos.length > 0 ? (
        <Page size="LETTER" style={s.page}>
          <Text style={s.photosTitle}>
            {orderNo} — {t("pdf.photos")} ({assets.photos.length})
          </Text>
          <View style={s.photoGrid}>
            {assets.photos.map((p, i) => (
              <View key={i} style={s.photoCell} wrap={false}>
                <Image style={s.photo} src={p.dataUrl} />
                {p.caption ? <Text style={s.caption}>{p.caption}</Text> : null}
              </View>
            ))}
          </View>
          {pageFooter}
        </Page>
      ) : null}
    </Document>
  );
}
