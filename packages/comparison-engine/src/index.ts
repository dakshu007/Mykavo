export {
  compareSnapshots,
  type ComparableSnapshot,
  type SnapshotLink,
  type SnapshotScript,
  type ComparableElement,
} from "./compare";
export { compareScreenshots, type VisualDiffResult } from "./visual";
export {
  compareBrokenLinks,
  isBrokenLinkStatus,
  type LinkObservation,
  type PageLinkObservations,
  type BrokenLinkSample,
  type BrokenLinksSignal,
} from "./links";
export {
  scoreChange,
  highestSeverity,
  type ScoredChange,
  type Severity,
  type ChangeSignal,
  type ChangeCategory,
  type ElementImportance,
} from "@fluxen/severity-engine";
export {
  compareSiteMeta,
  robotsBlocksAll,
  parseSitemap,
  type SiteMetaComparable,
  type ParsedSitemap,
} from "./site-meta";
