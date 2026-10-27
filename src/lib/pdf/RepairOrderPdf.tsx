import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { COMPANY, formatOrderNumber } from "@/lib/constants";
import type { RepairOrderWithNames } from "@/lib/types";

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

function fmtDate(d: string | null | undefined): string {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${m}/${day}/${y}`;
}
function fmtTime(t: string | null | undefined): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}
function fmtTravel(min: number | null): string {
  if (min === null || min === undefined) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m} min`;
}

function Field({ label, value, width }: { label: string; value: string; width?: number }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <Text style={[s.value, width ? { minWidth: width } : {}]}>{value || " "}</Text>
    </View>
  );
}

export function RepairOrderPdf({ order, assets }: { order: RepairOrderWithNames; assets: PdfAssets }) {
  const orderNo = formatOrderNumber(order.order_number);
  return (
    <Document title={`${orderNo} Equipment Repair Order`} author={COMPANY.name}>
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Equipment Repair Order</Text>
            <Text style={s.addr}>{COMPANY.address}</Text>
            <Text style={s.addr}>P:{COMPANY.phone} F:{COMPANY.fax}</Text>
            <Text style={s.orderNo}>{orderNo}</Text>
            <Text style={s.status}>
              {order.status === "reviewed"
                ? `Reviewed by ${order.reviewer?.full_name ?? "manager"} on ${new Date(order.reviewed_at ?? "").toLocaleDateString("en-US")}`
                : "Submitted — awaiting review"}
            </Text>
          </View>
          {assets.logoDataUrl ? <Image style={s.logo} src={assets.logoDataUrl} /> : null}
        </View>

        <View style={s.row}>
          <Field label="Mechanic" value={order.mechanic?.full_name ?? ""} width={180} />
          <Field label="Date" value={fmtDate(order.work_date)} width={90} />
        </View>
        <View style={s.row}>
          <Field label="Truck #" value={order.truck_number} width={70} />
          <Field label="Branch" value={order.branch ?? ""} width={120} />
        </View>
        <View style={s.row}>
          <Field label="Location" value={order.location ?? ""} width={200} />
          <Field label="Mileage" value={order.mileage !== null ? order.mileage.toLocaleString("en-US") : ""} width={90} />
        </View>
        <View style={s.row}>
          <Field label="Total travel time" value={fmtTravel(order.travel_time_minutes)} width={90} />
          <Field label="Total hours" value={order.total_hours !== null ? String(order.total_hours) : ""} width={90} />
        </View>

        <Text style={s.sectionLabel}>Summary description of work</Text>
        <Text style={s.box}>{order.summary ?? " "}</Text>

        <Text style={s.sectionLabel}>Work performed</Text>
        <Text style={[s.box, { minHeight: 80 }]}>{order.work_performed ?? " "}</Text>

        <Text style={s.sectionLabel}>Parts/Materials used</Text>
        <Text style={s.box}>{order.parts_materials ?? " "}</Text>

        <View style={s.timesRow}>
          <Field label="Start time:" value={fmtTime(order.start_time)} width={80} />
          <Field label="Finish time:" value={fmtTime(order.finish_time)} width={80} />
        </View>

        <View style={s.sigBlock}>
          <Text style={s.label}>Signature:</Text>
          {assets.signatureDataUrl ? <Image style={s.sigImg} src={assets.signatureDataUrl} /> : <View style={s.sigMissing} />}
        </View>

        {order.manager_notes ? (
          <View style={s.review}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>Manager notes</Text>
            <Text>{order.manager_notes}</Text>
          </View>
        ) : null}

        <View style={s.footer} fixed>
          <Text>{COMPANY.name}</Text>
          <Text render={({ pageNumber, totalPages }) => `${orderNo} · Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {assets.photos.length > 0 ? (
        <Page size="LETTER" style={s.page}>
          <Text style={s.photosTitle}>{orderNo} — Photos ({assets.photos.length})</Text>
          <View style={s.photoGrid}>
            {assets.photos.map((p, i) => (
              <View key={i} style={s.photoCell} wrap={false}>
                <Image style={s.photo} src={p.dataUrl} />
                {p.caption ? <Text style={s.caption}>{p.caption}</Text> : null}
              </View>
            ))}
          </View>
          <View style={s.footer} fixed>
            <Text>{COMPANY.name}</Text>
            <Text render={({ pageNumber, totalPages }) => `${orderNo} · Page ${pageNumber} of ${totalPages}`} />
          </View>
        </Page>
      ) : null}
    </Document>
  );
}
