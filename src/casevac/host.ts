/**
 * The CASEVAC planner's only doorway into the host app. Everything under src/casevac imports
 * app services and shared UI from here, so the planner can be lifted into its own app by
 * copying the folder and re-implementing this one file.
 */
export {
  appendNote,
  copyText,
  notify,
  readJson,
  safeSetItem,
  useLocalStorage,
} from '../lib/storage';
export { newChecklistItemId as newItemId } from '../lib/checklists';
export { dtgZulu, fileSlug } from '../lib/dtg';
export { pdfSafe } from '../lib/pdfText';
export { useMediaQuery } from '../lib/useMediaQuery';
export { Block, Callout, Info, StatusIcon, type Status, type Theme } from '../components/ui';
export {
  IconCcp,
  IconChain,
  IconHeader,
  IconHlz,
  IconLayout,
  IconMarking,
  IconMedic,
  IconMist,
  IconPace,
  IconRadio,
  IconShield,
  IconTree,
  IconWindsock,
} from '../components/icons';
export {
  CheckGroup,
  FieldRow,
  NumberField,
  Segmented,
  SelectField,
  TextField,
} from '../components/form';
