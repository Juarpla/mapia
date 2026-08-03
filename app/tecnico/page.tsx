import type { Metadata } from "next";
import Link from "next/link";
import { chatGPTSignInPath, getChatGPTUser } from "@/app/chatgpt-auth";
import { demoSegments } from "@/lib/demo-data";
import { TechnicalDashboard } from "./technical-dashboard";

export const metadata: Metadata = {
  title: "Panel técnico",
  description: "Revisión privada de evidencia y recomendaciones de MapIA.",
};

export default async function TechnicalPage() {
  const user = await getChatGPTUser();
  if (!user && process.env.NODE_ENV === "production") {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand-mark">M</div>
          <span className="eyebrow">Área restringida</span>
          <h1>Panel técnico de MapIA</h1>
          <p>Las observaciones originales, fotografías y decisiones de revisión requieren una cuenta autorizada.</p>
          <a className="primary-link" href={chatGPTSignInPath("/tecnico")}>Ingresar de forma segura</a>
          <Link href="/">← Volver al mapa público</Link>
        </section>
      </main>
    );
  }

  return (
    <TechnicalDashboard
      userDisplay={user?.displayName ?? "Revisor local"}
      initialQueue={demoSegments.filter((segment) => segment.status !== "publicado")}
    />
  );
}
