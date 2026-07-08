export {
  compareSnapshots,
  type ComparableSnapshot,
  type SnapshotLink,
  type SnapshotScript,
} from "./compare";
export { compareScreenshots, type VisualDiffResult } from "./visual";
export {
  scoreChange,
  highestSeverity,
  type ScoredChange,
  type Severity,
  type ChangeSignal,
  type ChangeCategory,
} from "@fluxen/severity-engine";
