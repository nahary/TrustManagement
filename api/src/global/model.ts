import { ServerRequest } from "http";
import { MultichainClient, StreamKind } from "../multichain/Client.h";
import { authorized } from "../authz/index";
import { mergePermissions } from "./index";
import { GlobalOnChain } from "../multichain";
import { findBadKeysInObject, isNonemptyString } from "../lib";

const globalPermissionsTemplate = {
  "global.intent.list": ["root"],
  "global.intent.grantPermission": ["root"],
  "global.intent.revokePermission": ["root"],
  "global.createProject": ["root"],
  "global.createUser": ["root"],
  "user.view": ["root"]
};

export class GlobalModel {
  streamId: StreamKind = "global";
  multichain: MultichainClient;
  key = "permissions";

  constructor(multichain: MultichainClient) {
    this.multichain = multichain;
  }

  async getOrCreateGlobalStream() {
    await this.multichain.getOrCreateStream({
      kind: this.streamId,
      name: this.streamId
    });
    const existingPermissions = await this.multichain.latestValuesForKey(this.streamId, this.key);
    if (existingPermissions.length === 0) {
      await this.multichain.updateStreamItem(this.streamId, this.key, globalPermissionsTemplate);
    }
    return this.multichain.latestValuesForKey(this.streamId, this.key);
  }

  async listPermissions(authorized) {
    const globalPermissions = await this.getOrCreateGlobalStream();
    await authorized(globalPermissions[0]);
    return globalPermissions[0];
  }

  listPermissionsForUser = async (authorized, userId) => {
    const globalPermissions = await this.listPermissions(authorized);
    const allowedIntents = Object.keys(globalPermissions).map(key => {
      const intent = globalPermissions[key].find(user => user === userId);
      if (intent) {
        return key;
      }
    });

    return allowedIntents.filter(intent => intent !== undefined);
  };

  async grantPermissions(authorized, intentToGrant, targetUser) {
    const permissionsByIntent = await GlobalOnChain.getPermissions(this.multichain);
    await authorized(permissionsByIntent);
    const permissions = permissionsByIntent[intentToGrant];
    if (permissions.indexOf(targetUser) === -1) {
      permissions.push(targetUser);
      await this.multichain.updateStreamItem(this.streamId, this.key, permissionsByIntent);
      return "Permission granted.";
    } else {
      return "Permission already set.";
    }
  }
}
