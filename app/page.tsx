import type { Metadata } from "next";
import { MapDashboard } from "./components/MapDashboard";

export const metadata: Metadata = {
  title: "MapIA | Priorización vial auditable",
  description:
    "Mapa público para explorar tramos viales priorizados con evidencia, confianza y revisión humana.",
};

export default function Home() {
  return <MapDashboard />;
}
