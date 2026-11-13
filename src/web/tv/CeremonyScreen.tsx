// La cérémonie utilise les mêmes données et la même chronologie que le moteur.
import type { GameSnapshot } from "../../shared/types";
import { RoomCeremony } from "../ui/RoomCeremony";

export function CeremonyScreen({ snapshot }: { snapshot: GameSnapshot }) {
  return snapshot.ceremony ? <RoomCeremony snapshot={snapshot} info={snapshot.ceremony} /> : null;
}
