import { blockTypes } from "./blocks";
import { documentTypes } from "./documents";
import { objectTypes } from "./objects";
import { richBody } from "./richBody";

export const schemaTypes = [...documentTypes, richBody, ...objectTypes, ...blockTypes];
