// English names and one-line descriptions shown in the interface.

import type { BuildKind } from "../game";
import type { LoadKind, SourceKind } from "../model";
import type { IconName } from "./dom";

export const UNIT_LABEL: Record<SourceKind, string> = {
  nuclear: "Nuclear",
  coal: "Coal",
  ccgt: "Gas plant",
  ocgt: "Gas peaker",
  hydro: "Hydro",
  solar: "Solar",
  wind: "Wind",
  battery: "Battery",
};

export const LOAD_LABEL: Record<LoadKind, string> = {
  homes: "Homes",
  factory: "Factory",
  datacenter: "Data center",
  ev: "EV chargers",
};

export const BUILD_ORDER: readonly BuildKind[] = ["battery", "ocgt", "hydro", "solar", "wind"];

export const BUILD_INFO: Record<BuildKind, { icon: IconName; text: string }> = {
  battery: { icon: "battery", text: "Reacts in one second. No inertia." },
  ocgt: { icon: "flame", text: "Spinning turbine: adds inertia and a little fast reserve." },
  hydro: { icon: "drop", text: "Heavy spinning turbine: steady inertia and reserve." },
  solar: { icon: "sun", text: "Free power by day, gone at sunset. No inertia." },
  wind: { icon: "wind", text: "Clean power with no inertia." },
};
