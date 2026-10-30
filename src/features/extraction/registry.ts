import { flightExtractor } from "./extractors/flight";
import type { Extractor } from "./types";

/**
 * Every booking kind we extract. Add hotels, cars, trains… by writing an extractor and
 * listing it here: the pipeline, the Claude schema and the job pick it up from this list.
 */
export const extractors: readonly Extractor[] = [flightExtractor];
