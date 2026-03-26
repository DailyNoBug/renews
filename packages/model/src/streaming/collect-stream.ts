import type { ModelClient, ModelRequest } from "../client/model-client.js";

export const collectStreamText = async (
  client: ModelClient,
  request: ModelRequest,
): Promise<string> => {
  let output = "";
  for await (const event of client.stream(request)) {
    if (event.type === "message_delta") {
      output += String(event.data);
    }
  }
  return output;
};
