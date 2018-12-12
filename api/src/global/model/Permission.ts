import Intent from "../../authz/intents";
import { MultichainClient } from "../../multichain";
import { Event } from "../../multichain/event";

export const publish = async (
  multichain: MultichainClient,
  globalstreamName: string,
  args: {
    intent: Intent;
    createdBy: string;
    creationTimestamp: Date;
    data: object;
    dataVersion: number; // integer
  },
): Promise<Event> => {
  const { intent, createdBy, creationTimestamp, dataVersion, data } = args;
  const event: Event = {
    key: "self",
    intent,
    createdBy,
    createdAt: creationTimestamp.toISOString(),
    dataVersion,
    data,
  };

  const streamItemKey = "self";
  const streamItem = { json: event };

  const publishEvent = () => {
    console.log(
      `Publishing ${event.intent} to ${globalstreamName}/${JSON.stringify(streamItemKey)}`,
    );
    return multichain
      .getRpcClient()
      .invoke("publish", globalstreamName, streamItemKey, streamItem)
      .then(() => event);
  };

  return publishEvent().catch(err => {
    if (err.code === -708) {
      // The stream does not exist yet. Create the stream and try again:
      return multichain
        .getOrCreateStream({ kind: "global", name: globalstreamName })
        .then(() => publishEvent());
    } else {
      throw err;
    }
  });
};