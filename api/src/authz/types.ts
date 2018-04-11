import Intent from "./intents";
import { AuthToken } from "./token";

export type UserId = string;
export type GroupId = string;
export type People = Array<UserId | GroupId>;

// what it actually is:
export type AllowedUserGroupsByIntentMap = Map<Intent, People>;
// how it's stored on the chain:
export type AllowedUserGroupsByIntent = Array<Array<Intent | People>>;

export interface NotAuthorizedError {
  kind: "NotAuthorized";
  token: AuthToken;
  intent: Intent;
}
